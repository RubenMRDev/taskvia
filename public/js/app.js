// ================= Crear cosas (sin prompt(): Electron no lo tiene) =================
async function newProject() {
  const name = uniqueName('Proyecto sin título', tree.map(p => p.name));
  await call('createProject', { name });
  focusTitleNext = true;
  go({ type: 'project', project: name });
}
// Plantillas de «Nuevo tablero»: columnas y etiquetas con las que nace (Vacío = sin nada, lo montas tú)
const BOARD_TEMPLATES = [
  { id: 'empty', name: 'Vacío', desc: 'Sin columnas ni etiquetas.', icon: 'square-dashed', columns: [], labels: [] },
  { id: 'todo', name: 'Tareas', desc: 'Por hacer, en curso y hecho.', icon: 'list-todo', columns: ['Por hacer', 'En curso', 'Hecho'], labels: [] },
  { id: 'size', name: 'Tareas con tamaño', desc: 'Etiquetas para lo que cuesta cada tarea.', icon: 'ruler', columns: ['Por hacer', 'En curso', 'Hecho'],
    labels: [['Pequeña', 'green'], ['Mediana', 'yellow'], ['Grande', 'red']] },
  { id: 'sprint', name: 'Sprint', desc: 'Del backlog a hecho, pasando por revisión.', icon: 'rocket', columns: ['Backlog', 'Por hacer', 'En curso', 'En revisión', 'Hecho'],
    labels: [['Bug', 'red'], ['Mejora', 'blue'], ['Urgente', 'orange']] },
  { id: 'content', name: 'Contenido', desc: 'De la idea a publicado.', icon: 'pen-line', columns: ['Ideas', 'Escribiendo', 'Revisión', 'Publicado'],
    labels: [['Blog', 'purple'], ['Redes', 'pink'], ['Vídeo', 'orange']] },
];
const PREVIEW_COLORS = ['gray', 'blue', 'green', 'orange', 'purple'];
let nbProject = null, nbTemplate = 'todo';
function drawTemplates() {
  $('#nb-templates').innerHTML = BOARD_TEMPLATES.map(t => `<button type="button" class="nb-tpl ${t.id === nbTemplate ? 'on' : ''}" role="radio" aria-checked="${t.id === nbTemplate}" data-tpl="${t.id}">
    <span class="nb-prev">${t.columns.length ? t.columns.map((_, i) => `<i class="c-${PREVIEW_COLORS[i % PREVIEW_COLORS.length]}" style="height:${[70, 50, 34, 58, 42][i]}%"></i>`).join('') : icon('plus')}</span>
    <b>${icon(t.icon, 'sm')}${t.name}</b><span class="muted">${t.desc}</span>
    ${t.labels.length ? `<span class="labels">${t.labels.map(([n, c]) => `<span class="tag c-${c}">${n}</span>`).join('')}</span>` : ''}</button>`).join('');
}
function newBoard(project) {
  nbProject = project;
  $('#nb-name').value = uniqueName('Tablero sin título', proj(project).boards.map(b => b.name));
  drawTemplates();
  $('#new-board').showModal();
  $('#nb-name').select();
}
$('#nb-templates').addEventListener('click', e => { const b = e.target.closest('[data-tpl]'); if (b) { nbTemplate = b.dataset.tpl; drawTemplates(); } });
$('#nb-templates').addEventListener('dblclick', e => { if (e.target.closest('[data-tpl]')) $('#new-board form').requestSubmit(); });
$('#new-board').addEventListener('click', e => { if (e.target.id === 'new-board' || e.target.closest('[data-close]')) $('#new-board').close(); });
$('#new-board form').addEventListener('submit', async () => {
  const t = BOARD_TEMPLATES.find(x => x.id === nbTemplate), project = nbProject;
  const p = proj(project), name = $('#nb-name').value.trim() || uniqueName('Tablero sin título', p.boards.map(b => b.name));
  const b = await call('createBoard', project, { name, columns: t.columns, labels: t.labels.map(([n, color]) => ({ name: n, color })) });
  collapsedProjects.delete(project);
  go({ type: 'board', project, id: b.id });
});
async function newPage(project, parent = '') {
  await flushRte(); // lo que estabas escribiendo en la página padre se guarda antes de añadirle el enlace
  const r = await call('createPage', project, { parent, linkInParent: !!parent });
  if (parent) expanded.add(`${project}/${parent}`);
  collapsedProjects.delete(project);
  focusTitleNext = true;
  go({ type: 'page', project, path: r.path });
}

// ================= Buscador (Ctrl+K) =================
const F = $('#finder');
let finderItems = [], finderSel = 0, finderTimer;
function openFinder() { $('#finder-q').value = ''; F.showModal(); $('#finder-q').focus(); runFinder(); }
async function runFinder() {
  finderItems = await call('quickFind', $('#finder-q').value);
  finderSel = 0; drawFinder();
}
function drawFinder() {
  const typeIcon = { board: 'kanban', page: 'file-text', card: 'square-check' };
  $('#finder-list').innerHTML = finderItems.length ? finderItems.map((it, i) => `<button class="opt ${i === finderSel ? 'kb' : ''}" data-i="${i}">
    <span class="em">${it.emoji ? glyph(it.emoji) : icon(typeIcon[it.type], 'sm')}</span>
    <span class="grow">${esc(it.title)}<br><span class="sub">${esc(it.project)}${it.type === 'card' ? ' / ' + esc(it.boardName) : it.type === 'page' && it.path.includes('/') ? ' / ' + esc(it.path.slice(0, it.path.lastIndexOf('/'))) : ''} · ${{ board: 'Tablero', page: 'Página', card: 'Tarjeta' }[it.type]}</span></span>
  </button>`).join('') : `<div class="finder-empty">${tree.length ? 'Nada coincide con esa búsqueda.' : 'Crea un proyecto para empezar.'}</div>`;
  $('#finder-list .kb')?.scrollIntoView({ block: 'nearest' });
}
function pickFinder(i) {
  const it = finderItems[i];
  if (!it) return;
  F.close();
  if (it.type === 'board') go({ type: 'board', project: it.project, id: it.id });
  if (it.type === 'page') go({ type: 'page', project: it.project, path: it.path });
  if (it.type === 'card') openCardAt(it.project, it.board, it.id);
}
async function openCardAt(project, boardId, cardId) {
  const r = { type: 'board', project, id: boardId };
  if (href(r) !== href(route)) { history.pushState(null, '', href(r)); await onRoute(); }
  openPeek(cardId);
}
$('#finder-q').addEventListener('input', () => { clearTimeout(finderTimer); finderTimer = setTimeout(runFinder, 120); });
$('#finder-q').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); finderSel = (finderSel + (e.key === 'ArrowDown' ? 1 : -1) + finderItems.length) % Math.max(1, finderItems.length); drawFinder(); }
  if (e.key === 'Enter') { e.preventDefault(); pickFinder(finderSel); }
});
$('#finder-list').addEventListener('click', e => { const o = e.target.closest('[data-i]'); if (o) pickFinder(+o.dataset.i); });
F.addEventListener('click', e => { if (e.target === F) F.close(); });

// ================= Acciones (un solo manejador para todo data-act) =================
document.addEventListener('click', async e => {
  if (e.target.closest('#pop, #finder')) return;
  const a = e.target.closest('[data-act]');
  const nav = e.target.closest('[data-href]');
  if (!a && nav && !nav.closest('#sb')) { location.hash = nav.dataset.href; return; }
  if (!a) {
    const card = e.target.closest('#main .card, #main .card-row, #main .cal-card');
    if (card) return openPeek(card.dataset.card);
    if (!$('#peek').hidden && !e.target.closest('#peek') && e.target.closest('#main')) closePeek();
    return;
  }
  const act_ = a.dataset.act, c = currentCard();
  switch (act_) {
    case 'sidebar': toggleSidebar(); break;
    case 'find': openFinder(); break;
    case 'home': go({ type: 'home' }); break;
    case 'back': history.back(); break;
    case 'forward': history.forward(); break;
    case 'new-project': newProject(); break;
    case 'new-board': newBoard(a.dataset.project); break;
    case 'new-page': newPage(a.dataset.project); break;
    case 'new-subpage': e.stopPropagation(); newPage(a.dataset.project, a.dataset.path); break;
    case 'project-add': e.stopPropagation(); projectAddMenu(a, a.dataset.project); break;
    case 'view-menu': viewMenu(a); break;
    case 'emoji': {
      const t = a.dataset.target, d = { project: route.project, id: t === 'board' ? board.id : c?.id, path: page?.path };
      emojiPicker(a, iconOf(t, d), v => setIcon(t, d, v));
      break;
    }
    case 'row-menu': e.stopPropagation(); itemMenu(a, a.closest('[data-kind]').dataset); break;
    case 'settings': openSettings(); break;
    case 'raw-md': startPageEdit(); break;
    case 'new-card-top': if (board.columns[0]) openComposer(board.columns[0].id, true); break;
    case 'col-add': openComposer(colOf(a)); break;
    case 'col-menu': columnMenu(a); break;
    case 'col-rename': renameColumn(a); break;
    case 'add-col': addColumnInline(a); break;
    case 'labels-manage': labelsManager(a); break;
    case 'open-card': openCardAt(route.project, a.dataset.board, a.dataset.card); break;
    case 'peek-close': closePeek(); break;
    case 'card-status': statusPicker(a); break;
    case 'card-labels': labelPicker(a); break;
    case 'card-docs': if (!e.target.closest('.page-chip')) docsPicker(a); else go({ type: 'page', project: route.project, path: e.target.closest('.page-chip').dataset.path }); break;
    case 'open-page': go({ type: 'page', project: route.project, path: a.dataset.path }); break;
    case 'card-cover': coverPicker(a); break;
    case 'item-del': act('updateChecklistItem', c.id, a.closest('[data-item]').dataset.item, { remove: true }); break;
    case 'card-delete': deleteItem('card', { id: c.id }); break;
    case 'card-archive': archiveWithUndo(c.id, !c.archived); break;
    case 'card-menu': itemMenu(a, { kind: 'card', id: c.id }); break;
    case 'card-template': act('updateCard', c.id, { template: false }); break;
    case 'card-dates': datesPicker(a, c); break;
    case 'attach-file': pickAttachments(c.id); break;
    case 'attach-link': linkAttachPrompt(a, c.id); break;
    case 'att-open': openAttachment(c, a.closest('[data-att]').dataset.att); break;
    case 'att-reveal': openAttachment(c, a.closest('[data-att]').dataset.att, true); break;
    case 'att-cover': { const id = a.closest('[data-att]').dataset.att; act('updateCard', c.id, { cover: c.cover === 'img:' + id ? null : 'img:' + id }); break; }
    case 'att-del': act('removeAttachment', c.id, a.closest('[data-att]').dataset.att); break;
    case 'add-checklist':
      openPop(a, { search: 'Nombre de la checklist y Enter', list: () => '<div class="pop-label">Por ejemplo «Pruebas» o «Despliegue».</div>',
        enter: name => { if (!name) return; closePop(); pendingGroups.add(name); renderPeek(); $(`#peek .item-add[data-group="${CSS.escape(name)}"]`)?.focus(); } });
      break;
    case 'check-menu': {
      const g = a.closest('[data-group]').dataset.group;
      openPop(a, {
        list: () => `<button class="opt" data-v="rename">${icon('pencil', 'sm')}<span class="grow">Renombrar</span></button>
          <button class="opt danger" data-v="delete">${icon('trash', 'sm')}<span class="grow">Eliminar checklist</span></button>`,
        pick: async v => {
          if (v === 'rename') return openPop(a, { search: 'Nuevo nombre y Enter', list: () => '', enter: async n => { if (n) { closePop(); pendingGroups.delete(g); await act('renameChecklist', c.id, g, n); } } });
          closePop();
          if (await askConfirm(`¿Eliminar la checklist «${g || 'Checklist'}»?`, 'Se quitan todos sus elementos.')) { pendingGroups.delete(g); await act('deleteChecklist', c.id, g); }
        },
      });
      break;
    }
    case 'col-expand': act('updateColumn', route.project, board.id, colOf(a), { collapsed: false }); break;
    case 'col-template': templatePicker(a, colOf(a)); break;
    case 'unfilter-due': dueFilter = ''; renderMain(); break;
    case 'cal-move': { const [y, m] = (calMonth || isoDay(new Date()).slice(0, 7)).split('-').map(Number); calMonth = isoDay(new Date(y, m - 1 + +a.dataset.step, 1)).slice(0, 7); renderMain(); break; }
    case 'cal-today': calMonth = null; renderMain(); break;
    case 'note-add': addNoteFromPeek(); break;
    case 'note-del': act('deleteNote', c.id, a.closest('[data-note]').dataset.note); break;
    case 'trash': go({ type: 'trash' }); break;
    case 'fav': toggleFavorite(route); break;
    case 'view-mode': store.set('views', { ...(store.get('views') || {}), [board.id]: a.dataset.mode }); closePeek(); renderMain(); break;
    case 'label-filter': labelFilterMenu(a); break;
    case 'unfilter-label': labelFilter.delete(a.dataset.label); renderMain(); break;
    case 'clear-filters': labelFilter.clear(); dueFilter = ''; boardFilter = ''; renderMain(); break;
    case 'archived': archivedMenu(a); break;
    case 'restore-trash': restoreFromTrash(a.closest('[data-trash]').dataset.trash, false); break;
    case 'purge-trash': {
      const t = trash.find(x => x.id === a.closest('[data-trash]').dataset.trash);
      if (await askConfirm(`¿Eliminar «${t.title}» para siempre?`, 'No se podrá recuperar.')) { await call('purgeTrash', t.id); sync(true); }
      break;
    }
    case 'empty-trash':
      if (await askConfirm('¿Vaciar la papelera?', `Se eliminarán para siempre ${trash.length} ${trash.length === 1 ? 'elemento' : 'elementos'}.`, 'Vaciar')) { await call('emptyTrash'); sync(true); }
      break;
    case 'copy-ai': copyText(aiText(c), 'Copiado. Pégalo en el chat de tu IA'); break;
  }
});

function toggleSidebar(force) {
  const off = force ?? !document.body.classList.contains('sb-off');
  document.body.classList.toggle('sb-off', off);
  $('#sb-open').hidden = !off;
  store.set('sidebarOff', off);
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); F.open ? F.close() : openFinder(); }
  if (e.ctrlKey && e.key === '\\') { e.preventDefault(); toggleSidebar(); }
  if (e.ctrlKey && e.key === ',') { e.preventDefault(); openSettings(); }
  if (e.altKey && e.key === 'ArrowLeft') history.back();
  if (e.altKey && e.key === 'ArrowRight') history.forward();
  if (e.ctrlKey && e.key.toLowerCase() === 's' && $('#page-editor')) { e.preventDefault(); savePage(); }
  if (e.key === 'Escape' && !F.open && !P.matches(':popover-open') && !e.target.closest?.('[data-edit], .composer, #desc-editor, .rte, dialog')) {
    if ($('#page-editor')) $('#page-editor').blur();
    else if (peekId) closePeek();
  }
});

$('#keys').addEventListener('click', e => { if (e.target.id === 'keys' || e.target.closest('[data-close-keys]')) $('#keys').close(); });

// ================= Arranque =================
toggleSidebar(store.get('sidebarOff') ?? innerWidth < 860);
if (!location.hash || location.hash === '#/') { const r = store.get('route'); if (r && r.type !== 'home') history.replaceState(null, '', href(r)); }
call('getSettings').then(applySettings).finally(onRoute);
