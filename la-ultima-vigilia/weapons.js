/*
 * Las armas atacan solas. Aquí también vive el daño: quién hiere a quién y cuánto.
 */
import { TAU, clamp, rand, pick, lerp } from './util.js';
import { ENEMIES } from './balance.js';
import { ATTACK_PALETTE } from './art.js';
import { AMPARO, BARKS } from './story.js';

export const weaponMethods = {
  attackPose(kind, a) {
    const total = kind === 'sal' ? 0.24 : 0.18;
    this.player.attack = {kind, a, life: total, total};
    if (!this.player.moving && Math.abs(Math.cos(a)) > 0.15) this.player.face = Math.cos(a) < 0 ? -1 : 1;
  },

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
  },

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
          const tone = this.character === 'matilde' ? 'sacred' : 'ember';
          const origin = {x: p.x + Math.cos(aim) * 12, y: p.y - 8 + Math.sin(aim) * 8};
          this.attackPose('chispa', aim);
          this.combatFx.emit('cast', origin.x, origin.y, {a: aim, tone, level: m.chispas});
          for (let i = 0; i < count; i++) {
            const a = aim + (i - (count - 1) / 2) * 0.13;
            this.shots.push({kind: 'chispa', ...origin, vx: Math.cos(a) * 400, vy: Math.sin(a) * 400, a, life: 1.3, total: 1.3, trail: [], tone, r: 5, dmg, pierce: m.chispas >= 3 ? 2 : 1, knock: 70, hit: new Set()});
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
          const origin = {x: p.x + Math.cos(aim) * 12, y: p.y - 4 + Math.sin(aim) * 8};
          this.attackPose('sal', aim);
          this.combatFx.emit('blast', origin.x, origin.y, {a: aim, tone: 'salt', level: m.sal});
          for (let i = 0; i < count; i++) {
            const a = aim + (i - (count - 1) / 2) * (0.62 / Math.max(1, count - 1)) + rand(-0.04, 0.04);
            const sp = rand(400, 470);
            const life = rand(0.44, 0.54);
            this.shots.push({kind: 'sal', ...origin, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a, life, total: life, trail: [], tone: 'salt', r: 4, dmg, pierce: m.sal >= 4 ? 2 : 1, knock: 260, hit: new Set()});
          }
          for (let i = 0; i < 6; i++) this.particle({x: p.x + Math.cos(aim) * 16, y: p.y - 4 + Math.sin(aim) * 10, vx: Math.cos(aim + rand(-0.5, 0.5)) * rand(80, 200), vy: Math.sin(aim + rand(-0.5, 0.5)) * rand(80, 200), life: 0.25, size: 2, color: '#fff6e0', glow: true});
          this.audio.sfx('sal', {pan: (target.x - p.x) / this.width});
          if (this.options.shake) this.shake = Math.max(this.shake, 1.5);
        } else this.t.sal = 0.1;
      }
    }
    if (m.campana) {
      this.t.campana -= dt;
      if (this.t.campana <= 0) {
        this.t.campana = Math.max(2.2, 6.2 - 0.75 * m.campana) * st.cadence;
        const R = 112 + 22 * m.campana, dmg = 26 + 12 * m.campana;
        this.combatFx.emit('bell', p.x, p.y, {radius: R, tone: 'sacred', level: m.campana});
        for (const e of this.enemies) {
          if (e.hp <= 0 || e.dissolve) continue;
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < R + e.r) this.hurt(e, dmg, {knock: 300, from: p, fx: 'sacred'});
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
          if (Math.hypot(e.x - bx, e.y - by) < e.r + 8) {
            this.hurt(e, dmg, {knock: 120, from: {x: bx, y: by}, fx: 'sacred'});
            this.combatFx.emit('bead', bx, by, {a, tone: 'sacred'});
            e.beadCd = 0.45;
          }
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
        if (d < t.r + 5) {
          this.hurt(t, 9 + 4 * m.polillas, {knock: 40, from: moth, fx: 'sacred'});
          this.combatFx.emit('moth', moth.x, moth.y, {a: Math.atan2(dy, dx), tone: 'sacred'});
          moth.state = 'back'; moth.cd = 0.75;
        }
      } else {
        const dx = p.x - moth.x, dy = p.y - 18 - moth.y, d = Math.hypot(dx, dy) || 1;
        moth.x += dx / d * 300 * dt; moth.y += dy / d * 300 * dt;
        if (d < 24) moth.state = 'orbit';
      }
    }
  },

  lightRadius() {
    const p = this.player, hpRatio = clamp(p.hp / this.st.maxHp, 0, 1);
    const flicker = 1 + Math.sin(this.clock * 7.3) * 0.012 + Math.sin(this.clock * 17.9) * 0.01;
    let r = this.st.light * (0.72 + 0.28 * hpRatio) * (1 - 0.14 * p.dip) * flicker;
    if (this.state === 'dying') r *= Math.max(0, 1 - this.dyingT / 1.7);
    return r;
  },

  hurt(e, amount, {knock = 80, from = this.player, silent = false, fx = null} = {}) {
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
      if (fx) {
        const a = Math.atan2(e.y - from.y, e.x - from.x);
        this.combatFx.emit('impact', e.x - Math.cos(a) * e.r * 0.35, e.y - 4 - Math.sin(a) * e.r * 0.35, {a, tone: fx, radius: crit ? 28 : 18});
      }
      this.audio.sfx('golpe', {pan: (e.x - this.player.x) / this.width});
      const color = {anima: '#9cc8ff', ahogado: '#7fb3c4', espantajo: '#d6b466', curuxa: '#c9b28a'}[e.type] || '#c9c2b8';
      for (let i = 0; i < 2; i++) this.particle({x: e.x, y: e.y - 4, vx: rand(-70, 70), vy: rand(-80, 20), life: 0.3, size: 2, color, grav: 260});
    }
    if (crit) this.particle({x: e.x, y: e.y - e.r, vx: 0, vy: -30, life: 0.35, size: 4, color: '#fff1bd', glow: true});
    if (this.options.numbers && !silent) this.numbers.push({x: e.x, y: e.y - e.r - 6, text: String(Math.round(dmg)), color: crit ? '#ffe2a0' : '#d8d2c4', life: 0.7});
    if (e.type === 'guia') this.bossHit(e);
    if (e.hp <= 0) this.kill(e);
  },

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
  },

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
  },

  updateShots(dt) {
    for (const s of this.shots) {
      // Muestreo a 60 Hz y caducidad real, también en pantallas de alta frecuencia.
      s.trail ??= [];
      for (const point of s.trail) point.age = (point.age || 0) + dt;
      s.trailCd = (s.trailCd || 0) - dt;
      if (dt > 0 && s.trailCd <= 0) {
        s.trail.push({x: s.x, y: s.y, age: 0});
        s.trailCd = Math.max(0, s.trailCd + 1 / 60);
      }
      s.trail = s.trail.filter(point => point.age < 0.12).slice(-8);
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      s.emberCd = (s.emberCd || 0) - dt;
      if (s.kind === 'chispa' && s.emberCd <= 0) {
        s.emberCd = 0.035;
        this.particle({x: s.x, y: s.y, vx: -s.vx * 0.06 + rand(-12, 12), vy: -s.vy * 0.06 + rand(-12, 12), life: 0.22, size: 2, color: (ATTACK_PALETTE[s.tone] || ATTACK_PALETTE.ember).edge, glow: true});
      }
      for (const e of this.queryGrid(s.x, s.y, 36)) {
        if (e.hp <= 0 || e.dissolve || s.hit.has(e.id)) continue;
        const rr = e.r + s.r;
        if ((e.x - s.x) ** 2 + (e.y - 4 - s.y) ** 2 < rr * rr) {
          s.hit.add(e.id);
          this.hurt(e, s.dmg, {knock: s.knock, from: {x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05}, fx: s.tone || (s.kind === 'sal' ? 'salt' : 'ember')});
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
  },
};
