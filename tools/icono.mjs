// Genera build/icon.png (1024) y build/icon.ico (16–256) a partir de public/icon.svg.
// Se ejecuta con Electron, que sabe pintar el SVG: `npx electron tools/icono.mjs`
import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const svg = fs.readFileSync(path.join(root, 'public', 'icon.svg'), 'utf8');
const svgSmall = fs.readFileSync(path.join(root, 'public', 'icon-small.svg'), 'utf8'); // dibujo propio para 16–48 px
const out = path.join(root, 'build');

// ICO con las imágenes PNG dentro (válido en Windows Vista y posteriores)
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, e); head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([head, ...pngs.map(p => p.data)]);
}

app.on('window-all-closed', () => {}); // entre un render y otro no queda ventana: que no se cierre la app
app.whenReady().then(async () => {
  fs.mkdirSync(out, { recursive: true });
  const render = async (size, source = svg) => { // se pinta grande y los tamaños pequeños se reducen desde aquí
    const win = new BrowserWindow({ width: size, height: size, show: false, frame: false, transparent: true, useContentSize: true,
      webPreferences: { offscreen: true } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(
      `<html><body style="margin:0;background:transparent">${source.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`));
    await new Promise(r => setTimeout(r, 200));
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size });
    win.destroy();
    return img.resize({ width: size, height: size }).toPNG();
  };
  const big = await render(1024);
  fs.writeFileSync(path.join(out, 'icon.png'), big);
  const { nativeImage } = await import('electron');
  const src = nativeImage.createFromBuffer(big), small = nativeImage.createFromBuffer(await render(1024, svgSmall));
  const pngs = [16, 24, 32, 48, 64, 128, 256].map(size => ({ size, data: (size <= 48 ? small : src).resize({ width: size, height: size, quality: 'best' }).toPNG() }));
  fs.writeFileSync(path.join(out, 'icon.ico'), ico(pngs));
  console.log('Iconos en', out);
  app.quit();
});
