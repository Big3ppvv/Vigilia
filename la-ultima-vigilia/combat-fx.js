/*
 * El golpe tiene tres tiempos: la mano que lo suelta, su recorrido y el contacto.
 * Las luces viven en Lighting; aquí quedan las siluetas luminosas y el nácar.
 * Ningún efecto cambia el daño ni la duración de las armas.
 */
import { ATTACK_PALETTE, makeCanvas } from './art.js';

const TAU = Math.PI * 2;
const MAX_EFFECTS = 96;
const MAX_LIGHTS = 24;
const priority = kind => kind === 'bell' ? 3 : kind === 'cast' || kind === 'blast' ? 2 : kind === 'impact' ? 0 : 1;
const LIFETIMES = {cast: 0.24, blast: 0.3, bell: 0.72, impact: 0.28, bead: 0.3, moth: 0.34};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const palette = tone => ATTACK_PALETTE[tone] || ATTACK_PALETTE.ember;

function diamond(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size), size, size * 2);
  ctx.fillRect(Math.round(x - size), Math.round(y - size / 2), size * 2, size);
}

function haloSprite(tone) {
  const c = makeCanvas(96, 96), ctx = c.getContext('2d'), p = palette(tone);
  const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
  g.addColorStop(0, `rgba(${p.rgb},.65)`);
  g.addColorStop(0.16, `rgba(${p.rgb},.3)`);
  g.addColorStop(0.48, `rgba(${p.rgb},.08)`);
  g.addColorStop(1, `rgba(${p.rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 96, 96);
  return c;
}

function visible(ctx, x, y, radius) {
  const transform = ctx.getTransform();
  const scale = Math.hypot(transform.a, transform.b) || 1;
  return x + radius >= 0 && y + radius >= 0 && x - radius <= ctx.canvas.width / scale && y - radius <= ctx.canvas.height / scale;
}

export class CombatEffects {
  constructor() {
    this.effects = [];
    this.halos = Object.fromEntries(Object.keys(ATTACK_PALETTE).map(tone => [tone, haloSprite(tone)]));
  }

  clear() { this.effects.length = 0; }

  emit(kind, x, y, opts = {}) {
    if (!LIFETIMES[kind] || !Number.isFinite(x) || !Number.isFinite(y)) return;
    if (this.effects.length >= MAX_EFFECTS) {
      // Una campanada puede alcanzar a toda la horda: los contactos no borran su eco.
      let replace = -1, lowest = Infinity;
      for (let i = 0; i < this.effects.length; i++) {
        const rank = priority(this.effects[i].kind);
        if (rank < lowest) { lowest = rank; replace = i; }
      }
      if (lowest > priority(kind)) return;
      this.effects.splice(replace, 1);
    }
    const total = LIFETIMES[kind];
    this.effects.push({kind, x, y, a: opts.a || 0, radius: clamp(opts.radius || 28, 4, 300),
      tone: ATTACK_PALETTE[opts.tone] ? opts.tone : kind === 'blast' ? 'salt' : ['bell', 'bead', 'moth'].includes(kind) ? 'sacred' : 'ember',
      level: clamp(opts.level || 1, 1, 5), seed: Math.random() * TAU, total, life: total});
  }

  update(dt) {
    for (const fx of this.effects) fx.life -= dt;
    this.effects = this.effects.filter(fx => fx.life > 0);
  }

  addLights(lights, camX, camY, flashes = true) {
    // Destellos apagados conserva los dibujos; suprime los pulsos de iluminación.
    if (!flashes) return;
    const ordered = [...this.effects].sort((a, b) => priority(b.kind) - priority(a.kind) || b.life / b.total - a.life / a.total);
    const impactPositions = [], crowded = this.effects.length > 32;
    let count = 0;
    for (const fx of ordered) {
      if (count >= MAX_LIGHTS) break;
      const impact = fx.kind === 'impact';
      if (impact && impactPositions.some(other => (other.x - fx.x) ** 2 + (other.y - fx.y) ** 2 < 28 ** 2)) continue;
      if (impact) impactPositions.push(fx);
      const k = fx.life / fx.total, progress = 1 - k;
      const bell = fx.kind === 'bell', directional = fx.kind === 'blast' || fx.kind === 'cast';
      const radius = bell ? 42 + fx.radius * progress * 0.68 : impact ? fx.radius + 10 : fx.kind === 'blast' ? 60 : 42;
      lights.push({x: fx.x - camX, y: fx.y - camY, r: radius, i: k * (bell ? 0.55 : impact ? crowded ? 0.28 : 0.5 : 0.82),
        c: fx.tone, g: bell ? 0.32 : impact ? 0.45 : 0.75, a: fx.a, stretch: directional ? 1.5 : 1});
      count++;
    }
  }

  halo(ctx, tone, x, y, radius, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.halos[tone] || this.halos.ember, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  render(ctx, camX, camY, flashes = true) {
    for (const fx of this.effects) {
      const x = fx.x - camX, y = fx.y - camY;
      if (!visible(ctx, x, y, fx.radius + 50)) continue;
      const k = clamp(fx.life / fx.total, 0, 1), t = 1 - k, p = palette(fx.tone);
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y));
      ctx.globalAlpha *= Math.pow(k, 0.75) * (flashes ? 1 : 0.7);
      ctx.lineCap = 'round';
      if (fx.kind === 'bell') {
        const radius = 12 + (fx.radius - 12) * (1 - (1 - t) ** 2);
        if (flashes) this.halo(ctx, fx.tone, 0, 0, 40 + radius * 0.7, k * 0.28);
        // Frentes concéntricos, finos al llegar al borde del alcance real.
        for (let ring = 0; ring < 3; ring++) {
          const r = Math.max(3, radius - ring * (9 + t * 9));
          ctx.globalAlpha *= ring ? 0.7 : 1;
          ctx.strokeStyle = ring === 0 ? p.core : p.edge;
          ctx.lineWidth = ring === 0 ? 1.4 + k * 1.8 : 1;
          ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        }
        ctx.globalAlpha = k * (flashes ? 0.75 : 0.45);
        for (let i = 0; i < 12; i++) {
          const a = i * TAU / 12 + fx.seed * 0.08;
          ctx.save(); ctx.rotate(a);
          ctx.fillStyle = p.core;
          ctx.fillRect(Math.round(radius - 4), -1, 7 + Math.round(k * 8), 2);
          ctx.restore();
        }
        // La cruz se deshace antes que el último eco.
        if (t < 0.45) {
          const fade = 1 - t / 0.45;
          ctx.globalAlpha = fade * 0.8;
          ctx.fillStyle = p.core; ctx.fillRect(-1, -15, 2, 28); ctx.fillRect(-9, -7, 18, 2);
        }
      } else if (fx.kind === 'blast') {
        ctx.rotate(fx.a);
        if (flashes) this.halo(ctx, fx.tone, 14, 0, 42 + t * 20, k * 0.75);
        const reach = 18 + t * 57, spread = 10 + t * 20;
        ctx.fillStyle = p.edge; ctx.globalAlpha *= 0.25;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(reach, -spread); ctx.lineTo(reach + 12, 0); ctx.lineTo(reach, spread); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = k * (flashes ? 0.95 : 0.6);
        for (let i = 0; i < 7; i++) {
          const a = (i - 3) * 0.11, length = reach * (0.65 + (i % 3) * 0.15);
          ctx.strokeStyle = i % 2 ? p.core : p.edge; ctx.lineWidth = i === 3 ? 3 : 1;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * length * 0.6, Math.sin(a) * length * 0.6);
          ctx.lineTo(Math.cos(a) * length, Math.sin(a) * length); ctx.stroke();
          diamond(ctx, Math.cos(a) * length, Math.sin(a) * length, i % 2 ? 1 : 2, p.core);
        }
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, reach * 0.75, -0.45, 0.45); ctx.stroke();
      } else if (fx.kind === 'cast') {
        ctx.rotate(fx.a);
        if (flashes) this.halo(ctx, fx.tone, 3, 0, 32, k * 0.7);
        ctx.strokeStyle = p.edge; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, 8 + t * 14, -1.9, 1.9); ctx.stroke();
        ctx.fillStyle = p.edge;
        ctx.beginPath(); ctx.moveTo(-7, -3); ctx.lineTo(12 + t * 20, 0); ctx.lineTo(-7, 3); ctx.closePath(); ctx.fill();
        diamond(ctx, 3, 0, 2 + Math.round(k * 2), p.core);
        for (let i = 0; i < 4; i++) {
          const a = (i - 1.5) * 0.7, distance = 9 + t * 20;
          ctx.fillStyle = i % 2 ? p.core : p.edge;
          ctx.fillRect(Math.round(Math.cos(a) * distance), Math.round(Math.sin(a) * distance), 2, 2);
        }
      } else {
        const impact = fx.kind === 'impact', distance = 5 + t * (impact ? fx.radius : 19);
        if (flashes && (!impact || this.effects.length <= 32)) this.halo(ctx, fx.tone, 0, 0, impact ? fx.radius + 8 : 25, k * 0.65);
        ctx.rotate(fx.a);
        const count = impact ? 7 : 5;
        for (let i = 0; i < count; i++) {
          const a = i * TAU / count + fx.seed * 0.12;
          const r = distance * (0.6 + (i % 3) * 0.2);
          ctx.save(); ctx.rotate(a);
          ctx.fillStyle = i % 2 ? p.core : p.edge;
          ctx.fillRect(Math.round(r), -1, Math.max(2, Math.round(k * (impact ? fx.radius * 0.35 : 6))), 2);
          ctx.restore();
        }
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, 4 + t * (impact ? fx.radius * 0.6 : 17), fx.seed, fx.seed + Math.PI * 1.55); ctx.stroke();
        if (t < 0.6) diamond(ctx, 0, 0, Math.max(1, Math.round(k * 3)), p.core);
      }
      ctx.restore();
    }
  }

  drawProjectile(ctx, s, camX, camY, flashes = true) {
    const x = s.x - camX, y = s.y - camY;
    if (!visible(ctx, x, y, 65)) return;
    const salt = s.kind === 'sal', tone = s.tone || (salt ? 'salt' : 'ember'), p = palette(tone);
    const fade = clamp(s.life / 0.12, 0, 1);
    ctx.save();
    ctx.globalAlpha *= fade * (flashes ? 1 : 0.85);
    if (flashes) this.halo(ctx, tone, x, y, salt ? 20 : 29, salt ? 0.26 : 0.6);
    const tail = s.trail || [];
    // La estela sigue las posiciones reales: no atraviesa esquinas ni salta al lanzar.
    if (tail.length) {
      ctx.lineCap = 'round';
      for (let i = 0; i < tail.length; i++) {
        const from = tail[i], to = tail[i + 1] || s;
        const k = (i + 1) / tail.length;
        ctx.strokeStyle = `rgba(${p.rgb},${k * (salt ? 0.4 : 0.6)})`;
        ctx.lineWidth = salt ? 1 : 1 + k * 4;
        ctx.beginPath(); ctx.moveTo(from.x - camX, from.y - camY); ctx.lineTo(to.x - camX, to.y - camY); ctx.stroke();
      }
    }
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(s.a);
    ctx.fillStyle = p.edge;
    if (salt) {
      ctx.fillRect(-7, -1, 8, 2);
      ctx.fillRect(-2, -2, 4, 4);
      ctx.fillStyle = p.core; ctx.fillRect(-1, -2, 2, 3); ctx.fillRect(1, -1, 2, 2);
    } else {
      // Silueta de llama escalonada con una punta blanca y un pie de brasa.
      ctx.fillRect(-16, -1, 7, 2); ctx.fillRect(-11, -2, 9, 4); ctx.fillRect(-6, -3, 8, 6);
      ctx.fillStyle = p.core; ctx.fillRect(-4, -1, 8, 2); ctx.fillRect(-1, -2, 4, 4);
    }
    ctx.restore();
  }

  drawLanternAura(ctx, p, radius, clock, camX, camY, flashes = true) {
    const x = p.x - camX, y = p.y - camY, ember = palette('ember');
    if (!visible(ctx, x, y, radius + 12)) return;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.strokeStyle = `rgba(${ember.rgb},.13)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
    // Hitos de brasa sobre el alcance exacto; se mueven despacio, sin pulsos.
    const turn = flashes ? clock * 0.09 : 0;
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + turn, bx = Math.cos(a) * radius, by = Math.sin(a) * radius;
      ctx.fillStyle = i % 3 ? ember.edge : ember.core;
      ctx.globalAlpha = i % 3 ? 0.3 : 0.5;
      ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      ctx.strokeStyle = `rgba(${ember.rgb},.18)`;
      ctx.beginPath(); ctx.arc(0, 0, radius, a + 0.04, a + 0.12); ctx.stroke();
    }
    ctx.restore();
  }

  drawRosary(ctx, p, level, clock, camX, camY, flashes = true) {
    if (!level) return;
    const x = p.x - camX, y = p.y - 4 - camY, radius = 58 + 4 * level, count = 1 + level;
    if (!visible(ctx, x, y, radius + 20)) return;
    const pearl = palette('sacred');
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.strokeStyle = `rgba(${pearl.rgb},.15)`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
    for (let i = 0; i < count; i++) {
      const a = clock * 2.3 + i * TAU / count, bx = Math.cos(a) * radius, by = Math.sin(a) * radius;
      // El recorrido breve da peso al giro sin convertirlo en un escudo opaco.
      for (let trail = 2; trail >= 0; trail--) {
        ctx.strokeStyle = `rgba(${pearl.rgb},${(3 - trail) * (flashes ? 0.12 : 0.065)})`;
        ctx.lineWidth = trail === 0 ? 2 : 1;
        ctx.beginPath(); ctx.arc(0, 0, radius, a - 0.37 + trail * 0.09, a - 0.035); ctx.stroke();
      }
      if (flashes) this.halo(ctx, 'sacred', bx, by, 17, 0.35);
      diamond(ctx, bx, by, 4, '#25202e');
      diamond(ctx, bx, by, 3, pearl.edge);
      ctx.fillStyle = pearl.core; ctx.fillRect(Math.round(bx - 2), Math.round(by - 2), 3, 3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bx - 1), Math.round(by - 2), 1, 1);
      if (i === 0) {
        // La cuenta distinta termina en la pequeña cruz del rosario.
        ctx.fillStyle = pearl.edge;
        ctx.fillRect(Math.round(bx), Math.round(by + 5), 1, 7);
        ctx.fillRect(Math.round(bx - 2), Math.round(by + 7), 5, 1);
      }
    }
    ctx.restore();
  }
}
