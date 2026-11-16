/*
 * Las reglas de la vigilia, una por una, con la simulación paso a paso:
 * daño y escalado, subir de nivel, el final de ronda, recuerdos, ofrendas,
 * el puesto de Remedios (comprar, juntar, vender, candado, tiradas), la
 * medalla que levanta, la partida guardada, la dificultad y la Guía.
 *
 *   node build.mjs && node tools/gameplay.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
const browser = await launchBrowser();

async function openGame(query = '') {
  const context = await browser.newContext({viewport: {width: 1280, height: 800}, offline: !process.env.VIGILIA_TEST_URL});
  const page = await context.newPage();
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(`${file}?debug&autostart=1${query}`);
  await page.waitForFunction(() => window.vigilia?.state === 'running');
  await page.evaluate(() => {
    const g = window.vigilia;
    cancelAnimationFrame(g.raf);
    g.audio.sfx = () => {};
    // Avanza la simulación a mano: dt fijo, como a 60 Hz.
    window.advance = seconds => { for (let t = 0; t < seconds; t += 1 / 60) g.step(1 / 60); };
    window.check = (condition, message) => { if (!condition) throw new Error(message); };
  });
  return {context, page, errors};
}

const results = [];
async function rule(name, query, fn) {
  const {context, page, errors} = await openGame(query);
  try {
    const detail = await page.evaluate(fn);
    assert.deepEqual(errors, [], `${name}: errores de JavaScript`);
    results.push(`✓ ${name}${detail ? ` · ${detail}` : ''}`);
  } finally {
    await context.close();
  }
}

try {
  await rule('Cada personaje empieza con su arma, la vida llena y veinte segundos', '', async () => {
    const g = window.vigilia;
    for (const id of ['lucia', 'julian', 'matilde', 'tono', 'sabela', 'anselmo']) {
      g.backToTitle();
      g.start(id, null, 0);
      check(g.state === 'running' && g.run.round === 1, `${id}: no empieza la ronda 1`);
      check(g.run.weapons.length === 1, `${id}: debe empezar con un arma`);
      check(g.player.hp === g.d.maxHp, `${id}: no empieza con la vida llena`);
      check(Math.abs(g.timeLeft - 20) < 0.01, `${id}: la primera ronda dura 20 s`);
    }
    check(g.structures.length === 1 && g.structures[0].kind === 'cruceiro', 'Don Anselmo empieza con su cruceiro');
    return '6 personajes';
  });

  await rule('Las estadísticas suman, curan lo que suben y escalan el daño', '&char=julian&weapon=pala', async () => {
    const g = window.vigilia;
    const hp0 = g.d.maxHp;
    g.player.hp = 10;
    g.addItem('caldo', false);
    check(g.d.maxHp === hp0 + 5, 'el caldo no suma 5 de vida máxima');
    check(g.player.hp === 15, 'subir la vida máxima no cura lo que sube');
    const pala = g.run.weapons[0], before = g.weaponDamage(pala);
    g.run.bonus.melee += 5; g.computeStats();
    check(g.weaponDamage(pala) > before + 6, 'la pala no escala con cuerpo a cuerpo (140 %)');
    g.addItem('zuecos', false);
    check(g.st.armor === 4 && g.d.armor < 1, 'la armadura no reduce el daño recibido');
    const slow = g.d.speed;
    g.addItem('mecedora', false);
    check(g.d.speed > slow, 'la velocidad no sube');
    g.run.bonus.dodge = 500; g.computeStats();
    check(g.d.dodge === 0.6, 'la evasión no respeta su tope del 60 %');
    return `pala ${Math.round(before)} → ${Math.round(g.weaponDamage(pala))}`;
  });

  await rule('Las armas atacan solas, la cera cae, se recoge y da experiencia', '&char=julian&weapon=pala', async () => {
    const g = window.vigilia;
    g.enemies = []; g.marks = []; g.spawnT = 99; g.procT = 99;
    g.player.x = 0; g.player.y = 0;
    const e = g.spawn('anima', 50, 0, true);
    e.speed = 0; e.cd = 99;
    const xp0 = g.run.xp, cera0 = g.run.cera;
    advance(3);
    check(e.hp <= 0, 'la pala no acaba con un ánima a su alcance');
    check(g.run.kills === 1, 'no cuenta la baja');
    const drop = g.drops.find(d => d.kind === 'cera');
    if (drop) { g.player.x = drop.x; g.player.y = drop.y + 8; advance(1); }
    check(g.run.cera > cera0 && g.run.xp > xp0, 'la cera cercana no se recoge o no da experiencia');
    return `cera ${g.run.cera}`;
  });

  await rule('Subir de nivel suma vida y deja un recuerdo pendiente', '', async () => {
    const g = window.vigilia;
    const hp = g.d.maxHp;
    g.gainXp(14);
    check(g.run.level === 2 && g.run.pending === 1, 'no sube al nivel 2 con un recuerdo pendiente');
    check(g.d.maxHp === hp + 1, 'subir de nivel no da +1 de vida máxima');
    g.gainXp(500);
    check(g.run.pending > 3, 'varias subidas seguidas no se acumulan');
    return `nivel ${g.run.level}`;
  });

  await rule('Fin de ronda: la cera del suelo se funde, recuerdos, ofrenda y tienda', '', async () => {
    const g = window.vigilia;
    g.gainXp(14);
    g.drops.push({kind: 'cera', x: 400, y: 300, z: 0, vz: 0, vx: 0, vy: 0, v: 5, bob: 0, age: 1});
    g.run.crates.push({rarity: 1});
    g.timeLeft = 0.01;
    advance(0.1);
    check(g.state === 'roundEnd', 'al acabar la cuenta atrás no termina la ronda');
    check(g.run.melt >= 5, 'la cera que queda en el suelo no se funde');
    advance(2);
    check(g.state === 'levelup' && g.choices.length === 4, 'no se ofrecen cuatro recuerdos');
    const c = g.choices[0], before = g.st[c.stat];
    check(g.chooseUpgrade(0), 'no se puede elegir un recuerdo');
    check(Math.abs(g.st[c.stat] - before - c.value) < 1e-9, 'el recuerdo no suma lo que dice');
    check(g.state === 'crate' && g.crate, 'después del recuerdo no se abre la ofrenda');
    const id = g.crate.id;
    g.takeCrate();
    check(g.run.items[id] === 1, 'quedarse la ofrenda no añade el objeto');
    check(g.state === 'shop' && g.offers.length === 4, 'no abre el puesto con cuatro ofertas');
    check(g.saveData()?.run?.round === 1, 'no se guarda la partida en la tienda');
    // La cera fundida se suma a lo que se recoge en la ronda siguiente.
    g.nextRound();
    const melt = g.run.melt, cera = g.run.cera;
    g.pickup({kind: 'cera', v: 1});
    check(g.run.melt < melt && g.run.cera - cera > 1, 'la cera fundida no se suma al recoger');
    return `recuerdo «${c.name}»`;
  });

  await rule('Repensar un recuerdo cuesta cera y vende la ofrenda', '', async () => {
    const g = window.vigilia;
    g.run.cera = 100;
    g.gainXp(14);
    g.run.crates.push({rarity: 0});
    g.timeLeft = 0.01; advance(2.2);
    check(g.state === 'levelup', 'no llega a los recuerdos');
    const cost = g.upgradeRerollCost();
    check(g.rerollUpgrades() && g.run.cera === 100 - cost, 'repensar no cobra');
    check(g.upgradeRerollCost() > cost, 'repensar no se encarece');
    g.chooseUpgrade(1);
    const sell = g.crate.sell, cera = g.run.cera;
    g.sellCrate();
    check(g.run.cera === cera + sell && g.state === 'shop', 'dejar la ofrenda no da su cera');
    return `repensar ${cost}`;
  });

  await rule('El puesto de Remedios: comprar, juntar al comprar, sin hueco, vender, juntar y candado', '&char=sabela&weapon=remo', async () => {
    const g = window.vigilia;
    g.timeLeft = 0.01; advance(2.2);
    check(g.state === 'shop', 'no se abre la tienda');
    g.run.cera = 5000;
    const offer = (kind, id, tier = 0) => ({kind, id, tier, price: g.priceOf(kind, id, tier), locked: false, sold: false});
    g.offers = [offer('weapon', 'hoz'), offer('item', 'caldo'), offer('weapon', 'arpon'), offer('weapon', 'tea')];
    check(g.buy(0) && g.run.weapons.length === 2, 'comprar un arma no la añade');
    check(g.run.cera < 5000, 'comprar no cobra');
    check(g.buy(1) && g.run.items.caldo === 1, 'comprar un objeto no lo añade');
    check(!g.buy(1), 'se puede comprar dos veces lo vendido');
    for (const id of ['honda', 'pandeireta', 'gaita', 'remo']) g.addWeapon(id, id === 'remo' ? 0 : 0);
    check(g.run.weapons.length === 6, 'no caben seis armas');
    g.offers = [offer('weapon', 'hoz'), offer('weapon', 'mayal'), offer('item', 'ruda'), offer('item', 'broa')];
    check(g.canBuy(g.offers[0]).combine, 'con seis armas, una igual no se junta al comprar');
    g.buy(0);
    check(g.run.weapons.length === 6 && g.run.weapons.some(w => w.id === 'hoz' && w.tier === 1), 'comprar la gemela no sube de nivel la hoz');
    check(g.canBuy(g.offers[1]).reason === 'Sin hueco' && !g.buy(1), 'se compra un arma sin hueco');
    // Juntar a mano: dos remos de nivel I.
    const remos = g.run.weapons.filter(w => w.id === 'remo');
    check(remos.length === 2 && g.combinable(remos[0].uid), 'dos remos iguales no se pueden juntar');
    g.combineWeapon(remos[0].uid);
    check(g.run.weapons.filter(w => w.id === 'remo').length === 1 && g.run.weapons.find(w => w.id === 'remo').tier === 1, 'juntar no deja un remo II');
    const victim = g.run.weapons.find(w => w.id === 'gaita'), value = g.sellValue(victim), cera = g.run.cera;
    check(g.sellWeapon(victim.uid) && g.run.cera === cera + value, 'vender no paga lo que dice');
    // Candado: lo guardado vuelve en la próxima visita.
    check(g.toggleLock(2) && g.offers[2].locked, 'el candado no se cierra');
    const kept = g.offers[2].id;
    const r = g.rerolls, cost = g.rerollCost();
    check(g.rerollShop() && g.offers.some(o => o.id === kept && o.locked), 'una tirada se lleva lo que tiene candado');
    check(g.rerolls === r + 1 && g.rerollCost() > cost, 'las tiradas no se encarecen');
    g.nextRound();
    g.timeLeft = 0.01; advance(2.2);
    while (g.state === 'levelup') g.chooseUpgrade(0);
    while (g.state === 'crate') g.takeCrate();
    check(g.state === 'shop' && g.offers.some(o => o.id === kept), 'lo guardado con candado no vuelve en la siguiente visita');
    return `armas: ${g.run.weapons.map(w => w.id + (w.tier + 1)).join(' ')}`;
  });

  await rule('No se puede vender la última arma; la baraja da tiradas gratis', '', async () => {
    const g = window.vigilia;
    g.addItem('baraja', false);
    g.timeLeft = 0.01; advance(2.2);
    while (g.state === 'levelup') g.chooseUpgrade(0);
    check(g.state === 'shop', 'no llega a la tienda');
    check(!g.sellWeapon(g.run.weapons[0].uid), 'se puede vender la única arma');
    check(g.rerollCost() === 0, 'la baraja no da una tirada gratis');
    g.run.cera = 0;
    check(g.rerollShop() && g.rerollCost() > 0, 'la tirada gratis no se gasta');
    check(!g.rerollShop(), 'se puede tirar sin cera');
    return '';
  });

  await rule('La medalla del Carmen levanta una vez; después, la vela se apaga', '', async () => {
    const g = window.vigilia;
    g.addItem('medalla', false);
    g.player.inv = 0; g.run.bonus.dodge = -100; g.computeStats();
    g.damagePlayer(9999, {x: g.player.x + 5, y: g.player.y});
    check(g.state === 'running' && g.player.hp === Math.ceil(g.d.maxHp / 2), 'la medalla no levanta con media vida');
    g.player.inv = 0;
    g.damagePlayer(9999, {x: g.player.x + 5, y: g.player.y});
    check(g.state === 'dying', 'la medalla levanta dos veces');
    advance(3);
    check(g.state === 'ended' && !g.lastVictory, 'no termina la noche');
    return '';
  });

  await rule('Guardar en la tienda y continuar la partida', '&char=matilde&weapon=agua', async () => {
    const g = window.vigilia;
    g.addItem('figa', false); g.addWeapon('hoz', 2);
    g.timeLeft = 0.01; advance(2.2);
    while (g.state === 'levelup') g.chooseUpgrade(0);
    const save = JSON.parse(JSON.stringify(g.saveData()));
    g.backToTitle();
    check(g.state === 'ready', 'no vuelve al título');
    check(g.continueRun(save), 'no se puede continuar');
    check(g.state === 'shop' && g.run.character === 'matilde' && g.run.round === 1, 'no recupera la partida');
    check(g.run.items.figa === 1 && g.run.weapons.some(w => w.id === 'hoz' && w.tier === 2), 'no recupera armas u objetos');
    check(g.offers.length === 4, 'no recupera las ofertas');
    g.nextRound();
    check(g.state === 'running' && g.run.round === 2, 'no sigue en la ronda 2');
    return '';
  });

  await rule('Las dificultades aprietan: más aguante y más daño', '&danger=0', async () => {
    const g = window.vigilia;
    g.start('lucia', 'chispas', 0);
    const a = g.spawn('hermano', 300, 0, true);
    g.start('lucia', 'chispas', 2);
    g.run.danger = 2;
    const b = g.spawn('hermano', 300, 0, true);
    check(b.maxHp > a.maxHp * 1.25 && b.damage > a.damage * 1.25, 'la noche de ánimas no aprieta');
    return `${Math.round(a.maxHp)} → ${Math.round(b.maxHp)} de aguante`;
  });

  await rule('Difunto con nombre y horda en su ronda; al vencerlo deja ofrenda rara', '', async () => {
    const g = window.vigilia;
    g.god = true;
    g.startRound(3);
    advance(0.4 * 30 + 2);
    const elite = g.enemies.find(e => e.elite);
    check(elite && elite.elite === 'peto', 'en la ronda 3 no viene el ánima del peto');
    g.hurt(elite, elite.hp + 1);
    check(g.drops.some(d => d.kind === 'crate' && d.rarity >= 2), 'vencerlo no deja una ofrenda rara');
    g.startRound(5);
    advance(0.45 * 40 + 1.5);
    check(g.enemies.length > 20, 'la horda de la ronda 5 no llega');
    return '';
  });

  await rule('La Guía: el reloj se para hasta liberarla y entonces amanece', '', async () => {
    const g = window.vigilia;
    g.god = true;
    g.startRound(18);
    advance(4.5);
    check(g.boss && g.boss.hp > 0, 'la Guía no llega en la última ronda');
    g.timeLeft = 0.01; advance(0.2);
    check(g.state === 'running' && g.stopped, 'sin liberar a la Guía, la ronda termina');
    g.hurt(g.boss, g.boss.hp + 1);
    advance(0.2);
    check(g.run.freed && g.state === 'roundEnd', 'liberarla no termina la ronda');
    advance(2);
    while (g.state === 'levelup') g.chooseUpgrade(0);
    while (g.state === 'crate') g.takeCrate();
    check(g.state === 'dawn', 'después de la última ronda no amanece');
    advance(22);
    check(g.state === 'ended' && g.lastVictory, 'el alba no termina en victoria');
    return '';
  });

  console.log(results.join('\n'));
} finally {
  await browser.close();
}
