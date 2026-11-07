// ================= Vista lateral de la tarjeta =================
function openPeek(id) { peekId = id; renderPeek(); }
function closePeek() { flushRte(); peekId = null; $('#peek').hidden = true; $('#peek').innerHTML = ''; $$('#main .card.sel, #main .card-row.sel').forEach(c => c.classList.remove('sel')); }

function renderPeek() {
  const c = currentCard(), el = $('#peek');
  if (!c) return closePeek();
  const col = board.columns.find(x => x.id === c.columnId);
  const done = c.checklist.filter(i => i.done).length, all = c.checklist.length;
  const notes = c.notes ?? [], activity = [...(c.activity ?? [])].reverse();
  const focusId = document.activeElement?.id, scroll = $('.peek-scroll', el)?.scrollTop;
  const historyOpen = $('#peek .activity')?.open;
  el.innerHTML = `
    <div class="peek-bar">
      <button class="ib" data-act="peek-close" title="Cerrar (Esc)">${icon('chevrons-right')}</button>
      <span class="where">${glyph(board.emoji || 'lucide:square-kanban:blue')} ${esc(board.name)}</span>
      <span class="grow"></span>
      <button class="btn ghost" data-act="copy-ai" title="Copia una frase para pegar en el chat de tu IA">${icon('bot', 'sm')}Copiar para la IA</button>
      <button class="ib" data-act="card-menu" title="Más opciones (copiar, mover, plantilla…)">${icon('ellipsis')}</button>
      <button class="ib" data-act="card-archive" title="${c.archived ? 'Sacar del archivo' : 'Archivar'}">${icon(c.archived ? 'rotate-ccw' : 'archive')}</button>
      <button class="ib" data-act="card-delete" title="Borrar tarjeta">${icon('trash')}</button>
    </div>
    <div class="peek-scroll">
      ${c.archived ? `<div class="banner">${icon('archive', 'sm')}<span>Esta tarjeta está archivada: no aparece en el tablero.</span><button class="btn ghost" data-act="card-archive">Sacar del archivo</button></div>` : ''}
      ${c.template ? `<div class="banner">${icon('layout-template', 'sm')}<span>Esta tarjeta es una plantilla: úsala desde el botón de plantillas de cada columna.</span><button class="btn ghost" data-act="card-template">Dejar de ser plantilla</button></div>` : ''}
      ${(() => { const im = String(c.cover).startsWith('img:') && (c.attachments ?? []).find(a => 'img:' + a.id === c.cover);
        const btn = `<button class="btn cover-btn" data-act="card-cover">${icon('panel-top', 'sm')}Portada</button>`;
        return im ? `<div class="peek-cover-img"><img src="${assetUrl(route.project, im.file)}" alt="">${btn}</div>` : c.cover ? `<div class="peek-cover c-${c.cover}">${btn}</div>` : ''; })()}
      <div class="peek-inner">
        <div class="phead">
          <div class="head-acts">
            ${c.emoji ? '' : `<button class="btn ghost" data-act="emoji" data-target="card">${icon('face-slightly-smiling-plus', 'sm')}Añadir icono</button>`}
            ${c.cover ? '' : `<button class="btn ghost" data-act="card-cover">${icon('image', 'sm')}Añadir portada</button>`}
          </div>
          ${c.emoji ? `<button class="big-emoji" data-act="emoji" data-target="card" title="Cambiar icono">${glyph(c.emoji)}</button>` : ''}
          <h1 class="title" contenteditable="plaintext-only" spellcheck="false" data-edit="card-title" data-id="${c.id}" data-orig="${esc(c.title)}" data-ph="Sin título">${esc(c.title)}</h1>
        </div>
        <div class="props">
          <span class="pk">${icon('circle-dot')}Estado</span>
          <button class="pv" data-act="card-status"><span class="tag c-${col.color}"><span class="dot"></span>${esc(col.name)}</span></button>
          <span class="pk">${icon('calendar')}Fechas</span>
          <button class="pv" data-act="card-dates">${dueBadge(c) || '<span class="empty">Vacío</span>'}</button>
          <span class="pk">${icon('tag')}Etiquetas</span>
          <button class="pv" data-act="card-labels">${c.labels.length ? labelChips(board, c.labels) : '<span class="empty">Vacío</span>'}</button>
          <span class="pk">${icon('file-text')}Páginas</span>
          <div class="pv btnish" data-act="card-docs">${c.docs.map(d => {
            const pg = proj(route.project)?.pages.find(x => x.path === d);
            return `<span class="page-chip" data-act="open-page" data-path="${esc(d)}" title="Abrir ${esc(d)}">${pg?.icon ? glyph(pg.icon) : icon('file-text', 'sm')}${esc(d.split('/').at(-1))}</span>`;
          }).join('') || '<span class="empty">Vacío</span>'}</div>
          ${c.cover && !String(c.cover).startsWith('img:') ? `<span class="pk">${icon('image')}Portada</span><button class="pv" data-act="card-cover"><span class="swatch c-${c.cover}"></span>${COLOR_NAMES[c.cover]}</button>` : ''}
          <span class="pk">${icon('clock')}Actualizada</span>
          <span class="pv muted" title="Creada el ${new Date(c.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}">${ago(c.updatedAt)}${c.activity?.length ? ` por ${who(c.activity.at(-1).by)}` : ''}</span>
        </div>
        <hr>
        <div class="desc-wrap">${rteBar('card')}<div class="conflict-slot"></div><div class="md desc rte ${c.description.trim() ? '' : 'empty'}" contenteditable="true" spellcheck="true" data-rte="card" data-card="${c.id}" data-project="${esc(route.project)}" data-ph="Añade el contexto de la tarea… (/ para insertar bloques)">${rteHTML(c.description, route.project)}</div></div>
        ${attachmentsHTML(c)}
        ${checklistsHTML(c)}
        <section class="notes">
          <div class="check-head">${icon('message-square-text')}Notas ${notes.length ? `<span class="muted">${notes.length}</span>` : ''}</div>
          ${notes.length ? '' : '<p class="notes-empty">Aquí deja la IA lo que ha hecho y lo que falta al acabar cada sesión. También puedes escribir tú.</p>'}
          ${notes.map(n => `<article class="note ${isAI(n.by) ? 'by-ai' : ''}" data-note="${n.id}">
            <header>${icon(isAI(n.by) ? 'bot' : 'user', 'sm')}<b>${who(n.by)}</b><span class="muted" title="${new Date(n.at).toLocaleString('es-ES')}">${ago(n.at)}</span>
              <button class="ib" data-act="note-del" title="Borrar nota">${icon('x', 'sm')}</button></header>
            <div class="md">${md(n.text)}</div></article>`).join('')}
          <div class="note-add"><textarea id="note-add" rows="1" placeholder="Añadir una nota… (Ctrl+Enter)"></textarea><button class="btn ghost" data-act="note-add">Añadir</button></div>
        </section>
        ${activity.length ? `<details class="activity" ${historyOpen ? 'open' : ''}><summary>${icon('chevron-right', 'sm chev')}${icon('clock-3', 'sm')}Historial <span class="muted">${activity.length}</span></summary>
          <ol>${activity.map(a => `<li><b>${who(a.by)}</b> ${esc(a.text)} <span class="muted" title="${new Date(a.at).toLocaleString('es-ES')}">· ${ago(a.at)}</span></li>`).join('')}</ol></details>` : ''}
      </div>
    </div>`;
  el.hidden = false;
  $('#peek .rte')._base = c.description; // la descripción que tiene delante el editor (para detectar choques)
  if (scroll) $('.peek-scroll', el).scrollTop = scroll;
  if (focusId) document.getElementById(focusId)?.focus();
  $$('#main .card, #main .card-row').forEach(x => x.classList.toggle('sel', x.dataset.card === c.id));
}

// Varias checklists por tarjeta: se agrupan por nombre; '' es la principal
const pendingGroups = new Set(); // checklists recién creadas que aún no tienen elementos
function checklistsHTML(c) {
  const groups = [...new Set([...c.checklist.map(i => i.group ?? ''), ...pendingGroups])];
  if (!groups.length) groups.push('');
  return groups.map(g => {
    const its = c.checklist.filter(i => (i.group ?? '') === g), done = its.filter(i => i.done).length;
    const key = 'add-' + (g ? g.replace(/[^\w-]/g, '_') : 'main');
    return `<section class="check" data-group="${esc(g)}">
      <div class="check-head">${icon('list-checks')}<span class="gname">${esc(g || 'Checklist')}</span> ${its.length ? `<span class="muted">${done} de ${its.length}</span>` : ''}
        <span class="grow"></span><button class="ib" data-act="check-menu" title="Opciones de la checklist">${icon('ellipsis', 'sm')}</button></div>
      ${its.length ? `<div class="progress"><i style="transform:scaleX(${done / its.length})"></i></div>` : ''}
      ${its.map(i => `<div class="item ${i.done ? 'done' : ''}" data-item="${i.id}">
        <input type="checkbox" class="cb" ${i.done ? 'checked' : ''} aria-label="Hecho">
        <input type="text" value="${esc(i.text)}" aria-label="Elemento" id="it-${i.id}">
        <button class="ib" data-act="item-del" title="Quitar">${icon('x', 'sm')}</button>
      </div>`).join('')}
      <label class="add-item">${icon('plus')}<input class="item-add" id="${key}" data-group="${esc(g)}" placeholder="Añadir elemento" autocomplete="off"></label>
    </section>`;
  }).join('') + `<button class="btn ghost add-checklist" data-act="add-checklist">${icon('list-checks', 'sm')}Añadir checklist</button>`;
}

const peek = $('#peek');
peek.addEventListener('change', e => {
  const item = e.target.closest('[data-item]')?.dataset.item, c = currentCard();
  if (!item || !c) return;
  if (e.target.type === 'checkbox') act('updateChecklistItem', c.id, item, { done: e.target.checked });
  else if (e.target.value.trim()) act('updateChecklistItem', c.id, item, { text: e.target.value.trim() });
});
async function addNoteFromPeek() {
  const ta = $('#note-add'), v = ta?.value.trim();
  if (!v) return;
  ta.value = '';
  await act('addNote', peekId, v);
}
peek.addEventListener('keydown', e => {
  if (e.target.matches('.item-add') && e.key === 'Enter') {
    e.preventDefault();
    const v = e.target.value.trim(), group = e.target.dataset.group;
    if (v) { e.target.value = ''; pendingGroups.delete(group); act('addChecklist', peekId, [v], group); }
  }
  if (e.target.matches('.item input[type=text]') && e.key === 'Enter') e.target.blur();
  if (e.target.id === 'note-add' && e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addNoteFromPeek(); }
  if (e.target.id === 'note-add' && e.key === 'Escape') { e.stopPropagation(); e.target.blur(); }
});
