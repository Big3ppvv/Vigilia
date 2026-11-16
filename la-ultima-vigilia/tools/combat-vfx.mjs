/*
 * Combate y efectos en Chromium, sobre el HTML descargable y sin conexión.
 * Comprueba daño, colisiones, armas combinadas, limpieza y accesibilidad.
 *
 *   node build.mjs && node tools/combat-vfx.mjs
 * Requiere Playwright y Chromium, igual que tools/smoke.mjs.
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await launchBrowser();

try {
  for (const character of ['lucia', 'julian', 'matilde']) {
    const context = await browser.newContext({viewport: {width: 1100, height: 720}, offline: !process.env.VIGILIA_TEST_URL});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(`${file}?debug&autostart=1&god=1&char=${character}`);
    await page.waitForFunction(() => window.vigilia?.state === 'running');
    const result = await page.evaluate(character => {
      const g = window.vigilia;
      cancelAnimationFrame(g.raf);
      g.audio.sfx = () => {};
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      const prepare = weapon => {
        g.reset();
        g.state = 'running';
        g.setOptions({shake: false, flashes: true});
        for (const key of Object.keys(g.mem)) g.mem[key] = 0;
        g.mem[weapon] = 1;
        g.computeStats();
        g.st.crit = 0;
        g.t.chispas = g.t.sal = g.t.campana = 999;
        g.t[weapon] = 0;
        const target = g.spawn('hermano', {x: g.player.x + 105, y: g.player.y});
        target.hp = target.maxHp = 10000;
        g.buildGrid();
        return target;
      };

      const weapon = character === 'julian' ? 'sal' : 'chispas';
      const target = prepare(weapon);
      g.weapons(0);
      const count = g.shots.length;
      const damage = weapon === 'sal' ? 12 : 20;
      check(count === (weapon === 'sal' ? 3 : 1), 'Cambió la cantidad de proyectiles iniciales');
      check(g.shots.every(shot => shot.dmg === damage), 'Cambió el daño del arma');
      check(g.t[weapon] === (weapon === 'sal' ? 0.95 : 0.62), 'Cambió la cadencia inicial');
      check(g.combatFx.effects.length > 0, 'El disparo no genera efecto de salida');
      if (weapon === 'chispas') {
        check(g.shots.every(shot => shot.tone === (character === 'matilde' ? 'sacred' : 'ember')), 'Se perdió la identidad de la chispa');
      }
      g.updateShots(0.06);
      check(g.shots.some(shot => shot.trail.length > 0), 'El proyectil no deja estela');
      let impact = false;
      for (let frame = 0; frame < 30; frame++) {
        g.updateShots(1 / 120);
        impact ||= g.combatFx.effects.some(effect => effect.kind === 'impact');
        g.updateFx(1 / 120);
      }
      const dealt = target.maxHp - target.hp;
      check(dealt >= damage && dealt % damage === 0, 'El proyectil no mantiene su daño al colisionar');
      check(impact, 'El impacto no tiene respuesta visual');
      check(g.shots.every(shot => shot.trail.length <= 8), 'Una estela crece sin límite');

      const quietTarget = prepare(weapon);
      g.setOptions({flashes: false, shake: false});
      g.weapons(0);
      for (let frame = 0; frame < 40; frame++) g.updateShots(1 / 120);
      check(quietTarget.maxHp - quietTarget.hp === dealt, 'Desactivar efectos cambia el daño de combate');

      // Todas las mejoras juntas: el coste debe seguir acotado en una horda.
      prepare('chispas');
      for (const key of ['chispas', 'sal', 'campana', 'rosario', 'farol', 'polillas', 'radio']) g.mem[key] = 5;
      g.computeStats();
      g.st.crit = 0;
      g.t.chispas = g.t.sal = g.t.campana = g.t.farol = 0;
      g.enemies = [];
      for (let i = 0; i < 240; i++) {
        const angle = i * Math.PI * 2 / 240, radius = 40 + i % 5 * 35;
        const enemy = g.spawn('hermano', {x: g.player.x + Math.cos(angle) * radius, y: g.player.y + Math.sin(angle) * radius});
        enemy.hp = enemy.maxHp = 1000000;
      }
      let maxFx = 0, maxParticles = 0, maxShots = 0, maxFxLights = 0;
      for (let frame = 0; frame < 480; frame++) {
        g.clock += 1 / 60;
        g.buildGrid();
        for (const enemy of g.enemies) enemy.beadCd = Math.max(0, enemy.beadCd - 1 / 60);
        g.weapons(1 / 60);
        if (frame === 0) check(g.combatFx.effects.some(effect => effect.kind === 'bell'), 'La horda oculta la onda de la campana al llenar el presupuesto');
        g.updateShots(1 / 60);
        g.updateFx(1 / 60);
        maxFx = Math.max(maxFx, g.combatFx.effects.length);
        maxParticles = Math.max(maxParticles, g.particles.length);
        maxShots = Math.max(maxShots, g.shots.length);
        const fxLights = [];
        g.combatFx.addLights(fxLights, 0, 0, true);
        maxFxLights = Math.max(maxFxLights, fxLights.length);
        check(maxFx <= 96 && maxParticles <= 420 && maxShots <= 160, 'La horda supera el presupuesto de efectos');
        check(maxFxLights <= 24, 'La horda supera el presupuesto de luces transitorias');
        check(g.shots.every(shot => Number.isFinite(shot.x + shot.y) && shot.trail.length <= 8), 'Proyectil o estela inválidos');
        if (frame % 120 === 0) g.render();
      }

      // Desactivar destellos quita luces transitorias, conservando geometría.
      g.combatFx.clear();
      g.combatFx.emit('bell', g.player.x, g.player.y, {radius: 150, tone: 'sacred', level: 3});
      g.updateFx(0.05);
      const originalLighting = g.lighting.render.bind(g.lighting);
      let lightCount = 0;
      g.lighting.render = (ctx, lights, ...rest) => {
        lightCount = lights.length;
        originalLighting(ctx, lights, ...rest);
      };
      g.setOptions({flashes: true, shake: false});
      const effectsBeforeRender = JSON.stringify(g.combatFx.effects);
      g.render();
      check(JSON.stringify(g.combatFx.effects) === effectsBeforeRender, 'El render altera la duración o posición de los efectos');
      const withFlashes = lightCount;
      g.setOptions({flashes: false, shake: false});
      g.render();
      check(lightCount < withFlashes, 'Desactivar destellos conserva las luces de ráfaga');
      g.lighting.render = originalLighting;
      g.cam = {x: g.player.x, y: g.player.y};
      g.flash = 1;
      g.render();
      const flashed = g.ctx.getImageData(0, 0, g.canvas.width, g.canvas.height).data;
      g.flash = 0;
      g.render();
      const normal = g.ctx.getImageData(0, 0, g.canvas.width, g.canvas.height).data;
      check(flashed.every((value, i) => value === normal[i]), 'Destellos apagados todavía permite un flash de pantalla');
      check(g.ctx.globalAlpha === 1 && g.ctx.globalCompositeOperation === 'source-over', 'El render deja alterado el contexto');

      // Ningún efecto de una noche puede filtrarse a la siguiente.
      g.updateFx(10);
      check(g.combatFx.effects.length === 0 && g.particles.length === 0, 'Quedan efectos después de expirar');
      g.reset();
      check(g.combatFx.effects.length === 0 && g.shots.length === 0, 'Reiniciar conserva efectos o proyectiles');
      return {count, dealt, maxFx, maxParticles, maxShots, maxFxLights};
    }, character);
    assert.deepEqual(errors, [], `${character}: errores de JavaScript`);
    console.log(`✓ ${character}: colisión y daño (${result.dealt}), proyectiles: ${result.count}; horda: ${result.maxFx} efectos, ${result.maxFxLights} luces, ${result.maxParticles} partículas, ${result.maxShots} proyectiles`);
    await context.close();
  }

  const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', offline: !process.env.VIGILIA_TEST_URL});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${file}?debug&autostart=1&god=1&char=matilde`);
  await page.waitForFunction(() => window.vigilia?.state === 'running');
  const options = await page.evaluate(() => {
    const g = window.vigilia;
    cancelAnimationFrame(g.raf);
    g.render();
    return {...g.options, width: g.canvas.width, height: g.canvas.height};
  });
  assert.equal(options.flashes, false, 'Reducir movimiento debe apagar destellos por defecto');
  assert.equal(options.shake, false, 'Reducir movimiento debe apagar temblor por defecto');
  assert(options.width > 0 && options.height > 0);
  assert.deepEqual(errors, []);
  console.log('✓ móvil 390 × 844: HTML sin conexión y preferencias de movimiento reducido');
  await context.close();
} finally {
  await browser.close();
}
