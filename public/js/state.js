// ================= Estado y rutas =================
// #/p/<proyecto> · #/b/<proyecto>/<idTablero> · #/d/<proyecto>/<ruta…> · #/papelera · #/
let tree = [], board = null, page = null, backrefs = [], trash = [], route = { type: 'home' }, peekId = null;
const labelFilter = new Set(); // etiquetas por las que se filtra el tablero abierto
let expanded = new Set(store.get('expanded') || []), collapsedProjects = new Set(store.get('collapsed') || []);
let focusTitleNext = false, dragId = null;

const enc = encodeURIComponent;
const href = r => r.type === 'project' ? `#/p/${enc(r.project)}`
  : r.type === 'board' ? `#/b/${enc(r.project)}/${r.id}`
  : r.type === 'page' ? `#/d/${enc(r.project)}/${r.path.split('/').map(enc).join('/')}`
  : r.type === 'trash' ? '#/papelera' : '#/';
function parseHash() {
  const [, t, p, ...rest] = location.hash.split('/').map(s => { try { return decodeURIComponent(s); } catch { return s; } });
  if (t === 'p' && p) return { type: 'project', project: p };
  if (t === 'b' && p && rest[0]) return { type: 'board', project: p, id: rest[0] };
  if (t === 'd' && p && rest.length) return { type: 'page', project: p, path: rest.join('/') };
  if (t === 'papelera') return { type: 'trash' };
  return { type: 'home' };
}
// Cambiar location.hash ya dispara hashchange → onRoute; solo se llama a mano si no va a haber evento.
const go = (r, replace = false) => {
  const h = href(r);
  if (replace) { history.replaceState(null, '', h); onRoute(); }
  else if (location.hash === h) onRoute();
  else location.hash = h;
};
const proj = name => tree.find(p => p.name === name);
window.addEventListener('hashchange', onRoute);

async function onRoute() {
  await Promise.all([savePage(), flushRte()]).catch(() => {});
  $('#status').textContent = '';
  const prev = route;
  route = parseHash();
  store.set('route', route);
  if (['project', 'board', 'page'].includes(route.type)) // Recientes en Inicio: lo último visitado primero
    store.set('recent', [route, ...(store.get('recent') || []).filter(r => href(r) !== href(route))].slice(0, 8));
  closePeek();
  if (prev.type !== 'board' || prev.id !== route.id) labelFilter.clear();
  board = page = null;
  await sync(true);
}

// ================= Sincronización (la IA cambia los ficheros por MCP) =================
let last = {}, syncing = false, syncSeq = 0;
const editingIn = el => el && el.contains(document.activeElement) && document.activeElement.matches('input, textarea, [contenteditable]');
async function sync(force = false) {
  if (syncing && !force) return;
  syncing = true;
  const seq = ++syncSeq, stale = () => seq !== syncSeq; // una sincronización más nueva manda; esta no pinta
  try {
    const t = await call('getTree'), tj = JSON.stringify(t);
    if (stale()) return;
    if (force || tj !== last.tree) { tree = t; last.tree = tj; if (force || !editingIn($('#sb'))) renderSidebar(); }

    if (route.project && !proj(route.project)) { go({ type: 'home' }, true); return; }
    if (route.type === 'board') {
      let b;
      try { b = await call('getBoard', route.project, route.id); } catch { if (!stale()) go({ type: 'project', project: route.project }, true); return; }
      if (stale()) return;
      const bj = JSON.stringify(b);
      const changed = force || bj !== last.board;
      board = b; last.board = bj;
      if (changed && !dragId && (force || !editingIn($('#main')))) renderMain();
      const desc = $('#peek .rte'), writingDesc = desc && desc.dataset.card === peekId && (desc.contains(document.activeElement) || rteTimers.has(desc) || desc._saving);
      if (peekId && changed && !writingDesc && (force || !editingIn($('#peek')))) renderPeek();
      else if (peekId && changed && writingDesc) { const c = b.cards.find(x => x.id === peekId); if (c) remoteChanged(desc, c.description, c.description); }
    } else if (route.type === 'page') {
      let pg;
      try { pg = await call('readPage', route.project, route.path); } catch { if (!stale()) go({ type: 'project', project: route.project }, true); return; }
      const refs = await call('backlinks', route.project, route.path);
      if (stale()) return;
      const pj = JSON.stringify([pg, refs, tj]);
      const changed = force || pj !== last.page;
      page = pg; backrefs = refs; last.page = pj;
      // Mientras escribes en la página no se repinta nunca (ni forzando): se perdería el cursor y lo no guardado.
      // (solo si ese editor es de esta misma página: al cambiar de página siempre se pinta la nueva)
      const ed = $('#main .rte'), mine = ed && ed.dataset.project === route.project && ed.dataset.path === pg.path;
      const writing = mine && (ed.contains(document.activeElement) || rteTimers.has(ed) || ed._saving);
      if (changed && !writing && (force || !editingIn($('#main')))) renderMain();
      else if (changed && writing) remoteChanged(ed, pg.hash, pg.content); // la estás editando y alguien (la IA) la cambió
    } else if (route.type === 'trash') {
      const t = await call('listTrash');
      if (stale()) return;
      const xj = JSON.stringify(t);
      if (force || xj !== last.trash) { trash = t; last.trash = xj; renderMain(); }
    } else if (force || tj !== last.mainTree) {
      last.mainTree = tj;
      if (force || !editingIn($('#main'))) renderMain();
    }
    renderCrumbs();
  } finally { if (!stale()) syncing = false; }
}
setInterval(() => { if (!document.hidden && !dragId && !$('#pop').matches(':popover-open')) sync(); }, 2000);
