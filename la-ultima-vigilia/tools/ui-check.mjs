/*
 * La interfaz con teclado y ratón de verdad: elegir persona y arma, empezar,
 * moverse, esquivar, la habilidad, recordar con 1-4, la ofrenda, comprar en
 * el puesto de Remedios, pausa y ajustes; y el móvil a 390 × 844.
 *
 *   node build.mjs && node tools/ui-check.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await launchBrowser();
const ok = [];

async function open(viewport, query = '') {
  const context = await browser.newContext({viewport, offline: !process.env.VIGILIA_TEST_URL, hasTouch: viewport.width < 500});
  const page = await context.newPage();
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${file}?debug${query}`);
  await page.waitForFunction(() => window.vigilia);
  return {context, page, errors};
}
const state = page => page.evaluate(() => window.vigilia.state);
const visible = (page, id) => page.evaluate(id => !document.getElementById(id).classList.contains('hidden'), id);

try {
  /* ---------- escritorio ---------- */
  const {context, page, errors} = await open({width: 1280, height: 800});
  assert(await visible(page, 'title'), 'no se ve el título');
  // Elegir con teclado en el grupo de personas: flechas y una sola parada de Tab.
  await page.focus('#cast [aria-checked="true"]');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.character), 'julian', 'las flechas no cambian de persona');
  const tabStops = await page.evaluate(() => [...document.querySelectorAll('#cast .cast-card')].filter(b => b.tabIndex === 0).length);
  assert.equal(tabStops, 1, 'el grupo de personas debe tener una sola parada de Tab');
  const locked = await page.evaluate(() => document.querySelector('[data-character="anselmo"]').classList.contains('locked'));
  assert(locked, 'don Anselmo debe empezar bloqueado');
  await page.click('#startWeapons button:nth-child(2)');
  assert.match(await page.textContent('#startWeapons [aria-checked="true"]'), /Escopeta/, 'no se elige el arma inicial');
  ok.push('título: personas con flechas, bloqueos y arma inicial');

  await page.click('#startButton');
  await page.waitForFunction(() => window.vigilia.state === 'running');
  assert(await visible(page, 'hud') && !(await visible(page, 'title')), 'no aparece el HUD');
  assert.equal(await page.evaluate(() => window.vigilia.run.weapons[0].id), 'escopeta', 'no empieza con el arma elegida');
  const x0 = await page.evaluate(() => window.vigilia.player.x);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(450); await page.keyboard.up('KeyD');
  assert(await page.evaluate(x0 => window.vigilia.player.x > x0 + 40, x0), 'D no mueve a la derecha');
  await page.keyboard.press('Space');
  assert(await page.evaluate(() => window.vigilia.dashCd > 0), 'Espacio no esquiva');
  await page.keyboard.press('KeyR');
  assert(await page.evaluate(() => window.vigilia.abilityCd > 0), 'R no usa la habilidad');
  assert(await page.evaluate(() => window.vigilia.areas.some(z => z.kind === 'sal')), 'el cerco de sal no aparece');
  ok.push('ronda: moverse, esquivar y habilidad con teclado');

  // La barra de experiencia avanza y destella al subir.
  await page.evaluate(() => window.vigilia.gainXp(6));
  await page.waitForTimeout(400);
  const xpWidth = await page.evaluate(() => parseFloat(document.getElementById('xpBar').style.width));
  assert(xpWidth > 20 && xpWidth < 80, `la barra de experiencia no avanza (${xpWidth} %)`);
  await page.evaluate(() => { const g = window.vigilia; g.gainXp(20); g.run.crates.push({rarity: 0}); g.run.cera = 300; g.timeLeft = 0.01; });
  await page.waitForFunction(() => window.vigilia.state === 'levelup', null, {timeout: 6000});
  assert(await visible(page, 'levelup'), 'no se ve la elección de recuerdos');
  assert.equal(await page.locator('#levelCards .card').count(), 4, 'no hay cuatro recuerdos');
  assert(await page.evaluate(() => !document.getElementById('pendingBox').classList.contains('hidden')), 'el HUD no avisa de recuerdos pendientes');
  await page.keyboard.press('2');
  await page.waitForFunction(() => window.vigilia.state !== 'levelup' || window.vigilia.run.pending === 0);
  for (let i = 0; i < 5 && await state(page) === 'levelup'; i++) { await page.keyboard.press('1'); await page.waitForTimeout(120); }
  assert.equal(await state(page), 'crate', 'después de recordar no llega la ofrenda');
  await page.click('#crateTake');
  await page.waitForFunction(() => window.vigilia.state === 'shop');
  ok.push('entre rondas: recuerdos con 1-4 y la ofrenda con el ratón');

  assert(await visible(page, 'shop'), 'no se ve el puesto');
  assert.equal(await page.locator('#offers .offer').count(), 4, 'no hay cuatro ofertas');
  const cera = await page.evaluate(() => window.vigilia.run.cera);
  const buy = page.locator('#offers .buy:not(:disabled)').first();
  if (await buy.count()) {
    await buy.click();
    assert(await page.evaluate(c => window.vigilia.run.cera < c, cera), 'comprar con el ratón no cobra');
  }
  await page.click('#offers .lock');
  assert(await page.evaluate(() => window.vigilia.offers.some(o => o.locked)), 'el candado no responde al ratón');
  const rerolls = await page.evaluate(() => window.vigilia.rerolls);
  await page.keyboard.press('KeyR');
  assert(await page.evaluate(r => window.vigilia.rerolls === r + 1, rerolls), 'R no vuelve a tirar en el puesto');
  await page.click('#shopWeapons .slot');
  assert(await page.locator('.weapon-detail').count(), 'tocar un arma no muestra sus detalles');
  assert.equal(await page.locator('#shopStats dt').count(), 16, 'faltan estadísticas en el panel');
  await page.click('#nextRound');
  await page.waitForFunction(() => window.vigilia.state === 'running' && window.vigilia.run.round === 2);
  ok.push('puesto: comprar, candado, tirada con R, detalle de arma y seguir');

  await page.keyboard.press('KeyP');
  assert.equal(await state(page), 'paused', 'P no pausa');
  assert.equal(await page.locator('#pauseStats dt').count(), 16, 'la pausa no muestra estadísticas');
  assert(await page.evaluate(() => document.activeElement.id === 'resumeButton'), 'la pausa no lleva el foco a «Seguir velando»');
  await page.click('#pause [data-open="settingsDialog"]');
  assert(await page.evaluate(() => document.getElementById('settingsDialog').open), 'no se abren los ajustes');
  await page.click('#optNumbers');
  assert.equal(await page.evaluate(() => window.vigilia.options.numbers), false, 'los ajustes no llegan al juego');
  await page.keyboard.press('Escape');
  await page.click('#resumeButton');
  assert.equal(await state(page), 'running', 'no se reanuda');
  ok.push('pausa, ajustes persistentes y reanudar');
  assert.deepEqual(errors, [], 'errores de JavaScript en escritorio');
  await context.close();

  /* ---------- móvil ---------- */
  const mobile = await open({width: 390, height: 844}, '&autostart=1&char=lucia');
  const m = mobile.page;
  await m.waitForFunction(() => window.vigilia.state === 'running');
  const box = await m.locator('#game').boundingBox();
  const mx0 = await m.evaluate(() => window.vigilia.player.x);
  await m.dispatchEvent('#game', 'pointerdown', {pointerId: 3, clientX: box.width / 2, clientY: box.height / 2, button: 0, isPrimary: true});
  await m.dispatchEvent('#game', 'pointermove', {pointerId: 3, clientX: box.width / 2 + 80, clientY: box.height / 2, isPrimary: true});
  await m.waitForTimeout(400);
  await m.dispatchEvent('#game', 'pointerup', {pointerId: 3, clientX: box.width / 2 + 80, clientY: box.height / 2, isPrimary: true});
  assert(await m.evaluate(x => window.vigilia.player.x > x + 20, mx0), 'arrastrar el dedo no mueve');
  await m.click('#dashButton');
  assert(await m.evaluate(() => window.vigilia.dashCd > 0), 'el botón de esquivar no responde');
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert(!overflow, 'la página se sale de lado en el móvil');
  await m.evaluate(() => { const g = window.vigilia; g.run.cera = 200; g.timeLeft = 0.01; });
  await m.waitForFunction(() => ['shop', 'levelup', 'crate'].includes(window.vigilia.state), null, {timeout: 6000});
  for (let i = 0; i < 6; i++) {
    const s = await state(m);
    if (s === 'levelup') await m.click('#levelCards .card');
    else if (s === 'crate') await m.click('#crateTake');
    else break;
  }
  assert.equal(await state(m), 'shop', 'en el móvil no llega a la tienda');
  const foot = await m.locator('#nextRound').boundingBox();
  assert(foot && foot.y + foot.height <= 844, 'el botón de seguir queda fuera de la pantalla del móvil');
  ok.push('móvil: dedo, botón de esquiva, sin desbordes y tienda alcanzable');
  assert.deepEqual(mobile.errors, [], 'errores de JavaScript en el móvil');
  await mobile.context.close();

  console.log(ok.map(s => `✓ ${s}`).join('\n'));
} finally {
  await browser.close();
}
