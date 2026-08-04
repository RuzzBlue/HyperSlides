const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hyperclass', {
  isElectron: true,
  platform: process.platform,
  fetch: (req) => ipcRenderer.invoke('hyperclass:api', req),
  setMinWidth: (width) => ipcRenderer.send('hyperclass:set-min-width', width),
});
