// Prueba de humo: arranca mcp.js como lo haría un cliente MCP y recorre el flujo "pego una tarea y vamos con ella". `npm test`
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tablero-'));
const client = new Client({ name: 'test', version: '1' });
await client.connect(new StdioClientTransport({
  command: 'node', args: [path.join(import.meta.dirname, 'mcp.js')],
  env: { ...process.env, TABLERO_DIR: dir, TABLERO_PORT: '4599' },
}));
const call = async (name, args = {}) => {
  const r = await client.callTool({ name, arguments: args });
  return r.content[0].text;
};

await call('project_create', { name: 'Acme', icon: 'house:orange' });
await call('board_create', { project: 'acme', name: 'Sprint' });
await call('board_create', { project: 'Acme', name: 'Ideas', columns: ['Idea', 'Hecho'] });
assert.match(await call('board_create', { project: 'Acme', name: 'sprint' }), /Ya existe el tablero/);

await call('doc_write', { project: 'Acme', path: 'API/Auth', content: '# Auth\nUsamos OAuth' });
const created = await call('card_create', {
  project: 'Acme', board: 'Sprint', title: 'Login con Google', description: 'Pegado de Jira',
  checklist: ['Botón', 'Callback'], labels: ['backend'], docs: ['API/Auth'],
});
const id = created.match(/\[(\w{8})\]/)[1];
const itemId = created.match(/Botón {2}\(id: (\w{8})\)/)[1];
assert.match(created, /Etiquetas: backend/);
assert.match(created, /Páginas enlazadas: API\/Auth/);

await call('checklist_update', { card_id: id, item_id: itemId, done: true });
await call('card_update', { id, column: 'en curso' });
assert.match(await call('board_get', { project: 'Acme', board: 'Sprint' }), /## En curso\n- \[\w{8}\] Login con Google \(1\/2\) · backend/);
assert.match(await call('card_update', { id, column: 'Nope' }), /No existe la columna/);

const tree = await call('project_list');
assert.match(tree, /# Acme/);
assert.match(tree, /Páginas: API, API\/Auth/);
assert.match(await call('doc_search', { query: 'oauth' }), /Acme \/ API\/Auth:2/);
assert.match(await call('doc_read', { project: 'Acme', path: '../../escape' }), /no válido/);

// La UI que sirve el propio MCP: un error del store responde 400 y el MCP sigue vivo.
const bad = await fetch('http://localhost:4599/api/getBoard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '["Nope","x"]' });
assert.equal(bad.status, 400);
assert.match((await bad.json()).error, /No existe el proyecto/);
assert.match(await call('project_list'), /Acme/);

// Renombrar una página arrastra subpáginas y enlaces; borrarla quita los enlaces.
process.env.TABLERO_DIR = dir;
const s = await import('./store.js');
s.renamePage('Acme', 'API', 'Backend');
assert.match(await call('card_get', { id }), /Páginas enlazadas: Backend\/Auth/);
assert.equal(s.readPage('Acme', 'Backend/Auth').content, '# Auth\nUsamos OAuth');
assert.equal(s.createPage('Acme', { parent: 'Backend' }).path, 'Backend/Sin título');
assert.equal(s.createPage('Acme', { parent: 'Backend' }).path, 'Backend/Sin título 2');
await call('doc_delete', { project: 'Acme', path: 'Backend' });

// Ajustes: valores válidos, se guardan y marcan el icono por defecto de lo nuevo.
assert.equal(s.getSettings().theme, 'system');
assert.throws(() => s.saveSettings({ theme: 'rosa' }), /no válido/);
s.saveSettings({ accent: 'green' });
assert.equal(s.getSettings().accent, 'green');
assert.equal(s.createProject({ name: 'Con iconos' }) && s.getTree().find(p => p.name === 'Con iconos').emoji, 'lucide:folder:gray');
assert.doesNotMatch(await call('card_get', { id }), /Páginas enlazadas/);

// Iconos: solo Lucide; los emojis antiguos se convierten y lo desconocido cae al icono por defecto.
assert.equal(s.toIcon('🚀'), 'lucide:rocket:purple');
assert.equal(s.toIcon('bug'), 'lucide:bug:gray');
assert.equal(s.toIcon('lucide:no-existe:red', 'board'), 'lucide:square-kanban:blue');
assert.equal(s.toIcon('🦄'), '');

// Fechas, plantillas, varias checklists y adjuntos
assert.match(await call('card_update', { id, due: '2026-12-01T10:30', start: '2026-11-20' }), /Fechas: inicio 2026-11-20 · vence 2026-12-01 10:30/);
assert.match(await call('card_update', { id, due_done: true }), /\(completada\)/);
assert.match(await call('card_update', { id, due: 'mañana' }), /no válida/);
assert.match(await call('checklist_add', { card_id: id, items: ['Unitarias', 'E2E'], group: 'Pruebas' }), /### Pruebas\n- \[ \] Unitarias/);
s.renameChecklist(id, 'Pruebas', 'QA');
assert.ok(s.getCard(id).card.checklist.some(i => i.group === 'QA'));
s.deleteChecklist(id, 'QA');
assert.ok(!s.getCard(id).card.checklist.some(i => i.group));
assert.match(await call('card_attach_link', { id, url: 'https://docs.expo.dev', name: 'Docs de Expo' }), /Adjuntos: Docs de Expo <https:\/\/docs.expo.dev>/);
assert.match(await call('card_attach_link', { id, url: 'javascript:alert(1)' }), /http/);
const withFile = s.addAttachment(id, { name: 'informe.pdf', base64: Buffer.from('%PDF').toString('base64') }).card;
const pdf = withFile.attachments.find(a => a.name === 'informe.pdf');
assert.match(pdf.file, /^assets\/[0-9a-f]{8}\.pdf$/);
assert.throws(() => s.updateCard(id, { cover: 'img:' + pdf.id }), /imagen/);
const png = s.addAttachment(id, { name: 'captura.png', base64: Buffer.from('png').toString('base64') }).card.attachments.at(-1);
assert.equal(s.updateCard(id, { cover: 'img:' + png.id }).card.cover, 'img:' + png.id);
s.removeAttachment(id, png.id);
assert.equal(s.getCard(id).card.cover, null);

// Copiar y mover tarjetas, columnas y tableros
const copy = s.duplicateCard(id).card;
assert.equal(copy.title, 'Login con Google (copia)');
assert.notEqual(copy.id, id);
const sprintNow = s.getBoard('Acme', 'Sprint');
assert.equal(sprintNow.cards.indexOf(sprintNow.cards.find(c => c.id === copy.id)), sprintNow.cards.findIndex(c => c.id === id) + 1, 'la copia va justo debajo');
s.createProject({ name: 'Otro' }); s.createBoard('Otro', { name: 'Backlog' });
assert.match(await call('card_move', { id: copy.id, project: 'Otro', board: 'Backlog' }), /Proyecto: Otro · Tablero: Backlog · Columna: Por hacer/);
const moved = s.getCard(copy.id).card;
assert.ok(fs.existsSync(path.join(dir, 'projects', 'Otro', moved.attachments.find(a => a.file).file)), 'los ficheros viajan con la tarjeta');
assert.deepEqual(moved.docs, [], 'los enlaces a páginas de otro proyecto se quitan');
assert.equal(s.getBoard('Otro', 'Backlog').labels[0].name, 'backend');
s.updateCard(id, { template: true });
const fromTpl = s.createFromTemplate(id, { column: 'Hecho' }).card;
assert.equal(fromTpl.title, 'Login con Google');
assert.ok(!fromTpl.template && fromTpl.checklist.every(i => !i.done));
s.copyColumn('Acme', 'Sprint', 'Hecho');
assert.ok(s.getBoard('Acme', 'Sprint').columns.some(c => c.name === 'Hecho (copia)'));
s.updateColumn('Acme', 'Sprint', 'Hecho (copia)', { collapsed: true });
assert.ok(s.getBoard('Acme', 'Sprint').columns.find(c => c.name === 'Hecho (copia)').collapsed);
s.createCard('Acme', 'Sprint', { title: 'Zeta', column: 'Por hacer', due: '2026-01-01' });
s.createCard('Acme', 'Sprint', { title: 'Alfa', column: 'Por hacer' });
s.sortColumn('Acme', 'Sprint', 'Por hacer', 'title');
const porHacer = () => { const b = s.getBoard('Acme', 'Sprint'); return b.cards.filter(c => c.columnId === b.columns[0].id).map(c => c.title); };
assert.deepEqual(porHacer().slice(0, 2), ['Alfa', 'Zeta']);
s.sortColumn('Acme', 'Sprint', 'Por hacer', 'due');
assert.equal(porHacer()[0], 'Zeta', 'por vencimiento, las que tienen fecha primero');
const dup = s.duplicateBoard('Acme', 'Sprint');
assert.equal(dup.name, 'Sprint (copia)');
assert.equal(dup.cards.length, s.getBoard('Acme', 'Sprint').cards.filter(c => !c.archived).length);
s.updateBoard('Acme', dup.id, { background: 'purple' });
assert.equal(s.getBoard('Acme', dup.id).background, 'purple');

// Subpáginas como texto: crear una con linkInParent deja su [[enlace]] en la página padre
s.writePage('Acme', 'Guía', { content: '# Guía' });
const sub = s.createPage('Acme', { parent: 'Guía', linkInParent: true });
assert.equal(s.readPage('Acme', 'Guía').content, `# Guía\n\n[[${sub.path}]]\n`);

// Papelera: la página borrada vuelve con su enlace en la tarjeta.
const pageTrash = s.listTrash().find(t => t.kind === 'page' && t.path === 'Backend');
assert.ok(pageTrash, 'la página borrada está en la papelera');
s.restoreTrash(pageTrash.id);
assert.match(await call('card_get', { id }), /Páginas enlazadas: Backend\/Auth/);

// Tarjeta a la papelera y de vuelta, con historial de quién hizo qué.
await call('card_delete', { id });
assert.match(await call('trash_list'), /card: Login con Google/);
await call('trash_restore', { id: s.listTrash().find(t => t.kind === 'card').id });
let card = s.getCard(id).card;
assert.ok(card.activity.some(a => a.by === 'ia' && /movió de «Por hacer» a «En curso»/.test(a.text)));
s.asActor('tú', () => s.updateChecklistItem(id, itemId, { done: false }));
assert.ok(s.getCard(id).card.activity.at(-1).by === 'tú');

// Notas de trabajo, búsqueda y archivo.
assert.match(await call('card_note', { id, text: 'Falta el callback de iOS' }), /## Notas\n- .* · ia: Falta el callback de iOS/);
assert.match(await call('card_search', { query: 'callback de ios' }), /Login con Google · Acme \/ Sprint \/ En curso/);
const liveBefore = s.getTree().find(p => p.name === 'Acme').boards.find(b => b.name === 'Sprint').cards;
await call('card_archive', { id });
assert.match(await call('board_get', { project: 'Acme', board: 'Sprint' }), /Archivadas: 1/);
assert.equal(s.getTree().find(p => p.name === 'Acme').boards.find(b => b.name === 'Sprint').cards, liveBefore - 1);
await call('card_archive', { id, archived: false });

// Aviso de choque: si la página o la descripción cambian mientras se editan, no se pisa en silencio.
const v1 = s.readPage('Acme', 'Backend/Auth');
s.writePage('Acme', 'Backend/Auth', { content: 'cambio de la IA' });
assert.throws(() => s.writePage('Acme', 'Backend/Auth', { content: 'lo mío', baseHash: v1.hash }), e => e.code === 'conflict' && e.current === 'cambio de la IA');
const v2 = s.readPage('Acme', 'Backend/Auth');
assert.equal(s.writePage('Acme', 'Backend/Auth', { content: 'lo mío', baseHash: v2.hash }).path, 'Backend/Auth');
assert.throws(() => s.updateCard(id, { description: 'x', baseDescription: 'otra cosa' }), e => e.code === 'conflict');

// Enlaces [[ ]] entre páginas: cuentan como "enlazada desde" y se reescriben al renombrar.
s.writePage('Acme', 'Índice', { content: 'Ver [[Backend/Auth]] y [[Backend/Auth|el login]]' });
assert.ok(s.backlinks('Acme', 'Backend/Auth').some(r => r.page?.path === 'Índice'));
s.renamePage('Acme', 'Backend', 'Servidor');
assert.equal(s.readPage('Acme', 'Índice').content, 'Ver [[Servidor/Auth]] y [[Servidor/Auth|el login]]');

// Favoritos y orden de proyectos siguen a los renombres y borrados.
s.setFavorite({ kind: 'page', project: 'Acme', path: 'Servidor/Auth' });
s.setFavorite({ kind: 'project', project: 'Con iconos' });
s.renamePage('Acme', 'Servidor', 'API');
assert.ok(s.getSettings().favorites.some(f => f.path === 'API/Auth'));
s.setProjectOrder(['Acme', 'Con iconos']);
s.updateProject('Con iconos', { name: 'Iconos' });
assert.deepEqual(s.getTree().map(p => p.name).slice(0, 2), ['Acme', 'Iconos']);
assert.ok(s.getSettings().favorites.some(f => f.project === 'Iconos'));
s.deleteProject('Iconos');
assert.ok(!s.getSettings().favorites.some(f => f.project === 'Iconos'));
s.createProject({ name: 'Iconos' }); // ocupa el nombre: al restaurar se renombra
assert.equal(s.restoreTrash(s.listTrash().find(t => t.kind === 'project').id).project, 'Iconos (restaurado)');

// Imágenes: solo ficheros de imagen con nombre generado, dentro del proyecto.
const img = s.saveAsset('Acme', 'captura.png', Buffer.from('png').toString('base64'));
assert.match(img.path, /^assets\/[0-9a-f]{8}\.png$/);
assert.ok(fs.existsSync(s.assetPath('Acme', img.path.slice(7))));
assert.throws(() => s.assetPath('Acme', '../project.json'), /no válido/);

// Copias de seguridad.
assert.equal(s.backupIfDue().name, new Date().toISOString().slice(0, 10));
assert.equal(s.backupIfDue(), null);
assert.ok(fs.existsSync(path.join(dir, 'backups', s.listBackups()[0], 'projects', 'Acme', 'project.json')));

// Plantillas de tablero (columnas y etiquetas propias, o vacío) y portada completa
const empty = s.createBoard('Acme', { name: 'En blanco', columns: [] });
assert.equal(empty.columns.length, 0);
const sized = s.createBoard('Acme', { name: 'Tallas', labels: [{ name: 'Pequeña', color: 'green' }, { name: 'Grande', color: 'nope' }] });
assert.deepEqual(sized.labels.map(l => `${l.name}:${l.color}`), ['Pequeña:green', 'Grande:gray']);
const fc = s.createCard('Acme', 'Tallas', { title: 'Portada', cover: 'red' }).card;
s.updateCard(fc.id, { coverSize: 'full' });
assert.equal(s.getBoard('Acme', 'Tallas').cards[0].coverSize, 'full');
s.updateCard(fc.id, { coverSize: 'top' });
assert.equal(s.getBoard('Acme', 'Tallas').cards[0].coverSize, undefined);
s.addAttachment(fc.id, { name: 'foto.png', base64: Buffer.from('png').toString('base64'), cover: true });
assert.match(s.getBoard('Acme', 'Tallas').cards[0].cover, /^img:/);

// Imágenes del disco en una página (ruta o file:///): se copian a assets/ y el enlace apunta a la copia
const shot = path.join(dir, 'captura de prueba.png');
fs.writeFileSync(shot, Buffer.from('png'));
const url = 'file:///' + shot.replace(/\\/g, '/').replace(/ /g, '%20');
s.writePage('Acme', 'Guía con capturas', { content: `![uno](${url})\n\n![dos](<${shot}>)\n\n![falta](C:/no/existe.png)\n\n![web](https://x.test/a.png)` });
const withImgs = s.readPage('Acme', 'Guía con capturas').content;
const copies = [...withImgs.matchAll(/!\[(uno|dos)\]\(assets\/([0-9a-f]{8}\.png)\)/g)];
assert.equal(copies.length, 2, withImgs);
assert.equal(copies[0][2], copies[1][2], 'la misma imagen se copia una vez');
assert.ok(fs.existsSync(s.assetPath('Acme', copies[0][2])));
assert.match(withImgs, /!\[falta\]\(C:\/no\/existe\.png\)/);
assert.match(withImgs, /!\[web\]\(https:\/\/x\.test\/a\.png\)/);

// La IA está editando: lo que escribe por MCP bloquea la página un rato; doc_editing marca y libera
await call('doc_write', { project: 'Acme', path: 'Bloqueo', content: 'de la IA' });
assert.ok(s.readPage('Acme', 'Bloqueo').aiEditing);
assert.ok(s.listPages('Acme').find(p => p.path === 'Bloqueo').aiEditing);
assert.throws(() => s.asActor('tú', () => s.writePage('Acme', 'Bloqueo', { content: 'mío' })), /La IA está editando/);
await call('doc_editing', { project: 'Acme', path: 'Bloqueo', editing: false });
assert.ok(!s.readPage('Acme', 'Bloqueo').aiEditing);
s.asActor('tú', () => s.writePage('Acme', 'Bloqueo', { content: 'mío' }));
await call('doc_editing', { project: 'Acme', path: 'Bloqueo', editing: true });
assert.ok(s.readPage('Acme', 'Bloqueo').aiEditing);
s.setAiEditing('Acme', 'Bloqueo', false);

// Proyecto de ejemplo del primer arranque: se crea entero y sus enlaces apuntan a páginas que existen
(await import('./ejemplo.js')).seedExample();
const demo = s.getBoard('Bienvenida', 'Primeros pasos');
assert.equal(demo.cards.length, 6);
assert.ok(demo.cards.flatMap(c => c.docs).every(d => s.readPage('Bienvenida', d)));
assert.match(s.readPage('Bienvenida', 'Léeme').content, /\[\[Trabajar con la IA\]\]/);

await client.close();
fs.rmSync(dir, { recursive: true });
console.log('OK');
