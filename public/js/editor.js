// ================= Editor visual tipo Word: escribes con formato y se guarda como markdown =================
const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---' });
td.use(turndownPluginGfm.gfm);
td.remove(['style', 'script', 'meta', 'title', 'head', 'xml']); // lo que trae el pegado desde Word
td.addRule('preSinCode', {
  filter: n => n.nodeName === 'PRE' && n.firstChild?.nodeName !== 'CODE',
  replacement: (_, n) => '\n\n```\n' + n.textContent.replace(/\n$/, '') + '\n```\n\n',
});
// Imágenes del proyecto: en pantalla /asset/<proyecto>/<id>.png, en el markdown assets/<id>.png
td.addRule('imagen', {
  filter: 'img',
  replacement: (_, n) => {
    const src = n.getAttribute('src') || '', m = /^\/asset\/[^/]+\/([^/?#]+)$/.exec(src);
    return src ? `![${(n.getAttribute('alt') || '').replace(/[[\]]/g, '')}](${m ? 'assets/' + m[1] : src})` : '';
  },
});
// Enlace a otra página → [[Ruta/Página]] (o [[Ruta/Página|texto]] si el texto no es el nombre)
td.addRule('enlacePagina', {
  filter: n => n.nodeName === 'A' && n.classList.contains('pagelink'),
  replacement: (_, n) => {
    const target = n.dataset.page, label = n.textContent.trim();
    return label && label !== target.split('/').at(-1) ? `[[${target}|${label}]]` : `[[${target}]]`;
  },
});
// Enlace a otra página: chip con el icono de la página y su nombre (en el markdown es [[Ruta/Página]])
const pageIcon = (project, path) => { const pg = proj(project)?.pages.find(x => x.path === path); return pg?.icon ? glyph(pg.icon) : icon('file-text', 'sm'); };
const pagelinkHTML = (path, project, label) => `<a class="pagelink" data-page="${esc(path)}" contenteditable="false">${pageIcon(project, path)}${esc(label || path.split('/').at(-1))}</a>`;
const rteHTML = (text, project = route.project) => {
  if (!text.trim()) return '<p><br></p>';
  const pages = new Set(proj(project)?.pages.map(p => p.path) || []);
  return md(text)
    .replace(/<input([^>]*?) disabled=""([^>]*)> ?/g, '<input$1$2 contenteditable="false">')
    .replace(/(<img [^>]*src=")assets\//g, `$1/asset/${encodeURIComponent(project)}/`)
    .replace(/<a class="pagelink" data-page="([^"]*)" contenteditable="false">/g, (m, p) => {
      const path = p.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      return (pages.has(path) ? m : m.replace('class="pagelink"', 'class="pagelink missing"')) + pageIcon(project, path);
    });
};
const toMd = el => td.turndown(el.innerHTML.replace(/​/g, ''))
  .replace(/^(\s*)([-*]|\d+\.) {2,}/gm, '$1$2 ') // "-   item" de turndown → "- item"
  .replace(/\[([ x])\] {2,}/g, '[$1] ')
  .replace(/\n{3,}/g, '\n\n').trim();
const markEmpty = el => el.classList.toggle('empty', !el.textContent.trim() && !el.querySelector('li, hr, table, input, pre, img'));
const selEl = () => { const n = getSelection().anchorNode; return n?.nodeType === 1 ? n : n?.parentElement; };
const closestLi = el => { const li = selEl()?.closest('li'); return li && el.contains(li) ? li : null; };
const CHECK = '<input type="checkbox" contenteditable="false">';

const RTE_TOOLS = [
  ['p', 'pilcrow', 'Texto normal'], ['h1', 'heading-1', 'Título 1'], ['h2', 'heading-2', 'Título 2'], ['h3', 'heading-3', 'Título 3'], '|',
  ['bold', 'B', 'Negrita (Ctrl+B)'], ['italic', 'I', 'Cursiva (Ctrl+I)'], ['strikeThrough', 'S', 'Tachado'], ['code', 'code', 'Código'], ['link', 'link', 'Enlace web'], ['pagelink', 'file-text', 'Enlace a otra página ([[)'], '|',
  ['insertUnorderedList', 'list', 'Lista'], ['insertOrderedList', 'list-ordered', 'Lista numerada'], ['check', 'list-checks', 'Lista de tareas'],
  ['blockquote', 'quote', 'Cita'], ['pre', 'square-code', 'Bloque de código'], ['table', 'table', 'Tabla'], ['image', 'image-plus', 'Imagen'], ['insertHorizontalRule', 'minus', 'Separador'], '|',
  ['undo', 'undo-2', 'Deshacer (Ctrl+Z)'], ['redo', 'redo-2', 'Rehacer (Ctrl+Y)'],
];
const rteBar = kind => `<div class="rte-bar" role="toolbar" aria-label="Formato">${RTE_TOOLS.map(t => t === '|' ? '<span class="sep"></span>'
  : `<button class="tb" data-cmd="${t[0]}" title="${t[2]}" aria-label="${t[2]}">${t[1].length === 1 ? `<span class="tl tl-${t[0]}">${t[1]}</span>` : icon(t[1])}</button>`).join('')}${
  kind === 'page' ? `<span class="grow"></span><button class="tb" data-act="raw-md" title="Editar el markdown a mano" aria-label="Editar el markdown a mano">${icon('file-code')}</button>` : ''}</div>`;

function caretAfter(node) {
  const r = document.createRange(); r.setStartAfter(node); r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r);
}
function rteCmd(cmd, el) {
  if (['p', 'h1', 'h2', 'h3', 'blockquote', 'pre'].includes(cmd)) document.execCommand('formatBlock', false, cmd);
  else if (cmd === 'code') document.execCommand('insertHTML', false, `<code>${esc(getSelection().toString() || 'código')}</code>&#8203;`);
  else if (cmd === 'table') document.execCommand('insertHTML', false, '<table><thead><tr><th>Columna</th><th>Columna</th></tr></thead><tbody><tr><td><br></td><td><br></td></tr></tbody></table><p><br></p>');
  else if (cmd === 'image') pickImages(el);
  else if (cmd === 'pagelink') document.execCommand('insertText', false, '[['); // abre el buscador de páginas
  else if (cmd === 'check') {
    if (!closestLi(el)) document.execCommand('insertUnorderedList');
    const item = closestLi(el);
    if (item && !item.querySelector(':scope > input[type=checkbox]')) {
      const empty = !item.textContent.trim();
      item.insertAdjacentHTML('afterbegin', CHECK);
      if (empty) caretAfter(item.firstChild); // si ya hay texto, el cursor se queda donde estaba
    }
  } else document.execCommand(cmd);
}

function linkPrompt(anchor, el) {
  const sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  openPop(anchor, {
    search: 'Pega la dirección (https://…) y pulsa Enter',
    list: () => '<div class="pop-label">Se enlaza el texto seleccionado; si no hay, se escribe la dirección.</div>',
    enter: url => {
      if (!url) return;
      const u = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : 'https://' + url;
      if (!/^(https?:|mailto:)/i.test(u)) return toast('Solo enlaces http, https o mailto', true);
      closePop(); el.focus();
      if (range) { sel.removeAllRanges(); sel.addRange(range); }
      if (sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${esc(u)}">${esc(url)}</a>`);
      else document.execCommand('createLink', false, u);
      queueRteSave(el);
    },
  });
}

// ---------- Imágenes: pegar, soltar o elegir un fichero ----------
async function insertImages(el, files) {
  const project = el.dataset.project || route.project;
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue;
    if (f.size > 15 * 1024 * 1024) { toast(`«${f.name}» pasa de 15 MB`, true); continue; }
    $('#status').textContent = 'Subiendo imagen…';
    const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
    const { path } = await call('saveAsset', project, f.name || 'imagen.png', b64);
    el.focus();
    document.execCommand('insertHTML', false, `<img src="${assetUrl(project, path)}" alt=""><p><br></p>`);
  }
  markEmpty(el); queueRteSave(el);
}
function pickImages(el) {
  const sel = getSelection(), range = sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true });
  input.onchange = () => { el.focus(); if (range) { sel.removeAllRanges(); sel.addRange(range); } insertImages(el, [...input.files]); };
  input.click();
}
document.addEventListener('dragover', e => { if (e.target.closest?.('.rte') && e.dataTransfer.types.includes('Files')) e.preventDefault(); });
document.addEventListener('drop', e => {
  const el = e.target.closest?.('.rte');
  if (!el || !e.dataTransfer.files.length) return;
  e.preventDefault();
  const r = document.caretRangeFromPoint(e.clientX, e.clientY);
  if (r) { el.focus(); getSelection().removeAllRanges(); getSelection().addRange(r); }
  insertImages(el, [...e.dataTransfer.files]);
});

// ---------- Guardado con detección de choques ----------
// el._base es lo que el editor tenía al empezar (hash de la página o descripción de la tarjeta). Si al guardar
// el fichero ya no es esa versión, alguien (casi siempre la IA) lo cambió: no se pisa, se pregunta.
const rteTimers = new Map();
function queueRteSave(el) {
  if (el._conflict) return; // en pausa hasta que se decida qué versión queda
  clearTimeout(rteTimers.get(el));
  rteTimers.set(el, setTimeout(() => saveRte(el), 600));
  $('#status').textContent = 'Guardando…';
}
async function saveRte(el, force = false) {
  clearTimeout(rteTimers.get(el)); rteTimers.delete(el);
  if (el._conflict && !force) return;
  const text = toMd(el), { rte, project, path, card } = el.dataset; // se lee ya: el editor puede desaparecer tras el await
  el._saving = true; // mientras, lo que lea la sincronización puede ser ya nuestra propia escritura
  try {
    if (rte === 'page') {
      const r = await call('writePage', project, path, { content: text, ...(force ? {} : { baseHash: el._base }) });
      el._base = r.hash;
      if (page && route.project === project && page.path === path) { page.content = text; page.hash = r.hash; }
    } else {
      const c = board?.cards.find(x => x.id === card);
      if (!c || c.description !== text) await call('updateCard', card, { description: text, ...(force ? {} : { baseDescription: el._base }) });
      el._base = text;
      if (c) c.description = text;
    }
    $('#status').textContent = 'Guardado';
  } catch (e) {
    if (e.code !== 'conflict') throw e;
    showConflict(el, e.current);
  } finally { el._saving = false; }
}
const flushRte = () => Promise.all([...rteTimers.keys()].map(el => saveRte(el)));

// La sincronización ve un cambio de fuera mientras escribes: avisa antes de que choque al guardar.
function remoteChanged(el, marker, current) {
  if (!el || el._conflict || el._saving || el._base === marker) return;
  if (el.dataset.rte === 'card' && toMd(el) === current) { el._base = current; return; } // es lo mismo que tienes
  showConflict(el, current);
}
function showConflict(el, theirs) {
  el._conflict = true; el._theirs = theirs;
  clearTimeout(rteTimers.get(el)); rteTimers.delete(el);
  const what = el.dataset.rte === 'page' ? 'Esta página' : 'La descripción';
  const slot = el.parentElement.querySelector('.conflict-slot');
  if (!slot) return;
  slot.innerHTML = `<div class="banner warn c-yellow" role="alert">${icon('triangle-exclamation-point', 'sm')}
    <span><b>${what} ha cambiado fuera de este editor</b> (normalmente la IA) mientras escribías. Tus cambios aún no se han guardado.</span>
    <button class="btn ghost" data-conflict="theirs">Usar la nueva y copiar la mía</button>
    <button class="btn primary" data-conflict="mine">Guardar la mía</button></div>`;
  $('#status').textContent = 'Sin guardar';
}
document.addEventListener('click', async e => {
  const b = e.target.closest?.('[data-conflict]');
  if (!b) return;
  const slot = b.closest('.conflict-slot'), el = slot.parentElement.querySelector('.rte');
  if (b.dataset.conflict === 'mine') {
    el._conflict = false;
    await saveRte(el, true);
    toast('Guardada tu versión');
  } else {
    await copyText(toMd(el), 'Tu versión está en el portapapeles');
    el._conflict = false;
    if (el.dataset.rte === 'page') { el.blur(); await sync(true); } // vuelve a leer la página
    else { el.innerHTML = rteHTML(el._theirs, el.dataset.project); el._base = el._theirs; markEmpty(el); }
  }
  slot.innerHTML = '';
});

// ---------- Atajos de markdown al principio de una línea: "# ", "## ", "- ", "1. ", "> ", "[] ", "``` " ----------
const SHORTCUTS = { '#': 'h1', '##': 'h2', '###': 'h3', '-': 'insertUnorderedList', '*': 'insertUnorderedList', '1.': 'insertOrderedList', '>': 'blockquote', '[]': 'check', '[ ]': 'check', '```': 'pre' };
function markdownShortcut(el, e) {
  if (e.inputType !== 'insertText' || !e.data?.includes(' ')) return;
  const sel = getSelection();
  let block = selEl();
  while (block && block !== el && !/^(P|DIV|LI|H[1-6])$/.test(block.nodeName)) block = block.parentElement;
  if (!block || block === el) block = sel.anchorNode;
  const m = /^(#{1,3}|[-*]|1\.|>|\[ ?\]|```) /.exec(block.textContent.replace(/ /g, ' '));
  const cmd = m && SHORTCUTS[m[1]];
  if (!cmd || (block.nodeName === 'LI' && cmd !== 'check')) return;
  // Solo si el espacio que sigue al prefijo es lo que se acaba de escribir (no al editar más adelante en la línea)
  const upto = document.createRange(); upto.selectNodeContents(block); upto.setEnd(sel.anchorNode, sel.anchorOffset);
  if (upto.toString().length - e.data.length > m[0].length - 1) return;
  // Quita el prefijo, aplica el formato al resto de la línea y deja el cursor donde estaba
  const pos = upto.toString().length - m[0].length;
  const cut = document.createRange(); cut.setStart(block, 0);
  const at = textPoint(block, m[0].length);
  if (!at) return;
  cut.setEnd(at.node, at.offset);
  sel.removeAllRanges(); sel.addRange(cut);
  document.execCommand('delete');
  rteCmd(cmd, el);
  let nb = selEl();
  while (nb && nb !== el && !/^(P|DIV|LI|H[1-6]|BLOCKQUOTE|PRE)$/.test(nb.nodeName)) nb = nb.parentElement;
  const back = nb && nb !== el && textPoint(nb, pos);
  if (back) { const r = document.createRange(); r.setStart(back.node, back.offset); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); }
}
// Nodo de texto y desplazamiento del carácter n dentro de un bloque
function textPoint(block, n) {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  for (let node; (node = walker.nextNode());) { if (node.data.length >= n) return { node, offset: n }; n -= node.data.length; }
  return null;
}

// ---------- Menú «/» (insertar bloques) y «[[» (enlazar página), junto al cursor ----------
const BLOCKS = [
  ['p', 'pilcrow', 'Texto', 'parrafo normal'], ['h1', 'heading-1', 'Título 1', 'encabezado grande h1'], ['h2', 'heading-2', 'Título 2', 'encabezado h2'],
  ['h3', 'heading-3', 'Título 3', 'encabezado h3'], ['insertUnorderedList', 'list', 'Lista', 'viñetas puntos'], ['insertOrderedList', 'list-ordered', 'Lista numerada', 'numeros'],
  ['check', 'list-checks', 'Lista de tareas', 'todo checklist casillas'], ['blockquote', 'quote', 'Cita', 'quote'], ['pre', 'square-code', 'Bloque de código', 'code'],
  ['table', 'table', 'Tabla', 'tabla'], ['image', 'image-plus', 'Imagen', 'foto captura'], ['pagelink', 'file-text', 'Enlace a página', 'pagina link wiki'],
  ['insertHorizontalRule', 'minus', 'Separador', 'linea divisor hr'],
  ['subpage', 'file-plus', 'Subpágina', 'pagina hija nueva dentro'],
];
const fold = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let inline = null; // { el, kind: 'slash' | 'page', node, offset, sel, items }

function caretAnchor() {
  const r = getSelection().getRangeAt(0).cloneRange();
  const rect = r.getClientRects()[0] || selEl()?.getBoundingClientRect();
  return { getBoundingClientRect: () => rect };
}
function openInline(el, kind) {
  const r = getSelection().getRangeAt(0);
  inline = { el, kind, node: r.startContainer, offset: r.startOffset - (kind === 'slash' ? 1 : 2), sel: 0 };
  openPop(caretAnchor(), { wide: kind === 'page', list: inlineList, pick: v => pickInline(v) });
  P.classList.add('inline-menu');
}
// Lo escrito tras el disparador; null si el cursor se fue a otro sitio
function inlineQuery() {
  const s = getSelection();
  if (!inline || !s.rangeCount) return null;
  const r = s.getRangeAt(0);
  if (r.startContainer !== inline.node || r.startOffset <= inline.offset || inline.node.nodeType !== 3) return null;
  const typed = inline.node.data.slice(inline.offset, r.startOffset);
  if (!typed.startsWith(inline.kind === 'slash' ? '/' : '[[')) return null;
  return typed.slice(inline.kind === 'slash' ? 1 : 2);
}
function inlineList() {
  const q = fold(inlineQuery() ?? '');
  if (inline.kind === 'slash') {
    inline.items = BLOCKS.filter(b => (b[0] !== 'subpage' || inline.el.dataset.rte === 'page') && fold(b[2] + ' ' + b[3]).includes(q))
      .map(b => ({ v: b[0], html: `${icon(b[1], 'sm')}<span class="grow">${b[2]}</span>` }));
  } else {
    const pages = proj(inline.el.dataset.project || route.project)?.pages || [];
    inline.items = pages.filter(p => fold(p.path).includes(q)).slice(0, 12)
      .map(p => ({ v: 'page:' + p.path, html: `<span class="em">${p.icon ? glyph(p.icon) : icon('file-text', 'sm')}</span><span class="grow">${esc(p.path)}</span>` }));
    const raw = (inlineQuery() ?? '').trim();
    if (raw && !pages.some(p => fold(p.path) === fold(raw))) inline.items.push({ v: 'new:' + raw, html: `${icon('file-plus', 'sm')}<span class="grow">Crear página «${esc(raw)}»</span>` });
  }
  inline.sel = Math.min(inline.sel, Math.max(0, inline.items.length - 1));
  return (inline.kind === 'slash' ? '<div class="pop-label">Insertar</div>' : '<div class="pop-label">Enlazar página</div>')
    + (inline.items.map((it, i) => `<button class="opt ${i === inline.sel ? 'kb' : ''}" data-v="${esc(it.v)}">${it.html}</button>`).join('')
      || '<div class="pop-label">Sin resultados</div>');
}
function closeInline() { if (inline) { inline = null; P.classList.remove('inline-menu'); closePop(); } }
function refreshInline() {
  if (!inline) return;
  if (inlineQuery() === null) return closeInline();
  drawPop();
  $('#pop .kb')?.scrollIntoView({ block: 'nearest' });
}
async function pickInline(v) {
  const { el, kind, node, offset } = inline;
  const r = getSelection().getRangeAt(0), cut = document.createRange();
  cut.setStart(node, offset); cut.setEnd(r.startContainer, r.startOffset);
  closeInline();
  el.focus();
  getSelection().removeAllRanges(); getSelection().addRange(cut);
  document.execCommand('delete'); // quita "/consulta" o "[[consulta"
  if (kind === 'slash' && v === 'subpage') {
    const child = (await call('createPage', el.dataset.project, { parent: el.dataset.path })).path;
    document.execCommand('insertHTML', false, pagelinkHTML(child, el.dataset.project) + '&nbsp;');
    await saveRte(el, true);
    focusTitleNext = true;
    return go({ type: 'page', project: el.dataset.project, path: child });
  }
  if (kind === 'slash') rteCmd(v, el);
  else {
    let path = v.slice(v.indexOf(':') + 1);
    if (v.startsWith('new:')) { path = (await call('createPage', el.dataset.project || route.project, { title: path })).path; sync(); }
    document.execCommand('insertHTML', false, pagelinkHTML(path, el.dataset.project || route.project) + '&nbsp;');
  }
  markEmpty(el); queueRteSave(el);
}
// Los clics en el menú no deben quitar el cursor del editor
document.addEventListener('mousedown', e => { if (inline && e.target.closest?.('#pop .opt')) e.preventDefault(); }, true);
P.addEventListener('toggle', e => { if (e.newState === 'closed' && inline) { inline = null; P.classList.remove('inline-menu'); } });

document.addEventListener('input', e => {
  const el = e.target.closest?.('.rte');
  if (!el) return;
  markdownShortcut(el, e);
  if (inline) refreshInline();
  else if (e.inputType === 'insertText' && e.data?.endsWith('/')) {
    const s = getSelection(), n = s.anchorNode, before = n?.nodeType === 3 ? n.data.slice(0, s.anchorOffset - 1) : '';
    if (!before || /\s$/.test(before.replace(/ /g, ' '))) openInline(el, 'slash'); // "/" al empezar o tras un espacio
  } else if (e.inputType === 'insertText' && e.data?.endsWith('[')) {
    const s = getSelection(), n = s.anchorNode;
    if (n?.nodeType === 3 && n.data.slice(s.anchorOffset - 2, s.anchorOffset) === '[[') openInline(el, 'page');
  }
  markEmpty(el); queueRteSave(el);
});
document.addEventListener('selectionchange', () => { if (inline && document.activeElement === inline.el) refreshInline(); });
document.addEventListener('focusout', e => {
  const el = e.target.closest?.('.rte');
  if (el && rteTimers.has(el)) saveRte(el);
});

document.addEventListener('keydown', e => {
  const el = e.target.closest?.('.rte');
  if (!el) return;
  if (inline) { // el menú junto al cursor manda sobre las flechas, Enter, Tab y Esc
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      inline.sel = (inline.sel + (e.key === 'ArrowDown' ? 1 : -1) + inline.items.length) % Math.max(1, inline.items.length);
      return refreshInline();
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && inline.items?.length) { e.preventDefault(); return pickInline(inline.items[inline.sel].v); }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return closeInline(); }
  }
  const li = closestLi(el);
  if (e.key === 'Tab' && li) { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }
  if (e.key === 'Enter' && !e.shiftKey && li?.querySelector(':scope > input[type=checkbox]')) {
    if (!li.textContent.trim()) { e.preventDefault(); li.querySelector(':scope > input').remove(); document.execCommand('insertUnorderedList'); return; }
    setTimeout(() => { // la tarea nueva también lleva su casilla
      const n = closestLi(el);
      if (n && n !== li && !n.querySelector(':scope > input[type=checkbox]')) { n.insertAdjacentHTML('afterbegin', CHECK); caretAfter(n.firstChild); }
    }, 0);
  }
  if (e.key === 'Escape') el.blur();
  if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saveRte(el); }
});

// Las casillas se marcan con un clic aunque estén dentro del texto editable
document.addEventListener('mousedown', e => {
  if (e.target.closest?.('.rte-bar .tb')) return e.preventDefault(); // la barra no roba el foco ni la selección
  const cb = e.target.closest?.('.rte input[type=checkbox]');
  if (!cb) return;
  e.preventDefault();
  cb.checked = !cb.checked; cb.toggleAttribute('checked', cb.checked);
  queueRteSave(cb.closest('.rte'));
});
document.addEventListener('click', e => {
  if (e.target.matches?.('.rte input[type=checkbox]')) e.preventDefault();
  const pl = e.target.closest?.('.pagelink');
  if (pl) { // un clic en el enlace a página la abre (en el mismo proyecto)
    e.preventDefault();
    const project = pl.closest('.rte')?.dataset.project || route.project;
    if (!pl.classList.contains('missing')) go({ type: 'page', project, path: pl.dataset.page });
    else toast(`No existe la página «${pl.dataset.page}»`, true);
    return;
  }
  const link = e.target.closest?.('.rte a[href]');
  if (link && (e.ctrlKey || e.metaKey)) window.open(link.href); // Ctrl+clic abre el enlace fuera
  const b = e.target.closest?.('.rte-bar .tb[data-cmd]');
  if (!b) return;
  const el = b.closest('.rte-bar').parentElement.querySelector('.rte');
  if (!el.contains(getSelection().anchorNode)) {
    el.focus();
    const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    getSelection().removeAllRanges(); getSelection().addRange(r);
  }
  if (b.dataset.cmd === 'link') return linkPrompt(b, el);
  rteCmd(b.dataset.cmd, el);
  markEmpty(el); queueRteSave(el); updateBar();
}, true);

// Pegar desde Word o una web: se limpia pasando por markdown, así no se cuelan estilos raros. Las imágenes se guardan en el proyecto.
document.addEventListener('paste', e => {
  const el = e.target.closest?.('.rte');
  if (!el) return;
  e.preventDefault();
  const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/'));
  if (files.length) return insertImages(el, files);
  const html = e.clipboardData.getData('text/html'), text = e.clipboardData.getData('text/plain');
  if (!html && !text.includes('\n')) document.execCommand('insertText', false, text);
  else document.execCommand('insertHTML', false, rteHTML(html ? td.turndown(html) : text, el.dataset.project));
  markEmpty(el); queueRteSave(el);
});

// ---------- Barra flotante: aparece encima del texto seleccionado ----------
const BUBBLE_TOOLS = [['p', 'pilcrow', 'Texto normal'], ['h1', 'heading-1', 'Título 1'], ['h2', 'heading-2', 'Título 2'], ['h3', 'heading-3', 'Título 3'], '|',
  ['bold', 'B', 'Negrita (Ctrl+B)'], ['italic', 'I', 'Cursiva (Ctrl+I)'], ['strikeThrough', 'S', 'Tachado'], ['code', 'code', 'Código'], ['link', 'link', 'Enlace'], '|',
  ['insertUnorderedList', 'list', 'Lista'], ['check', 'list-checks', 'Lista de tareas'], ['blockquote', 'quote', 'Cita']];
const bubble = Object.assign(document.createElement('div'), { id: 'bubble', className: 'bubble', hidden: true });
bubble.setAttribute('role', 'toolbar'); bubble.setAttribute('aria-label', 'Formato del texto seleccionado');
bubble.innerHTML = BUBBLE_TOOLS.map(t => t === '|' ? '<span class="sep"></span>'
  : `<button class="tb" data-bcmd="${t[0]}" title="${t[2]}" aria-label="${t[2]}">${t[1].length === 1 ? `<span class="tl tl-${t[0]}">${t[1]}</span>` : icon(t[1])}</button>`).join('');
document.body.append(bubble);
function placeBubble() {
  const s = getSelection(), el = selEl()?.closest('.rte');
  if (!el || s.isCollapsed || !s.rangeCount || inline || el._conflict) return void (bubble.hidden = true);
  const r = s.getRangeAt(0).getBoundingClientRect();
  if (!r.width && !r.height) return void (bubble.hidden = true);
  bubble.hidden = false; bubble._el = el;
  const w = bubble.offsetWidth, h = bubble.offsetHeight, top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top')) + 6;
  bubble.style.left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) + 'px';
  bubble.style.top = (r.top - h - 8 >= top ? r.top - h - 8 : r.bottom + 8) + 'px';
  markActive(bubble, el, '[data-bcmd]', 'bcmd');
}
document.addEventListener('selectionchange', () => requestAnimationFrame(placeBubble));
document.addEventListener('scroll', () => { if (!bubble.hidden) placeBubble(); }, true);
bubble.addEventListener('mousedown', e => e.preventDefault()); // no quita la selección
bubble.addEventListener('click', e => {
  const b = e.target.closest('[data-bcmd]'), el = bubble._el;
  if (!b || !el) return;
  if (b.dataset.bcmd === 'link') { bubble.hidden = true; return linkPrompt(b, el); }
  rteCmd(b.dataset.bcmd, el);
  markEmpty(el); queueRteSave(el); placeBubble();
});

// Botones marcados según dónde está el cursor (barra fija y barra flotante)
function markActive(bar, el, sel, key) {
  const n = selEl(), tag = n?.closest('h1, h2, h3, blockquote, pre, li, p')?.nodeName.toLowerCase();
  const inlineCmds = ['bold', 'italic', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList'];
  for (const b of $$(sel, bar)) {
    const c = b.dataset[key];
    const on = c === 'bold' && /^h[1-3]$/.test(tag) ? !!n.closest('b, strong') // en un título todo es grueso: cuenta solo la negrita puesta
      : inlineCmds.includes(c) ? document.queryCommandState(c) : c === 'check' ? !!closestLi(el)?.querySelector(':scope > input') : c === tag;
    b.classList.toggle('on', on);
  }
}
function updateBar() {
  const el = selEl()?.closest('.rte'), bar = el?.parentElement.querySelector('.rte-bar');
  if (bar) markActive(bar, el, '[data-cmd]', 'cmd');
}
document.addEventListener('selectionchange', updateBar);
document.execCommand('defaultParagraphSeparator', false, 'p');
