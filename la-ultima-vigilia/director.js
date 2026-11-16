/*
 * La noche manda: qué pasa a cada hora y cuánta Compaña viene.
 * Cada hora es un acto con su carácter (ACTS, en balance.js): a la una salen
 * las procesiones, a las dos sube la marea, a las tres sopla el viento de las
 * ánimas y a las cuatro la luz alcanza menos.
 */
import { TAU, rand, lerp, pick, clamp } from './util.js';
import { NIGHT, HOUR, MAX_ENEMIES, ACTS, ELITE_PLAN, ELITE, ENEMIES, ROADS, COFFIN, WORLD, SCALING, PROCESSION, PACE } from './balance.js';
import { HOURS, ELITES, VIGIL_TEXT } from './story.js';

export const directorMethods = {
  resetDirector() {
    this.pools = []; this.timers = [];
    this.elitesDone = 0; this.eliteAlive = null; this.processions = 0;
    this.gustT = 0; this.gustA = 0; this.bellT = 0; this.inPool = false;
  },

  /* Algo que tiene que pasar dentro de un rato, en tiempo de juego. */
  later(seconds, fn) { this.timers.push({t: seconds, fn}); },

  updateTimers(dt) {
    if (!this.timers.length) return;
    const due = [];
    for (const timer of this.timers) { timer.t -= dt; if (timer.t <= 0) due.push(timer); }
    this.timers = this.timers.filter(timer => timer.t > 0);
    for (const timer of due) timer.fn();
  },

  act() { return ACTS[Math.min(ACTS.length - 1, Math.floor(this.time / HOUR))]; },

  onHour(h) {
    this.audio.sfx('hora', {count: h});
    this.bellT = h * 2.3 + 1.5;
    this.flameDim = Math.min(this.flameDim, 0.7);
    this.banner(HOURS[h].name, HOURS[h].mood);
    this.bark('hour' + h, {delay: 1.2, priority: 2});
    const act = ACTS[h];
    if (h === 3) {
      // La hora de las ánimas: vienen de todas partes.
      for (let i = 0; i < 16; i++) {
        const e = this.spawn('anima');
        if (!e) break;
        const a = i / 16 * TAU, r = Math.max(this.width, this.height) * 0.65;
        e.x = this.player.x + Math.cos(a) * r; e.y = this.player.y + Math.sin(a) * r;
      }
    }
    if (act.gust) this.later(3.2, () => this.gust(act.gust));
    if (act.processions) this.t.procession = Math.min(this.t.procession, 7);
    if (act.tide) this.t.tide = 5;
  },

  stopClock() {
    this.phase = 'stopped';
    this.time = NIGHT - 1;
    this.stoppedFor = 0;
    this.audio.sfx('reloj');
    this.banner(VIGIL_TEXT.stopped[0], VIGIL_TEXT.stopped[1]);
    this.bark('stopped', {priority: 3, delay: 0.8});
  },

  /* Cuántas criaturas quiere la noche en este momento. */
  targetPopulation() {
    if (this.boss && this.boss.hp > 0) return ACTS[5].pop[0];
    const h = Math.min(4, Math.floor(this.time / HOUR)), [from, to] = ACTS[h].pop;
    return Math.min(MAX_ENEMIES, lerp(from, to, (this.time - h * HOUR) / HOUR));
  },

  spawning(dt) {
    if (this.phase === 'rush') return;
    const act = this.act(), boss = !!this.boss;
    this.t.spawn -= dt;
    if (this.t.spawn <= 0) {
      let alive = 0;
      for (const e of this.enemies) if (!e.dissolve && !e.summoned && !e.proc) alive++;
      const deficit = this.targetPopulation() - alive;
      if (deficit > 0) {
        const count = Math.min(PACE.spawnBatch, Math.ceil(deficit / PACE.spawnDeficit));
        for (let i = 0; i < count; i++) if (!this.spawn()) break;
        this.t.spawn = deficit > 30 ? PACE.refillFast : PACE.refillNormal;
      } else this.t.spawn = 0.5;
    }
    if (act.processions && !boss) {
      this.t.procession -= dt;
      if (this.t.procession <= 0) {
        this.t.procession = rand(act.processions[0], act.processions[1]);
        // De madrugada entran por dos caminos a la vez: no se puede estar en los dos.
        const roads = [...ROADS].sort(() => Math.random() - 0.5).slice(0, act.roads || 1);
        for (const road of roads) this.spawnProcession(road, roads.length > 1 ? -1 : 0);
      }
    }
    this.t.swarm -= dt;
    if (this.t.swarm <= 0 && !boss) {
      this.t.swarm = rand(...PACE.swarmDelay);
      const [min, max] = PACE.swarmSize;
      this.spawnSwarm(min + Math.floor(Math.random() * (max - min + 1)));
    }
    const plan = ELITE_PLAN[this.elitesDone];
    if (plan && this.time >= plan.at && !boss) { this.elitesDone++; this.spawnElite(plan); }
    if (act.tide && !boss) {
      this.t.tide -= dt;
      if (this.t.tide <= 0) {
        this.t.tide = rand(act.tide[0], act.tide[1]);
        const p = this.player, mv = this.lastMove;
        this.spawnPool(p.x + mv.x * 90 + rand(-80, 80), p.y + mv.y * 90 + rand(-70, 70));
      }
    }
  },

  /* La procesión entra por uno de los cuatro caminos y va derecha a los cirios. */
  spawnProcession(road = pick(ROADS), extra = 0) {
    const n = Math.max(3, Math.min(PROCESSION.max, PROCESSION.base + PROCESSION.perHour * Math.floor(this.time / HOUR) + extra));
    let prev = null;
    for (let i = 0; i < n; i++) {
      const e = this.spawn('hermano', {x: road.x + road.dx * i * 28, y: road.y + road.dy * i * 28}, true);
      e.proc = true;
      e.hp = e.maxHp = e.maxHp * PROCESSION.hp;
      e.speed = PROCESSION.speed * SCALING.speed(this.time);
      e.heading = Math.atan2(-road.dy, -road.dx);
      if (prev) { e.leader = prev; prev.follower = e; }
      prev = e;
    }
    this.processions++;
    this.audio.sfx('procesion', {pan: clamp((road.x - this.player.x) / 900, -1, 1)});
    // La primera vez, la noche avisa de a qué vienen.
    if (this.processions === 1) this.banner(VIGIL_TEXT.firstProcession[0], VIGIL_TEXT.firstProcession[1], 'vigil');
  },

  spawnSwarm(n) {
    const a = Math.random() * TAU, r = Math.max(this.width, this.height) * 0.6;
    const cx = this.player.x + Math.cos(a) * r, cy = this.player.y + Math.sin(a) * r;
    for (let i = 0; i < n; i++) this.spawn('anima', {x: cx + rand(-50, 50), y: cy + rand(-50, 50)});
  },

  /* La cabeza de la procesión más cercana al velatorio, si viene alguna. */
  processionHead() {
    let head = null, best = Infinity;
    for (const e of this.enemies) {
      if (!e.proc || e.hp <= 0 || e.dissolve || (e.leader && e.leader.hp > 0)) continue;
      const d = Math.hypot(e.x - COFFIN.x, e.y - COFFIN.y);
      if (d < best) { best = d; head = e; }
    }
    return head;
  },

  /* Un difunto con nombre: aguanta mucho más y deja caer su recordatorio. */
  spawnElite(plan) {
    const road = plan.id === 'sobra' ? pick(ROADS) : null;
    const e = this.spawn(plan.type, road ? {x: road.x, y: road.y} : undefined, true);
    e.elite = plan.id;
    e.hp = e.maxHp = e.maxHp * ELITE.hp;
    e.damage *= ELITE.damage; e.speed *= ELITE.speed;
    e.r = ENEMIES[plan.type].r * 1.35; e.size = ELITE.size; e.value = ELITE.light;
    if (road) { e.proc = true; e.heading = Math.atan2(-road.dy, -road.dx); e.speed = PROCESSION.speed * 1.15 * SCALING.speed(this.time); }
    if (plan.id === 'peto') {
      // El ánima del peto no viene sola.
      for (let i = 0; i < 6; i++) this.spawn('anima', {x: e.x + Math.cos(i / 6 * TAU) * 46, y: e.y + Math.sin(i / 6 * TAU) * 46});
    }
    this.eliteAlive = e;
    this.hooks.onDiscover?.({kind: 'elite', id: plan.id});
    this.banner(ELITES[plan.id].name, ELITES[plan.id].epitaph, 'elite');
    this.audio.sfx('difunto');
    return e;
  },

  /* A las tres, una racha de viento apaga cirios. Nunca el último. */
  gust(count) {
    this.gustT = 2.8; this.gustA = rand(0, TAU);
    this.flameDim = 0.4;
    this.audio.sfx('racha');
    const lit = this.cirios.filter(c => c.lit).sort(() => Math.random() - 0.5);
    const n = Math.min(count, Math.max(0, lit.length - 1));
    for (let i = 0; i < n; i++) this.later(0.6 + i * 0.5, () => this.snuffCirio(lit[i]));
    if (n > 0) this.later(1.2, () => this.banner(VIGIL_TEXT.gust[0], VIGIL_TEXT.gust[1], 'vigil'));
  },

  /* Cuánto llueve y cuánto sopla ahora mismo, de 0 a 1. El orballo llega con la marea y se va antes del alba. */
  weatherLook() {
    const t = this.time, gust = this.gustT > 0 ? Math.min(1, this.gustT) : 0;
    let rain = 0.2;
    if (this.state !== 'ready') {
      rain = t < 100 ? 0 : t < 200 ? (t - 100) / 100 * 0.45 : t < 400 ? 1 : t < 520 ? 1 - (t - 400) / 120 : 0;
      if (this.state === 'dawn' || this.state === 'ended') rain = 0;
    }
    return {rain, wind: Math.max(gust, 0.08 + 0.06 * Math.sin(this.clock * 0.3)), a: this.gustT > 0 ? this.gustA : 0.4};
  },

  /* Charcos de la marea: frenan a quien vela y de algunos sale un ahogado. */
  spawnPool(x, y, r = rand(44, 62), rise = true) {
    if (this.pools.length >= 8) this.pools.shift();
    x = clamp(x, WORLD.left + 70, WORLD.right - 70); y = clamp(y, WORLD.top + 80, WORLD.bottom - 60);
    // Nunca encima del ataúd: ahí se descansa.
    const dx = x - COFFIN.x, dy = y - COFFIN.y, d = Math.hypot(dx, dy);
    if (d < 150) { const a = d > 1 ? Math.atan2(dy, dx) : rand(0, TAU); x = COFFIN.x + Math.cos(a) * 150; y = COFFIN.y + Math.sin(a) * 150; }
    this.pools.push({x, y, r, t: 0, life: 16, rise, done: false, seed: Math.random() * 10});
    this.audio.sfx('charco', {pan: clamp((x - this.player.x) / this.width, -1, 1)});
  },

  updatePools(dt) {
    const p = this.player;
    this.inPool = false;
    for (const q of this.pools) {
      q.t += dt;
      if (q.rise && !q.done && q.t > 1.6) {
        q.done = true;
        const e = this.spawn('ahogado', {x: q.x, y: q.y});
        if (e) {
          e.rising = 0.7;
          for (let i = 0; i < 10; i++) this.particle({x: q.x + rand(-14, 14), y: q.y, vx: rand(-70, 70), vy: rand(-150, -40), life: 0.6, size: 2, color: '#7fb3c4', grav: 420});
          this.audio.sfx('salpica', {pan: clamp((q.x - p.x) / this.width, -1, 1)});
        }
      }
      if (q.t > 1 && q.t < q.life - 1 && ((p.x - q.x) / q.r) ** 2 + ((p.y + 8 - q.y) / (q.r * 0.7)) ** 2 < 1) this.inPool = true;
    }
    this.pools = this.pools.filter(q => q.t < q.life);
  }
};
