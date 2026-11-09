// ================= Utilidades =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = '') => `<svg class="i ${cls}"><use href="/icons.svg#${name}"/></svg>`;
// Icono de usuario: "lucide:<nombre>:<color>" como SVG teñido (Taskvia no usa emojis).
function glyph(v, cls = '') {
  const m = /^lucide:([a-z0-9-]+)(?::([a-z]+))?$/.exec(v || '');
  return m ? `<svg class="gl ${cls} ${COLORS.includes(m[2]) ? 'c-' + m[2] : ''}" aria-hidden="true"><use href="/icons.svg#${m[1]}"/></svg>` : '';
}
marked.use({ gfm: true, breaks: true, renderer: { html: t => esc(typeof t === 'string' ? t : t.text) } }); // sin HTML crudo
// Enlaces entre páginas: [[Ruta/Página]] o [[Ruta/Página|texto]] → chip que abre la página
marked.use({ extensions: [{
  name: 'wikilink', level: 'inline',
  start: src => src.indexOf('[['),
  tokenizer(src) {
    const m = /^\[\[([^\]|]+?)(?:\|([^\]]*))?\]\]/.exec(src);
    if (m) return { type: 'wikilink', raw: m[0], target: m[1].trim(), alias: m[2]?.trim() };
  },
  renderer: t => `<a class="pagelink" data-page="${esc(t.target)}" contenteditable="false">${esc(t.alias || t.target.split('/').at(-1))}</a>`,
}] });
// Imágenes con tamaño y marco en el texto alternativo: ![texto|50%](…), ![texto|320|movil](…), ![texto|pc](…).
// El tamaño es % del ancho de la página o px; los marcos son movil y pc. Así lo puede escribir también la IA.
const IMG_FRAMES = { movil: 'movil', 'móvil': 'movil', pc: 'pc' };
function imgOpts(alt) {
  const [text, ...rest] = String(alt || '').split('|');
  let size = '', frame = '';
  for (const t of rest.map(x => x.trim().toLowerCase())) {
    if (/^\d{1,3}%$/.test(t)) size = Math.min(100, Math.max(5, parseInt(t))) + '%';
    else if (/^\d{2,4}(px)?$/.test(t)) size = parseInt(t) + 'px';
    else if (IMG_FRAMES[t]) frame = IMG_FRAMES[t];
  }
  return { text: text.trim(), size, frame };
}
const imgAlt = (text, size, frame) => [String(text || '').replace(/[[\]|]/g, '').trim(), ...[size, frame].filter(Boolean)].join('|');
marked.use({ renderer: { image({ href, title, text }) {
  const o = imgOpts(text);
  const img = `<img src="${esc(href)}" alt="${esc(o.text)}"${title ? ` title="${esc(title)}"` : ''}${o.size ? ` data-size="${o.size}"` : ''}${o.frame ? ` data-frame="${o.frame}"` : ''}`;
  // Con marco, la imagen va dentro de un iPhone o de una ventana de Mac, y el tamaño lo lleva el marco
  return o.frame ? `<span class="dev dev-${o.frame}" contenteditable="false"${o.size ? ` style="width:${o.size}"` : ''}>${img}></span>`
    : `${img}${o.size ? ` style="width:${o.size}"` : ''}>`;
} } });
const md = s => marked.parse(s || '');
const COLORS = ['gray', 'brown', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'red'];
const COLOR_NAMES = { gray: 'Gris', brown: 'Marrón', orange: 'Naranja', yellow: 'Amarillo', green: 'Verde', blue: 'Azul', purple: 'Morado', pink: 'Rosa', red: 'Rojo' };
const store = { get: k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

async function call(fn, ...args) {
  const r = await fetch('/api/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
  const j = await r.json();
  if (!r.ok) {
    const e = Object.assign(new Error(j.error), { code: j.code, current: j.current });
    if (e.code !== 'conflict') toast(j.error, true); // los choques los enseña su propio aviso
    throw e;
  }
  return j;
}
async function act(fn, ...args) { const r = await call(fn, ...args); await sync(true); return r; }

let toastTimer;
// action: { label, run } añade un botón (p. ej. «Deshacer») y deja el aviso más tiempo.
function toast(msg, err = false, action = null) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-act">${esc(action.label)}</button>` : ''}`;
  t.classList.toggle('err', err);
  if (action) t.querySelector('button').onclick = () => { t.hidePopover(); action.run(); };
  if (!t.matches(':popover-open')) t.showPopover();
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidePopover(), action ? 7000 : err ? 5000 : 1800);
}

// "hace 5 min", "ayer", "12 mar" para el historial y la papelera
function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return 'ayer';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
const isAI = by => by !== 'tú'; // solo hay dos autores: tú (la app) y la IA (el MCP), también con el nombre que usaban versiones anteriores
const who = by => isAI(by) ? 'IA' : 'Tú';
const assetUrl = (project, p) => `/asset/${encodeURIComponent(project)}/${p.replace(/^assets\//, '')}`;

async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove();
    if (!ok) return toast('No se pudo copiar al portapapeles', true);
  }
  toast(okMsg);
}

function uniqueName(base, taken) {
  const set = new Set(taken.map(t => t.toLowerCase()));
  let name = base;
  for (let n = 2; set.has(name.toLowerCase()); n++) name = `${base} ${n}`;
  return name;
}
