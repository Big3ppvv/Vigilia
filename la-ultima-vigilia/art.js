/*
 * Sprites y luz: el pixel art se construye desde sprites.js y la oscuridad
 * solo se abre donde hay una vela. El camposanto está en world.js.
 */
import { TAU } from './util.js';
import { PALETTE, EMISSIVE, SPRITES, ICONS } from './sprites.js';

// Una misma paleta para el trazo del arma y la luz que deja en el camposanto.
export const ATTACK_PALETTE = Object.freeze({
  ember: Object.freeze({rgb: '255,116,46', edge: '#ff742e', core: '#fff2bc'}),
  salt: Object.freeze({rgb: '190,224,242', edge: '#bee0f2', core: '#f4fbff'}),
  sacred: Object.freeze({rgb: '238,205,129', edge: '#eecd81', core: '#fff4d8'})
});

export function makeCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function hash(x, y, seed = 1) {
  let n = Math.imul(x ^ seed, 374761393) + Math.imul(y, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/* ---------- sprites ---------- */

const cache = new Map();

function build(rows, mode) {
  const width = Math.max(...rows.map(r => r.length));
  const c = makeCanvas(width, rows.length), g = c.getContext('2d');
  let any = false;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x], color = PALETTE[ch];
      if (!color) continue;
      if (mode === 'glow' && !EMISSIVE.has(ch)) continue;
      g.fillStyle = mode === 'white' ? (ch === 'o' ? '#5b5a66' : '#f6f2ea') : color;
      g.fillRect(x, y, 1, 1);
      any = true;
    }
  });
  return any ? c : null;
}

export function sprite(key) {
  if (cache.has(key)) return cache.get(key);
  const rows = SPRITES[key] || ICONS[key] || SPRITES.hermano;
  const s = {base: build(rows, 'base'), glow: build(rows, 'glow'), white: build(rows, 'white'), w: Math.max(...rows.map(r => r.length)), h: rows.length};
  cache.set(key, s);
  return s;
}

/*
 * opts: scale, flip, bob, rot, sx, sy (estiramiento), alpha, layer ('base' | 'glow' | 'white').
 * El punto (x, y) es el centro del sprite.
 */
export function drawSprite(ctx, key, x, y, opts = {}) {
  const s = sprite(key);
  const img = s[opts.layer || 'base'];
  if (!img) return;
  const scale = opts.scale || 2;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (opts.alpha !== undefined) ctx.globalAlpha *= opts.alpha;
  ctx.translate(Math.round(x), Math.round(y + (opts.bob || 0)));
  if (opts.rot) ctx.rotate(opts.rot);
  ctx.scale((opts.flip ? -1 : 1) * (opts.sx || 1), opts.sy || 1);
  const w = s.w * scale, h = s.h * scale;
  ctx.drawImage(img, Math.round(-w / 2), Math.round(-h / 2), w, h);
  ctx.restore();
}

export function drawShadow(ctx, x, y, w, alpha = 0.45) {
  ctx.fillStyle = `rgba(2,3,8,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), Math.max(4, w), Math.max(2, w * 0.32), 0, 0, TAU);
  ctx.fill();
}

export function drawIcon(ctx, id, x, y, scale = 2) {
  drawSprite(ctx, id, x, y, {scale});
}

/* ---------- la oscuridad ---------- */

function holeSprite() {
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,1)');
  r.addColorStop(0.35, 'rgba(0,0,0,.93)');
  r.addColorStop(0.62, 'rgba(0,0,0,.55)');
  r.addColorStop(0.85, 'rgba(0,0,0,.16)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return c;
}

function glowSprite(rgb, core) {
  const c = makeCanvas(128, 128), g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, core || `rgba(${rgb},1)`);
  // Los ataques tienen un núcleo cálido o nacarado, sin blanquear todo el halo.
  if (core) r.addColorStop(0.1, `rgba(${rgb},.8)`);
  r.addColorStop(0.25, `rgba(${rgb},.45)`);
  r.addColorStop(0.6, `rgba(${rgb},.12)`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return c;
}

export class Lighting {
  constructor() {
    this.scale = 0.5;
    this.canvas = makeCanvas(2, 2);
    this.ctx = this.canvas.getContext('2d');
    this.hole = holeSprite();
    this.glows = {
      warm: glowSprite('255,170,92'),
      red: glowSprite('255,92,52'),
      blue: glowSprite('120,176,255'),
      pale: glowSprite('214,232,255'),
      white: glowSprite('255,246,226'),
      ...Object.fromEntries(Object.entries(ATTACK_PALETTE).map(([key, color]) => [key, glowSprite(color.rgb, color.core)]))
    };
    this.w = 1; this.h = 1;
  }

  resize(w, h) {
    this.w = w; this.h = h;
    this.canvas.width = Math.max(1, Math.ceil(w * this.scale));
    this.canvas.height = Math.max(1, Math.ceil(h * this.scale));
  }

  /*
   * Luces: x/y, r, i, c, g. Opcionales: a (radianes) y stretch (1–3).
   * La misma elipse abre la oscuridad y colorea el suelo: el fogonazo tiene
   * dirección, sin crear gradientes ni lienzos en cada fotograma.
   */
  stamp(ctx, image, L, radius, scale = 1) {
    const stretch = Math.max(1, Math.min(3, L.stretch || 1));
    const x = L.x * scale, y = L.y * scale, r = radius * scale;
    if (stretch === 1) {
      ctx.drawImage(image, x - r, y - r, r * 2, r * 2);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(L.a || 0);
    ctx.scale(stretch, 1);
    ctx.drawImage(image, -r, -r, r * 2, r * 2);
    ctx.restore();
  }

  visible(L, radius) {
    const extent = radius * Math.max(1, Math.min(3, L.stretch || 1));
    return radius > 0 && L.i > 0 && L.x + extent >= 0 && L.x - extent <= this.w && L.y + extent >= 0 && L.y - extent <= this.h;
  }

  /* darkness: 0 a 1. tint: color de la noche. beams: haces del faro. */
  render(ctx, lights, darkness, tint, beams = []) {
    if (darkness <= 0.005) return;
    const lc = this.ctx, s = this.scale, W = this.canvas.width, H = this.canvas.height;
    lc.globalCompositeOperation = 'source-over';
    lc.globalAlpha = 1;
    lc.clearRect(0, 0, W, H);
    lc.fillStyle = `rgba(${tint},${darkness})`;
    lc.fillRect(0, 0, W, H);
    lc.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      if (!this.visible(L, L.r)) continue;
      lc.globalAlpha = Math.min(1, L.i);
      this.stamp(lc, this.hole, L, L.r, s);
    }
    for (const b of beams) {
      lc.globalAlpha = b.i;
      const g = lc.createRadialGradient(b.x * s, b.y * s, 0, b.x * s, b.y * s, b.len * s);
      g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(0.5, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.moveTo(b.x * s, b.y * s);
      lc.lineTo((b.x + Math.cos(b.a - b.spread) * b.len) * s, (b.y + Math.sin(b.a - b.spread) * b.len) * s);
      lc.lineTo((b.x + Math.cos(b.a + b.spread) * b.len) * s, (b.y + Math.sin(b.a + b.spread) * b.len) * s);
      lc.closePath(); lc.fill();
    }
    lc.globalAlpha = 1;
    lc.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, this.w, this.h);
    ctx.restore();
  }

  /* Halo de color aditivo alrededor de las luces. */
  glow(ctx, lights, strength) {
    if (strength <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingEnabled = true;
    for (const L of lights) {
      const g = L.g ?? 0.5;
      if (g <= 0) continue;
      const R = L.r * 0.9;
      if (!this.visible(L, R)) continue;
      ctx.globalAlpha = Math.min(1, L.i * g * strength);
      this.stamp(ctx, this.glows[L.c] || this.glows.warm, L, R);
    }
    ctx.restore();
  }
}

/* ---------- retratos para elegir a quién vela ---------- */

export function drawPortrait(c, key, width, height) {
  c.save();
  c.clearRect(0, 0, width, height);
  const bg = c.createRadialGradient(width * 0.5, height * 0.62, 2, width * 0.5, height * 0.62, width * 0.75);
  bg.addColorStop(0, key === 'julian' ? '#3a3226' : key === 'matilde' ? '#2f2a36' : '#3a2a26');
  bg.addColorStop(1, '#0b0d12');
  c.fillStyle = bg; c.fillRect(0, 0, width, height);
  const glow = c.createRadialGradient(width * 0.72, height * 0.5, 1, width * 0.72, height * 0.5, width * 0.45);
  glow.addColorStop(0, 'rgba(255,176,92,.28)'); glow.addColorStop(1, 'rgba(255,176,92,0)');
  c.fillStyle = glow; c.fillRect(0, 0, width, height);
  const s = sprite(key), scale = Math.max(2, Math.floor(Math.min(width / (s.w + 2), height / (s.h + 1))));
  drawSprite(c, key, width / 2, height - (s.h * scale) / 2 - 2, {scale});
  c.restore();
}
