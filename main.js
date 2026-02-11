const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow;
let claudeProcess = null;
let sessionWatcher = null; // polling interval for session detection
let activeFileWatcher = null; // fs.watch on the active session file
let tailPosition = 0;     // current read offset for tailing
let selectedSessionId = null; // which session is currently selected for usage tracking
let lastCWValue = null;   // cached CW value to prevent blinking
let fileSizes = new Map(); // path -> last known size (for growth detection)

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

// Find active sessions within a time window
function findActiveSessions(windowMinutes = 5) {
  const projectsDir = getClaudeProjectsDir();
  if (!fs.existsSync(projectsDir)) return [];

  const now = Date.now();
  const cutoff = now - windowMinutes * 60 * 1000;
  const sessions = [];

  function scanDir(dir, projectName) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'session-memory') {
          const proj = projectName || entry.name;
          scanDir(fullPath, proj);
        } else if (entry.isFile() && entry.name.endsWith('.jsonl') && !entry.name.includes('subagent')) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > cutoff) {
              sessions.push({
                id: entry.name.replace('.jsonl', ''),
                path: fullPath,
                mtime: stat.mtimeMs,
                project: projectName || path.basename(dir),
              });
            }
          } catch (e) { /* skip */ }
        }
      }
    } catch (e) { /* skip */ }
  }

  scanDir(projectsDir, null);
  sessions.sort((a, b) => b.mtime - a.mtime);
  return sessions;
}

// Find the best active session by detecting which file is growing
function findActiveSessionByGrowth() {
  // Use 5-min window for auto-detection (tight)
  const sessions = findActiveSessions(5);
  if (sessions.length === 0) return null;

  // If a session is manually selected, prefer it
  if (selectedSessionId) {
    const selected = sessions.find(s => s.id === selectedSessionId);
    if (selected) return selected.path;
  }

  let bestPath = null;
  let bestScore = -1;

  for (const session of sessions) {
    try {
      const stat = fs.statSync(session.path);
      const prevSize = fileSizes.get(session.path) || 0;
      const isGrowing = prevSize > 0 && stat.size > prevSize;
      fileSizes.set(session.path, stat.size);

      // Growing files get top priority, then sort by recency
      const score = (isGrowing ? 1e15 : 0) + stat.mtimeMs;
      if (score > bestScore) {
        bestScore = score;
        bestPath = session.path;
      }
    } catch (e) { /* skip */ }
  }

  return bestPath;
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
// Returns cumulative output tokens AND the last message's input_tokens (= current CW)
function computeUsageFromFile(filePath) {
  const usage = {
    outputTokens: 0,
    inputTokens: 0,
    sonnetOutputTokens: 0,
    messageCount: 0,
    lastInputTokens: 0, // last message's full context = current CW size
  };
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

          // The LAST assistant message's input_tokens represents the current context window.
          // Each API call sends the full conversation, so input_tokens already includes everything.
          usage.lastInputTokens = (u.input_tokens || 0)
            + (u.cache_read_input_tokens || 0)
            + (u.cache_creation_input_tokens || 0);

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

// Compute usage for a specific session file (CW = last message's input tokens)
function computeUsageForSession(filePath) {
  const usage = computeUsageFromFile(filePath);
  return {
    sessionTokens: usage.outputTokens,
    // FIXED: use last message's input_tokens as context window (not cumulative sum)
    currentSessionContext: usage.lastInputTokens,
  };
}

// Compute accumulated usage across recent sessions (weekly totals only)
function computeWeeklyUsage() {
  const projectsDir = getClaudeProjectsDir();
  if (!fs.existsSync(projectsDir)) return null;

  const now = Date.now();
  const fiveHoursAgo = now - 5 * 60 * 60 * 1000;
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  let sessionTokens = 0;
  let weeklyTokens = 0;
  let sonnetWeekly = 0;

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

  for (const sf of sessionFiles) {
    const usage = computeUsageFromFile(sf.path);
    weeklyTokens += usage.outputTokens;
    sonnetWeekly += usage.sonnetOutputTokens;

    if (sf.mtime > fiveHoursAgo) {
      sessionTokens += usage.outputTokens;
    }
  }

  return { sessionTokens, weeklyTokens, sonnetWeekly };
}

// --- Session watcher with fs.watch + growth detection ---

function stopSessionWatcher() {
  if (sessionWatcher) {
    clearInterval(sessionWatcher);
    sessionWatcher = null;
  }
  if (activeFileWatcher) {
    try { activeFileWatcher.close(); } catch (e) { /* ignore */ }
    activeFileWatcher = null;
  }
  tailPosition = 0;
  lastCWValue = null;
  fileSizes.clear();
}

function startSessionWatcher() {
  stopSessionWatcher();

  let currentFile = null;
  let scanCount = 0;
  let lastFileSize = 0;

  // Send initial status
  mainWindow?.webContents.send('claude:watch-status', { watching: true, file: null });

  // --- Helper: send usage update ---
  function sendUsageUpdate(force) {
    const weeklyUsage = computeWeeklyUsage();
    if (!weeklyUsage) return;

    let currentSessionContext = lastCWValue || 0;
    if (currentFile) {
      try {
        const stat = fs.statSync(currentFile);
        if (force || stat.size !== lastFileSize) {
          const sessionUsage = computeUsageForSession(currentFile);
          currentSessionContext = sessionUsage.currentSessionContext;
          lastCWValue = currentSessionContext;
          lastFileSize = stat.size;
        }
      } catch (e) { /* keep cached */ }
    }

    mainWindow?.webContents.send('claude:usage-update', {
      ...weeklyUsage,
      currentSessionContext,
    });
  }

  // --- Helper: send session list (wider window for manual selection) ---
  function sendSessionList() {
    const sessions = findActiveSessions(30); // 30-min window for the list
    if (sessions.length > 0) {
      mainWindow?.webContents.send('claude:sessions-list', sessions.map(s => ({
        id: s.id,
        project: s.project,
        mtime: s.mtime,
      })));
    }
  }

  // --- Helper: process new lines from tailed file ---
  function processNewLines() {
    if (!currentFile) return false;

    const { lines, newOffset } = readNewLines(currentFile, tailPosition);
    if (lines.length === 0) return false;

    tailPosition = newOffset;
    let hasNewEvents = false;

    for (const line of lines) {
      const converted = convertSessionEvent(line);
      if (converted) {
        mainWindow?.webContents.send('claude:event', converted);
        hasNewEvents = true;
      }
    }

    return hasNewEvents;
  }

  // --- Helper: switch to watching a different file ---
  function switchToFile(filePath) {
    if (filePath === currentFile) return;

    currentFile = filePath;
    lastCWValue = null;

    // Start tailing from end of file (only new events)
    try {
      const stat = fs.statSync(currentFile);
      tailPosition = stat.size;
      lastFileSize = stat.size;
    } catch (e) {
      tailPosition = 0;
      lastFileSize = 0;
    }

    // Set up fs.watch on the active file for instant change detection
    if (activeFileWatcher) {
      try { activeFileWatcher.close(); } catch (e) { /* ignore */ }
      activeFileWatcher = null;
    }

    try {
      activeFileWatcher = fs.watch(currentFile, { persistent: false }, (eventType) => {
        if (eventType === 'change') {
          const hasNew = processNewLines();
          if (hasNew) {
            sendUsageUpdate(false);
          }
        }
      });
      activeFileWatcher.on('error', () => {
        // fs.watch can fail on some systems, fall back to polling only
        activeFileWatcher = null;
      });
    } catch (e) {
      // fs.watch not available, polling will handle it
    }

    mainWindow?.webContents.send('claude:watch-status', {
      watching: true,
      file: path.basename(currentFile)
    });

    // Compute initial usage for the new file
    sendUsageUpdate(true);
  }

  // Send initial data
  sendUsageUpdate(true);
  sendSessionList();

  // Do an initial scan to find and switch to the best session immediately
  const initialActive = findActiveSessionByGrowth();
  if (initialActive) {
    switchToFile(initialActive);
  }

  // Main interval: session detection (every 5s) + fallback polling + usage updates
  sessionWatcher = setInterval(() => {
    scanCount++;

    // Check for session changes every 10 polls (~5 seconds)
    if (!currentFile || scanCount % 10 === 0) {
      const active = findActiveSessionByGrowth();
      if (active) {
        switchToFile(active); // no-op if same file
      }
    }

    // Update session list every 60 polls (~30 seconds)
    if (scanCount % 60 === 0) {
      sendSessionList();
    }

    // Fallback: read new lines even if fs.watch didn't fire
    const hasNew = processNewLines();

    // Periodic usage update every 30 polls (~15 seconds) or on new events
    if (hasNew || scanCount % 30 === 0) {
      sendUsageUpdate(false);
    }
  }, 500);
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

ipcMain.handle('claude:select-session', (_event, sessionId) => {
  selectedSessionId = sessionId;
  lastCWValue = null;
  return { ok: true };
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
