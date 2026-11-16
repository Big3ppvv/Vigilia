/*
 * El velatorio: los cuatro cirios, el alma de Amparo y el arrullo.
 * La luz de los cirios es la que te cura junto al ataúd y la que te levanta
 * si caes; por eso la Compaña viene en procesión a apagarlos.
 */
import { TAU, rand, pick, lerp } from './util.js';
import { COFFIN, CIRIOS, VIGIL } from './balance.js';
import { CHARACTERS, AMPARO, VIGIL_TEXT } from './story.js';

export const vigilMethods = {
  resetVigil() {
    this.cirios = CIRIOS.map((c, i) => ({i, x: c.x, y: c.y, lit: true, relight: 0, snuff: 0, snuffing: false, flare: 0}));
    this.soul = 0; this.revives = 0; this.relit = 0; this.snuffed = 0;
    this.lull = 0; this.lullCd = VIGIL.lullFirst; this.lullR = 0; this.lullUsed = 0;
    this.flameDim = 1; this.relighting = null;
  },

  litCount() {
    let n = 0;
    for (const c of this.cirios) if (c.lit) n++;
    return n;
  },

  nearestCirio(from, lit = true) {
    let best = null, bd = Infinity;
    for (const c of this.cirios) {
      if (c.lit !== lit) continue;
      const d = (c.x - from.x) ** 2 + (c.y - from.y) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },

  snuffCirio(c) {
    if (!c.lit) return;
    c.lit = false; c.relight = 0; c.snuff = 0; c.flare = 0;
    this.snuffed++;
    for (let i = 0; i < 7; i++) this.particle({x: c.x + rand(-2, 2), y: c.y - 58, vx: rand(-8, 8), vy: rand(-34, -14), life: rand(0.8, 1.5), size: 2, color: i % 2 ? '#6a6f78' : '#474b54'});
    this.audio.sfx('cirioFuera', {pan: (c.x - this.player.x) / this.width});
    if (this.state === 'running') {
      if (this.litCount() === 0) {
        this.banner(VIGIL_TEXT.allOut[0], VIGIL_TEXT.allOut[1], 'vigil');
        this.bark('all_out', {once: false, priority: 3});
      } else {
        // La primera vez que se apaga uno, la noche dice qué hacer.
        if (this.snuffed === 1) this.banner(VIGIL_TEXT.firstOut[0], VIGIL_TEXT.firstOut[1], 'vigil');
        this.bark('cirio_out', {priority: 2});
      }
    }
    this.emitStats();
  },

  lightCirio(c, quiet = false) {
    if (c.lit) return;
    c.lit = true; c.relight = 0; c.snuff = 0; c.flare = 1;
    this.relit++;
    for (let i = 0; i < 10; i++) {
      const a = rand(0, TAU);
      this.particle({x: c.x, y: c.y - 60, vx: Math.cos(a) * rand(20, 80), vy: Math.sin(a) * rand(20, 80) - 30, life: rand(0.3, 0.6), size: 2, color: i % 3 ? '#ffd59a' : '#fff1bd', glow: true});
    }
    this.rings.push({x: c.x, y: c.y - 40, r: 6, max: 70, life: 0.5, total: 0.5, color: '#ffd59a', width: 2, light: 150});
    if (!quiet) this.audio.sfx('cirioPrende', {pan: (c.x - this.player.x) / this.width});
    this.emitStats();
  },

  /* Todo lo que cura pasa por aquí: la cocina de Amparo lo hace rendir más. */
  heal(amount) {
    const p = this.player;
    p.hp = Math.min(this.st.maxHp, p.hp + amount * this.st.heal);
  },

  updateVigil(dt) {
    const p = this.player, st = this.st, V = VIGIL;
    this.lull = Math.max(0, this.lull - dt);
    this.lullCd = Math.max(0, this.lullCd - dt);
    this.flameDim = Math.min(1, this.flameDim + dt * 0.1);

    // Encender: basta con quedarse un momento junto al cirio apagado.
    let target = null, best = V.reach;
    for (const c of this.cirios) {
      c.flare = Math.max(0, c.flare - dt * 1.4);
      if (!c.snuffing) c.snuff = Math.max(0, c.snuff - dt);
      c.snuffing = false;
      if (c.lit) continue;
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < best) { best = d; target = c; }
    }
    for (const c of this.cirios) if (!c.lit && c !== target) c.relight = Math.max(0, c.relight - dt * 1.2);
    if (target && this.dashTime <= 0) {
      if (target.relight === 0) this.audio.sfx('cerilla');
      target.relight += dt / (V.relight * (CHARACTERS[this.character].relight || 1));
      if (Math.random() < dt * 16) this.particle({x: target.x + rand(-3, 3), y: target.y - 58, vx: rand(-30, 30), vy: rand(-50, -10), life: 0.3, size: 2, color: '#ffd59a', glow: true});
      if (target.relight >= 1) this.lightCirio(target);
    }
    this.relighting = target && !target.lit ? target : null;

    // Junto a Amparo se descansa, más cuantos más cirios ardan.
    const lit = this.litCount();
    if (lit > 0 && p.hp < st.maxHp && Math.hypot(p.x - COFFIN.x, p.y - COFFIN.y) < V.healRadius) {
      this.heal((V.healBase + V.healPerCirio * lit) * dt);
      this.t.regenFx -= dt;
      if (this.t.regenFx <= 0) { this.t.regenFx = 0.25; this.particle({x: p.x + rand(-10, 10), y: p.y + rand(-6, 10), vx: 0, vy: -24, life: 0.9, size: 2, color: '#ffd59a', glow: true}); }
    }

    // El alma: a oscuras se la llevan. Con la Guía junto al ataúd, más deprisa.
    const b = this.boss && this.boss.hp > 0 ? this.boss : null;
    if (lit === 0 && this.phase !== 'rush') {
      const taking = b && b.atCoffin && b.stun <= 0;
      this.soul = Math.min(1, this.soul + dt / (taking ? V.soulRiseBoss : V.soulRise));
      if (Math.random() < dt * 24) {
        const to = taking ? b : {x: COFFIN.x + rand(-60, 60), y: COFFIN.y - 160};
        this.particle({x: COFFIN.x + rand(-30, 30), y: COFFIN.y + rand(-8, 8), vx: (to.x - COFFIN.x) * 0.6, vy: (to.y - COFFIN.y) * 0.6 - 20, life: 0.9, size: 2, color: '#e8f5ff', glow: true});
      }
      if (this.soul >= 1) this.beginDying('took');
    } else this.soul = Math.max(0, this.soul - dt / V.soulFall);
  },

  /* Si caes y queda algún cirio, su luz te levanta. A cambio, ese cirio se apaga. */
  revive() {
    const p = this.player, c = this.nearestCirio(p, true);
    if (!c) return false;
    p.hp = Math.max(1, Math.round(this.st.maxHp * VIGIL.revive));
    c.lit = false; c.relight = 0; c.snuff = 0; c.flare = 0;
    // La llama del cirio viaja hasta quien vela.
    for (let i = 0; i < 14; i++) {
      const k = i / 14;
      this.particle({x: lerp(c.x, p.x, k), y: lerp(c.y - 58, p.y - 10, k), vx: rand(-14, 14), vy: rand(-26, -8), life: 0.45 + k * 0.5, size: 3, color: i % 2 ? '#ffd59a' : '#fff1bd', glow: true});
    }
    this.snuffed++;
    this.revives++;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > 340) continue;
      const k = (e.type === 'guia' ? 0.08 : e.elite ? 0.4 : 1) * 1500 * (1 - d / 420);
      e.kx += dx / d * k; e.ky += dy / d * k; e.hit = 0.3;
    }
    this.enemyShots = this.enemyShots.filter(s => Math.hypot(s.x - p.x, s.y - p.y) > 340);
    p.inv = 2.6; p.dip = 0;
    this.freeze = 0.2;
    this.flash = this.options.flashes ? 0.7 : 0; this.flashColor = '255,226,170';
    if (this.options.shake) this.shake = 9;
    this.rings.push({x: p.x, y: p.y, r: 14, max: 320, life: 0.8, total: 0.8, color: '#ffe2a0', width: 3, light: 320});
    this.audio.sfx('levanta');
    this.subQueue = this.subQueue.filter(s => s.priority >= 4);
    this.say(pick(AMPARO.revive), AMPARO.name, {italic: true, priority: 4});
    const left = this.litCount();
    this.banner(VIGIL_TEXT.revive[0], left ? VIGIL_TEXT.revive[1] : VIGIL_TEXT.allOut[1], 'vigil');
    this.emitStats();
    return true;
  },

  lullRadius() { return Math.max(250, this.lightRadius() * 1.45); },

  /*
   * El arrullo: quien vela tararea la nana. Lo que le rodea se amansa, las
   * lágrimas se deshacen y los cirios que alcanza vuelven a prender.
   */
  arrullo() {
    if (this.state !== 'running' || this.lullCd > 0 || this.phase === 'rush') return false;
    const p = this.player, R = this.lullRadius();
    this.lull = VIGIL.lullTime; this.lullCd = this.st.lullCd; this.lullR = R; this.lullUsed++;
    this.enemyShots = this.enemyShots.filter(s => {
      if (Math.hypot(s.x - p.x, s.y - p.y) > R) return true;
      this.particle({x: s.x, y: s.y, vx: 0, vy: -30, life: 0.5, size: 3, color: '#e8f5ff', glow: true});
      return false;
    });
    for (const c of this.cirios) if (!c.lit && Math.hypot(c.x - p.x, c.y - p.y) < R) this.lightCirio(c, true);
    this.rings.push({x: p.x, y: p.y, r: 20, max: R, life: 1, total: 1, color: '#f3e3c0', width: 2, light: R * 0.7});
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      this.particle({x: p.x + Math.cos(a) * 26, y: p.y - 8 + Math.sin(a) * 18, vx: Math.cos(a) * 70, vy: Math.sin(a) * 50 - 14, life: 1.1, size: i % 3 ? 2 : 3, color: i % 2 ? '#f3e3c0' : '#ffd59a', glow: true});
    }
    this.audio.sfx('arrullo', {voice: this.character});
    this.bark('arrullo', {priority: 2, delay: 0.4});
    this.emitStats();
    return true;
  }
};
