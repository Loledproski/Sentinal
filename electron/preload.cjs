const { contextBridge, ipcRenderer } = require('electron');

// Secure context bridge for Sentinel AI Desktop App
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  launchApp: (appName, query) => ipcRenderer.invoke('actions:launchApp', appName, query),
  onShortcutTriggered: (callback) => ipcRenderer.on('hud:toggle', callback),
  onOverlayToggle: (callback) => ipcRenderer.on('overlay:toggle', callback),
  onOverlayShown: (callback) => ipcRenderer.on('overlay:shown', callback),
  toggleDesktopOverlay: (visible) => ipcRenderer.invoke('overlay:setVisible', visible),
  moveOverlayWindow: (dx, dy) => ipcRenderer.send('overlay:moveBy', { dx, dy }),
  setOverlayPinState: (pinned) => ipcRenderer.invoke('overlay:setPinState', pinned),
  setOverlayAlwaysOnTop: (pinned) => ipcRenderer.invoke('overlay:setAlwaysOnTop', pinned),
});
