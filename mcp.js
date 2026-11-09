// Taskvia — servidor MCP (stdio) para tu asistente de IA. Mientras está vivo también sirve la UI en http://localhost:4545.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as s from './store.js';
import './ui.js';

const server = new McpServer({ name: 'taskvia', version: '1.0.0' }, {
  instructions: `Taskvia, el gestor local del usuario: proyectos con tableros kanban y páginas de documentación markdown.
- Empieza con project_list para ver proyectos, tableros y páginas. Si el usuario no dice proyecto o tablero y hay duda, pregúntale.
- Si el usuario pega una tarea de otra herramienta (o dice "vamos con esto"), créala con card_create: título corto, descripción con el contexto pegado (markdown), checklist con pasos concretos y etiquetas si encajan.
- Mientras trabajas en una tarjeta: muévela a la columna de "en curso", marca cada paso de la checklist al terminarlo (checklist_update) y muévela a la última columna al acabar.
- Antes de retomar una tarea, léela con card_get: ahí está el contexto, lo pendiente y las notas de la última sesión. Si no sabes el id, búscala con card_search.
- Al parar o terminar una sesión de trabajo, deja con card_note una nota corta: qué hiciste, qué falta y cualquier decisión importante. Es lo que leerás la próxima vez.
- Cuando una tarea queda hecha y ya no hace falta verla, puedes archivarla (card_archive) en vez de borrarla.
- Las páginas son markdown anidado por rutas ("API/Autenticación"). Busca con doc_search antes de escribir algo que quizá ya exista, y enlaza con la tarjeta (card_update docs) las páginas que documentan la tarea. Para enlazar una página desde otra escribe [[Ruta/Página]].
- Borrar no es definitivo: va a la papelera 30 días (trash_list / trash_restore).
- Si el usuario da una fecha límite, ponla en la tarjeta (due, formato AAAA-MM-DD o AAAA-MM-DDTHH:mm). Al terminar una tarjeta con fecha, márcala con due_done.
- Las subpáginas se enlazan desde su página padre escribiendo [[Ruta/Subpágina]] donde tenga sentido en el texto.
- Los iconos son de Lucide ("rocket", "lucide:bug:red"); no uses emojis.
- Todo lo que sea documentar (guías, notas técnicas, decisiones, cómo probar algo) va en páginas de Taskvia con doc_write, no en ficheros .md sueltos del repo, salvo que el usuario pida un fichero.
- Si vas a editar una página en varios pasos, llama antes a doc_editing (editing: true) y al acabar con editing: false: la app enseña que la estás editando y no deja tocarla.
- Para meter capturas o imágenes en una página, escríbelas en doc_write con su ruta absoluta en disco (![texto](C:/ruta/img.png)): Taskvia las copia dentro del proyecto y se ven en la app. Las capturas grandes, más pequeñas con ![texto|60%](…); las de móvil, con marco: ![texto|35%|movil](…); las de escritorio, ![texto|pc](…).`,
});

const tool = (name, description, inputSchema, fn) =>
  server.registerTool(name, { description, inputSchema }, async args => {
    try {
      const r = await fn(args);
      return { content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r ?? 'ok', null, 2) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: e.message }], isError: true };
    }
  });

const progress = c => c.checklist.length ? ` (${c.checklist.filter(i => i.done).length}/${c.checklist.length})` : '';
const labelNames = (b, c) => c.labels.map(id => b.labels.find(l => l.id === id)?.name).filter(Boolean);

const when = iso => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
const cardText = ({ project, board: b, card: c }) => [
  `# ${c.title}  [${c.id}]`,
  `Proyecto: ${project} · Tablero: ${b.name} · Columna: ${b.columns.find(x => x.id === c.columnId)?.name}${c.archived ? ' · ARCHIVADA' : ''}${c.template ? ' · PLANTILLA' : ''}`,
  c.start || c.due ? `Fechas: ${c.start ? 'inicio ' + c.start : ''}${c.start && c.due ? ' · ' : ''}${c.due ? 'vence ' + c.due.replace('T', ' ') + (c.dueDone ? ' (completada)' : '') : ''}` : '',
  (c.attachments ?? []).length ? 'Adjuntos: ' + c.attachments.map(a => a.url ? `${a.name} <${a.url}>` : `${a.name} (${a.file})`).join(', ') : '',
  labelNames(b, c).length ? `Etiquetas: ${labelNames(b, c).join(', ')}` : '',
  c.docs.length ? `Páginas enlazadas: ${c.docs.join(', ')}` : '',
  '', c.description || '(sin descripción)', '',
  c.checklist.length ? '## Checklist' : '',
  ...c.checklist.map((i, k, all) => (i.group && i.group !== all[k - 1]?.group ? `### ${i.group}\n` : '') + `- [${i.done ? 'x' : ' '}] ${i.text}  (id: ${i.id})`),
  (c.notes ?? []).length ? '\n## Notas' : '',
  ...(c.notes ?? []).slice(-10).map(n => `- ${when(n.at)} · ${n.by}: ${n.text}`),
  (c.activity ?? []).length ? '\n## Últimos cambios' : '',
  ...(c.activity ?? []).slice(-8).map(a => `- ${when(a.at)} · ${a.by} ${a.text}`),
].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

const projectArg = z.string().describe('Nombre del proyecto');
const boardArg = z.string().describe('Nombre o id del tablero');

// ---------- Proyectos y tableros ----------
tool('project_list', 'Ver todos los proyectos con sus tableros y páginas.', {}, () => s.getTree().map(p => [
  `# ${p.name}`,
  'Tableros: ' + (p.boards.map(b => `${b.name} [${b.id}] (${b.cards} tarjetas)`).join(' · ') || '(ninguno)'),
  'Páginas: ' + (p.pages.map(pg => pg.path).join(', ') || '(ninguna)'),
].join('\n')).join('\n\n') || 'No hay proyectos. Crea uno con project_create.');

const iconArg = z.string().optional().describe('Icono de Lucide: "lucide:<nombre>:<color>" o solo el nombre (p. ej. "rocket"). Colores: gray, brown, orange, yellow, green, blue, purple, pink, red. No se usan emojis.');
tool('project_create', 'Crear un proyecto.', { name: z.string(), icon: iconArg },
  args => s.createProject(args));

tool('board_create', 'Crear un tablero en un proyecto. Columnas por defecto: Por hacer, En curso, Hecho.', {
  project: projectArg, name: z.string(), icon: iconArg, columns: z.array(z.string()).optional(),
}, ({ project, ...rest }) => { const b = s.createBoard(project, rest); return `Tablero creado: ${b.name} [${b.id}]`; });

tool('board_get', 'Ver un tablero: columnas, etiquetas y tarjetas con id y progreso.', { project: projectArg, board: boardArg }, ({ project, board }) => {
  const b = s.getBoard(project, board);
  return [`# ${b.name} [${b.id}]`, b.labels.length ? `Etiquetas: ${b.labels.map(l => l.name).join(', ')}` : '',
    b.cards.some(c => c.archived) ? `Archivadas: ${b.cards.filter(c => c.archived).length} (no se listan)` : '',
    ...b.columns.map(col => `\n## ${col.name}\n` + (b.cards.filter(c => c.columnId === col.id && !c.archived)
      .map(c => `- [${c.id}] ${c.title}${progress(c)}${labelNames(b, c).length ? ' · ' + labelNames(b, c).join(', ') : ''}${c.due ? ' · vence ' + c.due.replace('T', ' ') + (c.dueDone ? ' ✓' : '') : ''}`).join('\n') || '(vacía)')),
  ].join('\n');
});

tool('column_create', 'Crear una columna en un tablero.', { project: projectArg, board: boardArg, name: z.string() },
  ({ project, board, name }) => { s.addColumn(project, board, { name }); return 'ok'; });

// ---------- Tarjetas ----------
tool('card_create', 'Crear una tarjeta. Por defecto va a la primera columna. Las etiquetas nuevas se crean solas.', {
  project: projectArg, board: boardArg,
  title: z.string(),
  description: z.string().optional().describe('Markdown con el contexto de la tarea'),
  column: z.string().optional().describe('Nombre de la columna'),
  checklist: z.array(z.string()).optional().describe('Pasos de la tarea'),
  labels: z.array(z.string()).optional().describe('Nombres de etiquetas'),
  docs: z.array(z.string()).optional().describe('Rutas de páginas del proyecto a enlazar'),
  icon: iconArg,
  start: z.string().optional().describe('Fecha de inicio AAAA-MM-DD ("" para quitarla)'),
  due: z.string().optional().describe('Vencimiento AAAA-MM-DD o AAAA-MM-DDTHH:mm ("" para quitarlo)'),
}, ({ project, board, ...rest }) => cardText(s.createCard(project, board, rest)));

tool('card_get', 'Leer una tarjeta completa: contexto, etiquetas, páginas enlazadas y checklist con ids.', { id: z.string() },
  ({ id }) => cardText(s.getCard(id)));

tool('card_update', 'Cambiar título, descripción, columna (mover), etiquetas, páginas enlazadas o icono de una tarjeta. Las listas sustituyen a las anteriores.', {
  id: z.string(), title: z.string().optional(), description: z.string().optional(), column: z.string().optional(),
  labels: z.array(z.string()).optional(), docs: z.array(z.string()).optional(), icon: iconArg,
  start: z.string().optional().describe('Fecha de inicio AAAA-MM-DD ("" para quitarla)'),
  due: z.string().optional().describe('Vencimiento AAAA-MM-DD o AAAA-MM-DDTHH:mm ("" para quitarlo)'),
  due_done: z.boolean().optional().describe('Marcar la fecha de vencimiento como completada'),
}, ({ id, due_done, ...patch }) => cardText(s.updateCard(id, { ...patch, dueDone: due_done })));

tool('card_move', 'Mover una tarjeta a otro tablero (o proyecto). Conserva notas e historial.', {
  id: z.string(), project: projectArg, board: boardArg, column: z.string().optional().describe('Columna de destino; por defecto la primera'),
}, ({ id, project, board, column }) => cardText(s.moveCardToBoard(id, project, board, column)));

tool('card_copy', 'Copiar una tarjeta (en su tablero, justo debajo, o en otro tablero).', {
  id: z.string(), project: z.string().optional(), board: z.string().optional(), column: z.string().optional(), title: z.string().optional(),
}, ({ id, ...to }) => cardText(s.duplicateCard(id, to)));

tool('card_attach_link', 'Adjuntar un enlace web a una tarjeta.', { id: z.string(), url: z.string(), name: z.string().optional() },
  ({ id, url, name }) => cardText(s.addLink(id, { url, name })));

tool('card_delete', 'Borrar una tarjeta (va a la papelera 30 días).', { id: z.string() }, ({ id }) => { s.deleteCard(id); return 'ok'; });

tool('card_archive', 'Archivar una tarjeta (sale del tablero pero se conserva) o sacarla del archivo.', {
  id: z.string(), archived: z.boolean().optional().describe('false para desarchivar'),
}, ({ id, archived = true }) => cardText(s.archiveCard(id, archived)));

tool('card_note', 'Dejar una nota de trabajo en la tarjeta: qué se hizo, qué falta, decisiones. Se ve en la app y en card_get.', {
  id: z.string(), text: z.string().describe('Markdown corto'),
}, ({ id, text }) => cardText(s.addNote(id, text)));

tool('card_search', 'Buscar tarjetas por texto (título, descripción, pasos, notas y etiquetas), en un proyecto o en todos.', {
  query: z.string(), project: z.string().optional(),
}, ({ query, project }) => s.searchCards(query, project).map(c =>
  `- [${c.id}] ${c.title} · ${c.project} / ${c.board} / ${c.column}${c.total ? ` (${c.done}/${c.total})` : ''}${c.archived ? ' · archivada' : ''}`).join('\n') || 'Sin resultados');

tool('checklist_add', 'Añadir elementos a una checklist de la tarjeta. Con group se crean o usan checklists con nombre (p. ej. "Pruebas").', {
  card_id: z.string(), items: z.array(z.string()), group: z.string().optional().describe('Nombre de la checklist; sin él va a la principal'),
}, ({ card_id, items, group }) => cardText(s.addChecklist(card_id, items, group)));

tool('checklist_update', 'Marcar/desmarcar, renombrar o quitar un elemento de checklist.', {
  card_id: z.string(), item_id: z.string(), done: z.boolean().optional(), text: z.string().optional(), remove: z.boolean().optional(),
}, ({ card_id, item_id, ...patch }) => cardText(s.updateChecklistItem(card_id, item_id, patch)));

// ---------- Páginas ----------
tool('doc_list', 'Listar las páginas de un proyecto (rutas anidadas).', { project: projectArg },
  ({ project }) => s.listPages(project).map(p => p.path).join('\n') || '(sin páginas)');

tool('doc_read', 'Leer una página.', { project: projectArg, path: z.string() }, ({ project, path }) => s.readPage(project, path).content);

tool('doc_write', 'Crear o sobrescribir una página markdown. Las páginas padre de la ruta se crean solas. Enlaza otras páginas con [[Ruta/Página]]. Imágenes: ponlas con su ruta absoluta en disco, ![texto](C:/ruta/captura.png); Taskvia las copia al proyecto y deja el enlace apuntando a su copia. Tamaño y marco van en el texto alternativo separados por |: ![texto|50%](…) o ![texto|320](…) para hacerla más pequeña (% del ancho o px), y |movil o |pc para enmarcarla en un iPhone o en una ventana de Mac (![texto|40%|movil](…)).', {
  project: projectArg, path: z.string().describe('Ej. "API/Autenticación"'), content: z.string(), icon: iconArg,
}, ({ project, path, content, icon }) => { s.writePage(project, path, { content, icon }); return 'ok'; });

tool('doc_editing', 'Avisar de que vas a editar una página en varios pasos (editing: true) o de que has terminado (false). Mientras tanto la app enseña un robot junto a la página y no deja editarla; caduca sola a los 10 minutos.', {
  project: projectArg, path: z.string(), editing: z.boolean(),
}, ({ project, path, editing }) => { s.setAiEditing(project, path, editing); return editing ? 'Marcada: la app la bloquea mientras la editas' : 'Liberada'; });

tool('doc_delete', 'Borrar una página y sus subpáginas (van a la papelera 30 días).', { project: projectArg, path: z.string() },
  ({ project, path }) => { s.deletePage(project, path); return 'ok'; });

tool('doc_search', 'Buscar texto en las páginas (de un proyecto o de todos). Devuelve proyecto / ruta:línea.', {
  query: z.string(), project: z.string().optional(),
}, ({ query, project }) => s.searchPages(query, project).join('\n') || 'Sin resultados');

// ---------- Papelera ----------
tool('trash_list', 'Ver lo borrado en los últimos 30 días.', {}, () => s.listTrash().map(t =>
  `- [${t.id}] ${t.kind}: ${t.title}${t.project ? ` (${t.project})` : ''} · ${when(t.deletedAt)} por ${t.by}`).join('\n') || 'La papelera está vacía');

tool('trash_restore', 'Restaurar algo de la papelera por su id.', { id: z.string() }, ({ id }) => s.restoreTrash(id));

await server.connect(new StdioServerTransport());
