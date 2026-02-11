const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow;
let claudeProcess = null;
let sessionWatcher = null; // file watcher for session logs
let tailPosition = 0;     // current read offset for tailing

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 512,
    minHeight: 384,
    backgroundColor: '#1d2b53',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    killClaude();
    stopSessionWatcher();
  });
}

function killClaude() {
  if (claudeProcess) {
    claudeProcess.kill();
    claudeProcess = null;
  }
}

function spawnClaude(prompt, workingDir) {
  killClaude();

  const args = ['-p', prompt, '--output-format', 'stream-json', '--verbose'];
  claudeProcess = spawn('claude', args, {
    cwd: workingDir || process.cwd(),
    shell: true,
    env: { ...process.env }
  });

  let buffer = '';

  claudeProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        mainWindow?.webContents.send('claude:event', trimmed);
      }
    }
  });

  claudeProcess.stderr.on('data', (data) => {
    mainWindow?.webContents.send('claude:stderr', data.toString());
  });

  claudeProcess.on('close', (code) => {
    mainWindow?.webContents.send('claude:exit', code);
    claudeProcess = null;
  });

  claudeProcess.on('error', (err) => {
    mainWindow?.webContents.send('claude:error', err.message);
    claudeProcess = null;
  });
}

// --- Session log watching (listen to existing Claude Code sessions) ---

function getClaudeProjectsDir() {
  const home = os.homedir();
  return path.join(home, '.claude', 'projects');
}

// Find the most recently modified .jsonl file across all project dirs
function findActiveSession() {
  const projectsDir = getClaudeProjectsDir();
  if (!fs.existsSync(projectsDir)) return null;

  let newest = null;
  let newestTime = 0;

  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'session-memory') {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl') && !entry.name.includes('subagent')) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > newestTime) {
              newestTime = stat.mtimeMs;
              newest = fullPath;
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (e) { /* skip */ }
  }

  scanDir(projectsDir);
  return newest;
}

// Read new lines from a JSONL file starting at offset
function readNewLines(filePath, fromOffset) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size <= fromOffset) return { lines: [], newOffset: fromOffset };

    const fd = fs.openSync(filePath, 'r');
    const bufSize = stat.size - fromOffset;
    const buf = Buffer.alloc(bufSize);
    fs.readSync(fd, buf, 0, bufSize, fromOffset);
    fs.closeSync(fd);

    const text = buf.toString('utf8');
    const rawLines = text.split('\n');
    const lines = [];
    for (const line of rawLines) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }

    return { lines, newOffset: stat.size };
  } catch (e) {
    return { lines: [], newOffset: fromOffset };
  }
}

// Convert session log JSONL format to stream-json format for the classifier
function convertSessionEvent(raw) {
  try {
    const event = JSON.parse(raw);

    // Session log format: { type: "assistant"|"user"|"system", message: { role, content } }
    // Stream-json format: { type: "system"|"assistant"|"user"|"result", ... }

    if (event.type === 'assistant' && event.message) {
      return JSON.stringify({
        type: 'assistant',
        message: event.message
      });
    }

    if (event.type === 'user' && event.message) {
      return JSON.stringify({
        type: 'user',
        message: event.message
      });
    }

    // Result events in session logs have subType or specific markers
    if (event.type === 'result' || (event.message && event.message.stop_reason === 'end_turn' && !event.message.content?.some(b => b.type === 'tool_use'))) {
      // Check if this is a final result with usage
      if (event.message?.usage) {
        return JSON.stringify({
          type: 'result',
          result: '',
          usage: event.message.usage
        });
      }
    }

    // System events
    if (event.type === 'system') {
      return JSON.stringify({
        type: 'system',
        model: event.model || null
      });
    }

    // For assistant messages that have model info, also emit it
    if (event.message?.model) {
      return JSON.stringify({
        type: 'system',
        model: event.message.model
      });
    }

    return null;
  } catch (e) {
    return null;
  }
}

// --- Usage computation from session logs ---

// Compute token usage from a single JSONL file
function computeUsageFromFile(filePath) {
  const usage = { outputTokens: 0, inputTokens: 0, sonnetOutputTokens: 0, messageCount: 0 };
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        if (event.type === 'assistant' && event.message?.usage) {
          const u = event.message.usage;
          usage.outputTokens += u.output_tokens || 0;
          usage.inputTokens += (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0);
          usage.messageCount++;
          // Track sonnet usage
          const model = event.message?.model || '';
          if (model.includes('sonnet')) {
            usage.sonnetOutputTokens += u.output_tokens || 0;
          }
        }
      } catch (e) { /* skip unparseable lines */ }
    }
  } catch (e) { /* skip unreadable files */ }
  return usage;
}

// Compute accumulated usage across recent sessions
function computeAllUsage() {
  const projectsDir = getClaudeProjectsDir();
  if (!fs.existsSync(projectsDir)) return null;

  const now = Date.now();
  const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  let sessionTokens = 0;  // current session window (5h)
  let weeklyTokens = 0;   // all models this week
  let sonnetWeekly = 0;   // sonnet this week
  let currentSessionContext = 0; // input tokens in active session

  // Find all JSONL session files
  const sessionFiles = [];
  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'session-memory') {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl') && !entry.name.includes('subagent')) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > oneWeekAgo) {
              sessionFiles.push({ path: fullPath, mtime: stat.mtimeMs });
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (e) { /* skip */ }
  }
  scanDir(projectsDir);

  // Sort by modification time (newest last)
  sessionFiles.sort((a, b) => a.mtime - b.mtime);

  for (const sf of sessionFiles) {
    const usage = computeUsageFromFile(sf.path);

    // Weekly totals
    weeklyTokens += usage.outputTokens;
    sonnetWeekly += usage.sonnetOutputTokens;

    // Session window (last 5 hours)
    if (sf.mtime > fiveHoursAgo) {
      sessionTokens += usage.outputTokens;
    }

    // Current (most recent) session context
    if (sf === sessionFiles[sessionFiles.length - 1]) {
      currentSessionContext = usage.inputTokens + usage.outputTokens;
    }
  }

  return {
    sessionTokens,
    weeklyTokens,
    sonnetWeekly,
    currentSessionContext,
  };
}

function stopSessionWatcher() {
  if (sessionWatcher) {
    clearInterval(sessionWatcher);
    sessionWatcher = null;
  }
  tailPosition = 0;
}

function startSessionWatcher() {
  stopSessionWatcher();

  let currentFile = null;
  let scanCount = 0;

  // Send initial status
  mainWindow?.webContents.send('claude:watch-status', { watching: true, file: null });

  // Compute and send initial usage
  const initialUsage = computeAllUsage();
  if (initialUsage) {
    mainWindow?.webContents.send('claude:usage-update', initialUsage);
  }

  sessionWatcher = setInterval(() => {
    // Re-scan for active session every 10 polls (~5 seconds)
    if (!currentFile || scanCount % 10 === 0) {
      const active = findActiveSession();
      if (active && active !== currentFile) {
        currentFile = active;
        // Start from end of file (only watch new events)
        try {
          const stat = fs.statSync(currentFile);
          tailPosition = stat.size;
        } catch (e) {
          tailPosition = 0;
        }
        mainWindow?.webContents.send('claude:watch-status', {
          watching: true,
          file: path.basename(currentFile)
        });
      }
    }
    scanCount++;

    if (!currentFile) return;

    // Read new lines
    const { lines, newOffset } = readNewLines(currentFile, tailPosition);
    tailPosition = newOffset;

    let hasNewEvents = false;
    for (const line of lines) {
      // Convert to stream-json format and send
      const converted = convertSessionEvent(line);
      if (converted) {
        mainWindow?.webContents.send('claude:event', converted);
        hasNewEvents = true;
      }
    }

    // Recompute usage every 30 polls (~15 seconds) or when new events arrive
    if (hasNewEvents || scanCount % 30 === 0) {
      const usage = computeAllUsage();
      if (usage) {
        mainWindow?.webContents.send('claude:usage-update', usage);
      }
    }
  }, 500); // Poll every 500ms
}

ipcMain.handle('claude:watch', () => {
  startSessionWatcher();
  return { ok: true };
});

ipcMain.handle('claude:unwatch', () => {
  stopSessionWatcher();
  mainWindow?.webContents.send('claude:watch-status', { watching: false, file: null });
  return { ok: true };
});

ipcMain.handle('claude:start', (_event, { prompt, workingDir }) => {
  spawnClaude(prompt, workingDir);
  return { ok: true };
});

ipcMain.handle('claude:stop', () => {
  killClaude();
  return { ok: true };
});

ipcMain.handle('claude:status', () => {
  return { running: claudeProcess !== null };
});

ipcMain.handle('window:toggle-always-on-top', () => {
  const newState = !mainWindow.isAlwaysOnTop();
  mainWindow.setAlwaysOnTop(newState);
  return newState;
});

ipcMain.handle('window:get-always-on-top', () => {
  return mainWindow.isAlwaysOnTop();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  killClaude();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
