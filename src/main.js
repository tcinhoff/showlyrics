const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// Load environment variables
require('dotenv').config();

let mainWindow;
let lyricsWindow;
let tray;
let isLyricsVisible = false; // Start hidden
let autoHideEnabled = true;
let autoHideTimeout = null;
let lastPlayingState = null;
let manuallyHidden = false; // Track if user manually closed the window

// Disable hardware acceleration to fix GBM errors on Linux
app.disableHardwareAcceleration();

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'ShowLyrics - Settings',
    show: false // Start hidden
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Hide window instead of closing it
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

function createLyricsWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  lyricsWindow = new BrowserWindow({
    width: 350,
    height: 200,
    x: width - 370,
    y: height - 220,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    skipTaskbar: true,
    show: false // Start hidden, will auto-show when music plays
  });

  lyricsWindow.loadFile(path.join(__dirname, 'lyrics.html'));

  // Interaction tracking is handled in lyrics-renderer.js

  if (process.argv.includes('--dev')) {
    lyricsWindow.webContents.openDevTools();
  }
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, '../assets/icon.png'));

  tray = new Tray(trayIcon);

  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Lyrics anzeigen',
      type: 'checkbox',
      checked: isLyricsVisible,
      click: () => toggleLyrics()
    },
    {
      type: 'separator'
    },
    {
      label: 'Einstellungen',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Beenden',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('ShowLyrics - Lyrics für Spotify');

  // Handle tray click
  tray.on('click', () => {
    toggleLyrics();
  });
}

function toggleLyrics() {
  if (lyricsWindow) {
    if (lyricsWindow.isVisible()) {
      lyricsWindow.hide();
      isLyricsVisible = false;
      manuallyHidden = true; // Mark as manually hidden
    } else {
      lyricsWindow.show();
      isLyricsVisible = true;
      manuallyHidden = false; // Reset when manually shown
    }
    updateTrayMenu();
  }
}

function autoShowLyrics() {
  if (lyricsWindow && !lyricsWindow.isVisible() && !manuallyHidden) {
    lyricsWindow.show();
    isLyricsVisible = true;
    updateTrayMenu();
  }
}

function autoHideLyrics() {
  if (lyricsWindow && lyricsWindow.isVisible() && autoHideEnabled) {
    lyricsWindow.hide();
    isLyricsVisible = false;
    updateTrayMenu();
  }
}

function scheduleAutoHide() {
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout);
  }
  
  autoHideTimeout = setTimeout(() => {
    autoHideLyrics();
  }, 30000); // Hide after 30 seconds of no music
}

function cancelAutoHide() {
  if (autoHideTimeout) {
    clearTimeout(autoHideTimeout);
    autoHideTimeout = null;
  }
}

function updateTrayMenu() {
  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Lyrics anzeigen',
        type: 'checkbox',
        checked: isLyricsVisible,
        click: () => toggleLyrics()
      },
      {
        type: 'separator'
      },
      {
        label: 'Einstellungen',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Beenden',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(contextMenu);
  }
}

app.whenReady().then(() => {
  createMainWindow();
  createLyricsWindow();
  createTray();

  // Auto launch is disabled by default - users can enable it in settings

  // Show main window on startup

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createLyricsWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Don't quit the app when all windows are closed, keep running in tray
  // Only quit when explicitly requested via tray menu
});

ipcMain.on('toggle-lyrics-window', () => {
  if (lyricsWindow) {
    if (lyricsWindow.isVisible()) {
      lyricsWindow.hide();
    } else {
      lyricsWindow.show();
    }
  }
});

ipcMain.on('update-lyrics', (event, lyrics) => {
  if (lyricsWindow) {
    lyricsWindow.webContents.send('lyrics-updated', lyrics);
  }
});

ipcMain.on('update-playback-position', (event, position) => {
  if (lyricsWindow) {
    lyricsWindow.webContents.send('playback-position-updated', position);
    
    // Auto-show/hide logic based on playback state
    if (position.isPlaying) {
      cancelAutoHide();
      autoShowLyrics();
      lastPlayingState = true;
    } else if (lastPlayingState === true) {
      // Only schedule auto-hide when transitioning from playing to paused/stopped
      scheduleAutoHide();
      lastPlayingState = false;
    }
  }
});

// Handle user interaction events
ipcMain.on('lyrics-interaction', () => {
  cancelAutoHide();
});

ipcMain.on('music-stopped', () => {
  scheduleAutoHide();
});

// Auto-start IPC handlers
ipcMain.handle('get-auto-start-enabled', async () => {
  try {
    const loginItemSettings = app.getLoginItemSettings();
    return loginItemSettings.openAtLogin;
  } catch (error) {
    console.error('Error checking auto-start status:', error);
    return false;
  }
});

ipcMain.handle('set-auto-start', async (event, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false
    });
    return true;
  } catch (error) {
    console.error('Error setting auto-start:', error);
    return false;
  }
});

// IPC handlers for lyrics window control
ipcMain.on('hide-lyrics-window', () => {
  if (lyricsWindow && lyricsWindow.isVisible()) {
    lyricsWindow.hide();
    isLyricsVisible = false;
    manuallyHidden = true; // Mark as manually hidden when closed via ESC or close button
    updateTrayMenu();
  }
});

ipcMain.on('move-lyrics-window', (event, { deltaX, deltaY }) => {
  if (lyricsWindow) {
    const currentPosition = lyricsWindow.getPosition();
    lyricsWindow.setPosition(
      currentPosition[0] + deltaX,
      currentPosition[1] + deltaY
    );
  }
});

// Setup lyrics window interaction tracking
function setupLyricsInteractionTracking() {
  // Interaction tracking is now handled directly in lyrics-renderer.js
  // This function is kept for compatibility but no longer needed
}