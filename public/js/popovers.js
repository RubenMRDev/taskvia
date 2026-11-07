// ================= Popovers (menús, selectores) =================
const P = $('#pop');
let popCfg = null, popAnchor = null;
function openPop(anchor, cfg) {
  popCfg = cfg; popAnchor = anchor;
  P.className = cfg.wide ? 'wide' : '';
  P.innerHTML = (cfg.search ? `<input class="pop-search" placeholder="${esc(cfg.search)}" autocomplete="off">` : '') + '<div class="pop-list"></div>';
  drawPop();
  if (!P.matches(':popover-open')) P.showPopover();
  placePop();
  ($('.pop-search', P) || $('input', P))?.focus();
}
// Debajo del ancla si cabe; si no, encima; si no cabe en ninguno, en el lado con más sitio y con la altura
// recortada. Nunca invade la barra superior (zona de arrastre y botones de la ventana).
function placePop() {
  P.style.maxHeight = '';
  const r = popAnchor.getBoundingClientRect(), w = P.offsetWidth, h = P.offsetHeight;
  const topLimit = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--top')) + 4, gap = 4, edge = 8;
  const below = innerHeight - edge - (r.bottom + gap), above = r.top - gap - topLimit;
  P.style.left = Math.max(edge, Math.min(r.left, innerWidth - w - edge)) + 'px';
  if (h <= below) P.style.top = r.bottom + gap + 'px';
  else if (h <= above) P.style.top = r.top - gap - h + 'px';
  else if (below >= above) { P.style.top = r.bottom + gap + 'px'; P.style.maxHeight = below + 'px'; }
  else { P.style.top = topLimit + 'px'; P.style.maxHeight = above + 'px'; }
}
function drawPop() { $('.pop-list', P).innerHTML = popCfg.list($('.pop-search', P)?.value.trim() ?? ''); }
const closePop = () => P.matches(':popover-open') && P.hidePopover();
P.addEventListener('input', e => { if (e.target.matches('.pop-search')) drawPop(); });
P.addEventListener('click', e => { const o = e.target.closest('[data-v]'); if (o) popCfg.pick?.(o.dataset.v, o, e); });
P.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('.pop-search')) { e.preventDefault(); popCfg.enter?.(e.target.value.trim()); }
});
P.addEventListener('change', e => popCfg.change?.(e));

const colorOpts = current => `<div class="colors">${COLORS.map(c => `<button class="c-${c} ${c === current ? 'on' : ''}" data-v="color:${c}" title="${COLOR_NAMES[c]}" aria-label="${COLOR_NAMES[c]}"></button>`).join('')}</div>`;


function statusPicker(anchor) {
  const c = currentCard();
  openPop(anchor, {
    list: () => `<div class="pop-label">Mover a</div>` + board.columns.map(col => `<button class="opt" data-v="${col.id}">
      <span class="tag c-${col.color}"><span class="dot"></span>${esc(col.name)}</span><span class="grow"></span>${col.id === c.columnId ? icon('check', 'sm ok') : ''}</button>`).join(''),
    pick: async v => { closePop(); if (v !== c.columnId) await act('moveCard', c.id, v); },
  });
}

function labelPicker(anchor) {
  openPop(anchor, {
    search: 'Busca o crea una etiqueta',
    list: q => {
      const c = currentCard(), ql = q.toLowerCase();
      const ls = board.labels.filter(l => l.name.toLowerCase().includes(ql));
      return ls.map(l => `<button class="opt" data-v="${l.id}"><span class="tag c-${l.color}">${esc(l.name)}</span><span class="grow"></span>${c.labels.includes(l.id) ? icon('check', 'sm ok') : ''}</button>`).join('')
        + (q && !board.labels.some(l => l.name.toLowerCase() === ql) ? `<button class="opt" data-v="new">${icon('plus', 'sm')}<span class="grow">Crear «${esc(q)}»</span></button>` : '')
        + (!ls.length && !q ? '<div class="pop-label">Escribe para crear la primera etiqueta</div>' : '');
    },
    pick: async v => {
      const c = currentCard();
      if (v === 'new') return popCfg.enter($('.pop-search', P).value.trim());
      const labels = c.labels.includes(v) ? c.labels.filter(x => x !== v) : [...c.labels, v];
      await act('updateCard', c.id, { labels });
      drawPop();
    },
    enter: async q => {
      if (!q) return;
      const c = currentCard(), ex = board.labels.find(l => l.name.toLowerCase() === q.toLowerCase());
      await act('updateCard', c.id, { labels: [...new Set([...c.labels, ex ? ex.id : q])] });
      $('.pop-search', P).value = ''; drawPop();
    },
  });
}

function docsPicker(anchor) {
  const p = proj(route.project);
  openPop(anchor, {
    wide: true, search: 'Busca o crea una página',
    list: q => {
      const c = currentCard(), ql = q.toLowerCase();
      const ps = p.pages.filter(x => x.path.toLowerCase().includes(ql));
      return (ps.length ? '<div class="pop-label">Páginas de ' + esc(p.name) + '</div>' : '')
        + ps.map(x => `<button class="opt" data-v="${esc(x.path)}"><span class="em">${x.icon ? glyph(x.icon) : icon('file-text', 'sm')}</span><span class="grow">${esc(x.path)}</span>${c.docs.includes(x.path) ? icon('check', 'sm ok') : ''}</button>`).join('')
        + (q && !p.pages.some(x => x.path.toLowerCase() === ql) ? `<button class="opt" data-v="__new">${icon('file-plus', 'sm')}<span class="grow">Crear página «${esc(q)}»</span></button>` : '')
        + (!ps.length && !q ? '<div class="pop-label">Aún no hay páginas. Escribe un nombre para crear una.</div>' : '');
    },
    pick: async v => {
      const c = currentCard();
      if (v === '__new') return popCfg.enter($('.pop-search', P).value.trim());
      await act('updateCard', c.id, { docs: c.docs.includes(v) ? c.docs.filter(x => x !== v) : [...c.docs, v] });
      drawPop();
    },
    enter: async q => {
      if (!q) return;
      const c = currentCard();
      const exists = p.pages.find(x => x.path.toLowerCase() === q.toLowerCase());
      const path = exists ? exists.path : (await call('writePage', route.project, q, { content: '' })).path;
      await act('updateCard', c.id, { docs: [...new Set([...c.docs, path])] });
      $('.pop-search', P).value = ''; drawPop();
    },
  });
}

// Portada de la tarjeta: tamaño (franja arriba o tarjeta completa), color, imagen nueva o una imagen ya adjunta
function coverPicker(anchor, card = currentCard()) {
  const id = card.id, cur = () => board.cards.find(c => c.id === id);
  const pickImage = () => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
    input.onchange = async () => {
      const f = input.files[0];
      if (!f) return;
      if (f.size > 25 * 1024 * 1024) return toast(`«${f.name}» pasa de 25 MB`, true);
      await act('addAttachment', id, { name: f.name, base64: await readB64(f), cover: true });
    };
    input.click();
  };
  openPop(anchor, {
    list: () => {
      const c = cur(), full = c.coverSize === 'full';
      const imgs = (c.attachments ?? []).filter(a => a.file && /\.(png|jpe?g|gif|webp)$/i.test(a.file));
      return `<div class="pop-label">Tamaño</div>
        <div class="cover-sizes"><button class="${full ? '' : 'on'}" data-v="size:top" aria-pressed="${!full}"><span class="cs-top"></span>Arriba</button>
          <button class="${full ? 'on' : ''}" data-v="size:full" aria-pressed="${full}"><span class="cs-full"></span>Completa</button></div>
        <div class="pop-label">Colores</div>${colorOpts(c.cover)}
        <div class="pop-label">Imagen</div>
        ${imgs.length ? `<div class="cover-imgs">${imgs.map(a => `<button class="${c.cover === 'img:' + a.id ? 'on' : ''}" data-v="img:${a.id}" title="${esc(a.name)}"><img src="${assetUrl(route.project, a.file)}" alt=""></button>`).join('')}</div>` : ''}
        <button class="opt" data-v="upload">${icon('image-up', 'sm')}<span class="grow">Subir imagen…</span></button>
        ${c.cover ? `<div class="pop-sep"></div><button class="opt danger" data-v="none">${icon('x', 'sm')}<span class="grow">Quitar portada</span></button>` : ''}`;
    },
    pick: async v => {
      if (v === 'upload') { closePop(); return pickImage(); }
      if (v.startsWith('size:')) {
        const c = cur(), patch = { coverSize: v.slice(5) };
        if (!c.cover) patch.cover = 'blue'; // elegir tamaño sin portada pone una de color para que se vea
        await act('updateCard', id, patch);
        return drawPop();
      }
      await act('updateCard', id, v === 'none' ? { cover: null, coverSize: 'top' } : { cover: v.startsWith('img:') ? v : v.slice(6) });
      drawPop();
    },
  });
}

function columnMenu(anchor) {
  const colId = colOf(anchor), col = board.columns.find(c => c.id === colId), i = board.columns.indexOf(col);
  openPop(anchor, {
    list: () => `<button class="opt" data-v="rename">${icon('pencil', 'sm')}<span class="grow">Renombrar</span></button>
      <div class="pop-label">Color</div>${colorOpts(col.color)}
      <div class="pop-sep"></div>
      <button class="opt" data-v="left" ${i === 0 ? 'disabled' : ''}>${icon('chevron-left', 'sm')}<span class="grow">Mover a la izquierda</span></button>
      <button class="opt" data-v="right" ${i === board.columns.length - 1 ? 'disabled' : ''}>${icon('chevron-right', 'sm')}<span class="grow">Mover a la derecha</span></button>
      <div class="pop-sep"></div>
      <button class="opt" data-v="collapse">${icon('fold-horizontal', 'sm')}<span class="grow">Plegar columna</span></button>
      <button class="opt" data-v="copy-col">${icon('copy-plus', 'sm')}<span class="grow">Copiar columna</span></button>
      <div class="pop-label">Ordenar tarjetas</div>
      <button class="opt" data-v="sort:due">${icon('calendar-clock', 'sm')}<span class="grow">Por vencimiento</span></button>
      <button class="opt" data-v="sort:title">${icon('arrow-down-wide-narrow', 'sm')}<span class="grow">Por título</span></button>
      <button class="opt" data-v="sort:newest">${icon('clock', 'sm')}<span class="grow">Más nuevas primero</span></button>
      <button class="opt" data-v="sort:oldest">${icon('hourglass', 'sm')}<span class="grow">Más antiguas primero</span></button>
      <div class="pop-sep"></div>
      <button class="opt" data-v="archive" ${board.cards.some(c => c.columnId === colId && !c.archived) ? '' : 'disabled'}>${icon('archive', 'sm')}<span class="grow">Archivar sus tarjetas</span></button>
      <button class="opt danger" data-v="delete">${icon('trash', 'sm')}<span class="grow">Eliminar columna</span></button>`,
    pick: async v => {
      closePop();
      if (v === 'rename') return renameColumn($(`#main [data-col="${colId}"] [data-act="col-rename"]`));
      if (v.startsWith('color:')) return act('updateColumn', route.project, board.id, colId, { color: v.slice(6) });
      if (v === 'left' || v === 'right') return act('moveColumn', route.project, board.id, colId, i + (v === 'left' ? -1 : 1));
      if (v === 'collapse') return act('updateColumn', route.project, board.id, colId, { collapsed: true });
      if (v === 'copy-col') { await act('copyColumn', route.project, board.id, colId); return toast('Columna copiada'); }
      if (v.startsWith('sort:')) return act('sortColumn', route.project, board.id, colId, v.slice(5));
      if (v === 'archive') {
        const ids = board.cards.filter(c => c.columnId === colId && !c.archived).map(c => c.id);
        await act('archiveColumn', route.project, board.id, colId);
        return toast(`${ids.length} ${ids.length === 1 ? 'tarjeta archivada' : 'tarjetas archivadas'}`, false,
          { label: 'Deshacer', run: async () => { for (const id of ids) await call('archiveCard', id, false); sync(true); } });
      }
      if (v === 'delete' && await askConfirm(`¿Eliminar la columna «${col.name}»?`)) return act('deleteColumn', route.project, board.id, colId);
    },
  });
}

function labelsManager(anchor) {
  openPop(anchor, {
    wide: true,
    list: () => `<div class="pop-label">Etiquetas de ${esc(board.name)}</div>`
      + board.labels.map(l => `<div class="lbl-row" data-label="${l.id}">
          <button class="swatch c-${l.color}" data-v="cycle:${l.id}" title="Cambiar color (${COLOR_NAMES[l.color]})"></button>
          <input value="${esc(l.name)}" aria-label="Nombre de la etiqueta">
          <button class="ib" data-v="del:${l.id}" title="Eliminar etiqueta">${icon('trash', 'sm')}</button></div>`).join('')
      + `<div class="lbl-row"><span class="swatch c-gray" style="opacity:.4"></span><input class="new-label" placeholder="Nueva etiqueta y Enter"></div>`,
    pick: async v => {
      const [op, id] = v.split(':');
      const l = board.labels.find(x => x.id === id);
      if (op === 'cycle') await act('updateLabel', route.project, board.id, id, { color: COLORS[(COLORS.indexOf(l.color) + 1) % COLORS.length] });
      if (op === 'del' && await askConfirm(`¿Eliminar la etiqueta «${l.name}»? Se quitará de todas las tarjetas.`)) await act('deleteLabel', route.project, board.id, id);
      drawPop();
    },
    change: async e => {
      const id = e.target.closest('[data-label]')?.dataset.label;
      if (id && e.target.value.trim()) await act('updateLabel', route.project, board.id, id, { name: e.target.value.trim() });
    },
  });
  P.onkeydown = async e => {
    if (e.key === 'Enter' && e.target.matches('.new-label') && e.target.value.trim()) {
      await act('addLabel', route.project, board.id, { name: e.target.value.trim() });
      drawPop(); $('.new-label', P).focus();
    }
  };
}
P.addEventListener('toggle', e => { if (e.newState === 'closed') P.onkeydown = null; });

// Filtro por etiquetas del tablero (se muestran las tarjetas con cualquiera de las elegidas)
function labelFilterMenu(anchor) {
  openPop(anchor, {
    list: () => '<div class="pop-label">Fechas</div>' + Object.entries(DUE_FILTERS).map(([k, t]) => `<button class="opt" data-v="due:${k}">${icon('clock', 'sm')}<span class="grow">${t}</span>${dueFilter === k ? icon('check', 'sm ok') : ''}</button>`).join('')
      + (board.labels.length ? '<div class="pop-label">Etiquetas</div>' + board.labels.map(l => `<button class="opt" data-v="${l.id}">
        <span class="tag c-${l.color}">${esc(l.name)}</span><span class="grow"></span>${labelFilter.has(l.id) ? icon('check', 'sm ok') : ''}</button>`).join('')
      : '<div class="pop-label">Este tablero aún no tiene etiquetas.</div>')
      + `<div class="pop-sep"></div>${labelFilter.size ? `<button class="opt" data-v="clear">${icon('x', 'sm')}<span class="grow">Quitar filtro</span></button>` : ''}
        <button class="opt" data-v="manage">${icon('pencil', 'sm')}<span class="grow">Editar etiquetas</span></button>`,
    pick: v => {
      if (v === 'manage') return labelsManager(anchor);
      if (v.startsWith('due:')) dueFilter = dueFilter === v.slice(4) ? '' : v.slice(4);
      else if (v === 'clear') { labelFilter.clear(); dueFilter = ''; }
      else labelFilter.has(v) ? labelFilter.delete(v) : labelFilter.add(v);
      renderMain(); drawPop();
    },
  });
}

// Tarjetas archivadas del tablero: abrir o devolver al tablero
function archivedMenu(anchor) {
  openPop(anchor, {
    wide: true,
    list: () => {
      const cards = board.cards.filter(c => c.archived);
      return `<div class="pop-label">Archivadas (${cards.length})</div>` + (cards.map(c => `<div class="opt arch-row" data-card="${c.id}">
          <button class="grow arch-open" data-v="open:${c.id}">${c.emoji ? glyph(c.emoji) + ' ' : ''}${esc(c.title)}<small>${esc(board.columns.find(x => x.id === c.columnId)?.name ?? '')} · ${ago(c.updatedAt)}</small></button>
          <button class="btn ghost" data-v="restore:${c.id}">${icon('rotate-ccw', 'sm')}Devolver</button></div>`).join('')
        || '<div class="pop-label">No hay tarjetas archivadas.</div>');
    },
    pick: async v => {
      const [op, id] = v.split(':');
      if (op === 'open') { closePop(); return openPeek(id); }
      await act('archiveCard', id, false);
      if (board.cards.some(c => c.archived)) drawPop(); else closePop();
    },
  });
}

function projectAddMenu(anchor, project) {
  openPop(anchor, {
    list: () => `<button class="opt" data-v="board">${icon('kanban', 'sm')}<span class="grow">Nuevo tablero</span></button>
      <button class="opt" data-v="page">${icon('file-plus', 'sm')}<span class="grow">Nueva página</span></button>`,
    pick: v => { closePop(); v === 'board' ? newBoard(project) : newPage(project); },
  });
}

function viewMenu(anchor) {
  const t = route.type;
  openPop(anchor, {
    list: () => t === 'project' ? `<button class="opt" data-v="board">${icon('kanban', 'sm')}<span class="grow">Nuevo tablero</span></button>
        <button class="opt" data-v="page">${icon('file-plus', 'sm')}<span class="grow">Nueva página</span></button><div class="pop-sep"></div>
        <button class="opt danger" data-v="delete">${icon('trash', 'sm')}<span class="grow">Eliminar proyecto</span></button>`
      : t === 'board' ? `<button class="opt" data-v="labels">${icon('tag', 'sm')}<span class="grow">Editar etiquetas</span></button>
        <button class="opt" data-v="background">${icon('palette', 'sm')}<span class="grow">Fondo del tablero</span></button>
        <button class="opt" data-v="dup-board">${icon('copy-plus', 'sm')}<span class="grow">Duplicar tablero</span></button>
        ${board.cards.some(c => c.archived) ? `<button class="opt" data-v="archived">${icon('archive', 'sm')}<span class="grow">Tarjetas archivadas</span></button>` : ''}<div class="pop-sep"></div>
        <button class="opt danger" data-v="delete">${icon('trash', 'sm')}<span class="grow">Eliminar tablero</span></button>`
      : `<button class="opt" data-v="sub">${icon('file-plus', 'sm')}<span class="grow">Añadir subpágina</span></button>
        <button class="opt" data-v="raw">${icon('file-code', 'sm')}<span class="grow">Editar como markdown</span></button>
        <button class="opt" data-v="copy">${icon('copy', 'sm')}<span class="grow">Copiar ruta</span></button><div class="pop-sep"></div>
        <button class="opt danger" data-v="delete">${icon('trash', 'sm')}<span class="grow">Eliminar página</span></button>`,
    pick: async v => {
      closePop();
      const p = route.project;
      if (v === 'board') return newBoard(p);
      if (v === 'page') return newPage(p);
      if (v === 'labels') return labelsManager(anchor);
      if (v === 'archived') return archivedMenu(anchor);
      if (v === 'background') return backgroundPicker(anchor);
      if (v === 'raw') return startPageEdit();
      if (v === 'dup-board') { const nb = await call('duplicateBoard', p, board.id); toast(`Creado «${nb.name}»`); return go({ type: 'board', project: p, id: nb.id }); }
      if (v === 'sub') return newPage(p, route.path);
      if (v === 'copy') return copyText(`${p} / ${route.path}`, 'Ruta copiada');
      if (v === 'delete') deleteItem(t, { project: p, id: board?.id, path: route.path });
    },
  });
}

// ================= Selector de icono: emoji o icono Lucide con color =================
const ICONS = 'folder folder-open square-kanban kanban clipboard-list file-text notebook-pen library pin hourglass clapperboard bot book-open notebook briefcase rocket target circle-check list-todo lightbulb brain wrench settings bug flame star palette flask-conical package chart-bar chart-line calendar lock key-round globe message-circle megaphone puzzle building compass gamepad-2 list-music camera plane dumbbell chef-hat wallet receipt heart sprout code terminal database server cloud smartphone monitor laptop house users user mail bell bookmark flag map trophy zap coffee gift shield layers git-branch sparkles pen-tool image video school graduation-cap shopping-cart store truck hammer leaf sun moon'.split(' ');
let iconColor = 'blue';
const ICON_ES = { folder: 'carpeta', 'folder-open': 'carpeta abierta', 'square-kanban': 'tablero kanban', kanban: 'kanban', 'file-text': 'documento',
  'book-open': 'libro', notebook: 'cuaderno', briefcase: 'trabajo maletín', rocket: 'cohete lanzamiento', target: 'objetivo diana', 'circle-check': 'hecho check',
  'list-todo': 'tareas', lightbulb: 'idea bombilla', brain: 'cerebro', wrench: 'llave herramienta', settings: 'ajustes', bug: 'error bug', flame: 'fuego urgente',
  star: 'estrella', palette: 'diseño paleta', 'flask-conical': 'experimento', package: 'paquete', 'chart-bar': 'gráfico barras', 'chart-line': 'gráfico línea',
  calendar: 'calendario', lock: 'candado', 'key-round': 'llave', globe: 'web mundo', 'message-circle': 'mensaje', megaphone: 'anuncio', puzzle: 'puzle',
  building: 'edificio empresa', compass: 'brújula', 'gamepad-2': 'juego', 'list-music': 'música', camera: 'cámara foto', plane: 'avión viaje', dumbbell: 'gimnasio',
  'chef-hat': 'cocina receta', wallet: 'cartera dinero', receipt: 'factura recibo', heart: 'corazón', sprout: 'planta brote', code: 'código', terminal: 'terminal',
  database: 'base de datos', server: 'servidor', cloud: 'nube', smartphone: 'móvil', monitor: 'pantalla', laptop: 'portátil', house: 'casa', users: 'equipo personas',
  user: 'persona', mail: 'correo', bell: 'campana aviso', bookmark: 'marcador', flag: 'bandera', map: 'mapa', trophy: 'trofeo', zap: 'rayo', coffee: 'café',
  gift: 'regalo', shield: 'escudo seguridad', layers: 'capas', 'git-branch': 'rama git', sparkles: 'brillos', 'pen-tool': 'pluma diseño', image: 'imagen',
  video: 'vídeo', school: 'escuela', 'graduation-cap': 'estudios', 'shopping-cart': 'carrito compra', store: 'tienda', truck: 'camión envío', hammer: 'martillo',
  leaf: 'hoja', sun: 'sol', moon: 'luna', 'clipboard-list': 'lista portapapeles', library: 'biblioteca', pin: 'chincheta', hourglass: 'reloj de arena',
  clapperboard: 'cine', bot: 'robot ia', 'notebook-pen': 'notas' };
function emojiPicker(anchor, current, set) {
  const m = /^lucide:[^:]+:([a-z]+)/.exec(current || '');
  if (m) iconColor = m[1];
  openPop(anchor, {
    wide: true, search: 'Busca un icono (cohete, libro, código…)',
    list: q => `${colorOpts(iconColor)}<div class="icon-grid c-${iconColor}">${ICONS.filter(n => n.includes(fold(q)) || fold(ICON_ES[n] || '').includes(fold(q)))
        .map(n => `<button data-v="lucide:${n}" title="${ICON_ES[n] || n}" aria-label="${ICON_ES[n] || n}">${icon(n)}</button>`).join('') || '<div class="pop-label">Ningún icono con ese nombre</div>'}</div>`
      + (current ? `<div class="pop-sep"></div><button class="opt danger" data-v="">${icon('x', 'sm')}<span class="grow">Quitar icono</span></button>` : ''),
    pick: v => {
      if (v.startsWith('color:')) { iconColor = v.slice(6); return drawPop(); }
      closePop(); set(v ? `${v}:${iconColor}` : '');
    },
    enter: q => {
      const n = ICONS.find(n => n.includes(fold(q)) || fold(ICON_ES[n] || '').includes(fold(q)));
      if (n) { closePop(); set(`lucide:${n}:${iconColor}`); }
    },
  });
}
