const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow = null;
let appRoot = null;

function resolveAppRoot() {
  if (app.isPackaged) {
    return process.resourcesPath;
  }
  return path.resolve(__dirname, '..');
}

async function bootApi() {
  require('tsx/cjs/api').register();
  const { handleApiRequest } = require('../shared/api/handleApiRequest.ts');
  const { startServer } = require('../server/createServer.ts');

  appRoot = resolveAppRoot();

  // Static course file server (lessons + assets) — same Express adapter as browser mode
  await startServer(8765, { appRoot, serveDist: false });

  ipcMain.handle('hyperclass:api', async (_event, req) => {
    return handleApiRequest(req, { appRoot });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#e8eaed',
    title: 'HyperClass',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await bootApi();
  } catch (err) {
    console.error('Failed to boot API/server', err);
  }
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
