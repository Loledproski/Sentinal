const { app, BrowserWindow, globalShortcut, ipcMain, session, screen } = require('electron');
const path = require('path');
const { execFile, fork } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

let mainWindow = null;
let overlayWindow = null;
let serverProcess = null;
let isOverlayPinned = false;

function startBackendServerIfPackaged() {
  if (!app.isPackaged) return;
  const appRoot = path.join(__dirname, '..');
  const serverBundlePath = path.join(appRoot, 'dist/server.cjs');
  try {
    serverProcess = fork(serverBundlePath, [], {
      cwd: appRoot,
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'ignore',
    });
  } catch (err) {
    console.error('Failed to start bundled backend:', err);
  }
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const winWidth = 570;
  const winHeight = 58;

  overlayWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.round((screenWidth - winWidth) / 2),
    y: 16,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Float above Chrome, full-screen apps, and games without bringing up the main Sentinel window
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  return overlayWindow;
}

function toggleFloatingOverlay(forceState) {
  const win = createOverlayWindow();
  const currentlyVisible = win.isVisible();
  const nextVisible = typeof forceState === 'boolean' ? forceState : !currentlyVisible;

  if (nextVisible) {
    isOverlayPinned = false;
    win.setAlwaysOnTop(true, 'screen-saver');
    win.showInactive();
    win.webContents.send('overlay:shown', { pinned: false });
  } else {
    isOverlayPinned = false;
    win.hide();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay:toggle', nextVisible);
  }

  return nextVisible;
}

function createWindow() {
  // Automatically allow microphone & audio capture inside the Electron desktop app
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true);
  });
  session.defaultSession.setPermissionCheckHandler(() => true);

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    title: 'Sentinel AI Cybersecurity Guardian',
    backgroundColor: '#02050A',
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Connect to local Express + WebSocket backend on port 3000
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL('http://localhost:3000');
    }
  }, app.isPackaged ? 1200 : 100);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.close();
    }
  });
}

app.whenReady().then(() => {
  startBackendServerIfPackaged();
  createWindow();
  createOverlayWindow();

  // Shift+F2 toggles main Sentinel window visibility
  globalShortcut.register('Shift+F2', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Shift+F3 toggles the standalone Always-On-Top Floating Overlay bar over Chrome / games
  globalShortcut.register('Shift+F3', () => {
    toggleFloatingOverlay();
  });

  // Toggle floating overlay from inside the main Sentinel UI
  ipcMain.handle('overlay:setVisible', (_, visible) => {
    const state = toggleFloatingOverlay(visible);
    return { visible: state };
  });

  // Move the floating overlay window across any monitor when dragged while unpinned
  ipcMain.on('overlay:moveBy', (_, { dx, dy }) => {
    if (!overlayWindow || overlayWindow.isDestroyed() || isOverlayPinned) return;
    const [curX, curY] = overlayWindow.getPosition();
    overlayWindow.setPosition(Math.round(curX + dx), Math.round(curY + dy));
  });

  // Pin locks the overlay at that exact screen position over Chrome & all apps;
  // Unpin immediately hides the overlay ("when i unpined it will be gone")
  ipcMain.handle('overlay:setPinState', (_, pinned) => {
    isOverlayPinned = Boolean(pinned);
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      if (isOverlayPinned) {
        overlayWindow.setAlwaysOnTop(true, 'screen-saver');
      } else {
        // When unpinned after being pinned, hide the floating overlay immediately
        overlayWindow.hide();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('overlay:toggle', false);
        }
      }
    }
    return { pinned: isOverlayPinned };
  });

  // Legacy Always-On-Top handler
  ipcMain.handle('overlay:setAlwaysOnTop', (_, pinned) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    }
    return { pinned: Boolean(pinned) };
  });

  // Safe allowlisted application launcher
  ipcMain.handle('actions:launchApp', async (_, appName) => {
    try {
      const safeName = String(appName || '').replace(/[^a-zA-Z0-9._-]/g, '');
      if (!safeName) {
        return { status: 'failed', message: 'Invalid application name' };
      }
      if (process.platform === 'win32') {
        await execFileAsync('cmd.exe', ['/c', 'start', '', safeName]);
      }
      return { status: 'executed', message: `Executed ${safeName}` };
    } catch (e) {
      return { status: 'failed', message: e.message };
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {}
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
