const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDeviceId: () => ipcRenderer.invoke('get-device-id'),
  getStartupLicenseStatus: () => ipcRenderer.invoke('get-startup-license-status'),
  saveLicenseFile: (data) => ipcRenderer.invoke('save-license-file', data),
  loadLicenseFile: () => ipcRenderer.invoke('load-license-file'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  platform: process.platform,
});
