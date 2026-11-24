const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 3000;

function startBackendServer() {
  const userDataDir = app.getPath('userData');
  fs.mkdirSync(userDataDir, { recursive: true });
  const dbPath = path.join(userDataDir, 'taskflow.db');
  const serverEntry = path.join(__dirname, '..', 'server.ts');

  serverProcess = spawn(process.execPath, [serverEntry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(SERVER_PORT),
      TASKFLOW_DB_PATH: dbPath,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'inherit',
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: 'TaskFlow – Smart TODO Manager',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);

  const url = `http://127.0.0.1:${SERVER_PORT}`;
  const loadWithRetry = (attempt = 0) => {
    mainWindow.loadURL(url).catch(() => {
      if (attempt < 20) {
        setTimeout(() => loadWithRetry(attempt + 1), 250);
      }
    });
  };
  loadWithRetry();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
