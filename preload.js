const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('appWindow', {
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  isAlwaysOnTop: () => ipcRenderer.invoke('window:get-always-on-top'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url)
});

contextBridge.exposeInMainWorld('claude', {
  start: (prompt, workingDir) =>
    ipcRenderer.invoke('claude:start', { prompt, workingDir }),
  stop: () => ipcRenderer.invoke('claude:stop'),
  status: () => ipcRenderer.invoke('claude:status'),
  watch: () => ipcRenderer.invoke('claude:watch'),
  unwatch: () => ipcRenderer.invoke('claude:unwatch'),
  selectSession: (sessionId) => ipcRenderer.invoke('claude:select-session', sessionId),
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
  },
  onWatchStatus: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('claude:watch-status', handler);
    return () => ipcRenderer.removeListener('claude:watch-status', handler);
  },
  onUsageUpdate: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('claude:usage-update', handler);
    return () => ipcRenderer.removeListener('claude:usage-update', handler);
  },
  onSessionsList: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('claude:sessions-list', handler);
    return () => ipcRenderer.removeListener('claude:sessions-list', handler);
  },
  checkStatus: () => ipcRenderer.invoke('claude:check-status'),
  onStatusRSS: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('claude:status-rss', handler);
    return () => ipcRenderer.removeListener('claude:status-rss', handler);
  }
});
