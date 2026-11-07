// ================= Extras del tablero: fechas, calendario, adjuntos, mover, plantillas y atajos =================

// ---------- Fechas ----------
const toDate = t => new Date(t.length === 10 ? t + 'T23:59' : t); // un vencimiento sin hora vence al final del día
const fmtDate = (t, withTime = true) => {
  const d = new Date(t.length === 10 ? t + 'T00:00' : t), sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) }) + (withTime && t.length > 10 ? ` ${t.slice(11)}` : '');
};
// done (verde), over (vencida, rojo), soon (en menos de 24 h, amarillo) o normal
function dueState(c) {
  if (!c.due) return null;
  if (c.dueDone) return 'done';
  const ms = toDate(c.due) - Date.now();
  return ms < 0 ? 'over' : ms < 864e5 ? 'soon' : 'normal';
}
const DUE_COLOR = { done: 'green', over: 'red', soon: 'yellow', normal: 'gray' };
const DUE_LABEL = { done: 'Completada', over: 'Vencida', soon: 'Vence pronto', normal: 'Vence' };
function dueBadge(c) {
  const st = dueState(c);
  if (!st && !c.start) return '';
  const text = c.start && c.due ? `${fmtDate(c.start, false)} – ${fmtDate(c.due)}` : c.due ? fmtDate(c.due) : `Desde ${fmtDate(c.start, false)}`;
  return `<span class="due ${st ? 'tag c-' + DUE_COLOR[st] : ''}" title="${st ? DUE_LABEL[st] : 'Inicio'}">${icon(st === 'done' ? 'circle-check' : 'clock', 'sm')}${esc(text)}</span>`;
}

function datesPicker(anchor, c) {
  const [day, time] = (c.due || '').split('T');
  openPop(anchor, {
    list: () => `<div class="dates-form">
      <div class="pop-label">Fechas de «${esc(c.title)}»</div>
      <label>Inicio<input type="date" id="d-start" value="${c.start || ''}"></label>
      <label>Vencimiento<span class="dt"><input type="date" id="d-due" value="${day || ''}"><input type="time" id="d-time" value="${time || ''}" aria-label="Hora"></span></label>
      <label class="chk"><input type="checkbox" class="cb" id="d-done" ${c.dueDone ? 'checked' : ''}>Completada</label>
      <div class="row-btns"><button class="btn primary" data-v="save">Guardar</button>${c.start || c.due ? '<button class="btn ghost" data-v="clear">Quitar fechas</button>' : ''}</div>
    </div>`,
    pick: async v => {
      const start = $('#d-start', P).value, due = $('#d-due', P).value, t = $('#d-time', P).value, done = $('#d-done', P).checked;
      closePop();
      if (v === 'clear') return act('updateCard', c.id, { start: '', due: '' });
      await act('updateCard', c.id, { start, due: due ? (t ? `${due}T${t}` : due) : '', ...(due ? { dueDone: done } : {}) });
    },
  });
}

// ---------- Calendario (vista del tablero) ----------
let calMonth = null; // "AAAA-MM" que se está viendo
const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function calendarView(b, live) {
  const now = new Date(), ym = calMonth || isoDay(now).slice(0, 7), [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1), start = new Date(y, m - 1, 1 - (first.getDay() + 6) % 7); // semanas de lunes a domingo
  const shown = live.filter(c => cardVisible(b, c));
  const byDay = Object.groupBy(shown.filter(c => c.due), c => c.due.slice(0, 10));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  const title = first.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return `<div class="cal-wrap pad">
    <div class="cal-bar"><button class="ib" data-act="cal-move" data-step="-1" title="Mes anterior">${icon('chevron-left')}</button>
      <h2>${title[0].toUpperCase() + title.slice(1)}</h2>
      <button class="ib" data-act="cal-move" data-step="1" title="Mes siguiente">${icon('chevron-right')}</button>
      <button class="btn ghost" data-act="cal-today">Hoy</button><span class="grow"></span>
      <span class="meta">${shown.filter(c => !c.due).length} sin fecha · doble clic en un día para crear una tarjeta que vence ese día</span></div>
    <div class="cal-grid" role="grid">
      ${['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${cells.map(d => {
        const key = isoDay(d), cards = byDay[key] || [];
        return `<div class="cal-day ${d.getMonth() !== m - 1 ? 'out' : ''} ${key === isoDay(now) ? 'today' : ''}" data-day="${key}">
          <span class="dnum">${d.getDate()}</span>
          ${cards.map(c => {
            const col = b.columns.find(x => x.id === c.columnId), st = dueState(c);
            const tint = st === 'over' || st === 'soon' ? ` c-${DUE_COLOR[st]}` : '';
            return `<div class="cal-card ${st}${tint}" draggable="true" tabindex="0" data-card="${c.id}" data-kind="card" data-id="${c.id}" title="${esc((col?.name ?? '') + (st && st !== 'normal' ? ' · ' + DUE_LABEL[st] : ''))}">
              <span class="dot c-${st === 'normal' ? col?.color ?? 'gray' : DUE_COLOR[st]}"></span><span class="t">${c.due.length > 10 ? `<b>${c.due.slice(11)}</b> ` : ''}${esc(c.title)}</span></div>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div></div>`;
}
let calDrag = null;
main.addEventListener('dragstart', e => {
  const c = e.target.closest?.('.cal-card');
  if (!c) return;
  calDrag = c.dataset.card;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', calDrag);
});
main.addEventListener('dragover', e => {
  const day = calDrag && e.target.closest?.('.cal-day');
  if (!day) return;
  e.preventDefault();
  $$('#main .cal-day.over').forEach(x => x.classList.toggle('over', x === day));
  day.classList.add('over');
});
main.addEventListener('drop', async e => {
  const day = calDrag && e.target.closest?.('.cal-day');
  if (!day) return;
  e.preventDefault();
  const c = board.cards.find(x => x.id === calDrag), time = c.due?.slice(10) || '';
  calDrag = null;
  await act('updateCard', c.id, { due: day.dataset.day + time });
});
main.addEventListener('dragend', () => { calDrag = null; $$('#main .cal-day.over').forEach(x => x.classList.toggle('over', false)); });
main.addEventListener('dblclick', async e => {
  const day = e.target.closest?.('.cal-day');
  if (!day || e.target.closest('.cal-card')) return;
  const r = await call('createCard', route.project, board.id, { title: 'Nueva tarjeta', due: day.dataset.day });
  await sync(true);
  openPeek(r.card.id);
  const t = $('#peek .title'); t.focus(); getSelection().selectAllChildren(t);
});

// ---------- Adjuntos ----------
const fileIcon = f => /\.(png|jpe?g|gif|webp)$/i.test(f) ? 'image' : /\.pdf$/i.test(f) ? 'file-text' : /\.(zip|rar|7z)$/i.test(f) ? 'package' : /\.(js|ts|json|php|py|css|html|md)$/i.test(f) ? 'file-code' : 'file';
const fmtSize = n => n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`;
function attachmentsHTML(c) {
  const list = c.attachments ?? [];
  return `<section class="attach">
    <div class="check-head">${icon('paperclip')}Adjuntos ${list.length ? `<span class="muted">${list.length}</span>` : ''}<span class="grow"></span>
      <button class="btn ghost" data-act="attach-file">${icon('file-up', 'sm')}Archivo</button>
      <button class="btn ghost" data-act="attach-link">${icon('link-2', 'sm')}Enlace</button></div>
    ${list.length ? '' : '<p class="notes-empty">Arrastra aquí ficheros o capturas, o añade enlaces.</p>'}
    ${list.map(a => {
      const img = a.file && /\.(png|jpe?g|gif|webp)$/i.test(a.file), isCover = c.cover === 'img:' + a.id;
      return `<div class="att" data-att="${a.id}">
        <button class="att-thumb" data-act="att-open" title="Abrir">${img ? `<img src="${assetUrl(route.project, a.file)}" alt="" loading="lazy">` : icon(a.url ? 'link-2' : fileIcon(a.file))}</button>
        <div class="att-main"><button class="att-name" data-act="att-open">${esc(a.name)}</button>
          <small>${a.url ? esc(a.url.replace(/^https?:\/\//, '')) : fmtSize(a.size)} · ${ago(a.addedAt)}${isCover ? ' · portada' : ''}</small></div>
        ${img ? `<button class="btn ghost" data-act="att-cover">${isCover ? 'Quitar portada' : 'Portada'}</button>` : ''}
        ${a.file && window.desktop ? `<button class="ib" data-act="att-reveal" title="Mostrar en la carpeta">${icon('folder-search', 'sm')}</button>` : ''}
        <button class="ib danger" data-act="att-del" title="Quitar adjunto" aria-label="Quitar adjunto">${icon('x', 'sm')}</button>
      </div>`;
    }).join('')}
  </section>`;
}
const readB64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(f); });
async function attachFiles(cardId, files) {
  for (const f of files) {
    if (f.size > 25 * 1024 * 1024) { toast(`«${f.name}» pasa de 25 MB`, true); continue; }
    $('#status').textContent = `Subiendo ${f.name}…`;
    await call('addAttachment', cardId, { name: f.name, base64: await readB64(f) });
  }
  $('#status').textContent = '';
  await sync(true);
}
function pickAttachments(cardId) {
  const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true });
  input.onchange = () => attachFiles(cardId, [...input.files]);
  input.click();
}
function linkAttachPrompt(anchor, cardId) {
  openPop(anchor, {
    search: 'Pega el enlace (https://…) y pulsa Enter',
    list: () => '<div class="pop-label">Se guarda como adjunto de la tarjeta.</div>',
    enter: async url => { if (!url) return; closePop(); await act('addLink', cardId, { url: /^https?:/i.test(url) ? url : 'https://' + url }); },
  });
}
function openAttachment(c, attId, reveal = false) {
  const a = c.attachments.find(x => x.id === attId);
  if (a.url) return window.open(a.url);
  if (window.desktop) return window.desktop.openFile(route.project, a.file, reveal);
  window.open(assetUrl(route.project, a.file));
}
// Soltar ficheros en la vista lateral los adjunta (fuera del editor de la descripción, que los mete como imagen)
$('#peek').addEventListener('dragover', e => { if (!e.target.closest('.rte') && e.dataTransfer.types.includes('Files')) { e.preventDefault(); $('#peek').classList.add('dropping'); } });
$('#peek').addEventListener('dragleave', e => { if (!$('#peek').contains(e.relatedTarget)) $('#peek').classList.remove('dropping'); });
$('#peek').addEventListener('drop', e => {
  $('#peek').classList.remove('dropping');
  if (e.target.closest('.rte') || !e.dataTransfer.files.length || !peekId) return;
  e.preventDefault();
  attachFiles(peekId, [...e.dataTransfer.files]);
});

// ---------- Mover o copiar a otro tablero ----------
function boardPicker(anchor, c, mode) {
  openPop(anchor, {
    wide: true, search: 'Busca el tablero de destino',
    list: q => tree.map(p => {
      const bs = p.boards.filter(b => (mode === 'copy' || b.id !== board.id) && fold(`${p.name} ${b.name}`).includes(fold(q)));
      return bs.length ? `<div class="pop-label">${glyph(p.emoji)} ${esc(p.name)}</div>` + bs.map(b => `<button class="opt" data-v="${esc(p.name)}|${b.id}">
        <span class="em">${glyph(b.emoji)}</span><span class="grow">${esc(b.name)}</span>${b.id === board.id ? '<span class="muted">este tablero</span>' : ''}</button>`).join('') : '';
    }).join('') || '<div class="pop-label">No hay otro tablero. Crea uno primero.</div>',
    pick: async v => {
      const [project, id] = [v.slice(0, v.lastIndexOf('|')), v.slice(v.lastIndexOf('|') + 1)];
      closePop();
      if (mode === 'copy') {
        const r = await call('duplicateCard', c.id, { project, board: id });
        await sync(true);
        return toast('Tarjeta copiada', false, id === board.id ? null : { label: 'Ver', run: () => openCardAt(project, id, r.card.id) });
      }
      if (peekId === c.id) closePeek();
      await call('moveCardToBoard', c.id, project, id);
      await sync(true);
      toast(`Movida a «${tree.find(p => p.name === project).boards.find(b => b.id === id).name}»`, false, { label: 'Ver', run: () => openCardAt(project, id, c.id) });
    },
  });
}

function templatePicker(anchor, colId) {
  const tpls = board.cards.filter(c => c.template && !c.archived);
  openPop(anchor, {
    list: () => '<div class="pop-label">Crear desde plantilla</div>' + (tpls.map(c => `<button class="opt" data-v="${c.id}">${icon('layout-template', 'sm')}<span class="grow">${esc(c.title)}</span></button>`).join('')
      || '<div class="pop-label">No hay plantillas. Convierte una tarjeta en plantilla desde su menú.</div>'),
    pick: async v => { closePop(); const r = await call('createFromTemplate', v, { column: colId }); await sync(true); openPeek(r.card.id); },
  });
}

function backgroundPicker(anchor) {
  openPop(anchor, {
    list: () => `<div class="pop-label">Fondo del tablero</div>${colorOpts(board.background)}<div class="pop-sep"></div>
      <button class="opt" data-v="none">${icon('x', 'sm')}<span class="grow">Sin fondo</span></button>`,
    pick: async v => { await act('updateBoard', route.project, board.id, { background: v === 'none' ? '' : v.slice(6) }); drawPop(); },
  });
}

// ---------- Atajos de teclado (los de un kanban que tienen sentido para una persona) ----------
let hoverCard = null;
main.addEventListener('mouseover', e => { hoverCard = e.target.closest?.('[data-kind="card"]')?.dataset.id ?? null; });
main.addEventListener('mouseleave', () => { hoverCard = null; });
const typing = t => t.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]');
document.addEventListener('keydown', async e => {
  if (e.ctrlKey || e.altKey || e.metaKey || typing(e.target) || document.querySelector('dialog[open]') || P.matches(':popover-open')) return;
  const k = e.key, onBoard = route.type === 'board' && board;
  const target = peekId || hoverCard, c = onBoard && board.cards.find(x => x.id === target);
  if (k === '?') { e.preventDefault(); return $('#keys').showModal(); }
  if (k === '[') { e.preventDefault(); return toggleSidebar(); }
  if (!onBoard) return;
  const el = c && ($(`#main [data-id="${c.id}"]`) || $('#peek .title'));
  if (k === 'n') { e.preventDefault(); const col = hoverCard ? board.cards.find(x => x.id === hoverCard)?.columnId : board.columns.find(x => !x.collapsed)?.id; if (col) openComposer(col); }
  else if (k === 'f') { e.preventDefault(); $('#board-filter')?.focus(); }
  else if (k === '1' || k === '2' || k === '3') { e.preventDefault(); $(`#main [data-act="view-mode"][data-mode="${['board', 'list', 'calendar'][k - 1]}"]`)?.click(); }
  else if (!c) return;
  else if (k === 'e') { e.preventDefault(); openPeek(c.id); }
  else if (k === 'c') { e.preventDefault(); archiveWithUndo(c.id, !c.archived); }
  else if (k === 'd') { e.preventDefault(); datesPicker(el, c); }
  else if (k === 'm') { e.preventDefault(); boardPicker(el, c, 'move'); }
  else if (k === 'l') { e.preventDefault(); if (peekId !== c.id) openPeek(c.id); labelPicker($('#peek [data-act="card-labels"]')); }
  else if (k === 'Delete') { e.preventDefault(); deleteItem('card', { id: c.id }); }
});
