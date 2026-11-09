// Puente mínimo entre la UI y Electron: cambiar el tema nativo y abrir las carpetas de datos y de copias.
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  setTheme: theme => ipcRenderer.send('theme', theme),
  openDataDir: () => ipcRenderer.send('open-data-dir'),
  openBackups: () => ipcRenderer.send('open-backups'),
  openFile: (project, file, reveal = false) => ipcRenderer.send('open-file', project, file, reveal),
  mcpConfig: () => ipcRenderer.invoke('mcp-config'),
  connectAI: () => ipcRenderer.invoke('mcp-connect'),
  exportPage: (format, project, path) => ipcRenderer.invoke('export-page', format, project, path),
  openPath: file => ipcRenderer.send('open-path', file),
  getZoom: () => webFrame.getZoomFactor(),
  setZoom: f => webFrame.setZoomFactor(f),
  updateStatus: () => ipcRenderer.invoke('update-status'),
  checkUpdate: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: () => ipcRenderer.invoke('update-download'),
  installUpdate: () => ipcRenderer.send('update-install'),
  onUpdate: cb => ipcRenderer.on('update', (_, u) => cb(u)),
});
