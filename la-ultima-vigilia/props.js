/*
 * Piezas de pixel art del camposanto: lápidas, cruces, cipreses, la ermita, el
 * ataúd, los cirios, faroles y muros. Cada función prepara un lienzo pequeño
 * una sola vez; la arena las coloca y las reutiliza en cada fotograma.
 */
import { TAU } from './util.js';
import { makeCanvas, hash } from './art.js';

/* ---------- piezas ---------- */

export const INK = '#07080d', SHADE = 'rgba(2,3,8,.45)';
const S0 = '#2a3134', S1 = '#353d40', S2 = '#3c4447', S3 = '#4a5356', S4 = '#5a6366', S5 = '#6a7274';
const MOSS = '#2f4632', MOSS2 = '#3d5b40', LICHEN = '#7b7742';

const r = (g, x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };

/* Lienzo pequeño con el origen en la base de la pieza (ox, oy). */
export function spr(w, h, ox, oy, paint) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(ox, oy);
  paint(g);
  return {c, ox, oy, w, h};
}

/* Inclina una pieza un píxel cada «every» filas, sin suavizar: las cruces viejas se vencen. */
export function lean(s, every, dir) {
  const shift = Math.ceil(s.h / every), c = makeCanvas(s.w + shift, s.h), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < s.h; y++) {
    const dx = Math.floor((s.oy - y) / every) * dir + (dir < 0 ? shift : 0);
    if (dx < 0 || dx > shift) { g.drawImage(s.c, 0, y, s.w, 1, Math.max(0, Math.min(shift, dx)), y, s.w, 1); continue; }
    g.drawImage(s.c, 0, y, s.w, 1, dx, y, s.w, 1);
  }
  return {c, ox: s.ox + (dir < 0 ? shift : 0), oy: s.oy, w: s.w + shift, h: s.h};
}

export function disc(g, cx, cy, rad, color) {
  g.fillStyle = color;
  for (let dy = -rad; dy <= rad; dy++) {
    const hw = Math.floor(Math.sqrt(rad * rad - dy * dy));
    g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

export function slab(kind) {
  if (kind === 1) return spr(24, 13, 12, 3, g => {       // túmulo de tierra con piedras
    r(g, -10, 7, 21, 2, SHADE);
    r(g, -9, 0, 18, 7, INK); r(g, -8, 1, 16, 5, '#2c261e'); r(g, -6, 0, 12, 1, '#2c261e'); r(g, -8, 1, 16, 1, '#3a3227');
    for (let i = 0; i < 6; i++) { r(g, -9 + i * 3, 6, 2, 1, i % 2 ? S3 : S2); r(g, -8 + i * 3, 0, 2, 1, i % 2 ? S2 : S1); }
    r(g, -4, 3, 2, 1, '#1f1b15'); r(g, 3, 4, 3, 1, '#1f1b15');
  });
  if (kind === 2) return spr(24, 15, 12, 4, g => {       // marco de piedra con grava blanca
    r(g, -11, 7, 23, 3, SHADE);
    r(g, -10, -2, 20, 11, INK); r(g, -9, -1, 18, 9, S3); r(g, -9, -1, 18, 1, S4);
    r(g, -7, 1, 14, 5, '#8d918b'); r(g, -7, 1, 14, 1, '#a8aca4');
    for (let i = 0; i < 9; i++) r(g, -6 + (i * 5) % 13, 2 + i % 4, 1, 1, i % 2 ? '#c4c7bf' : '#6f736e');
    r(g, -9, 7, 18, 1, S0);
  });
  return spr(26, 16, 13, 4, g => {                       // losa de granito
    r(g, -12, 7, 25, 4, SHADE);
    r(g, -10, -2, 20, 11, INK); r(g, -9, -1, 18, 9, S2); r(g, -9, -1, 18, 2, '#4d5659'); r(g, -9, 6, 18, 2, S0);
    r(g, -6, 2, 12, 1, S1); r(g, -6, 4, 9, 1, S1);
    r(g, -6, -1, 3, 2, MOSS); r(g, 5, 0, 2, 2, MOSS); r(g, -9, 5, 2, 1, MOSS);
  });
}

export function headstone(kind) {
  switch (kind) {
    case 1: return spr(16, 20, 8, 19, g => {            // cabecera con letras gastadas
      r(g, -7, -16, 14, 16, INK); r(g, -6, -15, 12, 14, S3); r(g, -5, -17, 10, 2, INK); r(g, -5, -16, 10, 2, S4); r(g, 4, -14, 2, 13, S1);
      for (let i = 0; i < 4; i++) r(g, -4, -12 + i * 3, i === 3 ? 5 : 8, 1, '#30383b');
      r(g, -6, -4, 3, 3, MOSS); r(g, 3, -3, 3, 2, MOSS);
    });
    case 2: return spr(16, 32, 8, 31, g => {            // cruz de piedra sobre peana
      r(g, -6, -6, 12, 6, INK); r(g, -5, -5, 10, 4, S3); r(g, -5, -5, 10, 1, S4);
      r(g, -2, -29, 5, 24, INK); r(g, -7, -23, 15, 5, INK);
      r(g, -1, -28, 3, 23, S3); r(g, -6, -22, 13, 3, S3); r(g, -1, -28, 1, 23, S5); r(g, -6, -22, 13, 1, S4); r(g, 1, -20, 1, 15, S1);
      r(g, -1, -9, 2, 2, LICHEN); r(g, 4, -21, 2, 1, LICHEN);
    });
    case 3: return spr(26, 28, 13, 27, g => {           // panteón pequeño con retrato de porcelana
      r(g, -12, -18, 24, 18, INK); r(g, -11, -17, 22, 16, S3); r(g, -11, -17, 22, 1, S5);
      for (let i = 0; i < 6; i++) { r(g, -10 + i, -19 - i, 20 - i * 2, 1, INK); if (i < 5) r(g, -9 + i, -19 - i, 18 - i * 2, 1, i ? S4 : S5); }
      r(g, -1, -26, 2, 4, INK); r(g, -3, -25, 6, 1, INK);
      r(g, -9, -15, 2, 14, S4); r(g, 7, -15, 2, 14, S1);
      r(g, -3, -14, 6, 7, INK); r(g, -2, -13, 4, 5, '#cfc8b8'); r(g, -1, -12, 2, 2, '#7a6a5a');
      for (let i = 0; i < 3; i++) r(g, -5, -5 + i * 2, i === 2 ? 6 : 10, 1, '#30383b');
      r(g, -11, -3, 3, 2, MOSS);
    });
    case 4: return spr(16, 18, 8, 17, g => {            // piedra vieja, rota y con musgo
      r(g, -6, -13, 12, 13, INK); r(g, -5, -12, 10, 11, S2); r(g, -4, -14, 6, 2, INK); r(g, -3, -13, 4, 1, S3); r(g, 2, -13, 3, 2, INK);
      r(g, 3, -11, 2, 10, S0); r(g, -5, -12, 2, 4, S3);
      r(g, -5, -6, 5, 5, MOSS); r(g, -4, -7, 2, 1, MOSS2); r(g, 0, -3, 4, 2, MOSS); r(g, -2, -10, 2, 1, LICHEN);
      r(g, -1, -9, 1, 5, '#262d30'); r(g, 0, -5, 2, 1, '#262d30');
    });
    case 5: return spr(10, 12, 5, 11, g => {            // sepultura de niño, mármol blanco
      r(g, -4, -9, 8, 9, INK); r(g, -3, -8, 6, 7, '#b4b9b3'); r(g, -3, -8, 6, 1, '#dadcd5'); r(g, -2, -10, 4, 1, INK); r(g, -2, -9, 4, 1, '#dadcd5');
      r(g, 2, -7, 1, 6, '#8d928d'); r(g, -1, -7, 1, 4, '#6f746f'); r(g, -2, -6, 3, 1, '#6f746f');
    });
    default: return spr(16, 20, 8, 19, g => {           // cabecera redondeada con cruz
      r(g, -7, -16, 14, 16, INK); r(g, -6, -15, 12, 14, S3); r(g, -5, -17, 10, 2, INK); r(g, -5, -16, 10, 2, S4); r(g, 4, -14, 2, 13, S1);
      r(g, -1, -13, 2, 8, S0); r(g, -3, -11, 6, 2, S0);
      r(g, -6, -3, 3, 2, MOSS); r(g, 4, -2, 2, 2, MOSS);
    });
  }
}

export function ironCross() {
  return spr(16, 32, 8, 30, g => {
    r(g, -6, -1, 12, 3, SHADE);
    r(g, -4, -4, 8, 4, INK); r(g, -3, -3, 6, 3, S0); r(g, -3, -3, 6, 1, S1);
    r(g, -1, -29, 3, 26, INK); r(g, -7, -23, 15, 3, INK);
    r(g, 0, -28, 1, 25, '#3a3f4a'); r(g, -6, -22, 13, 1, '#3a3f4a');
    for (const [x, y] of [[-3, -25], [3, -25], [-3, -19], [3, -19]]) r(g, x, y, 1, 1, '#3a3f4a');
    r(g, -1, -30, 3, 1, INK); r(g, 0, -17, 1, 1, '#565c68'); r(g, 0, -27, 1, 2, '#565c68');
  });
}

export function woodCross() {
  return spr(16, 28, 8, 26, g => {
    r(g, -6, -1, 12, 3, SHADE);
    r(g, -2, -24, 4, 24, INK); r(g, -7, -18, 14, 4, INK);
    r(g, -1, -23, 2, 22, '#5a3e27'); r(g, -6, -17, 12, 2, '#5a3e27'); r(g, -1, -23, 1, 22, '#7a5434'); r(g, -6, -17, 12, 1, '#7a5434');
    r(g, 0, -12, 1, 3, '#3a2a1c'); r(g, 2, -17, 1, 1, '#3a2a1c');
  });
}

export function cypress(seed, bend = 0) {
  const height = 46 + Math.floor(hash(seed, 1, 8) * 16);
  return spr(30, height + 10, 15, height + 7, g => {
    g.fillStyle = SHADE; g.fillRect(-9, -1, 20, 3); g.fillRect(-6, 2, 14, 1);
    r(g, -2, -5, 4, 6, INK); r(g, -1, -5, 2, 6, '#2b1f16');
    for (let i = 0; i < height; i += 2) {
      const t = i / height, wide = (Math.sin(t * Math.PI) * 0.85 + 0.15) * (6.2 + hash(seed, i, 2) * 1.6) * (1 - t * 0.35);
      const jag = Math.floor(hash(seed, i, 4) * 2), off = Math.round(bend * t * t * 9), y = -5 - i - 2;
      const w = Math.max(1, Math.round(wide));
      r(g, -w - 1 - jag + off, y, w * 2 + 2 + jag, 3, INK);
      r(g, -w - jag + off, y, w * 2 + jag, 2, '#12211a');
      r(g, Math.round(-w * 0.5) + off, y, Math.max(1, Math.round(w * 0.7)), 2, '#1c3226');
      if (hash(seed, i, 6) > 0.7) r(g, Math.round(-w * 0.3) + off, y, 1, 1, '#27432f');
    }
  });
}

export function pine(seed) {
  return spr(34, 66, 17, 64, g => {
    r(g, -1, -14, 3, 14, '#0b0d0c');
    for (let tier = 0; tier < 6; tier++) {
      const top = -60 + tier * 8, w = 4 + tier * 2 + Math.floor(hash(seed, tier, 3) * 2);
      for (let k = 0; k < 9; k++) {
        const hw = Math.max(1, Math.round(w * (k + 1) / 9));
        r(g, -hw, top + k, hw * 2 + 1, 1, k > 6 ? '#070d0b' : '#0b1512');
      }
      r(g, -Math.round(w * 0.4), top + 2, Math.max(1, Math.round(w * 0.4)), 1, '#11201a');
    }
  });
}

export function angel() {
  return spr(22, 40, 11, 38, g => {
    r(g, -9, -1, 18, 3, SHADE);
    r(g, -7, -9, 14, 9, INK); r(g, -6, -8, 12, 7, S3); r(g, -6, -8, 12, 1, '#5d6669'); r(g, 4, -7, 2, 6, S1);
    r(g, -9, -31, 6, 16, INK); r(g, 3, -31, 6, 16, INK);
    r(g, -8, -30, 4, 14, '#7c8388'); r(g, 4, -30, 4, 14, '#7c8388'); r(g, -8, -30, 2, 10, '#9aa1a5'); r(g, 6, -30, 2, 10, '#9aa1a5');
    r(g, -8, -22, 3, 1, '#5d666b'); r(g, 5, -24, 3, 1, '#5d666b');
    r(g, -3, -33, 6, 25, INK); r(g, -2, -27, 4, 18, '#9aa1a5'); r(g, -2, -27, 1, 18, '#b6bcbf');
    r(g, -2, -32, 4, 5, '#9aa1a5'); r(g, -1, -31, 2, 2, '#b6bcbf'); r(g, -1, -28, 2, 1, '#7c8388'); r(g, -3, -25, 6, 2, '#7c8388');
    r(g, -2, -12, 2, 2, MOSS); r(g, 1, -20, 1, 2, LICHEN);
  });
}

export function niches(seed) {
  const votives = [];
  const s = spr(68, 50, 34, 46, g => {
    r(g, -33, -1, 66, 4, SHADE);
    r(g, -32, -45, 64, 45, INK); r(g, -31, -44, 62, 43, '#535b5d'); r(g, -31, -44, 62, 3, S5);
    r(g, -33, -47, 66, 3, INK); r(g, -32, -46, 64, 1, '#7d8587');
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
      const nx = -29 + col * 12, ny = -40 + row * 13, h = hash(seed + col, row, 77);
      r(g, nx, ny, 11, 11, INK); r(g, nx + 1, ny + 1, 9, 9, row === 1 && col === 2 ? S0 : '#3e4648');
      r(g, nx + 2, ny + 3, 6, 1, '#2c3336'); r(g, nx + 2, ny + 5, 5, 1, '#2c3336');
      if (h > 0.62) { r(g, nx + 7, ny + 7, 2, 2, h > 0.8 ? '#e8c25a' : '#ebe8dc'); r(g, nx + 7, ny + 9, 2, 1, '#26402c'); }
      if (h < 0.22) { r(g, nx + 2, ny + 6, 2, 3, '#5e1d14'); r(g, nx + 2, ny + 6, 1, 2, '#a8331f'); votives.push({dx: (nx + 3) * 2, dy: (ny + 5) * 2}); }
    }
    r(g, -31, -6, 6, 5, MOSS); r(g, 22, -4, 8, 3, MOSS); r(g, -10, -2, 5, 1, MOSS2);
  });
  return {tall: s, votives};
}

export function votiveSprite() {
  return spr(6, 8, 3, 6, g => { r(g, -2, 0, 4, 1, INK); r(g, -2, -4, 4, 4, '#5e1d14'); r(g, -1, -4, 2, 3, '#a8331f'); r(g, -2, -5, 4, 1, INK); });
}

export function flowersSprite(seed, pot) {
  if (pot) return spr(12, 12, 6, 10, g => {             // maceta de crisantemos
    r(g, -3, -3, 6, 4, INK); r(g, -2, -3, 4, 3, '#8a4a2e'); r(g, -2, -3, 4, 1, '#a85d3a');
    disc(g, 0, -6, 4, '#1f3526');
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + seed, x = Math.round(Math.cos(a) * 3), y = Math.round(-6 + Math.sin(a) * 2.4);
      r(g, x, y, 2, 2, hash(seed, i, 9) > 0.45 ? '#ebe8dc' : '#e8c25a'); r(g, x + 1, y + 1, 1, 1, 'rgba(0,0,0,.25)');
    }
    r(g, 0, -7, 2, 2, hash(seed, 8, 9) > 0.5 ? '#ebe8dc' : '#e8c25a');
  });
  return spr(14, 8, 7, 5, g => {                        // flores sueltas sobre la losa
    for (let i = 0; i < 6; i++) {
      const fx = Math.round((hash(seed, i, 3) - 0.5) * 10), fy = Math.round((hash(seed, i, 5) - 0.5) * 4);
      r(g, fx, fy, 2, 1, '#26402c'); r(g, fx, fy - 2, 2, 2, hash(seed, i, 9) > 0.45 ? '#ebe8dc' : '#e8c25a'); r(g, fx + 1, fy - 1, 1, 1, 'rgba(0,0,0,.25)');
    }
  });
}

export function wallNorth(seed) {
  return spr(64, 24, 0, 22, g => {
    r(g, 0, -21, 64, 3, INK); r(g, 0, -20, 64, 2, S5); r(g, 0, -20, 64, 1, '#7d8587');
    r(g, 0, -18, 64, 18, S2);
    for (let row = 0; row < 3; row++) {
      r(g, 0, -18 + row * 6, 64, 1, S0);
      for (let col = 0; col < 7; col++) {
        const x = col * 10 + (row % 2) * 5 - 3, v = hash(seed + col, row, 91);
        r(g, x, -18 + row * 6, 1, 6, S0);
        if (v > 0.66) r(g, x + 1, -17 + row * 6, 9, 5, S3); else if (v < 0.25) r(g, x + 1, -17 + row * 6, 9, 5, S1);
        if (v > 0.88) r(g, x + 2, -16 + row * 6, 3, 2, MOSS);
      }
    }
    r(g, 0, -2, 64, 2, '#1f2628');
    for (let i = 0; i < 5; i++) { const x = Math.floor(hash(seed, i, 93) * 58); r(g, x, -3 - Math.floor(hash(seed, i, 94) * 3), 4, 3, i % 2 ? MOSS : MOSS2); }
  });
}

export function wallSouth(seed) {
  return spr(64, 16, 0, 15, g => {
    r(g, 0, -15, 64, 1, INK); r(g, 0, -14, 64, 4, S4); r(g, 0, -14, 64, 1, '#7d8587');
    for (let col = 0; col < 7; col++) r(g, col * 10 + Math.floor(hash(seed, col, 95) * 3), -14, 1, 4, S1);
    r(g, 0, -10, 64, 10, S1); r(g, 0, -10, 64, 1, INK);
    for (let col = 0; col < 7; col++) { const x = col * 10 - 2; r(g, x, -9, 1, 4, S0); r(g, x + 5, -5, 1, 5, S0); if (hash(seed, col, 96) > 0.7) r(g, x + 1, -9, 8, 4, S2); }
    r(g, 0, -5, 64, 1, S0); r(g, 0, 0, 64, 1, INK);
  });
}

export function pillar() {
  return spr(14, 40, 7, 37, g => {
    r(g, -6, -1, 13, 3, SHADE);
    r(g, -6, -5, 12, 5, INK); r(g, -5, -4, 10, 4, S3); r(g, -5, -4, 10, 1, S4);
    r(g, -5, -27, 10, 23, INK); r(g, -4, -26, 8, 22, S3); r(g, -4, -26, 2, 22, S4); r(g, 2, -26, 2, 22, S1);
    for (let i = 0; i < 3; i++) r(g, -4, -20 + i * 7, 8, 1, S1);
    r(g, -6, -30, 12, 4, INK); r(g, -5, -29, 10, 2, S4); r(g, -5, -29, 10, 1, S5);
    disc(g, 0, -33, 3, INK); disc(g, 0, -33, 2, S3); r(g, -1, -35, 1, 1, S5);
    r(g, 4, -22, 3, 5, INK); r(g, 5, -21, 1, 3, '#3a3f4a');          // farol de hierro
    r(g, -4, -8, 3, 3, MOSS);
  });
}

export function lampPost() {
  return spr(10, 34, 5, 32, g => {
    r(g, -3, -1, 7, 2, SHADE);
    r(g, -2, -3, 4, 3, INK); r(g, -1, -24, 3, 22, INK); r(g, 0, -23, 1, 21, '#3a3f4a');
    r(g, -3, -30, 7, 7, INK); r(g, -2, -29, 5, 5, '#2b2f38'); r(g, -1, -31, 3, 1, INK); r(g, -2, -28, 5, 1, '#3a3f4a');
  });
}

export function cruceiro() {
  return spr(28, 66, 14, 63, g => {
    r(g, -13, -1, 27, 3, SHADE);
    for (const [w, y] of [[24, -4], [18, -8], [12, -12]]) { r(g, -w / 2, y, w, 5, INK); r(g, -w / 2 + 1, y + 1, w - 2, 3, S3); r(g, -w / 2 + 1, y + 1, w - 2, 1, S5); }
    r(g, -2, -46, 5, 35, INK); r(g, -1, -45, 3, 33, S3); r(g, -1, -45, 1, 33, S5); r(g, 1, -45, 1, 33, S1);
    r(g, -4, -50, 9, 5, INK); r(g, -3, -49, 7, 3, S4); r(g, -3, -49, 7, 1, S5);
    r(g, -2, -62, 5, 13, INK); r(g, -6, -58, 13, 5, INK);
    r(g, -1, -61, 3, 11, S3); r(g, -5, -57, 11, 3, S3); r(g, -1, -61, 1, 11, S5); r(g, -5, -57, 11, 1, S4);
    r(g, 0, -57, 1, 5, '#8d959a'); r(g, -2, -56, 5, 1, '#8d959a');
    r(g, -1, -30, 2, 3, LICHEN); r(g, 0, -40, 1, 2, LICHEN); r(g, -9, -3, 4, 2, MOSS); r(g, 3, -7, 4, 1, MOSS);
  });
}

export function peto() {
  return spr(22, 38, 11, 35, g => {
    r(g, -9, -1, 19, 3, SHADE);
    r(g, -8, -8, 16, 8, INK); r(g, -7, -7, 14, 6, S3); r(g, -7, -7, 14, 1, S5);
    r(g, -7, -27, 14, 20, INK); r(g, -6, -26, 12, 18, S3); r(g, -6, -26, 2, 18, S4); r(g, 4, -26, 2, 18, S1);
    r(g, -4, -24, 8, 11, INK); r(g, -3, -23, 6, 9, '#241a1a');
    r(g, -3, -18, 6, 4, '#7c2a1c'); r(g, -2, -19, 1, 2, '#c4573a'); r(g, 1, -20, 1, 3, '#c4573a'); r(g, 0, -18, 1, 1, '#e39a4a');
    r(g, -2, -22, 1, 2, '#d9c7b4'); r(g, 1, -22, 1, 2, '#d9c7b4');
    r(g, -2, -11, 4, 2, INK); r(g, -1, -11, 2, 1, '#1a1410');
    for (let i = 0; i < 5; i++) { r(g, -8 + i, -28 - i, 16 - i * 2, 1, INK); if (i < 4) r(g, -7 + i, -28 - i, 14 - i * 2, 1, i ? S4 : S5); }
    r(g, -1, -35, 2, 4, INK); r(g, -2, -34, 4, 1, INK);
    r(g, -7, -4, 4, 3, MOSS); r(g, 3, -9, 3, 1, MOSS2);
  });
}

export function yew() {
  const blobs = [[-15, -44, 20], [13, -48, 22], [0, -60, 17], [-26, -33, 12], [27, -35, 13], [-4, -36, 16]];
  return spr(90, 86, 45, 82, g => {
    g.fillStyle = SHADE; g.fillRect(-30, -2, 62, 5); g.fillRect(-22, 3, 46, 2); g.fillRect(-36, -4, 74, 2);
    for (const [x, y, rad] of blobs) disc(g, x, y, rad + 1, INK);
    // tronco viejo, retorcido
    r(g, -8, -4, 16, 5, INK); r(g, -6, -26, 12, 23, INK);
    r(g, -7, -3, 14, 3, '#2b1f16'); r(g, -5, -26, 10, 23, '#2b1f16'); r(g, -5, -26, 3, 23, '#3d2c1e'); r(g, 2, -26, 2, 23, '#1d1510');
    r(g, -2, -24, 1, 18, '#1d1510'); r(g, 0, -20, 1, 14, '#4a3524'); r(g, -9, -2, 3, 2, '#2b1f16'); r(g, 7, -2, 3, 2, '#2b1f16');
    for (const [x, y, rad] of blobs) disc(g, x, y, rad, '#0e1b15');
    for (const [x, y, rad] of blobs) disc(g, x - 3, y - 4, Math.round(rad * 0.62), '#14271c');
    for (let i = 0; i < 70; i++) {
      const [x, y, rad] = blobs[i % blobs.length], a = hash(i, 3, 21) * TAU, d = hash(i, 5, 22) * rad * 0.8;
      r(g, Math.round(x - 3 + Math.cos(a) * d), Math.round(y - 5 + Math.sin(a) * d * 0.8), 2, 1, i % 4 ? '#1c3526' : '#24452f');
    }
    for (let i = 0; i < 9; i++) r(g, Math.round(-24 + hash(i, 1, 23) * 50), Math.round(-58 + hash(i, 2, 24) * 34), 1, 1, '#8a2c22');
  });
}

export function chapel() {
  return spr(128, 142, 64, 136, g => {
    const block = (x0, y0, w, h, seed) => {
      r(g, x0, y0, w, h, S3);
      for (let y = y0; y < y0 + h; y += 6) {
        r(g, x0, y, w, 1, S1);
        const row = Math.floor((y - y0) / 6);
        for (let x = x0 + (row % 2) * 6 - 3; x < x0 + w; x += 12) {
          if (x > x0) r(g, x, y, 1, Math.min(6, y0 + h - y), S1);
          const v = hash(x + seed, y, 97);
          if (v > 0.72) r(g, Math.max(x0, x + 1), y + 1, Math.min(11, x0 + w - x - 1), 5, S4);
          else if (v < 0.2) r(g, Math.max(x0, x + 1), y + 1, Math.min(11, x0 + w - x - 1), 5, S2);
        }
      }
    };
    // cuerpo y contrafuertes
    r(g, -61, -51, 122, 51, INK); r(g, -53, -73, 106, 24, INK);
    block(-52, -72, 104, 72, 1);
    block(-60, -50, 8, 50, 2); block(52, -50, 8, 50, 3);
    r(g, -60, -50, 8, 1, S5); r(g, 52, -50, 8, 1, S5);
    r(g, -52, -72, 3, 72, S4); r(g, 49, -72, 3, 72, S1);
    // hastial y tejado
    for (let i = 0; i < 27; i++) {
      const hw = 53 - i * 2;
      if (hw < 8) break;
      r(g, -hw - 1, -73 - i, hw * 2 + 2, 1, INK);
      r(g, -hw + 2, -73 - i, hw * 2 - 4, 1, i % 6 === 0 ? S1 : S3);
      r(g, -hw, -73 - i, 3, 1, i % 2 ? '#7a3a2a' : '#5e2a1f'); r(g, hw - 3, -73 - i, 3, 1, i % 2 ? '#5e2a1f' : '#4a2018');
    }
    // espadaña con el hueco de la campana
    r(g, -11, -124, 22, 30, INK); block(-10, -123, 20, 28, 4);
    r(g, -6, -118, 12, 17, INK); r(g, -5, -119, 10, 1, INK); r(g, -3, -120, 6, 1, INK);
    r(g, -5, -117, 10, 15, '#0b0d14');
    for (let i = 0; i < 5; i++) { r(g, -12 + i * 2, -125 - i, 24 - i * 4, 1, INK); r(g, -11 + i * 2, -125 - i, 22 - i * 4, 1, i ? S4 : S5); }
    r(g, -1, -136, 3, 8, INK); r(g, -4, -133, 9, 3, INK); r(g, 0, -135, 1, 6, S4); r(g, -3, -132, 7, 1, S4);
    // óculo, con la lámpara del sagrario dentro
    disc(g, 0, -56, 8, INK); disc(g, 0, -56, 7, S5); disc(g, 0, -56, 5, INK); disc(g, 0, -56, 4, '#10131c');
    r(g, 0, -60, 1, 9, S1); r(g, -4, -56, 9, 1, S1);
    // puerta
    r(g, -14, -36, 28, 36, INK); r(g, -12, -39, 24, 3, INK); r(g, -9, -41, 18, 2, INK);
    r(g, -13, -35, 26, 35, S5); r(g, -11, -38, 22, 3, S5); r(g, -8, -40, 16, 2, S5);
    for (let i = 0; i < 6; i++) r(g, -13, -33 + i * 6, 2, 1, S1), r(g, 11, -30 + i * 6, 2, 1, S1);
    r(g, -10, -33, 20, 33, INK); r(g, -8, -36, 16, 3, INK);
    r(g, -9, -32, 18, 32, '#4e3420'); r(g, -7, -35, 14, 3, '#4e3420');
    for (let i = 0; i < 6; i++) r(g, -9 + i * 3, -34, 1, 34, i % 2 ? '#3a2718' : '#5a3e27');
    r(g, 0, -35, 1, 35, INK); r(g, -9, -22, 18, 1, '#23262e'); r(g, -9, -8, 18, 1, '#23262e');
    r(g, -3, -16, 2, 2, '#8a6a2c'); r(g, 2, -16, 2, 2, '#8a6a2c');
    // farol junto a la puerta
    r(g, 17, -32, 4, 1, INK); r(g, 19, -32, 1, 3, INK); r(g, 17, -29, 5, 6, INK); r(g, 18, -28, 3, 4, '#2b2f38');
    // peldaños, hiedra y musgo
    r(g, -18, 0, 36, 2, S5); r(g, -18, 1, 36, 1, S2); r(g, -22, 2, 44, 2, S4); r(g, -22, 3, 44, 1, S1); r(g, -23, 4, 46, 1, INK);
    for (let i = 0; i < 46; i++) {
      const x = -52 + Math.floor(hash(i, 1, 98) * 22), y = -Math.floor(hash(i, 2, 99) * (44 - (x + 52) * 1.4));
      r(g, x, y - 2, 2, 2, i % 3 ? '#1c3226' : '#27432f');
    }
    for (let i = 0; i < 10; i++) r(g, 24 + Math.floor(hash(i, 4, 98) * 30), -3 - Math.floor(hash(i, 5, 99) * 4), 3, 2, i % 2 ? MOSS : MOSS2);
    r(g, 30, -44, 2, 1, LICHEN); r(g, -20, -62, 2, 1, LICHEN); r(g, 6, -84, 2, 1, LICHEN);
  });
}

export function bellSprite() {
  return spr(12, 14, 6, 2, g => {
    r(g, -1, -2, 2, 3, INK);
    r(g, -3, 0, 6, 2, INK); r(g, -4, 2, 8, 6, INK); r(g, -5, 7, 10, 2, INK);
    r(g, -2, 1, 4, 1, '#c9a04c'); r(g, -3, 2, 6, 5, '#c9a04c'); r(g, -4, 7, 8, 1, '#c9a04c');
    r(g, 1, 2, 2, 5, '#8a6a2c'); r(g, -3, 2, 1, 5, '#e6c06a'); r(g, 2, 7, 2, 1, '#8a6a2c');
    r(g, -1, 9, 2, 2, INK);
  });
}

export function lighthouse() {
  return spr(44, 104, 22, 96, g => {
    for (const [x, y, w, h, c] of [[-20, -4, 40, 8, INK], [-18, -3, 36, 6, '#2c3034'], [-14, -7, 28, 4, INK], [-13, -6, 26, 3, '#3a3f44'], [-18, -3, 12, 2, '#4a5056'], [4, 0, 12, 2, '#1e2124']]) r(g, x, y, w, h, c);
    for (let i = 0; i < 70; i++) {
      const hw = Math.round(9 - i * 0.045 * 1), y = -8 - i, band = (i > 14 && i < 26) || (i > 42 && i < 54);
      r(g, -hw - 1, y, hw * 2 + 2, 1, INK);
      r(g, -hw, y, hw * 2, 1, band ? '#9a3a2e' : '#c5cacc');
      r(g, -hw, y, 2, 1, band ? '#b8503f' : '#e6e9e8'); r(g, hw - 3, y, 3, 1, band ? '#6e2a22' : '#8e979b');
    }
    r(g, -1, -24, 2, 4, '#1a1e26'); r(g, -1, -50, 2, 4, '#1a1e26'); r(g, -2, -14, 4, 6, INK); r(g, -1, -13, 2, 5, '#3a2718');
    r(g, -10, -81, 20, 3, INK); r(g, -9, -80, 18, 1, '#565c68');
    for (let i = 0; i < 6; i++) r(g, -9 + i * 4, -85, 1, 4, '#3a3f4a');
    r(g, -9, -86, 19, 1, '#3a3f4a');
    r(g, -6, -93, 12, 12, INK); r(g, -5, -92, 10, 10, '#23303c'); r(g, -5, -92, 1, 10, '#3a3f4a'); r(g, 4, -92, 1, 10, '#3a3f4a'); r(g, 0, -92, 1, 10, '#3a3f4a');
    for (let i = 0; i < 4; i++) { r(g, -7 + i * 2, -94 - i, 14 - i * 4, 1, INK); if (i) r(g, -6 + i * 2, -94 - i, 12 - i * 4, 1, '#565c68'); }
  });
}

export function coffin() {
  return spr(62, 30, 26, 16, g => {
    r(g, -22, 6, 44, 6, SHADE);
    r(g, -16, 4, 2, 8, INK); r(g, 14, 4, 2, 8, INK); r(g, -15, 4, 1, 7, '#4e3420'); r(g, 15, 4, 1, 7, '#4e3420');
    r(g, -21, -8, 42, 15, INK); r(g, -20, -7, 40, 13, '#7a4a31'); r(g, -20, -7, 40, 2, '#94603f');
    r(g, -19, -5, 38, 9, '#4f2e20'); r(g, -18, -4, 36, 7, '#ece6e9'); r(g, -18, 2, 36, 1, '#bcb2bb');
    r(g, -17, -3, 5, 5, '#f7f3f0'); r(g, -17, -2, 2, 3, '#e4e2da'); r(g, -15, -2, 3, 3, '#d9c7b4'); r(g, -13, -1, 1, 1, '#b88a6a');
    r(g, -12, -3, 22, 5, '#1d1d27'); r(g, -12, -3, 22, 1, '#30313f'); r(g, -6, -2, 3, 2, '#d9c7b4');
    r(g, -5, 0, 1, 1, '#f1e8d2'); r(g, -3, 0, 1, 1, '#f1e8d2'); r(g, -4, 1, 1, 1, '#c9a04c'); r(g, 10, -2, 4, 3, '#1d1d27');
    r(g, -21, 5, 4, 1, '#c9a04c'); r(g, 17, 5, 4, 1, '#c9a04c');
    // corona de crisantemos a los pies
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      r(g, Math.round(28 + Math.cos(a) * 5) - 1, Math.round(-1 + Math.sin(a) * 3.4) - 1, 2, 2, i % 3 ? '#ebe8dc' : '#e8c25a');
    }
    r(g, 25, -2, 2, 2, '#26402c'); r(g, 30, 1, 2, 1, '#26402c');
  });
}

export function chair() {
  return spr(14, 20, 7, 17, g => {
    r(g, -6, -1, 12, 2, SHADE);
    r(g, -5, -3, 10, 2, INK); r(g, -4, -9, 8, 7, INK); r(g, -3, -8, 6, 5, '#7a5434'); r(g, -3, -8, 6, 1, '#94603f');
    r(g, -4, -15, 2, 7, INK); r(g, 3, -15, 2, 7, INK); r(g, -4, -15, 9, 2, INK); r(g, -3, -15, 7, 1, '#7a5434');
    r(g, -3, -14, 1, 6, '#4e3420'); r(g, 3, -14, 1, 6, '#4e3420'); r(g, -1, -13, 3, 1, '#4e3420');
  });
}

export function stool() {
  return spr(14, 16, 7, 13, g => {
    r(g, -5, -1, 11, 2, SHADE);
    r(g, -4, -3, 9, 2, INK); r(g, -3, -6, 7, 4, '#4e3420'); r(g, -3, -6, 7, 1, '#6b4a2c');
    r(g, -3, -12, 3, 7, INK); r(g, -3, -11, 2, 5, '#5b646c'); r(g, -3, -11, 1, 5, '#9aa6ae');
    r(g, 1, -8, 2, 2, '#f1e8d2'); r(g, 1, -8, 2, 1, INK);
  });
}

export function cirioSprite() {
  return spr(12, 32, 6, 29, g => {
    r(g, -4, -1, 9, 2, SHADE);
    r(g, -4, -2, 8, 2, INK); r(g, -3, -3, 6, 2, '#8a6a2c'); r(g, -3, -3, 6, 1, '#c9a04c');
    r(g, -2, -17, 4, 14, INK); r(g, -1, -16, 2, 13, '#8a6a2c'); r(g, -1, -16, 1, 13, '#c9a04c');
    r(g, -1, -11, 2, 1, '#6e5422'); r(g, -1, -6, 2, 1, '#6e5422');
    r(g, -4, -19, 8, 3, INK); r(g, -3, -18, 6, 1, '#c9a04c'); r(g, -3, -17, 6, 1, '#8a6a2c');
    r(g, -2, -27, 4, 9, INK); r(g, -1, -26, 2, 8, '#f1e8d2'); r(g, 0, -26, 1, 8, '#c9bb9a');
    r(g, -1, -22, 1, 2, '#fffaf0'); r(g, 0, -28, 1, 2, '#1a1410');
  });
}

/* Llamas dibujadas después de la oscuridad, para que brillen. */
export function drawFlames(c, flames, time, wind = 0) {
  c.save();
  for (const f of flames) {
    const x = Math.round(f.x), y = Math.round(f.y);
    const lean = Math.round(Math.sin(time * 3 + x) * 0.6 + wind);
    if (f.kind === 'sanctuary') {
      c.fillStyle = 'rgba(255,92,52,.5)'; c.fillRect(x - 2, y - 2, 4, 4);
      c.fillStyle = '#ff6b3a'; c.fillRect(x - 1, y - 1, 2, 2);
    } else if (f.kind === 'lamp') {
      c.fillStyle = 'rgba(255,176,74,.5)'; c.fillRect(x - 3, y - 3, 6, 8);
      c.fillStyle = '#ffb04a'; c.fillRect(x - 2, y - 2, 4, 6);
      c.fillStyle = '#fff1bd'; c.fillRect(x - 1, y - 1 + (f.f > 0.95 ? -1 : 0), 2, 3);
    } else if (f.kind === 'beacon') {
      c.fillStyle = 'rgba(255,246,226,.45)'; c.fillRect(x - 8, y - 8, 16, 16);
      c.fillStyle = '#fff6e2'; c.fillRect(x - 6, y - 6, 12, 12);
      c.fillStyle = '#ffffff'; c.fillRect(x - 3, y - 4, 6, 8);
    } else {
      const tall = f.kind === 'cirio' ? 1 : 0, big = f.flare > 0.05 ? 1 : 0;
      c.fillStyle = f.kind === 'votive' ? 'rgba(255,107,58,.55)' : 'rgba(255,176,74,.6)';
      c.fillRect(x - 2 - big, y - 1 - big, 4 + big * 2, 5 + tall * 2 + big);
      c.fillStyle = '#ffb04a';
      c.fillRect(x - 1 + lean, y - 2 - tall * 2 - big * 2, 2, 5 + tall * 2 + big * 2);
      c.fillStyle = '#fff1bd';
      c.fillRect(x - 1 + lean, y + (f.f > 0.95 ? -1 : 0) - tall, 2, 2 + tall);
    }
  }
  c.restore();
}

/* ---------- niebla ---------- */

let fogBlob;
export function fogSprite() {
  if (fogBlob) return fogBlob;
  fogBlob = makeCanvas(256, 128);
  const c = fogBlob.getContext('2d');
  const g = c.createRadialGradient(128, 64, 4, 128, 64, 126);
  g.addColorStop(0, 'rgba(190,205,215,1)'); g.addColorStop(0.45, 'rgba(190,205,215,.45)'); g.addColorStop(1, 'rgba(190,205,215,0)');
  c.save(); c.scale(1, 0.5); c.translate(0, 64);
  c.fillStyle = g; c.fillRect(0, -64, 256, 256);
  c.restore();
  return fogBlob;
}

export function drawFog(c, camX, camY, w, h, time, density) {
  if (density <= 0.01) return;
  const img = fogSprite(), cell = 360;
  c.save();
  for (let gy = Math.floor((camY - 200) / cell); gy <= (camY + h + 200) / cell; gy++) {
    for (let gx = Math.floor((camX - 500) / cell); gx <= (camX + w + 300) / cell; gx++) {
      const n = hash(gx, gy, 101);
      if (n < 0.35) continue;
      const drift = (time * (9 + n * 8)) % (cell * 3);
      const x = gx * cell + hash(gx, gy, 102) * cell + drift - camX - cell;
      const y = gy * cell + hash(gx, gy, 103) * cell - camY;
      const sc = 1.6 + n * 1.8;
      c.globalAlpha = density * (0.05 + n * 0.08);
      c.drawImage(img, x - 128 * sc, y - 64 * sc, 256 * sc, 128 * sc);
    }
  }
  c.restore();
}

