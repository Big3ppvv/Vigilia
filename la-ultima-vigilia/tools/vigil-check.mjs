/*
 * Las reglas del velatorio en Chromium, sobre el HTML descargable y sin conexión:
 * el recinto, los cirios, la procesión, el alma, levantarse, el arrullo, los
 * huecos y los rincones, los difuntos con nombre y la marea.
 *
 *   node build.mjs && node tools/vigil-check.mjs
 * Requiere Playwright y Chromium, igual que tools/smoke.mjs.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const launchOptions = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {};
const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await chromium.launch(launchOptions);

try {
  const context = await browser.newContext({viewport: {width: 1100, height: 720}, offline: !process.env.VIGILIA_TEST_URL});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  // Sin conexión la tipografía no carga: eso no es un fallo del juego.
  page.on('console', message => { if (message.type() === 'error' && !/Failed to load resource/.test(message.text())) errors.push(message.text()); });
  await page.goto(`${file}?debug&autostart=1&char=lucia`);
  await page.waitForFunction(() => window.vigilia?.state === 'running');

  const report = await page.evaluate(() => {
    const g = window.vigilia;
    cancelAnimationFrame(g.raf);
    g.audio.sfx = () => {};
    g.spawning = () => {};
    const done = [];
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    const DT = 1 / 60;
    const run = (seconds, fn) => { for (let t = 0; t < seconds; t += DT) { g.clock += DT; fn(DT); } };
    // Una noche limpia, sin armas ni criaturas, con quien vela donde haga falta.
    const fresh = (character = 'lucia', x = 0, y = 300) => {
      g.character = character;
      g.reset();
      g.state = 'running';
      g.god = false;
      g.setOptions({shake: false, flashes: true});
      for (const key of Object.keys(g.mem)) g.mem[key] = 0;
      g.order = [];
      g.computeStats();
      g.st.crit = 0;
      g.player.hp = g.st.maxHp;
      g.player.x = x; g.player.y = y;
      g.enemies = [];
      g.buildGrid();
    };
    const litNow = () => g.cirios.filter(c => c.lit).length;

    // El recinto: no se sale del muro ni se atraviesa el ataúd.
    fresh();
    for (const [x, y] of [[99999, 0], [-99999, 0], [0, 99999], [0, -99999]]) {
      g.player.x = x; g.player.y = y;
      g.cemetery.resolve(g.player);
      check(Math.abs(g.player.x) < 1560 && Math.abs(g.player.y) < 1160, 'Quien vela sale del camposanto');
    }
    g.player.x = 0; g.player.y = 0;
    g.cemetery.resolve(g.player);
    check(Math.abs(g.player.x) > 44 || g.player.y < -12 || g.player.y > 14, 'Quien vela queda dentro del ataúd');
    done.push('recinto');

    // Los cirios: se apagan, y se encienden quedándose a su lado.
    fresh();
    check(litNow() === 4, 'La noche no empieza con los cuatro cirios encendidos');
    const cirio = g.cirios[0];
    g.snuffCirio(cirio);
    check(litNow() === 3 && !cirio.lit, 'El cirio no se apaga');
    run(2, dt => g.updateVigil(dt));
    check(!cirio.lit, 'Un cirio se enciende solo, sin nadie al lado');
    g.player.x = cirio.x - 14; g.player.y = cirio.y + 14;
    let lucia = 0;
    while (!cirio.lit && lucia < 3) { g.updateVigil(DT); lucia += DT; }
    check(cirio.lit && lucia > 0.8 && lucia < 1.2, `Lucía tarda ${lucia.toFixed(2)} s en encender un cirio (debería rondar 1 s)`);
    fresh('matilde');
    g.snuffCirio(g.cirios[0]);
    g.player.x = g.cirios[0].x - 14; g.player.y = g.cirios[0].y + 14;
    let matilde = 0;
    while (!g.cirios[0].lit && matilde < 3) { g.updateVigil(DT); matilde += DT; }
    check(matilde < lucia * 0.65, `Matilde no enciende más deprisa (${matilde.toFixed(2)} s frente a ${lucia.toFixed(2)} s)`);
    done.push('cirios');

    // La procesión va a los cirios: cada hermano apaga uno y se va con la llama.
    fresh('lucia', 900, 900);
    g.time = 120;
    g.spawnProcession({id: 'prueba', x: 0, y: -260, dx: 0, dy: -1});
    const members = [...g.enemies];
    check(members.length >= 3 && members.every(e => e.proc), 'La procesión no sale en fila');
    let carried = 0;
    run(40, dt => {
      g.updateVigil(dt);
      g.updateEnemies(dt);
      carried = Math.max(carried, members.filter(e => e.carry).length);
    });
    const snuffedByProcession = 4 - litNow();
    check(snuffedByProcession === Math.min(4, members.length), `La procesión de ${members.length} apagó ${snuffedByProcession} cirios`);
    check(carried === snuffedByProcession, 'No coincide: cada hermano que apaga un cirio se va con su llama');
    check(g.enemies.every(e => !e.proc || e.dissolve), 'Sin cirios que apagar, los hermanos que quedan deberían ir a por quien vela');
    done.push('procesión');

    // A oscuras se llevan a Amparo; con un cirio encendido, el alma vuelve.
    fresh('lucia', 900, 900);
    for (const c of g.cirios) g.snuffCirio(c);
    run(10, dt => g.updateVigil(dt));
    const rising = g.soul;
    check(rising > 0.2 && rising < 0.5 && g.state === 'running', `A oscuras el alma sube mal (${rising.toFixed(2)} en 10 s)`);
    g.lightCirio(g.cirios[1]);
    run(4, dt => g.updateVigil(dt));
    check(g.soul < rising, 'Con un cirio encendido el alma no vuelve');
    g.snuffCirio(g.cirios[1]);
    run(60, dt => { if (g.state === 'running') g.updateVigil(dt); });
    check(g.state === 'dying' && g.cause === 'took', 'A oscuras no se llevan a Amparo');
    done.push('alma');

    // Caer: un cirio te levanta y se apaga; sin cirios, la vela se apaga de verdad.
    fresh();
    g.damagePlayer(99999, null);
    check(g.state === 'running' && g.player.hp > 0 && litNow() === 3 && g.revives === 1, 'Un cirio encendido no levanta a quien cae');
    check(g.player.inv > 1, 'Al levantarse no hay un respiro');
    g.player.inv = 0;
    for (const c of g.cirios) g.snuffCirio(c);
    g.damagePlayer(99999, null);
    check(g.state === 'dying' && g.cause === 'out', 'Sin cirios, caer debería apagar la vela');
    done.push('levantarse');

    // El arrullo amansa, deshace las lágrimas y enciende los cirios cercanos.
    fresh('lucia', 0, 60);
    g.snuffCirio(g.cirios[2]);
    const near = g.spawn('hermano', {x: 120, y: 60}), far = g.spawn('hermano', {x: 900, y: 60});
    near.hp = near.maxHp = far.hp = far.maxHp = 10000;
    g.enemyShots.push({x: 40, y: 60, vx: 0, vy: 0, life: 5, r: 6, dmg: 9, kind: 'lagrima'});
    g.lullCd = 0;
    check(g.arrullo() === true, 'El arrullo no arranca estando listo');
    check(g.arrullo() === false, 'El arrullo se puede repetir sin esperar');
    check(g.enemyShots.length === 0, 'El arrullo no deshace las lágrimas');
    check(g.cirios[2].lit, 'El arrullo no enciende el cirio que alcanza');
    g.updateEnemies(DT);
    check(near.lulled && !far.lulled, 'El arrullo no distingue a quién alcanza');
    const before = near.hp;
    g.hurt(near, 100, {knock: 0, silent: true});
    check(Math.abs(before - near.hp - 125) < 0.01, 'Lo arrullado no recibe un cuarto más de daño');
    const x0 = near.x, x1 = far.x;
    run(1, dt => g.updateEnemies(dt));
    check(Math.abs(near.x - x0) < Math.abs(far.x - x1) * 0.6, 'Lo arrullado no anda más despacio');
    done.push('arrullo');

    // En una noche caben cuatro armas y cinco recuerdos.
    fresh();
    for (const key of ['chispas', 'sal', 'rosario', 'campana']) { g.mem[key] = 1; g.order.push(key); }
    g.computeStats();
    let offeredWeapon = false, offeredMemory = false;
    for (let i = 0; i < 40; i++) {
      g.xp = g.xpNext;
      g.levelUp();
      check(g.state === 'upgrade' && g.choices.length === 3, 'Subir de nivel no ofrece tres cartas');
      offeredWeapon ||= g.choices.some(c => c.kind === 'arma' && c.isNew);
      offeredMemory ||= g.choices.some(c => c.kind === 'recuerdo' && c.isNew);
      g.state = 'running'; g.choices = [];
    }
    check(!offeredWeapon, 'Con cuatro armas se sigue ofreciendo una quinta');
    check(offeredMemory, 'Con huecos libres no se ofrecen recuerdos nuevos');
    done.push('huecos');

    // Los rincones: reunir sus recuerdos cambia las reglas.
    fresh();
    g.mem.pan = 1; g.mem.radio = 1; g.order.push('pan', 'radio');
    g.computeStats();
    check(g.rooms.size === 0 && g.st.heal === 1, 'Un rincón a medias ya cuenta');
    g.xp = g.xpNext; g.levelUp();
    g.choices = [{id: 'caldo', kind: 'recuerdo', name: 'caldo', level: 1, isNew: true}];
    check(g.chooseUpgrade('caldo') && g.rooms.has('cocina') && g.st.heal === 1.5, 'La cocina no vuelve al reunir pan, radio y caldo');
    g.player.hp = 10; g.heal(10);
    check(Math.abs(g.player.hp - 25) < 0.01, 'La cocina no hace rendir más lo que cura');

    fresh();
    for (const key of ['chispas', 'rosario', 'campana']) g.mem[key] = 1;
    g.checkRooms(false);
    check(g.rooms.has('iglesia'), 'Su banco en la iglesia no se reúne');
    g.t.chispas = g.t.sal = 999; g.t.campana = 0;
    g.weapons(0);
    check(g.shots.length === 8, `La campana de la iglesia suelta ${g.shots.length} chispas en vez de 8`);

    fresh();
    for (const key of ['farol', 'sal', 'gafas']) g.mem[key] = 1;
    g.checkRooms(false);
    const burnt = g.spawn('hermano', {x: 0, y: 500});
    burnt.hp = burnt.maxHp = 10000;
    g.beamA = Math.atan2(burnt.y - (420 - 174), burnt.x - 1905);
    g.beamBurn();
    check(burnt.hp < 10000, 'El haz del faro no quema lo que barre');

    fresh();
    for (const key of ['risa', 'manos']) g.mem[key] = 1;
    g.checkRooms(false);
    const close = g.spawn('hermano', {x: g.player.x + 60, y: g.player.y});
    close.hp = close.maxHp = 10000;
    g.buildGrid();
    g.damagePlayer(5, close);
    check(close.hp < 10000, 'Su risa no aparta ni hiere a lo que rodea');

    fresh();
    for (const key of ['mecedora', 'fotos', 'polillas']) g.mem[key] = 1;
    const slowDash = g.st.dashCd;
    g.checkRooms(false);
    check(g.rooms.has('alcoba') && g.st.dashCd < slowDash, 'La alcoba no acorta la esquiva');
    const inWay = g.spawn('hermano', {x: g.player.x + 20, y: g.player.y});
    inWay.hp = inWay.maxHp = 10000;
    g.buildGrid();
    g.dashHit = new Set(); g.dashDir = {x: 1, y: 0};
    g.dashThrough(); g.dashThrough();
    check(inWay.maxHp - inWay.hp > 0 && inWay.maxHp - inWay.hp < 60, 'La esquiva de la alcoba no hiere una sola vez por salto');
    done.push('rincones');

    // Los difuntos con nombre aguantan más y dejan su recordatorio.
    fresh();
    g.time = 160;
    const plain = g.spawn('urco', {x: 500, y: 500});
    const elite = g.spawnElite({at: 155, id: 'urco', type: 'urco'});
    check(elite.elite === 'urco' && elite.maxHp > plain.maxHp * 5, 'El difunto no aguanta más que los demás');
    const level = g.level;
    g.kill(elite);
    const card = g.gems.find(gem => gem.card);
    check(card && g.elitesDown === 1, 'El difunto no deja su recordatorio');
    g.player.x = card.x; g.player.y = card.y + 4;
    g.updatePickups(DT);
    check(g.cardPending, 'El recordatorio no se recoge');
    g.cardPending = false; g.levelUp(true);
    check(g.state === 'upgrade' && g.choiceFree && g.level === level, 'El recordatorio debería dar a elegir sin gastar luz');
    g.state = 'running';
    done.push('difuntos');

    // La marea: los charcos frenan y de algunos sale un ahogado.
    fresh('lucia', 400, 400);
    g.spawnPool(400, 400, 60, true);
    run(2, dt => g.updatePools(dt));
    check(g.inPool, 'El charco no frena a quien lo pisa');
    check(g.enemies.some(e => e.type === 'ahogado'), 'Del charco no sale un ahogado');
    for (let i = 0; i < 30; i++) g.spawnPool(300 + i * 5, 600, 50, false);
    check(g.pools.length <= 8, 'Los charcos crecen sin límite');
    g.spawnPool(0, 0, 50, false);
    check(Math.hypot(g.pools.at(-1).x, g.pools.at(-1).y) >= 149, 'Un charco aparece encima del ataúd');
    done.push('marea');

    // La Guía apaga los cirios antes de poder llevarse a Amparo.
    fresh('lucia', 600, 600);
    g.time = 505;
    g.spawnBoss();
    g.enemies = [g.boss];
    g.boss.x = 60; g.boss.y = 0;
    run(3, dt => { g.updateVigil(dt); g.updateEnemies(dt); });
    check(litNow() < 4 && g.soul === 0, 'La Guía debería apagar cirios antes de llevarse el alma');
    run(14, dt => { g.updateVigil(dt); g.updateEnemies(dt); });
    check(litNow() === 0 && g.soul > 0, 'A oscuras y con la Guía junto al ataúd, el alma debería subir');
    done.push('la Guía');

    // Lo que se dibuja de más tiene tope, y el dibujo deja el lienzo como estaba.
    fresh();
    for (let i = 0; i < 300; i++) g.ambient.decal(['scorch', 'salt', 'wax', 'wet', 'ash', 'straw', 'feather', 'cloth'][i % 8], i, i);
    check(g.ambient.decals.length <= 90, 'Las huellas del suelo crecen sin límite');
    g.time = 250;
    g.spawnPool(g.player.x + 60, g.player.y);
    g.spawnProcession();
    g.spawnElite({at: 255, id: 'lema', type: 'ahogado'});
    g.lullCd = 0; g.arrullo();
    for (const state of ['running', 'paused', 'ready']) { g.state = state; g.render(); }
    check(g.ctx.globalAlpha === 1 && g.ctx.globalCompositeOperation === 'source-over', 'El dibujo deja alterado el contexto');
    g.setOptions({weather: false});
    g.state = 'running'; g.render();
    g.reset();
    check(g.ambient.decals.length === 0 && g.pools.length === 0 && litNow() === 4 && g.rooms.size === 0, 'Reiniciar conserva restos de la noche anterior');
    done.push('dibujo y límites');
    return done;
  });

  assert.deepEqual(errors, [], 'errores de JavaScript');
  for (const name of report) console.log(`✓ ${name}`);
  await context.close();
} finally {
  await browser.close();
}
