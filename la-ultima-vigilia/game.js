/*
 * La noche de Difuntos, de 00:00 a 06:00 (cien segundos por hora).
 * Aquí se mueve todo: quien vela, lo que viene a por Amparo, la luz y el alba.
 */
import { drawWorld, drawFlames, drawFog, drawSprite, drawShadow, sprite, Lighting } from './art.js';
import { AudioEngine } from './audio.js';
import { CHARACTERS, MEMORIES, FALLBACK_CHOICES, BARKS, AMPARO, BOSS, HOURS } from './story.js';

const TAU = Math.PI * 2;
const NIGHT = 600;
const HOUR = 100;
const BOSS_AT = 500;
const MAX_ENEMIES = 240;
const COFFIN = {x: 0, y: 0};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;

export const fmtClock = t => {
  const s = clamp(t, 0, NIGHT);
  const h = Math.floor(s / HOUR), m = Math.min(59, Math.floor((s % HOUR) * 0.6));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/* unlock en segundos de noche; value es la luz que dejan al irse. */
const ENEMIES = {
  anima: {unlock: 0, weight: 30, hp: 12, speed: 60, r: 10, damage: 6, value: 1, scale: 2},
  hermano: {unlock: 0, weight: 44, hp: 24, speed: 34, r: 13, damage: 9, value: 1, scale: 2},
  urco: {unlock: 100, weight: 20, hp: 34, speed: 52, r: 14, damage: 11, value: 2, scale: 2},
  curuxa: {unlock: 150, weight: 15, hp: 26, speed: 58, r: 12, damage: 10, value: 2, scale: 2},
  ahogado: {unlock: 200, weight: 24, hp: 64, speed: 29, r: 15, damage: 13, value: 3, scale: 2},
  planidera: {unlock: 250, weight: 12, hp: 38, speed: 40, r: 13, damage: 8, value: 3, scale: 2},
  espantajo: {unlock: 400, weight: 7, hp: 200, speed: 22, r: 22, damage: 20, value: 7, scale: 2},
  guia: {unlock: 9999, weight: 0, hp: 2700, speed: 27, r: 30, damage: 24, value: 0, scale: 3}
};

const MEMORY = Object.fromEntries(MEMORIES.map(m => [m.id, m]));
const MAX_LEVEL = 5;

export class VigilGame {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', {alpha: false});
    this.hooks = hooks;
    this.audio = new AudioEngine();
    this.lighting = new Lighting();
    this.options = {shake: true, flashes: true, numbers: false, softDark: false};
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
    this.player = {x: 0, y: 92, hp: ch.hp, face: 1, inv: 0, dip: 0, walk: 0, moving: false};
    this.computeStats();
    this.player.hp = this.st.maxHp;
    this.enemies = []; this.shots = []; this.enemyShots = []; this.hazards = [];
    this.gems = []; this.particles = []; this.rings = []; this.numbers = [];
    this.corpses = []; this.marks = []; this.moths = []; this.ghosts = [];
    this.t = {chispas: 0.35, sal: 0.4, campana: 2.5, farol: 0.4, spawn: 0.6, procession: 48, swarm: 26, ghost: 0,
      bossSummon: 5, bossWater: 3, bossSpiral: 4, regenFx: 0, stats: 0, danger: 0};
    this.dashCd = 0; this.dashTime = 0; this.dashDir = {x: 1, y: 0}; this.lastMove = {x: 1, y: 0};
    this.phase = 'night'; this.hourShown = 0; this.boss = null; this.soul = 0; this.stoppedFor = 0;
    this.rushFrom = 0; this.dawnT = 0; this.dyingT = 0; this.cause = null; this.bossReached = false; this.bossRaged = false;
    this.dawnBreaks = false; this.deathClock = null; this.lastVictory = false;
    this.damageTaken = 0; this.minHp = Infinity;
    this.shake = 0; this.flash = 0; this.flashColor = '255,255,255'; this.freeze = 0;
    this.seen = new Set(); this.said = new Set(); this.subQueue = []; this.sub = null; this.subT = 0;
    this.lowHpCd = 0; this.amparoSaid = new Set(); this.danger = 0;
    this.choices = []; this.enemyId = 0; this.cafeDrops = 0;
    this.keys.clear(); this.pointer = null;
  }

  computeStats() {
    const m = this.mem, ch = CHARACTERS[this.character] || CHARACTERS.lucia;
    const prevMax = this.st?.maxHp;
    this.st = {
      maxHp: ch.hp + 20 * m.caldo,
      speed: ch.speed * (1 + 0.05 * m.mecedora),
      regen: 0.5 * m.pan,
      cadence: Math.pow(0.9, m.radio),
      pickup: 72 * (1 + 0.35 * m.gafas),
      memory: ch.memory * (1 + 0.15 * m.fotos),
      crit: 0.04 + 0.07 * m.risa,
      armor: Math.min(0.6, ch.armor + 0.08 * m.manos),
      dashCd: 5 * Math.pow(0.85, m.mecedora),
      light: 178 * ch.light * (1 + 0.1 * m.farol)
    };
    if (prevMax && this.player) this.player.hp = Math.min(this.st.maxHp, this.player.hp + Math.max(0, this.st.maxHp - prevMax));
  }

  xpFor(level) { return Math.floor(5 + level * 3.4 + level * level * 0.18); }

  start(character) {
    this.character = CHARACTERS[character] ? character : 'lucia';
    this.reset();
    this.audio.init();
    this.audio.setMuted(this.muted);
    this.cam.x = this.player.x; this.cam.y = this.player.y;
    this.setState('running');
    this.banner(HOURS[0].name, HOURS[0].mood);
    this.audio.sfx('hora', {count: 12, gap: 1.5});
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
  }

  setState(state) { this.state = state; this.hooks.onState?.(state); }
  pause() { if (this.state !== 'running') return; this.keys.clear(); this.pointer = null; this.setState('paused'); }
  resume() { if (this.state !== 'paused') return; this.keys.clear(); this.pointer = null; this.lastFrame = performance.now(); this.setState('running'); this.canvas.focus?.({preventScroll: true}); }
  setMuted(v) { this.muted = !!v; this.audio.setMuted(this.muted); if (!this.muted) this.audio.init(); }
  setVolume(v) { this.audio.setVolume(v); }
  setOptions(o) { Object.assign(this.options, o); }
  backToTitle() { this.reset(); this.setState('ready'); this.hooks.onSubtitle?.(null); this.emitStats(); }
  destroy() { cancelAnimationFrame(this.raf); this.handlers.forEach(fn => fn()); this.resizeObserver.disconnect(); }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width || 900), cssH = Math.max(1, rect.height || 560);
    // En pantallas pequeñas se aleja un poco la cámara para ver venir a la Compaña.
    this.zoom = Math.min(cssW, cssH) < 520 ? 0.75 : 1;
    this.width = cssW / this.zoom;
    this.height = cssH / this.zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr * this.zoom, 0, 0, dpr * this.zoom, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.lighting.resize(this.width, this.height);
  }

  /* ---------- entrada ---------- */

  listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); this.handlers.push(() => target.removeEventListener(type, fn, opts)); }

  bindInput() {
    const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape', 'KeyP'];
    this.listen(window, 'keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable || document.querySelector('dialog[open]')) return;
      if (!codes.includes(e.code)) return;
      if (['running', 'paused'].includes(this.state)) e.preventDefault();
      if (e.repeat && ['Escape', 'KeyP', 'Space'].includes(e.code)) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.state === 'running') this.pause(); else if (this.state === 'paused') this.resume(); }
      else if (e.code === 'Space') { if (this.state === 'running') this.dash(); }
      else this.keys.add(e.code);
    });
    this.listen(window, 'keyup', e => this.keys.delete(e.code));
    this.listen(window, 'blur', () => { this.keys.clear(); this.pointer = null; if (this.state === 'running' && !this.bot) this.pause(); });
    this.listen(document, 'visibilitychange', () => { if (document.hidden && this.state === 'running' && !this.bot) this.pause(); });
    const pos = e => { const r = this.canvas.getBoundingClientRect(), z = this.zoom || 1; return {x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z}; };
    this.listen(this.canvas, 'pointerdown', e => {
      if (this.state !== 'running' || e.button > 0) return;
      e.preventDefault();
      const p = pos(e);
      this.pointer = {id: e.pointerId, start: p, current: p};
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.listen(this.canvas, 'pointermove', e => { if (this.pointer?.id === e.pointerId) this.pointer.current = pos(e); });
    const end = e => { if (this.pointer?.id === e.pointerId) this.pointer = null; };
    this.listen(this.canvas, 'pointerup', end);
    this.listen(this.canvas, 'pointercancel', end);
  }

  movement() {
    let x = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let y = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    if (this.pointer) {
      const dx = this.pointer.current.x - this.pointer.start.x, dy = this.pointer.current.y - this.pointer.start.y, len = Math.hypot(dx, dy);
      if (len > 6) { x = dx / Math.max(40, len); y = dy / Math.max(40, len); }
    }
    const len = Math.hypot(x, y);
    return len > 1 ? {x: x / len, y: y / len} : {x, y};
  }

  dash() {
    if (this.state !== 'running' || this.dashCd > 0) return false;
    const mv = this.bot ? this.botMove() : this.movement();
    const len = Math.hypot(mv.x, mv.y);
    this.dashDir = len > 0.05 ? {x: mv.x / len, y: mv.y / len} : {...this.lastMove};
    this.dashTime = 0.24;
    this.dashCd = this.st.dashCd;
    this.player.inv = Math.max(this.player.inv, 0.5);
    this.audio.sfx('esquiva');
    for (let i = 0; i < 8; i++) this.particle({x: this.player.x, y: this.player.y + 8, vx: rand(-60, 60), vy: rand(-30, 10), life: 0.4, size: 3, color: '#3a3f46'});
    this.emitStats();
    return true;
  }

  /* ---------- bucle ---------- */

  frame(ts) {
    const dt = Math.min(0.05, Math.max(0, (ts - this.lastFrame) / 1000));
    this.lastFrame = ts;
    this.clock += dt;
    const steps = this.state === 'running' ? Math.max(1, Math.floor(this.timeScale)) : 1;
    for (let i = 0; i < steps; i++) this.step(dt);
    try { this.render(dt); } catch (err) { console.error(err); }
    this.audio.update(dt, this.audioState());
    this.raf = requestAnimationFrame(this.frame);
  }

  step(dt) {
    if (this.state === 'running') {
      if (this.freeze > 0) this.freeze -= dt;
      else this.update(dt);
      this.updateSubtitles(dt);
    } else if (this.state === 'dying') { this.updateDying(dt); this.updateSubtitles(dt); }
    else if (this.state === 'dawn') { this.updateDawn(dt); this.updateSubtitles(dt); }
    else if (this.state === 'ready') this.updateFx(dt);
  }

  audioState() {
    const scene = {ready: 'title', running: 'run', paused: 'pause', upgrade: 'pause', dying: 'end', dawn: 'dawn', ended: this.lastVictory ? 'dawn' : 'end'}[this.state] || 'title';
    return {scene, hour: this.time / HOUR, danger: this.danger, hp: this.player.hp / this.st.maxHp, boss: !!(this.boss && this.boss.hp > 0)};
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
      this.banner('La luz se abre paso', 'La Guía se debilita');
    }

    // Quien vela
    p.inv = Math.max(0, p.inv - dt);
    p.dip = Math.max(0, p.dip - dt * 1.8);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.lowHpCd = Math.max(0, this.lowHpCd - dt);
    const mv = this.bot ? this.botMove() : this.movement();
    p.moving = Math.hypot(mv.x, mv.y) > 0.05;
    if (p.moving) { this.lastMove = {x: mv.x, y: mv.y}; if (Math.abs(mv.x) > 0.05) p.face = mv.x < 0 ? -1 : 1; p.walk += dt * 11; }
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      p.x += this.dashDir.x * st.speed * 4.2 * dt; p.y += this.dashDir.y * st.speed * 4.2 * dt;
      this.t.ghost -= dt;
      if (this.t.ghost <= 0) { this.t.ghost = 0.035; this.ghosts.push({x: p.x, y: p.y, face: p.face, life: 0.28}); }
    } else { p.x += mv.x * st.speed * dt; p.y += mv.y * st.speed * dt; }
    if (st.regen) p.hp = Math.min(st.maxHp, p.hp + st.regen * dt);
    // Junto a Amparo se descansa.
    if (Math.hypot(p.x - COFFIN.x, p.y - COFFIN.y) < 125 && p.hp < st.maxHp) {
      p.hp = Math.min(st.maxHp, p.hp + 2.2 * dt);
      this.t.regenFx -= dt;
      if (this.t.regenFx <= 0) { this.t.regenFx = 0.25; this.particle({x: p.x + rand(-10, 10), y: p.y + rand(-6, 10), vx: 0, vy: -24, life: 0.9, size: 2, color: '#ffd59a', glow: true}); }
    }

    this.weapons(dt);
    this.spawning(dt);
    this.updateEnemies(dt);
    if (this.state !== 'running') return;
    this.updateShots(dt);
    this.updateHazards(dt);
    if (this.state !== 'running') return;
    this.updatePickups(dt);
    this.updateFx(dt);
    if (this.boss && this.boss.hp > 0) this.updateSoul(dt);
    if (this.state !== 'running') return;
    if (this.xp >= this.xpNext) this.levelUp();
    this.t.stats -= dt;
    if (this.t.stats <= 0) { this.t.stats = 0.1; this.emitStats(); }
  }

  /* ---------- las horas ---------- */

  onHour(h) {
    this.audio.sfx('hora', {count: h});
    this.banner(HOURS[h].name, HOURS[h].mood);
    this.bark('hour' + h, {delay: 1.2, priority: 2});
    if (h === 3) {
      // La hora de las ánimas: vienen de todas partes.
      for (let i = 0; i < 16; i++) {
        const e = this.spawn('anima');
        if (!e) break;
        const a = i / 16 * TAU, r = Math.max(this.width, this.height) * 0.65;
        e.x = this.player.x + Math.cos(a) * r; e.y = this.player.y + Math.sin(a) * r;
      }
    }
  }

  stopClock() {
    this.phase = 'stopped';
    this.time = NIGHT - 1;
    this.stoppedFor = 0;
    this.audio.sfx('reloj');
    this.banner('05:59', 'El reloj de la torre se ha parado');
    this.bark('stopped', {priority: 3, delay: 0.8});
  }

  /* ---------- armas ---------- */

  nearest(maxDist, from = this.player) {
    // Si la Guía está a tiro, todo va a por ella: es a quien hay que parar.
    const b = this.boss;
    if (b && b.hp > 0 && !b.dissolve && Math.hypot(b.x - from.x, b.y - from.y) < Math.min(maxDist, 320)) return b;
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = e.x - from.x, dy = e.y - from.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  weapons(dt) {
    const p = this.player, m = this.mem, st = this.st;
    const range = Math.max(240, Math.min(this.width, this.height) * 0.55);
    if (m.chispas) {
      this.t.chispas -= dt;
      if (this.t.chispas <= 0) {
        const target = this.nearest(range);
        if (target) {
          this.t.chispas = 0.62 * st.cadence;
          const count = Math.min(6, m.chispas), aim = Math.atan2(target.y - p.y, target.x - p.x);
          const dmg = 20 * (1 + 0.15 * (m.chispas - 1));
          for (let i = 0; i < count; i++) {
            const a = aim + (i - (count - 1) / 2) * 0.13;
            this.shots.push({kind: 'chispa', x: p.x + p.face * 6, y: p.y - 8, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, a, life: 1.3, r: 5, dmg, pierce: m.chispas >= 3 ? 2 : 1, knock: 70, hit: new Set()});
          }
          this.audio.sfx('chispa', {pan: (target.x - p.x) / this.width});
        } else this.t.chispas = 0.1;
      }
    }
    if (m.sal) {
      this.t.sal -= dt;
      if (this.t.sal <= 0) {
        const target = this.nearest(250);
        if (target) {
          this.t.sal = 0.95 * st.cadence;
          const count = Math.min(8, 2 + m.sal), aim = Math.atan2(target.y - p.y, target.x - p.x);
          const dmg = 12 * (1 + 0.2 * (m.sal - 1));
          for (let i = 0; i < count; i++) {
            const a = aim + (i - (count - 1) / 2) * (0.62 / Math.max(1, count - 1)) + rand(-0.04, 0.04);
            const sp = rand(400, 470);
            this.shots.push({kind: 'sal', x: p.x + Math.cos(aim) * 12, y: p.y - 4 + Math.sin(aim) * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, life: rand(0.44, 0.54), r: 4, dmg, pierce: m.sal >= 4 ? 2 : 1, knock: 260, hit: new Set()});
          }
          for (let i = 0; i < 6; i++) this.particle({x: p.x + Math.cos(aim) * 16, y: p.y - 4 + Math.sin(aim) * 10, vx: Math.cos(aim + rand(-0.5, 0.5)) * rand(80, 200), vy: Math.sin(aim + rand(-0.5, 0.5)) * rand(80, 200), life: 0.25, size: 2, color: '#fff6e0', glow: true});
          this.rings.push({x: p.x + Math.cos(aim) * 18, y: p.y - 4 + Math.sin(aim) * 10, r: 4, max: 40, life: 0.12, total: 0.12, color: '#ffe2b0', light: 60});
          this.audio.sfx('sal', {pan: (target.x - p.x) / this.width});
          this.shake = Math.max(this.shake, 1.5);
        } else this.t.sal = 0.1;
      }
    }
    if (m.campana) {
      this.t.campana -= dt;
      if (this.t.campana <= 0) {
        this.t.campana = Math.max(2.2, 6.2 - 0.75 * m.campana) * st.cadence;
        const R = 112 + 22 * m.campana, dmg = 26 + 12 * m.campana;
        this.rings.push({x: p.x, y: p.y, r: 14, max: R, life: 0.5, total: 0.5, color: '#f3d9a0', width: 3, light: R});
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.dissolve) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < R + e.r) this.hurt(e, dmg, {knock: 300, from: p});
        }
        this.audio.sfx('campana');
        this.freeze = Math.max(this.freeze, 0.025);
      }
    }
    if (m.farol) {
      this.t.farol -= dt;
      if (this.t.farol <= 0) {
        this.t.farol = 0.4;
        const R = this.lightRadius() * 0.7, dmg = (5 + 5 * m.farol) * 0.4;
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.dissolve) continue;
          const dx = e.x - p.x, dy = e.y - p.y;
          if (dx * dx + dy * dy < R * R) {
            this.hurt(e, dmg, {knock: 0, silent: true});
            if (Math.random() < 0.5) this.particle({x: e.x + rand(-6, 6), y: e.y + rand(-8, 4), vx: rand(-8, 8), vy: rand(-40, -20), life: 0.6, size: 2, color: '#ff9a4a', glow: true});
          }
        }
      }
    }
    if (m.rosario) {
      const beads = 1 + m.rosario, R = 58 + 4 * m.rosario, dmg = 9 + 5 * m.rosario;
      for (let i = 0; i < beads; i++) {
        const a = this.clock * 2.3 + i * TAU / beads, bx = p.x + Math.cos(a) * R, by = p.y - 4 + Math.sin(a) * R;
        for (const e of this.queryGrid(bx, by, 40)) {
          if (e.hp <= 0 || e.dissolve || e.beadCd > 0) continue;
          if (Math.hypot(e.x - bx, e.y - by) < e.r + 8) { this.hurt(e, dmg, {knock: 120, from: {x: bx, y: by}}); e.beadCd = 0.45; }
        }
      }
    }
    // Polillas
    while (this.moths.length < Math.min(5, m.polillas)) this.moths.push({x: p.x, y: p.y, state: 'orbit', a: Math.random() * TAU, cd: 0.5 + Math.random(), target: null, flap: Math.random() * 10});
    for (const moth of this.moths) {
      moth.flap += dt * 18;
      moth.cd = Math.max(0, moth.cd - dt);
      if (moth.state === 'orbit') {
        moth.a += dt * 2.6;
        const tx = p.x + Math.cos(moth.a) * 34, ty = p.y - 18 + Math.sin(moth.a * 1.3) * 14;
        moth.x = lerp(moth.x, tx, 1 - Math.exp(-dt * 8)); moth.y = lerp(moth.y, ty, 1 - Math.exp(-dt * 8));
        if (moth.cd === 0) {
          const t = this.nearest(270, moth);
          if (t) { moth.target = t; moth.state = 'dive'; }
          else moth.cd = 0.3;
        }
      } else if (moth.state === 'dive') {
        const t = moth.target;
        if (!t || t.hp <= 0 || t.dissolve) { moth.state = 'back'; continue; }
        const dx = t.x - moth.x, dy = t.y - moth.y, d = Math.hypot(dx, dy) || 1;
        moth.x += dx / d * 330 * dt; moth.y += dy / d * 330 * dt;
        if (d < t.r + 5) { this.hurt(t, 9 + 4 * m.polillas, {knock: 40, from: moth}); moth.state = 'back'; moth.cd = 0.75; }
      } else {
        const dx = p.x - moth.x, dy = p.y - 18 - moth.y, d = Math.hypot(dx, dy) || 1;
        moth.x += dx / d * 300 * dt; moth.y += dy / d * 300 * dt;
        if (d < 24) moth.state = 'orbit';
      }
    }
  }

  lightRadius() {
    const p = this.player, hpRatio = clamp(p.hp / this.st.maxHp, 0, 1);
    const flicker = 1 + Math.sin(this.clock * 7.3) * 0.012 + Math.sin(this.clock * 17.9) * 0.01;
    let r = this.st.light * (0.72 + 0.28 * hpRatio) * (1 - 0.14 * p.dip) * flicker;
    if (this.state === 'dying') r *= Math.max(0, 1 - this.dyingT / 1.7);
    return r;
  }

  /* ---------- daño ---------- */

  hurt(e, amount, {knock = 80, from = this.player, silent = false} = {}) {
    if (e.hp <= 0 || e.dissolve) return;
    const crit = Math.random() < this.st.crit;
    let dmg = amount * (crit ? 2 : 1);
    if (e.type === 'guia' && this.dawnBreaks) dmg *= 2;
    e.hp -= dmg;
    e.hit = 0.09;
    if (knock && from) {
      const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1;
      const resist = e.type === 'guia' ? 0.06 : e.type === 'espantajo' ? 0.3 : e.type === 'ahogado' ? 0.6 : 1;
      e.kx += dx / d * knock * resist; e.ky += dy / d * knock * resist;
    }
    if (!silent) {
      this.audio.sfx('golpe', {pan: (e.x - this.player.x) / this.width});
      const color = {anima: '#9cc8ff', ahogado: '#7fb3c4', espantajo: '#d6b466', curuxa: '#c9b28a'}[e.type] || '#c9c2b8';
      for (let i = 0; i < 2; i++) this.particle({x: e.x, y: e.y - 4, vx: rand(-70, 70), vy: rand(-80, 20), life: 0.3, size: 2, color, grav: 260});
    }
    if (crit) this.particle({x: e.x, y: e.y - e.r, vx: 0, vy: -30, life: 0.35, size: 4, color: '#fff1bd', glow: true});
    if (this.options.numbers && !silent) this.numbers.push({x: e.x, y: e.y - e.r - 6, text: String(Math.round(dmg)), color: crit ? '#ffe2a0' : '#d8d2c4', life: 0.7});
    if (e.type === 'guia') this.bossHit(e);
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    e.hp = 0;
    if (e.type === 'guia') { this.freeBoss(e); return; }
    this.kills++;
    this.corpses.push({type: e.type, x: e.x, y: e.y, flip: e.flip, life: 0.35, total: 0.35, scale: ENEMIES[e.type].scale});
    const pan = (e.x - this.player.x) / this.width;
    if (e.type === 'hermano' || e.type === 'anima') this.audio.sfx('apagar', {pan}); else this.audio.sfx('muerte', {pan});
    const fx = {
      hermano: () => { for (let i = 0; i < 6; i++) this.particle({x: e.x, y: e.y - 8, vx: rand(-20, 20), vy: rand(-50, -20), life: 1, size: 3, color: '#55505c'}); this.particle({x: e.x + 4, y: e.y - 6, vx: 0, vy: -10, life: 0.5, size: 3, color: '#ffb04a', glow: true}); },
      anima: () => { for (let i = 0; i < 8; i++) this.particle({x: e.x, y: e.y, vx: rand(-90, 90), vy: rand(-90, 60), life: 0.5, size: 2, color: '#a8d4ff', glow: true}); },
      ahogado: () => { for (let i = 0; i < 10; i++) this.particle({x: e.x, y: e.y, vx: rand(-110, 110), vy: rand(-140, -20), life: 0.6, size: 2, color: '#7fb3c4', grav: 420}); },
      espantajo: () => { for (let i = 0; i < 16; i++) this.particle({x: e.x, y: e.y - 10, vx: rand(-140, 140), vy: rand(-160, 20), life: 0.9, size: 2, color: i % 2 ? '#d6b466' : '#9a7a3a', grav: 300}); },
      curuxa: () => { for (let i = 0; i < 8; i++) this.particle({x: e.x, y: e.y, vx: rand(-80, 80), vy: rand(-60, 40), life: 1.1, size: 2, color: '#e6dabd', grav: 60}); },
      planidera: () => { for (let i = 0; i < 6; i++) this.particle({x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-80, 0), life: 0.7, size: 2, color: '#86bff2', glow: true, grav: 200}); },
      urco: () => { for (let i = 0; i < 7; i++) this.particle({x: e.x, y: e.y, vx: rand(-60, 60), vy: rand(-50, -10), life: 0.9, size: 4, color: '#14141a'}); }
    }[e.type];
    fx?.();
    if (!e.summoned || Math.random() < 0.5) this.dropGem(e.x, e.y, e.value);
    if (Math.random() < 0.028 && this.player.hp < this.st.maxHp * 0.85) this.gems.push({x: e.x + 8, y: e.y - 4, cafe: true, v: 0, magnet: false, bob: Math.random() * 6});
    // Si muere uno de la procesión, el de detrás sigue al de delante.
    if (e.follower) { e.follower.leader = e.leader; }
    if (e.leader) e.leader.follower = e.follower;
  }

  dropGem(x, y, v) {
    if (this.gems.length > 360) {
      const g = this.gems[Math.floor(Math.random() * this.gems.length)];
      if (!g.cafe) { g.v += v; return; }
    }
    this.gems.push({x: x + rand(-4, 4), y: y + rand(-4, 4), v, magnet: false, bob: Math.random() * 6});
  }

  damagePlayer(amount, source) {
    const p = this.player;
    if (p.inv > 0 || this.dashTime > 0 || this.god || this.state !== 'running') return;
    const dmg = Math.max(1, Math.round(amount * (1 - this.st.armor)));
    p.hp -= dmg;
    this.damageTaken = (this.damageTaken || 0) + dmg;
    this.minHp = Math.min(this.minHp ?? Infinity, p.hp);
    p.inv = 0.75;
    p.dip = 1;
    if (this.options.shake) this.shake = Math.max(this.shake, 7);
    this.flash = Math.max(this.flash, 0.25); this.flashColor = '160,30,24';
    this.audio.sfx('herida');
    if (this.options.numbers) this.numbers.push({x: p.x, y: p.y - 30, text: '−' + dmg, color: '#ff8a7a', life: 0.8});
    if (source) { const dx = p.x - source.x, dy = p.y - source.y, d = Math.hypot(dx, dy) || 1; p.x += dx / d * 10; p.y += dy / d * 10; }
    if (p.hp <= 0) { p.hp = 0; this.beginDying('out'); return; }
    if (p.hp < this.st.maxHp * 0.3 && this.lowHpCd === 0) {
      this.lowHpCd = 28;
      if (!this.amparoSaid.has('low')) { this.amparoSaid.add('low'); this.say(AMPARO.lowHp, AMPARO.name, {italic: true, priority: 3}); }
      else this.bark('lowHp', {once: false, line: pick(BARKS[this.character].lowHp), priority: 2});
    }
  }

  /* ---------- criaturas ---------- */

  spawn(force, at) {
    if (this.enemies.length >= MAX_ENEMIES && force !== 'guia') return null;
    let type = force;
    if (!type) {
      const pool = Object.entries(ENEMIES).filter(([, d]) => d.weight > 0 && this.time >= d.unlock);
      let roll = Math.random() * pool.reduce((s, [, d]) => s + d.weight, 0);
      type = pool[pool.length - 1][0];
      for (const [id, d] of pool) { roll -= d.weight; if (roll < 0) { type = id; break; } }
    }
    const d = ENEMIES[type];
    let x, y;
    if (at) { x = at.x; y = at.y; }
    else {
      const a = Math.random() * TAU;
      const r = Math.min((this.width / 2 + 60) / Math.max(0.001, Math.abs(Math.cos(a))), (this.height / 2 + 60) / Math.max(0.001, Math.abs(Math.sin(a))));
      x = this.player.x + Math.cos(a) * r; y = this.player.y + Math.sin(a) * r;
    }
    const hpMul = type === 'guia' ? 1 : 1 + this.time / 300;
    const e = {id: ++this.enemyId, type, x, y, hp: d.hp * hpMul, maxHp: d.hp * hpMul, speed: d.speed * (1 + this.time / 1300) * rand(0.92, 1.08),
      r: d.r, damage: d.damage, value: d.value, hit: 0, beadCd: 0, kx: 0, ky: 0, seed: Math.random() * 10, flip: false,
      mode: 'hunt', modeT: 0, cd: rand(1.5, 3.5), lock: 0, heading: 0};
    this.enemies.push(e);
    return e;
  }

  spawnProcession() {
    const n = Math.min(11, 5 + Math.floor(this.time / 100));
    const a = Math.random() * TAU;
    const r = Math.max(this.width, this.height) * 0.62 + 40;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const e = this.spawn('hermano', {x: this.player.x + Math.cos(a) * (r + i * 26), y: this.player.y + Math.sin(a) * (r + i * 26)});
      if (!e) break;
      e.speed = 36 * (1 + this.time / 1300);
      e.heading = a + Math.PI + rand(-0.9, 0.9);
      if (prev) { e.leader = prev; prev.follower = e; }
      prev = e;
    }
  }

  spawnSwarm(n) {
    const a = Math.random() * TAU, r = Math.max(this.width, this.height) * 0.6;
    const cx = this.player.x + Math.cos(a) * r, cy = this.player.y + Math.sin(a) * r;
    for (let i = 0; i < n; i++) this.spawn('anima', {x: cx + rand(-50, 50), y: cy + rand(-50, 50)});
  }

  /* Cuántas criaturas quiere la noche a cada hora: sube despacio hasta las cinco. */
  targetPopulation() {
    if (this.boss && this.boss.hp > 0) return 90;
    return Math.min(MAX_ENEMIES, 24 + this.time * 0.38);
  }

  spawning(dt) {
    if (this.phase === 'rush') return;
    this.t.spawn -= dt;
    if (this.t.spawn <= 0) {
      const alive = this.enemies.filter(e => !e.dissolve && !e.summoned).length;
      const deficit = this.targetPopulation() - alive;
      if (deficit > 0) {
        const count = Math.min(4, Math.ceil(deficit / 12));
        for (let i = 0; i < count; i++) if (!this.spawn()) break;
        this.t.spawn = deficit > 30 ? 0.18 : 0.42;
      } else this.t.spawn = 0.5;
    }
    if (this.time > 60 && !this.boss) {
      this.t.procession -= dt;
      if (this.t.procession <= 0) { this.t.procession = rand(24, 36); this.spawnProcession(); }
    }
    this.t.swarm -= dt;
    if (this.t.swarm <= 0 && !this.boss) { this.t.swarm = rand(45, 65); this.spawnSwarm(5 + Math.floor(Math.random() * 4)); }
  }

  buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const k = (Math.floor(e.x / 48) + 32768) * 65536 + (Math.floor(e.y / 48) + 32768);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(e);
    }
  }

  queryGrid(x, y, r) {
    const out = [];
    const x0 = Math.floor((x - r) / 48), x1 = Math.floor((x + r) / 48), y0 = Math.floor((y - r) / 48), y1 = Math.floor((y + r) / 48);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.grid.get((cx + 32768) * 65536 + (cy + 32768));
      if (a) for (const e of a) out.push(e);
    }
    return out;
  }

  updateEnemies(dt) {
    const p = this.player;
    this.buildGrid();
    let near = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.hit = Math.max(0, e.hit - dt);
      e.beadCd = Math.max(0, e.beadCd - dt);
      if (e.dissolve) {
        e.dissolveT -= dt;
        if (Math.random() < 0.3) this.particle({x: e.x + rand(-8, 8), y: e.y + rand(-10, 6), vx: rand(-10, 10), vy: rand(-50, -25), life: 0.8, size: 2, color: '#ffd59a', glow: true});
        if (e.dissolveT <= 0) e.hp = 0;
        continue;
      }
      const dx = p.x - e.x, dy = p.y - e.y, len = Math.hypot(dx, dy) || 1;
      if (len < 260) near++;
      if (!this.seen.has(e.type) && len < Math.min(this.width, this.height) * 0.5 && e.type !== 'guia') {
        this.seen.add(e.type);
        this.hooks.onDiscover?.({kind: 'creature', id: e.type});
        if (e.type !== 'anima' || this.time > 20) this.bark('first_' + e.type, {priority: 1});
      }
      const slow = e.hit > 0 ? 0.45 : 1;
      this.behave(e, dx, dy, len, dt, slow);
      e.x += e.kx * dt; e.y += e.ky * dt;
      const damp = Math.exp(-dt * 9);
      e.kx *= damp; e.ky *= damp;
      if (len < e.r + 10 && e.hp > 0) this.damagePlayer(e.damage * (1 + this.time / 1000), e);
      if (this.state !== 'running') return;
    }
    this.danger = lerp(this.danger, clamp(near / 30, 0, 1), 1 - Math.exp(-dt * 2));
    // Separación: que no se amontonen en un solo bulto.
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.type === 'guia') continue;
      for (const o of this.queryGrid(e.x, e.y, e.r * 2)) {
        if (o === e || o.hp <= 0) continue;
        const dx = e.x - o.x, dy = e.y - o.y, min = (e.r + o.r) * 0.82, d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2), push = (min - d) * 0.25;
          e.x += dx / d * push; e.y += dy / d * push;
        }
      }
    }
    // Los que se quedan muy atrás vuelven a aparecer delante.
    const far = Math.max(this.width, this.height) + 520;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.type === 'guia' || e.leader || e.follower) continue;
      if (Math.abs(e.x - p.x) > far || Math.abs(e.y - p.y) > far) {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        const r = Math.max(this.width, this.height) * 0.62;
        e.x = p.x + Math.cos(a) * r; e.y = p.y + Math.sin(a) * r;
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
  }

  behave(e, dx, dy, len, dt, slow) {
    const ux = dx / len, uy = dy / len;
    let fwd = e.speed, side = 0;
    switch (e.type) {
      case 'anima':
        side = Math.sin(this.clock * 4 + e.seed) * 30;
        break;
      case 'hermano': {
        if (e.leader && e.leader.hp > 0) {
          // Sigue la vela de delante, a una distancia de respeto.
          const lx = e.leader.x - e.x, ly = e.leader.y - e.y, ld = Math.hypot(lx, ly) || 1;
          const sp = ld > 30 ? e.speed * (ld > 60 ? 1.6 : 1.1) : 0;
          e.x += lx / ld * sp * dt * slow; e.y += ly / ld * sp * dt * slow;
          e.flip = lx < 0;
          return;
        }
        if (e.follower || e.heading) {
          // El primero de la fila gira despacio hacia ti: la procesión dibuja una curva.
          const want = Math.atan2(dy, dx);
          let diff = ((want - e.heading + Math.PI * 3) % TAU) - Math.PI;
          e.heading += clamp(diff, -0.55 * dt, 0.55 * dt);
          e.x += Math.cos(e.heading) * e.speed * dt * slow; e.y += Math.sin(e.heading) * e.speed * dt * slow;
          e.flip = Math.cos(e.heading) < 0;
          return;
        }
        break;
      }
      case 'urco': {
        if (e.mode === 'windup') {
          e.modeT -= dt;
          if (e.modeT <= 0) { e.mode = 'lunge'; e.modeT = 0.42; }
          e.flip = Math.cos(e.lock) < 0;
          return;
        }
        if (e.mode === 'lunge') {
          e.x += Math.cos(e.lock) * e.speed * 4.4 * dt * slow; e.y += Math.sin(e.lock) * e.speed * 4.4 * dt * slow;
          e.modeT -= dt;
          if (e.modeT <= 0) { e.mode = 'rest'; e.modeT = 0.55; }
          return;
        }
        if (e.mode === 'rest') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'hunt'; e.cd = rand(2.4, 3.6); } fwd *= 0.3; break; }
        e.cd = Math.max(0, e.cd - dt);
        if (e.cd === 0 && len < 240 && len > 60) {
          e.mode = 'windup'; e.modeT = 0.72; e.lock = Math.atan2(dy, dx);
          this.audio.sfx('gruñido', {pan: -dx / this.width});
          return;
        }
        break;
      }
      case 'curuxa': {
        if (e.mode === 'windup') {
          e.modeT -= dt;
          if (e.modeT <= 0) { e.mode = 'swoop'; e.modeT = 0.55; }
          return;
        }
        if (e.mode === 'swoop') {
          e.x += Math.cos(e.lock) * e.speed * 3.8 * dt * slow; e.y += Math.sin(e.lock) * e.speed * 3.8 * dt * slow;
          e.modeT -= dt;
          if (e.modeT <= 0) { e.mode = 'hunt'; e.cd = rand(2.8, 4.2); }
          e.flip = Math.cos(e.lock) < 0;
          return;
        }
        e.cd = Math.max(0, e.cd - dt);
        if (len < 210) { fwd *= 0.15; side = 70; } else side = Math.sin(this.clock * 2 + e.seed) * 40;
        if (e.cd === 0 && len < 260) {
          e.mode = 'windup'; e.modeT = 0.5; e.lock = Math.atan2(dy, dx);
          this.audio.sfx('chillido', {pan: -dx / this.width});
          return;
        }
        break;
      }
      case 'planidera': {
        if (e.mode === 'cry') {
          e.modeT -= dt;
          if (e.modeT <= 0) {
            e.mode = 'hunt'; e.cd = rand(2.4, 3.2);
            const a = Math.atan2(dy, dx);
            for (let i = -1; i <= 1; i++) this.enemyShots.push({x: e.x, y: e.y - 10, vx: Math.cos(a + i * 0.2) * 150, vy: Math.sin(a + i * 0.2) * 150, life: 4, r: 6, dmg: 9, kind: 'lagrima'});
            this.audio.sfx('lagrima', {pan: -dx / this.width});
          }
          return;
        }
        e.cd = Math.max(0, e.cd - dt);
        if (len < 180) fwd = -e.speed * 0.8; else if (len < 260) { fwd = 0; side = 30; }
        if (e.cd === 0 && len < 330) { e.mode = 'cry'; e.modeT = 0.65; return; }
        break;
      }
      case 'espantajo': {
        if (e.mode === 'swing') {
          e.modeT -= dt;
          if (e.modeT <= 0) {
            e.mode = 'hunt'; e.cd = rand(4, 6);
            this.rings.push({x: e.x, y: e.y + 6, r: 20, max: 92, life: 0.35, total: 0.35, color: '#d6b466', width: 3});
            for (let i = 0; i < 12; i++) this.particle({x: e.x, y: e.y, vx: rand(-160, 160), vy: rand(-140, 40), life: 0.7, size: 2, color: '#d6b466', grav: 300});
            if (len < 92 + 10) this.damagePlayer(e.damage, e);
          }
          return;
        }
        e.cd = Math.max(0, e.cd - dt);
        if (e.cd === 0 && len < 105) { e.mode = 'swing'; e.modeT = 0.85; return; }
        break;
      }
      case 'guia': this.behaveBoss(e, dx, dy, len, dt, slow); return;
      default: break;
    }
    e.x += (ux * fwd + uy * side) * dt * slow;
    e.y += (uy * fwd - ux * side) * dt * slow;
    e.flip = dx < 0;
  }

  /* ---------- la Guía ---------- */

  spawnBoss() {
    const p = this.player;
    const a = Math.atan2(p.y - COFFIN.y, p.x - COFFIN.x) + Math.PI + rand(-0.6, 0.6);
    const e = this.spawn('guia', {x: COFFIN.x + Math.cos(a) * 760, y: COFFIN.y + Math.sin(a) * 760});
    e.nextStagger = 0.8;
    e.stun = 0;
    this.boss = e;
    // La procesión se aparta para dejarla pasar.
    const others = this.enemies.filter(o => o !== e && o.hp > 0 && !o.dissolve);
    others.sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
    for (const o of others.slice(0, Math.floor(others.length * 0.6))) { o.dissolve = true; o.dissolveT = rand(0.5, 2.5); }
    this.hooks.onDiscover?.({kind: 'creature', id: 'guia'});
    this.audio.sfx('guia');
    this.banner(BOSS.name, BOSS.arrive, 'boss');
    this.bark('boss', {priority: 3, delay: 2.4});
    this.flash = this.options.flashes ? 0.35 : 0; this.flashColor = '255,236,200';
  }

  behaveBoss(e, dx, dy, len, dt, slow) {
    const p = this.player;
    if (e.stun > 0) { e.stun -= dt; return; }
    const tx = COFFIN.x - e.x, ty = COFFIN.y - e.y, td = Math.hypot(tx, ty) || 1;
    const speed = e.speed * (this.dawnBreaks ? 0.5 : 1) * (e.hp < e.maxHp * 0.5 ? 1.15 : 1);
    if (td > 62) { e.x += tx / td * speed * dt * (slow > 0.9 ? 1 : 0.8); e.y += ty / td * speed * dt * (slow > 0.9 ? 1 : 0.8); }
    e.flip = tx < 0;
    const engaged = len < 560;
    // Procesión invocada
    this.t.bossSummon -= dt;
    if (this.t.bossSummon <= 0 && engaged) {
      this.t.bossSummon = e.hp < e.maxHp * 0.5 ? 6 : 8;
      const summoned = this.enemies.filter(o => o.summoned && o.hp > 0).length;
      const n = Math.min(6, 18 - summoned);
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + rand(-0.2, 0.2);
        this.marks.push({x: p.x + Math.cos(a) * 230, y: p.y + Math.sin(a) * 230, t: 0.9, total: 0.9});
      }
    }
    // Agua bendita
    this.t.bossWater -= dt;
    if (this.t.bossWater <= 0 && engaged) {
      this.t.bossWater = e.hp < e.maxHp * 0.5 ? 3.6 : 4.8;
      const mv = this.movement();
      for (let i = 0; i < 3; i++) {
        const lead = i === 0 ? 0 : 0.6;
        this.hazards.push({kind: 'agua', x: p.x + mv.x * this.st.speed * lead + rand(-40, 40) * (i ? 1 : 0.2), y: p.y + mv.y * this.st.speed * lead + rand(-40, 40) * (i ? 1 : 0.2), r: 46, t: 1.0 + i * 0.18, total: 1.0 + i * 0.18, dmg: 14, fromX: e.x, fromY: e.y - 30});
      }
    }
    // Lágrimas de cera, cuando ya no puede más
    if (e.hp < e.maxHp * 0.5) {
      if (!this.bossRaged) { this.bossRaged = true; this.say(BOSS.rage, 'Carmela', {priority: 3}); this.audio.sfx('guia'); }
      this.t.bossSpiral -= dt;
      if (this.t.bossSpiral <= 0 && engaged) {
        this.t.bossSpiral = 5.5;
        const base = Math.random() * TAU;
        for (let wave = 0; wave < 2; wave++) {
          for (let i = 0; i < 12; i++) {
            const a = base + i * TAU / 12 + wave * 0.26;
            this.enemyShots.push({x: e.x, y: e.y - 20, vx: Math.cos(a) * (110 + wave * 30), vy: Math.sin(a) * (110 + wave * 30), life: 5, r: 6, dmg: 10, kind: 'cera', delay: wave * 0.45});
          }
        }
        this.audio.sfx('lagrima');
      }
    }
  }

  bossHit(e) {
    if (e.hp > 0 && e.hp < e.maxHp * e.nextStagger) {
      // Cada golpe fuerte la aparta del ataúd.
      e.nextStagger -= 0.2;
      const tx = e.x - COFFIN.x, ty = e.y - COFFIN.y, d = Math.hypot(tx, ty) || 1;
      e.x += tx / d * 150; e.y += ty / d * 150;
      e.stun = 1.4;
      this.rings.push({x: e.x, y: e.y, r: 10, max: 120, life: 0.6, total: 0.6, color: '#fff1bd', width: 3, light: 140});
      this.audio.sfx('campana');
      if (this.options.shake) this.shake = Math.max(this.shake, 8);
      this.soul = Math.max(0, this.soul - 0.15);
    }
  }

  updateSoul(dt) {
    const b = this.boss, d = Math.hypot(b.x - COFFIN.x, b.y - COFFIN.y);
    if (d < 70 && b.stun <= 0) {
      if (!this.bossReached) { this.bossReached = true; this.say(BOSS.reach, 'Carmela', {priority: 3}); }
      this.soul = Math.min(1, this.soul + dt / 16);
      if (Math.random() < 0.4) this.particle({x: COFFIN.x + rand(-30, 30), y: COFFIN.y + rand(-8, 8), vx: (b.x - COFFIN.x) * 0.6, vy: (b.y - COFFIN.y) * 0.6 - 20, life: 0.9, size: 2, color: '#e8f5ff', glow: true});
      if (this.soul >= 1) this.beginDying('took');
    } else this.soul = Math.max(0, this.soul - dt / 20);
  }

  freeBoss(e) {
    this.corpses.push({type: 'guia', x: e.x, y: e.y, flip: e.flip, life: 1.6, total: 1.6, scale: 3, kneel: true});
    this.freeze = 0.3;
    this.flash = this.options.flashes ? 0.8 : 0.2; this.flashColor = '255,240,210';
    if (this.options.shake) this.shake = 10;
    this.audio.sfx('liberada');
    for (let i = 0; i < 40; i++) this.particle({x: e.x, y: e.y - 20, vx: rand(-160, 160), vy: rand(-200, 40), life: rand(0.8, 1.6), size: rand(2, 4), color: i % 3 ? '#fff1bd' : '#ffb04a', glow: true, grav: 40});
    this.subQueue = [];
    this.say(BOSS.freed, 'Carmela', {priority: 4});
    this.bark('freed', {priority: 4});
    this.hooks.onDiscover?.({kind: 'freed', id: 'guia'});
    this.soul = 0;
    for (const o of this.enemies) if (o !== e && o.hp > 0) { o.dissolve = true; o.dissolveT = rand(0.6, 2.4); }
    this.marks = [];
    this.enemyShots = [];
    this.hazards = [];
    this.phase = 'rush';
    this.rushFrom = this.time;
    this.player.inv = 99;
  }

  /* ---------- proyectiles, peligros, recogidas ---------- */

  updateShots(dt) {
    for (const s of this.shots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.kind === 'chispa' && Math.random() < 0.5) this.particle({x: s.x, y: s.y, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.22, size: 2, color: '#ffb04a', glow: true});
      for (const e of this.queryGrid(s.x, s.y, 36)) {
        if (e.hp <= 0 || e.dissolve || s.hit.has(e.id)) continue;
        const rr = e.r + s.r;
        if ((e.x - s.x) ** 2 + (e.y - 4 - s.y) ** 2 < rr * rr) {
          s.hit.add(e.id);
          this.hurt(e, s.dmg, {knock: s.knock, from: {x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05}});
          if (--s.pierce <= 0) { s.life = 0; break; }
        }
      }
    }
    this.shots = this.shots.filter(s => s.life > 0);
    if (this.shots.length > 160) this.shots.splice(0, this.shots.length - 160);
    const p = this.player;
    for (const s of this.enemyShots) {
      if (s.delay > 0) { s.delay -= dt; continue; }
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if ((p.x - s.x) ** 2 + (p.y - 6 - s.y) ** 2 < (s.r + 8) ** 2) { s.life = 0; this.damagePlayer(s.dmg, s); if (this.state !== 'running') return; }
    }
    this.enemyShots = this.enemyShots.filter(s => s.life > 0);
  }

  updateHazards(dt) {
    const p = this.player;
    for (const h of this.hazards) {
      h.t -= dt;
      if (h.t <= 0 && !h.done) {
        h.done = true;
        this.audio.sfx('salpica', {pan: (h.x - p.x) / this.width});
        this.rings.push({x: h.x, y: h.y, r: 8, max: h.r + 6, life: 0.3, total: 0.3, color: '#cfe8ff', width: 2, light: 80});
        for (let i = 0; i < 10; i++) this.particle({x: h.x, y: h.y, vx: rand(-120, 120), vy: rand(-160, -30), life: 0.6, size: 2, color: '#cfe8ff', glow: true, grav: 420});
        if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + 6) this.damagePlayer(h.dmg, h);
        if (this.state !== 'running') return;
      }
    }
    this.hazards = this.hazards.filter(h => !h.done);
    for (const m of this.marks) {
      m.t -= dt;
      if (m.t <= 0 && !m.done) { m.done = true; const e = this.spawn('hermano', m); if (e) e.summoned = true; }
    }
    this.marks = this.marks.filter(m => !m.done);
  }

  updatePickups(dt) {
    const p = this.player, R = this.st.pickup;
    for (const g of this.gems) {
      const dx = p.x - g.x, dy = p.y - 4 - g.y, d = Math.hypot(dx, dy);
      if (d < R) g.magnet = true;
      if (g.magnet) { const s = Math.max(200, 460 - d); g.x += dx / (d || 1) * s * dt; g.y += dy / (d || 1) * s * dt; }
      if (d < 15) {
        g.got = true;
        if (g.cafe) {
          p.hp = Math.min(this.st.maxHp, p.hp + 25);
          this.audio.sfx('cafe');
          for (let i = 0; i < 6; i++) this.particle({x: p.x, y: p.y - 10, vx: rand(-30, 30), vy: rand(-60, -30), life: 0.8, size: 2, color: '#f1e8d2', glow: false});
        } else {
          this.xp += g.v * this.st.memory;
          this.audio.sfx('luz', {pan: 0});
        }
      }
    }
    this.gems = this.gems.filter(g => !g.got && Math.abs(g.x - p.x) < 2600 && Math.abs(g.y - p.y) < 2600);
  }

  particle(o) {
    if (this.particles.length > 420) this.particles.shift();
    o.total = o.life;
    this.particles.push(o);
  }

  updateFx(dt) {
    this.shake = Math.max(0, this.shake - dt * 22);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.grav) q.vy += q.grav * dt; }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.max - r.r) * (1 - Math.exp(-dt * 10)); }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const n of this.numbers) { n.life -= dt; n.y -= 24 * dt; }
    this.numbers = this.numbers.filter(n => n.life > 0);
    for (const c of this.corpses) c.life -= dt;
    this.corpses = this.corpses.filter(c => c.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter(g => g.life > 0);
  }

  /* ---------- recuerdos ---------- */

  levelUp() {
    this.xp -= this.xpNext;
    this.level++;
    this.xpNext = this.xpFor(this.level);
    this.keys.clear(); this.pointer = null;
    const owned = MEMORIES.filter(m => this.mem[m.id] > 0 && this.mem[m.id] < MAX_LEVEL);
    const fresh = MEMORIES.filter(m => this.mem[m.id] === 0);
    const pool = [...owned, ...fresh].sort(() => Math.random() - 0.5);
    let picks = pool.slice(0, 3);
    // Que siempre haya algo nuevo y algo conocido, si se puede.
    if (owned.length && !picks.some(c => this.mem[c.id] > 0)) picks[2] = pick(owned);
    if (fresh.length && !picks.some(c => this.mem[c.id] === 0)) picks[1] = pick(fresh);
    picks = [...new Set(picks)].filter(Boolean);
    for (const f of FALLBACK_CHOICES) if (picks.length < 3) picks.push(f);
    this.choices = picks.map(c => ({...c, level: (this.mem[c.id] || 0) + 1, isNew: !this.mem[c.id] && MEMORY[c.id] !== undefined}));
    this.audio.sfx('recuerdo');
    this.setState('upgrade');
    this.emitStats();
    if (this.bot) { this.chooseUpgrade(this.choices[Math.floor(Math.random() * this.choices.length)].id); return; }
    this.hooks.onLevelUp?.({level: this.level, choices: this.choices});
  }

  chooseUpgrade(id) {
    if (this.state !== 'upgrade') return false;
    const choice = this.choices.find(c => c.id === id);
    if (!choice) return false;
    const p = this.player;
    if (id === 'cafe') p.hp = Math.min(this.st.maxHp, p.hp + 35);
    else if (id === 'silencio') this.dashCd = 0;
    else {
      const first = this.mem[id] === 0;
      this.mem[id] = Math.min(MAX_LEVEL, this.mem[id] + 1);
      if (first) { this.order.push(id); this.hooks.onDiscover?.({kind: 'memory', id}); }
      this.computeStats();
      if (id === 'caldo') p.hp = Math.min(this.st.maxHp, p.hp + 30);
      if (id === 'campana' && first) this.t.campana = 0.6;
      const said = this.bark('memory_' + id, {priority: 2});
      if (!said && first && Math.random() < 0.4) {
        const line = AMPARO.lines.find(l => !this.amparoSaid.has(l));
        if (line) { this.amparoSaid.add(line); this.say(line, AMPARO.name, {italic: true}); }
      }
    }
    this.choices = [];
    this.rings.push({x: p.x, y: p.y, r: 12, max: 120, life: 0.7, total: 0.7, color: '#ffd59a', width: 2, light: 160});
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; this.particle({x: p.x, y: p.y - 6, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.6, size: 2, color: '#ffe2a0', glow: true}); }
    this.lastFrame = performance.now();
    this.setState('running');
    this.emitStats();
    this.canvas.focus?.({preventScroll: true});
    return true;
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
    this.enemyShots = []; this.hazards = []; this.marks = [];
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

  /* ---------- piloto automático para pruebas ---------- */

  botMove() {
    const p = this.player;
    // bot = 2 imita a alguien que juega por primera vez: reacciona tarde y esquiva a medias.
    const sloppy = this.bot === 2;
    if (sloppy && this.botMemo && this.clock - this.botMemo.at < 0.28) return this.botMemo.mv;
    let fx = 0, fy = 0;
    const sense = sloppy ? 95 : 150;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
      if (d2 < sense * sense) {
        const d = Math.sqrt(d2) || 1, near = d < 70 + e.r ? 6 : 1;
        const w = (e.type === 'guia' ? 2 : 1) * near * 1600 / (d2 + 300);
        fx += dx / d * w; fy += dy / d * w;
      }
    }
    for (const s of this.enemyShots) {
      const dx = p.x - s.x, dy = p.y - s.y, d2 = dx * dx + dy * dy;
      if (d2 < 110 * 110) { const d = Math.sqrt(d2) || 1; fx += dx / d * 3000 / (d2 + 200); fy += dy / d * 3000 / (d2 + 200); }
    }
    for (const h of this.hazards) {
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (d < h.r + 30) { fx += dx / d * 4; fy += dy / d * 4; }
    }
    // Da vueltas alrededor del velatorio; cuando llega la Guía, va a por ella.
    let tx, ty;
    if (this.boss && this.boss.hp > 0) {
      const a = Math.atan2(p.y - this.boss.y, p.x - this.boss.x) + 0.6;
      tx = this.boss.x + Math.cos(a) * 120; ty = this.boss.y + Math.sin(a) * 120;
    } else {
      const a = Math.atan2(p.y, p.x) + 0.5;
      tx = Math.cos(a) * 260; ty = Math.sin(a) * 260;
      let best = null, bd = 160 * 160;
      for (const g of this.gems) { const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d < bd) { bd = d; best = g; } }
      if (best) { tx = best.x; ty = best.y; }
    }
    const gx = tx - p.x, gy = ty - p.y, gd = Math.hypot(gx, gy) || 1;
    fx += gx / gd * 0.9; fy += gy / gd * 0.9;
    const len = Math.hypot(fx, fy);
    if (this.dashCd === 0 && this.dashTime <= 0 && this.state === 'running' && (!sloppy || Math.random() < 0.3)) {
      const close = this.enemies.some(e => e.hp > 0 && !e.dissolve && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 22);
      if (close && len > 0.01) { this.dashDir = {x: fx / len, y: fy / len}; this.dashTime = 0.24; this.dashCd = this.st.dashCd; p.inv = Math.max(p.inv, 0.5); }
    }
    const mv = len > 0.05 ? {x: fx / len, y: fy / len} : {x: 0, y: 0};
    if (sloppy) this.botMemo = {at: this.clock, mv};
    return mv;
  }

  /* ---------- estado para la interfaz ---------- */

  getSnapshot() {
    const b = this.boss;
    const hourIdx = Math.min(6, Math.floor(this.time / HOUR));
    return {
      state: this.state, phase: this.phase, time: this.time, clock: fmtClock(this.time), hour: hourIdx,
      mood: this.phase === 'stopped' ? 'El reloj se ha parado' : this.phase === 'rush' ? 'Clarea' : HOURS[hourIdx].mood,
      kills: this.kills, level: this.level, xp: this.xp, xpNext: this.xpNext,
      hp: this.player.hp, maxHp: this.st.maxHp, dashCd: this.dashCd, dashMax: this.st.dashCd,
      character: this.character, mem: {...this.mem}, order: [...this.order],
      boss: b ? {alive: b.hp > 0, hp: Math.max(0, b.hp), maxHp: b.maxHp, soul: this.soul} : null
    };
  }

  emitStats() { this.hooks.onStats?.(this.getSnapshot()); }

  /* ---------- dibujo ---------- */

  nightLook() {
    const t = this.time;
    let dark;
    if (t < 300) dark = 0.8 + t / 300 * 0.1;
    else if (t < 450) dark = 0.9;
    else dark = 0.9 - (Math.min(t, NIGHT) - 450) / 150 * 0.2;
    let tint = [4, 7, 17];
    if (t > 470) { const k = clamp((t - 470) / 130, 0, 1); tint = [lerp(4, 30, k), lerp(7, 24, k), lerp(17, 52, k)]; }
    let warm = 0;
    if (this.state === 'ready') { dark = 0.8; tint = [4, 7, 17]; }
    if (this.state === 'dying') dark = lerp(dark, 0.985, clamp(this.dyingT / 1.6, 0, 1));
    if (this.state === 'ended' && !this.lastVictory) dark = 0.985;
    if (this.state === 'dawn' || (this.state === 'ended' && this.lastVictory)) {
      const k = this.state === 'dawn' ? clamp(this.dawnT / 7, 0, 1) : 1;
      const k2 = this.state === 'dawn' ? clamp((this.dawnT - 6) / 6, 0, 1) : 1;
      dark = lerp(lerp(dark, 0.42, k), 0.22, k2);
      tint = [lerp(tint[0], 24, k), lerp(tint[1], 30, k), lerp(tint[2], 64, k)];
      warm = k + k2 * 0.7;
    }
    if (this.options.softDark) dark *= 0.8;
    const fog = this.state === 'ready' ? 0.7 : t < 300 ? 0.55 + t / 300 * 0.45 : t < 450 ? 1 : 1 - (t - 450) / 150 * 0.5;
    const dawnFog = this.state === 'dawn' ? fog * Math.max(0.25, 1 - this.dawnT / 6) : this.state === 'ended' && this.lastVictory ? fog * 0.25 : fog;
    return {dark, tint: tint.map(v => Math.round(v)).join(','), warm, fog: dawnFog};
  }

  render() {
    const ctx = this.ctx, w = this.width, h = this.height, p = this.player;
    const title = this.state === 'ready';
    const target = title ? this.titleFocus : p;
    if (title) { this.cam.x = target.x; this.cam.y = target.y; }
    else { const k = 1 - Math.exp(-0.016 * 12); this.cam.x = lerp(this.cam.x, target.x, k); this.cam.y = lerp(this.cam.y, target.y, k); }
    const camX = Math.round(this.cam.x - w / 2), camY = Math.round(this.cam.y - h / 2);
    const look = this.nightLook();
    const flames = [], lights = [];
    ctx.save();
    if (this.shake > 0.2 && this.options.shake) ctx.translate(Math.round(rand(-1, 1) * this.shake), Math.round(rand(-1, 1) * this.shake));
    drawWorld(ctx, camX, camY, w, h, this.clock, flames, lights);
    drawFog(ctx, camX, camY, w, h, this.clock, look.fog * 0.9);

    // Café en el suelo
    for (const g of this.gems) {
      if (!g.cafe) continue;
      const x = g.x - camX, y = g.y - camY + Math.sin(this.clock * 3 + g.bob) * 2;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      drawShadow(ctx, x, y + 8, 7);
      drawSprite(ctx, 'cafe', x, y, {scale: 2});
      lights.push({x, y, r: 34, i: 0.6, c: 'warm', g: 0.3});
    }

    // Quién y qué hay en escena, ordenado de arriba abajo
    const items = [];
    if (title) this.titleCast(items, camX, camY, lights);
    for (const e of this.enemies) {
      const x = e.x - camX, y = e.y - camY;
      if (x < -90 || x > w + 90 || y < -110 || y > h + 90) continue;
      items.push({kind: 'enemy', e, x, y, sortY: y});
    }
    for (const c of this.corpses) items.push({kind: 'corpse', c, x: c.x - camX, y: c.y - camY, sortY: c.y - camY});
    if (!title && this.state !== 'ended' || (this.state === 'ended' && this.lastVictory)) items.push({kind: 'player', x: p.x - camX, y: p.y - camY, sortY: p.y - camY});
    items.sort((a, b) => a.sortY - b.sortY);

    for (const g of this.ghosts) {
      ctx.globalAlpha = g.life / 0.28 * 0.35;
      drawSprite(ctx, this.character, g.x - camX, g.y - camY - 12, {scale: 2, flip: g.face < 0, layer: 'white'});
    }
    ctx.globalAlpha = 1;
    const entityLights = [];
    for (const it of items) this.drawItem(ctx, it, entityLights, 'base');
    if (entityLights.length > 56) {
      const cx = w / 2, cy = h / 2;
      entityLights.sort((a, b) => ((a.x - cx) ** 2 + (a.y - cy) ** 2) - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
      entityLights.length = 56;
    }
    for (const L of entityLights) lights.push(L);

    // Rosario
    if (this.mem.rosario && !title && this.state !== 'ended') {
      const beads = 1 + this.mem.rosario, R = 58 + 4 * this.mem.rosario;
      ctx.strokeStyle = 'rgba(241,232,210,.12)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(p.x - camX, p.y - 4 - camY, R, R, 0, 0, TAU); ctx.stroke();
    }
    // Polillas
    for (const m of this.moths) {
      const flap = Math.sin(m.flap) > 0 ? 1 : 0.55;
      drawSprite(ctx, 'polilla', m.x - camX, m.y - camY, {scale: 2, sx: flap});
    }
    // Sal (granos blancos)
    for (const s of this.shots) {
      if (s.kind !== 'sal') continue;
      ctx.fillStyle = '#f6efe0';
      ctx.fillRect(Math.round(s.x - camX - 2), Math.round(s.y - camY - 2), 4, 4);
      ctx.fillStyle = 'rgba(246,239,224,.35)';
      ctx.fillRect(Math.round(s.x - camX - s.vx * 0.02 - 1), Math.round(s.y - camY - s.vy * 0.02 - 1), 3, 3);
    }
    // Partículas sin luz propia
    for (const q of this.particles) {
      if (q.glow) continue;
      ctx.globalAlpha = clamp(q.life / q.total, 0, 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - camX - q.size / 2), Math.round(q.y - camY - q.size / 2), q.size, q.size);
    }
    ctx.globalAlpha = 1;

    // Luces de lo que se mueve
    if (!title && (this.state !== 'ended' || this.lastVictory)) lights.push({x: p.x - camX + p.face * 8, y: p.y - camY - 10, r: this.lightRadius(), i: 1, c: 'warm', g: 0.5});
    let budget = 70;
    for (const s of this.shots) if (s.kind === 'chispa' && budget-- > 0) lights.push({x: s.x - camX, y: s.y - camY, r: 34, i: 0.7, c: 'warm', g: 0.5});
    for (const s of this.enemyShots) if (!(s.delay > 0)) lights.push({x: s.x - camX, y: s.y - camY, r: 30, i: 0.7, c: s.kind === 'cera' ? 'warm' : 'blue', g: 0.6});
    budget = 60;
    for (const g of this.gems) {
      if (g.cafe || budget <= 0 || this.state === 'dawn' || this.state === 'ended') continue;
      const x = g.x - camX, y = g.y - camY;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      budget--;
      lights.push({x, y, r: 22, i: 0.55, c: 'warm', g: 0.35});
    }
    for (const r of this.rings) if (r.light) lights.push({x: r.x - camX, y: r.y - camY, r: r.light * (0.6 + 0.4 * r.r / r.max), i: 0.75 * r.life / r.total, c: 'warm', g: 0.4});
    for (const m of this.marks) lights.push({x: m.x - camX, y: m.y - camY, r: 40, i: 0.8, c: 'warm', g: 0.5});

    // El faro de su padre barre el camposanto
    const beams = [{x: 2600 - camX, y: 1500 - camY, a: this.clock * 0.42, spread: 0.06, len: 4600, i: this.state === 'dawn' ? 0.2 : 0.55}];

    this.lighting.render(ctx, lights, look.dark, look.tint, beams);
    this.lighting.glow(ctx, lights, 0.55 * (1 - look.warm * 0.6));
    drawFlames(ctx, flames, this.clock);
    for (const it of items) this.drawItem(ctx, it, null, 'glow');

    // Luz que se recoge (al amanecer, sube y se va)
    const gemAlpha = this.state === 'dawn' ? clamp(1 - this.dawnT / 7, 0, 1) : this.state === 'ended' && this.lastVictory ? 0 : 1;
    ctx.globalAlpha = gemAlpha;
    for (const g of this.gems) {
      if (g.cafe || gemAlpha <= 0) continue;
      const x = Math.round(g.x - camX), y = Math.round(g.y - camY + Math.sin(this.clock * 4 + g.bob) * 2);
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
      const big = g.v > 2;
      ctx.fillStyle = 'rgba(255,176,74,.3)'; ctx.fillRect(x - 4, y - 4, 8, big ? 11 : 9);
      ctx.fillStyle = big ? '#ffe9a8' : '#ffc46a'; ctx.fillRect(x - 2, y - (big ? 5 : 4), 4, big ? 9 : 8);
      ctx.fillRect(x - 1, y - (big ? 7 : 6), 2, 2);
      ctx.fillStyle = '#fff6d6'; ctx.fillRect(x - 1, y - 1, 2, 3);
    }
    ctx.globalAlpha = 1;
    // Chispas
    for (const s of this.shots) {
      if (s.kind !== 'chispa') continue;
      const x = s.x - camX, y = s.y - camY;
      ctx.strokeStyle = 'rgba(255,176,74,.45)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(s.a) * 12, y - Math.sin(s.a) * 12); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#ffb04a'; ctx.fillRect(Math.round(x - 3), Math.round(y - 3), 6, 6);
      ctx.fillStyle = '#fff1bd'; ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 3, 3);
    }
    // Rosario: las cuentas brillan un poco
    if (this.mem.rosario && !title && this.state !== 'ended') {
      const beads = 1 + this.mem.rosario, R = 58 + 4 * this.mem.rosario;
      for (let i = 0; i < beads; i++) {
        const a = this.clock * 2.3 + i * TAU / beads, x = Math.round(p.x - camX + Math.cos(a) * R), y = Math.round(p.y - 4 - camY + Math.sin(a) * R);
        ctx.fillStyle = '#07080d'; ctx.fillRect(x - 3, y - 4, 6, 8); ctx.fillRect(x - 4, y - 3, 8, 6);
        ctx.fillStyle = '#e9e0cc'; ctx.fillRect(x - 2, y - 3, 4, 6); ctx.fillRect(x - 3, y - 2, 6, 4);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 2, 2, 2);
      }
    }
    // Partículas con luz
    for (const q of this.particles) {
      if (!q.glow) continue;
      ctx.globalAlpha = clamp(q.life / q.total, 0, 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - camX - q.size / 2), Math.round(q.y - camY - q.size / 2), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    this.drawTelegraphs(ctx, camX, camY);
    // Proyectiles enemigos
    for (const s of this.enemyShots) {
      if (s.delay > 0) continue;
      const x = Math.round(s.x - camX), y = Math.round(s.y - camY);
      if (s.kind === 'cera') {
        ctx.fillStyle = 'rgba(255,176,74,.5)'; ctx.fillRect(x - 5, y - 5, 10, 10);
        ctx.fillStyle = '#fff1bd'; ctx.fillRect(x - 3, y - 3, 6, 6);
      } else {
        ctx.fillStyle = 'rgba(134,191,242,.45)'; ctx.fillRect(x - 5, y - 6, 10, 12);
        ctx.fillStyle = '#e8f5ff'; ctx.fillRect(x - 2, y - 4, 4, 7);
        ctx.fillRect(x - 1, y - 6, 2, 2);
      }
    }
    for (const r of this.rings) {
      ctx.globalAlpha = clamp(r.life / r.total, 0, 1);
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width || 2;
      ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, r.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.options.numbers) {
      ctx.textAlign = 'center'; ctx.font = 'bold 12px ui-monospace, monospace';
      for (const n of this.numbers) {
        ctx.globalAlpha = Math.min(1, n.life * 3);
        ctx.fillStyle = '#07080d'; ctx.fillText(n.text, n.x - camX + 1, n.y - camY + 1);
        ctx.fillStyle = n.color; ctx.fillText(n.text, n.x - camX, n.y - camY);
      }
      ctx.globalAlpha = 1;
    }
    if (!title && ['running', 'paused', 'upgrade'].includes(this.state)) this.drawPointers(ctx, camX, camY);
    this.drawOverlays(ctx, look);
    if (this.pointer) {
      ctx.strokeStyle = 'rgba(241,232,210,.25)'; ctx.fillStyle = 'rgba(241,232,210,.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.pointer.start.x, this.pointer.start.y, 40, 0, TAU); ctx.fill(); ctx.stroke();
      const mv = this.movement();
      ctx.fillStyle = 'rgba(255,213,154,.4)';
      ctx.beginPath(); ctx.arc(this.pointer.start.x + mv.x * 30, this.pointer.start.y + mv.y * 30, 13, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  titleCast(items, camX, camY, lights) {
    const sel = this.character;
    const cast = [
      {key: 'lucia', x: -112, y: 26, flip: false},
      {key: 'julian', x: 116, y: 22, flip: true},
      {key: 'matilde', x: -8, y: 92, flip: false}
    ];
    for (const c of cast) {
      const on = c.key === sel;
      const x = c.x - camX, y = c.y - camY;
      items.push({kind: 'cast', key: c.key, x, y, flip: c.flip, on, sortY: y});
      lights.push({x: x + (c.flip ? -6 : 6), y: y - 8, r: on ? 150 : 70, i: on ? 1 : 0.55, c: 'warm', g: on ? 0.45 : 0.15});
    }
    // La Compaña pasa a lo lejos, sin mirar.
    const n = 8, base = ((this.clock * 20 + 1100) % 2600) - 1300;
    for (let i = 0; i < n; i++) {
      const x = base - i * 30 - camX, y = -230 + Math.sin((base - i * 30) * 0.004) * 30 - camY;
      items.push({kind: 'decor', key: 'hermano', x, y, flip: false, sortY: y, alpha: 0.9});
      lights.push({x: x + 4, y: y - 4, r: 46, i: 0.8, c: 'warm', g: 0.5});
    }
    for (let i = 0; i < 5; i++) {
      const a = this.clock * 0.25 + i * TAU / 5, x = Math.cos(a) * 330 - camX, y = Math.sin(a) * 170 + 40 - camY;
      items.push({kind: 'decor', key: 'anima', x, y: y + Math.sin(this.clock * 2 + i) * 5, flip: false, sortY: y});
      lights.push({x, y, r: 44, i: 0.7, c: 'blue', g: 0.7});
    }
  }

  drawItem(ctx, it, lights, layer) {
    const t = this.clock;
    if (it.kind === 'cast' || it.kind === 'decor') {
      const bob = it.key === 'anima' ? 0 : Math.sin(t * 2 + it.x) * 0.6;
      if (layer === 'base' && it.key !== 'anima') drawShadow(ctx, it.x, it.y + 20, 11);
      ctx.save();
      if (it.alpha !== undefined) ctx.globalAlpha = it.alpha;
      drawSprite(ctx, it.key, it.x, it.y, {scale: 2, flip: it.flip, bob, layer});
      ctx.restore();
      return;
    }
    if (it.kind === 'player') {
      const p = this.player;
      if (layer === 'base') drawShadow(ctx, it.x, it.y + 10, 11);
      if (p.inv > 0 && p.inv < 50 && Math.floor(t * 20) % 2 && layer === 'base') ctx.globalAlpha = 0.55;
      const step = p.moving ? Math.abs(Math.sin(p.walk)) : 0;
      drawSprite(ctx, this.character, it.x, it.y - 12, {scale: 2, flip: p.face < 0, bob: -step * 2, sy: 1 + step * 0.03, layer});
      ctx.globalAlpha = 1;
      return;
    }
    if (it.kind === 'corpse') {
      const c = it.c, k = clamp(c.life / c.total, 0, 1);
      if (layer !== 'base') return;
      ctx.save();
      ctx.globalAlpha = k;
      const s = sprite(c.type), sy = c.kneel ? 0.55 + 0.45 * k : 0.35 + 0.65 * k;
      const feet = it.y + ENEMIES[c.type].r * 0.6;
      drawSprite(ctx, c.type, it.x, feet - (s.h * c.scale * sy) / 2, {scale: c.scale, flip: c.flip, sy, sx: c.kneel ? 1 : 1 + (1 - k) * 0.35, layer: 'white'});
      ctx.restore();
      return;
    }
    const e = it.e, d = ENEMIES[e.type], s = sprite(e.type), scale = d.scale;
    const flying = e.type === 'anima' || e.type === 'curuxa';
    let bob = flying ? Math.sin(t * (e.type === 'anima' ? 5 : 7) + e.seed) * 4 : Math.sin(t * 6 + e.seed) * 0.7;
    let sx = 1, sy = 1, rot = 0, x = it.x, y = it.y - (s.h * scale) / 2 + e.r * 0.6;
    if (e.type === 'curuxa') sx = 0.85 + Math.abs(Math.sin(t * 9 + e.seed)) * 0.2;
    if (e.type === 'urco') {
      if (e.mode === 'windup') { sy = 0.86; sx = 1.1; x += Math.sin(t * 60) * 1.5; }
      else if (e.mode === 'lunge') { sx = 1.18; sy = 0.92; }
      else bob = Math.abs(Math.sin(t * 9 + e.seed)) * -2;
    }
    if (e.type === 'hermano') rot = Math.sin(t * 3 + e.seed) * 0.03;
    if (e.type === 'ahogado') rot = Math.sin(t * 2 + e.seed) * 0.06;
    if (e.type === 'planidera' && e.mode === 'cry') x += Math.sin(t * 40) * 1.2;
    if (e.type === 'espantajo') { rot = Math.sin(t * 1.6 + e.seed) * 0.05; if (e.mode === 'swing') rot = Math.sin(t * 30) * 0.12; }
    if (e.type === 'guia') { bob = Math.sin(t * 2) * 1.5; if (e.stun > 0) x += Math.sin(t * 50) * 2; }
    let alpha = 1;
    if (e.dissolve) alpha = clamp(e.dissolveT / 1.2, 0, 1);
    if (layer === 'base') {
      if (!flying) drawShadow(ctx, it.x, it.y + e.r * 0.6 + 4, s.w * scale * 0.33);
      else drawShadow(ctx, it.x, it.y + 18, 8, 0.25);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSprite(ctx, e.type, x, y, {scale, flip: e.flip, bob, sx, sy, rot});
      // A la Guía le llueven golpes: un destello suave para que se la siga viendo.
      if (e.hit > 0) { ctx.globalAlpha = alpha * (e.type === 'guia' ? 0.28 : 0.85); drawSprite(ctx, e.type, x, y, {scale, flip: e.flip, bob, sx, sy, rot, layer: 'white'}); }
      ctx.restore();
      if (lights) {
        if (e.type === 'hermano') lights.push({x: x + (e.flip ? -7 : 7), y: y - 4 + bob, r: 56, i: 0.85 * alpha, c: 'warm', g: 0.55});
        else if (e.type === 'anima') lights.push({x, y: y + bob, r: 48, i: 0.75 * alpha, c: 'blue', g: 0.75});
        else if (e.type === 'guia') lights.push({x: x + (e.flip ? -26 : 26), y: y + bob - 6, r: 170, i: 1, c: 'warm', g: 0.7});
        else if (e.type === 'planidera' && e.mode === 'cry') lights.push({x, y: y - 10, r: 40, i: 0.6, c: 'blue', g: 0.6});
      }
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSprite(ctx, e.type, x, y, {scale, flip: e.flip, bob, sx, sy, rot, layer: 'glow'});
      ctx.restore();
    }
  }

  drawTelegraphs(ctx, camX, camY) {
    const t = this.clock;
    ctx.save();
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const x = e.x - camX, y = e.y - camY;
      if (e.type === 'urco' && e.mode === 'windup') {
        ctx.strokeStyle = `rgba(255,78,58,${0.45 + Math.sin(t * 20) * 0.2})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        const L = e.speed * 4.4 * 0.42;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.lock) * L, y + Math.sin(e.lock) * L); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.type === 'curuxa' && e.mode === 'windup') {
        ctx.strokeStyle = `rgba(255,212,71,${0.4 + Math.sin(t * 24) * 0.2})`; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
        const L = e.speed * 3.8 * 0.55;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.lock) * L, y + Math.sin(e.lock) * L); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.type === 'espantajo' && e.mode === 'swing') {
        const k = 1 - e.modeT / 0.85;
        ctx.strokeStyle = 'rgba(214,180,102,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y + 6, 92, 92 * 0.75, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(214,180,102,${0.08 + k * 0.14})`;
        ctx.beginPath(); ctx.ellipse(x, y + 6, 92 * k, 92 * 0.75 * k, 0, 0, TAU); ctx.fill();
      }
    }
    for (const h of this.hazards) {
      const x = h.x - camX, y = h.y - camY, k = 1 - h.t / h.total;
      ctx.strokeStyle = `rgba(207,232,255,${0.5 + k * 0.4})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, h.r, h.r * 0.8, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(207,232,255,${0.08 + k * 0.2})`;
      ctx.beginPath(); ctx.ellipse(x, y, h.r * k, h.r * 0.8 * k, 0, 0, TAU); ctx.fill();
      // el frasco cae
      const fx = lerp(h.fromX - camX, x, k), fy = lerp(h.fromY - camY, y, k) - Math.sin(k * Math.PI) * 120;
      ctx.fillStyle = '#e8f5ff'; ctx.fillRect(Math.round(fx - 2), Math.round(fy - 3), 4, 6);
    }
    for (const m of this.marks) {
      const x = Math.round(m.x - camX), y = Math.round(m.y - camY), k = 1 - m.t / m.total;
      ctx.fillStyle = `rgba(255,176,74,${0.3 + k * 0.5})`; ctx.fillRect(x - 2, y - 6 - k * 4, 4, 6 + k * 4);
      ctx.fillStyle = '#fff1bd'; ctx.fillRect(x - 1, y - 3 - k * 3, 2, 3);
    }
    ctx.restore();
  }

  /* Flechas hacia Amparo y hacia la Guía cuando quedan fuera de la vista. */
  drawPointers(ctx, camX, camY) {
    const w = this.width, h = this.height;
    const arrow = (wx, wy, color, label) => {
      const x = wx - camX, y = wy - camY;
      if (x > 30 && x < w - 30 && y > 30 && y < h - 30) return;
      const cx = w / 2, cy = h / 2, a = Math.atan2(y - cy, x - cx);
      const m = 26, sx = clamp(cx + Math.cos(a) * (w / 2), m, w - m), sy = clamp(cy + Math.sin(a) * (h / 2), m, h - m);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(a);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.font = `600 ${Math.round(12 / (this.zoom || 1))}px Alegreya Sans, system-ui, sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = color;
      const lx = clamp(sx - Math.cos(a) * 26, 40, w - 40), ly = clamp(sy - Math.sin(a) * 20, 20, h - 14);
      ctx.fillText(label, lx, ly + 4);
      ctx.restore();
    };
    arrow(COFFIN.x, COFFIN.y, 'rgba(255,213,154,.85)', 'Amparo');
    if (this.boss && this.boss.hp > 0) arrow(this.boss.x, this.boss.y, 'rgba(255,120,90,.95)', 'La Guía');
  }

  drawOverlays(ctx, look) {
    const w = this.width, h = this.height;
    const p = this.player;
    // Viñeta
    if (!this.vignette || this.vignette.w !== w || this.vignette.h !== h) {
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
      this.vignette = {w, h, g: v};
    }
    ctx.fillStyle = this.vignette.g; ctx.fillRect(0, 0, w, h);
    // Poca vida: el borde late en rojo
    if (['running', 'paused', 'upgrade'].includes(this.state)) {
      const low = 1 - p.hp / this.st.maxHp;
      if (low > 0.62) {
        const k = (low - 0.62) / 0.38 * (0.6 + Math.sin(this.clock * 6) * 0.25);
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
        g.addColorStop(0, 'rgba(90,0,0,0)'); g.addColorStop(1, `rgba(110,10,8,${0.5 * k})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }
    // El alba entra por el este: rosa y oro sobre la piedra fría
    if (look.warm > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.max(w, h) * 1.05;
      const g = ctx.createRadialGradient(w * 1.02, -h * 0.08, 0, w * 1.02, -h * 0.08, R);
      g.addColorStop(0, `rgba(255,178,110,${0.36 * look.warm})`);
      g.addColorStop(0.35, `rgba(214,120,120,${0.16 * look.warm})`);
      g.addColorStop(0.75, `rgba(90,80,150,${0.06 * look.warm})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(${this.flashColor},${this.options.flashes ? this.flash * 0.6 : this.flash * 0.15})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
