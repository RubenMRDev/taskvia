// Taskvia — datos 100% locales, legibles sin la app. Por defecto en %APPDATA%/Taskvia/datos (Windows),
// ~/Library/Application Support/Taskvia/datos (macOS) o ~/.local/share/Taskvia/datos (Linux):
//   data/settings.json                             ajustes, favoritos y orden de proyectos
//   data/projects/<Proyecto>/project.json          { emoji }
//   data/projects/<Proyecto>/boards/<id>.json      tablero kanban (columnas, etiquetas, tarjetas)
//   data/projects/<Proyecto>/docs/<Página>.md      páginas markdown; la carpeta <Página>/ guarda sus subpáginas
//   data/projects/<Proyecto>/assets/<id>.png       imágenes pegadas en las páginas
//   data/trash/<id>/                               papelera (30 días)
//   data/backups/<AAAA-MM-DD>/                     copia diaria (se guardan 14)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support')
  : process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'));
const customDir = process.env.TASKVIA_DIR || process.env.ORDENIA_DIR || process.env.TABLERO_DIR;
export const DATA_DIR = path.resolve(customDir || path.join(appData, 'Taskvia', 'datos'));
// Versiones anteriores: datos junto al código (./data) o bajo los nombres provisionales «Ordenia» y «Pespunte».
// Se copian una vez a la carpeta nueva, sin borrar el original.
const LEGACY_DIRS = [path.join(appData, 'Ordenia', 'datos'), path.join(appData, 'Pespunte', 'datos'), path.join(import.meta.dirname, 'data')];
const legacy = !customDir && !fs.existsSync(path.join(DATA_DIR, 'projects')) && LEGACY_DIRS.find(d => fs.existsSync(path.join(d, 'projects')));
if (legacy) fs.cpSync(legacy, DATA_DIR, { recursive: true });
const ROOT = path.join(DATA_DIR, 'projects');
const TRASH = path.join(DATA_DIR, 'trash');
const BACKUPS = path.join(DATA_DIR, 'backups');
const SETTINGS = path.join(DATA_DIR, 'settings.json');
fs.mkdirSync(ROOT, { recursive: true });

export const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const COLUMN_COLORS = ['gray', 'blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'red', 'brown'];
const TRASH_DAYS = 30, BACKUPS_KEPT = 14, MAX_ASSET = 15 * 1024 * 1024;
const newId = () => randomUUID().slice(0, 8);
const now = () => new Date().toISOString();
const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const color = c => (COLORS.includes(c) ? c : 'gray');
const hash = text => createHash('sha1').update(text).digest('hex');

const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
// ponytail: leer-modificar-escribir sin lock entre procesos (app + MCP); vale para una sola persona.
function writeJSON(f, data) {
  fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 2));
  fs.renameSync(f + '.tmp', f);
}

// Nombres que acaban siendo carpetas o ficheros: nada de separadores, ".." ni caracteres prohibidos en Windows.
function cleanName(n, what) {
  n = String(n ?? '').trim();
  if (!n || n === '.' || n === '..' || /[<>:"/\\|?*\x00-\x1f]/.test(n) || /[. ]$/.test(n))
    throw new Error(`${what} no válido: "${n}". No uses < > : " / \\ | ? * ni lo termines en punto.`);
  return n;
}

// Error de "alguien ha cambiado esto mientras editabas": la UI lo convierte en un aviso con opciones.
function conflict(message, current) {
  const e = new Error(message);
  e.code = 'conflict'; e.current = current;
  return e;
}

// ---------- Quién hace cada cambio (para el historial de las tarjetas) ----------
// Por defecto es la IA (el MCP); la UI envuelve sus llamadas con asActor('tú', …).
let actor = 'ia';
export function asActor(who, fn) {
  const prev = actor;
  actor = who;
  try { return fn(); } finally { actor = prev; }
}

// ---------- Ajustes (data/settings.json) ----------
// Los iconos se guardan en el mismo campo que el emoji: "🚀" o "lucide:<icono>:<color>".
const DEFAULT_SETTINGS = { theme: 'system', accent: 'blue', pageFont: 'sans', pageWidth: 'normal', formatBar: 'floating', aiTips: true };
const SETTING_VALUES = {
  theme: ['system', 'light', 'dark'], accent: ['blue', 'purple', 'green', 'orange', 'pink', 'red', 'gray'],
  pageFont: ['sans', 'serif', 'mono'], pageWidth: ['normal', 'full'], formatBar: ['floating', 'fixed'], aiTips: [true, false],
};
const rawSettings = () => { try { return readJSON(SETTINGS); } catch { return {}; } };
const writeSettings = patch => writeJSON(SETTINGS, { ...rawSettings(), ...patch });

export function getSettings() {
  const saved = rawSettings(), out = { ...DEFAULT_SETTINGS };
  for (const [k, allowed] of Object.entries(SETTING_VALUES)) if (allowed.includes(saved[k])) out[k] = saved[k];
  return {
    ...out, dataDir: DATA_DIR,
    favorites: Array.isArray(saved.favorites) ? saved.favorites : [],
    projectOrder: Array.isArray(saved.projectOrder) ? saved.projectOrder : [],
  };
}
export function saveSettings(patch) {
  for (const [k, v] of Object.entries(patch ?? {}))
    if (!SETTING_VALUES[k]?.includes(v)) throw new Error(`Valor no válido para ${k}: ${v}`);
  writeSettings(patch);
  return getSettings();
}
// ---------- Iconos (solo Lucide; los emojis de versiones anteriores se convierten) ----------
// Se guardan como "lucide:<icono>:<color>". Lista de iconos válidos sacada del propio sprite de Lucide.
const ICON_IDS = (() => {
  try { return new Set([...fs.readFileSync(path.join(import.meta.dirname, 'node_modules', 'lucide-static', 'sprite.svg'), 'utf8').matchAll(/<symbol id="([^"]+)"/g)].map(m => m[1])); }
  catch { return null; }
})();
const DEFAULT_ICON = { project: 'lucide:folder:gray', board: 'lucide:square-kanban:blue', page: '', card: '' };
const EMOJI_ICONS = {
  '📋': 'clipboard-list:blue', '📁': 'folder:gray', '🏠': 'house:orange', '🏡': 'house:green', '💼': 'briefcase:brown', '🚀': 'rocket:purple',
  '🎯': 'target:red', '✅': 'circle-check:green', '📝': 'notebook-pen:yellow', '📚': 'library:brown', '📘': 'book-open:blue', '📖': 'book-open:brown',
  '🧠': 'brain:pink', '💡': 'lightbulb:yellow', '🔧': 'wrench:gray', '🛠': 'hammer:gray', '⚙': 'settings:gray', '🐛': 'bug:red', '🔥': 'flame:orange',
  '⭐': 'star:yellow', '🎨': 'palette:pink', '🧪': 'flask-conical:purple', '📦': 'package:brown', '🗂': 'folder-open:yellow', '📊': 'chart-bar:blue',
  '📈': 'chart-line:green', '🗓': 'calendar:red', '📅': 'calendar:red', '🔒': 'lock:gray', '🔐': 'lock:orange', '🔑': 'key-round:yellow', '🌐': 'globe:blue',
  '💬': 'message-circle:blue', '📣': 'megaphone:orange', '🧩': 'puzzle:green', '🏗': 'building:orange', '🧭': 'compass:blue', '🎮': 'gamepad-2:purple',
  '👾': 'gamepad-2:purple', '🎵': 'list-music:pink', '📷': 'camera:gray', '✈': 'plane:blue', '🏋': 'dumbbell:red', '🍳': 'chef-hat:orange',
  '💰': 'wallet:green', '🧾': 'receipt:gray', '❤': 'heart:red', '🌱': 'sprout:green', '🐙': 'git-branch:purple', '🤖': 'bot:blue', '⚡': 'zap:yellow',
  '☕': 'coffee:brown', '🏁': 'flag:gray', '📌': 'pin:red', '🔖': 'bookmark:red', '🧹': 'sparkles:yellow', '📱': 'smartphone:gray', '💻': 'laptop:gray',
  '🖥': 'monitor:gray', '🧑\u200d💻': 'code:blue', '🗺': 'map:green', '🎬': 'clapperboard:gray', '🏆': 'trophy:yellow', '🌙': 'moon:purple',
  '🔍': 'search:gray', '⏳': 'hourglass:orange', '🎁': 'gift:pink',
};
// Acepta "lucide:<icono>[:<color>]", un nombre de icono suelto o un emoji antiguo; devuelve siempre un icono válido (o '').
export function toIcon(v, kind = 'card') {
  v = String(v ?? '').trim();
  const fallback = DEFAULT_ICON[kind] ?? '';
  if (!v) return fallback;
  let m = /^(?:lucide:)?([a-z0-9-]+)(?::([a-z]+))?$/.exec(v);
  if (!m) { const e = EMOJI_ICONS[v] ?? EMOJI_ICONS[v.replace(/\ufe0f/g, '')]; m = e && /^([a-z0-9-]+):([a-z]+)$/.exec(e); }
  if (!m || (ICON_IDS && !ICON_IDS.has(m[1]))) return fallback;
  return `lucide:${m[1]}:${COLORS.includes(m[2]) ? m[2] : 'gray'}`;
}
const defaultIcon = kind => DEFAULT_ICON[kind];

// ---------- Favoritos y orden de proyectos ----------
const favKey = f => [f.kind, f.project, f.id ?? '', f.path ?? ''].join('|');
function cleanFav({ kind, project: proj, id, path: p }) {
  if (!['project', 'board', 'page'].includes(kind) || !proj) throw new Error('Favorito no válido');
  return { kind, project: String(proj), ...(kind === 'board' ? { id: String(id) } : {}), ...(kind === 'page' ? { path: pagePath(p) } : {}) };
}
export function setFavorite(item, on = true) {
  const f = cleanFav(item), list = getSettings().favorites.filter(x => favKey(x) !== favKey(f));
  writeSettings({ favorites: on ? [...list, f] : list });
  return getSettings().favorites;
}
// Aplica fn a cada favorito; si devuelve null, se quita (al borrar o renombrar cosas).
const mapFavorites = fn => writeSettings({ favorites: getSettings().favorites.map(fn).filter(Boolean) });

export function setProjectOrder(names) {
  if (!Array.isArray(names)) throw new Error('Orden no válido');
  writeSettings({ projectOrder: names.map(String) });
  return projectNames();
}

// ---------- Proyectos ----------
function projectNames() {
  const order = getSettings().projectOrder;
  const rank = n => { const i = order.indexOf(n); return i < 0 ? Infinity : i; };
  return fs.readdirSync(ROOT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function project(ref) {
  const name = projectNames().find(n => same(n, ref));
  if (!name) throw new Error(`No existe el proyecto "${ref}". Proyectos: ${projectNames().join(', ') || '(ninguno)'}`);
  const dir = path.join(ROOT, name);
  fs.mkdirSync(path.join(dir, 'boards'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  return { name, dir, boards: path.join(dir, 'boards'), docs: path.join(dir, 'docs'), assets: path.join(dir, 'assets') };
}

const projectMeta = p => { try { return readJSON(path.join(p.dir, 'project.json')); } catch { return {}; } };

export function createProject({ name, emoji, icon }) {
  emoji = toIcon(icon ?? emoji, 'project');
  name = cleanName(name, 'Nombre de proyecto');
  if (projectNames().some(n => same(n, name))) throw new Error(`Ya existe el proyecto "${name}"`);
  fs.mkdirSync(path.join(ROOT, name));
  const p = project(name);
  writeJSON(path.join(p.dir, 'project.json'), { emoji, createdAt: now() });
  return { name };
}

export function updateProject(ref, { name, emoji, icon }) {
  const p = project(ref);
  if (icon !== undefined) emoji = icon;
  if (emoji !== undefined) writeJSON(path.join(p.dir, 'project.json'), { ...projectMeta(p), emoji: toIcon(emoji, 'project') });
  if (name === undefined || name.trim() === p.name) return { name: p.name };
  name = cleanName(name, 'Nombre de proyecto');
  if (projectNames().some(n => same(n, name) && n !== p.name)) throw new Error(`Ya existe el proyecto "${name}"`);
  fs.renameSync(p.dir, path.join(ROOT, name));
  mapFavorites(f => f.project === p.name ? { ...f, project: name } : f);
  writeSettings({ projectOrder: getSettings().projectOrder.map(n => n === p.name ? name : n) });
  return { name };
}

export function deleteProject(ref) {
  const p = project(ref);
  const r = toTrash('project', { name: p.name, title: p.name }, dir => fs.renameSync(p.dir, path.join(dir, 'data')));
  mapFavorites(f => f.project === p.name ? null : f);
  return r;
}

// ---------- Tableros ----------
const boardList = p => fs.readdirSync(p.boards).filter(f => f.endsWith('.json'))
  .map(f => readJSON(path.join(p.boards, f))).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

function board(p, ref) {
  const b = boardList(p).find(b => b.id === ref || same(b.name, ref));
  if (!b) throw new Error(`No existe el tablero "${ref}" en "${p.name}". Tableros: ${boardList(p).map(b => b.name).join(', ') || '(ninguno)'}`);
  return b;
}

const saveBoard = (p, b) => writeJSON(path.join(p.boards, b.id + '.json'), b);

function mutateBoard(projRef, boardRef, fn) {
  const p = project(projRef), b = board(p, boardRef);
  const r = fn(b, p);
  saveBoard(p, b);
  return r ?? b;
}

function boardName(p, name, exceptId) {
  name = String(name ?? '').trim();
  if (!name) throw new Error('El tablero necesita un nombre');
  if (boardList(p).some(b => same(b.name, name) && b.id !== exceptId)) throw new Error(`Ya existe el tablero "${name}" en "${p.name}"`);
  return name;
}

export const getBoard = (projRef, boardRef) => board(project(projRef), boardRef);

export function createBoard(projRef, { name, emoji, icon, columns = ['Por hacer', 'En curso', 'Hecho'] }) {
  const p = project(projRef);
  emoji = toIcon(icon ?? emoji, 'board');
  const b = {
    id: newId(), name: boardName(p, name), emoji,
    columns: columns.map((n, i) => ({ id: newId(), name: n, color: COLUMN_COLORS[i % COLUMN_COLORS.length] })),
    labels: [], cards: [], createdAt: now(),
  };
  saveBoard(p, b);
  return b;
}

export const updateBoard = (projRef, boardRef, { name, emoji, icon, background }) => mutateBoard(projRef, boardRef, (b, p) => {
  if (background !== undefined) { if (background) b.background = color(background); else delete b.background; }
  if (name !== undefined) b.name = boardName(p, name, b.id);
  if ((icon ?? emoji) !== undefined) b.emoji = toIcon(icon ?? emoji, 'board');
});

// Duplica columnas, etiquetas y tarjetas activas en un tablero nuevo «<nombre> (copia)»
export function duplicateBoard(projRef, boardRef) {
  const p = project(projRef), src = board(p, boardRef);
  let name = `${src.name} (copia)`;
  for (let i = 2; boardList(p).some(x => same(x.name, name)); i++) name = `${src.name} (copia ${i})`;
  const b = { id: newId(), name, emoji: src.emoji, ...(src.background ? { background: src.background } : {}), columns: [], labels: [], cards: [], createdAt: now() };
  const cols = new Map(src.columns.map(c => { const n = { id: newId(), name: c.name, color: c.color }; b.columns.push(n); return [c.id, n.id]; }));
  for (const c of src.cards.filter(x => !x.archived)) {
    const n = adaptCard(c, { p, b: src }, p, b, false);
    n.columnId = cols.get(c.columnId);
    log(n, `copió la tarjeta desde el tablero «${src.name}»`);
    b.cards.push(n);
  }
  saveBoard(p, b);
  return b;
}

export function deleteBoard(projRef, boardRef) {
  const p = project(projRef), b = board(p, boardRef);
  const r = toTrash('board', { project: p.name, boardId: b.id, title: b.name, cards: b.cards.length },
    dir => fs.renameSync(path.join(p.boards, b.id + '.json'), path.join(dir, 'data.json')));
  mapFavorites(f => f.kind === 'board' && f.id === b.id ? null : f);
  return r;
}

// ---------- Columnas ----------
function findColumn(b, ref) {
  const c = b.columns.find(c => c.id === ref || same(c.name, ref));
  if (!c) throw new Error(`No existe la columna "${ref}". Columnas: ${b.columns.map(c => c.name).join(', ')}`);
  return c;
}

function columnName(b, name, exceptId) {
  name = String(name ?? '').trim();
  if (!name) throw new Error('La columna necesita un nombre');
  if (b.columns.some(c => same(c.name, name) && c.id !== exceptId)) throw new Error(`Ya existe la columna "${name}"`);
  return name;
}

export const addColumn = (projRef, boardRef, { name, color: c }) => mutateBoard(projRef, boardRef, b => {
  b.columns.push({ id: newId(), name: columnName(b, name), color: c ? color(c) : COLUMN_COLORS[b.columns.length % COLUMN_COLORS.length] });
});

export const updateColumn = (projRef, boardRef, colRef, { name, color: c, collapsed }) => mutateBoard(projRef, boardRef, b => {
  const col = findColumn(b, colRef);
  if (collapsed !== undefined) { if (collapsed) col.collapsed = true; else delete col.collapsed; }
  if (name !== undefined) col.name = columnName(b, name, col.id);
  if (c !== undefined) col.color = color(c);
});

export const moveColumn = (projRef, boardRef, colRef, index) => mutateBoard(projRef, boardRef, b => {
  const col = findColumn(b, colRef);
  b.columns.splice(b.columns.indexOf(col), 1);
  b.columns.splice(Math.max(0, Math.min(index, b.columns.length)), 0, col);
});

// Copia la columna (justo a su derecha) con sus tarjetas activas
export const copyColumn = (projRef, boardRef, colRef) => mutateBoard(projRef, boardRef, (b, p) => {
  const col = findColumn(b, colRef);
  const name = (() => { let n = `${col.name} (copia)`; for (let i = 2; b.columns.some(x => same(x.name, n)); i++) n = `${col.name} (copia ${i})`; return n; })();
  const copy = { id: newId(), name, color: col.color };
  b.columns.splice(b.columns.indexOf(col) + 1, 0, copy);
  for (const c of b.cards.filter(x => x.columnId === col.id && !x.archived)) {
    const n = adaptCard(c, { p, b }, p, b, false);
    n.columnId = copy.id; log(n, `copió la tarjeta «${c.title}» en «${name}»`);
    b.cards.push(n);
  }
});

// Ordena las tarjetas de una columna: por título, vencimiento (las sin fecha al final), más nuevas o más antiguas
export const sortColumn = (projRef, boardRef, colRef, by) => mutateBoard(projRef, boardRef, b => {
  const col = findColumn(b, colRef);
  const cmp = { title: (x, y) => x.title.localeCompare(y.title, 'es'), due: (x, y) => (x.due ?? '9999').localeCompare(y.due ?? '9999'),
    newest: (x, y) => y.createdAt.localeCompare(x.createdAt), oldest: (x, y) => x.createdAt.localeCompare(y.createdAt) }[by];
  if (!cmp) throw new Error('Orden no válido');
  const slots = b.cards.map((c, i) => c.columnId === col.id ? i : -1).filter(i => i >= 0);
  const sorted = slots.map(i => b.cards[i]).sort(cmp);
  slots.forEach((slot, k) => { b.cards[slot] = sorted[k]; });
});

export const deleteColumn = (projRef, boardRef, colRef) => mutateBoard(projRef, boardRef, b => {
  const col = findColumn(b, colRef);
  if (b.cards.some(c => c.columnId === col.id && !c.archived)) throw new Error(`La columna "${col.name}" tiene tarjetas; muévelas, archívalas o bórralas antes.`);
  b.cards.filter(c => c.columnId === col.id).forEach(c => { c.columnId = b.columns.find(x => x !== col)?.id ?? c.columnId; });
  b.columns.splice(b.columns.indexOf(col), 1);
});

// ---------- Etiquetas (por tablero) ----------
// Acepta ids o nombres; un nombre nuevo crea la etiqueta.
function labelIds(b, refs = []) {
  return [...new Set(refs.map(ref => {
    let l = b.labels.find(l => l.id === ref || same(l.name, ref));
    if (!l) {
      const name = String(ref).trim();
      if (!name) throw new Error('La etiqueta necesita un nombre');
      l = { id: newId(), name, color: COLORS[(b.labels.length + 3) % COLORS.length] };
      b.labels.push(l);
    }
    return l.id;
  }))];
}

export const addLabel = (projRef, boardRef, { name, color: c }) => mutateBoard(projRef, boardRef, b => {
  const [id] = labelIds(b, [name]);
  if (c) b.labels.find(l => l.id === id).color = color(c);
  return b.labels.find(l => l.id === id);
});

export const updateLabel = (projRef, boardRef, labelId, { name, color: c }) => mutateBoard(projRef, boardRef, b => {
  const l = b.labels.find(l => l.id === labelId);
  if (!l) throw new Error(`No existe la etiqueta ${labelId}`);
  if (name?.trim()) l.name = name.trim();
  if (c !== undefined) l.color = color(c);
});

export const deleteLabel = (projRef, boardRef, labelId) => mutateBoard(projRef, boardRef, b => {
  b.labels = b.labels.filter(l => l.id !== labelId);
  b.cards.forEach(c => { c.labels = c.labels.filter(id => id !== labelId); });
});

// ---------- Tarjetas (el id es único en todo el espacio) ----------
function locate(id) {
  for (const name of projectNames()) {
    const p = project(name);
    for (const b of boardList(p)) {
      const c = b.cards.find(c => c.id === id);
      if (c) return { p, b, c };
    }
  }
  throw new Error(`No existe la tarjeta ${id}`);
}

// Historial de la tarjeta: quién hizo qué y cuándo (se guardan las últimas 60 entradas).
function log(c, text) {
  (c.activity ??= []).push({ at: now(), by: actor, text });
  if (c.activity.length > 60) c.activity.splice(0, c.activity.length - 60);
}

function mutateCard(id, fn) {
  const { p, b, c } = locate(id);
  fn(c, b);
  c.updatedAt = now();
  saveBoard(p, b);
  return { project: p.name, board: b, card: c };
}

export const getCard = id => { const { p, b, c } = locate(id); return { project: p.name, board: b, card: c }; };

// Pasos de checklist; `group` separa varias checklists dentro de la misma tarjeta (sin grupo = «Checklist»).
const items = (texts, group) => texts.map(text => ({ id: newId(), text: String(text).trim(), done: false, ...(String(group ?? '').trim() ? { group: String(group).trim() } : {}) })).filter(i => i.text);

// Fechas: inicio AAAA-MM-DD; vencimiento AAAA-MM-DD o AAAA-MM-DDTHH:mm (hora local)
function cleanDate(v, what, allowTime) {
  if (v === null || v === '' || v === undefined) return null;
  const t = String(v).trim();
  if (!(/^\d{4}-\d{2}-\d{2}$/.test(t) || (allowTime && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t))) || isNaN(Date.parse(t)))
    throw new Error(`${what} no válida: "${v}". Usa AAAA-MM-DD${allowTime ? ' o AAAA-MM-DDTHH:mm' : ''}.`);
  return t;
}
const fmtDay = t => new Date(t.length === 10 ? t + 'T00:00' : t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + (t.length > 10 ? ` a las ${t.slice(11)}` : '');
const isImageFile = f => /\.(png|jpe?g|gif|webp)$/i.test(f || '');
// Portada: un color o "img:<id de adjunto de imagen>"
function cleanCover(c, cover) {
  if (!cover) return null;
  if (String(cover).startsWith('img:')) {
    const a = (c.attachments ?? []).find(x => x.id === cover.slice(4));
    if (!a || !isImageFile(a.file)) throw new Error('La portada tiene que ser una imagen adjunta');
    return cover;
  }
  return color(cover);
}
function setDates(c, { start, due, dueDone }) {
  if (start !== undefined) {
    const v = cleanDate(start, 'Fecha de inicio');
    if (v !== (c.start ?? null)) { if (v) c.start = v; else delete c.start; log(c, v ? `puso el inicio el ${fmtDay(v)}` : 'quitó la fecha de inicio'); }
  }
  if (due !== undefined) {
    const v = cleanDate(due, 'Fecha de vencimiento', true);
    if (v !== (c.due ?? null)) {
      if (v) c.due = v; else { delete c.due; delete c.dueDone; }
      log(c, v ? `puso el vencimiento el ${fmtDay(v)}` : 'quitó la fecha de vencimiento');
    }
  }
  if (dueDone !== undefined && c.due && !!dueDone !== !!c.dueDone) {
    if (dueDone) c.dueDone = true; else delete c.dueDone;
    log(c, dueDone ? 'marcó la fecha como completada' : 'desmarcó la fecha como completada');
  }
}
const colName = (b, id) => b.columns.find(c => c.id === id)?.name ?? '?';

export const createCard = (projRef, boardRef, { title, description = '', column, checklist = [], labels = [], docs = [], emoji = '', icon, cover = null, start, due }) =>
  mutateBoard(projRef, boardRef, (b, p) => {
    if (!String(title ?? '').trim()) throw new Error('La tarjeta necesita un título');
    const col = column ? findColumn(b, column) : b.columns[0];
    if (!col) throw new Error('El tablero no tiene columnas');
    const card = {
      id: newId(), title: title.trim(), description, emoji: toIcon(icon ?? emoji), cover: cover ? color(cover) : null,
      columnId: col.id, labels: labelIds(b, labels), docs: docs.map(pagePath), checklist: items(checklist),
      notes: [], activity: [], createdAt: now(), updatedAt: now(),
    };
    log(card, `creó la tarjeta en «${col.name}»`);
    setDates(card, { start, due });
    b.cards.push(card);
    return { project: p.name, board: b, card };
  });

// baseDescription: la descripción que tenía el editor al empezar. Si ya no coincide, alguien la cambió → conflicto.
export const updateCard = (id, { title, description, baseDescription, emoji, icon, cover, labels, docs, column, start, due, dueDone, template }) => {
  if (icon !== undefined) emoji = icon;
  if (column !== undefined) moveCard(id, column);
  return mutateCard(id, (c, b) => {
    if (title !== undefined && title.trim() !== c.title) {
      if (!title.trim()) throw new Error('La tarjeta necesita un título');
      log(c, `renombró «${c.title}» a «${title.trim()}»`);
      c.title = title.trim();
    }
    if (description !== undefined && description !== c.description) {
      if (baseDescription !== undefined && baseDescription !== c.description)
        throw conflict('La descripción ha cambiado mientras la editabas', c.description);
      c.description = description;
      log(c, 'editó la descripción');
    }
    if (emoji !== undefined) c.emoji = toIcon(emoji);
    if (cover !== undefined) c.cover = cleanCover(c, cover);
    setDates(c, { start, due, dueDone });
    if (template !== undefined && !!template !== !!c.template) {
      if (template) c.template = true; else delete c.template;
      log(c, template ? 'la convirtió en plantilla' : 'la quitó de plantillas');
    }
    if (labels !== undefined) {
      const next = labelIds(b, labels);
      if (next.join() !== c.labels.join()) log(c, next.length ? `puso las etiquetas ${next.map(i => `«${b.labels.find(l => l.id === i).name}»`).join(', ')}` : 'quitó las etiquetas');
      c.labels = next;
    }
    if (docs !== undefined) {
      const next = [...new Set(docs.map(pagePath))];
      next.filter(d => !c.docs.includes(d)).forEach(d => log(c, `enlazó la página «${d}»`));
      c.docs = next;
    }
  });
};

// Mueve la tarjeta a `colRef`, en la posición `index` dentro de esa columna (por defecto, al final).
export const moveCard = (id, colRef, index = Infinity) => mutateCard(id, (c, b) => {
  const col = findColumn(b, colRef);
  if (col.id !== c.columnId) log(c, `movió de «${colName(b, c.columnId)}» a «${col.name}»`);
  b.cards.splice(b.cards.indexOf(c), 1);
  c.columnId = col.id;
  const before = b.cards.filter(x => x.columnId === col.id && !x.archived)[index];
  b.cards.splice(before ? b.cards.indexOf(before) : b.cards.length, 0, c);
});

export function deleteCard(id) {
  const { p, b, c } = locate(id);
  const r = toTrash('card', { project: p.name, boardId: b.id, boardName: b.name, columnId: c.columnId, title: c.title },
    dir => writeJSON(path.join(dir, 'data.json'), c));
  b.cards.splice(b.cards.indexOf(c), 1);
  saveBoard(p, b);
  return r;
}

export const archiveCard = (id, archived = true) => mutateCard(id, c => {
  if (!!c.archived === !!archived) return;
  if (archived) c.archived = true; else delete c.archived;
  log(c, archived ? 'archivó la tarjeta' : 'la sacó del archivo');
});

export const archiveColumn = (projRef, boardRef, colRef) => mutateBoard(projRef, boardRef, b => {
  const col = findColumn(b, colRef);
  const cards = b.cards.filter(c => c.columnId === col.id && !c.archived);
  cards.forEach(c => { c.archived = true; c.updatedAt = now(); log(c, 'archivó la tarjeta'); });
  return { archived: cards.length };
});

export const addChecklist = (id, texts, group) => mutateCard(id, c => {
  const added = items(texts, group);
  c.checklist.push(...added);
  added.forEach(i => log(c, `añadió el paso «${i.text}»`));
});

export const updateChecklistItem = (id, itemId, { text, done, remove }) => mutateCard(id, c => {
  const i = c.checklist.findIndex(x => x.id === itemId);
  if (i < 0) throw new Error(`No existe el elemento ${itemId} en la tarjeta ${id}`);
  const it = c.checklist[i];
  if (remove) { log(c, `quitó el paso «${it.text}»`); return void c.checklist.splice(i, 1); }
  if (text !== undefined && text !== it.text) it.text = text;
  if (done !== undefined && done !== it.done) { it.done = done; log(c, `${done ? 'marcó' : 'desmarcó'} «${it.text}»`); }
});

// Renombrar o borrar una checklist entera (grupo); '' es la checklist principal.
export const renameChecklist = (id, from, to) => mutateCard(id, c => {
  to = String(to ?? '').trim();
  if (!to) throw new Error('La checklist necesita un nombre');
  c.checklist.forEach(i => { if ((i.group ?? '') === (from ?? '')) i.group = to; });
});
export const deleteChecklist = (id, group) => mutateCard(id, c => {
  const gone = c.checklist.filter(i => (i.group ?? '') === (group ?? ''));
  c.checklist = c.checklist.filter(i => !gone.includes(i));
  if (gone.length) log(c, `quitó la checklist «${group || 'Checklist'}»`);
});

// ---------- Adjuntos: ficheros (en assets/ del proyecto) y enlaces ----------
const MAX_FILE = 25 * 1024 * 1024;
function storeFile(p, name, data) {
  const ext = (path.extname(String(name ?? '')).toLowerCase().match(/^\.[a-z0-9]{1,10}$/) || [''])[0] || '.bin';
  const file = newId() + ext;
  fs.mkdirSync(p.assets, { recursive: true });
  fs.writeFileSync(path.join(p.assets, file), data);
  return file;
}
const cleanFileName = n => String(n ?? '').replace(/[\x00-\x1f<>:"/\\|?*]/g, '').trim().slice(0, 120) || 'fichero';
export function addAttachment(id, { name, base64 }) {
  const data = Buffer.from(String(base64 ?? ''), 'base64');
  if (!data.length) throw new Error('El fichero está vacío');
  if (data.length > MAX_FILE) throw new Error('El fichero pasa de 25 MB');
  const { p } = locate(id), file = storeFile(p, name, data);
  return mutateCard(id, c => {
    (c.attachments ??= []).push({ id: newId(), name: cleanFileName(name), file: `assets/${file}`, size: data.length, addedAt: now(), by: actor });
    log(c, `adjuntó «${cleanFileName(name)}»`);
  });
}
export function addLink(id, { url, name }) {
  const u = String(url ?? '').trim();
  if (!/^https?:\/\/\S+$/i.test(u)) throw new Error('El enlace tiene que empezar por http:// o https://');
  return mutateCard(id, c => {
    (c.attachments ??= []).push({ id: newId(), name: String(name ?? '').trim() || u, url: u, addedAt: now(), by: actor });
    log(c, `adjuntó el enlace «${String(name ?? '').trim() || u}»`);
  });
}
export const removeAttachment = (id, attId) => mutateCard(id, c => {
  const a = (c.attachments ?? []).find(x => x.id === attId);
  if (!a) throw new Error('Ese adjunto ya no está');
  c.attachments = c.attachments.filter(x => x !== a);
  if (c.cover === 'img:' + attId) c.cover = null;
  log(c, `quitó el adjunto «${a.name}»`);
  // ponytail: el fichero se queda en assets/ (lo puede necesitar la papelera o una copia de la tarjeta)
});

// ---------- Copiar y mover tarjetas (también entre tableros y proyectos) ----------
// Adapta una tarjeta al tablero de destino: etiquetas por nombre (con su color), y si cambia de proyecto copia sus
// ficheros e imágenes y quita los enlaces a páginas (que no existen allí).
function adaptCard(c, src, dstP, dstB, keepIdentity) {
  const n = structuredClone(c);
  if (!keepIdentity) {
    n.id = newId(); n.notes = []; n.activity = []; n.createdAt = now();
    delete n.archived; delete n.template;
    n.checklist = n.checklist.map(i => ({ ...i, id: newId(), done: false }));
    n.attachments = (n.attachments ?? []).map(a => ({ ...a, id: newId() }));
    if (String(c.cover).startsWith('img:')) n.cover = 'img:' + n.attachments[(c.attachments ?? []).findIndex(a => 'img:' + a.id === c.cover)]?.id;
  }
  n.labels = c.labels.map(id => src.b.labels.find(l => l.id === id)).filter(Boolean).map(l => {
    let t = dstB.labels.find(x => same(x.name, l.name));
    if (!t) { t = { id: newId(), name: l.name, color: l.color }; dstB.labels.push(t); }
    return t.id;
  });
  if (src.p.name !== dstP.name) {
    n.docs = [];
    const copy = f => { const from = path.join(src.p.dir, f), to = path.join(dstP.dir, f); if (fs.existsSync(from) && !fs.existsSync(to)) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); } };
    (n.attachments ?? []).forEach(a => a.file && copy(a.file));
    for (const m of n.description.matchAll(/assets\/[0-9a-f]{8}\.[a-z0-9]+/gi)) copy(m[0]);
  }
  n.updatedAt = now();
  return n;
}
function placeIn(b, card, colRef, index = Infinity) {
  const col = colRef ? findColumn(b, colRef) : b.columns.find(x => x.id === card.columnId) ?? b.columns[0];
  if (!col) throw new Error('El tablero de destino no tiene columnas');
  card.columnId = col.id;
  const before = b.cards.filter(x => x.columnId === col.id && !x.archived)[index];
  b.cards.splice(before ? b.cards.indexOf(before) : b.cards.length, 0, card);
  return col;
}

// Copia: por defecto justo debajo de la original. Con project/board se copia a otro tablero.
export function duplicateCard(id, { project: projRef, board: boardRef, column, title, fromTemplate } = {}) {
  const src = locate(id), dstP = projRef ? project(projRef) : src.p;
  const dstB = boardRef || projRef ? board(dstP, boardRef ?? src.b.id) : src.b;
  const sameBoard = dstB.id === src.b.id;
  const b = sameBoard ? src.b : dstB;
  const n = adaptCard(src.c, src, dstP, b, false);
  n.title = title ?? (fromTemplate ? src.c.title : `${src.c.title} (copia)`);
  const index = sameBoard && !column && !fromTemplate ? b.cards.filter(x => x.columnId === src.c.columnId && !x.archived).indexOf(src.c) + 1 : Infinity;
  if (!sameBoard || column) n.columnId = undefined;
  const col = placeIn(b, n, column ?? (sameBoard ? src.c.columnId : null), index);
  log(n, fromTemplate ? `creó la tarjeta desde la plantilla «${src.c.title}» en «${col.name}»` : `copió la tarjeta «${src.c.title}» en «${col.name}»`);
  saveBoard(dstP, b);
  return { project: dstP.name, board: b, card: n };
}
export const createFromTemplate = (templateId, { column } = {}) => duplicateCard(templateId, { column, fromTemplate: true });

// Mover a otro tablero (o proyecto): conserva id, notas e historial.
export function moveCardToBoard(id, projRef, boardRef, column) {
  const src = locate(id), dstP = project(projRef), dstB = board(dstP, boardRef);
  if (dstB.id === src.b.id) return moveCard(id, column ?? src.c.columnId);
  const n = adaptCard(src.c, src, dstP, dstB, true);
  src.b.cards.splice(src.b.cards.indexOf(src.c), 1);
  n.columnId = undefined;
  const col = placeIn(dstB, n, column ?? null);
  log(n, `movió la tarjeta del tablero «${src.b.name}» a «${dstB.name}» (${col.name})`);
  saveBoard(src.p, src.b);
  saveBoard(dstP, dstB);
  return { project: dstP.name, board: dstB, card: n };
}

// Notas de trabajo: lo que la IA (o tú) dejáis en la tarjeta para retomarla.
export const addNote = (id, text) => mutateCard(id, c => {
  text = String(text ?? '').trim();
  if (!text) throw new Error('La nota está vacía');
  (c.notes ??= []).push({ id: newId(), at: now(), by: actor, text });
});
export const deleteNote = (id, noteId) => mutateCard(id, c => { c.notes = (c.notes ?? []).filter(n => n.id !== noteId); });

// Búsqueda de tarjetas por texto (título, descripción, pasos, notas y etiquetas).
export function searchCards(query, projRef) {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return [];
  return (projRef ? [project(projRef).name] : projectNames()).flatMap(name => boardList(project(name)).flatMap(b => b.cards
    .filter(c => [c.title, c.description, ...c.checklist.map(i => i.text), ...(c.notes ?? []).map(n => n.text),
      ...c.labels.map(id => b.labels.find(l => l.id === id)?.name ?? '')].some(t => t.toLowerCase().includes(q)))
    .map(c => ({
      id: c.id, project: name, board: b.name, boardId: b.id, column: colName(b, c.columnId), title: c.title, emoji: c.emoji,
      archived: !!c.archived, done: c.checklist.filter(i => i.done).length, total: c.checklist.length,
    }))));
}

// ---------- Páginas (markdown) ----------
export function pagePath(ref) {
  const segs = String(ref ?? '').replace(/\\/g, '/').replace(/\.md$/i, '').split('/').map(s => s.trim()).filter(Boolean);
  if (!segs.length) throw new Error('La ruta de la página está vacía');
  return segs.map(s => cleanName(s, 'Nombre de página')).join('/');
}

const pageFile = (p, rel) => path.join(p.docs, ...rel.split('/')) + '.md';
const pageDir = (p, rel) => path.join(p.docs, ...rel.split('/'));

function parsePage(raw) {
  const m = raw.match(/^---\r?\nicon: *(.*)\r?\n---\r?\n?/);
  return m ? { icon: m[1].trim(), content: raw.slice(m[0].length) } : { icon: '', content: raw };
}
const serializePage = (icon, content) => (icon ? `---\nicon: ${icon}\n---\n` : '') + content;

const pageFiles = p => fs.readdirSync(p.docs, { recursive: true })
  .filter(f => f.endsWith('.md')).map(f => f.slice(0, -3).split(path.sep).join('/'));

// Lista plana; incluye como "virtual" las carpetas intermedias que no tienen su propio .md.
export function listPages(projRef) {
  const p = project(projRef), files = pageFiles(p), all = new Set(files);
  files.forEach(f => { const s = f.split('/'); for (let i = 1; i < s.length; i++) all.add(s.slice(0, i).join('/')); });
  return [...all].sort().map(rel => files.includes(rel)
    ? { path: rel, icon: parsePage(fs.readFileSync(pageFile(p, rel), 'utf8')).icon }
    : { path: rel, icon: '', virtual: true });
}

// hash: versión del fichero que se ha leído; al guardar con baseHash se detecta si otro (la IA) lo cambió entre medias.
export function readPage(projRef, ref) {
  const p = project(projRef), rel = pagePath(ref), f = pageFile(p, rel);
  if (fs.existsSync(f)) { const raw = fs.readFileSync(f, 'utf8'); return { path: rel, exists: true, hash: hash(raw), ...parsePage(raw) }; }
  if (fs.existsSync(pageDir(p, rel))) return { path: rel, exists: false, hash: '', icon: '', content: '' };
  throw new Error(`No existe la página "${rel}" en "${p.name}"`);
}

// Crea o actualiza. `content` o `icon` sin pasar se conservan.
export function writePage(projRef, ref, { content, icon, baseHash }) {
  const p = project(projRef), rel = pagePath(ref), f = pageFile(p, rel);
  const raw = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (baseHash !== undefined && baseHash !== (raw ? hash(raw) : ''))
    throw conflict('La página ha cambiado mientras la editabas', parsePage(raw).content);
  const old = raw ? parsePage(raw) : { icon: '', content: '' };
  const next = serializePage(icon !== undefined ? toIcon(icon, 'page') : old.icon, content ?? old.content);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, next);
  return { path: rel, hash: hash(next) };
}

// Página nueva sin pisar otra: "Sin título", "Sin título 2"…
// Con linkInParent, la página padre recibe al final un [[enlace]] a la nueva (las subpáginas son texto que tú colocas).
export function createPage(projRef, { parent = '', title = 'Sin título', icon = '', content = '', linkInParent = false }) {
  const p = project(projRef);
  const base = parent ? pagePath(parent) + '/' : '';
  let rel = base + cleanName(title, 'Nombre de página');
  for (let n = 2; fs.existsSync(pageFile(p, rel)) || fs.existsSync(pageDir(p, rel)); n++) rel = `${base}${title} ${n}`;
  const r = writePage(projRef, rel, { content, icon });
  if (linkInParent && parent) {
    const par = pagePath(parent), f = pageFile(p, par);
    const old = fs.existsSync(f) ? parsePage(fs.readFileSync(f, 'utf8')) : { icon: '', content: '' };
    const body = old.content.replace(/\s+$/, '');
    fs.writeFileSync(f, serializePage(old.icon, `${body}${body ? '\n\n' : ''}[[${rel}]]\n`));
  }
  return r;
}

const under = (x, base) => x === base || x.startsWith(base + '/');

// Enlaces de tarjetas a páginas: al renombrar se actualizan; al borrar se quitan y se devuelven para poder restaurarlos.
function relinkCards(p, from, to) {
  const removed = [];
  for (const b of boardList(p)) {
    let changed = false;
    b.cards.forEach(c => {
      const docs = c.docs.flatMap(d => {
        if (!under(d, from)) return [d];
        if (!to) { removed.push({ boardId: b.id, cardId: c.id, path: d }); return []; }
        return [to + d.slice(from.length)];
      });
      if (docs.join() !== c.docs.join()) { c.docs = docs; changed = true; }
    });
    if (changed) saveBoard(p, b);
  }
  return removed;
}

// Enlaces entre páginas escritos como [[Ruta/Página]] o [[Ruta/Página|texto]]: se reescriben al renombrar.
const WIKI = /\[\[([^\]|]+?)(\|[^\]]*)?\]\]/g;
function relinkWiki(p, from, to) {
  for (const rel of pageFiles(p)) {
    const f = pageFile(p, rel), raw = fs.readFileSync(f, 'utf8');
    const next = raw.replace(WIKI, (m, target, alias = '') => under(target.trim(), from) ? `[[${to}${target.trim().slice(from.length)}${alias}]]` : m);
    if (next !== raw) fs.writeFileSync(f, next);
  }
}

// Renombrar/mover una página arrastra sus subpáginas, los enlaces de las tarjetas, los [[enlaces]] y los favoritos.
export function renamePage(projRef, fromRef, toRef) {
  const p = project(projRef), from = pagePath(fromRef), to = pagePath(toRef);
  if (from === to) return { path: to };
  if (to.startsWith(from + '/')) throw new Error('Una página no puede moverse dentro de sí misma');
  const caseOnly = same(from, to);
  if (!caseOnly && (fs.existsSync(pageFile(p, to)) || fs.existsSync(pageDir(p, to)))) throw new Error(`Ya existe la página "${to}"`);
  fs.mkdirSync(path.dirname(pageFile(p, to)), { recursive: true });
  if (fs.existsSync(pageFile(p, from))) fs.renameSync(pageFile(p, from), pageFile(p, to));
  if (fs.existsSync(pageDir(p, from))) fs.renameSync(pageDir(p, from), pageDir(p, to));
  relinkCards(p, from, to);
  relinkWiki(p, from, to);
  mapFavorites(f => f.kind === 'page' && f.project === p.name && under(f.path, from) ? { ...f, path: to + f.path.slice(from.length) } : f);
  return { path: to };
}

export function deletePage(projRef, ref) {
  const p = project(projRef), rel = pagePath(ref);
  const links = relinkCards(p, rel, null);
  const r = toTrash('page', { project: p.name, path: rel, title: rel.split('/').at(-1), links }, dir => {
    if (fs.existsSync(pageFile(p, rel))) fs.renameSync(pageFile(p, rel), path.join(dir, 'data.md'));
    if (fs.existsSync(pageDir(p, rel))) fs.renameSync(pageDir(p, rel), path.join(dir, 'data'));
  });
  mapFavorites(f => f.kind === 'page' && f.project === p.name && under(f.path, rel) ? null : f);
  return r;
}

export function searchPages(query, projRef) {
  const q = String(query).toLowerCase();
  return (projRef ? [project(projRef).name] : projectNames()).flatMap(name => {
    const p = project(name);
    return pageFiles(p).flatMap(rel => parsePage(fs.readFileSync(pageFile(p, rel), 'utf8')).content.split('\n')
      .map((line, i) => [i + 1, line]).filter(([, l]) => l.toLowerCase().includes(q))
      .map(([n, l]) => `${name} / ${rel}:${n}: ${l.trim()}`));
  });
}

// Quién enlaza una página: tarjetas (Páginas de la tarjeta) y otras páginas ([[enlace]]).
export function backlinks(projRef, ref) {
  const p = project(projRef), rel = pagePath(ref);
  const cards = boardList(p).flatMap(b => b.cards.filter(c => c.docs.includes(rel) && !c.archived)
    .map(c => ({ board: { id: b.id, name: b.name, emoji: b.emoji }, card: { id: c.id, title: c.title, emoji: c.emoji } })));
  const pages = pageFiles(p).filter(other => other !== rel).flatMap(other => {
    const { icon, content } = parsePage(fs.readFileSync(pageFile(p, other), 'utf8'));
    return [...content.matchAll(WIKI)].some(m => m[1].trim() === rel) ? [{ page: { path: other, icon } }] : [];
  });
  return [...cards, ...pages];
}

// ---------- Imágenes de las páginas ----------
const IMAGE_EXT = /^\.(png|jpe?g|gif|webp)$/i;
export function saveAsset(projRef, name, base64) {
  const p = project(projRef), ext = path.extname(String(name ?? '')).toLowerCase();
  const data = Buffer.from(String(base64 ?? ''), 'base64');
  if (!data.length) throw new Error('La imagen está vacía');
  if (data.length > MAX_ASSET) throw new Error('La imagen pasa de 15 MB');
  const file = newId() + (IMAGE_EXT.test(ext) ? ext : '.png');
  fs.mkdirSync(p.assets, { recursive: true });
  fs.writeFileSync(path.join(p.assets, file), data);
  return { path: `assets/${file}` };
}
export function assetPath(projRef, file) {
  if (!/^[0-9a-f]{8}\.[a-z0-9]{1,10}$/i.test(file)) throw new Error('Fichero no válido');
  return path.join(project(projRef).assets, file);
}

// ---------- Papelera (30 días) ----------
function toTrash(kind, meta, move) {
  const id = `${Date.now()}-${newId()}`, dir = path.join(TRASH, id);
  fs.mkdirSync(dir, { recursive: true });
  move(dir);
  writeJSON(path.join(dir, 'meta.json'), { id, kind, deletedAt: now(), by: actor, ...meta });
  return { trashId: id };
}

function trashDir(id) {
  if (!/^\d+-[0-9a-f]{8}$/.test(String(id))) throw new Error('Elemento de papelera no válido');
  const dir = path.join(TRASH, id);
  if (!fs.existsSync(dir)) throw new Error('Ese elemento ya no está en la papelera');
  return dir;
}

export function listTrash() {
  if (!fs.existsSync(TRASH)) return [];
  const limit = Date.now() - TRASH_DAYS * 864e5;
  return fs.readdirSync(TRASH).flatMap(id => {
    const dir = path.join(TRASH, id);
    try {
      const meta = readJSON(path.join(dir, 'meta.json'));
      if (Date.parse(meta.deletedAt) < limit) { fs.rmSync(dir, { recursive: true, force: true }); return []; }
      return [meta];
    } catch { return []; }
  }).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

function freeName(taken, base, suffix) {
  let name = base;
  for (let n = 1; taken(name); n++) name = `${base} (${suffix}${n > 1 ? ' ' + n : ''})`;
  return name;
}

export function restoreTrash(id) {
  const dir = trashDir(id), meta = readJSON(path.join(dir, 'meta.json'));
  const needProject = () => {
    try { return project(meta.project); } catch { throw new Error(`Primero restaura el proyecto «${meta.project}»`); }
  };
  let out;
  if (meta.kind === 'project') {
    const name = freeName(n => projectNames().some(x => same(x, n)), meta.name, 'restaurado');
    fs.renameSync(path.join(dir, 'data'), path.join(ROOT, name));
    out = { kind: 'project', project: name };
  } else if (meta.kind === 'board') {
    const p = needProject(), b = readJSON(path.join(dir, 'data.json'));
    b.name = freeName(n => boardList(p).some(x => same(x.name, n)), b.name, 'restaurado');
    saveBoard(p, b);
    out = { kind: 'board', project: p.name, id: b.id };
  } else if (meta.kind === 'page') {
    const p = needProject();
    const rel = freeName(r => fs.existsSync(pageFile(p, r)) || fs.existsSync(pageDir(p, r)), meta.path, 'restaurada');
    fs.mkdirSync(path.dirname(pageFile(p, rel)), { recursive: true });
    if (fs.existsSync(path.join(dir, 'data.md'))) fs.renameSync(path.join(dir, 'data.md'), pageFile(p, rel));
    if (fs.existsSync(path.join(dir, 'data'))) fs.renameSync(path.join(dir, 'data'), pageDir(p, rel));
    for (const l of meta.links ?? []) { // vuelve a enlazarla en las tarjetas que la tenían
      try {
        const b = board(p, l.boardId), c = b.cards.find(x => x.id === l.cardId);
        const doc = rel + l.path.slice(meta.path.length);
        if (c && !c.docs.includes(doc)) { c.docs.push(doc); saveBoard(p, b); }
      } catch {}
    }
    out = { kind: 'page', project: p.name, path: rel };
  } else {
    const p = needProject();
    let b;
    try { b = board(p, meta.boardId); } catch { throw new Error(`Primero restaura el tablero «${meta.boardName}»`); }
    const c = readJSON(path.join(dir, 'data.json'));
    if (!b.columns.some(col => col.id === c.columnId)) c.columnId = b.columns[0]?.id;
    log(c, 'restauró la tarjeta de la papelera');
    b.cards.push(c);
    saveBoard(p, b);
    out = { kind: 'card', project: p.name, boardId: b.id, id: c.id };
  }
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

export const purgeTrash = id => fs.rmSync(trashDir(id), { recursive: true, force: true });
export const emptyTrash = () => fs.rmSync(TRASH, { recursive: true, force: true });

// ---------- Copias de seguridad (una al día, se guardan 14) ----------
export function backupNow() {
  const name = new Date().toISOString().slice(0, 10), dir = path.join(BACKUPS, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(ROOT, path.join(dir, 'projects'), { recursive: true });
  if (fs.existsSync(SETTINGS)) fs.copyFileSync(SETTINGS, path.join(dir, 'settings.json'));
  listBackups().slice(BACKUPS_KEPT).forEach(old => fs.rmSync(path.join(BACKUPS, old), { recursive: true, force: true }));
  return { name, dir };
}
export const listBackups = () => fs.existsSync(BACKUPS)
  ? fs.readdirSync(BACKUPS).filter(n => /^\d{4}-\d{2}-\d{2}$/.test(n)).sort().reverse() : [];
export const backupIfDue = () => listBackups()[0] === new Date().toISOString().slice(0, 10) ? null : backupNow();

// ---------- Migración: emojis de versiones anteriores → iconos (una sola vez por carpeta de datos) ----------
(function migrateIcons() {
  if (rawSettings().iconsV >= 1) return;
  for (const name of projectNames()) {
    const p = project(name), meta = projectMeta(p);
    if (meta.emoji !== undefined && meta.emoji !== toIcon(meta.emoji, 'project')) writeJSON(path.join(p.dir, 'project.json'), { ...meta, emoji: toIcon(meta.emoji, 'project') });
    for (const b of boardList(p)) {
      const before = JSON.stringify(b);
      b.emoji = toIcon(b.emoji, 'board');
      b.cards.forEach(c => { c.emoji = toIcon(c.emoji); });
      if (JSON.stringify(b) !== before) saveBoard(p, b);
    }
    for (const rel of pageFiles(p)) {
      const raw = fs.readFileSync(pageFile(p, rel), 'utf8'), pg = parsePage(raw), icon = toIcon(pg.icon, 'page');
      if (icon !== pg.icon) fs.writeFileSync(pageFile(p, rel), serializePage(icon, pg.content));
    }
  }
  writeSettings({ iconsV: 1 });
})();

// ---------- Vista general ----------
export const getTree = () => projectNames().map(name => {
  const p = project(name);
  return {
    name, emoji: toIcon(projectMeta(p).emoji, 'project'),
    boards: boardList(p).map(b => {
      const live = b.cards.filter(c => !c.archived);
      return { id: b.id, name: b.name, emoji: b.emoji, cards: live.length, done: b.columns.length ? live.filter(c => c.columnId === b.columns.at(-1).id).length : 0 };
    }),
    pages: listPages(name),
  };
});

// Búsqueda rápida (Ctrl+K) por nombre de tablero, página o tarjeta.
export function quickFind(query) {
  const q = String(query ?? '').trim().toLowerCase(), out = [];
  for (const name of projectNames()) {
    const p = project(name);
    for (const b of boardList(p)) {
      if (b.name.toLowerCase().includes(q)) out.push({ type: 'board', project: name, id: b.id, title: b.name, emoji: b.emoji });
      for (const c of b.cards) if (q && !c.archived && c.title.toLowerCase().includes(q))
        out.push({ type: 'card', project: name, board: b.id, boardName: b.name, id: c.id, title: c.title, emoji: c.emoji });
    }
    for (const pg of listPages(name)) if (pg.path.toLowerCase().includes(q))
      out.push({ type: 'page', project: name, path: pg.path, title: pg.path.split('/').at(-1), emoji: pg.icon });
  }
  return out.slice(0, 40);
}
