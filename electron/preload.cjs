const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hyperslide', {
  isElectron: true,
  platform: process.platform,
  fetch: (req) => ipcRenderer.invoke('hyperslide:api', req),
});
