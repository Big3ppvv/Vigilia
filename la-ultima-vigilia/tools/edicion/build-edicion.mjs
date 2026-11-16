/*
 * Empaqueta la edición completa: el HTML autónomo de siempre más las cartas
 * ilustradas y la banda sonora, incrustadas en base64. Se escribe por partes
 * (nunca entera en memoria) y no se sube al repositorio.
 *
 *   node build.mjs && node tools/edicion/build-edicion.mjs
 */
import { readFileSync, readdirSync, statSync, createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { once } from 'node:events';

const root = new URL('../../', import.meta.url);
const edition = new URL('../edicion-completa/', root);
const sources = [
  {dir: new URL('recursos/cartas/', edition), mime: 'image/png', key: f => f.replace(/\.png$/, '').replace(/_/g, ':')},
  {dir: new URL('recursos/musica/', edition), mime: 'audio/wav', key: f => 'musica:' + f.replace(/\.wav$/, '')}
];
const LOOPS = new Set(['titulo', 'hora-0', 'hora-1', 'hora-2', 'hora-3', 'hora-4', 'guia', 'tienda']);
const out = new URL('la-ultima-vigilia-edicion-completa.html', edition);

const assets = [];
for (const src of sources) {
  if (!existsSync(src.dir)) continue;
  for (const file of readdirSync(src.dir).sort()) {
    const path = new URL(file, src.dir);
    const key = src.key(file);
    assets.push({key, path, mime: src.mime, bytes: statSync(path).size, loop: src.mime === 'audio/wav' && LOOPS.has(key.slice(7))});
  }
}
if (!assets.length) { console.error('No hay recursos: ejecuta antes render-cartas.mjs y render-banda.mjs'); process.exit(1); }

const manifest = {version: 1, bytes: assets.reduce((s, a) => s + a.bytes, 0), items: {}};
assets.forEach((a, i) => { manifest.items[a.key] = {id: 'r' + i, mime: a.mime, bytes: a.bytes, ...(a.loop ? {loop: true} : {})}; });

let html = readFileSync(new URL('la-ultima-vigilia.html', root), 'utf8');
html = html.replace('<title>La última vigilia</title>', '<title>La última vigilia · Edición completa</title>');
const loader = `<div id="cargaEdicion" role="status">Abriendo la edición completa… ${Math.round(manifest.bytes * 4 / 3 / 1048576)} MB de cartas y música</div>
<script type="application/json" id="vigilia-recursos">${JSON.stringify(manifest)}</script>`;
html = html.replace('<body>', '<body>\n' + loader);
const [before, after] = html.split('</body>');
if (after === undefined) throw new Error('No encuentro </body> en el HTML autónomo');

mkdirSync(edition, {recursive: true});
const stream = createWriteStream(out);
const write = async chunk => { if (!stream.write(chunk)) await once(stream, 'drain'); };
await write(before);
for (const [i, a] of assets.entries()) {
  const b64 = readFileSync(a.path).toString('base64');
  await write(`<script type="text/plain" id="r${i}">`);
  for (let at = 0; at < b64.length; at += 1 << 22) await write(b64.slice(at, at + (1 << 22)));
  await write('</script>\n');
}
await write('</body>' + after);
stream.end();
await once(stream, 'finish');
const size = statSync(out).size;
const cards = assets.filter(a => a.mime === 'image/png'), music = assets.filter(a => a.mime === 'audio/wav');
console.log(`✓ ${out.pathname.split('/').slice(-2).join('/')} · ${(size / 1048576).toFixed(1)} MB`);
console.log(`  ${cards.length} ilustraciones (${(cards.reduce((s, a) => s + a.bytes, 0) / 1048576).toFixed(1)} MB) · ${music.length} piezas de música (${(music.reduce((s, a) => s + a.bytes, 0) / 1048576).toFixed(1)} MB) · el juego, ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
