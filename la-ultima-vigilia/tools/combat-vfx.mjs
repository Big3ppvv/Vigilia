/*
 * El combate y sus efectos sin conexión: cada forma de atacar hiere, los
 * golpes destellan, y en plena horda las partículas, luces, números y efectos
 * respetan sus límites. Con movimiento reducido, temblor y destellos empiezan
 * apagados sin cambiar el daño.
 *
 *   node build.mjs && node tools/combat-vfx.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await launchBrowser();

async function open(options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 800}, offline: !process.env.VIGILIA_TEST_URL, ...options});
  const page = await context.newPage();
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(`${file}?debug&autostart=1&god=1&char=tono`);
  await page.waitForFunction(() => window.vigilia?.state === 'running');
  await page.evaluate(() => {
    const g = window.vigilia;
    cancelAnimationFrame(g.raf);
    g.audio.sfx = () => {};
    window.advance = seconds => { for (let t = 0; t < seconds; t += 1 / 60) { g.step(1 / 60); g.render(1 / 60); } };
  });
  return {context, page, errors};
}

try {
  const {context, page, errors} = await open();
  // Cada arma, sola contra un muñeco a su alcance, tiene que herirlo.
  const perWeapon = await page.evaluate(() => {
    const g = window.vigilia, out = {};
    const ids = ['hoz', 'pala', 'mayal', 'forcado', 'navaja', 'remo', 'tea', 'botafumeiro', 'chispas', 'escopeta', 'honda', 'arpon', 'vieiras', 'pandeireta', 'foguetes', 'gaita', 'agua', 'rosario', 'campanilla', 'cirio'];
    for (const id of ids) {
      g.enemies = []; g.marks = []; g.shots = []; g.areas = []; g.spawnT = 999; g.procT = 999; g.hordeDone = true; g.eliteDone = true;
      g.run.weapons = []; g.addWeapon(id, 1);
      g.player.x = 0; g.player.y = 0; g.player.vx = 0; g.player.vy = 0;
      const dist = ['rosario', 'botafumeiro'].includes(id) ? 76 : ['campanilla', 'cirio', 'mayal', 'navaja', 'tea', 'hoz', 'remo', 'pala'].includes(id) ? 44 : 130;
      const e = g.spawn('ahogado', dist, -10, true);
      e.hp = e.maxHp = 1e6; e.speed = 0; e.cd = 999; e.kx = 0; e.ky = 0;
      g.timeLeft = 60;
      window.advance(2.5);
      out[id] = Math.round(1e6 - e.hp);
    }
    return out;
  });
  for (const [id, dmg] of Object.entries(perWeapon)) assert(dmg > 0, `${id}: no hiere a un muñeco a su alcance`);
  console.log(`✓ las ${Object.keys(perWeapon).length} armas hieren a su alcance`);

  // El golpe se ve: destello blanco, aplastamiento, número y luz.
  const juice = await page.evaluate(() => {
    const g = window.vigilia;
    g.enemies = []; g.numbers = []; g.flashes = [];
    const e = g.spawn('hermano', 60, 0, true);
    e.hp = e.maxHp = 1000;
    g.hurt(e, 10, {crit: true, tone: 'ember'});
    return {flash: e.flash > 0, squash: e.squash > 0, number: g.numbers.length > 0, light: g.flashes.length > 0, hitstop: g.freeze > 0};
  });
  for (const [k, v] of Object.entries(juice)) assert(v, `un golpe crítico no produce ${k}`);
  console.log('✓ un crítico destella, aplasta, muestra su número, ilumina y congela un instante');

  // En plena horda, con todo el arsenal, los efectos respetan sus límites.
  const horde = await page.evaluate(() => {
    const g = window.vigilia;
    g.run.weapons = [];
    for (const [id, t] of [['foguetes', 3], ['gaita', 3], ['pandeireta', 3], ['campanilla', 3], ['cirio', 3], ['escopeta', 3]]) g.addWeapon(id, t);
    g.addItem('cerillas', false); g.addItem('tizon', false); g.addItem('badajo', false); g.addItem('faro', false);
    g.computeStats();
    g.enemies = [];
    for (let i = 0; i < 240; i++) { const a = i / 240 * Math.PI * 2, r = 80 + (i % 7) * 30; const e = g.spawn('anima', Math.cos(a) * r, Math.sin(a) * r, true); if (e) e.hp = e.maxHp = 400; }
    let peak = {particles: 0, flashes: 0, numbers: 0, effects: 0, shots: 0};
    for (let i = 0; i < 360; i++) {
      g.step(1 / 60); g.render(1 / 60);
      peak = {particles: Math.max(peak.particles, g.particles.length), flashes: Math.max(peak.flashes, g.flashes.length), numbers: Math.max(peak.numbers, g.numbers.length),
        effects: Math.max(peak.effects, g.combatFx.effects.length), shots: Math.max(peak.shots, g.shots.length)};
    }
    return peak;
  });
  assert(horde.particles <= 520, `demasiadas partículas: ${horde.particles}`);
  assert(horde.flashes <= 48, `demasiadas luces de golpe: ${horde.flashes}`);
  assert(horde.numbers <= 90, `demasiados números: ${horde.numbers}`);
  assert(horde.effects <= 140, `demasiados efectos: ${horde.effects}`);
  assert(horde.shots <= 220, `demasiados proyectiles: ${horde.shots}`);
  console.log(`✓ horda de 240 con seis armas IV: picos ${horde.particles} partículas, ${horde.flashes} luces, ${horde.numbers} números, ${horde.effects} efectos, ${horde.shots} proyectiles`);
  assert.deepEqual(errors, [], 'errores de JavaScript');
  await context.close();

  // Movimiento reducido: temblor y destellos apagados, el daño igual.
  const reduced = await open({reducedMotion: 'reduce'});
  const calm = await reduced.page.evaluate(() => {
    const g = window.vigilia;
    const e = g.spawn('hermano', 60, 0, true);
    e.hp = e.maxHp = 1000;
    g.hurt(e, 10, {tone: 'ember'});
    return {shake: g.options.shake, flashes: g.options.flashes, damage: Math.round(1000 - e.hp)};
  });
  assert.equal(calm.shake, false, 'con movimiento reducido el temblor debe empezar apagado');
  assert.equal(calm.flashes, false, 'con movimiento reducido los destellos deben empezar apagados');
  assert.equal(calm.damage, 10, 'reducir efectos no puede cambiar el daño');
  assert.deepEqual(reduced.errors, [], 'errores de JavaScript con movimiento reducido');
  console.log('✓ movimiento reducido: sin temblor ni destellos, mismo daño');
  await reduced.context.close();
} finally {
  await browser.close();
}
