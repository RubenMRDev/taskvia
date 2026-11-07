// ================= Vistas =================
function renderMain() {
  const m = $('#main'), scroll = [m.scrollLeft, m.scrollTop];
  const bw = $('#main .board-wrap, #main .list-wrap'), boardScroll = bw && [bw.scrollLeft, bw.scrollTop];
  if (route.type === 'home') m.innerHTML = homeView();
  else if (route.type === 'trash') m.innerHTML = trashView();
  else if (route.type === 'project') m.innerHTML = projectView(proj(route.project));
  else if (route.type === 'board' && board) m.innerHTML = boardView();
  else if (route.type === 'page' && page) m.innerHTML = pageView();
  m.scrollLeft = scroll[0]; m.scrollTop = scroll[1];
  const nbw = $('#main .board-wrap, #main .list-wrap');
  if (boardScroll && nbw) [nbw.scrollLeft, nbw.scrollTop] = boardScroll;
  const ed = $('#main .rte');
  if (ed && page) ed._base = page.hash; // versión de la página que tiene delante el editor
  if (focusTitleNext) { focusTitleNext = false; const t = $('#main .title'); if (t) { t.focus(); document.getSelection().selectAllChildren(t); } }
}

const lrow = (it, meta = '') => `<div class="lrow" data-href="${href(it.route)}" data-kind="${it.route.type}" data-project="${esc(it.route.project)}"
  ${it.route.id ? `data-id="${it.route.id}"` : ''} ${it.route.path ? `data-path="${esc(it.route.path)}"` : ''}>
  <span class="em">${it.icon}</span><span class="nm">${esc(it.name)}</span><span class="meta">${meta}</span></div>`;

function homeView() {
  if (!tree.length) return `<div class="welcome">
    <img class="ws-logo" src="/icon.svg" alt="" width="56" height="56">
    <h1>Bienvenido a Taskvia</h1>
    <p>Cada proyecto guarda sus tableros de tareas y sus páginas de documentación, en tu disco. Tu asistente de IA puede leerlos y editarlos contigo.</p>
    <button class="btn primary" data-act="new-project">${icon('plus')}Crear el primer proyecto</button>
  </div>`;
  const recent = (store.get('recent') || []).map(resolveItem).filter(Boolean).slice(0, 6);
  return `<div class="doc pad"><div class="phead"><div class="big-emoji home-ic" aria-hidden="true">${icon('house')}</div><h1 class="title">Inicio</h1></div>
    ${recent.length ? `<div class="sect"><h2>Recientes</h2>${recent.map(it => lrow(it, esc(it.where))).join('')}</div>` : ''}
    <div class="sect"><h2>Proyectos</h2>
      ${tree.map(p => lrow({ route: { type: 'project', project: p.name }, icon: glyph(p.emoji), name: p.name },
        `${p.boards.length} ${p.boards.length === 1 ? 'tablero' : 'tableros'} · ${p.pages.length} ${p.pages.length === 1 ? 'página' : 'páginas'}`)).join('')}
      <button class="lrow add" data-act="new-project"><span class="em">${icon('plus')}</span><span class="nm">Nuevo proyecto</span></button>
    </div>${aiHint()}</div>`;
}

const aiHint = (p, b) => `<div class="hint">${icon('bot')}<div>Con la IA: pega una tarea de cualquier herramienta y di
  <b>«vamos con esto en el tablero ${esc(b?.name || 'Sprint')} de ${esc(p?.name || 'tu proyecto')}»</b>. La crea con su checklist, la va marcando mientras trabaja, deja notas de lo que hace y documenta en las páginas del proyecto.</div></div>`;

function projectView(p) {
  const top = pageTree(p.pages);
  return `<div class="doc pad"><div class="phead">
      <button class="big-emoji" data-act="emoji" data-target="project" title="Cambiar icono">${glyph(p.emoji)}</button>
      <h1 class="title" contenteditable="plaintext-only" spellcheck="false" data-edit="project-name" data-project="${esc(p.name)}" data-orig="${esc(p.name)}" data-ph="Proyecto sin título">${esc(p.name)}</h1>
    </div>
    <div class="sect"><h2>Tableros</h2>
      ${p.boards.map(b => {
        const pct = b.cards ? Math.round(b.done / b.cards * 100) : 0;
        return lrow({ route: { type: 'board', project: p.name, id: b.id }, icon: glyph(b.emoji || 'lucide:square-kanban:blue'), name: b.name },
          b.cards ? `<span class="mini-progress" title="${pct}% en la última columna"><i style="width:${pct}%"></i></span>${b.done}/${b.cards}` : 'Sin tarjetas');
      }).join('')}
      <button class="lrow add" data-act="new-board" data-project="${esc(p.name)}"><span class="em">${icon('plus')}</span><span class="nm">Nuevo tablero</span></button>
    </div>
    <div class="sect"><h2>Páginas</h2>
      ${top.map(n => lrow({ route: { type: 'page', project: p.name, path: n.path }, icon: n.icon ? glyph(n.icon) : icon('file-text'), name: n.name },
        n.children.length ? `${n.children.length} ${n.children.length === 1 ? 'subpágina' : 'subpáginas'}` : '')).join('')}
      <button class="lrow add" data-act="new-page" data-project="${esc(p.name)}"><span class="em">${icon('plus')}</span><span class="nm">Nueva página</span></button>
    </div>
    ${aiHint(p, p.boards[0])}</div>`;
}

const labelChips = (b, ids) => ids.map(id => b.labels.find(l => l.id === id)).filter(Boolean)
  .map(l => `<span class="tag c-${l.color}">${esc(l.name)}</span>`).join('');

function cardHTML(c) {
  const done = c.checklist.filter(i => i.done).length, all = c.checklist.length;
  const coverImg = String(c.cover).startsWith('img:') && (c.attachments ?? []).find(a => 'img:' + a.id === c.cover);
  const meta = [
    c.template ? `<span class="tpl">${icon('layout-template', 'sm')}Plantilla</span>` : '',
    dueBadge(c),
    c.description ? `<span title="Tiene descripción">${icon('text-align-start', 'sm')}</span>` : '',
    all ? `<span class="${done === all ? 'done' : ''}" title="Checklist">${icon('list-checks', 'sm')}${done}/${all}</span>` : '',
    c.docs.length ? `<span title="${esc(c.docs.join(', '))}">${icon('file-text', 'sm')}${c.docs.length}</span>` : '',
    c.notes?.length ? `<span title="Notas">${icon('message-square-text', 'sm')}${c.notes.length}</span>` : '',
    c.attachments?.length ? `<span title="Adjuntos">${icon('paperclip', 'sm')}${c.attachments.length}</span>` : '',
  ].join('');
  return `<article class="card" draggable="true" tabindex="0" data-card="${c.id}" data-kind="card" data-id="${c.id}">
    ${coverImg ? `<div class="cover-img"><img src="${assetUrl(route.project, coverImg.file)}" alt="" loading="lazy" draggable="false"></div>` : c.cover && !coverImg ? `<div class="cover c-${c.cover}"></div>` : ''}
    <div class="card-body">
      ${c.labels.length ? `<div class="labels">${labelChips(board, c.labels)}</div>` : ''}
      <div class="card-title">${c.emoji ? `<span class="em">${glyph(c.emoji)}</span>` : ''}${esc(c.title)}</div>
      ${meta ? `<div class="card-meta">${meta}</div>` : ''}
    </div></article>`;
}

// ---------- Tablero (vistas tablero, lista y calendario) ----------
const DUE_FILTERS = { over: 'Vencidas', week: 'Vencen en 7 días', none: 'Sin fecha', done: 'Completadas' };
let boardFilter = '';
const viewMode = id => (store.get('views') || {})[id] || 'board';
let dueFilter = ''; // '', 'over', 'week', 'none', 'done'
function cardVisible(b, c) {
  const q = boardFilter.toLowerCase();
  if (labelFilter.size && !c.labels.some(id => labelFilter.has(id))) return false;
  if (dueFilter) {
    const st = dueState(c);
    if (dueFilter === 'none' ? c.due : dueFilter === 'done' ? st !== 'done'
      : dueFilter === 'over' ? st !== 'over' : !(c.due && !c.dueDone && toDate(c.due) - Date.now() < 7 * 864e5)) return false;
  }
  return !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    || c.labels.some(id => b.labels.find(l => l.id === id)?.name.toLowerCase().includes(q));
}

function boardView() {
  const b = board, live = b.cards.filter(c => !c.archived), archived = b.cards.length - live.length;
  const last = b.columns.at(-1), mode = viewMode(b.id);
  const overdue = live.filter(c => dueState(c) === 'over').length;
  const filtering = boardFilter || labelFilter.size || dueFilter;
  return `<div class="board-view ${b.background ? 'has-bg c-' + b.background : ''}"><div class="board-head pad phead">
      <button class="big-emoji" data-act="emoji" data-target="board" title="Cambiar icono">${glyph(b.emoji || 'lucide:square-kanban:blue')}</button>
      <h1 class="title" contenteditable="plaintext-only" spellcheck="false" data-edit="board-name" data-project="${esc(route.project)}" data-id="${b.id}" data-orig="${esc(b.name)}" data-ph="Tablero sin título">${esc(b.name)}</h1>
      <div class="bar">
        <div class="view-tabs" role="tablist">
          <button class="view-tab ${mode === 'board' ? 'on' : ''}" role="tab" aria-selected="${mode === 'board'}" data-act="view-mode" data-mode="board">${icon('kanban')}Tablero</button>
          <button class="view-tab ${mode === 'list' ? 'on' : ''}" role="tab" aria-selected="${mode === 'list'}" data-act="view-mode" data-mode="list">${icon('rows-3')}Lista</button>
          <button class="view-tab ${mode === 'calendar' ? 'on' : ''}" role="tab" aria-selected="${mode === 'calendar'}" data-act="view-mode" data-mode="calendar">${icon('calendar-days')}Calendario</button>
        </div>
        <span class="meta">${live.length} ${live.length === 1 ? 'tarjeta' : 'tarjetas'}${overdue ? ` · ${overdue} ${overdue === 1 ? 'vencida' : 'vencidas'}` : ''}</span>
        <span class="grow"></span>
        <label class="filter">${icon('search', 'sm')}<input id="board-filter" placeholder="Filtrar tarjetas" value="${esc(boardFilter)}"></label>
        <button class="btn ghost ${labelFilter.size || dueFilter ? 'active' : ''}" data-act="label-filter">${icon('list-filter', 'sm')}${labelFilter.size + (dueFilter ? 1 : 0) ? `Filtro · ${labelFilter.size + (dueFilter ? 1 : 0)}` : 'Filtro'}</button>
        ${archived ? `<button class="btn ghost" data-act="archived">${icon('archive', 'sm')}Archivo · ${archived}</button>` : ''}
        <button class="btn primary" data-act="new-card-top">${icon('plus', 'sm')}Nueva</button>
      </div>
      ${labelFilter.size || dueFilter ? `<div class="filter-chips">${dueFilter ? `<button class="tag c-gray" data-act="unfilter-due" title="Quitar filtro">${icon('clock', 'sm')}${DUE_FILTERS[dueFilter]}${icon('x', 'sm')}</button>` : ''}${[...labelFilter].map(id => b.labels.find(l => l.id === id)).filter(Boolean)
        .map(l => `<button class="tag c-${l.color}" data-act="unfilter-label" data-label="${l.id}" title="Quitar filtro">${esc(l.name)}${icon('x', 'sm')}</button>`).join('')}
        <button class="btn ghost" data-act="clear-filters">Quitar filtros</button></div>` : ''}
    </div>
    ${mode === 'list' ? listView(b, live, filtering) : mode === 'calendar' ? calendarView(b, live) : `<div class="board-wrap"><div class="board pad">
      ${b.columns.map(col => {
        const cards = live.filter(c => c.columnId === col.id), shown = cards.filter(c => cardVisible(b, c));
        if (col.collapsed) return `<section class="col collapsed c-${col.color}" data-col="${col.id}">
          <button class="col-expand" data-act="col-expand" title="Desplegar «${esc(col.name)}»">${icon('unfold-horizontal', 'sm')}<span class="vname">${esc(col.name)}</span><span class="ct">${cards.length}</span></button></section>`;
        return `<section class="col c-${col.color}" data-col="${col.id}">
          <header class="col-head" draggable="true" title="Arrastra el encabezado para mover la columna">
            <span class="tag" data-act="col-rename" title="Clic para renombrar">${esc(col.name)}</span>
            <span class="ct">${filtering ? `${shown.length}/${cards.length}` : cards.length}</span><span class="grow"></span>
            <button class="ib" data-act="col-menu" title="Opciones de la columna">${icon('ellipsis')}</button>
            <button class="ib" data-act="col-add" title="Nueva tarjeta en ${esc(col.name)}">${icon('plus')}</button>
          </header>
          <div class="cards">${shown.map(cardHTML).join('')}</div>
          <div class="col-foot"><button class="add-card" data-act="col-add">${icon('plus', 'sm')}Nueva tarjeta</button>
            ${b.cards.some(c => c.template && !c.archived) ? `<button class="ib" data-act="col-template" title="Crear desde plantilla">${icon('layout-template', 'sm')}</button>` : ''}</div>
        </section>`;
      }).join('')}
      <button class="add-col" data-act="add-col">${icon('plus', 'sm')}Añadir columna</button>
    </div></div>`}</div>`;
}

function listView(b, live, filtering) {
  const rows = b.columns.flatMap(col => live.filter(c => c.columnId === col.id && cardVisible(b, c)).map(c => ({ c, col })));
  return `<div class="list-wrap pad"><table class="cards-table">
    <thead><tr><th>Tarjeta</th><th>Estado</th><th>Etiquetas</th><th>Vence</th><th>Checklist</th><th>Páginas</th><th>Actualizada</th></tr></thead>
    <tbody>${rows.map(({ c, col }) => {
      const done = c.checklist.filter(i => i.done).length, all = c.checklist.length;
      return `<tr class="card-row ${c.id === peekId ? 'sel' : ''}" tabindex="0" data-card="${c.id}" data-kind="card" data-id="${c.id}">
        <td class="t">${c.emoji ? `<span class="em">${glyph(c.emoji)}</span>` : ''}${esc(c.title)}</td>
        <td><span class="tag c-${col.color}"><span class="dot"></span>${esc(col.name)}</span></td>
        <td><div class="labels">${labelChips(b, c.labels)}</div></td>
        <td>${c.due ? dueBadge({ ...c, start: null }) : ''}</td>
        <td class="num ${all && done === all ? 'done' : ''}">${all ? `${done}/${all}` : ''}</td>
        <td class="num">${c.docs.length || ''}</td>
        <td class="muted" title="${new Date(c.updatedAt).toLocaleString('es-ES')}">${ago(c.updatedAt)}</td></tr>`;
    }).join('') || `<tr><td colspan="7" class="list-empty">${filtering ? 'Ninguna tarjeta coincide con el filtro.' : 'Aún no hay tarjetas. Crea la primera con «Nueva».'}</td></tr>`}</tbody>
  </table></div>`;
}

// ---------- Página ----------
function pageView() {
  const p = proj(route.project);
  const name = page.path.split('/').at(-1);
  const fromCards = backrefs.filter(r => r.card), fromPages = backrefs.filter(r => r.page);
  return `<div class="doc pad">
    <div class="phead">
      <div class="head-acts">${page.icon ? '' : `<button class="btn ghost" data-act="emoji" data-target="page">${icon('face-slightly-smiling-plus', 'sm')}Añadir icono</button>`}</div>
      ${page.icon ? `<button class="big-emoji" data-act="emoji" data-target="page" title="Cambiar icono">${glyph(page.icon)}</button>` : ''}
      <h1 class="title" contenteditable="plaintext-only" spellcheck="false" data-edit="page-title" data-project="${esc(route.project)}" data-id="${esc(page.path)}" data-orig="${esc(name)}" data-ph="Sin título">${esc(name)}</h1>
    </div>
    ${rteBar('page')}<div class="conflict-slot"></div><div class="md doc-body rte ${page.content.trim() ? '' : 'empty'}" contenteditable="true" spellcheck="true" data-rte="page" data-project="${esc(route.project)}" data-path="${esc(page.path)}" data-ph="Escribe aquí… pulsa / para insertar bloques y subpáginas, o [[ para enlazar otra página">${rteHTML(page.content, route.project)}</div>
    ${backrefs.length ? `<div class="sect"><h2>Enlazada desde</h2>
      ${fromCards.map(r => `<div class="lrow" data-act="open-card" data-board="${r.board.id}" data-card="${r.card.id}">
        <span class="em">${glyph(r.card.emoji || r.board.emoji || 'lucide:square-kanban:blue')}</span><span class="nm">${esc(r.card.title)}</span><span class="meta">Tarjeta · ${esc(r.board.name)}</span></div>`).join('')}
      ${fromPages.map(r => lrow({ route: { type: 'page', project: p.name, path: r.page.path }, icon: r.page.icon ? glyph(r.page.icon) : icon('file-text'), name: r.page.path.split('/').at(-1) }, 'Página')).join('')}
    </div>` : ''}
  </div>`;
}

// ---------- Papelera ----------
const TRASH_KIND = { project: ['folder', 'Proyecto'], board: ['kanban', 'Tablero'], page: ['file-text', 'Página'], card: ['square-check', 'Tarjeta'] };
function trashView() {
  return `<div class="doc pad"><div class="phead"><div class="big-emoji home-ic" aria-hidden="true">${icon('trash')}</div><h1 class="title">Papelera</h1></div>
    <p class="lead">Lo que borras se queda aquí 30 días. Después se elimina solo.</p>
    ${trash.length ? `<div class="sect trash-list"><h2>${trash.length} ${trash.length === 1 ? 'elemento' : 'elementos'}<button class="btn danger" data-act="empty-trash">${icon('trash', 'sm')}Vaciar papelera</button></h2>
      ${trash.map(t => {
        const [ic, kind] = TRASH_KIND[t.kind] || ['file', t.kind];
        const where = [t.project, t.boardName].filter(Boolean).join(' / ');
        return `<div class="lrow trash-row" data-trash="${t.id}">
          <span class="em">${icon(ic)}</span>
          <span class="nm">${esc(t.title)}<small>${kind}${where ? ' · ' + esc(where) : ''} · borrado ${ago(t.deletedAt)} por ${who(t.by)}</small></span>
          <button class="btn ghost" data-act="restore-trash">${icon('rotate-ccw', 'sm')}Restaurar</button>
          <button class="ib danger" data-act="purge-trash" title="Eliminar para siempre" aria-label="Eliminar para siempre">${icon('x', 'sm')}</button></div>`;
      }).join('')}</div>` : `<div class="empty-state">${icon('trash')}<p>La papelera está vacía.</p></div>`}
  </div>`;
}

// ---------- Edición de la página en markdown crudo ----------
let saveTimer = null, pageDirty = false;
function startPageEdit() {
  const body = $('#main .doc-body');
  if (!body) return;
  flushRte();
  const ta = document.createElement('textarea');
  ta.className = 'editor'; ta.value = page.content; ta.spellcheck = false; ta.id = 'page-editor';
  ta.dataset.project = route.project; ta.dataset.path = page.path; // se guarda siempre en su página, aunque cambie la ruta
  ta.placeholder = '# Título\n\nEscribe en markdown…';
  body.replaceWith(ta); ta.focus();
  $('#main .rte-bar')?.remove();
  $('#status').textContent = 'Markdown · se guarda solo';
}
async function savePage() {
  const ta = $('#page-editor');
  if (!ta || !pageDirty) return;
  pageDirty = false; clearTimeout(saveTimer);
  const { project, path } = ta.dataset, content = ta.value;
  const r = await call('writePage', project, path, { content });
  if (page && route.project === project && page.path === path) { page.content = content; page.exists = true; page.hash = r.hash; }
  $('#status').textContent = 'Guardado';
}
document.addEventListener('input', e => {
  if (e.target.id === 'page-editor') {
    pageDirty = true; $('#status').textContent = 'Guardando…';
    clearTimeout(saveTimer); saveTimer = setTimeout(savePage, 600);
  }
  if (e.target.id === 'board-filter') { boardFilter = e.target.value; const pos = e.target.selectionStart; renderMain(); const f = $('#board-filter'); f.focus(); f.setSelectionRange(pos, pos); }
});
document.addEventListener('focusout', async e => {
  if (e.target.id === 'page-editor') {
    await savePage();
    setTimeout(() => { if (!editingIn($('#main'))) { $('#status').textContent = ''; renderMain(); } }, 0);
  }
});

// ---------- Títulos editables en línea ----------
// Cada título lleva qué edita (data-project / data-id / data-orig): al perder el foco puede que la ruta ya sea otra.
async function commitTitle(el) {
  const v = el.textContent.trim(), { edit: kind, project, id, orig } = el.dataset;
  if (!v || v === orig) { el.textContent = orig; return; }
  try {
    if (kind === 'project-name') {
      const r = await call('updateProject', project, { name: v });
      collapsedProjects.delete(project);
      applySettings(await call('getSettings')); // favoritos y orden siguen al nuevo nombre
      if (route.project === project) go({ ...route, project: r.name }, true); else sync(true);
    } else if (kind === 'board-name') {
      await act('updateBoard', project, id, { name: v });
    } else if (kind === 'page-title') {
      const parent = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) + '/' : '';
      const r = await call('renamePage', project, id, parent + v);
      const pre = `${project}/${id}`;
      [...expanded].forEach(k => { if (k === pre || k.startsWith(pre + '/')) { expanded.delete(k); expanded.add(`${project}/${r.path}${k.slice(pre.length)}`); } });
      store.set('expanded', [...expanded]);
      applySettings(await call('getSettings'));
      if (route.type === 'page' && route.project === project && (route.path === id || route.path.startsWith(id + '/')))
        go({ type: 'page', project, path: r.path + route.path.slice(id.length) }, true);
      else sync(true);
    } else if (kind === 'card-title') {
      await act('updateCard', id, { title: v });
    }
  } catch { el.textContent = orig; await sync(true); }
}
document.addEventListener('keydown', e => {
  const el = e.target.closest?.('[data-edit]');
  if (!el) return;
  if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
  if (e.key === 'Escape') { e.stopPropagation(); el.dataset.cancel = '1'; el.blur(); }
}, true);
document.addEventListener('focusout', e => {
  const el = e.target.closest?.('[data-edit]');
  if (!el) return;
  if (el.dataset.cancel) { delete el.dataset.cancel; sync(true); return; }
  commitTitle(el);
});
