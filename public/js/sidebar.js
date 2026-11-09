// ================= Barra lateral =================
function pageTree(pages) {
  const root = [], map = {};
  for (const pg of pages) {
    const node = { ...pg, name: pg.path.split('/').at(-1), children: [] };
    map[pg.path] = node;
    const i = pg.path.lastIndexOf('/');
    (i < 0 ? root : map[pg.path.slice(0, i)]?.children ?? root).push(node);
  }
  return root;
}

// Favorito o reciente → { route, icon, name, where } con lo que hay ahora (o null si ya no existe)
function resolveItem(r) {
  const p = proj(r.project);
  if (!p) return null;
  if (r.type === 'project' || r.kind === 'project') return { route: { type: 'project', project: p.name }, icon: glyph(p.emoji), name: p.name, where: '' };
  if (r.type === 'board' || r.kind === 'board') {
    const b = p.boards.find(x => x.id === r.id);
    return b && { route: { type: 'board', project: p.name, id: b.id }, icon: b.emoji ? glyph(b.emoji) : icon('kanban'), name: b.name, where: p.name };
  }
  const pg = p.pages.find(x => x.path === r.path);
  return pg && { route: { type: 'page', project: p.name, path: pg.path }, icon: pg.icon ? glyph(pg.icon) : icon('file-text'), name: pg.path.split('/').at(-1), where: p.name };
}
const isFavorite = r => (settings.favorites || []).some(f => f.project === r.project && f.kind === r.type
  && (r.type !== 'board' || f.id === r.id) && (r.type !== 'page' || f.path === r.path));
async function toggleFavorite(r) {
  const on = !isFavorite(r);
  settings.favorites = await call('setFavorite', { kind: r.type, project: r.project, id: r.id, path: r.path }, on);
  toast(on ? 'Añadido a favoritos' : 'Quitado de favoritos');
  renderSidebar(); renderCrumbs();
}

function renderSidebar() {
  // Abrir los padres de lo que se está viendo
  if (route.project) collapsedProjects.delete(route.project);
  if (route.type === 'page') { const s = route.path.split('/'); for (let i = 1; i < s.length; i++) expanded.add(`${route.project}/${s.slice(0, i).join('/')}`); }

  const isSel = r => href(r) === href(route);
  const MENU = `<button class="ib" data-act="row-menu" title="Más opciones">${icon('ellipsis', 'sm')}</button>`;
  const pageRows = (p, nodes, lvl) => nodes.map(n => {
    const key = `${p.name}/${n.path}`, open = expanded.has(key), r = { type: 'page', project: p.name, path: n.path };
    return `<div class="row ${isSel(r) ? 'sel' : ''} ${open ? 'open' : ''}" style="--lvl:${lvl}" data-href="${href(r)}" title="${esc(n.path)}" data-kind="page" data-project="${esc(p.name)}" data-path="${esc(n.path)}">
      <button class="tw ${n.children.length ? '' : 'leaf'}" data-act="toggle-page" data-key="${esc(key)}" aria-label="Desplegar">${icon('chevron-right', 'sm')}</button>
      <span class="em">${n.icon ? glyph(n.icon) : icon('file-text')}</span>
      <span class="nm">${esc(n.name)}</span>${n.aiEditing ? `<span class="ai-busy" title="La IA está editando esta página">${icon('bot', 'sm')}</span>` : ''}
      <span class="acts">${MENU}<button class="ib" data-act="new-subpage" data-project="${esc(p.name)}" data-path="${esc(n.path)}" title="Añadir subpágina">${icon('plus', 'sm')}</button></span>
    </div>${open ? pageRows(p, n.children, lvl + 1) : ''}`;
  }).join('');

  const favs = (settings.favorites || []).map(f => ({ f, it: resolveItem(f) })).filter(x => x.it);
  $('#favs').hidden = !favs.length;
  $('#fav-list').innerHTML = favs.map(({ f, it }) => `<div class="row ${isSel(it.route) ? 'sel' : ''}" data-href="${href(it.route)}" title="${esc(it.where ? it.where + ' / ' + it.name : it.name)}"
      data-kind="${f.kind}" data-project="${esc(f.project)}" ${f.id ? `data-id="${f.id}"` : ''} ${f.path ? `data-path="${esc(f.path)}"` : ''}>
      <span class="tw leaf"></span><span class="em">${it.icon}</span><span class="nm">${esc(it.name)}</span><span class="acts">${MENU}</span></div>`).join('');

  $('#tree').innerHTML = tree.length ? tree.map(p => {
    const open = !collapsedProjects.has(p.name), r = { type: 'project', project: p.name };
    return `<div class="row proj ${isSel(r) ? 'sel' : ''} ${open ? 'open' : ''}" data-href="${href(r)}" data-kind="project" data-project="${esc(p.name)}" draggable="true" title="Arrastra para reordenar">
        <button class="tw" data-act="toggle-project" data-project="${esc(p.name)}" aria-label="Desplegar">${icon('chevron-right', 'sm')}</button>
        <span class="em">${glyph(p.emoji)}</span><span class="nm">${esc(p.name)}</span>
        <span class="acts">${MENU}<button class="ib" data-act="project-add" data-project="${esc(p.name)}" title="Nuevo tablero o página">${icon('plus', 'sm')}</button></span>
      </div>
      ${open ? p.boards.map(b => {
        const br = { type: 'board', project: p.name, id: b.id };
        return `<div class="row ${isSel(br) ? 'sel' : ''}" style="--lvl:1" data-href="${href(br)}" data-kind="board" data-project="${esc(p.name)}" data-id="${b.id}">
          <span class="tw leaf"></span><span class="em">${b.emoji ? glyph(b.emoji) : icon('kanban')}</span>
          <span class="nm">${esc(b.name)}</span><span class="ct">${b.cards || ''}</span><span class="acts">${MENU}</span></div>`;
      }).join('') + pageRows(p, pageTree(p.pages), 1)
        + (!p.boards.length && !p.pages.length ? `<div class="row muted" style="--lvl:1" data-act="project-add" data-project="${esc(p.name)}"><span class="tw leaf"></span><span class="em">${icon('plus', 'sm')}</span><span class="nm">Añade un tablero o página</span></div>` : '')
        : ''}`;
  }).join('') : '<div class="sb-empty">Aún no hay proyectos.</div>';
  $('#sb [data-act="trash"]').classList.toggle('sel', route.type === 'trash');
}

$('#sb').addEventListener('click', e => {
  const a = e.target.closest('[data-act]');
  if (a?.dataset.act === 'toggle-project') {
    e.stopPropagation();
    const n = a.dataset.project;
    collapsedProjects.has(n) ? collapsedProjects.delete(n) : collapsedProjects.add(n);
    store.set('collapsed', [...collapsedProjects]);
    renderSidebar(); return;
  }
  if (a?.dataset.act === 'toggle-page') {
    e.stopPropagation();
    const k = a.dataset.key;
    expanded.has(k) ? expanded.delete(k) : expanded.add(k);
    store.set('expanded', [...expanded]);
    renderSidebar(); return;
  }
  if (a) return; // los demás data-act los gestiona el manejador global
  const row = e.target.closest('.row[data-href]');
  if (row) location.hash = row.dataset.href;
});

// Reordenar proyectos arrastrándolos
let dragProject = null;
$('#tree').addEventListener('dragstart', e => {
  const row = e.target.closest?.('.row.proj');
  if (!row) return;
  dragProject = row.dataset.project;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragProject);
});
$('#tree').addEventListener('dragover', e => {
  if (!dragProject) return;
  const row = e.target.closest('.row.proj');
  if (!row) return;
  e.preventDefault();
  const r = row.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
  $$('#tree .drop-before, #tree .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
  row.classList.add(after ? 'drop-after' : 'drop-before');
});
$('#tree').addEventListener('drop', async e => {
  const row = $('#tree .drop-before, #tree .drop-after');
  if (!dragProject || !row) return;
  e.preventDefault();
  const names = tree.map(p => p.name).filter(n => n !== dragProject);
  let i = names.indexOf(row.dataset.project);
  if (row.classList.contains('drop-after')) i++;
  names.splice(i < 0 ? names.length : i, 0, dragProject);
  dragProject = null;
  $$('#tree .drop-before, #tree .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
  await act('setProjectOrder', names);
});
$('#tree').addEventListener('dragend', () => {
  dragProject = null;
  $$('#tree .drop-before, #tree .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
});

// Ancho de la barra lateral: se arrastra su borde derecho (doble clic vuelve al de serie)
const SB_MIN = 200, SB_MAX = 420, SB_DEFAULT = 248;
const setSidebarWidth = w => document.body.style.setProperty('--sbw', Math.round(Math.min(SB_MAX, Math.max(SB_MIN, w))) + 'px');
setSidebarWidth(store.get('sidebarWidth') || SB_DEFAULT);
$('#sb-resize').addEventListener('pointerdown', e => {
  e.preventDefault();
  const handle = e.currentTarget;
  handle.setPointerCapture(e.pointerId);
  document.body.classList.add('resizing');
  const move = ev => setSidebarWidth(ev.clientX);
  const up = () => {
    handle.removeEventListener('pointermove', move);
    document.body.classList.remove('resizing');
    store.set('sidebarWidth', parseInt(getComputedStyle(document.body).getPropertyValue('--sbw')));
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('lostpointercapture', up, { once: true });
});
$('#sb-resize').addEventListener('dblclick', () => { setSidebarWidth(SB_DEFAULT); store.set('sidebarWidth', SB_DEFAULT); });

// ================= Migas y menú de la vista =================
function renderCrumbs() {
  const p = proj(route.project);
  const items = [];
  if (route.type === 'trash') items.push(`<a href="#/papelera">${icon('trash', 'sm')}Papelera</a>`);
  else if (route.type === 'home' || !p) items.push(`<a href="#/">${icon('house', 'sm')}Inicio</a>`);
  else {
    items.push(`<a href="${href({ type: 'project', project: p.name })}">${glyph(p.emoji)} ${esc(p.name)}</a>`);
    if (route.type === 'board' && board) items.push(`<a href="${href(route)}">${glyph(board.emoji || 'lucide:square-kanban:blue')} ${esc(board.name)}</a>`);
    if (route.type === 'page') {
      const s = route.path.split('/');
      s.forEach((seg, i) => {
        const path = s.slice(0, i + 1).join('/'), pg = p.pages.find(x => x.path === path);
        items.push(`<a href="${href({ type: 'page', project: p.name, path })}">${pg?.icon ? glyph(pg.icon) + ' ' : ''}${esc(seg)}</a>`);
      });
    }
  }
  $('#crumbs').innerHTML = items.join('<span class="sep">/</span>');
  const favable = ['project', 'board', 'page'].includes(route.type);
  $('#view-menu').hidden = !favable;
  $('#fav-btn').hidden = !favable;
  if (favable) {
    const on = isFavorite(route);
    $('#fav-btn').classList.toggle('on', on);
    $('#fav-btn').title = on ? 'Quitar de favoritos' : 'Añadir a favoritos';
    $('#fav-btn').setAttribute('aria-pressed', on);
  }
}
