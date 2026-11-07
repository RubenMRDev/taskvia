// Servidor local de la UI (lo usan la app Electron y el MCP).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import * as s from './store.js';

const PORT = Number(process.env.TASKVIA_PORT || process.env.ORDENIA_PORT || process.env.TABLERO_PORT) || 4545;
export const URL = `http://localhost:${PORT}`;
const here = f => path.join(import.meta.dirname, f);
const PUBLIC = here('public');
const vendor = {
  '/marked.js': 'node_modules/marked/lib/marked.umd.js',
  '/icons.svg': 'node_modules/lucide-static/sprite.svg',
  '/turndown.js': 'node_modules/turndown/lib/turndown.browser.umd.js',
  '/favicon.ico': 'build/icon.ico',
  '/turndown-gfm.js': 'node_modules/turndown-plugin-gfm/dist/turndown-plugin-gfm.js',
};
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
const MAX_BODY = 25 * 1024 * 1024; // imágenes pegadas en base64

// La UI puede llamar a cualquier función pública del store.
const INTERNAL = ['asActor', 'assetPath'];
const api = Object.fromEntries(Object.entries(s).filter(([k, v]) => typeof v === 'function' && !INTERNAL.includes(k)));

function sendFile(res, file, cache, download = false) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  // Un adjunto que no es imagen se descarga siempre: nunca se interpreta dentro de la app (un .html subido no puede ejecutar nada)
  res.writeHead(200, download
    ? { 'Content-Type': 'application/octet-stream', 'Content-Disposition': 'attachment', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': cache }
    : { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': cache });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer((req, res) => {
  // Solo localhost: evita DNS rebinding y que otras webs escriban aquí (JSON obliga a preflight CORS).
  if (![`localhost:${PORT}`, `127.0.0.1:${PORT}`].includes(req.headers.host)) return res.writeHead(403).end();
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch { return res.writeHead(400).end(); }

  if (req.method === 'GET') {
    if (Object.hasOwn(vendor, url)) return sendFile(res, here(vendor[url]), 'max-age=86400');
    if (url.startsWith('/asset/')) { // imágenes de las páginas: /asset/<proyecto>/<fichero>
      const [project, file] = url.slice(7).split('/');
      try { return sendFile(res, s.assetPath(project, file), 'max-age=86400', !/\.(png|jpe?g|gif|webp)$/i.test(file)); } catch { return res.writeHead(404).end(); }
    }
    const file = path.resolve(PUBLIC, '.' + (url === '/' ? '/index.html' : url));
    if (!file.startsWith(PUBLIC + path.sep)) return res.writeHead(403).end();
    return sendFile(res, file, 'no-store');
  }

  const fn = req.method === 'POST' && url.startsWith('/api/') && Object.hasOwn(api, url.slice(5)) && api[url.slice(5)];
  if (!fn || req.headers['content-type'] !== 'application/json') return res.writeHead(404).end();

  let body = '', size = 0;
  req.setEncoding('utf8');
  req.on('data', d => { size += d.length; if (size > MAX_BODY) { res.writeHead(413).end(); req.destroy(); } else body += d; });
  req.on('end', () => {
    // El resultado se calcula antes de escribir cabeceras: un error del store responde 400 y nunca tumba
    // el proceso (que puede ser el MCP de la IA). Lo que se hace desde la UI queda firmado como "tú".
    let status = 200, out;
    try { out = s.asActor('tú', () => fn(...JSON.parse(body || '[]'))) ?? null; }
    catch (e) { status = e.code === 'conflict' ? 409 : 400; out = { error: e.message, code: e.code, current: e.current }; }
    res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(out));
  });
});

// Si el puerto ya está cogido es otra instancia (p. ej. la del MCP) sirviendo lo mismo: se reutiliza.
export const ready = new Promise(resolve => {
  server.on('error', e => { if (e.code !== 'EADDRINUSE') throw e; resolve(); });
  server.listen(PORT, '127.0.0.1', () => { console.error(`Taskvia en ${URL}`); resolve(); });
});
