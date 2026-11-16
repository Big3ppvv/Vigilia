/*
 * Renderiza la banda sonora de la edición completa en Chromium (sin altavoces)
 * y guarda cada pieza como WAV de 48 kHz y 16 bits. Necesita el servidor de
 * desarrollo (npm run dev o VIGILIA_DEV_URL).
 *
 *   node tools/edicion/render-banda.mjs [destino] [pieza…]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser } from '../browser.mjs';

const base = process.env.VIGILIA_DEV_URL || 'http://localhost:8000';
const out = process.argv[2] || new URL('../../../edicion-completa/recursos/musica/', import.meta.url).pathname;
const only = process.argv.slice(3);
mkdirSync(out, {recursive: true});
const browser = await launchBrowser();
const errors = [];
const open = async () => {
  const page = await browser.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/tools/edicion/vacia.html`);
  return page;
};
const first = await open();
const names = only.length ? only : await first.evaluate(async () => Object.keys((await import('/tools/edicion/banda.js')).TRACKS));
let total = 0, seconds = 0;
const started = Date.now();
// Cada pieza en su propia pestaña: Chromium renderiza los contextos sin conexión en paralelo.
const queue = [...names];
const workers = Math.max(1, Math.min(Number(process.env.BANDA_PARALELO || 4), queue.length));
await Promise.all(Array.from({length: workers}, async (_, w) => {
  const page = w === 0 ? first : await open();
  while (queue.length) {
    const name = queue.shift(), t0 = Date.now();
    const r = await page.evaluate(async n => (await import('/tools/edicion/banda.js')).render(n), name);
    writeFileSync(`${out}/${name}.wav`, Buffer.from(r.b64, 'base64'));
    total += r.bytes; seconds += r.seconds;
    console.log(`  ${name.padEnd(8)} ${r.seconds.toFixed(1).padStart(6)} s · ${(r.bytes / 1048576).toFixed(1)} MB · pico ${r.peakDb} dB · media ${r.rmsDb} dB${r.loop ? ' · en bucle' : ''} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}));
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`✓ ${names.length} piezas · ${(seconds / 60).toFixed(1)} min · ${(total / 1048576).toFixed(1)} MB · ${((Date.now() - started) / 1000).toFixed(0)} s`);
