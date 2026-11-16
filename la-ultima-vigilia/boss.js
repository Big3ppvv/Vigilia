/*
 * La Guía: va directa al ataúd. Allí apaga los cirios uno a uno y, a oscuras,
 * se lleva a Amparo. Cada golpe fuerte la aparta y da tiempo a encenderlos.
 */
import { TAU, rand } from './util.js';
import { COFFIN, VIGIL } from './balance.js';
import { BOSS } from './story.js';

export const bossMethods = {
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
    this.flameDim = 0.45;
  },

  behaveBoss(e, dx, dy, len, dt, slow) {
    const p = this.player;
    if (e.stun > 0) { e.stun -= dt; return; }
    const tx = COFFIN.x - e.x, ty = COFFIN.y - e.y, td = Math.hypot(tx, ty) || 1;
    const speed = e.speed * (this.dawnBreaks ? 0.5 : 1) * (e.hp < e.maxHp * 0.5 ? 1.15 : 1);
    if (td > 62) { e.x += tx / td * speed * dt * (slow > 0.9 ? 1 : 0.8); e.y += ty / td * speed * dt * (slow > 0.9 ? 1 : 0.8); }
    e.flip = tx < 0;
    // Junto al ataúd apaga los cirios uno a uno: solo a oscuras puede llevársela.
    e.atCoffin = td <= 68;
    const cirio = e.atCoffin ? this.nearestCirio(e, true) : null;
    if (e.atCoffin && !this.bossReached) { this.bossReached = true; this.say(BOSS.reach, 'Carmela', {priority: 3}); }
    if (cirio && !e.lulled) {
      e.snuffing = cirio;
      cirio.snuffing = true;
      cirio.snuff += dt / (e.hp < e.maxHp * 0.5 ? VIGIL.bossSnuffRage : VIGIL.bossSnuff);
      if (Math.random() < dt * 20) {
        const k = Math.random();
        this.particle({x: e.x + (cirio.x - e.x) * k, y: e.y - 30 + (cirio.y - 58 - e.y + 30) * k, vx: rand(-10, 10), vy: rand(-20, 0), life: 0.4, size: 2, color: '#9fb4d8', glow: true});
      }
      if (cirio.snuff >= 1) {
        this.snuffCirio(cirio);
        this.rings.push({x: e.x, y: e.y - 20, r: 10, max: 70, life: 0.4, total: 0.4, color: '#9fb4d8', width: 2});
      }
    } else e.snuffing = null;
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
  },

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
  },

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
    // Con la Guía libre, los cirios vuelven a arder solos.
    this.cirios.forEach((c, i) => this.later(0.4 + i * 0.35, () => this.lightCirio(c)));
    this.pools = [];
    this.marks = [];
    this.enemyShots = [];
    this.hazards = [];
    this.freedAt = this.phase === 'stopped' ? `parado+${Math.round(this.stoppedFor)}` : Math.round(this.time);
    this.phase = 'rush';
    this.rushFrom = this.time;
    this.player.inv = 99;
  },

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
  },
};
