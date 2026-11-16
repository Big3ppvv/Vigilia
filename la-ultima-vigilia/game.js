/*
 * La vigilia por rondas. Este archivo lleva el compás: empieza una partida,
 * abre y cierra cada ronda, encadena recuerdos, ofrendas y el puesto de
 * Remedios, y termina la noche. Cada sistema vive en su módulo y se suma aquí.
 *
 * Estados: ready (título) → running (ronda) ⇄ paused → roundEnd → levelup →
 * crate → shop → running… → dawn | dying → ended.
 */
import { clamp, rand, pick } from './util.js';
import { ROUNDS, BOSS_ROUND, PLAYER, DANGER, roundTime, clockAt, fmtClock, xpFor, ECONOMY } from './balance.js';
import { Lighting } from './art.js';
import { Arena } from './arena.js';
import { AudioEngine } from './audio.js';
import { CombatEffects } from './combat-fx.js';
import { Ambient } from './ambient.js';
import { CHARACTERS, BARKS, AMPARO, HOURS, VIGIL_TEXT, BOSS } from './story.js';
import { blankStats, derived } from './stats.js';
import { WEAPON, CLASSES } from './arsenal.js';
import { ITEM } from './items.js';
import { inputMethods } from './input.js';
import { waveMethods } from './waves.js';
import { weaponMethods } from './weapons.js';
import { enemyMethods } from './enemies.js';
import { shopMethods } from './shop.js';
import { fxMethods } from './fx.js';
import { botMethods } from './bot.js';
import { renderMethods } from './render.js';
import { abilityMethods } from './abilities.js';

const SAVE_VERSION = 3;

export class VigilGame {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: false});
    this.hooks = hooks;
    this.audio = new AudioEngine();
    this.lighting = new Lighting();
    this.arena = new Arena();
    this.combatFx = new CombatEffects();
    this.ambient = new Ambient();
    this.options = {shake: true, flashes: true, numbers: true, softDark: false, weather: true};
    this.muted = false;
    this.state = 'ready';
    this.character = 'lucia';
    this.keys = new Set();
    this.pointer = null;
    this.width = 900; this.height = 560;
    this.clock = 0;
    this.lastFrame = performance.now();
    this.timeScale = 1;
    this.bot = false;
    this.god = false;
    this.handlers = [];
    this.cam = {x: 0, y: 0, zoom: 1};
    this.titleFocus = {x: 0, y: -200};
    this.grid = new Map();
    this.reset();
    this.resize();
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ---------- ciclo de vida ---------- */

  /* Todo lo de una partida; nada de lo que se guarda entre noches. */
  reset() {
    this.run = {
      character: this.character, danger: 0, round: 1, cera: 0, melt: 0, xp: 0, level: 1, pending: 0,
      bonus: blankStats(), weapons: [], items: {}, crates: [], harvest: 0, revived: 0,
      kills: 0, ceraTotal: 0, damageBy: {}, lockedOffers: [], shopVisits: 0, uid: 0, elitesDown: 0, freed: false
    };
    this.player = {x: 0, y: 40, vx: 0, vy: 0, hp: 20, face: 1, inv: 0, walk: 0, moving: false, lean: 0, squash: 0, hurtT: 0};
    this.enemies = []; this.shots = []; this.enemyShots = []; this.hazards = []; this.areas = [];
    this.drops = []; this.marks = []; this.structures = [];
    this.particles = []; this.rings = []; this.numbers = []; this.flashes = []; this.ghosts = []; this.corpses = [];
    this.combatFx.clear();
    this.ambient.clear();
    this.timeLeft = roundTime(1); this.roundLength = roundTime(1); this.roundClock = 0;
    this.dashCd = 0; this.dashTime = 0; this.dashDir = {x: 1, y: 0}; this.lastMove = {x: 1, y: 0};
    this.shake = 0; this.flash = 0; this.flashColor = '255,255,255'; this.freeze = 0; this.slowmo = 0; this.zoomPunch = 0;
    this.boss = null; this.stopped = false; this.stoppedFor = 0; this.dawnBreaks = false; this.lastVictory = false;
    this.endT = 0; this.dyingT = 0; this.dawnT = 0; this.cause = null;
    this.choices = []; this.upgradeRerolls = 0; this.crate = null; this.offers = []; this.rerolls = 0; this.freeRerolls = 0;
    this.seen = new Set(); this.said = new Set(); this.subQueue = []; this.sub = null; this.subT = 0;
    this.danger = 0; this.enemyId = 0; this.lowHpCd = 0; this.hourShown = -1;
    this.t = {stats: 0, ghost: 0, step: 0, bell: 0};
    this.grid.clear(); this.botMemo = null;
    this.resetWaves(); this.resetAbility();
    this.keys.clear(); this.pointer = null;
    this.computeStats();
    this.player.hp = this.d.maxHp;
    this.lifestealBudget = 10;
  }

  /* Empieza una partida nueva con un personaje, un arma inicial y una dificultad. */
  start(character, weapon, danger = 0) {
    this.character = CHARACTERS[character] ? character : 'lucia';
    this.reset();
    const ch = CHARACTERS[this.character];
    this.run.danger = clamp(danger | 0, 0, DANGER.length - 1);
    const first = WEAPON[weapon] && ch.weapons.includes(weapon) ? weapon : ch.weapons[0];
    this.addWeapon(first, 0);
    for (const id of ch.items || []) this.addItem(id, false);
    this.audio.init();
    this.audio.setMuted(this.muted);
    this.computeStats();
    this.player.hp = this.d.maxHp;
    this.bark('start', {line: pick(BARKS[this.character].start), delay: 1.4});
    this.hooks.onDiscover?.({kind: 'weapon', id: first});
    this.startRound(1);
    this.canvas.focus?.({preventScroll: true});
  }

  /* Reanuda una partida guardada en el puesto de Remedios. */
  continueRun(save) {
    if (!save || save.v !== SAVE_VERSION || !CHARACTERS[save.run?.character]) return false;
    this.character = save.run.character;
    this.reset();
    Object.assign(this.run, save.run, {bonus: Object.assign(blankStats(), save.run.bonus)});
    this.run.weapons = save.run.weapons.filter(w => WEAPON[w.id]).map(w => this.makeWeapon(w.id, w.tier));
    this.run.items = Object.fromEntries(Object.entries(save.run.items || {}).filter(([id]) => ITEM[id]));
    this.audio.init();
    this.audio.setMuted(this.muted);
    this.computeStats();
    this.player.hp = this.d.maxHp;
    this.offers = (save.offers || []).filter(o => (o.kind === 'weapon' ? WEAPON[o.id] : ITEM[o.id]));
    this.rerolls = save.rerolls || 0;
    this.openShop(true);
    return true;
  }

  saveData() {
    if (!['shop'].includes(this.state)) return null;
    const r = this.run;
    return {v: SAVE_VERSION, at: Date.now(), offers: this.offers, rerolls: this.rerolls,
      run: {...r, weapons: r.weapons.map(w => ({id: w.id, tier: w.tier})), crates: [], damageBy: {...r.damageBy}}};
  }

  setState(state) { this.state = state; this.hooks.onState?.(state); }
  pause() { if (this.state !== 'running') return; this.keys.clear(); this.pointer = null; this.setState('paused'); this.emitStats(); }
  resume() { if (this.state !== 'paused') return; this.keys.clear(); this.pointer = null; this.lastFrame = performance.now(); this.setState('running'); this.canvas.focus?.({preventScroll: true}); }
  setMuted(v) { this.muted = !!v; this.audio.setMuted(this.muted); if (!this.muted) this.audio.init(); }
  setVolume(v) { this.audio.setVolume(v); }
  setOptions(o) { Object.assign(this.options, o); this.ambient.enabled = this.options.weather !== false; }
  backToTitle() { this.reset(); this.setState('ready'); this.hooks.onSubtitle?.(null); this.emitStats(); }
  destroy() { cancelAnimationFrame(this.raf); this.handlers.forEach(fn => fn()); this.resizeObserver.disconnect(); this.audio.destroy?.(); }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || 900), cssH = Math.max(1, rect.height || 560);
    // La cámara enseña siempre una porción parecida del atrio: más cerca en pantallas grandes.
    this.zoom = Math.min(cssW, cssH) < 520 ? 0.62 : clamp(Math.floor(Math.min(cssW / 1180, cssH / 700) * 4) / 4, 0.75, 3);
    this.width = cssW / this.zoom;
    this.height = cssH / this.zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.dpr = dpr;
    this.ctx.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.lighting.resize(this.width, this.height);
  }

  /* ---------- bucle ---------- */

  frame(ts) {
    const raw = Math.min(0.05, Math.max(0, (ts - this.lastFrame) / 1000));
    this.lastFrame = ts;
    this.clock += raw;
    this.pollGamepad();
    const steps = ['running', 'roundEnd', 'dying', 'dawn'].includes(this.state) ? Math.max(1, Math.floor(this.timeScale)) : 1;
    try { for (let i = 0; i < steps; i++) this.step(raw); } catch (err) { console.error(err); }
    try { this.render(raw); } catch (err) { console.error(err); }
    try { this.audio.update(raw, this.audioState()); } catch (err) { console.error(err); }
    this.raf = requestAnimationFrame(this.frame);
  }

  step(raw) {
    // La cámara lenta del final de ronda y la pausa de impacto solo afectan a la simulación.
    let dt = raw;
    if (this.slowmo > 0) { this.slowmo = Math.max(0, this.slowmo - raw); dt *= 0.35; }
    if (this.state === 'running') {
      if (this.freeze > 0) { this.freeze -= raw; this.updateFx(raw * 0.25); }
      else this.update(dt);
      this.updateSubtitles(raw);
    } else if (this.state === 'roundEnd') { this.updateRoundEnd(dt); this.updateSubtitles(raw); }
    else if (this.state === 'dying') { this.updateDying(dt); this.updateSubtitles(raw); }
    else if (this.state === 'dawn') { this.updateDawn(dt); this.updateSubtitles(raw); }
    else if (['ready', 'shop', 'levelup', 'crate', 'ended'].includes(this.state)) { this.updateFx(raw); this.updatePlayerIdle(raw); }
  }

  audioState() {
    const scene = {ready: 'title', running: 'run', paused: 'pause', roundEnd: 'run', levelup: 'shop', crate: 'shop', shop: 'shop', dying: 'end', dawn: 'dawn', ended: this.lastVictory ? 'dawn' : 'end'}[this.state] || 'title';
    const minutes = clockAt(this.run.round, 1 - this.timeLeft / this.roundLength);
    return {scene, hour: minutes / 60, danger: this.danger, hp: this.player.hp / this.d.maxHp, boss: !!(this.boss && this.boss.hp > 0),
      soul: 0, lull: 0, rain: this.weatherLook().rain, tide: false, procession: this.processionNear || 0, procPan: this.processionPan || 0,
      round: this.run.round, intensity: this.state === 'running' ? clamp(0.35 + this.run.round / ROUNDS * 0.65, 0, 1) : 0};
  }

  update(dt) {
    const p = this.player;
    this.roundClock += dt;
    // La cuenta atrás. En la última ronda, sin liberar a la Guía, el reloj se para.
    if (!this.stopped) this.timeLeft = Math.max(0, this.timeLeft - dt);
    else this.stoppedFor += dt;
    const minutes = clockAt(this.run.round, 1 - this.timeLeft / this.roundLength);
    const hour = Math.floor(minutes / 60);
    if (hour > this.hourShown && hour <= 5) { this.hourShown = hour; if (hour > 0) this.onHour(hour); }
    if (this.timeLeft <= 0 && !this.stopped) {
      if (this.boss && this.boss.hp > 0) this.stopClock();
      else { this.endRound(); return; }
    }
    if (this.stopped && this.stoppedFor > 60 && !this.dawnBreaks) {
      this.dawnBreaks = true;
      this.banner(VIGIL_TEXT.dawnBreaks[0], VIGIL_TEXT.dawnBreaks[1], 'dawn');
    }

    p.inv = Math.max(0, p.inv - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.squash *= Math.exp(-dt * 12);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.lowHpCd = Math.max(0, this.lowHpCd - dt);
    this.lifestealBudget = Math.min(10, this.lifestealBudget + dt * 10);
    this.movePlayer(dt);
    if (this.d.hps > 0 && p.hp < this.d.maxHp) this.heal(this.d.hps * dt, true);

    this.buildGrid();
    this.updateSpawns(dt);
    this.updateEnemies(dt);
    if (this.state !== 'running') return;
    this.updateWeapons(dt);
    this.updateStructures(dt);
    this.updateAbility(dt);
    this.updateShots(dt);
    this.updateHazards(dt);
    if (this.state !== 'running') return;
    this.updateDrops(dt);
    this.updateFx(dt);
    this.t.stats -= dt;
    if (this.t.stats <= 0) { this.t.stats = 0.1; this.emitStats(); }
  }

  /* Moverse tiene inercia corta: arranca y frena enseguida, pero no de golpe. */
  movePlayer(dt) {
    const p = this.player;
    const mv = this.bot ? this.botMove() : this.movement();
    if (this.dashSoon) { this.dashSoon = false; this.dash(mv); }
    const len = Math.hypot(mv.x, mv.y);
    p.moving = len > 0.05;
    if (p.moving) { this.lastMove = {x: mv.x / len, y: mv.y / len}; if (Math.abs(mv.x) > 0.05) p.face = mv.x < 0 ? -1 : 1; }
    const speed = this.d.speed * (this.abilityBuff?.speed ? 1 + this.abilityBuff.speed / 100 : 1) * (this.dashTime > 0 ? 1 : this.wading ?? 1);
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      p.vx = this.dashDir.x * speed * PLAYER.dashSpeed; p.vy = this.dashDir.y * speed * PLAYER.dashSpeed;
      this.t.ghost -= dt;
      if (this.t.ghost <= 0) { this.t.ghost = 0.03; this.ghosts.push({x: p.x, y: p.y, face: p.face, life: 0.26, total: 0.26}); }
    } else {
      const k = 1 - Math.exp(-dt * PLAYER.accel);
      p.vx += (mv.x * speed - p.vx) * k; p.vy += (mv.y * speed - p.vy) * k;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.lean += ((p.vx / Math.max(1, speed)) * 0.12 - p.lean) * (1 - Math.exp(-dt * 10));
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 20) {
      p.walk += dt * (6 + sp / 26);
      this.t.step -= dt;
      if (this.t.step <= 0) { this.t.step = 0.28; this.footstep(); }
    }
    this.arena.resolve(p, PLAYER.radius);
  }

  updatePlayerIdle(dt) {
    const p = this.player;
    p.squash *= Math.exp(-dt * 10);
    p.vx *= Math.exp(-dt * 12); p.vy *= Math.exp(-dt * 12);
  }

  heal(amount, quiet = false) {
    const p = this.player, before = p.hp;
    p.hp = Math.min(this.d.maxHp, p.hp + amount);
    const got = p.hp - before;
    if (!quiet && got >= 1) this.floatText(p.x, p.y - 34, `+${Math.round(got)}`, '#8fe39a', 1);
    return got;
  }

  /* ---------- estadísticas ---------- */

  computeStats() {
    const r = this.run, ch = CHARACTERS[r.character] || CHARACTERS.lucia;
    const st = blankStats();
    st.maxHp = 20;
    const add = (stats, n = 1) => { for (const [k, v] of Object.entries(stats || {})) if (k in st) st[k] += v * n; };
    add(ch.stats);
    add(r.bonus);
    const sp = {cafe: 0, pickup: 0, elite: 0, interest: 0, double: 0, thorns: 0, explode: 0, burn: 0, xp: 0, discount: 0,
      freeReroll: 0, structures: [], revive: 0, slowAura: 0, cera: 0, bell: 0, beam: 0, structure: 0};
    const addSpecial = (special, n = 1) => {
      for (const [k, v] of Object.entries(special || {})) {
        if (k === 'structure' && typeof v === 'string') { for (let i = 0; i < n; i++) sp.structures.push(v); continue; }
        if (k in sp && typeof v === 'number') sp[k] += v * n;
      }
    };
    addSpecial(ch.special);
    for (const [id, n] of Object.entries(r.items)) {
      const it = ITEM[id];
      if (!it) continue;
      add(it.stats, n);
      addSpecial(it.special, n);
    }
    // Premios por clase de arma: cuenta cada clase una vez por arma distinta en hueco.
    const counts = {};
    for (const w of r.weapons) for (const c of WEAPON[w.id].classes) counts[c] = (counts[c] || 0) + 1;
    this.classCounts = counts;
    for (const [c, n] of Object.entries(counts)) {
      const bonus = CLASSES[c]?.bonus[Math.min(6, n)];
      if (bonus) add(bonus);
    }
    sp.slowAura = Math.min(0.6, sp.slowAura);
    sp.discount = Math.min(0.5, sp.discount);
    sp.interest = Math.min(0.3, sp.interest);
    const prevMax = this.d?.maxHp;
    this.st = st;
    this.sp = sp;
    this.d = derived(st);
    if (prevMax && this.player && this.d.maxHp > prevMax) this.player.hp = Math.min(this.d.maxHp, this.player.hp + this.d.maxHp - prevMax);
    if (this.player) this.player.hp = Math.min(this.player.hp, this.d.maxHp);
  }

  makeWeapon(id, tier = 0) {
    return {uid: ++this.run.uid, id, tier: clamp(tier, 0, 3), cd: rand(0.1, 0.4), anim: null, a: 0, hits: new Set(), x: 0, y: 0, aim: 0, recoil: 0, beads: 0};
  }

  addWeapon(id, tier = 0) {
    if (!WEAPON[id] || this.run.weapons.length >= PLAYER.maxWeapons) return null;
    const w = this.makeWeapon(id, tier);
    this.run.weapons.push(w);
    this.computeStats();
    return w;
  }

  addItem(id, announce = true) {
    const it = ITEM[id];
    if (!it) return false;
    this.run.items[id] = (this.run.items[id] || 0) + 1;
    this.computeStats();
    this.hooks.onDiscover?.({kind: 'item', id});
    if (announce) this.audio.sfx('compra');
    return true;
  }

  /* ---------- rondas ---------- */

  startRound(r) {
    const run = this.run;
    run.round = r;
    run.cratesThisRound = 0;
    this.wading = 1;
    this.roundLength = roundTime(r);
    this.timeLeft = this.roundLength;
    this.roundClock = 0;
    this.stopped = false; this.stoppedFor = 0;
    this.enemies = []; this.shots = []; this.enemyShots = []; this.hazards = []; this.areas = []; this.marks = [];
    this.drops = this.drops.filter(d => d.kind === 'crate');
    this.corpses = [];
    const p = this.player;
    p.x = 0; p.y = 40; p.vx = 0; p.vy = 0; p.inv = 1.0;
    this.computeStats();
    p.hp = this.d.maxHp;            // Cada ronda empieza con la vela entera.
    this.dashCd = 0;
    this.resetWaveRound(r);
    this.placeStructures();
    for (const w of run.weapons) { w.cd = rand(0.15, 0.5); w.anim = null; }
    this.cam.x = p.x; this.cam.y = p.y;
    this.setState('running');
    const minutes = clockAt(r, 0), hour = Math.floor(minutes / 60);
    if (this.hourShown < 0) this.hourShown = hour;
    const boss = r === BOSS_ROUND;
    this.banner(`${VIGIL_TEXT.roundStart} ${r}`, boss ? BOSS.arrive : HOURS[Math.min(5, hour)].mood, boss ? 'boss' : 'round');
    this.audio.sfx('ronda', {round: r});
    if (r === 1) this.audio.sfx('hora', {count: 12, gap: 0.55});
    this.emitStats();
  }

  onHour(h) {
    this.audio.sfx('hora', {count: h, gap: 1.1});
    this.bark('hour' + h, {delay: 0.8, priority: 2});
  }

  stopClock() {
    this.stopped = true; this.stoppedFor = 0;
    this.audio.sfx('reloj');
    this.banner(VIGIL_TEXT.stopped[0], VIGIL_TEXT.stopped[1], 'boss');
    this.bark('stopped', {priority: 3, delay: 0.6});
  }

  /* Se acaba la cuenta atrás: todo lo que hay en el atrio se deshace. */
  endRound() {
    if (this.state !== 'running') return;
    this.setState('roundEnd');
    this.endT = 0;
    this.slowmo = 0.5;
    this.keys.clear(); this.pointer = null;
    for (const e of this.enemies) if (e.hp > 0 && !e.dissolve) { e.dissolve = true; e.dissolveT = rand(0.15, 0.9); }
    if (this.eliteAlive && this.eliteAlive.hp > 0) this.banner(VIGIL_TEXT.eliteGone[0], VIGIL_TEXT.eliteGone[1], 'elite');
    else this.banner(VIGIL_TEXT.roundClear[0], VIGIL_TEXT.roundClear[1], 'clear');
    this.enemyShots = []; this.hazards = []; this.marks = [];
    // Lo que queda en el suelo se funde: en la ronda siguiente, cada gota trae un poco más.
    for (const d of this.drops) {
      if (d.kind === 'cera') { this.run.melt += d.v; d.melt = true; }
      else if (d.kind === 'crate') { this.run.crates.push({rarity: d.rarity || 0}); d.got = true; }
      else if (d.kind === 'cafe') d.got = true;
    }
    if (this.options.flashes) { this.flash = 0.35; this.flashColor = '255,236,190'; }
    this.audio.sfx('rondaFin');
    this.emitStats();
  }

  updateRoundEnd(dt) {
    this.endT += dt;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.dissolveT -= dt;
      if (e.dissolveT <= 0) { e.hp = 0; this.deathFx(e, true); }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    // La cera fundida sube hacia quien vela.
    const p = this.player;
    for (const d of this.drops) {
      if (!d.melt) continue;
      const dx = p.x - d.x, dy = p.y - 20 - d.y, dist = Math.hypot(dx, dy) || 1;
      d.x += dx / dist * Math.min(dist, 520 * dt); d.y += dy / dist * Math.min(dist, 520 * dt);
      if (dist < 16) d.got = true;
    }
    this.drops = this.drops.filter(d => !d.got);
    this.movePlayer(dt * 0.5);
    this.updateShots(dt);
    this.updateFx(dt);
    if (this.endT > 1.7) this.afterRound();
  }

  /* Cosecha, intereses y la fila de pantallas: recuerdos, ofrendas, Remedios. */
  afterRound() {
    const run = this.run;
    this.drops = this.drops.filter(d => d.kind === 'crate' && !d.got);
    const harvest = Math.round(this.d.harvest);
    if (harvest > 0) { run.cera += harvest; run.xp += harvest * 0.5; run.ceraTotal += harvest; }
    run.bonus.harvest += Math.max(0, this.st.harvest) * ECONOMY.harvestGrowth;
    if (this.sp.interest > 0) {
      const gain = Math.min(25 * Math.ceil(this.sp.interest / 0.1), Math.floor(run.cera * this.sp.interest));
      if (gain > 0) { run.cera += gain; run.ceraTotal += gain; }
    }
    this.lastHarvest = harvest;
    this.checkLevel();
    this.computeStats();
    this.nextScreen();
  }

  /* Decide qué viene después: otro recuerdo, una ofrenda, la tienda o el alba. */
  nextScreen() {
    if (this.run.pending > 0) { this.openLevelUp(); return; }
    if (this.run.crates.length) { this.openCrate(); return; }
    if (this.run.round >= ROUNDS) { this.beginDawn(); return; }
    this.openShop();
  }

  nextRound() {
    if (this.state !== 'shop') return false;
    this.run.lockedOffers = this.offers.filter(o => o.locked && !o.sold);
    this.audio.sfx('salir');
    this.startRound(this.run.round + 1);
    return true;
  }

  /* ---------- experiencia ---------- */

  gainXp(v) {
    this.run.xp += v;
    this.checkLevel(true);
  }

  checkLevel(live = false) {
    const run = this.run;
    let ups = 0;
    while (run.xp >= xpFor(run.level)) {
      run.xp -= xpFor(run.level);
      run.level++;
      run.pending++;
      run.bonus.maxHp += 1;
      ups++;
    }
    if (!ups) return;
    this.computeStats();
    if (!live) return;
    const p = this.player;
    this.heal(ups);
    this.rings.push({x: p.x, y: p.y - 10, r: 10, max: 130, life: 0.6, total: 0.6, color: '#ffe08a', width: 3, light: 220});
    this.burst(p.x, p.y - 14, 22, '#ffe08a', 160);
    this.floatText(p.x, p.y - 48, VIGIL_TEXT.levelUp, '#ffe08a', 1.4, true);
    this.audio.sfx('nivel');
    this.hooks.onLevel?.({level: run.level, pending: run.pending});
  }

  /* ---------- final ---------- */

  die() {
    const p = this.player;
    if (this.sp.revive > this.run.revived) {
      this.run.revived++;
      p.hp = Math.ceil(this.d.maxHp * 0.5);
      p.inv = 2.2;
      this.rings.push({x: p.x, y: p.y, r: 10, max: 220, life: 0.8, total: 0.8, color: '#fff1bd', width: 4, light: 300});
      this.knockAll(p.x, p.y, 220, 520);
      this.banner(VIGIL_TEXT.revive[0], VIGIL_TEXT.revive[1], 'clear');
      this.say(AMPARO.revive, AMPARO.name, {italic: true, priority: 4});
      this.audio.sfx('levanta');
      return;
    }
    this.beginDying('out');
  }

  beginDying(cause) {
    if (this.state !== 'running') return;
    this.cause = cause;
    this.dyingT = 0;
    this.deathClock = fmtClock(clockAt(this.run.round, 1 - this.timeLeft / this.roundLength));
    this.audio.sfx('apagon');
    this.slowmo = 1.2;
    this.marks = []; this.hazards = []; this.enemyShots = [];
    this.setState('dying');
    this.hooks.onSubtitle?.(null);
    this.sub = null; this.subQueue = [];
  }

  updateDying(dt) {
    this.dyingT += dt;
    this.updateFx(dt);
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = this.player.x - e.x, dy = this.player.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (d > 46) { e.x += dx / d * e.speed * 0.3 * dt; e.y += dy / d * e.speed * 0.3 * dt; }
    }
    if (this.dyingT > 2.2) this.end(false);
  }

  beginDawn() {
    this.dawnT = 0;
    for (const e of this.enemies) if (e.hp > 0 && !e.dissolve) { e.dissolve = true; e.dissolveT = rand(0.3, 1.8); }
    this.enemyShots = []; this.hazards = []; this.marks = []; this.areas = [];
    this.audio.sfx('hora', {count: 6, gap: 1.2});
    this.audio.sfx('alba');
    this.banner(HOURS[6].name, HOURS[6].mood, 'dawn');
    this.bark('dawn', {priority: 4, delay: 1, once: false});
    this.say(AMPARO.dawn, AMPARO.name, {italic: true, priority: 4, delay: 0.6});
    this.player.inv = 99;
    this.setState('dawn');
    this.emitStats();
  }

  updateDawn(dt) {
    this.dawnT += dt;
    this.updateFx(dt);
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.dissolveT -= dt;
      if (Math.random() < 0.3) this.particle({x: e.x + rand(-8, 8), y: e.y + rand(-10, 6), vx: rand(-10, 10), vy: rand(-50, -25), life: 0.8, size: 2, color: '#ffd59a', glow: true});
      if (e.dissolveT <= 0) e.hp = 0;
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.movePlayer(dt * 0.4);
    if ((this.dawnT > 9 && !this.sub && !this.subQueue.length) || this.dawnT > 20) this.end(true);
  }

  end(victory) {
    if (this.state === 'ended') return;
    this.lastVictory = victory;
    const r = this.run;
    const result = {victory, cause: victory ? 'dawn' : this.cause, round: r.round, clock: victory ? '06:00' : this.deathClock,
      kills: r.kills, level: r.level, character: r.character, danger: r.danger, cera: r.ceraTotal, freed: r.freed,
      weapons: r.weapons.map(w => ({id: w.id, tier: w.tier, damage: Math.round(r.damageBy[w.uid] || 0)})), items: {...r.items},
      elites: r.elitesDown, revived: r.revived};
    this.setState('ended');
    this.keys.clear(); this.pointer = null;
    this.hooks.onSubtitle?.(null);
    this.emitStats();
    this.hooks.onEnd?.(result);
  }

  /* ---------- voces ---------- */

  say(text, speaker, {italic = false, priority = 1, delay = 0} = {}) {
    if (this.subQueue.length > 3) this.subQueue = this.subQueue.filter(s => s.priority >= priority);
    this.subQueue.push({text, speaker, italic, priority, delay});
    this.subQueue.sort((a, b) => b.priority - a.priority);
  }

  bark(key, {once = true, line, priority = 1, delay = 0} = {}) {
    const set = BARKS[this.run.character];
    let text = line || set?.[key];
    if (!text) return false;
    if (Array.isArray(text)) text = pick(text);
    if (once && this.said.has(key)) return false;
    this.said.add(key);
    this.say(text, CHARACTERS[this.run.character].name, {priority, delay});
    return true;
  }

  updateSubtitles(dt) {
    if (this.sub) {
      this.subT -= dt;
      if (this.subT <= 0) { this.sub = null; this.hooks.onSubtitle?.(null); }
    }
    if (!this.sub && this.subQueue.length) {
      const next = this.subQueue[0];
      next.delay -= dt;
      if (next.delay > 0) return;
      this.subQueue.shift();
      this.sub = next;
      this.subT = 2 + next.text.length * 0.048;
      this.hooks.onSubtitle?.(next);
    }
  }

  banner(title, sub, tone = 'round', art = null) { this.hooks.onBanner?.({title, sub, tone, art}); }

  /* ---------- estado para la interfaz ---------- */

  getSnapshot() {
    const r = this.run, b = this.boss, e = this.eliteAlive;
    const minutes = clockAt(r.round, 1 - this.timeLeft / Math.max(1, this.roundLength));
    const hour = Math.min(6, Math.floor(minutes / 60));
    return {
      state: this.state, round: r.round, rounds: ROUNDS, timeLeft: this.timeLeft, roundLength: this.roundLength, stopped: this.stopped,
      clock: this.state === 'dawn' || (this.state === 'ended' && this.lastVictory) ? '06:00' : fmtClock(minutes), hour, mood: HOURS[hour].mood,
      hp: this.player.hp, maxHp: this.d.maxHp, xp: r.xp, xpNext: xpFor(r.level), level: r.level, pending: r.pending,
      cera: r.cera, melt: r.melt, crates: r.crates.length + this.drops.filter(d => d.kind === 'crate').length,
      kills: r.kills, character: r.character, danger: r.danger,
      dashCd: this.dashCd, dashMax: PLAYER.dashCd, ability: this.abilitySnapshot(),
      weapons: r.weapons.map(w => ({uid: w.uid, id: w.id, tier: w.tier})), items: {...r.items},
      stats: {...this.st}, classes: {...this.classCounts},
      elite: e && e.hp > 0 ? {id: e.elite, hp: e.hp, maxHp: e.maxHp} : null,
      boss: b ? {alive: b.hp > 0, hp: Math.max(0, b.hp), maxHp: b.maxHp, rage: !!b.rage} : null
    };
  }

  emitStats() { this.hooks.onStats?.(this.getSnapshot()); }
}

Object.assign(VigilGame.prototype, inputMethods, waveMethods, weaponMethods, enemyMethods, shopMethods, fxMethods, botMethods, renderMethods, abilityMethods);
