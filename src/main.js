const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow;
let lyricsWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'ShowLyrics - Settings'
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
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
    skipTaskbar: true
  });

  lyricsWindow.loadFile(path.join(__dirname, 'lyrics.html'));
  
  if (process.argv.includes('--dev')) {
    lyricsWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createMainWindow();
  createLyricsWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createLyricsWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
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