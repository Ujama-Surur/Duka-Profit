const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { getMachineId } = require('../utils/machineId');
const { loadLicense, saveLicense } = require('./utils/licenseStorage');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let distServer;
let distServerPort;
let startupLicenseStatus = {
  valid: false,
  requiresActivation: true,
  reason: 'missing',
  machineId: null,
  key: null,
};

process.on('uncaughtException', (err) => {
  console.error('Main process uncaughtException:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('Main process unhandledRejection:', reason);
});

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    case '.map':
      return 'application/json; charset=utf-8';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function startDistServer(distDir) {
  distServer = http.createServer((req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      res.end();
      return;
    }

    try {
      const urlPath = (req.url || '/').split('?')[0];
      const safeRel = decodeURIComponent(urlPath.replace(/^\/+/, ''));
      const absPath = path.join(distDir, safeRel || 'index.html');

      // Basic traversal protection.
      if (!absPath.startsWith(distDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      const fileToServe = fs.existsSync(absPath) && fs.statSync(absPath).isFile()
        ? absPath
        : path.join(distDir, 'index.html');

      res.writeHead(200, {
        'Content-Type': getMimeType(fileToServe),
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(fileToServe).pipe(res);
    } catch (e) {
      console.error('Dist server error:', e);
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error');
    }
  });

  distServer.on('clientError', (err) => {
    console.error('Dist server clientError:', err);
  });

  return new Promise((resolve) => {
    distServer.listen(0, '127.0.0.1', () => {
      distServerPort = distServer.address().port;
      console.log(`Dist server listening on http://127.0.0.1:${distServerPort}`);
      resolve({ port: distServerPort });
    });
  });
}

function validateLicenseAtStartup() {
  try {
    const machineId = getMachineId();
    startupLicenseStatus.machineId = machineId;

    const license = loadLicense();
    if (!license) {
      startupLicenseStatus = {
        ...startupLicenseStatus,
        valid: false,
        requiresActivation: true,
        reason: 'missing',
        key: null,
      };
      return { startRoute: '/activate' };
    }

    if (license.machineId !== machineId) {
      startupLicenseStatus = {
        ...startupLicenseStatus,
        valid: false,
        requiresActivation: true,
        reason: 'machine_mismatch',
        key: license.key,
      };
      dialog.showErrorBox(
        'License Validation Failed',
        'This license is bound to a different machine. The app will now close.'
      );
      return { blocked: true };
    }

    startupLicenseStatus = {
      ...startupLicenseStatus,
      valid: true,
      requiresActivation: false,
      reason: 'valid',
      key: license.key,
    };
    return { startRoute: '/dashboard' };
  } catch (error) {
    console.error('Startup license check failed:', error);
    startupLicenseStatus = {
      ...startupLicenseStatus,
      valid: false,
      requiresActivation: true,
      reason: 'error',
      key: null,
    };
    return { startRoute: '/activate' };
  }
}

function createWindow(startRoute = '/dashboard') {
  const iconPath = path.join(__dirname, '../frontend/dist/icon.png');
  const windowIcon = fs.existsSync(iconPath) ? iconPath : undefined;
  const wantsDevTools =
    isDev ||
    process.env.ELECTRON_DEVTOOLS === '1' ||
    process.argv.includes('--devtools');

  const winOptions = {
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // Allow module scripts/styles to load from `file://` in dev/unpackaged mode.
      // This avoids "white screen" when Vite emits `crossorigin` on assets.
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    titleBarStyle: 'default',
    show: false,
  };

  if (windowIcon) winOptions.icon = windowIcon;

  mainWindow = new BrowserWindow(winOptions);

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Electron renderer process gone:', details);
  });

  mainWindow.webContents.on('render-process-crashed', (event, details) => {
    console.error('Electron renderer process crashed:', details);
  });

  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173/#${startRoute}`);
    mainWindow.webContents.openDevTools();
  } else {
    const distDir = path.join(__dirname, '../frontend/dist');
    startDistServer(distDir)
      .then(({ port }) => {
        mainWindow.loadURL(`http://127.0.0.1:${port}/#${startRoute}`);
        if (wantsDevTools) mainWindow.webContents.openDevTools();
      })
      .catch((e) => {
        console.error('Failed starting dist server, falling back to loadFile:', e);
        mainWindow.loadFile(path.join(distDir, 'index.html'));
        if (wantsDevTools) mainWindow.webContents.openDevTools();
      });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  const startupState = validateLicenseAtStartup();
  if (startupState.blocked) {
    app.quit();
    return;
  }
  createWindow(startupState.startRoute);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const nextState = validateLicenseAtStartup();
      if (nextState.blocked) {
        app.quit();
        return;
      }
      createWindow(nextState.startRoute);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try {
    if (distServer) distServer.close();
  } catch {}
});

// IPC handlers
ipcMain.handle('get-device-id', async () => {
  try {
    return getMachineId();
  } catch {
    return require('crypto').randomBytes(16).toString('hex');
  }
});

ipcMain.handle('open-external', async (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('get-startup-license-status', async () => {
  return startupLicenseStatus;
});

ipcMain.handle('save-license-file', async (_, payload) => {
  const saved = saveLicense(payload);
  startupLicenseStatus = {
    ...startupLicenseStatus,
    valid: true,
    requiresActivation: false,
    reason: 'valid',
    key: saved.key,
    machineId: saved.machineId,
  };
  return saved;
});

ipcMain.handle('load-license-file', async () => {
  return loadLicense();
});
