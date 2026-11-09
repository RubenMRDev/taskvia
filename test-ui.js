// Pruebas de la interfaz dentro de la app de escritorio (Electron), con datos de prueba en una carpeta temporal.
// Recorren las historias de usuario con ratón y teclado reales. `npm run test:ui`
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron } from 'playwright-core';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tablero-ui-'));
process.env.TABLERO_DIR = dir;
process.env.TABLERO_PORT = '4596';
const s = await import('./store.js');

// Datos de partida
s.createProject({ name: 'Demo', emoji: '🧪' });
s.createProject({ name: 'Otro', emoji: '📦' });
s.createBoard('Demo', { name: 'Sprint' });
s.createCard('Demo', 'Sprint', { title: 'Primera tarea', checklist: ['Paso 1', 'Paso 2'], labels: ['bug'] });
s.createCard('Demo', 'Sprint', { title: 'Segunda', labels: ['web'] });
s.writePage('Demo', 'Guía', { content: '# Guía\n\nTexto inicial.' });
s.setAiEditing('Demo', 'Guía', false); // los datos de partida los escribe la prueba, no la IA
s.createBoard('Otro', { name: 'Backlog' });
const sprint = () => s.getBoard('Demo', 'Sprint');
const card = title => sprint().cards.find(c => c.title === title);

const app = await electron.launch({
  executablePath: path.join(import.meta.dirname, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron'),
  args: [import.meta.dirname],
  env: { ...process.env },
});
const win = await app.firstWindow();
await win.emulateMedia({ colorScheme: null }); // que mande el tema nativo de Electron, no la emulación de Playwright
await win.evaluate(() => { localStorage.clear(); location.hash = '#/'; });
await win.reload();
await win.setViewportSize({ width: 1360, height: 860 }).catch(() => {});

const until = async (fn, msg, ms = 5000) => { // espera a que algo sea cierto (el tablero se sincroniza cada 2 s)
  const end = Date.now() + ms;
  for (;;) { try { if (await fn()) return; } catch {} if (Date.now() > end) throw new Error('No ocurrió: ' + msg); await win.waitForTimeout(100); }
};
let n = 0;
async function step(name, fn) {
  n++;
  try { await fn(); console.log(`✓ ${n}. ${name}`); }
  catch (e) {
    const shot = path.join(os.tmpdir(), `tablero-ui-fallo-${n}.png`);
    await win.screenshot({ path: shot }).catch(() => {});
    console.error(`✗ ${n}. ${name}\n  ${e.message}\n  Captura: ${shot}`);
    await app.close(); fs.rmSync(dir, { recursive: true, force: true });
    process.exit(1);
  }
}
const main = win.locator('#main'), sb = win.locator('#sb');

await step('Arranca con los proyectos en la barra lateral', async () => {
  await sb.locator('.row.proj', { hasText: 'Demo' }).waitFor();
  await sb.locator('.row.proj', { hasText: 'Otro' }).waitFor();
});

await step('Abre el tablero y crea una tarjeta escribiendo', async () => {
  await sb.locator('.row', { hasText: 'Sprint' }).click();
  await main.locator('.card').first().waitFor();
  assert.equal(await main.locator('.card').count(), 2);
  await main.locator('.col').first().locator('.add-card').click();
  await win.keyboard.type('Tercera');
  await win.keyboard.press('Enter');
  await win.keyboard.press('Escape');
  await until(() => card('Tercera'), 'la tarjeta Tercera se guarda');
  await until(async () => await main.locator('.card').count() === 3, 'se ven 3 tarjetas');
});

await step('Vista lateral: marca un paso, deja una nota y aparece en el historial', async () => {
  await main.locator('.card', { hasText: 'Primera tarea' }).click();
  const peek = win.locator('#peek');
  await peek.locator('.title').waitFor();
  await peek.locator('.item:has(input[value="Paso 1"]) input[type=checkbox]').check();
  await until(() => card('Primera tarea').checklist[0].done, 'el paso queda marcado');
  await peek.locator('#note-add').fill('Falta revisar en móvil');
  await peek.locator('#note-add').press('Control+Enter');
  await peek.locator('.note', { hasText: 'Falta revisar en móvil' }).waitFor();
  assert.equal(card('Primera tarea').notes.at(-1).by, 'tú');
  await peek.locator('.activity summary').click();
  await peek.locator('.activity li', { hasText: 'marcó «Paso 1»' }).waitFor();
});

await step('Borrar una tarjeta la manda a la papelera y «Deshacer» la recupera', async () => {
  await win.locator('#peek [data-act="card-delete"]').click();
  await until(() => !card('Primera tarea'), 'la tarjeta sale del tablero');
  await win.locator('#toast .toast-act', { hasText: 'Deshacer' }).click();
  await until(() => card('Primera tarea'), 'la tarjeta vuelve');
  await win.keyboard.press('Escape');
});

await step('Archivar con clic derecho y devolverla desde el archivo', async () => {
  await main.locator('.card', { hasText: 'Segunda' }).click({ button: 'right' });
  await win.locator('#pop .opt', { hasText: 'Archivar' }).click();
  await until(() => card('Segunda').archived, 'queda archivada');
  await until(async () => !(await main.locator('.card', { hasText: 'Segunda' }).count()), 'desaparece del tablero');
  await main.locator('[data-act="archived"]').click();
  await win.locator('#pop [data-v^="restore:"]').click();
  await until(() => !card('Segunda').archived, 'vuelve al tablero');
});

await step('Filtrar por etiqueta', async () => {
  await win.keyboard.press('Escape');
  await main.locator('[data-act="label-filter"]').click();
  await win.locator('#pop .opt', { hasText: 'bug' }).click();
  await win.keyboard.press('Escape');
  await until(async () => await main.locator('.card').count() === 1, 'solo queda la tarjeta con «bug»');
  await main.locator('[data-act="clear-filters"]').click();
  await until(async () => await main.locator('.card').count() === 3, 'vuelven las 3');
});

await step('Vista lista del mismo tablero', async () => {
  await main.locator('.view-tab', { hasText: 'Lista' }).click();
  await until(async () => await main.locator('.card-row').count() === 3, 'la tabla tiene 3 filas');
  await main.locator('.card-row', { hasText: 'Tercera' }).click();
  await win.locator('#peek .title', { hasText: 'Tercera' }).waitFor();
  await win.keyboard.press('Escape');
  await main.locator('.view-tab', { hasText: 'Tablero' }).click();
  await main.locator('.col').first().waitFor();
});

await step('Arrastrar una columna para reordenar', async () => {
  const before = sprint().columns.map(c => c.name);
  const from = await main.locator('.col').nth(2).locator('.col-head .grow').boundingBox();
  const to = await main.locator('.col').nth(0).boundingBox();
  await win.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await win.mouse.down();
  await win.mouse.move(to.x + 40, to.y + 60, { steps: 12 });
  await win.mouse.move(to.x + 20, to.y + 60, { steps: 4 });
  await win.mouse.up();
  await until(() => sprint().columns[0].name === before[2], `«${before[2]}» pasa a ser la primera`);
});

await step('Marcar el tablero como favorito', async () => {
  await win.locator('#fav-btn').click();
  await sb.locator('#fav-list .row', { hasText: 'Sprint' }).waitFor();
  assert.ok(s.getSettings().favorites.some(f => f.kind === 'board'));
});

await step('Editor: menú «/» para un título y «[[» para enlazar una página nueva', async () => {
  await sb.locator('.row', { hasText: 'Guía' }).click();
  const ed = main.locator('.rte');
  await ed.waitFor();
  await ed.locator('p').last().click();
  await win.keyboard.press('End');
  await win.keyboard.press('Enter');
  await win.keyboard.type('/tít');
  await win.locator('#pop.inline-menu').waitFor();
  await win.keyboard.type('ulo 2');
  await win.keyboard.press('Enter');
  await win.keyboard.type('Sección nueva');
  await win.keyboard.press('Enter');
  await win.keyboard.type('Ver [[');
  await win.locator('#pop.inline-menu').waitFor();
  await win.keyboard.type('Anexo');
  await win.locator('#pop .opt', { hasText: 'Crear página «Anexo»' }).waitFor();
  await win.keyboard.press('Enter');
  await until(() => /## Sección nueva/.test(s.readPage('Demo', 'Guía').content), 'se guarda el título 2', 6000);
  await until(() => s.readPage('Demo', 'Guía').content.includes('[[Anexo]]'), 'se guarda el enlace [[Anexo]]', 6000);
  assert.ok(s.listPages('Demo').some(p => p.path === 'Anexo'));
});

await step('Imagen desde el menú «/»: se guarda en el proyecto y en el markdown', async () => {
  const png = path.join(dir, 'punto.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  await win.keyboard.press('Enter');
  await win.keyboard.type('/imagen');
  await win.locator('#pop.inline-menu .opt.kb', { hasText: 'Imagen' }).waitFor(); // la elegida, no solo visible: si no, Enter puede pillar el filtro a medias
  const [chooser] = await Promise.all([win.waitForEvent('filechooser'), win.keyboard.press('Enter')]);
  await chooser.setFiles(png);
  await main.locator('.rte img').waitFor();
  await until(() => /!\[\]\(assets\/[0-9a-f]{8}\.png\)/.test(s.readPage('Demo', 'Guía').content), 'el markdown apunta a assets/', 6000);
});

await step('Barra flotante: al seleccionar una palabra aparece y pone negrita', async () => {
  await main.locator('.rte p', { hasText: 'Ver' }).dblclick({ position: { x: 8, y: 8 } });
  await win.locator('#bubble:not([hidden])').waitFor();
  await win.locator('#bubble [data-bcmd="bold"]').click();
  await until(() => /\*\*Ver\*\*/.test(s.readPage('Demo', 'Guía').content), 'la palabra queda en negrita', 6000);
  await win.keyboard.press('End');
  await until(async () => await win.locator('#bubble').isHidden(), 'la barra se va al quitar la selección');
});

await step('Si la IA cambia la página mientras escribes, avisa y no la pisa', async () => {
  const ed = main.locator('.rte');
  await ed.locator('h2').click();
  await win.keyboard.press('End');
  await win.keyboard.type(' (mía)');
  s.writePage('Demo', 'Guía', { content: 'Cambio de la IA' }); // escribe "otro" mientras tanto
  s.setAiEditing('Demo', 'Guía', false); // aquí se prueba el aviso de choque, no el bloqueo
  await main.locator('.banner.warn').waitFor({ timeout: 8000 });
  assert.equal(s.readPage('Demo', 'Guía').content, 'Cambio de la IA', 'no se ha pisado');
  await main.locator('[data-conflict="mine"]').click();
  await until(() => s.readPage('Demo', 'Guía').content.includes('(mía)'), 'se guarda la tuya al elegirla');
});

await step('Subpágina desde «/»: se crea, su enlace queda en el texto y se abre', async () => {
  await main.locator('.rte p').last().click();
  await win.keyboard.press('End');
  await win.keyboard.press('Enter');
  await win.keyboard.type('/subp');
  await win.locator('#pop.inline-menu .opt', { hasText: 'Subpágina' }).waitFor();
  await win.keyboard.press('Enter');
  await until(() => s.listPages('Demo').some(p => p.path === 'Guía/Sin título'), 'existe la subpágina');
  await until(() => s.readPage('Demo', 'Guía').content.includes('[[Guía/Sin título]]'), 'su enlace está en la página padre');
  await until(async () => decodeURIComponent(await win.evaluate(() => location.hash)).endsWith('Guía/Sin título'), 'se abre la subpágina');
  await win.keyboard.type('Detalles');
  await win.keyboard.press('Enter');
  await until(() => s.listPages('Demo').some(p => p.path === 'Guía/Detalles'), 'se renombra escribiendo el título');
  assert.ok(s.readPage('Demo', 'Guía').content.includes('[[Guía/Detalles]]'), 'el enlace sigue al nuevo nombre');
});

await step('Borrar una página desde la barra lateral y restaurarla en la Papelera', async () => {
  await sb.locator('.row', { hasText: 'Anexo' }).click({ button: 'right' });
  await win.locator('#pop .opt', { hasText: 'Eliminar página' }).click();
  await until(() => !s.listPages('Demo').some(p => p.path === 'Anexo'), 'la página sale del proyecto');
  await sb.locator('[data-act="trash"]').click();
  await main.locator('.trash-row', { hasText: 'Anexo' }).locator('[data-act="restore-trash"]').click();
  await until(() => s.listPages('Demo').some(p => p.path === 'Anexo'), 'la página vuelve');
});

await step('Reordenar proyectos arrastrándolos', async () => {
  await sb.locator('.row.proj', { hasText: 'Otro' }).dragTo(sb.locator('.row.proj', { hasText: 'Demo' }), { targetPosition: { x: 20, y: 4 } });
  await until(() => s.getTree()[0].name === 'Otro', '«Otro» queda el primero');
});

await step('Cambiar el ancho de la barra lateral arrastrando su borde', async () => {
  const box = await win.locator('#sb-resize').boundingBox();
  await win.mouse.move(box.x + 2, box.y + 300);
  await win.mouse.down();
  await win.mouse.move(box.x + 80, box.y + 300, { steps: 5 });
  await win.mouse.up();
  const w = await win.evaluate(() => parseInt(getComputedStyle(document.body).getPropertyValue('--sbw')));
  assert.ok(w > 300 && w <= 420, `ancho ${w}`);
});


const day = n => { const d = new Date(); d.setDate(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

await step('Fechas desde el menú de la tarjeta, insignia en la tarjeta y calendario', async () => {
  await sb.locator('.row', { hasText: 'Sprint' }).first().click();
  await main.locator('.card', { hasText: 'Tercera' }).click({ button: 'right' });
  await win.locator('#pop .opt', { hasText: 'Fechas' }).click();
  await win.locator('#d-due').fill(day(10));
  await win.locator('#d-time').fill('09:30');
  await win.locator('#pop [data-v="save"]').click();
  await until(() => card('Tercera').due === `${day(10)}T09:30`, 'se guarda el vencimiento');
  await main.locator('.card', { hasText: 'Tercera' }).locator('.due').waitFor();
  await main.locator('.view-tab', { hasText: 'Calendario' }).click();
  const chip = main.locator('.cal-card', { hasText: 'Tercera' });
  await chip.waitFor();
  const from = await chip.boundingBox(), to = await main.locator(`.cal-day[data-day="${day(12)}"]`).boundingBox();
  await win.mouse.move(from.x + 10, from.y + 6); await win.mouse.down();
  await win.mouse.move(to.x + 30, to.y + 50, { steps: 10 }); await win.mouse.up();
  await until(() => card('Tercera').due === `${day(12)}T09:30`, 'arrastrar en el calendario cambia el día y conserva la hora');
  await main.locator('.view-tab', { hasText: 'Tablero' }).click();
});

await step('Adjuntar un fichero y usarlo de portada', async () => {
  await main.locator('.card', { hasText: 'Tercera' }).click();
  const png = path.join(dir, 'portada.png');
  fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'));
  const [chooser] = await Promise.all([win.waitForEvent('filechooser'), win.locator('#peek [data-act="attach-file"]').click()]);
  await chooser.setFiles(png);
  await win.locator('#peek .att', { hasText: 'portada.png' }).waitFor();
  await win.locator('#peek .att', { hasText: 'portada.png' }).hover();
  await win.locator('#peek .att [data-act="att-cover"]').click();
  await until(() => String(card('Tercera').cover).startsWith('img:'), 'queda de portada');
  await main.locator('.card', { hasText: 'Tercera' }).locator('.cover-img img').waitFor();
});

await step('Varias checklists en la misma tarjeta', async () => {
  await win.locator('#peek [data-act="add-checklist"]').click();
  await win.locator('#pop .pop-search').fill('QA');
  await win.locator('#pop .pop-search').press('Enter');
  await win.locator('#peek .item-add[data-group="QA"]').fill('Probar en móvil');
  await win.locator('#peek .item-add[data-group="QA"]').press('Enter');
  await until(() => card('Tercera').checklist.some(i => i.group === 'QA' && i.text === 'Probar en móvil'), 'la checklist QA tiene su paso');
  await win.locator('#peek .check[data-group="QA"] .gname', { hasText: 'QA' }).waitFor();
});

await step('Convertir en plantilla y crear otra tarjeta desde ella', async () => {
  await win.locator('#peek [data-act="card-menu"]').click();
  await win.locator('#pop .opt', { hasText: 'Convertir en plantilla' }).click();
  await until(() => card('Tercera').template, 'es plantilla');
  await win.keyboard.press('Escape');
  const before = sprint().cards.length;
  await main.locator('.col').first().locator('[data-act="col-template"]').click();
  await win.locator('#pop .opt', { hasText: 'Tercera' }).click();
  await until(() => sprint().cards.length === before + 1 && sprint().cards.filter(c => c.title === 'Tercera').length === 2, 'hay una tarjeta nueva desde la plantilla');
  await win.keyboard.press('Escape');
});

await step('Mover una tarjeta a otro tablero de otro proyecto', async () => {
  await main.locator('.card', { hasText: 'Segunda' }).click({ button: 'right' });
  await win.locator('#pop .opt', { hasText: 'Mover a otro tablero' }).click();
  await win.locator('#pop .opt', { hasText: 'Backlog' }).click();
  await until(() => s.getBoard('Otro', 'Backlog').cards.some(c => c.title === 'Segunda') && !card('Segunda'), 'está en Otro / Backlog');
});

await step('Plegar y desplegar una columna', async () => {
  await main.locator('.col').first().locator('[data-act="col-menu"]').click();
  await win.locator('#pop .opt', { hasText: 'Plegar columna' }).click();
  await main.locator('.col.collapsed').waitFor();
  await main.locator('.col.collapsed [data-act="col-expand"]').click();
  await until(async () => !(await main.locator('.col.collapsed').count()), 'vuelve a desplegarse');
});

await step('Atajos: «?» abre la ayuda y «3» cambia al calendario', async () => {
  await main.locator('.board-head .title').click({ position: { x: 2, y: 2 } }).catch(() => {});
  await win.keyboard.press('Escape');
  await main.locator('.bar .meta').click();
  await win.keyboard.press('?');
  await win.locator('#keys[open]').waitFor();
  await win.keyboard.press('Escape');
  await win.keyboard.press('3');
  await main.locator('.cal-grid').waitFor();
  await win.keyboard.press('1');
  await main.locator('.board .col').first().waitFor();
});

await step('Ajustes: tema oscuro y vuelta al del sistema', async () => {
  await win.keyboard.press('Control+,');
  await win.locator('#settings [data-set="theme"][data-val="dark"]').click();
  await until(() => win.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches), 'la app pasa a oscuro');
  await win.locator('#settings [data-set="theme"][data-val="system"]').click();
  await win.locator('#settings [data-close]').click();
  assert.equal(s.getSettings().theme, 'system');
});

await step('Nuevo tablero con plantilla «Tareas con tamaño»: nace con sus columnas y etiquetas', async () => {
  await win.locator('#tree [data-kind="project"]', { hasText: 'Otro' }).click({ button: 'right' });
  await win.locator('#pop .opt', { hasText: 'Nuevo tablero' }).click();
  await win.locator('#new-board[open] [data-tpl="size"]').click();
  await win.locator('#nb-name').fill('Con tamaño');
  await win.locator('#new-board button[value="ok"]').click();
  await main.locator('.board-head .title', { hasText: 'Con tamaño' }).waitFor();
  const nb = s.getBoard('Otro', 'Con tamaño');
  assert.deepEqual(nb.columns.map(c => c.name), ['Por hacer', 'En curso', 'Hecho']);
  assert.deepEqual(nb.labels.map(l => l.name), ['Pequeña', 'Mediana', 'Grande']);
});

await step('Portada desde el menú de la tarjeta: color y tamaño completo', async () => {
  const id = s.createCard('Otro', 'Con tamaño', { title: 'Con portada' }).card.id;
  await main.locator('.card', { hasText: 'Con portada' }).click({ button: 'right' });
  await win.locator('#pop .opt', { hasText: 'Portada' }).click();
  await win.locator('#pop [data-v="color:green"]').click();
  await win.locator('#pop [data-v="size:full"]').click();
  await main.locator('.card.full-cover.c-green', { hasText: 'Con portada' }).waitFor();
  const c = s.getBoard('Otro', 'Con tamaño').cards.find(x => x.id === id);
  assert.equal(c.cover, 'green'); assert.equal(c.coverSize, 'full');
  await win.keyboard.press('Escape');
});

await step('La IA está editando: robot en la barra lateral y página solo de lectura', async () => {
  s.setAiEditing('Demo', 'Guía', true);
  await win.locator('#tree [data-kind="page"][data-path="Guía"] .ai-busy').waitFor({ timeout: 8000 });
  await win.locator('#tree [data-kind="page"][data-path="Guía"]').click();
  await main.locator('.ai-banner').waitFor();
  assert.equal(await main.locator('.rte').getAttribute('contenteditable'), 'false');
  s.setAiEditing('Demo', 'Guía', false);
  await until(async () => (await main.locator('.rte').getAttribute('contenteditable')) === 'true', 'se desbloquea al terminar', 8000);
  assert.equal(await win.locator('#tree .ai-busy').count(), 0);
});

await step('Exportar la página a Markdown y a PDF desde el menú «…»', async () => {
  const out = path.join(dir, 'export');
  fs.mkdirSync(out);
  for (const [fmt, file] of [['md', 'Guía.md'], ['pdf', 'Guía.pdf']]) {
    await app.evaluate(({ dialog }, f) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: f }); }, path.join(out, file));
    await win.locator('#view-menu').click();
    await win.locator(`#pop [data-v="export-${fmt}"]`).click();
    await until(() => fs.existsSync(path.join(out, file)) && fs.statSync(path.join(out, file)).size > 0, `se crea ${file}`, 15000);
  }
  assert.match(fs.readFileSync(path.join(out, 'Guía.md'), 'utf8'), /^# Guía/);
  assert.equal(fs.readFileSync(path.join(out, 'Guía.pdf')).subarray(0, 4).toString(), '%PDF');
});

await app.close();
fs.rmSync(dir, { recursive: true, force: true });
console.log(`\nOK: ${n} pruebas de interfaz`);
