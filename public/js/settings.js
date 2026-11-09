// ================= Ajustes (data/settings.json) =================
let settings = { formatBar: 'floating' };
const ACCENTS = { blue: ['#2383e2', '#0077d4', 'Azul'], purple: ['#8a5cb0', '#774a9c', 'Morado'], green: ['#3f7a5a', '#346a4d', 'Verde'],
  orange: ['#b85c0a', '#9e4f08', 'Naranja'], pink: ['#b8437f', '#a1386f', 'Rosa'], red: ['#c4413c', '#ab3833', 'Rojo'], gray: ['#6b6a66', '#5a5955', 'Grafito'] };
function applySettings(s) {
  settings = { ...s, lastBackup: settings.lastBackup };
  const [a, h] = ACCENTS[s.accent] || ACCENTS.blue;
  document.documentElement.style.setProperty('--accent', a);
  document.documentElement.style.setProperty('--accent-hover', h);
  document.body.classList.toggle('font-serif', s.pageFont === 'serif');
  document.body.classList.toggle('font-mono', s.pageFont === 'mono');
  document.body.classList.toggle('wide-pages', s.pageWidth === 'full');
  document.body.classList.toggle('no-tips', !s.aiTips);
  document.body.classList.toggle('fixed-bar', s.formatBar === 'fixed');
  window.desktop?.setTheme(s.theme); // en Electron cambia el tema nativo y con él prefers-color-scheme
}
const row = (title, help, control) => `<div class="set-row"><div><b>${title}</b><span>${help}</span></div>${control}</div>`;
function renderSettings() {
  const seg = (key, opts) => `<div class="seg" role="radiogroup">${opts.map(([v, label, ic]) =>
    `<button role="radio" aria-checked="${settings[key] === v}" class="${settings[key] === v ? 'on' : ''}" data-set="${key}" data-val="${v}">${ic || ''}${label}</button>`).join('')}</div>`;
  const font = f => `<span class="aa" style="font-family:${f}">Ag</span>`;
  $('#settings-body').innerHTML = `
    <section><h3>Apariencia</h3>
      ${row('Tema', window.desktop ? 'Claro, oscuro o el que tenga Windows.' : 'Solo se aplica en la app de escritorio.', seg('theme', [['system', 'Sistema', icon('monitor', 'sm')], ['light', 'Claro', icon('sun', 'sm')], ['dark', 'Oscuro', icon('moon', 'sm')]]))}
      ${row('Color de acento', 'Botones principales, selección y casillas marcadas.', `<div class="accents">${Object.entries(ACCENTS).map(([k, [c, , name]]) =>
        `<button class="${settings.accent === k ? 'on' : ''}" style="background:${c};color:${c}" data-set="accent" data-val="${k}" title="${name}" aria-label="${name}" aria-pressed="${settings.accent === k}"></button>`).join('')}</div>`)}
    </section>
    <section><h3>Páginas</h3>
      ${row('Tipografía', 'Para el título y el texto de las páginas.', seg('pageFont', [['sans', 'Normal', font('var(--font)')], ['serif', 'Serif', font('var(--serif)')], ['mono', 'Mono', font('var(--mono)')]]))}
      ${row('Ancho', 'Ancho completo aprovecha toda la ventana.', seg('pageWidth', [['normal', 'Normal'], ['full', 'Completo']]))}
      ${row('Barra de formato', 'Flotante: aparece al seleccionar texto. Fija: siempre arriba, como en Word.', seg('formatBar', [['floating', 'Flotante'], ['fixed', 'Fija']]))}
    </section>
    <section><h3>IA</h3>
      ${window.desktop ? row('Conectar con tu IA', 'Añade Taskvia a tu asistente de IA y le deja la regla de documentar siempre aquí. Después, reinícialo. Si usas otro asistente, copia la configuración y pégala tú.', `<div class="row-btns"><button class="btn primary" data-mcp-connect>${icon('plug-zap', 'sm')}Conectar</button><button class="btn ghost" data-mcp-config>${icon('copy', 'sm')}Copiar configuración</button></div>`) : ''}
      ${row('Consejos para la IA', 'Muestra en Inicio y en cada proyecto cómo pedirle tareas a tu asistente de IA.', `<button class="switch" role="switch" aria-checked="${settings.aiTips}" aria-label="Consejos para la IA" data-set="aiTips" data-val="${!settings.aiTips}"></button>`)}
    </section>
    ${window.desktop ? `<section><h3>Actualizaciones</h3>${updateRow()}</section>` : ''}
    <section><h3>Datos</h3>
      ${row('Carpeta de datos', `<span class="path">${esc(settings.dataDir)}</span>`, window.desktop ? '<button class="btn ghost" data-open-data>' + icon('folder-open', 'sm') + 'Abrir carpeta</button>' : '')}
      ${row('Copias de seguridad', settings.lastBackup ? `Una al día, se guardan 14. La última: ${esc(settings.lastBackup)}.` : 'Una al día al abrir la app; se guardan 14.',
        `<div class="row-btns"><button class="btn ghost" data-backup-now>${icon('database-backup', 'sm')}Hacer copia ahora</button>${window.desktop ? `<button class="btn ghost" data-open-backups>${icon('folder-clock', 'sm')}Abrir copias</button>` : ''}</div>`)}
    </section>`;
}
// Estado de la actualización que manda Electron: idle, checking, none, downloading, ready, error (dev = desde el código)
let update = { state: 'dev' };
const mb = n => n ? ` (${Math.round(n / 1048576)} MB)` : '';
function updateRow() {
  const u = update, busy = ['checking', 'downloading'].includes(u.state);
  const help = {
    dev: 'Desde el código: se actualiza con git pull.', idle: 'Comprueba si hay versión nueva al abrir la app y cada 4 horas; solo descarga si se lo pides.',
    checking: 'Buscando…', none: 'Tienes la última versión.', available: `Hay una versión nueva: la ${esc(u.version)}${mb(u.size)}.`,
    downloading: `Descargando la ${esc(u.version)}… ${u.percent || 0}%`,
    ready: `La ${esc(u.version)} está descargada. Al reiniciar se instala sola y Taskvia vuelve a abrirse.`, error: `No se pudo comprobar: ${esc(u.message)}`,
  }[u.state];
  const btn = u.state === 'dev' ? ''
    : u.state === 'ready' ? `<button class="btn primary" data-update-install>${icon('rotate-cw', 'sm')}Reiniciar y actualizar</button>`
    : u.state === 'available' ? `<button class="btn primary" data-update-download>${icon('download', 'sm')}Descargar</button>`
    : `<button class="btn ghost" data-update-check ${busy ? 'disabled' : ''}>${icon('refresh-cw', 'sm')}Buscar actualizaciones</button>`;
  return row(`Versión ${esc(u.current || '')}`, help, btn);
}
let toldVersion = null; // el aviso de versión nueva sale una vez por versión, no cada 4 h
window.desktop?.onUpdate(async u => {
  update = { ...update, ...u };
  if ($('#settings').open) renderSettings();
  if (u.state === 'available' && u.version !== toldVersion) {
    toldVersion = u.version;
    toast(`Taskvia ${u.version} disponible`, false, { label: 'Ver', run: openSettings });
  }
});
// Exportar la página abierta: el proceso principal pregunta dónde guardar (y, en PDF, imprime la vista de la página)
async function exportPage(format) {
  await flushRte();
  document.body.classList.add('printing');
  try {
    const r = await window.desktop.exportPage(format, route.project, route.path);
    if (r?.file) toast(`Exportada: ${r.file.split(/[\\/]/).pop()}`, false, { label: 'Abrir', run: () => window.desktop.openPath(r.file) });
    else if (r?.error) toast(r.error, true);
  } finally { document.body.classList.remove('printing'); }
}
async function connectAI() {
  const r = await window.desktop.connectAI();
  if (r.error) return toast(r.error, true);
  toast(r.done.length ? `Conectado: ${r.done.join(', ')}. Reinicia tu IA para que lo coja.` : 'No he encontrado ninguna IA instalada: usa «Copiar configuración».', !r.done.length);
}
async function openSettings() {
  settings.lastBackup = (await call('listBackups'))[0];
  if (window.desktop) update = await window.desktop.updateStatus();
  renderSettings(); $('#settings').showModal();
}
$('#settings').addEventListener('click', async e => {
  if (e.target.id === 'settings' || e.target.closest('[data-close]')) return $('#settings').close();
  if (e.target.closest('[data-open-data]')) return window.desktop?.openDataDir();
  if (e.target.closest('[data-open-backups]')) return window.desktop?.openBackups();
  if (e.target.closest('[data-update-check]')) return window.desktop.checkUpdate();
  if (e.target.closest('[data-update-download]')) return window.desktop.downloadUpdate();
  if (e.target.closest('[data-update-install]')) return window.desktop.installUpdate();
  if (e.target.closest('[data-mcp-connect]')) return connectAI();
  if (e.target.closest('[data-mcp-config]')) return copyText(await window.desktop.mcpConfig(), 'Configuración copiada. Pégala en tu asistente de IA');
  if (e.target.closest('[data-backup-now]')) {
    settings.lastBackup = (await call('backupNow')).name;
    renderSettings();
    return toast('Copia de seguridad hecha');
  }
  const b = e.target.closest('[data-set]');
  if (!b) return;
  const v = b.dataset.val === 'true' ? true : b.dataset.val === 'false' ? false : b.dataset.val;
  applySettings(await call('saveSettings', { [b.dataset.set]: v }));
  renderSettings();
  if (b.dataset.set === 'aiTips') renderMain();
});
