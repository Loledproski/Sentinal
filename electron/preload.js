const { contextBridge, ipcRenderer } = require('electron');

// Secure context bridge for Sentinel AI
contextBridge.exposeInMainWorld('electronAPI', {
  getSystemOverview: () => ipcRenderer.invoke('system:getOverview'),
  scanStorage: () => ipcRenderer.invoke('storage:scan'),
  cleanStorage: (categories, freedMB) => ipcRenderer.invoke('storage:clean', categories, freedMB),
  checkNetworkSecurity: () => ipcRenderer.invoke('network:check'),
  getProcessThreats: () => ipcRenderer.invoke('threats:list'),
  boostRam: (options) => ipcRenderer.invoke('system:boostRam', options),
  launchApp: (appName, query) => ipcRenderer.invoke('actions:launchApp', appName, query),
  onShortcutTriggered: (callback) => ipcRenderer.on('hud:toggle', callback),
  onOverlayToggle: (callback) => ipcRenderer.on('overlay:toggle', callback),
});
