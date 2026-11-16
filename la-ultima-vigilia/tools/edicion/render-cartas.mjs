/*
 * Pinta las cartas ilustradas de la edición completa en Chromium y las guarda
 * como PNG. Necesita el servidor de desarrollo (npm run dev o VIGILIA_DEV_URL).
 *
 *   node tools/edicion/render-cartas.mjs [destino] [clave…]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchBrowser } from '../browser.mjs';

const base = process.env.VIGILIA_DEV_URL || 'http://localhost:8000';
const out = process.argv[2] || new URL('../../../edicion-completa/recursos/cartas/', import.meta.url).pathname;
const only = process.argv.slice(3);
mkdirSync(out, {recursive: true});
const browser = await launchBrowser();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
await page.goto(`${base}/tools/edicion/vacia.html`);
const keys = only.length ? only : await page.evaluate(async () => (await import('/tools/edicion/cartas.js')).catalog().map(s => s.key));
let total = 0;
const started = Date.now();
for (const key of keys) {
  const r = await page.evaluate(async k => (await import('/tools/edicion/cartas.js')).render(k), key);
  writeFileSync(`${out}/${key.replace(/[:]/g, '_')}.png`, Buffer.from(r.b64, 'base64'));
  total += r.bytes;
}
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`✓ ${keys.length} cartas · ${(total / 1048576).toFixed(1)} MB · ${((Date.now() - started) / 1000).toFixed(0)} s`);
