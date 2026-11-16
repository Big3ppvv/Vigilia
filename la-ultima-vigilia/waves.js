/*
 * Quién viene en cada ronda y por dónde. Toda criatura avisa antes de
 * aparecer: una marca en el suelo durante casi un segundo. Las procesiones
 * entran por un lado del atrio y lo cruzan; las hordas te rodean; al final
 * de cada hora llega un difunto con nombre y, en la última ronda, la Guía.
 */
import { TAU, rand, pick, clamp } from './util.js';
import { ARENA, ENEMIES, SPAWN, ELITE_ROUNDS, HORDE_ROUNDS, ELITE, BOSS_ROUND, DANGER, clockAt } from './balance.js';
import { ELITES, BOSS, VIGIL_TEXT } from './story.js';

/* Qué criaturas pesan más a cada hora: la marea trae ahogados; las tres, ánimas. */
const HOUR_BIAS = [
  {},
  {hermano: 1.3},
  {ahogado: 1.8, planidera: 1.2},
  {anima: 2, lavandeira: 1.5},
  {urco: 1.4, nubeiro: 1.6, curuxa: 1.3},
  {lobishome: 1.6, espantajo: 1.4, hermano: 1.3}
];

export const waveMethods = {
  resetWaves() {
    this.spawnT = 0; this.procT = Infinity; this.hordeDone = true; this.eliteDone = true;
    this.eliteAlive = null; this.processionNear = 0; this.processionPan = 0; this.bossDue = -1;
  },

  dangerMul() { return DANGER[this.run.danger] || DANGER[0]; },

  resetWaveRound(r) {
    this.spawnT = 0.35;
    this.procT = r >= 3 ? rand(5, 9) : Infinity;
    this.hordeDone = !HORDE_ROUNDS.includes(r);
    this.eliteDone = !ELITE_ROUNDS[r];
    this.eliteAlive = null;
    this.boss = null;
    this.bossDue = r === BOSS_ROUND ? 2.2 : -1;
    // Unas pocas criaturas para empezar, lejos y avisadas.
    const first = Math.min(10, 3 + r);
    for (let i = 0; i < first; i++) { const at = this.spawnPoint(260); this.addMark(this.pickType(r), at.x, at.y, {delay: 0.6 + i * 0.12}); }
  },

  hourOf(r) { return Math.min(5, Math.floor(clockAt(r, 0.5) / 60)); },

  pickType(r) {
    const bias = HOUR_BIAS[this.hourOf(r)] || {};
    const pool = Object.entries(ENEMIES).filter(([, d]) => d.weight > 0 && r >= d.from).map(([id, d]) => [id, d.weight * (bias[id] || 1) * (id === 'anima' && r > 8 ? 0.6 : 1)]);
    let roll = Math.random() * pool.reduce((s, [, w]) => s + w, 0);
    for (const [id, w] of pool) { roll -= w; if (roll < 0) return id; }
    return pool[pool.length - 1][0];
  },

  /* Un punto del atrio lejos de quien vela; prefiere los bordes y lo que queda delante. */
  spawnPoint(min = SPAWN.minDistance) {
    const p = this.player;
    for (let tries = 0; tries < 14; tries++) {
      const x = rand(ARENA.left + 40, ARENA.right - 40), y = rand(ARENA.top + 50, ARENA.bottom - 40);
      const d = Math.hypot(x - p.x, y - p.y);
      if (d >= min && (d < 720 || tries > 8)) return {x, y};
    }
    const a = rand(0, TAU);
    return {x: clamp(p.x + Math.cos(a) * min * 1.4, ARENA.left + 40, ARENA.right - 40), y: clamp(p.y + Math.sin(a) * min * 1.4, ARENA.top + 50, ARENA.bottom - 40)};
  },

  /* La marca en el suelo: dentro de un rato, ahí aparece algo. */
  addMark(type, x, y, opts = {}) {
    const delay = opts.delay ?? SPAWN.telegraph;
    this.marks.push({type, x: clamp(x, ARENA.left + 24, ARENA.right - 24), y: clamp(y, ARENA.top + 30, ARENA.bottom - 20), t: delay, total: delay, opts, seed: Math.random() * 10});
  },

  updateSpawns(dt) {
    const r = this.run.round, hold = this.state !== 'running';
    for (const m of this.marks) m.t -= dt;
    const due = this.marks.filter(m => m.t <= 0);
    if (due.length) {
      this.marks = this.marks.filter(m => m.t > 0);
      for (const m of due) this.fromMark(m);
    }
    if (hold) return;
    if (this.bossDue > 0) { this.bossDue -= dt; if (this.bossDue <= 0) this.spawnBoss(); }
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      const boss = this.boss && this.boss.hp > 0;
      this.spawnT = SPAWN.interval(r) * rand(0.8, 1.2) * (boss ? 1.6 : 1) * (this.stopped ? 1.3 : 1);
      let alive = this.marks.length;
      for (const e of this.enemies) if (!e.summoned && !e.proc && !e.dissolve) alive++;
      const target = SPAWN.population(r) * (boss ? 0.45 : 1) * (this.timeLeft < 3 ? 0.3 : 1);
      if (alive < target) {
        const [a, b] = SPAWN.group(r);
        const n = Math.max(1, Math.min(Math.round(target - alive), a + Math.floor(Math.random() * (b - a + 1))));
        const type = this.pickType(r), at = this.spawnPoint();
        const spread = 26 + n * 5;
        for (let i = 0; i < n; i++) {
          const kind = i > 0 && Math.random() < 0.3 ? this.pickType(r) : type;
          this.addMark(kind, at.x + rand(-spread, spread), at.y + rand(-spread, spread), {delay: SPAWN.telegraph + i * 0.03});
        }
      }
    }
    // Procesiones de la Compaña a partir de la tercera ronda.
    this.procT -= dt;
    if (this.procT <= 0 && this.timeLeft > 6 && !(this.boss && this.boss.hp > 0)) {
      this.procT = rand(14, 20) - Math.min(6, r * 0.3);
      this.spawnProcession(r);
    }
    const elapsed = this.roundClock / Math.max(1, this.roundLength);
    if (!this.hordeDone && elapsed > 0.42) { this.hordeDone = true; this.spawnHorde(r); }
    if (!this.eliteDone && elapsed > 0.22) { this.eliteDone = true; this.spawnElite(ELITE_ROUNDS[r]); }
    // Por dónde suena la procesión más cercana.
    let near = 0, pan = 0;
    for (const e of this.enemies) {
      if (!e.proc || e.hp <= 0) continue;
      const d = Math.hypot(e.x - this.player.x, e.y - this.player.y), k = clamp(1 - d / 900, 0, 1);
      if (k > near) { near = k; pan = clamp((e.x - this.player.x) / 600, -1, 1); }
    }
    this.processionNear = near; this.processionPan = pan;
  },

  fromMark(m) {
    if (m.type === 'elite') { this.makeElite(m.opts.id, m.x, m.y); return; }
    if (m.type === 'guia') { this.makeBoss(m.x, m.y); return; }
    const e = this.spawn(m.type, m.x, m.y, m.opts.always);
    if (!e) return;
    e.rising = 0.32;
    if (m.opts.summoned) e.summoned = true;
    if (m.opts.proc) Object.assign(e, m.opts.proc);
    for (let i = 0; i < 5; i++) this.particle({x: m.x + rand(-10, 10), y: m.y + rand(-4, 4), vx: rand(-40, 40), vy: rand(-70, -20), life: 0.4, size: 2, color: '#9cc8ff', glow: true});
  },

  /* Una fila de hermanos que cruza el atrio de lado a lado. No se paran a mirarte. */
  spawnProcession(r) {
    const n = Math.min(10, 4 + Math.floor(r / 3));
    const side = pick(['n', 's', 'w', 'e']);
    const p = this.player;
    let x, y, dx, dy;
    if (side === 'w' || side === 'e') {
      dx = side === 'w' ? 1 : -1; dy = 0;
      x = side === 'w' ? ARENA.left + 20 : ARENA.right - 20;
      y = clamp(p.y + rand(-120, 120), ARENA.top + 60, ARENA.bottom - 40);
    } else {
      dy = side === 'n' ? 1 : -1; dx = 0;
      y = side === 'n' ? ARENA.top + 30 : ARENA.bottom - 20;
      x = clamp(p.x + rand(-160, 160), ARENA.left + 60, ARENA.right - 60);
    }
    const heading = Math.atan2(dy, dx);
    for (let i = 0; i < n; i++) {
      this.addMark('hermano', x, y, {delay: 1.1 + i * 0.42, always: true, proc: {proc: true, heading}});
    }
    this.marks.push({type: 'arrow', x, y, t: 1.2, total: 1.2, a: heading, opts: {}, seed: 0});
    this.audio.sfx('procesion', {pan: clamp((x - p.x) / 600, -1, 1)});
  },

  spawnHorde(r) {
    const p = this.player, n = Math.min(28, 12 + r);
    const R = 230;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU;
      this.addMark(r > 10 && i % 3 === 0 ? 'trasno' : 'anima', p.x + Math.cos(a) * R, p.y + Math.sin(a) * R * 0.85, {delay: 1.1, always: true, summoned: false});
    }
    this.banner(VIGIL_TEXT.horde[0], VIGIL_TEXT.horde[1], 'elite');
    this.audio.sfx('horda');
  },

  spawnElite(id) {
    if (!id || !ELITE[id]) return;
    const count = this.dangerMul().elites > 1.3 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const at = this.spawnPoint(300);
      this.addMark('elite', at.x, at.y, {delay: 1.6, id});
    }
    this.banner(ELITES[id].name, ELITES[id].epitaph, 'elite');
    this.audio.sfx('difunto');
    this.hooks.onDiscover?.({kind: 'elite', id});
  },

  makeElite(id, x, y) {
    const plan = ELITE[id];
    const e = this.spawn(plan.type, x, y, true);
    if (!e) return null;
    const dm = this.dangerMul();
    e.elite = id;
    e.hp = e.maxHp = e.maxHp * plan.hp * dm.elites;
    e.damage *= plan.damage;
    e.speed *= plan.speed;
    e.size = plan.size;
    e.r = ENEMIES[plan.type].r * plan.size * 0.85;
    e.value = 12;
    e.cd = 2.5;
    e.rising = 0.5;
    this.eliteAlive = e;
    this.rings.push({x, y, r: 10, max: 160, life: 0.7, total: 0.7, color: '#ff8a6a', width: 3, light: 220});
    if (this.options.shake) this.shake = Math.max(this.shake, 6);
    return e;
  },

  spawnBoss() {
    const at = {x: 0, y: ARENA.top + 120};
    this.addMark('guia', at.x, at.y, {delay: 1.8});
    this.banner(BOSS.name, BOSS.title, 'boss');
    this.audio.sfx('guia');
  },

  makeBoss(x, y) {
    const e = this.spawn('guia', x, y, true);
    if (!e) return;
    const dm = this.dangerMul();
    e.hp = e.maxHp = e.maxHp * dm.hp;
    e.attackT = 3; e.attack = 0; e.rage = false;
    this.boss = e;
    this.run.bossAt = this.roundClock;
    this.hooks.onDiscover?.({kind: 'creature', id: 'guia'});
    this.bark('boss', {priority: 3, delay: 0.8});
    this.rings.push({x, y, r: 10, max: 300, life: 1, total: 1, color: '#fff1bd', width: 4, light: 360});
    if (this.options.shake) this.shake = Math.max(this.shake, 10);
    this.zoomPunch = 0.06;
  },

  /* Cuánto llueve y cuánto sopla ahora mismo, de 0 a 1. */
  weatherLook() {
    if (this.state === 'ready') return {rain: 0.25, wind: 0.12, a: 0.4};
    const h = clockAt(this.run.round, 1 - this.timeLeft / Math.max(1, this.roundLength)) / 60;
    let rain = h < 1 ? 0 : h < 2 ? (h - 1) * 0.5 : h < 4.2 ? 0.5 + Math.min(0.5, (h - 2) * 0.5) : Math.max(0, 1 - (h - 4.2) * 0.9);
    if (this.state === 'dawn' || (this.state === 'ended' && this.lastVictory)) rain = 0;
    return {rain, wind: 0.1 + 0.06 * Math.sin(this.clock * 0.3), a: 0.4};
  }
};
