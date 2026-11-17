const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', Object.freeze({
  qaMode: process.argv.includes('--senslab-qa'),
  load: () => ipcRenderer.invoke('load-state'),
  save: (data) => ipcRenderer.invoke('save-state', data),
  saveSession: (data) => ipcRenderer.invoke('save-session', data),
  readSession: (id) => ipcRenderer.invoke('read-session', id),
  copySens: (text) => ipcRenderer.invoke('copy-sens', text),
  fullscreen: () => ipcRenderer.invoke('fullscreen'),
  setDiscordPresence: enabled => ipcRenderer.invoke('discord-presence', enabled),
  exportResults: (data) => ipcRenderer.invoke('export-results', data),
  version: '0.2.1'
}));
