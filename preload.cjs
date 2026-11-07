// Puente mínimo entre la UI y Electron: cambiar el tema nativo y abrir las carpetas de datos y de copias.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  setTheme: theme => ipcRenderer.send('theme', theme),
  openDataDir: () => ipcRenderer.send('open-data-dir'),
  openBackups: () => ipcRenderer.send('open-backups'),
  openFile: (project, file, reveal = false) => ipcRenderer.send('open-file', project, file, reveal),
  mcpConfig: () => ipcRenderer.invoke('mcp-config'),
});
