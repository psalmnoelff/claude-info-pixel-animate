const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let claudeProcess = null;

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
