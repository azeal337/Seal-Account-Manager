const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sealLaunch', { onProgress: callback => ipcRenderer.on('seal:launchProgress', (_event, state) => callback(state)) });
