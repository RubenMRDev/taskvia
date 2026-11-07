// Taskvia, app de escritorio (Electron): levanta la UI local y la muestra en una ventana sin marco, con los
// botones nativos de Windows superpuestos sobre la barra superior de la app.
import { app, BrowserWindow, Menu, ipcMain, nativeTheme, shell } from 'electron';
import path from 'node:path';
import updater from 'electron-updater';
import { URL, ready } from './ui.js';
import { DATA_DIR, assetPath, backupIfDue, getSettings, firstRun } from './store.js';
import { seedExample } from './ejemplo.js';

// Colores de la barra superior en claro/oscuro (los mismos que --bg y --text en index.html).
const overlay = () => nativeTheme.shouldUseDarkColors
  ? { color: '#191919', symbolColor: '#d4d4d4', height: 44 }
  : { color: '#ffffff', symbolColor: '#37352f', height: 44 };

// Los enlaces del markdown se abren en el navegador, no dentro de la app.
const external = url => { if (/^https?:/.test(url)) shell.openExternal(url); };

app.setName('Taskvia');
if (process.platform === 'win32') app.setAppUserModelId('com.taskvia.app'); // agrupa la barra de tareas con su icono
const ICON = path.join(import.meta.dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png');

// El tema elegido en Ajustes manda sobre el de Windows; la UI lo sigue vía prefers-color-scheme.
nativeTheme.themeSource = getSettings().theme;
ipcMain.on('theme', (_, theme) => { if (['system', 'light', 'dark'].includes(theme)) nativeTheme.themeSource = theme; });
ipcMain.on('open-data-dir', () => shell.openPath(DATA_DIR));
ipcMain.on('open-backups', () => shell.openPath(path.join(DATA_DIR, 'backups')));
// Adjuntos: abrir con su programa o enseñarlos en la carpeta (la ruta la valida el store)
ipcMain.on('open-file', (_, project, file, reveal) => {
  try { const f = assetPath(project, String(file).replace(/^assets\//, '')); reveal ? shell.showItemInFolder(f) : shell.openPath(f); } catch {}
});

// Configuración MCP para pegar en el asistente de IA. Instalada, el propio ejecutable hace de Node
// (ELECTRON_RUN_AS_NODE), así que no hace falta tener Node instalado.
ipcMain.handle('mcp-config', () => {
  const mcp = path.join(app.getAppPath(), 'mcp.js');
  const server = app.isPackaged ? { command: process.execPath, args: [mcp], env: { ELECTRON_RUN_AS_NODE: '1' } } : { command: 'node', args: [mcp] };
  return JSON.stringify({ mcpServers: { taskvia: server } }, null, 2);
});

// Actualizaciones (solo con la app instalada): busca al abrir y con el botón de Ajustes, descarga sola
// y se instala al cerrar o al pulsar «Reiniciar». La UI recibe cada cambio de estado.
const { autoUpdater } = updater;
let win, update = { state: app.isPackaged ? 'idle' : 'dev' };
const setUpdate = u => { update = u; win?.webContents.send('update', u); };
autoUpdater.on('checking-for-update', () => setUpdate({ state: 'checking' }));
autoUpdater.on('update-not-available', () => setUpdate({ state: 'none' }));
autoUpdater.on('update-available', i => setUpdate({ state: 'downloading', version: i.version, percent: 0 }));
autoUpdater.on('download-progress', p => setUpdate({ ...update, state: 'downloading', percent: Math.round(p.percent) }));
autoUpdater.on('update-downloaded', i => setUpdate({ state: 'ready', version: i.version }));
autoUpdater.on('error', e => setUpdate({ state: 'error', message: String(e.message || e).split('\n')[0].slice(0, 140) }));
const checkUpdate = () => { if (app.isPackaged && !['checking', 'downloading', 'ready'].includes(update.state)) autoUpdater.checkForUpdates().catch(() => {}); };
ipcMain.handle('update-status', () => ({ ...update, current: app.getVersion() }));
ipcMain.handle('update-check', checkUpdate);
ipcMain.on('update-install', () => { if (update.state === 'ready') autoUpdater.quitAndInstall(true, true); }); // silencioso y vuelve a abrir la app, sin el asistente del instalador

// Copia de seguridad diaria de data/ (al abrir y comprobando cada hora; se guardan 14 días).
const backup = () => { try { backupIfDue(); } catch (e) { console.error('Copia de seguridad fallida:', e.message); } };

app.whenReady().then(async () => {
  await ready;
  if (firstRun) try { seedExample(); } catch (e) { console.error('Proyecto de ejemplo:', e.message); }
  backup();
  setInterval(backup, 60 * 60 * 1000);
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 720, minHeight: 480, title: 'Taskvia', icon: ICON,
    backgroundColor: overlay().color, titleBarStyle: 'hidden', titleBarOverlay: overlay(),
    webPreferences: { preload: path.join(import.meta.dirname, 'preload.cjs') },
  });
  nativeTheme.on('updated', () => { win.setTitleBarOverlay(overlay()); win.setBackgroundColor(overlay().color); });
  win.webContents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(URL)) { e.preventDefault(); external(url); } });
  // Menú de clic derecho en el texto editable: sugerencias del corrector, cortar/copiar/pegar.
  win.webContents.session.setSpellCheckerLanguages(['es-ES', 'en-US']);
  win.webContents.on('context-menu', (_, params) => {
    if (!params.isEditable) return;
    const fixes = params.dictionarySuggestions.slice(0, 5).map(w => ({ label: w, click: () => win.webContents.replaceMisspelling(w) }));
    Menu.buildFromTemplate([
      ...fixes, ...(fixes.length ? [{ type: 'separator' }] : []),
      { role: 'cut', label: 'Cortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Pegar' },
      { type: 'separator' }, { role: 'selectAll', label: 'Seleccionar todo' },
    ]).popup();
  });
  win.webContents.once('did-finish-load', checkUpdate); // sin conexión no pasa nada: queda en «error» y se reintenta otro día
  win.loadURL(URL);
});
app.on('window-all-closed', () => app.quit());
