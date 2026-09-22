const { contextBridge, ipcRenderer } = require('electron');

// Secure context bridge for Sentinel AI
contextBridge.exposeInMainWorld('electronAPI', {
  getSystemOverview: () => ipcRenderer.invoke('system:getOverview'),
  scanStorage: () => ipcRenderer.invoke('storage:scan'),
  cleanStorage: () => ipcRenderer.invoke('storage:clean'),
  checkNetworkSecurity: () => ipcRenderer.invoke('network:check'),
  getProcessThreats: () => ipcRenderer.invoke('threats:list'),
  launchApp: (appName, query) => ipcRenderer.invoke('actions:launchApp', appName, query),
  onShortcutTriggered: (callback) => ipcRenderer.on('hud:toggle', callback),
});
