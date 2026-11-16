/*
 * El golpe tiene tres tiempos: la mano que lo suelta, su recorrido y el contacto.
 * Las luces viven en Lighting; aquí quedan las siluetas luminosas y el nácar.
 * Ningún efecto cambia el daño ni la duración de las armas.
 */
import { TAU } from './util.js';
import { ATTACK_PALETTE, makeCanvas } from './art.js';

const MAX_EFFECTS = 96;
const MAX_LIGHTS = 24;
const priority = kind => kind === 'surge' || kind === 'bell' ? 3 : ['cast', 'blast', 'dash'].includes(kind) ? 2 : kind === 'impact' ? 0 : 1;
const LIFETIMES = {cast: 0.16, blast: 0.23, bell: 0.54, impact: 0.2, bead: 0.24, moth: 0.26, dash: 0.24, death: 0.3, surge: 0.58};
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const palette = tone => ATTACK_PALETTE[tone] || ATTACK_PALETTE.ember;

function diamond(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x - size / 2), Math.round(y - size), size, size * 2);
  ctx.fillRect(Math.round(x - size), Math.round(y - size / 2), size * 2, size);
}

// Fragmentos de luz, nunca partículas persistentes ni azar por fotograma.
function rays(ctx, count, radius, length, seed, p) {
  for (let i = 0; i < count; i++) {
    const a = i * TAU / count + seed, r = radius * (0.7 + (i % 3) * 0.15);
    ctx.save(); ctx.rotate(a);
    ctx.fillStyle = i % 3 ? p.edge : p.core;
    ctx.fillRect(Math.round(r), -1, Math.max(2, Math.round(length * (0.5 + (i % 4) * 0.2))), i % 3 ? 1 : 2);
    ctx.restore();
  }
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
      const wave = fx.kind === 'bell' || fx.kind === 'surge', directional = ['blast', 'cast', 'dash'].includes(fx.kind);
      const radius = wave ? 48 + fx.radius * progress * 0.72 : impact ? fx.radius + 20 : fx.kind === 'blast' ? 74 : fx.kind === 'death' ? fx.radius + 24 : 48;
      lights.push({x: fx.x - camX, y: fx.y - camY, r: radius, i: k * (wave ? 0.72 : impact ? crowded ? 0.3 : 0.64 : 0.95),
        c: fx.tone, g: wave ? 0.5 : impact ? 0.6 : 0.9, a: fx.a, stretch: directional ? 1.8 : 1});
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
      if (fx.kind === 'dash') {
        // La salida de la esquiva queda localizada; las siluetas marcan el trayecto.
        if (flashes) {
          ctx.rotate(fx.a);
          this.halo(ctx, fx.tone, 0, 0, 40 + t * 22, k * 0.85);
          for (let i = -3; i <= 3; i++) {
            const length = (32 + fx.radius * 0.55) * k * (1 - Math.abs(i) * 0.12);
            ctx.strokeStyle = i % 2 ? p.edge : p.core;
            ctx.lineWidth = i ? 1 : 3;
            ctx.beginPath(); ctx.moveTo(-14 - t * 26, i * 5); ctx.lineTo(-14 - t * 26 - length, i * (5 + t * 3)); ctx.stroke();
          }
          ctx.strokeStyle = p.core; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, 12 + t * 28, -1.1, 1.1); ctx.stroke();
        }
      } else if (fx.kind === 'surge' || fx.kind === 'death') {
        const surge = fx.kind === 'surge';
        const radius = 6 + (fx.radius - 6) * (1 - (1 - t) ** 3);
        if (flashes) {
          this.halo(ctx, fx.tone, 0, 0, 30 + radius * 0.8, k * (surge ? 0.75 : 0.6));
          rays(ctx, surge ? 18 : 10, radius * 0.72, k * (surge ? 28 : 15), fx.seed * 0.1, p);
          ctx.strokeStyle = p.core; ctx.lineWidth = 1 + k * (surge ? 3 : 1);
          ctx.beginPath(); ctx.arc(0, 0, radius, 0, TAU); ctx.stroke();
          if (surge) {
            ctx.strokeStyle = p.edge; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, radius * 0.74, 0, TAU); ctx.stroke();
            for (let i = 0; i < 4; i++) {
              ctx.save(); ctx.rotate(i * TAU / 4 + fx.seed * 0.08);
              ctx.fillStyle = p.core;
              ctx.fillRect(-1, -Math.round(radius * 0.6), 2, Math.round(radius * 0.38));
              ctx.restore();
            }
          }
          if (t < 0.4) diamond(ctx, 0, 0, Math.max(2, Math.round(k * (surge ? 9 : 5))), p.core);
        }
      } else if (fx.kind === 'bell') {
        const radius = 12 + (fx.radius - 12) * (1 - (1 - t) ** 2);
        if (flashes) {
          this.halo(ctx, fx.tone, 0, 0, 46 + radius * 0.75, k * 0.55);
          rays(ctx, 20, radius * 0.88, 8 + k * 18, fx.seed * 0.08, p);
        }
        // Frentes concéntricos, finos al llegar al borde del alcance real.
        for (let ring = 0; ring < (flashes ? 4 : 3); ring++) {
          const r = Math.max(3, radius - ring * (9 + t * 9));
          ctx.globalAlpha *= ring ? 0.7 : 1;
          ctx.strokeStyle = ring === 0 ? p.core : p.edge;
          ctx.lineWidth = ring === 0 ? 1.4 + k * (flashes ? 3.8 : 1.8) : 1;
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
        if (flashes) this.halo(ctx, fx.tone, 14, 0, 52 + t * 24, k * 0.95);
        const reach = 18 + t * (flashes ? 77 : 57), spread = 10 + t * 20;
        ctx.fillStyle = p.edge; ctx.globalAlpha *= 0.25;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(reach, -spread); ctx.lineTo(reach + 12, 0); ctx.lineTo(reach, spread); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = k * (flashes ? 0.95 : 0.6);
        const fragments = flashes ? 11 : 7;
        for (let i = 0; i < fragments; i++) {
          const a = (i - (fragments - 1) / 2) * 0.075, length = reach * (0.65 + (i % 3) * 0.15);
          ctx.strokeStyle = i % 2 ? p.core : p.edge; ctx.lineWidth = i === Math.floor(fragments / 2) ? 3 : 1;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * length * 0.6, Math.sin(a) * length * 0.6);
          ctx.lineTo(Math.cos(a) * length, Math.sin(a) * length); ctx.stroke();
          diamond(ctx, Math.cos(a) * length, Math.sin(a) * length, i % 2 ? 1 : 2, p.core);
        }
        ctx.strokeStyle = p.edge; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, reach * 0.75, -0.45, 0.45); ctx.stroke();
      } else if (fx.kind === 'cast') {
        ctx.rotate(fx.a);
        if (flashes) {
          this.halo(ctx, fx.tone, 3, 0, 42, k * 0.95);
          rays(ctx, 6, 10 + t * 20, k * 14, 0, p);
        }
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
        if (flashes && (!impact || this.effects.length <= 32)) this.halo(ctx, fx.tone, 0, 0, impact ? fx.radius + 20 : 32, k * 0.85);
        ctx.rotate(fx.a);
        if (flashes && impact) {
          ctx.strokeStyle = p.core; ctx.lineWidth = 2 * k + 1;
          const cut = (8 + fx.radius * 0.7) * k;
          ctx.beginPath(); ctx.moveTo(-cut, -cut); ctx.lineTo(cut, cut); ctx.moveTo(-cut * 0.6, cut * 0.6); ctx.lineTo(cut * 0.6, -cut * 0.6); ctx.stroke();
        }
        const count = impact ? flashes ? 10 : 7 : 5;
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
    if (flashes) this.halo(ctx, tone, x, y, salt ? 25 : 38, salt ? 0.4 : 0.85);
    const tail = s.trail || [];
    // La estela sigue las posiciones reales: no atraviesa esquinas ni salta al lanzar.
    if (tail.length) {
      ctx.lineCap = 'round';
      for (let i = 0; i < tail.length; i++) {
        const from = tail[i], to = tail[i + 1] || s;
        const k = (i + 1) / tail.length;
        ctx.strokeStyle = `rgba(${p.rgb},${k * (salt ? 0.4 : flashes ? 0.8 : 0.6)})`;
        ctx.lineWidth = salt ? 1 : 1 + k * (flashes ? 6 : 4);
        ctx.beginPath(); ctx.moveTo(from.x - camX, from.y - camY); ctx.lineTo(to.x - camX, to.y - camY); ctx.stroke();
        if (flashes) {
          ctx.strokeStyle = p.core; ctx.lineWidth = salt ? 1 : 2;
          ctx.globalAlpha = fade * k * 0.85;
          ctx.beginPath(); ctx.moveTo(from.x - camX, from.y - camY); ctx.lineTo(to.x - camX, to.y - camY); ctx.stroke();
          ctx.globalAlpha = fade;
          if (!salt && i % 2 === 0) {
            const offset = Math.sin(s.life * 18 + i) * 4;
            ctx.fillStyle = p.edge;
            ctx.fillRect(Math.round(from.x - camX - Math.sin(s.a) * offset), Math.round(from.y - camY + Math.cos(s.a) * offset), 2, 2);
          }
        }
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
      if (flashes) {
        ctx.fillStyle = p.edge; ctx.fillRect(-20, -1, 6, 2);
        ctx.fillStyle = p.core; ctx.fillRect(4, -1, 4, 2);
      }
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
    // Brasas que corren por el alcance real, sin tapar las amenazas del interior.
    const turn = flashes ? clock * 0.7 : 0;
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16 + turn, bx = Math.cos(a) * radius, by = Math.sin(a) * radius;
      ctx.fillStyle = i % 3 ? ember.edge : ember.core;
      ctx.globalAlpha = i % 3 ? 0.3 : 0.5;
      ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      ctx.strokeStyle = `rgba(${ember.rgb},.18)`;
      ctx.beginPath(); ctx.arc(0, 0, radius, a + 0.04, a + 0.12); ctx.stroke();
      if (flashes && i % 4 === 0) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = ember.core; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, radius, a - 0.13, a); ctx.stroke();
        diamond(ctx, bx, by, 2, ember.core);
      }
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
        ctx.strokeStyle = `rgba(${pearl.rgb},${(3 - trail) * (flashes ? 0.19 : 0.065)})`;
        ctx.lineWidth = trail === 0 ? flashes ? 3 : 2 : 1;
        ctx.beginPath(); ctx.arc(0, 0, radius, a - (flashes ? 0.65 : 0.37) + trail * 0.09, a - 0.035); ctx.stroke();
      }
      if (flashes) {
        this.halo(ctx, 'sacred', bx, by, 23, 0.55);
        ctx.strokeStyle = pearl.core; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, radius, a - 0.23, a - 0.035); ctx.stroke();
      }
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
