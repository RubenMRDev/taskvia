// ================= Tablero: interacción =================
const currentCard = () => board?.cards.find(c => c.id === peekId);
const colOf = el => el.closest('[data-col]')?.dataset.col;

function openComposer(colId, top = false) {
  const col = $(`#main [data-col="${colId}"]`);
  if (!col) return;
  $$('#main .composer').forEach(c => c.remove());
  const box = document.createElement('div');
  box.className = 'composer';
  box.innerHTML = '<textarea rows="1" placeholder="Escribe un título…" aria-label="Título de la tarjeta"></textarea><small>Enter para crear · Esc para cerrar</small>';
  const cards = $('.cards', col);
  top ? cards.prepend(box) : cards.append(box);
  const ta = $('textarea', box);
  ta.focus();
  ta.addEventListener('keydown', async e => {
    if (e.key === 'Escape') { e.stopPropagation(); box.remove(); }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const title = ta.value.trim();
      if (!title) return;
      ta.value = '';
      const r = await call('createCard', route.project, board.id, { title, column: colId });
      if (top) await call('moveCard', r.card.id, colId, 0);
      await sync(true);
      openComposer(colId, top);
    }
  });
  ta.addEventListener('blur', () => setTimeout(() => { if (!ta.value.trim() && document.activeElement !== ta) box.remove(); }, 150));
}

function renameColumn(tagEl) {
  const colId = colOf(tagEl), col = board.columns.find(c => c.id === colId);
  const input = document.createElement('input');
  input.value = col.name; input.setAttribute('aria-label', 'Nombre de la columna');
  tagEl.replaceWith(input); input.focus(); input.select();
  let done = false;
  const finish = async save => {
    if (done) return; done = true;
    const v = input.value.trim();
    if (save && v && v !== col.name) { try { await act('updateColumn', route.project, board.id, colId, { name: v }); return; } catch {} }
    renderMain();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') { e.stopPropagation(); finish(false); } });
  input.addEventListener('blur', () => finish(true));
}

function addColumnInline(btn) {
  btn.innerHTML = '<input placeholder="Nombre de la columna" aria-label="Nombre de la columna">';
  const input = $('input', btn);
  input.focus();
  let done = false;
  const finish = async save => {
    if (done) return; done = true;
    const v = input.value.trim();
    if (save && v) { try { await act('addColumn', route.project, board.id, { name: v }); return; } catch {} }
    renderMain();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') { e.stopPropagation(); finish(false); } });
  input.addEventListener('blur', () => finish(true));
  input.addEventListener('click', e => e.stopPropagation());
}

// Arrastrar y soltar tarjetas con una línea que marca dónde caen
const main = $('#main');
main.addEventListener('dragstart', e => {
  const head = e.target.closest?.('.col-head');
  if (head) { // mover columnas arrastrando su encabezado
    dragCol = head.closest('.col').dataset.col;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragCol);
    requestAnimationFrame(() => head.closest('.col').classList.add('dragging'));
    return;
  }
  const c = e.target.closest?.('.card');
  if (!c) return;
  dragId = c.dataset.card;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragId);
  requestAnimationFrame(() => c.classList.add('dragging'));
});
// Columnas: el destino es el hueco más cercano según la posición horizontal del ratón
function colDropIndex(x) {
  const others = $$('#main .col[data-col]').filter(c => c.dataset.col !== dragCol);
  const i = others.findIndex(c => { const r = c.getBoundingClientRect(); return x < r.left + r.width / 2; });
  return { others, index: i < 0 ? others.length : i };
}
const clearColDrop = () => $$('#main .col-drop').forEach(x => x.classList.toggle('col-drop', false) || x.classList.toggle('col-drop-end', false));
main.addEventListener('dragover', e => {
  if (dragCol) {
    if (!e.target.closest?.('.board')) return;
    e.preventDefault();
    const { others, index } = colDropIndex(e.clientX);
    clearColDrop();
    const ref = others[index] || others.at(-1);
    if (ref) { ref.classList.add('col-drop'); ref.classList.toggle('col-drop-end', index >= others.length); }
    return;
  }
  const col = e.target.closest?.('.col');
  if (!dragId || !col) return;
  e.preventDefault();
  const list = $('.cards', col);
  let line = $('.drop-line');
  if (!line) { line = document.createElement('div'); line.className = 'drop-line'; }
  const ref = $$('.card:not(.dragging)', list).find(c => { const r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
  if (line.parentNode !== list || line.nextSibling !== (ref || null)) list.insertBefore(line, ref || null);
});
main.addEventListener('drop', e => {
  if (dragCol) {
    e.preventDefault();
    const id = dragCol, { index } = colDropIndex(e.clientX);
    cleanupDrag();
    if (board.columns.findIndex(c => c.id === id) !== index) act('moveColumn', route.project, board.id, id, index);
    return;
  }
  const col = e.target.closest?.('.col');
  const line = $('.drop-line');
  if (!dragId || !col || !line) return;
  e.preventDefault();
  let index = 0;
  for (const el of line.parentNode.children) { if (el === line) break; if (el.matches('.card:not(.dragging)')) index++; }
  const id = dragId;
  cleanupDrag();
  act('moveCard', id, col.dataset.col, index);
});
main.addEventListener('dragend', cleanupDrag);
let dragCol = null;
function cleanupDrag() {
  dragId = dragCol = null;
  $('.drop-line')?.remove();
  $$('#main .dragging').forEach(c => c.classList.toggle('dragging', false));
  clearColDrop();
}

main.addEventListener('keydown', e => {
  const c = e.target.closest?.('.card, .card-row');
  if (c && e.key === 'Enter') openPeek(c.dataset.card);
});
