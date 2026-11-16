/*
 * Regresión de las acciones de personaje, faroles y controles sin conexión.
 * Ejecutar después de node build.mjs: node tools/gameplay.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const file = new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await launchBrowser();

async function openGame(character = 'lucia', options = {}) {
  const context = await browser.newContext({viewport: {width: 1280, height: 800}, offline: true, ...options});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${file}?debug&autostart=1&char=${character}`);
  await page.waitForFunction(() => window.vigilia?.state === 'running');
  await page.evaluate(() => {
    cancelAnimationFrame(window.vigilia.raf);
    window.vigilia.audio.sfx = () => {};
  });
  return {context, page, errors};
}

try {
  for (const character of ['lucia', 'julian', 'matilde']) {
    const {context, page, errors} = await openGame(character);
    const result = await page.evaluate(character => {
      const g = window.vigilia;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      g.reset();
      g.setState('running');
      g.st.crit = 0;
      g.player.x = 500; g.player.y = 500;
      g.player.hp = g.st.maxHp - 40;
      const enemy = g.spawn('hermano', {x: 560, y: 500});
      enemy.hp = enemy.maxHp = 10000;
      const farEnemy = g.spawn('hermano', {x: 1100, y: 500});
      farEnemy.hp = farEnemy.maxHp = 10000;
      g.gems = [{x: 750, y: 500, v: 1, bob: 0, magnet: false}];
      g.enemyShots = [
        {x: 550, y: 500, life: 4},
        {x: 1100, y: 500, life: 4}
      ];
      g.hazards = [{x: 530, y: 500}, {x: 1100, y: 500}];
      const beforeHp = g.player.hp;
      const before = g.getSnapshot().ability;
      check(before.ready, 'La habilidad no comienza disponible');
      check(g.ability(), 'No se activa la habilidad');
      const damage = enemy.maxHp - enemy.hp;
      check(damage > 0, 'La habilidad no alcanza a una criatura cercana');
      check(farEnemy.hp === farEnemy.maxHp, 'La habilidad daña fuera de su alcance');
      check(g.enemyShots.length === 1 && g.enemyShots[0].x === 1100, 'La habilidad no disipa solo proyectiles cercanos');
      check(g.hazards.length === 1 && g.hazards[0].x === 1100, 'La habilidad no disipa solo amenazas cercanas');
      check(g.abilitiesUsed === 1 && g.getSnapshot().ability.cd > 0 && !g.getSnapshot().ability.ready, 'No empieza la recarga');
      check(!g.ability() && g.abilitiesUsed === 1, 'Se puede repetir una habilidad durante la recarga');
      if (character === 'lucia') check(g.gems[0].magnet, 'Lumbre no atrae luz');
      if (character === 'julian') {
        check(g.wards.length === 1 && g.enemySlow(enemy) < 1, 'El cerco no frena a las criaturas');
        const hp = enemy.hp;
        for (let i = 0; i < 60; i++) g.updateRituals(1 / 60);
        check(enemy.hp < hp, 'El cerco no daña con el paso del tiempo');
        for (let i = 0; i < 600; i++) g.updateRituals(1 / 60);
        check(g.wards.length === 0 && g.enemySlow(enemy) === 1, 'Un cerco vencido conserva daño o ralentización');
      }
      if (character === 'matilde') check(g.player.hp > beforeHp && g.player.hp <= g.st.maxHp, 'Responso no cura o supera la vida máxima');
      for (const state of ['ready', 'paused', 'upgrade', 'dying', 'dawn', 'ended']) {
        g.state = state; g.abilityCd = 0;
        const used = g.abilitiesUsed;
        check(!g.getSnapshot().ability.ready && !g.ability() && g.abilitiesUsed === used, `Se activa la habilidad en ${state}`);
      }
      g.state = 'running'; g.phase = 'rush';
      check(!g.getSnapshot().ability.ready && !g.ability(), 'La habilidad aparece disponible mientras clarea');
      g.phase = 'night'; g.abilityCd = 0.05;
      g.updateRituals(0.1);
      check(g.getSnapshot().ability.ready && g.getSnapshot().ability.cd === 0, 'La recarga no se recupera');
      g.reset(); g.setState('running');
      check(g.abilitiesUsed === 0 && g.wards.length === 0 && g.getSnapshot().ability.ready, 'La habilidad o el cerco se filtran a otra noche');
      g.render();
      return {name: before.name, damage};
    }, character);
    assert.deepEqual(errors, [], `${character}: errores de JavaScript`);
    console.log(`✓ ${character}: ${result.name}, alcance, daño (${result.damage}), identidad, recarga y estados`);
    await context.close();
  }

  {
    const {context, page, errors} = await openGame();
    const result = await page.evaluate(() => {
      const g = window.vigilia;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      g.reset(); g.setState('running');
      const site = g.rituals[0];
      g.player.x = site.x; g.player.y = site.y; g.player.moving = false;
      g.player.hp = g.st.maxHp * 0.3;
      g.abilityCd = g.abilityMax();
      const initialCooldown = g.abilityMax();
      for (let i = 0; i < 60; i++) g.updateRituals(1 / 60);
      check(site.progress > 0 && site.progress < 1 && g.getSnapshot().ritual.active?.id === site.id, 'No se canaliza el farol al detenerse junto a él');
      const progress = site.progress;
      g.player.x += 200;
      g.updateRituals(0.3);
      check(site.progress < progress && !g.getSnapshot().ritual.active, 'El progreso no decae al alejarse');
      g.player.x = site.x;
      g.player.moving = true;
      const whileMoving = site.progress;
      g.updateRituals(0.2);
      check(site.progress <= whileMoving, 'Caminar permite encender un farol');
      g.player.moving = false;
      g.updateRituals(0.5);
      const beforeDamage = site.progress;
      g.player.inv = 0;
      g.damagePlayer(1, {x: site.x + 60, y: site.y});
      check(site.progress < beforeDamage && g.getSnapshot().ritual.interrupted, 'Recibir daño no interrumpe el farol');
      const afterDamage = site.progress;
      g.updateRituals(0.2);
      check(site.progress <= afterDamage, 'La canalización ignora la interrupción por daño');
      const hp = g.player.hp;
      const xp = g.xp;
      for (let i = 0; i < 300; i++) g.updateRituals(1 / 60);
      check(site.lit && g.getSnapshot().ritual.lit === 1, 'El farol no termina de encenderse');
      check(g.player.hp > hp && g.xp > xp && g.abilityMax() < initialCooldown, 'Encender no concede curación, recuerdo y recarga');
      const reward = {hp: g.player.hp, xp: g.xp};
      check(!g.lightRitual(site), 'Un farol encendido admite una segunda recompensa');
      for (let i = 0; i < 300; i++) g.updateRituals(1 / 60);
      check(g.player.hp === reward.hp && g.xp === reward.xp, 'Permanecer en el farol duplica la recompensa');
      const enemy = g.spawn('hermano', {x: site.x + 20, y: site.y});
      check(g.enemySlow(enemy) < 1, 'El farol encendido no protege su entorno');
      for (const other of g.rituals.slice(1)) {
        g.player.x = other.x; g.player.y = other.y;
        for (let i = 0; i < 220; i++) g.updateRituals(1 / 60);
      }
      const all = g.getSnapshot().ritual;
      check(all.lit === all.total && all.nearest === null && all.active === null, 'El estado no reconoce los tres faroles');
      const lit = all.lit;
      g.render();
      g.reset();
      check(g.getSnapshot().ritual.lit === 0 && g.rituals.every(ritual => !ritual.lit && ritual.progress === 0), 'Una nueva noche conserva faroles o progreso');
      return {lit};
    });
    assert.deepEqual(errors, [], 'Faroles: errores de JavaScript');
    console.log(`✓ ${result.lit} faroles: canalización, movimiento, daño, recompensa única, protección y reinicio`);
    await context.close();
  }

  {
    const {context, page, errors} = await openGame('julian');
    const result = await page.evaluate(() => {
      const g = window.vigilia;
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      g.reset(); g.setState('running'); g.updateFx(0);
      let peak = 0;
      for (let i = 0; i < 600; i++) {
        g.player.x += 16;
        g.updateFx(1 / 240);
        peak = Math.max(peak, g.sceneFx.footprints.length);
      }
      check(peak > 0 && peak <= 48, 'Las huellas no aparecen o superan su presupuesto');
      g.rituals[0].progress = 0.4;
      g.ability();
      const capture = () => JSON.stringify({rituals: g.rituals, wards: g.wards, abilityCd: g.abilityCd, abilityTime: g.abilityTime,
        footprints: g.sceneFx.footprints, effects: g.combatFx.effects, particles: g.particles});
      const before = capture();
      g.render(); g.render();
      g.setOptions({flashes: false, shake: false});
      g.render();
      check(capture() === before, 'Dibujar altera faroles, cercos o la duración de efectos');
      check(g.ctx.globalAlpha === 1 && g.ctx.globalCompositeOperation === 'source-over', 'El dibujo atmosférico deja alterado el contexto');
      g.updateFx(10);
      check(g.sceneFx.footprints.length === 0, 'Las huellas no caducan');
      g.player.x += 16; g.updateFx(1 / 60);
      check(g.sceneFx.footprints.length > 0, 'La prueba no vuelve a generar una huella');
      g.reset(); g.updateFx(0);
      check(g.sceneFx.footprints.length === 0, 'Las huellas pasan a la siguiente noche');
      // Una criatura que cruza de celda debe entrar en la consulta del disparo.
      g.player.x = 500; g.player.y = 500;
      const enemy = g.spawn('hermano', {x: 47.5, y: 500});
      enemy.speed = 36;
      g.updateEnemies(0.05);
      check(enemy.x > 48 && g.queryGrid(84.2, 500, 36).includes(enemy), 'El índice de colisiones conserva posiciones del fotograma anterior');
      g.reset();
      check(g.grid.size === 0 && g.queryGrid(84.2, 500, 36).length === 0, 'El índice de colisiones conserva criaturas de otra noche');
      return {peak};
    });
    assert.deepEqual(errors, [], 'Dibujo: errores de JavaScript');
    console.log(`✓ dibujo: ${result.peak} huellas como máximo, caducidad, reinicio, render sin efectos sobre reglas e índice de colisiones actualizado`);
    await context.close();
  }

  {
    const {context, page, errors} = await openGame('julian');
    await page.keyboard.press('e');
    assert.equal(await page.evaluate(() => window.vigilia.abilitiesUsed), 1, 'E no activa la habilidad');
    assert(await page.locator('#abilityButton').isDisabled(), 'La habilidad en recarga sigue habilitada');
    assert.match(await page.locator('#abilityName').textContent(), /Cerco de sal/);
    await page.keyboard.press('p');
    assert.equal(await page.evaluate(() => window.vigilia.state), 'paused');
    await page.waitForFunction(() => document.activeElement?.id === 'resumeButton');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'resumeButton', 'La pausa no recibe el foco');
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      assert(await page.evaluate(() => document.getElementById('pause').contains(document.activeElement)), 'El foco escapa de la pausa');
    }
    await page.locator('#pause [data-open="settingsDialog"]').click();
    assert(await page.locator('#settingsDialog').evaluate(dialog => dialog.open));
    for (const [id, value] of [['optMusic', 25], ['optAmbience', 40], ['optEffects', 65]]) {
      await page.locator(`#${id}`).evaluate((range, value) => { range.value = value; range.dispatchEvent(new Event('input', {bubbles: true})); }, value);
    }
    assert.deepEqual(await page.evaluate(() => ({...window.vigilia.audio.mix})), {music: 0.25, ambience: 0.4, effects: 0.65});
    await page.keyboard.press('Escape');
    assert(!(await page.locator('#settingsDialog').evaluate(dialog => dialog.open)), 'Escape no cierra ajustes');
    assert.equal(await page.evaluate(() => window.vigilia.state), 'paused', 'Cerrar ajustes reanuda la noche sin pedirlo');
    await page.locator('#resumeButton').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => window.vigilia.state), 'running', 'Espacio no activa el botón Seguir velando');
    assert.equal(await page.evaluate(() => window.vigilia.dashTime), 0, 'Activar Seguir velando también dispara una esquiva');
    await page.locator('#dashButton').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'game', 'El HUD no devuelve el foco al movimiento');
    await page.reload();
    await page.waitForFunction(() => window.vigilia?.state === 'running');
    await page.evaluate(() => cancelAnimationFrame(window.vigilia.raf));
    assert.deepEqual(await page.evaluate(() => ({...window.vigilia.audio.mix})), {music: 0.25, ambience: 0.4, effects: 0.65}, 'La mezcla no se conserva al recargar');
    assert.deepEqual(errors, [], 'Interfaz: errores de JavaScript');
    console.log('✓ teclado, recarga visible, foco de pausa, ajustes y mezcla persistente');
    await context.close();
  }

  {
    const {context, page, errors} = await openGame('matilde', {viewport: {width: 390, height: 844}, hasTouch: true, isMobile: true, reducedMotion: 'reduce'});
    const layout = await page.evaluate(() => ({
      flashes: window.vigilia.options.flashes,
      shake: window.vigilia.options.shake,
      fits: document.documentElement.scrollWidth <= innerWidth,
      ability: document.getElementById('abilityButton').getBoundingClientRect().toJSON(),
      dash: document.getElementById('dashButton').getBoundingClientRect().toJSON()
    }));
    assert.equal(layout.flashes, false);
    assert.equal(layout.shake, false);
    assert(layout.fits, 'El HUD se desborda en móvil');
    for (const rect of [layout.ability, layout.dash]) assert(rect.x >= 0 && rect.right <= 390 && rect.height >= 44, 'Un control táctil está fuera de pantalla o es demasiado pequeño');
    assert(layout.ability.right <= layout.dash.x || layout.dash.right <= layout.ability.x || layout.ability.bottom <= layout.dash.y || layout.dash.bottom <= layout.ability.y, 'Los controles táctiles se superponen');
    await page.locator('#abilityButton').tap();
    assert.equal(await page.evaluate(() => window.vigilia.abilitiesUsed), 1, 'El control táctil no activa la habilidad');
    await page.evaluate(() => { const g = window.vigilia; g.spawnBoss(); g.emitStats(); g.render(); });
    const bossLayout = await page.evaluate(() => ({
      boss: document.getElementById('bossBox').getBoundingClientRect().toJSON(),
      ritual: document.getElementById('ritualPanel').getBoundingClientRect().toJSON()
    }));
    assert(bossLayout.boss.bottom <= bossLayout.ritual.y || bossLayout.ritual.bottom <= bossLayout.boss.y || bossLayout.boss.right <= bossLayout.ritual.x || bossLayout.ritual.right <= bossLayout.boss.x, 'El jefe y los faroles se superponen en móvil');
    await page.locator('#pauseButton').tap();
    await page.locator('#pause [data-open="settingsDialog"]').tap();
    const dialogFits = await page.locator('#settingsDialog').evaluate(dialog => { const rect = dialog.getBoundingClientRect(); return rect.x >= 0 && rect.right <= innerWidth && dialog.scrollWidth <= dialog.clientWidth; });
    assert(dialogFits, 'Los ajustes se desbordan en móvil');
    assert.deepEqual(errors, [], 'Móvil: errores de JavaScript');
    console.log('✓ móvil 390 × 844: habilidad táctil, controles separados, ajustes y movimiento reducido');
    await context.close();
  }
} finally {
  await browser.close();
}
