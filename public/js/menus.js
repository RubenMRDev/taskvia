// ================= Menús de proyecto, tablero, página y tarjeta (clic derecho o «···») =================
const aiText = c => `Vamos con la tarjeta «${c.title}» (id ${c.id}) del tablero ${board.name} del proyecto ${route.project}, ahora en «${board.columns.find(x => x.id === c.columnId).name}». Léela con card_get y empieza.`;

function iconOf(kind, d) {
  const p = proj(d.project || route.project);
  if (kind === 'project') return p?.emoji;
  if (kind === 'board') return p?.boards.find(b => b.id === d.id)?.emoji;
  if (kind === 'page') return p?.pages.find(x => x.path === d.path)?.icon;
  return board?.cards.find(c => c.id === d.id)?.emoji;
}
function setIcon(kind, d, v) {
  const p = d.project || route.project;
  if (kind === 'project') return act('updateProject', p, { icon: v });
  if (kind === 'board') return act('updateBoard', p, d.id, { emoji: v });
  if (kind === 'page') return act('writePage', p, d.path, { icon: v });
  return act('updateCard', d.id, { emoji: v });
}

function renameItem(kind, d) {
  const focusTitle = scope => { const t = $(scope + ' .title'); if (t) { t.focus(); getSelection().selectAllChildren(t); } };
  if (kind === 'card') { openPeek(d.id); return focusTitle('#peek'); }
  const r = kind === 'project' ? { type: 'project', project: d.project }
    : kind === 'board' ? { type: 'board', project: d.project, id: d.id } : { type: 'page', project: d.project, path: d.path };
  if (href(r) === href(route)) return focusTitle('#main');
  focusTitleNext = true;
  go(r);
}

// Borrar manda a la papelera (30 días). Proyectos y tableros piden confirmación; páginas y tarjetas no,
// pero el aviso trae «Deshacer».
async function deleteItem(kind, d) {
  const p = d.project || route.project, pr = proj(p);
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  let r, msg;
  if (kind === 'project') {
    if (!await askConfirm(`¿Eliminar el proyecto «${p}»?`, `Sus ${n(pr.boards.length, 'tablero', 'tableros')} y ${n(pr.pages.length, 'página', 'páginas')} irán a la papelera, donde se guardan 30 días.`, 'Mover a la papelera')) return;
    r = await call('deleteProject', p); msg = 'Proyecto movido a la papelera';
    if (route.project === p) go({ type: 'home' });
  } else if (kind === 'board') {
    const b = pr.boards.find(x => x.id === d.id);
    if (!await askConfirm(`¿Eliminar el tablero «${b.name}»?`, `Él y sus ${n(b.cards, 'tarjeta', 'tarjetas')} irán a la papelera, donde se guardan 30 días.`, 'Mover a la papelera')) return;
    r = await call('deleteBoard', p, d.id); msg = 'Tablero movido a la papelera';
    if (route.type === 'board' && route.id === d.id) go({ type: 'project', project: p });
  } else if (kind === 'page') {
    r = await call('deletePage', p, d.path); msg = 'Página movida a la papelera';
    if (route.type === 'page' && route.project === p && (route.path === d.path || route.path.startsWith(d.path + '/'))) {
      const parent = d.path.includes('/') ? d.path.slice(0, d.path.lastIndexOf('/')) : null;
      go(parent ? { type: 'page', project: p, path: parent } : { type: 'project', project: p });
    }
  } else {
    if (peekId === d.id) closePeek();
    r = await call('deleteCard', d.id); msg = 'Tarjeta movida a la papelera';
  }
  applySettings(await call('getSettings')); // los favoritos de lo borrado desaparecen
  toast(msg, false, { label: 'Deshacer', run: () => restoreFromTrash(r.trashId) });
  await sync(true);
}

// Restaura y lleva a lo restaurado
async function restoreFromTrash(id, navigate = true) {
  const out = await call('restoreTrash', id);
  toast('Restaurado');
  if (!navigate) return sync(true);
  if (out.kind === 'card') return openCardAt(out.project, out.boardId, out.id);
  go(out.kind === 'project' ? { type: 'project', project: out.project }
    : out.kind === 'board' ? { type: 'board', project: out.project, id: out.id } : { type: 'page', project: out.project, path: out.path });
}

async function archiveWithUndo(id, archived = true) {
  await act('archiveCard', id, archived);
  if (archived) toast('Tarjeta archivada', false, { label: 'Deshacer', run: () => act('archiveCard', id, false) });
  else toast('Tarjeta de vuelta en el tablero');
}

function itemMenu(anchor, d) {
  const kind = d.kind, p = d.project || route.project;
  const M = (v, ic, label, cls = '') => `<button class="opt ${cls}" data-v="${v}">${icon(ic, 'sm')}<span class="grow">${label}</span></button>`;
  const SEP = '<div class="pop-sep"></div>', ICON = M('icon', 'face-slightly-smiling-plus', 'Cambiar icono'), REN = M('rename', 'pencil', 'Renombrar');
  const card = kind === 'card' ? board?.cards.find(c => c.id === d.id) : null;
  const target = { type: kind, project: p, id: d.id, path: d.path };
  const FAV = kind !== 'card' ? (isFavorite(target) ? M('fav', 'star-off', 'Quitar de favoritos') : M('fav', 'star', 'Añadir a favoritos')) : '';
  const body = {
    project: M('board', 'kanban', 'Nuevo tablero') + M('page', 'file-plus', 'Nueva página') + SEP + FAV + ICON + REN + SEP + M('delete', 'trash', 'Eliminar proyecto', 'danger'),
    board: M('open', 'arrow-up-right', 'Abrir') + FAV + ICON + REN + SEP + M('delete', 'trash', 'Eliminar tablero', 'danger'),
    page: M('open', 'arrow-up-right', 'Abrir') + M('sub', 'file-plus', 'Añadir subpágina') + FAV + ICON + REN + M('copy', 'copy', 'Copiar ruta') + SEP + M('delete', 'trash', 'Eliminar página', 'danger'),
    card: card && (M('open', 'arrow-up-right', 'Abrir') + ICON + REN + M('dates', 'calendar', 'Fechas…') + M('cover', 'panel-top', 'Portada…') + M('ai', 'bot', 'Copiar para la IA') + SEP
      + M('copy-card', 'copy-plus', 'Copiar') + M('copy-to', 'copy', 'Copiar a otro tablero…') + M('move-to', 'arrow-right-left', 'Mover a otro tablero…')
      + M('template', 'layout-template', card.template ? 'Dejar de ser plantilla' : 'Convertir en plantilla')
      + M('archive', card.archived ? 'rotate-ccw' : 'archive', card.archived ? 'Sacar del archivo' : 'Archivar') + SEP + '<div class="pop-label">Mover a</div>'
      + board.columns.map(col => `<button class="opt" data-v="move:${col.id}"><span class="tag c-${col.color}"><span class="dot"></span>${esc(col.name)}</span><span class="grow"></span>${col.id === card.columnId ? icon('check', 'sm ok') : ''}</button>`).join('')
      + SEP + M('delete', 'trash', 'Eliminar tarjeta', 'danger')),
  }[kind];
  if (!body) return;
  openPop(anchor, {
    list: () => body,
    pick: async v => {
      if (v === 'icon') return emojiPicker(popAnchor, iconOf(kind, d), x => setIcon(kind, d, x));
      if (['dates', 'copy-to', 'move-to', 'cover'].includes(v)) return ({ cover: () => coverPicker(popAnchor, card), dates: () => datesPicker(popAnchor, card), 'copy-to': () => boardPicker(popAnchor, card, 'copy'), 'move-to': () => boardPicker(popAnchor, card, 'move') })[v]();
      closePop();
      if (v === 'board') return newBoard(p);
      if (v === 'page') return newPage(p);
      if (v === 'sub') return newPage(p, d.path);
      if (v === 'open') return kind === 'card' ? openPeek(d.id) : go(kind === 'board' ? { type: 'board', project: p, id: d.id } : { type: 'page', project: p, path: d.path });
      if (v === 'rename') return renameItem(kind, { ...d, project: p });
      if (v === 'copy') return copyText(`${p} / ${d.path}`, 'Ruta copiada');
      if (v === 'fav') return toggleFavorite(target);
      if (v === 'archive') return archiveWithUndo(d.id, !card.archived);
      if (v === 'dates') return datesPicker(popAnchor, card);
      if (v === 'copy-card') { await call('duplicateCard', d.id); await sync(true); return toast('Tarjeta copiada'); }
      if (v === 'copy-to') return boardPicker(popAnchor, card, 'copy');
      if (v === 'move-to') return boardPicker(popAnchor, card, 'move');
      if (v === 'template') { await act('updateCard', d.id, { template: !card.template }); return toast(card.template ? 'Ya no es plantilla' : 'Ahora es una plantilla'); }
      if (v === 'ai') return copyText(aiText(card), 'Copiado. Pégalo en el chat de tu IA');
      if (v.startsWith('move:')) return act('moveCard', d.id, v.slice(5));
      if (v === 'delete') return deleteItem(kind, { ...d, project: p });
    },
  });
}

document.addEventListener('contextmenu', e => {
  const el = e.target.closest('[data-kind]');
  if (!el || e.target.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return;
  e.preventDefault();
  itemMenu({ getBoundingClientRect: () => new DOMRect(e.clientX, e.clientY, 0, 0) }, el.dataset);
});

// ================= Confirmación propia (el confirm() del sistema queda fuera de lugar) =================
function askConfirm(title, text = 'No se puede deshacer.', ok = 'Eliminar') {
  const d = $('#confirm');
  $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; $('#confirm [value=ok]').textContent = ok;
  confirmDone?.(false); // una confirmación anterior sin contestar cuenta como "no"
  d.showModal(); $('#confirm [value=cancel]').focus();
  return new Promise(res => { confirmDone = res; });
}
// Se resuelve desde los propios botones, Esc y el fondo (no dependemos del evento close)
let confirmDone = null;
function endConfirm(ok) {
  const done = confirmDone; confirmDone = null;
  if ($('#confirm').open) $('#confirm').close();
  done?.(ok);
}
$('#confirm').addEventListener('click', e => {
  const b = e.target.closest('button[value]');
  if (b) endConfirm(b.value === 'ok'); else if (e.target.id === 'confirm') endConfirm(false);
});
$('#confirm').addEventListener('cancel', e => { e.preventDefault(); endConfirm(false); });
