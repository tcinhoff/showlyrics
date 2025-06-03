const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let lyricsWindow;
let tray;
let isLyricsVisible = true;


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
    show: true // Start visible
  });

  lyricsWindow.loadFile(path.join(__dirname, 'lyrics.html'));
  
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
    } else {
      lyricsWindow.show();
      isLyricsVisible = true;
    }
    updateTrayMenu();
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
  }
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