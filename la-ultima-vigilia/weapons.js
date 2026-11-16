/*
 * Las armas rodean a quien vela y atacan solas: cada una busca lo que tenga a
 * su alcance. Aquí también vive el daño (quién hiere a quién y cuánto), la
 * cera que cae, lo que se construye y las zonas que quedan en el suelo.
 */
import { TAU, clamp, rand, lerp } from './util.js';
import { ARENA, PLAYER, ECONOMY } from './balance.js';
import { WEAPON, tierValue } from './arsenal.js';
import { CHARACTERS, AMPARO, BARKS } from './story.js';
import { ATTACK_PALETTE } from './art.js';

const MELEE_ACTS = new Set(['thrust', 'sweep', 'spin']);
const angleDiff = (a, b) => ((a - b + Math.PI * 3) % TAU) - Math.PI;

export const weaponMethods = {
  /* ---------- números de cada arma ---------- */

  weaponDamage(w) {
    const def = WEAPON[w.id], st = this.st;
    let dmg = tierValue(def.dmg, w.tier);
    for (const [stat, k] of Object.entries(def.scale)) dmg += (st[stat] || 0) * k;
    return Math.max(1, dmg * this.d.damage * (this.abilityBuff?.damage || 1));
  },

  weaponRange(w) {
    const def = WEAPON[w.id];
    const bonus = this.st.range * (def.kind === 'melee' || def.act === 'orbit' || def.act === 'pulse' || def.act === 'flame' ? 0.5 : 1);
    return Math.max(30, def.range + tierValue(def.grow || 0, w.tier) + bonus);
  },

  weaponCooldown(w) {
    const def = WEAPON[w.id];
    const as = this.d.attackSpeed * (1 + (this.abilityBuff?.attackSpeed || 0) / 100);
    return tierValue(def.cd, w.tier) / as;
  },

  weaponCrit(w) { return clamp(WEAPON[w.id].crit + this.d.crit, 0, 1); },

  /* Dónde va cada arma alrededor de quien vela: repartidas en corro. */
  slotPosition(i, n) {
    const p = this.player;
    const a = n === 1 ? -Math.PI / 2 + (p.face < 0 ? 0.35 : -0.35) : -Math.PI / 2 + i / n * TAU;
    const R = PLAYER.weaponRing + (n > 3 ? 6 : 0);
    return {x: p.x + Math.cos(a) * R, y: p.y - 12 + Math.sin(a) * R * 0.7};
  },

  nearestEnemy(x, y, maxDist) {
    let best = null, bd = maxDist * maxDist;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve || e.rising > 0) continue;
      const dx = e.x - x, dy = e.y - 6 - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  },

  /* ---------- cada fotograma ---------- */

  updateWeapons(dt) {
    const list = this.run.weapons, n = list.length;
    list.forEach((w, i) => {
      const def = WEAPON[w.id];
      const home = this.slotPosition(i, n);
      w.recoil *= Math.exp(-dt * 14);
      w.cd -= dt;
      if (def.act === 'orbit') { this.orbit(w, dt); return; }
      if (def.act === 'censer') { this.censer(w, dt); return; }
      if (w.anim) { this.animateMelee(w, home, dt); return; }
      // Sin ataque en curso, el arma vuelve a su sitio apuntando a lo más cercano.
      const range = this.weaponRange(w);
      const target = this.nearestEnemy(this.player.x, this.player.y - 10, range + (MELEE_ACTS.has(def.act) ? 12 : 0));
      w.x = lerp(w.x || home.x, home.x, 1 - Math.exp(-dt * 18));
      w.y = lerp(w.y || home.y, home.y, 1 - Math.exp(-dt * 18));
      if (target) {
        const want = Math.atan2(target.y - 6 - w.y, target.x - w.x);
        w.aim += angleDiff(want, w.aim) * (1 - Math.exp(-dt * 20));
      } else {
        w.aim += angleDiff(this.player.face < 0 ? Math.PI : 0, w.aim) * (1 - Math.exp(-dt * 4));
      }
      if (def.act === 'flame') { this.flame(w, target, range, dt); return; }
      if (w.cd > 0 || !target) return;
      if (def.act === 'pulse') { this.pulse(w, range); return; }
      w.cd = this.weaponCooldown(w);
      this.fire(w, def, target, range);
    });
  },

  fire(w, def, target, range) {
    const aim = Math.atan2(target.y - 6 - w.y, target.x - w.x);
    w.aim = aim;
    const pan = this.panOf(target.x);
    if (MELEE_ACTS.has(def.act)) {
      const reach = Math.min(range, Math.hypot(target.x - w.x, target.y - w.y) + 18);
      const total = def.act === 'thrust' ? 0.24 : def.act === 'spin' ? 0.38 : 0.26;
      const arc = def.act === 'spin' ? TAU : def.arc || 1.6;
      w.anim = {kind: def.act, a: aim, a0: aim - arc / 2, a1: aim + arc / 2, t: 0, total, reach, range, prev: null};
      w.hits = new Set();
      this.audio.sfx(def.act === 'thrust' ? 'estocada' : 'barrido', {pan, tone: def.tone});
      return;
    }
    const dmg = this.weaponDamage(w), tone = def.tone;
    const muzzle = {x: w.x + Math.cos(aim) * 10, y: w.y + Math.sin(aim) * 10};
    w.recoil = 1;
    this.flashes.push({x: muzzle.x, y: muzzle.y, r: 70, life: 0.08, total: 0.08, c: toneLight(tone)});
    this.combatFx.emit('cast', muzzle.x, muzzle.y, {a: aim, tone: fxTone(tone), level: w.tier + 1});
    const base = {weapon: w.uid, tone, dmg, crit: this.weaponCrit(w), critMul: def.critMul, knock: def.knock, hit: new Set(),
      burn: def.burn ? tierValue(def.burn, w.tier) : 0, burnChance: def.burnChance ?? (def.burn ? 1 : 0), trail: []};
    const shoot = (a, extra = {}) => {
      const sp = def.speed * rand(0.96, 1.04);
      this.shots.push({...base, hit: new Set(), x: muzzle.x, y: muzzle.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a,
        life: range / sp, total: range / sp, r: 5, pierce: 1, ...extra});
    };
    switch (def.act) {
      case 'shot': {
        const n = tierValue(def.count || 1, w.tier);
        for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * 0.12, {kind: def.id, pierce: tierValue(def.pierce || 1, w.tier)});
        break;
      }
      case 'spread': {
        const n = tierValue(def.count, w.tier);
        for (let i = 0; i < n; i++) shoot(aim + (i - (n - 1) / 2) * (def.spreadA / Math.max(1, n - 1)) + rand(-0.04, 0.04), {kind: 'sal', r: 4, life: range / def.speed * rand(0.8, 1)});
        if (this.options.shake) this.shake = Math.max(this.shake, 1.5);
        for (let i = 0; i < 2; i++) { const d = rand(60, 140), a = aim + rand(-0.3, 0.3); this.ambient.decal('salt', this.player.x + Math.cos(a) * d, this.player.y + 8 + Math.sin(a) * d, 6); }
        break;
      }
      case 'bounce': shoot(aim, {kind: 'piedra', bounces: tierValue(def.bounces, w.tier), r: 5}); break;
      case 'ricochet': shoot(aim, {kind: 'vieira', bounces: tierValue(def.bounces, w.tier), r: 6, spin: 0}); break;
      case 'boomerang': shoot(aim, {kind: 'pandeireta', boomerang: true, pierce: 99, life: 9, out: range, r: 9, spin: 0, origin: {...muzzle}}); break;
      case 'rocket': shoot(aim, {kind: 'foguete', blast: tierValue(def.blast, w.tier), r: 6}); break;
      case 'wave': shoot(aim, {kind: 'onda', pierce: 99, r: 14, arc: def.arc, slow: def.slow, grow: true}); break;
      case 'puddle': {
        const tx = target.x, ty = target.y, d = Math.hypot(tx - muzzle.x, ty - muzzle.y), t = Math.max(0.25, d / def.speed);
        this.shots.push({...base, kind: 'frasco', x: muzzle.x, y: muzzle.y, vx: (tx - muzzle.x) / t, vy: (ty - muzzle.y) / t, a: aim, life: t, total: t, r: 0, lob: true,
          land: {x: tx, y: ty, r: tierValue(def.blast, w.tier), life: def.life, tick: def.tick, slow: def.slow}, pierce: 0});
        break;
      }
      default: shoot(aim);
    }
    this.audio.sfx(def.id, {pan, tier: w.tier});
  },

  /* Estocadas y barridos: el arma sale hacia la criatura y vuelve a su sitio. */
  animateMelee(w, home, dt) {
    const an = w.anim, p = this.player;
    an.t += dt;
    const k = clamp(an.t / an.total, 0, 1);
    const def = WEAPON[w.id];
    if (an.kind === 'thrust') {
      // Sale deprisa (40 %) y vuelve algo más despacio.
      const out = k < 0.4 ? easeOut(k / 0.4) : 1 - easeIn((k - 0.4) / 0.6);
      w.x = home.x + Math.cos(an.a) * an.reach * out;
      w.y = home.y + Math.sin(an.a) * an.reach * out;
      w.aim = an.a;
      if (k < 0.55) this.meleeHit(w, def, w.x, w.y, (def.width || 16) + 6, an.a);
    } else {
      // Barrido: la punta recorre el arco alrededor de quien vela.
      const s = easeInOut(k);
      const a = an.a0 + (an.a1 - an.a0) * s;
      const R = an.range * (0.55 + 0.45 * Math.sin(Math.min(1, k * 1.2) * Math.PI));
      w.x = p.x + Math.cos(a) * R; w.y = p.y - 12 + Math.sin(a) * R * 0.85;
      w.aim = a;
      const prev = an.prev ?? an.a0;
      // Todo lo que esté entre el ángulo anterior y el actual, dentro del alcance, recibe.
      for (const e of this.queryGrid(p.x, p.y, an.range + 30)) {
        if (e.hp <= 0 || e.dissolve || w.hits.has(e.id) || e.rising > 0) continue;
        const ea = Math.atan2(e.y - 6 - (p.y - 12), e.x - p.x), dist = Math.hypot(e.x - p.x, e.y - 6 - (p.y - 12));
        if (dist > an.range + e.r) continue;
        const lo = Math.min(prev, a) - 0.12, hi = Math.max(prev, a) + 0.12;
        const rel = an.kind === 'spin' ? 0 : angleDiff(ea, (lo + hi) / 2);
        if (an.kind !== 'spin' && Math.abs(rel) > (hi - lo) / 2 + e.r / Math.max(30, dist)) continue;
        w.hits.add(e.id);
        this.strike(w, def, e, {x: p.x, y: p.y - 12}, ea);
      }
      an.prev = a;
      if (Math.random() < 0.7) this.combatFx.trail(w.x, w.y, a, fxTone(def.tone));
    }
    if (k >= 1) { w.anim = null; w.x = home.x; w.y = home.y; }
  },

  meleeHit(w, def, x, y, radius, a) {
    for (const e of this.queryGrid(x, y, radius + 30)) {
      if (e.hp <= 0 || e.dissolve || w.hits.has(e.id) || e.rising > 0) continue;
      if ((e.x - x) ** 2 + (e.y - 6 - y) ** 2 > (radius + e.r) ** 2) continue;
      w.hits.add(e.id);
      this.strike(w, def, e, {x: x - Math.cos(a) * 20, y: y - Math.sin(a) * 20}, a);
    }
  },

  /* Un golpe de arma: daño con crítico, quemadura y el destello del contacto. */
  strike(w, def, e, from, a) {
    const crit = Math.random() < this.weaponCrit(w);
    const dmg = this.weaponDamage(w) * (crit ? def.critMul : 1);
    const burn = def.burn ? tierValue(def.burn, w.tier) : 0;
    this.hurt(e, dmg, {knock: def.knock, from, crit, tone: def.tone, by: w.uid, burn: burn && Math.random() < (def.burnChance ?? 1) ? burn : 0});
    this.combatFx.emit('impact', e.x - Math.cos(a) * e.r * 0.3, e.y - 6 - Math.sin(a) * e.r * 0.3, {a, tone: fxTone(def.tone), radius: crit ? 30 : 20});
  },

  /* El rosario: cuentas que giran y golpean al pasar. */
  orbit(w, dt) {
    const def = WEAPON[w.id], p = this.player, n = tierValue(def.count, w.tier), R = this.weaponRange(w);
    w.spin = (w.spin || 0) + dt * 2.6 * this.d.attackSpeed;
    w.beads = n;
    const hitCd = this.weaponCooldown(w);
    for (let i = 0; i < n; i++) {
      const a = w.spin + i / n * TAU, bx = p.x + Math.cos(a) * R, by = p.y - 10 + Math.sin(a) * R * 0.8;
      if (i === 0) { w.x = bx; w.y = by; w.aim = a + Math.PI / 2; }
      for (const e of this.queryGrid(bx, by, 40)) {
        if (e.hp <= 0 || e.dissolve || e.rising > 0) continue;
        e.beadCd ||= {};
        if (e.beadCd[w.uid] > 0) continue;
        if ((e.x - bx) ** 2 + (e.y - 6 - by) ** 2 > (e.r + 9) ** 2) continue;
        e.beadCd[w.uid] = hitCd;
        this.strike(w, def, e, {x: bx, y: by}, a + Math.PI / 2);
        this.combatFx.emit('bead', bx, by, {a, tone: 'sacred'});
      }
    }
  },

  /* El botafumeiro: va y viene alrededor, ancho, y deja humo que quema. */
  censer(w, dt) {
    const def = WEAPON[w.id], p = this.player, R = this.weaponRange(w);
    w.spin = (w.spin || 0) + dt * 1.9 * this.d.attackSpeed;
    const a = w.spin, sway = Math.sin(this.clock * 3.1) * 0.35;
    const bx = p.x + Math.cos(a + sway) * R, by = p.y - 10 + Math.sin(a + sway) * R * 0.78;
    w.x = bx; w.y = by; w.aim = a + Math.PI / 2;
    const hitCd = this.weaponCooldown(w);
    for (const e of this.queryGrid(bx, by, 50)) {
      if (e.hp <= 0 || e.dissolve || e.rising > 0) continue;
      e.beadCd ||= {};
      if (e.beadCd[w.uid] > 0) continue;
      if ((e.x - bx) ** 2 + (e.y - 6 - by) ** 2 > (e.r + 16) ** 2) continue;
      e.beadCd[w.uid] = hitCd;
      this.strike(w, def, e, {x: bx, y: by}, a + Math.PI / 2);
    }
    if (Math.random() < 0.5) this.particle({x: bx + rand(-4, 4), y: by + rand(-2, 4), vx: rand(-14, 14), vy: rand(-30, -10), life: 0.9, size: 3, color: 'rgba(214,206,190,.5)', drag: 1});
  },

  /* La campanilla: un tañido que hiere y aparta todo alrededor. */
  pulse(w, range) {
    const def = WEAPON[w.id], p = this.player;
    w.cd = this.weaponCooldown(w);
    this.combatFx.emit('bell', p.x, p.y - 8, {radius: range, tone: 'sacred', level: w.tier + 1});
    this.flashes.push({x: p.x, y: p.y - 10, r: range * 1.5, life: 0.18, total: 0.18, c: 'sacred'});
    for (const e of this.queryGrid(p.x, p.y, range + 30)) {
      if (e.hp <= 0 || e.dissolve || e.rising > 0) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) < range + e.r) this.strike(w, def, e, {x: p.x, y: p.y}, Math.atan2(e.y - p.y, e.x - p.x));
    }
    this.audio.sfx('campanilla', {tier: w.tier});
    w.recoil = 1;
  },

  /* El cirio pascual: una llama corta, continua, hacia lo más cercano. */
  flame(w, target, range, dt) {
    if (!target) { w.burning = 0; return; }
    const def = WEAPON[w.id];
    w.burning = 0.15;
    w.flameA = w.aim;
    if (Math.random() < 0.9) {
      const a = w.aim + rand(-def.arc / 2, def.arc / 2), sp = rand(range * 2.2, range * 3);
      this.particle({x: w.x + Math.cos(w.aim) * 8, y: w.y + Math.sin(w.aim) * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.32, size: rand(2, 4), color: Math.random() < 0.5 ? '#ffb04a' : '#ff742e', glow: true, drag: 3});
    }
    this.flashes.push({x: w.x + Math.cos(w.aim) * range * 0.5, y: w.y + Math.sin(w.aim) * range * 0.5, r: range * 0.9, life: dt * 2, total: dt * 2, c: 'ember'});
    if (w.cd > 0) return;
    w.cd = this.weaponCooldown(w);
    for (const e of this.queryGrid(w.x, w.y, range + 30)) {
      if (e.hp <= 0 || e.dissolve || e.rising > 0) continue;
      const dx = e.x - w.x, dy = e.y - 6 - w.y, d = Math.hypot(dx, dy);
      if (d > range + e.r || Math.abs(angleDiff(Math.atan2(dy, dx), w.aim)) > def.arc / 2 + e.r / Math.max(20, d)) continue;
      this.strike(w, def, e, {x: w.x, y: w.y}, w.aim);
    }
    if (this.limitFx('cirio', 0.32)) this.audio.sfx('cirio', {pan: this.panOf(target.x)});
  },

  /* ---------- proyectiles ---------- */

  updateShots(dt) {
    for (const s of this.shots) {
      s.trail.push({x: s.x, y: s.y});
      if (s.trail.length > (s.kind === 'onda' ? 2 : 6)) s.trail.shift();
      if (s.spin !== undefined) s.spin += dt * 18;
      if (s.boomerang) {
        // Sale hasta su alcance y vuelve a las manos de quien la lanzó.
        const p = this.player, from = s.origin;
        if (!s.back && Math.hypot(s.x - from.x, s.y - from.y) > s.out) { s.back = true; s.hit.clear(); }
        if (s.back) {
          const dx = p.x - s.x, dy = p.y - 12 - s.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(s.vx, s.vy);
          s.vx = lerp(s.vx, dx / d * sp * 1.1, 1 - Math.exp(-dt * 8)); s.vy = lerp(s.vy, dy / d * sp * 1.1, 1 - Math.exp(-dt * 8));
          if (d < 18) s.life = 0;
        }
      }
      if (s.grow) s.r = Math.min(46, s.r + dt * 70);
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.kind === 'chispas' && Math.random() < 0.6) this.particle({x: s.x, y: s.y, vx: -s.vx * 0.05 + rand(-12, 12), vy: -s.vy * 0.05 + rand(-12, 12), life: 0.2, size: 2, color: ATTACK_PALETTE.ember.edge, glow: true});
      if (s.kind === 'foguete' && Math.random() < 0.9) this.particle({x: s.x, y: s.y, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.35, size: 3, color: Math.random() < 0.5 ? '#ffb04a' : '#fff1bd', glow: true, drag: 2});
      if (s.lob) {
        if (s.life <= 0) { this.landPuddle(s); }
        continue;
      }
      if (s.x < ARENA.left - 120 || s.x > ARENA.right + 120 || s.y < ARENA.top - 160 || s.y > ARENA.bottom + 120) { s.life = 0; continue; }
      if (s.life <= 0) { if (s.blast) this.explode(s.x, s.y, s.blast, s); continue; }
      for (const e of this.queryGrid(s.x, s.y, s.r + 40)) {
        if (e.hp <= 0 || e.dissolve || s.hit.has(e.id) || e.rising > 0) continue;
        const rr = e.r + s.r;
        if ((e.x - s.x) ** 2 + (e.y - 6 - s.y) ** 2 > rr * rr) continue;
        if (s.arc && s.kind === 'onda') {
          const rel = angleDiff(Math.atan2(e.y - s.y, e.x - s.x), s.a);
          if (Math.abs(rel) > 1.8) continue;
        }
        s.hit.add(e.id);
        const crit = Math.random() < s.crit;
        const dmg = s.dmg * (crit ? s.critMul : 1);
        this.hurt(e, dmg, {knock: s.knock, from: {x: s.x - s.vx * 0.05, y: s.y - s.vy * 0.05}, crit, tone: s.tone, by: s.weapon,
          burn: s.burn && Math.random() < s.burnChance ? s.burn : 0, slow: s.slow});
        this.combatFx.emit('impact', s.x, s.y, {a: s.a, tone: fxTone(s.tone), radius: crit ? 28 : 18});
        if (s.blast) { this.explode(s.x, s.y, s.blast, s); s.life = 0; break; }
        if (s.bounces > 0) {
          // Rebota hacia la criatura más cercana que aún no ha tocado.
          s.bounces--;
          let next = null, best = 260 * 260;
          for (const o of this.queryGrid(s.x, s.y, 260)) {
            if (o.hp <= 0 || o.dissolve || s.hit.has(o.id) || o === e) continue;
            const q = (o.x - s.x) ** 2 + (o.y - s.y) ** 2;
            if (q < best) { best = q; next = o; }
          }
          if (next) {
            const a = Math.atan2(next.y - 6 - s.y, next.x - s.x), sp = Math.hypot(s.vx, s.vy);
            s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; s.a = a; s.life = Math.max(s.life, 0.6);
            continue;
          }
          s.life = 0; break;
        }
        if (--s.pierce <= 0) { s.life = 0; break; }
      }
    }
    this.shots = this.shots.filter(s => s.life > 0);
    if (this.shots.length > 220) this.shots.splice(0, this.shots.length - 220);
  },

  /* Un foguete o una caja de cerillas: daño en un círculo, una luz fuerte y temblor. */
  explode(x, y, radius, s, dmgOverride) {
    const dmg = dmgOverride ?? s.dmg;
    this.combatFx.emit('blast', x, y, {a: 0, tone: 'ember', level: 3, radius});
    this.flashes.push({x, y, r: radius * 3, life: 0.22, total: 0.22, c: 'ember'});
    this.rings.push({x, y, r: radius * 0.3, max: radius, life: 0.3, total: 0.3, color: '#ffd28a', width: 3});
    for (let i = 0; i < 16; i++) { const a = rand(0, TAU), sp = rand(60, 260); this.particle({x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: rand(0.3, 0.6), size: rand(2, 4), color: i % 3 ? '#ffb04a' : '#fff1bd', glow: true, drag: 3}); }
    for (let i = 0; i < 5; i++) this.particle({x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-30, 30), vy: rand(-50, -20), life: 0.9, size: 5, color: 'rgba(40,36,44,.6)', drag: 2});
    this.ambient.decal('scorch', x, y + 6, 8);
    for (const e of this.queryGrid(x, y, radius + 30)) {
      if (e.hp <= 0 || e.dissolve || e.rising > 0) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 > (radius + e.r) ** 2) continue;
      this.hurt(e, dmg, {knock: s?.knock ?? 160, from: {x, y}, crit: false, tone: 'ember', by: s?.weapon, burn: 0});
    }
    this.audio.sfx('explosion', {pan: this.panOf(x)});
    if (this.options.shake) this.shake = Math.max(this.shake, 3.5);
  },

  landPuddle(s) {
    const L = s.land;
    this.areas.push({kind: 'agua', owner: 'player', x: L.x, y: L.y, r: L.r, life: L.life, total: L.life, tick: L.tick, tickT: 0, dmg: s.dmg, slow: L.slow, weapon: s.weapon, tone: 'salt'});
    for (let i = 0; i < 12; i++) { const a = rand(0, TAU); this.particle({x: L.x, y: L.y, vx: Math.cos(a) * rand(40, 140), vy: Math.sin(a) * rand(30, 90) - 60, life: 0.5, size: 2, color: '#bee0f2', glow: true, grav: 300}); }
    this.flashes.push({x: L.x, y: L.y, r: L.r * 2.4, life: 0.2, total: 0.2, c: 'salt'});
    this.audio.sfx('frasco', {pan: this.panOf(L.x)});
  },

  /* Zonas en el suelo: agua bendita, el cerco de sal, la red y los charcos del mar. */
  updateAreas(dt) {
    const p = this.player;
    this.wading = 1;
    for (const z of this.areas) {
      z.life -= dt;
      if (z.owner === 'enemy') {
        if (((p.x - z.x) / z.r) ** 2 + ((p.y + 6 - z.y) / (z.r * 0.7)) ** 2 < 1) this.wading = Math.min(this.wading, z.slow);
        continue;
      }
      z.tickT -= dt;
      const hitNow = z.tickT <= 0;
      if (hitNow) z.tickT = z.tick || 0.5;
      for (const e of this.queryGrid(z.x, z.y, z.r + 30)) {
        if (e.hp <= 0 || e.dissolve) continue;
        if (((e.x - z.x) / z.r) ** 2 + ((e.y - z.y) / (z.r * 0.75)) ** 2 > 1) continue;
        if (z.slow) { const f = 1 - z.slow; if (e.slowT <= 0 || f < e.slowF) e.slowF = f; e.slowT = Math.max(e.slowT, 0.25); }
        if (z.root) e.root = Math.max(e.root || 0, 0.2);
        if (hitNow && z.dmg) this.hurt(e, z.dmg, {knock: 0, silent: !this.options.numbers, tone: z.tone, by: z.weapon, small: true});
      }
    }
    this.areas = this.areas.filter(z => z.life > 0);
  },

  /* ---------- daño ---------- */

  hurt(e, amount, {knock = 80, from = this.player, silent = false, crit = false, tone = 'ember', by = null, burn = 0, slow = 0, burnTick = false, small = false} = {}) {
    if (e.hp <= 0 || e.dissolve) return;
    let dmg = amount;
    if ((e.elite || e.type === 'guia') && this.sp.elite) dmg *= 1 + this.sp.elite;
    if (e.type === 'guia' && this.dawnBreaks) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (by != null) this.run.damageBy[by] = (this.run.damageBy[by] || 0) + dmg;
    if (!burnTick) {
      e.flash = 0.11;
      e.squash = 1;
      if (knock && from) {
        const dx = e.x - from.x, dy = e.y - from.y, d = Math.hypot(dx, dy) || 1;
        const resist = e.type === 'guia' ? 0.05 : e.elite ? 0.25 : e.type === 'espantajo' ? 0.3 : e.type === 'ahogado' ? 0.55 : 1;
        e.kx += dx / d * knock * resist; e.ky += dy / d * knock * resist;
      }
      if (slow) { e.slowT = 1.2; e.slowF = 1 - slow; }
      if (burn > 0 || (this.sp.burn > 0 && Math.random() < this.sp.burn)) { e.burn = Math.max(e.burn, burn || 2 + this.st.elemental * 0.3); e.burnT = 2.5; e.burnBy = by; }
      // Robo de vida: probabilidad de curar 1 por golpe, con un tope por segundo.
      if (this.d.lifesteal > 0 && this.lifestealBudget >= 1 && Math.random() < this.d.lifesteal && this.player.hp < this.d.maxHp) { this.lifestealBudget -= 1; this.heal(1, true); }
    }
    if (!silent || crit) this.damageNumber(e.x, e.y - e.r - 10, dmg, crit, burnTick, small);
    if (!silent && !burnTick) {
      this.audio.sfx('golpe', {pan: this.panOf(e.x), tone, crit});
      const color = {anima: '#9cc8ff', ahogado: '#7fb3c4', espantajo: '#d6b466', curuxa: '#c9b28a', trasno: '#9ed36a', lavandeira: '#d9e6ff', nubeiro: '#b4c2ff', lobishome: '#8a7a6a'}[e.type] || '#c9c2b8';
      for (let i = 0; i < (crit ? 6 : 3); i++) this.particle({x: e.x, y: e.y - 6, vx: rand(-90, 90), vy: rand(-110, 10), life: 0.32, size: 2, color, grav: 320});
    }
    if (crit) {
      this.flashes.push({x: e.x, y: e.y - 8, r: 90, life: 0.1, total: 0.1, c: 'white'});
      if (!silent) this.freeze = Math.max(this.freeze, 0.025);
    }
    if (e.type === 'guia') this.bossHit(e, dmg);
    if (e.hp <= 0) this.kill(e);
  },

  bossHit() {
    if (this.limitFx('guiaGolpe', 0.12) && this.options.shake) this.shake = Math.max(this.shake, 1.5);
  },

  kill(e) {
    e.hp = 0;
    this.run.kills++;
    this.deathFx(e);
    this.audio.sfx('muerte', {pan: this.panOf(e.x), type: e.type, combo: this.run.kills});
    if (e.type === 'guia') { this.freeBoss(e); return; }
    let v = e.value;
    if (this.sp.double > 0 && Math.random() < this.sp.double) v *= 2;
    if (!e.summoned || Math.random() < 0.5) this.dropCera(e.x, e.y, v);
    // El trasno suelta lo que robó y un pellizco más; esa cera ya no se la puede llevar otro.
    if (e.stolen) this.dropCera(e.x, e.y, e.stolen + Math.min(10, Math.ceil(e.stolen * 0.25)), true);
    if (e.elite) {
      this.run.elitesDown++;
      if (this.eliteAlive === e) this.eliteAlive = null;
      this.dropCrate(e.x, e.y, 2);
      for (let i = 0; i < 8; i++) this.dropCera(e.x + rand(-30, 30), e.y + rand(-20, 20), 2);
      this.rings.push({x: e.x, y: e.y, r: 12, max: 180, life: 0.7, total: 0.7, color: '#fff1bd', width: 3, light: 260});
      this.freeze = Math.max(this.freeze, 0.1);
      this.slowmo = 0.35;
      if (this.options.shake) this.shake = Math.max(this.shake, 8);
      this.audio.sfx('difuntoCae');
    } else {
      const luck = 1 + this.st.luck / 100;
      if (this.run.cratesThisRound < ECONOMY.crateMax && Math.random() < ECONOMY.crateChance * luck * (e.value > 1 ? 1.6 : 1)) { this.run.cratesThisRound++; this.dropCrate(e.x, e.y, 0); }
      else if (Math.random() < ECONOMY.cafeChance * luck * (1 + this.sp.cafe)) this.drops.push({kind: 'cafe', x: e.x, y: e.y, z: 0, vz: 160, vx: rand(-40, 40), vy: rand(-30, 30), bob: rand(0, 6)});
    }
    if (this.sp.explode > 0 && Math.random() < this.sp.explode) this.explode(e.x, e.y, 58, null, 6 + this.st.elemental * 1.5);
  },

  freeBoss(e) {
    this.run.freed = true;
    this.run.bossTime = Math.round(this.roundClock - (this.run.bossAt || 0));
    this.boss = e;
    this.banner('Carmela Souto', '—¿Ya amanece? Decidle a mi madre que ya voy.', 'dawn');
    this.bark('freed', {priority: 4, delay: 1.2});
    this.audio.sfx('liberada');
    this.slowmo = 1.4;
    this.freeze = 0.15;
    if (this.options.flashes) { this.flash = 0.6; this.flashColor = '255,244,214'; }
    for (const o of this.enemies) if (o !== e && o.hp > 0) { o.dissolve = true; o.dissolveT = rand(0.2, 1.4); }
    this.enemyShots = []; this.hazards = []; this.marks = [];
    // Al liberar a la Guía, la ronda se da por acabada en el siguiente paso.
    this.stopped = false;
    this.timeLeft = 0;
  },

  dropCera(x, y, v, returned = false) {
    if (v <= 0) return;
    // Varias gotas pequeñas mejor que una enorme: se ve que cae mucho.
    const pieces = v > 6 ? Math.min(5, Math.ceil(v / 4)) : 1;
    let left = v;
    for (let i = 0; i < pieces; i++) {
      const part = i === pieces - 1 ? left : Math.ceil(v / pieces);
      left -= part;
      if (this.drops.length > 320) {
        const d = this.drops.find(o => o.kind === 'cera' && !o.magnet && o.returned === returned);
        if (d) { d.v += part; continue; }
      }
      this.drops.push({kind: 'cera', x, y, z: 0, vz: rand(120, 200), vx: rand(-70, 70), vy: rand(-50, 50), v: part, bob: rand(0, 6), magnet: false, age: 0, returned});
    }
  },

  dropCrate(x, y, rarityBonus = 0) {
    this.drops.push({kind: 'crate', x, y, z: 0, vz: 220, vx: rand(-30, 30), vy: rand(-20, 20), bob: rand(0, 6), rarity: rarityBonus, age: 0});
    this.audio.sfx('ofrendaCae', {pan: this.panOf(x)});
  },

  /* La cera salta al caer, se queda en el suelo y vuela hacia quien vela cuando se acerca. */
  updateDrops(dt) {
    const p = this.player, R = PLAYER.pickup * (1 + this.sp.pickup);
    for (const d of this.drops) {
      d.age = (d.age || 0) + dt;
      if (d.z > 0 || d.vz > 0) {
        d.vz -= 900 * dt; d.z += d.vz * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.vx *= Math.exp(-dt * 3); d.vy *= Math.exp(-dt * 3);
        if (d.z <= 0) { d.z = 0; d.vz = d.vz < -120 ? -d.vz * 0.35 : 0; }
      }
      d.x = clamp(d.x, ARENA.left + 10, ARENA.right - 10); d.y = clamp(d.y, ARENA.top + 16, ARENA.bottom - 8);
      const dx = p.x - d.x, dy = p.y - 8 - d.y, dist = Math.hypot(dx, dy);
      if (d.age > 0.25 && dist < R) d.magnet = true;
      if (d.magnet) {
        d.pull = (d.pull || 260) + dt * 1400;
        const s = Math.min(dist, d.pull * dt);
        d.x += dx / (dist || 1) * s; d.y += dy / (dist || 1) * s;
      }
      if (dist < 16) this.pickup(d);
    }
    this.drops = this.drops.filter(d => !d.got);
    this.updateAreas(dt);
  },

  pickup(d) {
    d.got = true;
    const run = this.run, p = this.player;
    if (d.kind === 'cafe') {
      this.heal(3 + this.d.maxHp * 0.08);
      this.audio.sfx('cafe');
      for (let i = 0; i < 6; i++) this.particle({x: p.x, y: p.y - 10, vx: rand(-30, 30), vy: rand(-60, -30), life: 0.8, size: 2, color: '#f1e8d2'});
      return;
    }
    if (d.kind === 'crate') {
      run.crates.push({rarity: d.rarity || 0});
      this.audio.sfx('ofrenda');
      this.floatText(p.x, p.y - 44, 'Ofrenda', '#ffd59a', 1);
      return;
    }
    let v = d.v * (1 + this.sp.cera);
    // La cera fundida de la ronda anterior se suma, gota a gota, a la que recoges.
    if (run.melt > 0) { const extra = Math.min(run.melt, Math.max(ECONOMY.meltPerPickup, Math.ceil(d.v))); run.melt -= extra; v += extra; }
    v = Math.round(v * 10) / 10;
    run.cera += v;
    run.ceraTotal += v;
    run.cera = Math.round(run.cera * 10) / 10;
    const ch = CHARACTERS[run.character];
    this.gainXp(v * (1 + this.sp.xp + (ch.special?.xp || 0)) * 0.5);
    this.pickupCombo = (this.pickupComboT > 0 ? (this.pickupCombo || 0) + 1 : 0);
    this.pickupComboT = 0.5;
    if (this.limitFx('cera', 0.035)) this.audio.sfx('cera', {combo: this.pickupCombo});
    this.ceraFlash = 1;
  },

  /* ---------- quien vela recibe ---------- */

  damagePlayer(amount, source) {
    const p = this.player;
    if (p.inv > 0 || this.dashTime > 0 || this.god || this.state !== 'running') return;
    if (Math.random() < this.d.dodge) {
      p.inv = 0.25;
      this.floatText(p.x, p.y - 40, 'Esquivas', '#cfe8ff', 0.8);
      this.audio.sfx('esquivaGolpe');
      return;
    }
    const dmg = Math.max(1, Math.round(amount * this.d.armor));
    p.hp -= dmg;
    p.inv = PLAYER.hurtInvuln;
    p.hurtT = 0.3;
    p.squash = 1;
    if (this.options.shake) this.shake = Math.max(this.shake, 6);
    this.freeze = Math.max(this.freeze, 0.06);
    if (this.options.flashes) { this.flash = Math.max(this.flash, 0.28); this.flashColor = '190,30,24'; }
    this.audio.sfx('herida');
    this.damageNumber(p.x, p.y - 42, dmg, false, false, false, true);
    if (source && source.x !== undefined) {
      const dx = p.x - source.x, dy = p.y - source.y, d = Math.hypot(dx, dy) || 1;
      p.vx += dx / d * 260; p.vy += dy / d * 260;
      if (this.sp.thorns > 0 && source.hp > 0 && source.type) this.hurt(source, this.sp.thorns + Math.max(0, this.st.armor) * 2, {knock: 120, from: p, tone: 'iron'});
    }
    if (p.hp <= 0) { p.hp = 0; this.die(); return; }
    if (p.hp < this.d.maxHp * 0.3 && this.lowHpCd === 0) {
      this.lowHpCd = 30;
      if (!this.said.has('amparoLow')) { this.said.add('amparoLow'); this.say(AMPARO.lowHp, AMPARO.name, {italic: true, priority: 3}); }
      else this.bark('lowHp', {once: false, line: BARKS[this.run.character].lowHp, priority: 2});
    }
  },

  /* ---------- lo que se construye ---------- */

  placeStructures() {
    this.structures = [];
    const list = this.sp.structures;
    list.forEach((kind, i) => {
      const a = -Math.PI / 2 + (i + 0.5) / list.length * TAU + 0.4;
      const R = kind === 'cruceiro' ? 120 : 190;
      this.structures.push({kind, x: clamp(Math.cos(a) * R, ARENA.left + 60, ARENA.right - 60), y: clamp(40 + Math.sin(a) * R * 0.8, ARENA.top + 70, ARENA.bottom - 40), cd: rand(0.5, 1.5), recoil: 0, aim: 0, uid: 's' + i});
    });
  },

  structureDamage(base, k) { return Math.max(1, (base + this.st.engineering * k) * (1 + this.sp.structure) * this.d.damage); },

  updateStructures(dt) {
    const p = this.player;
    for (const s of this.structures) {
      s.cd -= dt; s.recoil *= Math.exp(-dt * 10);
      if (s.kind === 'cruceiro') {
        if (s.cd <= 0) {
          s.cd = 1.6;
          if (Math.hypot(p.x - s.x, p.y - s.y) < 110 && p.hp < this.d.maxHp) { this.heal(1, true); this.particle({x: p.x, y: p.y - 24, vx: 0, vy: -30, life: 0.6, size: 3, color: '#8fe39a', glow: true}); }
        }
        continue;
      }
      const target = this.nearestEnemy(s.x, s.y, s.kind === 'colmena' ? 360 : 300);
      if (target) s.aim = Math.atan2(target.y - s.y, target.x - s.x);
      if (s.cd > 0 || !target) continue;
      s.recoil = 1;
      if (s.kind === 'espantallo') {
        s.cd = 1.05;
        const dmg = this.structureDamage(4, 1), a = s.aim;
        this.shots.push({kind: 'paja', weapon: s.uid, tone: 'iron', dmg, crit: 0.03, critMul: 2, knock: 60, hit: new Set(), trail: [],
          x: s.x, y: s.y - 30, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, a, life: 0.8, total: 0.8, r: 4, pierce: 1, burn: 0, burnChance: 0});
        this.audio.sfx('paja', {pan: this.panOf(s.x)});
      } else if (s.kind === 'colmena') {
        s.cd = 2.2;
        const dmg = this.structureDamage(3, 0.8);
        for (let i = 0; i < 3; i++) {
          const a = s.aim + rand(-0.8, 0.8);
          this.shots.push({kind: 'abella', weapon: s.uid, tone: 'sacred', dmg, crit: 0.05, critMul: 2, knock: 20, hit: new Set(), trail: [], home: true,
            x: s.x, y: s.y - 18, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, a, life: 2.2, total: 2.2, r: 4, pierce: 1, burn: 0, burnChance: 0, bounces: 1});
        }
        this.audio.sfx('abellas', {pan: this.panOf(s.x)});
      }
    }
    // Las abejas persiguen a su presa.
    for (const s of this.shots) {
      if (!s.home) continue;
      const t = this.nearestEnemy(s.x, s.y, 300);
      if (!t) continue;
      const a = Math.atan2(t.y - 6 - s.y, t.x - s.x), sp = 260;
      s.vx = lerp(s.vx, Math.cos(a) * sp, 1 - Math.exp(-dt * 5)); s.vy = lerp(s.vy, Math.sin(a) * sp, 1 - Math.exp(-dt * 5));
      s.a = Math.atan2(s.vy, s.vx);
    }
    // El badajo de la campana y el faro de su padre.
    if (this.sp.bell > 0) {
      this.t.bell -= dt;
      if (this.t.bell <= 0) {
        this.t.bell = this.sp.bell;
        const R = 150, dmg = Math.max(1, (15 + this.st.elemental * 2) * this.d.damage);
        this.combatFx.emit('bell', p.x, p.y - 8, {radius: R, tone: 'sacred', level: 5});
        this.flashes.push({x: p.x, y: p.y - 10, r: R * 1.6, life: 0.25, total: 0.25, c: 'sacred'});
        for (const e of this.queryGrid(p.x, p.y, R + 30)) if (e.hp > 0 && !e.dissolve && Math.hypot(e.x - p.x, e.y - p.y) < R + e.r) this.hurt(e, dmg, {knock: 240, from: p, tone: 'sacred', by: 'badajo'});
        this.audio.sfx('campana');
      }
    }
    if (this.sp.beam > 0) {
      this.beamA = ((this.beamA || 0) + dt * 0.9) % TAU;
      const ox = ARENA.right + 260, oy = ARENA.top - 160, dmg = Math.max(1, (8 + this.st.elemental * 1.5) * this.d.damage);
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.dissolve || (e.beamCd || 0) > this.clock) continue;
        const diff = angleDiff(Math.atan2(e.y - oy, e.x - ox), this.beamA + Math.PI * 0.5);
        if (Math.abs(diff) > 0.06) continue;
        e.beamCd = this.clock + 0.9;
        this.hurt(e, dmg, {knock: 60, from: {x: ox, y: oy}, tone: 'ember', by: 'faro', burn: 2});
      }
    }
  }
};

/* Qué luz deja cada material. */
export function toneLight(tone) { return {ember: 'ember', salt: 'salt', sacred: 'sacred', sea: 'blue', music: 'sacred', iron: 'white'}[tone] || 'warm'; }
export function fxTone(tone) { return {ember: 'ember', salt: 'salt', sacred: 'sacred', sea: 'salt', music: 'sacred', iron: 'salt'}[tone] || 'ember'; }

const easeOut = t => 1 - (1 - t) ** 3;
const easeIn = t => t * t;
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
