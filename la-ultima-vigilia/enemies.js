/*
 * Lo que viene de noche: cómo aparece, cómo se mueve y cómo ataca cada criatura.
 */
import { TAU, clamp, rand, lerp } from './util.js';
import { ENEMIES, MAX_ENEMIES } from './balance.js';

export const enemyMethods = {
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
  },

  buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const k = (Math.floor(e.x / 48) + 32768) * 65536 + (Math.floor(e.y / 48) + 32768);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(e);
    }
  },

  queryGrid(x, y, r) {
    const out = [];
    const x0 = Math.floor((x - r) / 48), x1 = Math.floor((x + r) / 48), y0 = Math.floor((y - r) / 48), y1 = Math.floor((y + r) / 48);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.grid.get((cx + 32768) * 65536 + (cy + 32768));
      if (a) for (const e of a) out.push(e);
    }
    return out;
  },

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
  },

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
  },
};
