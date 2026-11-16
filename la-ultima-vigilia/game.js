/*
 * La noche de Difuntos, de 00:00 a 06:00 (cien segundos por hora).
 * Este archivo lleva el compás: arranca la noche, la hace avanzar y la termina.
 * Cada sistema vive en su módulo y se suma aquí al juego.
 */
import { TAU, clamp, rand, pick } from './util.js';
import { NIGHT, HOUR, BOSS_AT, ELITE_PLAN, fmtClock } from './balance.js';
import { Lighting } from './art.js';
import { Cemetery } from './world.js';
import { AudioEngine } from './audio.js';
import { CombatEffects } from './combat-fx.js';
import { Ambient } from './ambient.js';
import { CHARACTERS, MEMORIES, BARKS, AMPARO, HOURS, VIGIL_TEXT } from './story.js';
import { inputMethods } from './input.js';
import { directorMethods } from './director.js';
import { weaponMethods } from './weapons.js';
import { memoryMethods } from './memories.js';
import { enemyMethods } from './enemies.js';
import { bossMethods } from './boss.js';
import { fxMethods } from './fx.js';
import { botMethods } from './bot.js';
import { vigilMethods } from './vigil.js';
import { renderMethods } from './render.js';

export class VigilGame {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: false});
    this.hooks = hooks;
    this.audio = new AudioEngine();
    this.lighting = new Lighting();
    this.cemetery = new Cemetery();
    this.combatFx = new CombatEffects();
    this.ambient = new Ambient();
    this.options = {shake: true, flashes: true, numbers: false, softDark: false, weather: true};
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
    this.cam = {x: 0, y: 24};
    this.titleFocus = {x: 0, y: 30};
    this.grid = new Map();
    this.beamA = 0;
    this.reset();
    this.resize();
    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  /* ---------- ciclo de vida ---------- */

  reset() {
    const ch = CHARACTERS[this.character] || CHARACTERS.lucia;
    this.time = 0; this.kills = 0; this.level = 1; this.xp = 0; this.xpNext = this.xpFor(1);
    this.mem = Object.fromEntries(MEMORIES.map(m => [m.id, 0]));
    this.order = [];
    for (const [k, v] of Object.entries(ch.start)) { this.mem[k] = v; this.order.push(k); }
    this.player = {x: 0, y: 96, hp: ch.hp, face: 1, inv: 0, dip: 0, walk: 0, moving: false};
    this.rooms = new Set();
    this.computeStats();
    this.player.hp = this.st.maxHp;
    this.enemies = []; this.shots = []; this.enemyShots = []; this.hazards = [];
    this.gems = []; this.particles = []; this.rings = []; this.numbers = [];
    this.corpses = []; this.marks = []; this.moths = []; this.ghosts = [];
    this.combatFx.clear();
    this.ambient.clear();
    this.t = {chispas: 0.35, sal: 0.4, campana: 2.5, farol: 0.4, spawn: 0.6, procession: 40, swarm: 26, tide: 5, ghost: 0,
      bossSummon: 5, bossWater: 3, bossSpiral: 4, regenFx: 0, stats: 0, danger: 0, step: 0};
    this.resetVigil();
    this.resetDirector();
    this.checkRooms(false);
    this.dashCd = 0; this.dashTime = 0; this.dashDir = {x: 1, y: 0}; this.lastMove = {x: 1, y: 0};
    this.phase = 'night'; this.hourShown = 0; this.boss = null; this.soul = 0; this.stoppedFor = 0;
    this.rushFrom = 0; this.dawnT = 0; this.dyingT = 0; this.cause = null; this.bossReached = false; this.bossRaged = false;
    this.dawnBreaks = false; this.deathClock = null; this.lastVictory = false;
    this.damageTaken = 0; this.minHp = Infinity;
    this.shake = 0; this.flash = 0; this.flashColor = '255,255,255'; this.freeze = 0;
    this.seen = new Set(); this.said = new Set(); this.subQueue = []; this.sub = null; this.subT = 0;
    this.lowHpCd = 0; this.amparoSaid = new Set(); this.danger = 0;
    this.choices = []; this.choiceFree = false; this.enemyId = 0;
    this.cards = 0; this.cardPending = false; this.elitesDown = 0; this.lightGot = 0; this.flare = 0;
    this.ellaCd = 0; this.dashHit = new Set(); this.soulMax = 0; this.freedAt = null;
    this.keys.clear(); this.pointer = null;
  }

  start(character) {
    this.character = CHARACTERS[character] ? character : 'lucia';
    this.reset();
    this.audio.init();
    this.audio.setMuted(this.muted);
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.setState('running');
    this.banner(HOURS[0].name, HOURS[0].mood);
    this.audio.sfx('hora', {count: 12, gap: 1.5});
    this.bellT = 12 * 1.5 + 1.5;
    for (const id of this.order) this.hooks.onDiscover?.({kind: 'memory', id});
    this.bark('start', {line: pick(BARKS[this.character].start), delay: 2.2});
    for (let i = 0; i < 7; i++) {
      const e = this.spawn('anima');
      if (e) { const a = i / 7 * TAU + 0.4, r = Math.max(this.width, this.height) * 0.62; e.x = this.player.x + Math.cos(a) * r; e.y = this.player.y + Math.sin(a) * r; }
    }
    this.emitStats();
    this.canvas.focus?.({preventScroll: true});
  }

  /* Para pruebas: salta a un momento de la noche. */
  skipTo(seconds) {
    if (this.state !== 'running') return;
    this.time = clamp(seconds, 0, NIGHT - 2);
    this.hourShown = Math.min(5, Math.floor(this.time / HOUR));
    this.elitesDone = ELITE_PLAN.filter(plan => plan.at < this.time).length;
  }

  setState(state) { this.state = state; this.hooks.onState?.(state); }
  pause() { if (this.state !== 'running') return; this.keys.clear(); this.pointer = null; this.setState('paused'); }
  resume() { if (this.state !== 'paused') return; this.keys.clear(); this.pointer = null; this.lastFrame = performance.now(); this.setState('running'); this.canvas.focus?.({preventScroll: true}); }
  setMuted(v) { this.muted = !!v; this.audio.setMuted(this.muted); if (!this.muted) this.audio.init(); }
  setVolume(v) { this.audio.setVolume(v); }
  setOptions(o) { Object.assign(this.options, o); this.ambient.enabled = this.options.weather !== false; }
  backToTitle() { this.reset(); this.setState('ready'); this.hooks.onSubtitle?.(null); this.emitStats(); }
  destroy() { cancelAnimationFrame(this.raf); this.handlers.forEach(fn => fn()); this.resizeObserver.disconnect(); }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || 900), cssH = Math.max(1, rect.height || 560);
    // En pantallas pequeñas se aleja un poco la cámara para ver venir a la Compaña.
    // En las grandes se acerca, a saltos de medio punto para que el píxel quede limpio.
    this.zoom = Math.min(cssW, cssH) < 520 ? 0.75 : clamp(Math.floor(Math.min(cssW / 1100, cssH / 640) * 2) / 2, 1, 3);
    this.width = cssW / this.zoom;
    this.height = cssH / this.zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.lighting.resize(this.width, this.height);
  }

  /* ---------- bucle ---------- */

  frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - this.lastFrame) / 1000));
    this.lastFrame = ts;
    this.clock += dt;
    // El faro gira siempre; con el rincón del faro reunido, el doble de deprisa.
    this.beamA = (this.beamA + dt * 0.42 * (this.rooms.has('faro') && this.state === 'running' ? 2 : 1)) % TAU;
    this.pollGamepad();
    const steps = this.state === 'running' ? Math.max(1, Math.floor(this.timeScale)) : 1;
    // Un fallo en un fotograma no puede dejar la noche congelada: se anota y se sigue.
    try { for (let i = 0; i < steps; i++) this.step(dt); } catch (err) { console.error(err); }
    try { this.render(dt); } catch (err) { console.error(err); }
    try { this.audio.update(dt, this.audioState()); } catch (err) { console.error(err); }
    this.raf = requestAnimationFrame(this.frame);
  }

  step(dt) {
    if (this.state === 'running') {
      if (this.freeze > 0) this.freeze -= dt;
      else this.update(dt);
      this.updateSubtitles(dt);
    } else if (this.state === 'dying') { this.updateDying(dt); this.updateSubtitles(dt); }
    else if (this.state === 'dawn') { this.updateDawn(dt); this.updateSubtitles(dt); }
    else if (this.state === 'ready') { this.updateFx(dt); this.cemetery.warm(); }
  }

  audioState() {
    const scene = {ready: 'title', running: 'run', paused: 'pause', upgrade: 'pause', dying: 'end', dawn: 'dawn', ended: this.lastVictory ? 'dawn' : 'end'}[this.state] || 'title';
    const running = this.state === 'running' || this.state === 'paused' || this.state === 'upgrade';
    const head = running && !this.boss ? this.processionHead() : null;
    return {scene, hour: this.time / HOUR, danger: this.danger, hp: this.player.hp / this.st.maxHp, boss: !!(this.boss && this.boss.hp > 0),
      soul: running ? this.soul : 0, lull: this.lull, rain: this.weatherLook().rain, tide: running && !!this.act().tide && this.phase === 'night',
      procession: head ? clamp(1 - Math.hypot(head.x, head.y) / 1200, 0.05, 1) : 0, procPan: head ? clamp((head.x - this.player.x) / 700, -1, 1) : 0};
  }

  update(dt) {
    const p = this.player, st = this.st;
    // El reloj de la noche
    if (this.phase === 'rush') this.time = Math.min(NIGHT, this.time + dt * Math.max(10, (NIGHT - this.rushFrom) / 5.5));
    else if (this.phase === 'stopped') this.stoppedFor += dt;
    else this.time += dt;
    if (this.phase === 'night' && this.boss && this.boss.hp > 0 && this.time >= NIGHT - 1) this.stopClock();
    if (this.time >= NIGHT && this.phase !== 'stopped') { this.beginDawn(); return; }
    const hour = Math.floor(this.time / HOUR);
    if (hour > this.hourShown && hour <= 5 && this.phase === 'night') { this.hourShown = hour; this.onHour(hour); }
    if (!this.boss && this.time >= BOSS_AT) this.spawnBoss();
    if (this.phase === 'stopped' && this.stoppedFor > 75 && !this.dawnBreaks) {
      this.dawnBreaks = true;
      this.banner(VIGIL_TEXT.dawnBreaks[0], VIGIL_TEXT.dawnBreaks[1]);
    }

    // Quien vela
    this.updateTimers(dt);
    p.inv = Math.max(0, p.inv - dt);
    p.dip = Math.max(0, p.dip - dt * 1.8);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.lowHpCd = Math.max(0, this.lowHpCd - dt);
    this.ellaCd = Math.max(0, this.ellaCd - dt);
    this.flare = Math.max(0, this.flare - dt * 2.4);
    this.bellT = Math.max(0, this.bellT - dt);
    this.gustT = Math.max(0, this.gustT - dt);
    const mv = this.bot ? this.botMove() : this.movement();
    p.moving = Math.hypot(mv.x, mv.y) > 0.05;
    if (p.moving) { this.lastMove = {x: mv.x, y: mv.y}; if (Math.abs(mv.x) > 0.05) p.face = mv.x < 0 ? -1 : 1; p.walk += dt * 11; }
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      p.x += this.dashDir.x * st.speed * 4.2 * dt; p.y += this.dashDir.y * st.speed * 4.2 * dt;
      this.t.ghost -= dt;
      if (this.t.ghost <= 0) { this.t.ghost = 0.035; this.ghosts.push({x: p.x, y: p.y, face: p.face, life: 0.28}); }
      if (this.rooms.has('alcoba')) this.dashThrough();
    } else {
      // En los charcos de la marea se anda despacio.
      const wade = this.inPool ? 0.6 : 1;
      p.x += mv.x * st.speed * wade * dt; p.y += mv.y * st.speed * wade * dt;
      if (p.moving) { this.t.step -= dt; if (this.t.step <= 0) { this.t.step = 0.31; this.footstep(); } }
    }
    this.cemetery.resolve(p);
    if (st.regen) this.heal(st.regen * dt);

    this.updateVigil(dt);
    if (this.state !== 'running') return;
    this.soulMax = Math.max(this.soulMax, this.soul);
    this.weapons(dt);
    this.spawning(dt);
    this.updatePools(dt);
    this.updateEnemies(dt);
    if (this.state !== 'running') return;
    this.updateShots(dt);
    this.updateHazards(dt);
    if (this.state !== 'running') return;
    this.updatePickups(dt);
    this.updateFx(dt);
    if (this.cardPending) { this.cardPending = false; this.levelUp(true); return; }
    if (this.xp >= this.xpNext) this.levelUp();
    this.t.stats -= dt;
    if (this.t.stats <= 0) { this.t.stats = 0.1; this.emitStats(); }
  }

  /* ---------- final ---------- */

  beginDying(cause) {
    if (this.state !== 'running') return;
    this.cause = cause;
    this.dyingT = 0;
    this.deathClock = fmtClock(this.time);
    this.audio.sfx('apagon');
    this.flash = 0;
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
      if (d > 40) { e.x += dx / d * e.speed * 0.4 * dt; e.y += dy / d * e.speed * 0.4 * dt; }
    }
    if (this.dyingT > 2.4) this.end(false);
  }

  beginDawn() {
    this.time = NIGHT;
    this.phase = 'dawn';
    this.dawnT = 0;
    for (const e of this.enemies) if (e.hp > 0 && !e.dissolve) { e.dissolve = true; e.dissolveT = rand(0.3, 1.8); }
    this.enemyShots = []; this.hazards = []; this.marks = []; this.pools = [];
    // Amanece con los cuatro cirios ardiendo.
    for (const c of this.cirios) this.lightCirio(c, true, false);
    this.soul = 0;
    this.audio.sfx('hora', {count: 6, gap: 1.6});
    this.audio.sfx('alba');
    this.banner(HOURS[6].name, HOURS[6].mood, 'dawn');
    this.subQueue = this.subQueue.filter(q => q.priority >= 4 && q.speaker !== 'Carmela');
    this.bark('dawn', {priority: 4, delay: 1});
    this.say(AMPARO.dawn, AMPARO.name, {italic: true, priority: 4, delay: 0.6});
    this.player.inv = 99;
    this.emitStats();
    this.setState('dawn');
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
    const p = this.player, mv = this.bot ? {x: 0, y: 0} : this.movement();
    p.x += mv.x * this.st.speed * 0.5 * dt; p.y += mv.y * this.st.speed * 0.5 * dt;
    this.cemetery.resolve(p);
    if (Math.abs(mv.x) > 0.05) p.face = mv.x < 0 ? -1 : 1;
    p.moving = Math.hypot(mv.x, mv.y) > 0.05;
    if (p.moving) p.walk += dt * 6;
    for (const g of this.gems) { if (!g.cafe) { g.y -= (18 + (g.bob % 3) * 6) * dt; g.x += Math.sin(this.clock * 2 + g.bob) * 6 * dt; } }
    // Que la última frase sea la de Amparo, aunque haya que esperar un poco.
    if ((this.dawnT > 11 && !this.sub && !this.subQueue.length) || this.dawnT > 24) this.end(true);
  }

  end(victory) {
    if (this.state === 'ended') return;
    this.lastVictory = victory;
    const result = {victory, cause: victory ? 'dawn' : this.cause, time: this.time, clock: victory ? '06:00' : this.deathClock || fmtClock(this.time),
      kills: this.kills, level: this.level, character: this.character, memories: {...this.mem}, order: [...this.order],
      rooms: [...this.rooms], relit: this.relit, revives: this.revives, elites: this.elitesDown,
      freed: !!(this.boss && this.boss.hp <= 0)};
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
    const set = BARKS[this.character];
    let text = line || set?.[key];
    if (!text) return false;
    if (Array.isArray(text)) text = pick(text);
    if (once && this.said.has(key)) return false;
    this.said.add(key);
    this.say(text, CHARACTERS[this.character].name, {priority, delay});
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
      const quick = this.state === 'dawn' || this.phase === 'rush';
      this.subT = (quick ? 1.8 : 2.4) + next.text.length * (quick ? 0.04 : 0.052);
      this.hooks.onSubtitle?.(next);
    }
  }

  banner(title, sub, tone = 'hour') { this.hooks.onBanner?.({title, sub, tone}); }

  /* ---------- estado para la interfaz ---------- */

  getSnapshot() {
    const b = this.boss;
    const hourIdx = Math.min(6, Math.floor(this.time / HOUR));
    return {
      state: this.state, phase: this.phase, time: this.time, clock: fmtClock(this.time), hour: hourIdx,
      mood: this.phase === 'stopped' ? VIGIL_TEXT.stoppedMood : this.phase === 'rush' ? VIGIL_TEXT.rushMood : HOURS[hourIdx].mood,
      kills: this.kills, level: this.level, xp: this.xp, xpNext: this.xpNext,
      hp: this.player.hp, maxHp: this.st.maxHp, dashCd: this.dashCd, dashMax: this.st.dashCd,
      character: this.character, mem: {...this.mem}, order: [...this.order],
      cirios: this.cirios.map(c => c.lit ? 1 : c.relight > 0 ? 0.5 : 0), soul: this.soul,
      lullCd: this.lullCd, lullMax: this.st.lullCd, lull: this.lull, rooms: [...this.rooms],
      elite: this.eliteAlive && this.eliteAlive.hp > 0 ? {id: this.eliteAlive.elite, hp: this.eliteAlive.hp, maxHp: this.eliteAlive.maxHp} : null,
      boss: b ? {alive: b.hp > 0, hp: Math.max(0, b.hp), maxHp: b.maxHp, soul: this.soul} : null
    };
  }

  emitStats() { this.hooks.onStats?.(this.getSnapshot()); }
}

Object.assign(VigilGame.prototype, inputMethods, directorMethods, vigilMethods, weaponMethods, memoryMethods, enemyMethods, bossMethods, fxMethods, botMethods, renderMethods);
