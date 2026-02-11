const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appWindow', {
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top')
});

contextBridge.exposeInMainWorld('claude', {
  start: (prompt, workingDir) =>
    ipcRenderer.invoke('claude:start', { prompt, workingDir }),
  stop: () => ipcRenderer.invoke('claude:stop'),
  status: () => ipcRenderer.invoke('claude:status'),
  onEvent: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('claude:event', handler);
    return () => ipcRenderer.removeListener('claude:event', handler);
  },
  onStderr: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('claude:stderr', handler);
    return () => ipcRenderer.removeListener('claude:stderr', handler);
  },
  onExit: (callback) => {
    const handler = (_event, code) => callback(code);
    ipcRenderer.on('claude:exit', handler);
    return () => ipcRenderer.removeListener('claude:exit', handler);
  },
  onError: (callback) => {
    const handler = (_event, msg) => callback(msg);
    ipcRenderer.on('claude:error', handler);
    return () => ipcRenderer.removeListener('claude:error', handler);
  }
});
