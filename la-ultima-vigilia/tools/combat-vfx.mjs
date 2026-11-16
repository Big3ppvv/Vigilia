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
      const oldCooldown = weapon === 'sal' ? 0.95 : 0.62;
      check(g.t[weapon] === oldCooldown * g.st.cadence, 'La cadencia del arma no respeta las estadísticas');
      check(g.t[weapon] < oldCooldown, 'El combate no dispara más deprisa que la cadencia anterior');
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

      // Un fotograma largo no puede hacer que una chispa rápida atraviese una
      // criatura. La primera colisión se decide por recorrido, no por el orden
      // de inserción ni por el sentido en que se recorren las celdas del índice.
      const sweep = (flashes, pierce) => {
        g.reset(); g.state = 'running';
        g.setOptions({flashes, shake: false});
        g.st.crit = 0; g.st.damage = 1;
        const at = (x, y = 104) => {
          const enemy = g.spawn('hermano', {x, y});
          enemy.hp = enemy.maxHp = 10000;
          return enemy;
        };
        const far = at(154), middle = at(172), near = at(190), miss = at(220, 164);
        const shot = {kind: 'chispa', x: 300, y: 100, vx: -6000, vy: 0, a: Math.PI,
          life: 1, total: 1, trail: [], tone: 'ember', r: 2, dmg: 20,
          pierce, knock: 0, hit: new Set()};
        g.shots = [shot]; g.buildGrid();
        g.updateShots(0.05);
        const hits = [near, middle, far, miss].map(enemy => enemy.maxHp - enemy.hp);
        check(hits[0] === 20, 'Un proyectil rápido salta la primera criatura del recorrido');
        check(hits[1] === (pierce > 1 ? 20 : 0) && hits[2] === 0,
          'La perforación no consume los contactos del más cercano al más lejano');
        check(hits[3] === 0, 'El barrido alcanza a una criatura fuera de su trayectoria');
        check(shot.hit.size === pierce && g.shots.length === 0, 'La perforación no termina al agotar sus contactos');
        return hits;
      };
      for (const pierce of [1, 2]) {
        const bright = sweep(true, pierce), quiet = sweep(false, pierce);
        check(JSON.stringify(bright) === JSON.stringify(quiet), 'Los destellos alteran la colisión de un proyectil rápido');
      }

      const criticalTarget = prepare(weapon);
      g.st.crit = 1;
      g.hurt(criticalTarget, 10, {knock: 0, fx: 'ember'});
      check(g.freeze === 0 && criticalTarget.maxHp - criticalTarget.hp === 20,
        'Un crítico ordinario vuelve a detener el combate o pierde su daño doble');
      check(g.combatFx.effects.some(effect => effect.kind === 'impact' && effect.radius === 28),
        'El crítico pierde su respuesta visual al quitar la pausa');

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

      // Esquivas, bajas y habilidades comparten presupuesto y ciclo de vida.
      g.combatFx.clear();
      const newKinds = ['dash', 'death', 'surge'];
      for (const kind of newKinds) g.combatFx.emit(kind, g.player.x, g.player.y, {radius: 70, tone: 'ember'});
      for (const kind of newKinds) check(g.combatFx.effects.some(effect => effect.kind === kind), `Falta el efecto ${kind}`);
      const quietLights = [];
      g.combatFx.addLights(quietLights, 0, 0, false);
      check(quietLights.length === 0, 'Los nuevos efectos iluminan con destellos desactivados');
      for (let i = 0; i < 600; i++) g.combatFx.emit(newKinds[i % newKinds.length], g.player.x + i % 20, g.player.y, {radius: 70, tone: 'sacred'});
      const surgeLights = [];
      g.combatFx.addLights(surgeLights, 0, 0, true);
      check(g.combatFx.effects.length <= 96 && surgeLights.length <= 24, 'Las nuevas ráfagas superan el presupuesto');
      g.render();
      g.updateFx(10);
      check(g.combatFx.effects.length === 0, 'Las nuevas ráfagas no caducan');
      for (const kind of newKinds) g.combatFx.emit(kind, g.player.x, g.player.y);
      g.reset();
      check(g.combatFx.effects.length === 0, 'La esquiva, la baja o la habilidad pasan a otra noche');

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
