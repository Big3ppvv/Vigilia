/*
 * Lo que viene de noche: cómo aparece, cómo se mueve y cómo ataca cada
 * criatura. Todo ataque se anuncia antes: una postura, una línea en el suelo
 * o un círculo. La Guía, en la última ronda, también.
 */
import { TAU, clamp, rand, lerp } from './util.js';
import { ENEMIES, MAX_ENEMIES, SCALING, ARENA, PLAYER } from './balance.js';
import { BOSS } from './story.js';

// Equivale a resolver un 25 % del solape a 60 Hz, sin depender de la pantalla.
const SEPARATION_RATE = -Math.log(0.75) * 60;
const CELL = 48;

export const enemyMethods = {
  /* Crea una criatura ya escalada a la ronda y a la dificultad. */
  spawn(type, x, y, always = false) {
    if (this.enemies.length >= MAX_ENEMIES && !always) return null;
    const d = ENEMIES[type];
    if (!d) return null;
    const r = this.run.round, dm = this.dangerMul();
    const hp = type === 'guia' ? d.hp : d.hp * SCALING.hp(r) * dm.hp;
    const valueRaw = d.value * SCALING.value(r);
    const e = {id: ++this.enemyId, type, x, y, hp, maxHp: hp, r: d.r, xp: d.xp,
      speed: d.speed * SCALING.speed(r) * dm.speed * (type === 'guia' ? 1 : rand(0.92, 1.08)),
      damage: d.damage * SCALING.damage(r) * dm.damage,
      value: Math.floor(valueRaw) + (Math.random() < valueRaw % 1 ? 1 : 0),
      flash: 0, squash: 0, kx: 0, ky: 0, burn: 0, burnT: 0, burnTick: 0, slowF: 1, slowT: 0, stun: 0,
      seed: Math.random() * 10, flip: false, mode: 'hunt', modeT: 0, cd: rand(1.2, 3), lock: 0, heading: 0,
      born: this.clock, rising: 0, stolen: 0, hitBy: null};
    this.enemies.push(e);
    if (!this.seen.has(type) && type !== 'guia') {
      this.seen.add(type);
      this.hooks.onDiscover?.({kind: 'creature', id: type});
      this.bark('first_' + type, {priority: 1, delay: 0.6});
    }
    return e;
  },

  buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const k = (Math.floor(e.x / CELL) + 32768) * 65536 + (Math.floor(e.y / CELL) + 32768);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(e);
    }
  },

  queryGrid(x, y, r) {
    const out = [];
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.grid.get((cx + 32768) * 65536 + (cy + 32768));
      if (a) for (const e of a) out.push(e);
    }
    return out;
  },

  /* Cuánto frena todo lo que rodea a la criatura: golpes, gaita, agua, sal, red y brétema. */
  enemySlow(e, dist) {
    if (e.stun > 0 || e.root > 0) return 0;
    let f = e.slowT > 0 ? e.slowF : 1;
    if (e.flash > 0.05) f *= 0.55;
    if (this.sp.slowAura > 0 && dist < 130) f *= 1 - this.sp.slowAura;
    for (const s of this.structures) if (s.kind === 'cruceiro' && Math.hypot(e.x - s.x, e.y - s.y) < 110) f *= 0.6;
    return f;
  },

  updateEnemies(dt) {
    const p = this.player;
    let near = 0;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.squash *= Math.exp(-dt * 14);
      e.slowT = Math.max(0, e.slowT - dt);
      e.stun = Math.max(0, e.stun - dt);
      e.root = Math.max(0, (e.root || 0) - dt);
      if (e.beadCd) for (const k in e.beadCd) e.beadCd[k] = Math.max(0, e.beadCd[k] - dt);
      if (e.dissolve) {
        e.dissolveT -= dt;
        if (Math.random() < 0.3) this.particle({x: e.x + rand(-8, 8), y: e.y + rand(-12, 4), vx: rand(-10, 10), vy: rand(-60, -25), life: 0.7, size: 2, color: '#ffd59a', glow: true});
        if (e.dissolveT <= 0) { e.hp = 0; this.deathFx(e, true); }
        continue;
      }
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.5;
          this.hurt(e, e.burn * 0.5, {knock: 0, silent: true, burnTick: true, by: e.burnBy});
          if (e.hp <= 0) continue;
          this.particle({x: e.x + rand(-6, 6), y: e.y - rand(4, 16), vx: rand(-10, 10), vy: rand(-50, -30), life: 0.5, size: 2, color: '#ff9a4a', glow: true});
        }
      }
      if (e.rising > 0) { e.rising -= dt; continue; }
      const dx = p.x - e.x, dy = p.y - e.y, len = Math.hypot(dx, dy) || 1;
      if (len < 220) near++;
      const slow = this.enemySlow(e, len);
      if (e.type === 'guia') this.behaveBoss(e, dx, dy, len, dt, slow);
      else this.behave(e, dx, dy, len, dt, slow);
      e.x += e.kx * dt; e.y += e.ky * dt;
      const damp = Math.exp(-dt * 10);
      e.kx *= damp; e.ky *= damp;
      if (!e.proc) {
        e.x = clamp(e.x, ARENA.left + e.r * 0.5, ARENA.right - e.r * 0.5);
        e.y = clamp(e.y, ARENA.top + e.r * 0.5, ARENA.bottom - e.r * 0.2);
      } else if (e.x < ARENA.left - 90 || e.x > ARENA.right + 90 || e.y < ARENA.top - 90 || e.y > ARENA.bottom + 90) {
        e.hp = 0; e.gone = true; continue;
      }
      if (len < e.r + PLAYER.radius && e.hp > 0 && !(e.stun > 0)) this.damagePlayer(e.damage, e);
      if (this.state !== 'running') return;
    }
    this.danger = lerp(this.danger, clamp(near / 26, 0, 1), 1 - Math.exp(-dt * 2));
    // Separación: que no se amontonen en un solo bulto.
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.type === 'guia' || e.rising > 0) continue;
      for (const o of this.queryGrid(e.x, e.y, e.r * 2)) {
        if (o === e || o.hp <= 0) continue;
        const dx = e.x - o.x, dy = e.y - o.y, min = (e.r + o.r) * 0.8, d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2), push = (min - d) * (1 - Math.exp(-dt * SEPARATION_RATE)) * (o.type === 'guia' ? 2 : 1);
          e.x += dx / d * push; e.y += dy / d * push;
        }
      }
    }
    this.enemies = this.enemies.filter(e => e.hp > 0);
    this.buildGrid();
  },

  /* Ir hacia (o huir de) quien vela, con un poco de deriva lateral. */
  steer(e, ux, uy, sp, dt, side = 0) {
    e.x += (ux * sp - uy * side) * dt; e.y += (uy * sp + ux * side) * dt;
    if (Math.abs(ux) > 0.1) e.flip = ux < 0;
  },

  behave(e, dx, dy, len, dt, slow) {
    const ux = dx / len, uy = dy / len, sp = e.speed * slow;
    e.cd -= dt;
    switch (e.type) {
      case 'anima':
        this.steer(e, ux, uy, sp, dt, Math.sin(this.clock * 4 + e.seed) * (e.elite ? 60 : 32) * slow);
        if (e.elite && e.cd <= 0) {
          // El ánima del peto: una corona de luz que se abre, y más ánimas.
          e.cd = 3.4;
          const n = 12, off = rand(0, TAU);
          for (let i = 0; i < n; i++) { const a = off + i / n * TAU; this.enemyShot(e.x, e.y - 6, Math.cos(a) * 150, Math.sin(a) * 150, e.damage * 0.8, 'wisp'); }
          for (let i = 0; i < 3; i++) this.addMark('anima', e.x + rand(-60, 60), e.y + rand(-60, 60), {delay: 0.8, summoned: true});
          this.audio.sfx('llanto', {pan: this.panOf(e.x)});
        }
        break;
      case 'hermano':
        if (e.proc) {
          e.x += Math.cos(e.heading) * e.speed * 0.95 * slow * dt; e.y += Math.sin(e.heading) * e.speed * 0.95 * slow * dt;
          e.flip = Math.cos(e.heading) < -0.1;
          break;
        }
        this.steer(e, ux, uy, sp, dt);
        if (e.elite && e.cd <= 0) {
          // El que sobra: siempre trae a los suyos en fila.
          e.cd = 6;
          this.spawnProcession(this.run.round);
          const n = 8;
          for (let i = 0; i < n; i++) { const a = i / n * TAU + this.clock; this.enemyShot(e.x, e.y - 8, Math.cos(a) * 130, Math.sin(a) * 130, e.damage * 0.7, 'vela'); }
        }
        break;
      case 'urco': case 'lobishome': this.charger(e, ux, uy, len, dt, slow); break;
      case 'curuxa': {
        if (e.mode === 'windup') {
          e.modeT -= dt; e.flip = Math.cos(e.lock) < 0;
          if (e.modeT <= 0) { e.mode = 'swoop'; e.modeT = 0.5; this.audio.sfx('chillido', {pan: this.panOf(e.x)}); }
          break;
        }
        if (e.mode === 'swoop') {
          e.modeT -= dt;
          e.x += Math.cos(e.lock) * e.speed * 3.3 * slow * dt; e.y += Math.sin(e.lock) * e.speed * 3.3 * slow * dt;
          if (e.modeT <= 0) { e.mode = 'hunt'; e.cd = rand(2.2, 3.4) * (e.elite ? 0.6 : 1); }
          break;
        }
        // Vuela en círculos a una distancia, con tirones.
        const want = e.elite ? 200 : 165, orbit = Math.sin(this.clock * 1.3 + e.seed) > 0 ? 1 : -1;
        const radial = (len - want) / want;
        this.steer(e, ux * radial, uy * radial, sp, dt, orbit * sp * 0.8);
        if (e.cd <= 0 && len < 320) {
          e.mode = 'windup'; e.modeT = e.elite ? 0.35 : 0.45; e.lock = Math.atan2(dy, dx);
          if (e.elite) for (let i = -2; i <= 2; i++) { const a = e.lock + i * 0.22; this.enemyShot(e.x, e.y, Math.cos(a) * 190, Math.sin(a) * 190, e.damage * 0.7, 'pluma'); }
        }
        break;
      }
      case 'planidera': case 'nubeiro': case 'lavandeira': {
        const keep = e.type === 'lavandeira' ? 270 : e.type === 'nubeiro' ? 240 : 220;
        if (e.mode === 'cast') {
          e.modeT -= dt;
          if (e.modeT <= 0) { e.mode = 'hunt'; this.cast(e, dx, dy); }
          break;
        }
        const dir = len < keep - 40 ? -1 : len > keep + 50 ? 1 : 0;
        this.steer(e, ux * dir, uy * dir, sp, dt, Math.sin(this.clock * 0.8 + e.seed) * sp * 0.5);
        if (Math.abs(ux) > 0.1) e.flip = ux < 0;
        if (e.cd <= 0 && len < 520) { e.mode = 'cast'; e.modeT = e.type === 'lavandeira' ? 0.8 : 0.55; }
        break;
      }
      case 'ahogado':
        this.steer(e, ux, uy, sp, dt);
        if (e.cd <= 0) {
          e.cd = rand(3, 4.5);
          this.areas.push({kind: 'wet', owner: 'enemy', x: e.x, y: e.y + 6, r: e.elite ? 70 : 40, life: e.elite ? 7 : 5, total: e.elite ? 7 : 5, slow: 0.65});
          if (e.elite) {
            const n = 10;
            for (let i = 0; i < n; i++) { const a = i / n * TAU; this.enemyShot(e.x, e.y - 6, Math.cos(a) * 160, Math.sin(a) * 160, e.damage * 0.7, 'agua'); }
            this.audio.sfx('salpica', {pan: this.panOf(e.x)});
          }
        }
        break;
      case 'trasno': {
        // Va a por la cera del suelo y se la come; si no hay, ronda y se mete de golpe.
        let best = null, bd = 520 * 520;
        for (const d of this.drops) {
          if (d.kind !== 'cera' || d.magnet || d.returned) continue;
          const q = (d.x - e.x) ** 2 + (d.y - e.y) ** 2;
          if (q < bd) { bd = q; best = d; }
        }
        if (best) {
          const tx = best.x - e.x, ty = best.y - e.y, tl = Math.hypot(tx, ty) || 1;
          this.steer(e, tx / tl, ty / tl, sp, dt, Math.sin(this.clock * 9 + e.seed) * 40);
          if (tl < 12) { best.got = true; e.stolen += best.v; if (this.limitFx('trasno', 0.2)) this.audio.sfx('trasno', {pan: this.panOf(e.x)}); }
        } else {
          const want = 150, radial = (len - want) / want;
          this.steer(e, ux * radial, uy * radial, sp, dt, (Math.sin(this.clock * 2 + e.seed) > 0 ? 1 : -1) * sp * 0.7);
          if (e.cd <= 0) { e.cd = rand(1.4, 2.6); e.kx += ux * 260; e.ky += uy * 260; }
        }
        break;
      }
      case 'espantajo':
        if (e.mode === 'swing') {
          e.modeT -= dt;
          if (e.modeT <= 0) { e.mode = 'hunt'; e.cd = rand(3.2, 4.4); }
          break;
        }
        this.steer(e, ux, uy, sp, dt);
        if (e.cd <= 0 && len < 170) {
          e.mode = 'swing'; e.modeT = 1.05;
          this.hazards.push({kind: 'swing', x: e.x, y: e.y, r: 96, t: 0.8, total: 0.8, dmg: e.damage * 1.2, owner: e, follow: true});
        }
        break;
      default:
        this.steer(e, ux, uy, sp, dt);
    }
  },

  /* El Urco y el lobishome: se paran, gruñen, y embisten en línea recta. */
  charger(e, ux, uy, len, dt, slow) {
    const wolf = e.type === 'lobishome';
    if (e.mode === 'windup') {
      e.modeT -= dt; e.flip = Math.cos(e.lock) < 0;
      if (e.modeT <= 0) { e.mode = 'lunge'; e.modeT = wolf ? 0.36 : 0.42; this.audio.sfx('gruñido', {pan: this.panOf(e.x)}); }
      return;
    }
    if (e.mode === 'lunge') {
      e.modeT -= dt;
      const k = e.elite ? 4.2 : 3.8;
      e.x += Math.cos(e.lock) * e.speed * k * Math.max(0.3, slow) * dt; e.y += Math.sin(e.lock) * e.speed * k * Math.max(0.3, slow) * dt;
      if (Math.random() < 0.5) this.particle({x: e.x, y: e.y + 10, vx: rand(-20, 20), vy: rand(-20, 0), life: 0.3, size: 3, color: '#2a2a33'});
      if (e.modeT <= 0) {
        e.lunges = (e.lunges || 0) + 1;
        const again = (wolf && e.lunges < 2) || (e.elite && e.lunges < 3);
        if (again) { e.mode = 'windup'; e.modeT = 0.28; e.lock = Math.atan2(this.player.y - e.y, this.player.x - e.x); }
        else { e.mode = 'rest'; e.modeT = 0.55; e.lunges = 0; }
      }
      return;
    }
    if (e.mode === 'rest') { e.modeT -= dt; if (e.modeT <= 0) { e.mode = 'hunt'; e.cd = rand(1.6, 2.8); } return; }
    this.steer(e, ux, uy, e.speed * slow * (len > 240 ? 1 : 0.6), dt);
    if (e.cd <= 0 && len < 250 && slow > 0) {
      e.mode = 'windup'; e.modeT = e.elite ? 0.5 : 0.62;
      e.lock = Math.atan2(uy, ux);
      e.lockLen = e.speed * (e.elite ? 4.2 : 3.8) * (wolf ? 0.36 : 0.42);
    }
  },

  /* Lo que lanzan las que atacan desde lejos. */
  cast(e, dx, dy) {
    const p = this.player;
    if (e.type === 'planidera') {
      const a0 = Math.atan2(dy, dx), n = e.elite ? 5 : 3;
      for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.22; this.enemyShot(e.x, e.y - 8, Math.cos(a) * 165, Math.sin(a) * 165, e.damage, 'lagrima'); }
      e.cd = rand(2.4, 3.2);
      this.audio.sfx('llanto', {pan: this.panOf(e.x)});
    } else if (e.type === 'nubeiro') {
      // El rayo cae donde vas a estar, no donde estás.
      const lead = 0.45;
      const tx = clamp(p.x + p.vx * lead, ARENA.left + 20, ARENA.right - 20), ty = clamp(p.y + p.vy * lead, ARENA.top + 20, ARENA.bottom - 20);
      this.hazards.push({kind: 'rayo', x: tx, y: ty, r: 46, t: 1.05, total: 1.05, dmg: e.damage * 1.6});
      e.cd = rand(3, 4);
    } else if (e.type === 'lavandeira') {
      for (let i = 0; i < 3; i++) { const a = rand(0, TAU); this.addMark('anima', e.x + Math.cos(a) * 46, e.y + Math.sin(a) * 34, {delay: 0.7, summoned: true}); }
      e.cd = rand(4.5, 6);
      this.audio.sfx('lavandeira', {pan: this.panOf(e.x)});
    }
  },

  enemyShot(x, y, vx, vy, dmg, kind = 'lagrima') {
    if (this.enemyShots.length > 220) return;
    this.enemyShots.push({x, y, vx, vy, r: kind === 'vela' ? 6 : 5, dmg, life: 4, kind, a: Math.atan2(vy, vx)});
  },

  /* La Guía: avanza despacio con la cruz y alterna golpes, velas, la Compaña y una carga. */
  behaveBoss(e, dx, dy, len, dt, slow) {
    const ux = dx / len, uy = dy / len;
    const rage = e.hp < e.maxHp * 0.5;
    if (rage && !e.rage) {
      e.rage = true;
      this.banner(BOSS.name, BOSS.rage, 'boss');
      this.audio.sfx('guia');
      if (this.options.shake) this.shake = Math.max(this.shake, 8);
    }
    if (e.mode === 'charge') {
      e.modeT -= dt;
      e.x += Math.cos(e.lock) * e.speed * 4.2 * dt; e.y += Math.sin(e.lock) * e.speed * 4.2 * dt;
      if (Math.random() < 0.6) this.particle({x: e.x + rand(-14, 14), y: e.y + 20, vx: rand(-30, 30), vy: rand(-30, 0), life: 0.4, size: 3, color: '#3a3542'});
      if (e.modeT <= 0) { e.mode = 'hunt'; }
      return;
    }
    if (e.mode === 'windup') {
      e.modeT -= dt;
      if (e.modeT <= 0) { e.mode = 'charge'; e.modeT = 0.62; }
      return;
    }
    this.steer(e, ux, uy, e.speed * Math.max(0.35, slow) * (len > 140 ? 1 : 0.4), dt);
    e.attackT -= dt;
    if (e.attackT > 0) return;
    e.attackT = rage ? 2.1 : 2.9;
    const move = e.attack++ % 4;
    if (move === 0) {
      this.hazards.push({kind: 'cruz', x: e.x, y: e.y + 10, r: rage ? 150 : 128, t: 1.05, total: 1.05, dmg: e.damage * 1.3, owner: e, follow: true});
    } else if (move === 1) {
      const n = rage ? 22 : 15, off = rand(0, TAU);
      for (let ring = 0; ring < (rage ? 2 : 1); ring++) {
        for (let i = 0; i < n; i++) { const a = off + ring * 0.12 + i / n * TAU; this.enemyShot(e.x, e.y - 20, Math.cos(a) * (140 + ring * 40), Math.sin(a) * (140 + ring * 40), e.damage * 0.6, 'vela'); }
      }
      this.audio.sfx('campanilla');
    } else if (move === 2) {
      this.spawnProcession(this.run.round);
      if (rage) this.spawnProcession(this.run.round);
      for (let i = 0; i < 5; i++) this.addMark('anima', e.x + rand(-90, 90), e.y + rand(-60, 60), {delay: 0.9, summoned: true});
    } else {
      e.mode = 'windup'; e.modeT = 0.75; e.lock = Math.atan2(dy, dx);
      e.lockLen = e.speed * 4.2 * 0.62;
    }
  },

  /* Lo que cae del cielo o barre el suelo: rayos, la cruz, el espantajo. Más los proyectiles de las criaturas. */
  updateHazards(dt) {
    const p = this.player;
    for (const h of this.hazards) {
      if (h.follow && h.owner && h.owner.hp > 0) { h.x = h.owner.x; h.y = h.owner.y + (h.kind === 'cruz' ? 10 : 0); }
      h.t -= dt;
      if (h.t <= 0 && !h.done) {
        h.done = true;
        const hit = Math.hypot(p.x - h.x, (p.y - h.y) * 1.15) < h.r + PLAYER.radius * 0.5;
        if (hit) this.damagePlayer(h.dmg, h);
        if (h.kind === 'rayo') {
          this.flashes.push({x: h.x, y: h.y - 40, r: 260, life: 0.22, total: 0.22, c: 'pale'});
          for (let i = 0; i < 14; i++) this.particle({x: h.x + rand(-10, 10), y: h.y, vx: rand(-160, 160), vy: rand(-220, -40), life: 0.5, size: 2, color: '#e8f5ff', glow: true, grav: 400});
          if (this.options.flashes) { this.flash = Math.max(this.flash, 0.16); this.flashColor = '210,230,255'; }
          this.audio.sfx('trueno', {pan: this.panOf(h.x)});
          if (this.options.shake) this.shake = Math.max(this.shake, 4);
        } else {
          this.rings.push({x: h.x, y: h.y, r: h.r * 0.4, max: h.r, life: 0.35, total: 0.35, color: h.kind === 'cruz' ? '#fff1bd' : '#d6b466', width: 4, light: h.r * 1.4});
          for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; this.particle({x: h.x + Math.cos(a) * h.r * 0.8, y: h.y + Math.sin(a) * h.r * 0.6, vx: Math.cos(a) * 60, vy: -40, life: 0.5, size: 3, color: h.kind === 'cruz' ? '#fff1bd' : '#9a7a3a', glow: h.kind === 'cruz', grav: 200}); }
          this.audio.sfx(h.kind === 'cruz' ? 'golpeCruz' : 'crujido', {pan: this.panOf(h.x)});
          if (this.options.shake) this.shake = Math.max(this.shake, h.kind === 'cruz' ? 7 : 3);
        }
        if (this.state !== 'running') return;
      }
    }
    this.hazards = this.hazards.filter(h => h.t > -0.3);
    for (const s of this.enemyShots) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.x < ARENA.left - 60 || s.x > ARENA.right + 60 || s.y < ARENA.top - 80 || s.y > ARENA.bottom + 60) s.life = 0;
      if (s.life > 0 && (p.x - s.x) ** 2 + (p.y - 8 - s.y) ** 2 < (s.r + 9) ** 2) {
        s.life = 0;
        this.damagePlayer(s.dmg, s);
        if (this.state !== 'running') return;
      }
    }
    this.enemyShots = this.enemyShots.filter(s => s.life > 0);
  },

  panOf(x) { return clamp((x - this.player.x) / 600, -1, 1); },

  /* Algunos sonidos no deben repetirse demasiado seguido. */
  limitFx(key, gap) {
    this.fxGate ||= {};
    if (this.fxGate[key] && this.clock - this.fxGate[key] < gap) return false;
    this.fxGate[key] = this.clock;
    return true;
  },

  /* Aparta a todo lo que esté cerca (la medalla, el responso). */
  knockAll(x, y, radius, force) {
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > radius) continue;
      const resist = e.type === 'guia' ? 0.08 : e.elite ? 0.3 : 1;
      e.kx += dx / d * force * resist; e.ky += dy / d * force * resist;
    }
    this.enemyShots = this.enemyShots.filter(s => Math.hypot(s.x - x, s.y - y) > radius);
  }
};
