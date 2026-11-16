/*
 * La interfaz, con teclado y ratón de verdad: título, diálogos y ajustes,
 * empezar, moverse, esquivar, arrullar, los cirios en el HUD, las cartas con
 * su rincón, la pausa, el recordatorio de un difunto y el final.
 *
 *   node build.mjs && node tools/ui-check.mjs
 * Requiere Playwright y Chromium, igual que tools/smoke.mjs.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const html = new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await chromium.launch({args: ['--autoplay-policy=no-user-gesture-required']});
const page = await browser.newPage({viewport: {width: 1280, height: 800}});
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + String(e)));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
const ok = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) process.exitCode = 1; };
await page.goto(`${html}?debug`);
await page.waitForFunction(() => window.vigilia);
// título: elegir a Julián con el teclado y abrir cada diálogo
await page.keyboard.press('Digit2');
ok(await page.evaluate(() => window.vigilia.character) === 'julian', 'se elige personaje con el teclado');
for (const id of ['albumDialog', 'recordsDialog', 'settingsDialog', 'helpDialog']) {
  await page.click(`[data-open="${id}"]`);
  ok(await page.evaluate(id => document.getElementById(id).open, id), `se abre ${id}`);
  if (id === 'settingsDialog') {
    for (const s of ['optMusic', 'optSfx', 'optAmb', 'optVolume']) await page.fill(`#${s}`, '40');
    await page.click('#optWeather');
    const st = await page.evaluate(() => ({mix: window.vigilia.audio.mix, weather: window.vigilia.options.weather, saved: JSON.parse(localStorage.getItem('vigilia2.settings') || '{}')}));
    ok(Math.abs(st.mix.music - 0.4) < 0.01 && Math.abs(st.mix.sfx - 0.4) < 0.01 && Math.abs(st.mix.amb - 0.4) < 0.01, 'los tres volúmenes por grupo llegan al motor');
    ok(st.weather === false && st.saved.weather === false && Math.abs(st.saved.music - 0.4) < 0.01, 'los ajustes nuevos se guardan');
  }
  if (id === 'helpDialog') ok((await page.textContent('#helpList')).includes('Arrullar'), 'la ayuda explica el arrullo y los cirios');
  await page.keyboard.press('Escape');
}
await page.click('#startButton');
await page.waitForFunction(() => window.vigilia.state === 'running');
const audio = await page.evaluate(() => ({ready: window.vigilia.audio.ready, state: window.vigilia.audio.ctx?.state}));
ok(audio.ready, `el sonido arranca con el primer gesto (contexto ${audio.state})`);
ok(await page.locator('#wake i.on').count() === 4, 'el HUD muestra los cuatro cirios encendidos');
// moverse y esquivar
const x0 = await page.evaluate(() => window.vigilia.player.x);
await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
ok(await page.evaluate(() => window.vigilia.player.x) > x0 + 20, 'WASD mueve a quien vela');
await page.keyboard.press('Space');
ok(await page.evaluate(() => window.vigilia.dashCd > 0), 'Espacio esquiva');
// arrullo: primero no está listo; luego sí, con E y con el botón
await page.keyboard.press('KeyE');
ok(await page.evaluate(() => window.vigilia.lull === 0), 'el arrullo no sale antes de tiempo');
await page.evaluate(() => { window.vigilia.lullCd = 0; });
await page.keyboard.press('KeyE');
ok(await page.evaluate(() => window.vigilia.lull > 0), 'E arrulla cuando está listo');
await page.waitForTimeout(300);
ok(await page.locator('#lullButton.singing').count() === 1, 'el botón del arrullo lo refleja');
await page.evaluate(() => { const g = window.vigilia; g.lull = 0; g.lullCd = 0; });
await page.click('#lullButton');
ok(await page.evaluate(() => window.vigilia.lull > 0), 'el botón también arrulla');
// un cirio apagado se ve en el HUD y se enciende quedándose al lado
await page.evaluate(() => { const g = window.vigilia; g.enemies = []; g.spawning = () => {}; g.snuffCirio(g.cirios[3]); g.player.x = g.cirios[3].x - 14; g.player.y = g.cirios[3].y + 14; g.cam.x = 0; g.cam.y = 0; });
await page.waitForTimeout(250);
ok(await page.locator('#wake i.on').count() === 3, 'el HUD marca el cirio apagado');
await page.waitForFunction(() => window.vigilia.cirios[3].lit, null, {timeout: 5000});
await page.waitForTimeout(250);
ok(await page.locator('#wake i.on').count() === 4, 'quedarse al lado lo enciende y el HUD lo recoge');
// a oscuras: aparece la barra del alma
await page.evaluate(() => { const g = window.vigilia; g.player.x = 600; g.player.y = 500; for (const c of g.cirios) g.snuffCirio(c); });
await page.waitForTimeout(1200);
ok(await page.locator('#soulBox:not(.hidden)').count() === 1 && await page.locator('#wake.dark').count() === 1, 'a oscuras aparece «Se la llevan»');
await page.evaluate(() => { const g = window.vigilia; for (const c of g.cirios) g.lightCirio(c, true, false); g.soul = 0; });
// subir de nivel: tres cartas con su rincón, elegir con 1
await page.evaluate(() => { const g = window.vigilia; g.xp = g.xpNext; });
await page.waitForFunction(() => window.vigilia.state === 'upgrade');
ok(await page.locator('#choiceCards .card').count() === 3, 'salen tres cartas');
ok((await page.textContent('#choiceSlots')).includes('Armas'), 'las cartas dicen cuántos huecos quedan');
ok(await page.locator('#choiceCards .card .room').count() >= 1, 'las cartas dicen a qué rincón pertenecen');
await page.keyboard.press('Digit1');
ok(await page.evaluate(() => window.vigilia.state === 'running'), 'se elige carta con 1');
// pausa y vuelta
await page.keyboard.press('KeyP');
ok(await page.evaluate(() => window.vigilia.state === 'paused') && await page.locator('#pause:not(.hidden)').count() === 1, 'P pausa');
await page.keyboard.press('KeyP');
ok(await page.evaluate(() => window.vigilia.state === 'running'), 'P reanuda');
// recordatorio de difunto: elección sin gastar luz
await page.evaluate(() => { const g = window.vigilia; g.cardPending = true; });
await page.waitForFunction(() => window.vigilia.state === 'upgrade');
ok((await page.textContent('#choiceEyebrow')).includes('recordatorio'), 'el recordatorio de un difunto abre su propia elección');
await page.click('#choiceCards .card >> nth=0');
// final: se llevan a Amparo y el recordatorio final lo cuenta
await page.evaluate(() => { const g = window.vigilia; for (const c of g.cirios) g.snuffCirio(c); g.soul = 0.999; g.player.x = 700; g.player.y = 600; });
await page.waitForFunction(() => window.vigilia.state === 'ended', null, {timeout: 15000});
const end = await page.evaluate(() => ({title: document.getElementById('endTitle').textContent, stats: document.getElementById('endStats').textContent, shown: !document.getElementById('end').classList.contains('hidden')}));
ok(end.shown && /Se la llevaron a las/.test(end.title) && /cirio/.test(end.stats), `final de «se la llevaron»: ${end.title}`);
await page.click('#againButton');
await page.waitForFunction(() => window.vigilia.state === 'running');
ok(await page.evaluate(() => window.vigilia.cirios.every(c => c.lit) && window.vigilia.soul === 0 && window.vigilia.rooms.size === 0), 'volver a velar empieza una noche limpia');
ok(errors.length === 0, errors.length ? 'errores: ' + [...new Set(errors)].slice(0, 4).join(' | ') : 'sin errores de JavaScript en todo el recorrido');
await browser.close();
