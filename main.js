// Taskvia, app de escritorio (Electron): levanta la UI local y la muestra en una ventana sin marco, con los
// botones nativos de Windows superpuestos sobre la barra superior de la app.
import { app, BrowserWindow, Menu, dialog, ipcMain, nativeTheme, shell } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as updater from './updater.js';
import { URL, ready } from './ui.js';
import { DATA_DIR, assetPath, backupIfDue, getSettings, firstRun, readPage } from './store.js';
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
const mcpServer = () => {
  const mcp = path.join(app.getAppPath(), 'mcp.js');
  return app.isPackaged ? { command: process.execPath, args: [mcp], env: { ELECTRON_RUN_AS_NODE: '1' } } : { command: 'node', args: [mcp] };
};
ipcMain.handle('mcp-config', () => JSON.stringify({ mcpServers: { taskvia: mcpServer() } }, null, 2));

// «Conectar»: añade el servidor a la configuración MCP de los asistentes que encuentre (el de terminal en
// ~/.claude.json y la app de escritorio) y deja en sus instrucciones globales (~/.claude/CLAUDE.md) la regla de
// documentar en Taskvia, entre marcas para poder actualizarla sin duplicarla. Antes de tocar un fichero guarda copia.
const RULE = `<!-- taskvia:inicio -->
# Documentación en Taskvia

Todo lo que sea documentar (guías, notas técnicas, decisiones, cómo probar algo) va en Taskvia con el MCP \`taskvia\` (\`doc_write\`), no en ficheros .md sueltos, salvo que pida un fichero. Las capturas van con su ruta absoluta en disco (\`![texto](C:/ruta/captura.png)\`): Taskvia las copia al proyecto. Si editas una página en varios pasos, avisa con \`doc_editing\`.
<!-- taskvia:fin -->`;
function editJSON(file, fn) {
  const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '{}';
  const data = JSON.parse(raw || '{}');
  if (fs.existsSync(file) && !fs.existsSync(file + '.taskvia-copia')) fs.writeFileSync(file + '.taskvia-copia', raw);
  fn(data);
  fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(file + '.tmp', file);
}
ipcMain.handle('mcp-connect', () => {
  const home = os.homedir(), done = [];
  try {
    if (fs.existsSync(path.join(home, '.claude')) || fs.existsSync(path.join(home, '.claude.json'))) {
      editJSON(path.join(home, '.claude.json'), d => { d.mcpServers = { ...d.mcpServers, taskvia: { type: 'stdio', ...mcpServer() } }; });
      const md = path.join(home, '.claude', 'CLAUDE.md');
      fs.mkdirSync(path.dirname(md), { recursive: true });
      const old = fs.existsSync(md) ? fs.readFileSync(md, 'utf8') : '';
      const next = /<!-- taskvia:inicio -->[\s\S]*?<!-- taskvia:fin -->/.test(old)
        ? old.replace(/<!-- taskvia:inicio -->[\s\S]*?<!-- taskvia:fin -->/, RULE) : `${old.trimEnd()}${old.trim() ? '\n\n' : ''}${RULE}\n`;
      if (next !== old) { if (old && !fs.existsSync(md + '.taskvia-copia')) fs.writeFileSync(md + '.taskvia-copia', old); fs.writeFileSync(md, next); }
      done.push('asistente de terminal');
    }
    const desk = path.join(process.env.APPDATA || path.join(home, 'Library', 'Application Support'), 'Claude');
    if (fs.existsSync(desk)) {
      editJSON(path.join(desk, 'claude_desktop_config.json'), d => { d.mcpServers = { ...d.mcpServers, taskvia: mcpServer() }; });
      done.push('app de escritorio');
    }
    return { done };
  } catch (e) {
    return { error: `No se pudo conectar: ${e.message}` };
  }
});

// Exportar una página: .md (con sus imágenes en una carpeta al lado) o PDF (la vista de la página, sin la app alrededor)
ipcMain.on('open-path', (_, file) => { if (typeof file === 'string' && /\.(md|pdf)$/i.test(file)) shell.openPath(file); });
ipcMain.handle('export-page', async (e, format, project, ref) => {
  const pg = readPage(project, ref), name = pg.path.split('/').at(-1).replace(/[<>:"/\\|?*]/g, '');
  const w = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(w, {
    defaultPath: path.join(app.getPath('documents'), `${name}.${format}`),
    filters: format === 'pdf' ? [{ name: 'PDF', extensions: ['pdf'] }] : [{ name: 'Markdown', extensions: ['md'] }],
  });
  if (canceled || !filePath) return {};
  try {
    if (format === 'pdf') {
      // A4 con márgenes de 1,8 cm y pie con el nombre de la página y «x / y»
      const foot = `<div style="width:100%;padding:0 1.8cm;font:8px Segoe UI,sans-serif;color:#888;display:flex;justify-content:space-between">
        <span>${name.replace(/[<>&]/g, '')}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
      // En tema oscuro Chromium pinta oscuros los márgenes de la hoja: se imprime siempre en claro y se vuelve al tema
      const theme = nativeTheme.themeSource;
      nativeTheme.themeSource = 'light';
      for (let i = 0; i < 40 && await e.sender.executeJavaScript("matchMedia('(prefers-color-scheme: dark)').matches"); i++) await new Promise(r => setTimeout(r, 50));
      // dos fotogramas pintados y un margen: si no, a veces la hoja sale con los márgenes aún oscuros
      await e.sender.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
      await new Promise(r => setTimeout(r, 300));
      try {
        fs.writeFileSync(filePath, await e.sender.printToPDF({ pageSize: 'A4', printBackground: true,
          margins: { top: 0.7, bottom: 0.8, left: 0.7, right: 0.7 }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: foot }));
      } finally { nativeTheme.themeSource = theme; }
    } else {
      // Las imágenes del proyecto se copian a «<nombre>-imagenes» junto al .md y los enlaces apuntan ahí
      const imgDir = `${path.basename(filePath, '.md')}-imagenes`;
      let copied = 0;
      const md = pg.content.replace(/\]\(assets\/([0-9a-f]{8}\.[a-z0-9]{1,10})\)/gi, (m, file) => {
        try {
          fs.mkdirSync(path.join(path.dirname(filePath), imgDir), { recursive: true });
          fs.copyFileSync(assetPath(project, file), path.join(path.dirname(filePath), imgDir, file));
          copied++;
          return `](${imgDir}/${file})`;
        } catch { return m; }
      });
      fs.writeFileSync(filePath, `# ${name}\n\n${md}`);
    }
    return { file: filePath };
  } catch (err) {
    return { error: `No se pudo exportar: ${err.message}` };
  }
});

// Actualizaciones (solo con la app instalada), como en Moorage: comprobar es automático (al abrir y cada 4 h) y
// barato; la descarga solo cuando la pides en Ajustes, y el instalador se ejecuta en silencio al reiniciar.
// Estados: dev, idle, checking, none, available, downloading, ready, error. La UI recibe cada cambio.
let win, update = { state: app.isPackaged ? 'idle' : 'dev' };
const setUpdate = u => { update = u; win?.webContents.send('update', u); };
async function checkUpdate() {
  if (!app.isPackaged || ['checking', 'downloading', 'ready'].includes(update.state)) return;
  setUpdate({ state: 'checking' });
  const r = await updater.checkUpdate();
  setUpdate(r.error ? { state: 'error', message: r.error } : r.newer ? { state: r.downloaded ? 'ready' : 'available', version: r.version, size: r.size } : { state: 'none' });
}
async function downloadUpdate() {
  if (update.state !== 'available') return;
  const { version, size } = update;
  setUpdate({ state: 'downloading', version, size, percent: 0 });
  const r = await updater.downloadUpdate((got, total) => setUpdate({ state: 'downloading', version, size, percent: total ? Math.round(got / total * 100) : 0 }));
  setUpdate(r.ok ? { state: 'ready', version } : { state: 'error', message: r.error });
}
ipcMain.handle('update-status', () => ({ ...update, current: app.getVersion() }));
ipcMain.handle('update-check', checkUpdate);
ipcMain.handle('update-download', downloadUpdate);
ipcMain.on('update-install', () => {
  if (update.state !== 'ready') return;
  const r = updater.launchInstaller();
  if (r.ok) app.quit(); else setUpdate({ state: 'error', message: r.error });
});

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
    // TASKVIA_HIDDEN=1 (pruebas): sin ventana visible ni robar el foco, y sin frenar el render en segundo plano
    show: !process.env.TASKVIA_HIDDEN,
    webPreferences: { preload: path.join(import.meta.dirname, 'preload.cjs'), backgroundThrottling: !process.env.TASKVIA_HIDDEN },
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
  setTimeout(checkUpdate, 8000); // sin conexión no pasa nada: queda en «error» y se reintenta a las 4 h
  setInterval(checkUpdate, 4 * 3600 * 1000);
  win.loadURL(URL);
});
app.on('window-all-closed', () => app.quit());
