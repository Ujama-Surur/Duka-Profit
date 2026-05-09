import { app, BrowserWindow } from 'electron';

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
    });

    // Load your frontend correctly
    win.loadURL('http://localhost:5174');

    win.webContents.openDevTools();
}

app.whenReady().then(createWindow);
