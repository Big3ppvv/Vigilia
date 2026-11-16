/*
 * Prueba de la edición completa: cuánto tarda en abrir, cuánta memoria usa,
 * que cada escena suene con su pieza grabada y que las cartas aparezcan en el
 * título, la tienda, las ofrendas, los avisos y el álbum. Sin errores.
 *
 *   VIGILIA_EDICION_URL=http://localhost:8766/la-ultima-vigilia-edicion-completa.html node tools/edicion/check-edicion.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from '../browser.mjs';

const url = process.env.VIGILIA_EDICION_URL || 'http://localhost:8766/la-ultima-vigilia-edicion-completa.html';
const shots = process.env.VIGILIA_EDICION_SHOTS;
const browser = await launchBrowser({args: ['--autoplay-policy=no-user-gesture-required']});
const context = await browser.newContext({viewport: {width: 1366, height: 820}});
const page = await context.newPage();
await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const cdp = await context.newCDPSession(page);
await cdp.send('Performance.enable');
const metric = async name => (await cdp.send('Performance.getMetrics')).metrics.find(m => m.name === name)?.value || 0;

const t0 = Date.now();
await page.goto(`${url}?debug`, {timeout: 180000, waitUntil: 'load'});
await page.waitForFunction(() => window.vigilia, null, {timeout: 120000});
const openSeconds = (Date.now() - t0) / 1000;
const heapAfterOpen = await metric('JSHeapUsedSize');
const info = await page.evaluate(() => ({nodes: document.querySelectorAll('script[type="text/plain"]').length, count: document.getElementById('nightCount').textContent, loader: !!document.getElementById('cargaEdicion')}));
assert(info.nodes > 100, 'no hay recursos incrustados');
assert(!info.loader, 'el aviso de carga no desaparece');
assert.match(info.count, /Edición completa/, 'el título no reconoce la edición completa');
console.log(`✓ abre en ${openSeconds.toFixed(1)} s con ${info.nodes} recursos · memoria JS ${(heapAfterOpen / 1048576).toFixed(0)} MB`);

// Título: la carta de quien vela y la música del título.
await page.mouse.click(700, 400);
await page.waitForTimeout(2500);
const title = await page.evaluate(() => ({art: !document.getElementById('castArt').classList.contains('hidden') && document.getElementById('castArt').src.startsWith('blob:'),
  music: window.vigilia.audio.soundtrack.current?.key, state: window.vigilia.audio.ctx?.state}));
assert(title.art, 'no aparece la carta de quien vela en el título');
assert.equal(title.music, 'musica:titulo', `en el título no suena su pieza (${title.music}, contexto ${title.state})`);
if (shots) await page.screenshot({path: `${shots}/edicion-titulo.png`});
console.log('✓ título: carta del personaje y música del título');

// Una ronda: suena la hora; al aparecer un difunto con nombre, su carta en el aviso.
await page.click('#startButton');
await page.waitForFunction(() => window.vigilia.state === 'running');
await page.waitForTimeout(2500);
assert.equal(await page.evaluate(() => window.vigilia.audio.soundtrack.current?.key), 'musica:hora-0', 'la primera ronda no suena con la pieza de medianoche');
await page.evaluate(() => { const g = window.vigilia; g.god = true; g.startRound(3); g.hordeDone = true; });
await page.waitForFunction(() => !document.getElementById('bannerArt').classList.contains('hidden'), null, {timeout: 20000});
if (shots) await page.screenshot({path: `${shots}/edicion-difunto.png`});
console.log('✓ ronda: música de la hora y carta del difunto en el aviso');

// La tienda: su pieza, Remedios ilustrada y las ofertas con carta.
await page.evaluate(() => { const g = window.vigilia; g.run.cera = 400; g.run.crates.push({rarity: 2}); g.timeLeft = 0.01; });
await page.waitForFunction(() => ['levelup', 'crate', 'shop'].includes(window.vigilia.state), null, {timeout: 10000});
for (let i = 0; i < 8; i++) {
  const s = await page.evaluate(() => window.vigilia.state);
  if (s === 'levelup') await page.keyboard.press('1');
  else if (s === 'crate') {
    assert(await page.locator('#crateCard img.card-art').count(), 'la ofrenda no muestra su carta');
    if (shots) await page.screenshot({path: `${shots}/edicion-ofrenda.png`});
    await page.keyboard.press('1');
  } else break;
  await page.waitForTimeout(200);
}
await page.waitForTimeout(2500);
const shop = await page.evaluate(() => ({state: window.vigilia.state, arts: document.querySelectorAll('#offers img.offer-art').length, keeper: !!document.querySelector('#shop img.keeper'), music: window.vigilia.audio.soundtrack.current?.key}));
assert.equal(shop.state, 'shop', 'no llega a la tienda');
assert(shop.arts >= 3, `las ofertas no muestran carta (${shop.arts})`);
assert(shop.keeper, 'Remedios no aparece ilustrada');
assert.equal(shop.music, 'musica:tienda', 'la tienda no suena con su pieza');
if (shots) await page.screenshot({path: `${shots}/edicion-tienda.png`});
console.log('✓ tienda: Remedios, cartas en las ofertas y música de la tienda');

// El álbum con sus cartas.
await page.evaluate(() => { document.querySelector('[data-open="albumDialog"]').click(); });
await page.waitForTimeout(800);
const album = await page.evaluate(() => document.querySelectorAll('#albumDialog img.thumb').length);
assert(album >= 3, 'el álbum no muestra cartas');
await page.evaluate(() => document.getElementById('albumDialog').close());
console.log(`✓ álbum: ${album} cartas a la vista`);

const heapEnd = await metric('JSHeapUsedSize');
assert.deepEqual(errors, [], 'errores de JavaScript');
console.log(`✓ sin errores · memoria JS al final ${(heapEnd / 1048576).toFixed(0)} MB`);
await browser.close();
