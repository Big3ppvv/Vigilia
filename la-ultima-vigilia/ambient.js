/*
 * Lo que la noche pone por su cuenta: el orballo, las hojas que arrastra el
 * viento, las polillas que rondan los cirios y las huellas que quedan en el
 * suelo. Nada de esto cambia el juego; todo tiene un máximo y caduca solo.
 */
import { clamp } from './util.js';
import { hash } from './art.js';

const MAX_DECALS = 90;
const DROPS = 150;
const LEAVES = 22;
const mod = (v, m) => ((v % m) + m) % m;

/* Cada huella es un puñado de píxeles fijos: [dx, dy, ancho, alto, color]. */
const DECALS = {
  scorch: seed => [[-2, 0, 5, 2, '#0a0d0c'], [-1, -1, 3, 4, '#0a0d0c'], [hash(seed, 1, 5) > 0.5 ? 2 : -3, 1, 2, 1, '#151a18'], [0, 0, 1, 1, '#3a2218']],
  salt: seed => Array.from({length: 7}, (_, i) => [Math.round((hash(seed, i, 6) - 0.5) * 18), Math.round((hash(seed, i, 7) - 0.5) * 10), i % 3 ? 1 : 2, 1, i % 2 ? '#c9d6dc' : '#8fa0a8']),
  wax: seed => [[0, 0, 3, 2, '#c9bb9a'], [1, -1, 2, 1, '#f1e8d2'], [hash(seed, 1, 8) > 0.5 ? 4 : -3, 1, 1, 1, '#c9bb9a']],
  wet: seed => [[-6, -1, 12, 3, '#0a1620'], [-4, -2, 8, 5, '#0a1620'], [Math.round((hash(seed, 1, 9) - 0.5) * 6), -1, 3, 1, '#1d3442']],
  ash: seed => Array.from({length: 5}, (_, i) => [Math.round((hash(seed, i, 10) - 0.5) * 12), Math.round((hash(seed, i, 11) - 0.5) * 6), 2, 1, i % 2 ? '#3a3d42' : '#26292d']),
  straw: seed => Array.from({length: 7}, (_, i) => [Math.round((hash(seed, i, 12) - 0.5) * 22), Math.round((hash(seed, i, 13) - 0.5) * 10), i % 2 ? 3 : 1, i % 2 ? 1 : 3, i % 3 ? '#9a7a3a' : '#d6b466']),
  feather: seed => Array.from({length: 4}, (_, i) => [Math.round((hash(seed, i, 14) - 0.5) * 16), Math.round((hash(seed, i, 15) - 0.5) * 8), 3, 1, i % 2 ? '#e6dabd' : '#9e8664']),
  cloth: seed => Array.from({length: 4}, (_, i) => [Math.round((hash(seed, i, 16) - 0.5) * 14), Math.round((hash(seed, i, 17) - 0.5) * 6), 3, 2, i % 2 ? '#2e2a38' : '#1d1d27'])
};

export class Ambient {
  constructor() {
    this.decals = [];
    this.enabled = true;
  }

  clear() { this.decals.length = 0; }

  /* Deja una huella en el suelo durante unos segundos. */
  decal(kind, x, y, life = 9) {
    if (!DECALS[kind] || !Number.isFinite(x + y)) return;
    if (this.decals.length >= MAX_DECALS) this.decals.shift();
    const seed = Math.floor(Math.random() * 9999);
    this.decals.push({x: Math.round(x), y: Math.round(y), life, total: life, cells: DECALS[kind](seed)});
  }

  update(dt) {
    if (!this.decals.length) return;
    for (const d of this.decals) d.life -= dt;
    if (this.decals[0].life <= 0 || this.decals.length > MAX_DECALS / 2) this.decals = this.decals.filter(d => d.life > 0);
  }

  drawDecals(ctx, camX, camY, w, h) {
    if (!this.decals.length) return;
    ctx.save();
    for (const d of this.decals) {
      const x = d.x - camX, y = d.y - camY;
      if (d.life <= 0 || x < -30 || x > w + 30 || y < -20 || y > h + 20) continue;
      ctx.globalAlpha = clamp(d.life / 2.5, 0, 1) * 0.85;
      for (const [dx, dy, cw, ch, color] of d.cells) { ctx.fillStyle = color; ctx.fillRect(x + dx * 2, y + dy * 2, cw * 2, ch * 2); }
    }
    ctx.restore();
  }

  /*
   * Orballo y hojas. Se dibujan antes que la oscuridad: solo se ven donde hay
   * luz, como la lluvia delante de un farol. rain y wind van de 0 a 1.
   */
  drawWeather(ctx, camX, camY, w, h, time, rain, wind, gustA) {
    if (!this.enabled) return;
    ctx.save();
    const slant = 0.22 + wind * 0.5, dirX = Math.cos(gustA) >= 0 ? 1 : -1;
    if (rain > 0.02) {
      const n = Math.round(DROPS * clamp(rain, 0, 1));
      ctx.fillStyle = `rgba(176,196,210,${0.16 + rain * 0.1})`;
      for (let i = 0; i < n; i++) {
        const speed = 520 + hash(i, 3, 61) * 260;
        const y = mod(hash(i, 1, 62) * (h + 40) + time * speed - camY, h + 40) - 20;
        const x = mod(hash(i, 2, 63) * (w + 60) + time * speed * slant * dirX - camX, w + 60) - 30;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 6);
        ctx.fillRect(Math.round(x + dirX), Math.round(y + 6), 1, 4);
      }
    }
    const leaves = Math.round(LEAVES * clamp(0.25 + wind, 0, 1));
    for (let i = 0; i < leaves; i++) {
      const speed = (40 + hash(i, 1, 64) * 70) * (1 + wind * 5) * dirX;
      const x = mod(hash(i, 2, 65) * (w + 80) + time * speed - camX, w + 80) - 40;
      const y = mod(hash(i, 3, 66) * (h + 60) + time * (14 + hash(i, 4, 67) * 22) - camY, h + 60) - 30 + Math.sin(time * (1.2 + hash(i, 5, 68)) + i) * 9;
      const flip = Math.sin(time * (3 + hash(i, 6, 69) * 4) + i) > 0;
      ctx.fillStyle = i % 3 ? '#4a3420' : '#6b4a2a';
      ctx.fillRect(Math.round(x), Math.round(y), flip ? 4 : 2, flip ? 2 : 4);
    }
    ctx.restore();
  }

  /* Polillas en torno a las llamas de los cirios, ya por encima de la oscuridad. */
  drawMoths(ctx, flames, time) {
    if (!this.enabled) return;
    ctx.save();
    ctx.fillStyle = 'rgba(241,232,210,.72)';
    let k = 0;
    for (const f of flames) {
      if (f.kind !== 'cirio') continue;
      for (let i = 0; i < 3; i++, k++) {
        const s = 2.1 + hash(k, 1, 70) * 2.4, ph = hash(k, 2, 71) * 6.28;
        const x = f.x + Math.cos(time * s + ph) * (9 + i * 4) + Math.sin(time * 7 + k) * 2;
        const y = f.y - 2 + Math.sin(time * s * 1.3 + ph) * (6 + i * 2);
        ctx.fillRect(Math.round(x), Math.round(y), Math.sin(time * 22 + k) > 0 ? 3 : 2, 1);
      }
    }
    ctx.restore();
  }
}
