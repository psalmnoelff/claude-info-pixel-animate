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

    for (const line of lines) {
      // Convert to stream-json format and send
      const converted = convertSessionEvent(line);
      if (converted) {
        mainWindow?.webContents.send('claude:event', converted);
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
