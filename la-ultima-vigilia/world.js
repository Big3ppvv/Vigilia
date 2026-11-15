/*
 * El Camposanto del Carmen: un recinto con muro, la ermita al norte, la cancela
 * al oeste y, al este, la escalera que baja al mar y el faro. En el cruce de
 * los paseos está Amparo.
 *
 * El suelo se pinta una sola vez, por trozos. Las tumbas, los cipreses y lo
 * demás son piezas sueltas que el juego ordena de arriba abajo junto a las
 * criaturas. Todo está en píxeles de arte: cada uno ocupa dos del mundo.
 */
import { TAU, lerp } from './util.js';
import { makeCanvas, hash } from './art.js';
import { WORLD, CIRIOS, LIGHTHOUSE } from './balance.js';

const {left: L, right: R, top: T, bottom: B} = WORLD;
const CHUNK = 256;
const CELL = 512;
const AVENUES_X = [-1280, -640, 0, 640, 1280];
const AVENUES_Y = [-640, 0, 640];
const half = v => v === 0 ? 30 : 19;

export const LANDMARKS = {
  chapel: {x: 0, y: T},
  cruceiro: {x: 0, y: -640},
  yew: {x: -960, y: -330},
  peto: {x: L + 92, y: -104},
  gate: {x: L, y: 0},
  stairs: {x: R, y: 0},
  postern: {x: 0, y: B}
};

/* ---------- el suelo ---------- */

const GRASS = 0, GRAVEL = 1, EARTH = 2, COBBLE = 3, WOODS = 4, FIELD = 5, ROAD = 6, VERGE = 7, ROCK = 8, SEA = 9, WALL = 10, STEPS = 11;

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(xi, yi, seed), hash(xi + 1, yi, seed), sx), lerp(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), sx), sy);
}

const wob = (along, id) => (hash(Math.floor(along / 12), id, 71) - 0.5) * 6;
export const shoreX = wy => R + 104 + (vnoise(wy / 80, 3, 9) - 0.5) * 50;

/* Qué pisa cada punto del mundo. */
export function terrain(wx, wy) {
  if (wx > R + 14) {
    const islet = ((wx - LIGHTHOUSE.x) / 62) ** 2 + ((wy - LIGHTHOUSE.y - 8) / 30) ** 2;
    if (islet < 1) return ROCK;
    const shore = shoreX(wy);
    if (wx > shore + 30) return SEA;
    if (Math.abs(wy) < 32 && wx < shore + 8) return STEPS;
    if (wx > shore) return ROCK;
    return VERGE;
  }
  if (wy < T) return WOODS;
  if (wy > B) return Math.abs(wx) < 22 + wob(wy, 3) && wy < B + 190 ? ROAD : FIELD;
  if (wx < L - 14) return Math.abs(wy) < 32 + wob(wx, 6) ? ROAD : FIELD;
  if (wx < L || wx > R) return Math.abs(wy) < 46 ? (wx < L ? ROAD : COBBLE) : WALL;
  if ((wx / 178) ** 2 + (wy / 124) ** 2 < 1) return EARTH;
  if (Math.abs(wx) < 150 && wy < T + 112) return COBBLE;
  if (wx < L + 112 && Math.abs(wy) < 84) return COBBLE;
  if (wx > R - 92 && Math.abs(wy) < 70) return COBBLE;
  for (const ax of AVENUES_X) if (Math.abs(wx - ax) < half(ax) + wob(wy, ax)) return GRAVEL;
  for (const ay of AVENUES_Y) if (Math.abs(wy - ay) < half(ay) + wob(wx, ay + 7)) return GRAVEL;
  return GRASS;
}

/* El jugador hace ruido distinto según lo que pisa. */
export function surfaceAt(wx, wy) {
  const k = terrain(wx, wy);
  return k === GRAVEL || k === ROAD ? 'grava' : k === COBBLE || k === STEPS || k === ROCK ? 'piedra' : 'hierba';
}

function groundColor(k, ax, ay, wx, wy) {
  const n = hash(ax, ay, 39);
  switch (k) {
    case GRASS: case VERGE: {
      const p = vnoise(wx / 120, wy / 120, 4) + (hash(ax, ay, 12) - 0.5) * 0.2 + (k === VERGE ? 0.2 : 0);
      if (p < 0.4) return n < 0.14 ? [19, 29, 28] : n < 0.2 ? [11, 17, 18] : [15, 23, 23];
      if (p < 0.66) return n < 0.14 ? [22, 34, 31] : n < 0.2 ? [13, 20, 20] : [18, 27, 26];
      return n < 0.16 ? [27, 41, 35] : n < 0.22 ? [16, 25, 24] : [21, 32, 29];
    }
    case GRAVEL: {
      const edge = terrain(wx + 4, wy) === GRASS || terrain(wx - 4, wy) === GRASS || terrain(wx, wy + 4) === GRASS || terrain(wx, wy - 4) === GRASS;
      if (edge) return n > 0.6 ? [22, 31, 28] : [27, 28, 26];
      return n > 0.93 ? [80, 77, 66] : n > 0.8 ? [60, 58, 50] : n < 0.22 ? [30, 30, 27] : [41, 40, 36];
    }
    case EARTH: {
      const rim = (wx / 178) ** 2 + (wy / 124) ** 2;
      if (rim > 0.9 && n > 0.45) return [20, 30, 27];
      return n > 0.9 ? [52, 46, 36] : n > 0.78 ? [44, 39, 31] : n < 0.2 ? [27, 24, 20] : [36, 32, 26];
    }
    case COBBLE: {
      const row = Math.floor(ay / 5), sx = ax + (row & 1) * 3, col = Math.floor(sx / 6);
      if (ay % 5 === 0 || sx % 6 === 0) return hash(col, row, 61) > 0.82 ? [33, 52, 38] : [26, 30, 31];
      const v = hash(col, row, 62);
      const c = v > 0.7 ? [62, 69, 71] : v < 0.3 ? [45, 51, 53] : [53, 59, 61];
      return n > 0.9 ? [c[0] + 9, c[1] + 9, c[2] + 9] : c;
    }
    case WOODS: return n > 0.93 ? [22, 18, 13] : n < 0.15 ? [6, 9, 9] : [9, 13, 13];
    case FIELD: return (ay + Math.floor(ax / 46)) % 7 === 0 ? [10, 15, 14] : n > 0.95 ? [23, 34, 28] : [13, 19, 18];
    case ROAD: return n > 0.88 ? [52, 46, 37] : n < 0.22 ? [26, 23, 19] : [37, 33, 27];
    case ROCK: {
      const crack = hash(Math.floor(ax / 5), Math.floor(ay / 4), 83);
      if (crack > 0.86 && (ax % 5 === 0 || ay % 4 === 0)) return [22, 25, 28];
      return n > 0.78 ? [58, 64, 68] : n < 0.24 ? [28, 31, 34] : [41, 45, 49];
    }
    case SEA: {
      const deep = Math.min(1, (wx - shoreX(wy)) / 260);
      const band = (ay + Math.floor(vnoise(ax / 22, ay / 9, 15) * 6)) % 7 === 0;
      const c = [lerp(10, 5, deep), lerp(21, 12, deep), lerp(34, 22, deep)];
      return band && n > 0.35 ? [c[0] + 5, c[1] + 9, c[2] + 13] : c;
    }
    case WALL: {
      const inside = wx < L ? L - wx : wx - R;
      if (inside < 2 || inside > 11) return [7, 8, 13];
      if (ay % 9 === 0) return [40, 46, 48];
      return n > 0.85 ? [84, 92, 94] : inside > 8 ? [56, 63, 66] : [70, 78, 80];
    }
    case STEPS: return ax % 5 === 0 ? [27, 31, 33] : ax % 5 === 1 ? [70, 77, 79] : n > 0.9 ? [62, 69, 71] : [53, 59, 61];
    default: return [15, 23, 23];
  }
}

function paintChunk(cx, cy) {
  const c = makeCanvas(CHUNK, CHUNK), g = c.getContext('2d');
  const img = g.createImageData(CHUNK, CHUNK), d = img.data;
  const kinds = new Uint8Array(CHUNK * CHUNK);
  for (let y = 0; y < CHUNK; y++) {
    for (let x = 0; x < CHUNK; x++) {
      const ax = cx * CHUNK + x, ay = cy * CHUNK + y, wx = ax * 2, wy = ay * 2;
      const k = terrain(wx, wy), rgb = groundColor(k, ax, ay, wx, wy), i = (y * CHUNK + x) * 4;
      kinds[y * CHUNK + x] = k;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Matas, hojas secas de noviembre, piedras y margaritas.
  for (let y = 0; y < CHUNK; y += 6) {
    for (let x = 0; x < CHUNK; x += 6) {
      const ax = cx * CHUNK + x, ay = cy * CHUNK + y, h = hash(ax, ay, 55);
      const px = x + Math.floor(hash(ax, ay, 56) * 5), py = y + Math.floor(hash(ax, ay, 57) * 5);
      if (px < 1 || py < 1 || px > CHUNK - 3 || py > CHUNK - 3) continue;
      const k = kinds[py * CHUNK + px];
      if (k === GRASS || k === VERGE) {
        if (h > 0.78) {
          g.fillStyle = h > 0.93 ? '#2b473a' : h > 0.86 ? '#243a30' : '#1d2f28';
          g.fillRect(px, py, 1, 2); g.fillRect(px - 1, py + 1, 1, 1); g.fillRect(px + 1, py - 1, 1, 2);
        } else if (h > 0.71) {
          g.fillStyle = h > 0.745 ? '#4a3420' : '#3a2a1c';
          g.fillRect(px, py, 2, 1); g.fillRect(px + 1, py + 1, 1, 1);
        } else if (h < 0.014) {
          g.fillStyle = '#0b1012'; g.fillRect(px, py + 1, 3, 1);
          g.fillStyle = '#39424a'; g.fillRect(px, py, 2, 1);
          g.fillStyle = '#4b555c'; g.fillRect(px, py, 1, 1);
        } else if (h > 0.5 && h < 0.511) {
          g.fillStyle = '#b9bfae'; g.fillRect(px, py, 1, 1); g.fillRect(px + 2, py + 1, 1, 1);
          g.fillStyle = '#c9a94e'; g.fillRect(px + 1, py - 1, 1, 1);
        }
      } else if (k === GRAVEL && h > 0.9) {
        g.fillStyle = '#3a2a1c'; g.fillRect(px, py, 2, 1);
      } else if (k === ROAD && h > 0.82) {
        g.fillStyle = '#211d18'; g.fillRect(px, py, 3, 1);
      }
    }
  }
  return c;
}

/* ---------- piezas ---------- */

const INK = '#07080d', SHADE = 'rgba(2,3,8,.45)';
const S0 = '#2a3134', S1 = '#353d40', S2 = '#3c4447', S3 = '#4a5356', S4 = '#5a6366', S5 = '#6a7274';
const MOSS = '#2f4632', MOSS2 = '#3d5b40', LICHEN = '#7b7742';

const r = (g, x, y, w, h, color) => { g.fillStyle = color; g.fillRect(x, y, w, h); };

/* Lienzo pequeño con el origen en la base de la pieza (ox, oy). */
function spr(w, h, ox, oy, paint) {
  const c = makeCanvas(w, h), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.translate(ox, oy);
  paint(g);
  return {c, ox, oy, w, h};
}

/* Inclina una pieza un píxel cada «every» filas, sin suavizar: las cruces viejas se vencen. */
function lean(s, every, dir) {
  const shift = Math.ceil(s.h / every), c = makeCanvas(s.w + shift, s.h), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let y = 0; y < s.h; y++) {
    const dx = Math.floor((s.oy - y) / every) * dir + (dir < 0 ? shift : 0);
    if (dx < 0 || dx > shift) { g.drawImage(s.c, 0, y, s.w, 1, Math.max(0, Math.min(shift, dx)), y, s.w, 1); continue; }
    g.drawImage(s.c, 0, y, s.w, 1, dx, y, s.w, 1);
  }
  return {c, ox: s.ox + (dir < 0 ? shift : 0), oy: s.oy, w: s.w + shift, h: s.h};
}

function disc(g, cx, cy, rad, color) {
  g.fillStyle = color;
  for (let dy = -rad; dy <= rad; dy++) {
    const hw = Math.floor(Math.sqrt(rad * rad - dy * dy));
    g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

function slab(kind) {
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

function headstone(kind) {
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

function ironCross() {
  return spr(16, 32, 8, 30, g => {
    r(g, -6, -1, 12, 3, SHADE);
    r(g, -4, -4, 8, 4, INK); r(g, -3, -3, 6, 3, S0); r(g, -3, -3, 6, 1, S1);
    r(g, -1, -29, 3, 26, INK); r(g, -7, -23, 15, 3, INK);
    r(g, 0, -28, 1, 25, '#3a3f4a'); r(g, -6, -22, 13, 1, '#3a3f4a');
    for (const [x, y] of [[-3, -25], [3, -25], [-3, -19], [3, -19]]) r(g, x, y, 1, 1, '#3a3f4a');
    r(g, -1, -30, 3, 1, INK); r(g, 0, -17, 1, 1, '#565c68'); r(g, 0, -27, 1, 2, '#565c68');
  });
}

function woodCross() {
  return spr(16, 28, 8, 26, g => {
    r(g, -6, -1, 12, 3, SHADE);
    r(g, -2, -24, 4, 24, INK); r(g, -7, -18, 14, 4, INK);
    r(g, -1, -23, 2, 22, '#5a3e27'); r(g, -6, -17, 12, 2, '#5a3e27'); r(g, -1, -23, 1, 22, '#7a5434'); r(g, -6, -17, 12, 1, '#7a5434');
    r(g, 0, -12, 1, 3, '#3a2a1c'); r(g, 2, -17, 1, 1, '#3a2a1c');
  });
}

function cypress(seed, bend = 0) {
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

function pine(seed) {
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

function angel() {
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

function niches(seed) {
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

function votiveSprite() {
  return spr(6, 8, 3, 6, g => { r(g, -2, 0, 4, 1, INK); r(g, -2, -4, 4, 4, '#5e1d14'); r(g, -1, -4, 2, 3, '#a8331f'); r(g, -2, -5, 4, 1, INK); });
}

function flowersSprite(seed, pot) {
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

function wallNorth(seed) {
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

function wallSouth(seed) {
  return spr(64, 16, 0, 15, g => {
    r(g, 0, -15, 64, 1, INK); r(g, 0, -14, 64, 4, S4); r(g, 0, -14, 64, 1, '#7d8587');
    for (let col = 0; col < 7; col++) r(g, col * 10 + Math.floor(hash(seed, col, 95) * 3), -14, 1, 4, S1);
    r(g, 0, -10, 64, 10, S1); r(g, 0, -10, 64, 1, INK);
    for (let col = 0; col < 7; col++) { const x = col * 10 - 2; r(g, x, -9, 1, 4, S0); r(g, x + 5, -5, 1, 5, S0); if (hash(seed, col, 96) > 0.7) r(g, x + 1, -9, 8, 4, S2); }
    r(g, 0, -5, 64, 1, S0); r(g, 0, 0, 64, 1, INK);
  });
}

function pillar() {
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

function lampPost() {
  return spr(10, 34, 5, 32, g => {
    r(g, -3, -1, 7, 2, SHADE);
    r(g, -2, -3, 4, 3, INK); r(g, -1, -24, 3, 22, INK); r(g, 0, -23, 1, 21, '#3a3f4a');
    r(g, -3, -30, 7, 7, INK); r(g, -2, -29, 5, 5, '#2b2f38'); r(g, -1, -31, 3, 1, INK); r(g, -2, -28, 5, 1, '#3a3f4a');
  });
}

function cruceiro() {
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

function peto() {
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

function yew() {
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

function chapel() {
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

function bellSprite() {
  return spr(12, 14, 6, 2, g => {
    r(g, -1, -2, 2, 3, INK);
    r(g, -3, 0, 6, 2, INK); r(g, -4, 2, 8, 6, INK); r(g, -5, 7, 10, 2, INK);
    r(g, -2, 1, 4, 1, '#c9a04c'); r(g, -3, 2, 6, 5, '#c9a04c'); r(g, -4, 7, 8, 1, '#c9a04c');
    r(g, 1, 2, 2, 5, '#8a6a2c'); r(g, -3, 2, 1, 5, '#e6c06a'); r(g, 2, 7, 2, 1, '#8a6a2c');
    r(g, -1, 9, 2, 2, INK);
  });
}

function lighthouse() {
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

function coffin() {
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

function chair() {
  return spr(14, 20, 7, 17, g => {
    r(g, -6, -1, 12, 2, SHADE);
    r(g, -5, -3, 10, 2, INK); r(g, -4, -9, 8, 7, INK); r(g, -3, -8, 6, 5, '#7a5434'); r(g, -3, -8, 6, 1, '#94603f');
    r(g, -4, -15, 2, 7, INK); r(g, 3, -15, 2, 7, INK); r(g, -4, -15, 9, 2, INK); r(g, -3, -15, 7, 1, '#7a5434');
    r(g, -3, -14, 1, 6, '#4e3420'); r(g, 3, -14, 1, 6, '#4e3420'); r(g, -1, -13, 3, 1, '#4e3420');
  });
}

function stool() {
  return spr(14, 16, 7, 13, g => {
    r(g, -5, -1, 11, 2, SHADE);
    r(g, -4, -3, 9, 2, INK); r(g, -3, -6, 7, 4, '#4e3420'); r(g, -3, -6, 7, 1, '#6b4a2c');
    r(g, -3, -12, 3, 7, INK); r(g, -3, -11, 2, 5, '#5b646c'); r(g, -3, -11, 1, 5, '#9aa6ae');
    r(g, 1, -8, 2, 2, '#f1e8d2'); r(g, 1, -8, 2, 1, INK);
  });
}

function cirioSprite() {
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

/* ---------- el camposanto ---------- */

export class Cemetery {
  constructor() {
    this.chunks = new Map();
    this.grid = new Map();
    this.props = [];
    this.solids = [];
    this.warmQueue = null;
    this.art = {
      slab: [slab(0), slab(1), slab(2)],
      head: [0, 1, 2, 3, 4, 5].map(headstone),
      iron: ironCross(), wood: woodCross(), angel: angel(), votive: votiveSprite(),
      wallN: [wallNorth(1), wallNorth(2), wallNorth(3)], wallS: [wallSouth(1), wallSouth(2)],
      pillar: pillar(), lamp: lampPost(), cruceiro: cruceiro(), peto: peto(), yew: yew(), chapel: chapel(), bell: bellSprite(),
      lighthouse: lighthouse(), coffin: coffin(), chair: chair(), stool: stool(), cirio: cirioSprite(),
      pine: [pine(1), pine(2), pine(3)]
    };
    this.art.ironLean = [lean(this.art.iron, 9, 1), lean(this.art.iron, 9, -1)];
    this.art.woodLean = [lean(this.art.wood, 6, 1), lean(this.art.wood, 6, -1), lean(this.art.wood, 12, 1)];
    this.art.headLean = [lean(this.art.head[4], 7, 1), lean(this.art.head[4], 7, -1)];
    this.art.cypress = [];
    for (let i = 0; i < 6; i++) this.art.cypress.push(cypress(i * 13 + 3, i >= 4 ? -1 : 0));
    this.art.flowers = [];
    for (let i = 0; i < 4; i++) this.art.flowers.push(flowersSprite(i * 7 + 2, false), flowersSprite(i * 5 + 1, true));
    this.build();
  }

  add(p) {
    this.props.push(p);
    const key = `${Math.floor(p.x / CELL)},${Math.floor(p.y / CELL)}`;
    let cell = this.grid.get(key);
    if (!cell) { cell = []; this.grid.set(key, cell); }
    cell.push(p);
    return p;
  }

  /* Dónde va cada cosa. El azar es fijo: el camposanto es siempre el mismo. */
  build() {
    const A = this.art;
    const votive = (x, y, seed) => this.add({x, y, tall: A.votive, flames: [{dx: 0, dy: -11, kind: 'votive', seed}], lights: [{dx: 0, dy: -8, r: 46, i: 0.85, c: 'red', g: 0.9, seed}]});
    const clear = (x, y) => {
      if ((x / 250) ** 2 + (y / 186) ** 2 < 1) return false;
      if (Math.abs(x) < 176 && y < T + 150) return false;
      if (x < L + 140 && Math.abs(y) < 112) return false;
      if (x > R - 120 && Math.abs(y) < 98) return false;
      for (const k of ['cruceiro', 'yew', 'peto']) if (Math.hypot(x - LANDMARKS[k].x, (y - LANDMARKS[k].y) * 1.3) < (k === 'yew' ? 120 : 84)) return false;
      return true;
    };

    // Cuarteles de sepulturas, en filas, entre los paseos.
    const xs = [L, ...AVENUES_X, R], ys = [T, ...AVENUES_Y, B];
    for (let bi = 0; bi < xs.length - 1; bi++) for (let bj = 0; bj < ys.length - 1; bj++) {
      const x0 = xs[bi] + (bi === 0 ? 52 : half(xs[bi]) + 34), x1 = xs[bi + 1] - (bi === xs.length - 2 ? 52 : half(xs[bi + 1]) + 34);
      const y0 = ys[bj] + (bj === 0 ? 92 : half(ys[bj]) + 62), y1 = ys[bj + 1] - (bj === ys.length - 2 ? 34 : half(ys[bj + 1]) + 16);
      const west = (xs[bi] + xs[bi + 1]) / 2 < 0, north = (ys[bj] + ys[bj + 1]) / 2 < 0;
      const quarter = north ? (west ? 'viejo' : 'panteones') : (west ? 'pueblo' : 'mar');
      const stepX = quarter === 'mar' ? 104 : 94, stepY = quarter === 'panteones' ? 140 : 128;
      for (let y = y0, row = 0; y <= y1; y += stepY, row++) for (let x = x0 + (row % 2) * 8, col = 0; x <= x1; x += stepX, col++) {
        const seed = (bi * 7 + bj) * 1000 + row * 37 + col, v = hash(seed, 1, 25), j = quarter === 'viejo' ? 14 : 6;
        const px = Math.round(x + (hash(seed, 2, 26) - 0.5) * j), py = Math.round(y + (hash(seed, 3, 27) - 0.5) * j);
        if (!clear(px, py)) continue;
        this.plot(quarter, v, px, py, seed, votive);
      }
    }
    // Cipreses a los lados de los paseos principales.
    for (let y = -1030; y <= 1030; y += 158) {
      if (Math.abs(y) < 240 || Math.abs(y + 640) < 90 || y < T + 170) continue;
      for (const side of [-1, 1]) this.add({x: side * 62, y: y + side * 9, tall: A.cypress[(Math.abs(y) / 158 + side + 4) % 4 | 0]});
    }
    for (let x = -1440; x <= 1440; x += 204) {
      if (Math.abs(x) < 260 || Math.abs(Math.abs(x) - 640) < 60 || Math.abs(Math.abs(x) - 1280) < 60) continue;
      this.add({x, y: -60, tall: A.cypress[(Math.abs(x) / 204 | 0) % 4]});
    }
    // Nichos contra el muro norte, en la parte de los panteones.
    for (const x of [360, 700, 1010, 1390]) {
      const n = niches(x);
      this.add({x, y: T + 66, tall: n.tall, flames: n.votives.map((v, i) => ({...v, kind: 'votive', seed: x + i})), lights: n.votives.map((v, i) => ({dx: v.dx, dy: v.dy + 4, r: 40, i: 0.8, c: 'red', g: 0.9, seed: x + i}))});
      this.solids.push({x0: x - 62, y0: T + 34, x1: x + 62, y1: T + 68});
    }
    // El muro: al norte se le ve la cara; al sur tapa los pies de quien se arrima.
    const run = (y, tiles, gap, back) => {
      for (let x = L - 14, i = 0; x < R + 14; x += 128, i++) {
        const tall = tiles[i % tiles.length];
        if (x + 128 <= -gap || x >= gap) { this.add({x, y, tall, back}); continue; }
        if (x < -gap) this.add({x, y, tall, back, cropW: Math.round((-gap - x) / 2)});
        if (x + 128 > gap) this.add({x: gap, y, tall, back, cropW: Math.round((x + 128 - gap) / 2)});
      }
    };
    run(T, A.wallN, 124, true);
    run(B + 14, A.wallS, 28, false);
    for (let i = 0; i < 44; i++) {
      const x = L - 200 + hash(i, 1, 31) * (R - L + 400);
      if (Math.abs(x) < 150) continue;
      this.add({x: Math.round(x), y: Math.round(T - 46 - hash(i, 2, 32) * 150), tall: A.pine[i % 3], back: true});
    }
    for (let i = 0; i < 26; i++) {
      const y = T + hash(i, 3, 33) * (B - T);
      if (Math.abs(y) < 90) continue;
      this.add({x: Math.round(L - 60 - hash(i, 4, 34) * 150), y: Math.round(y), tall: A.pine[i % 3]});
    }
    // Hitos.
    const C = LANDMARKS;
    this.add({x: C.chapel.x, y: C.chapel.y, tall: A.chapel, back: true, bell: {dx: 0, dy: -236},
      flames: [{dx: 40, dy: -54, kind: 'lamp', seed: 5}, {dx: 2, dy: -110, kind: 'sanctuary', seed: 6}],
      lights: [{dx: 40, dy: -40, r: 150, i: 0.9, c: 'warm', g: 0.7, seed: 5}, {dx: 0, dy: -108, r: 34, i: 0.7, c: 'red', g: 0.9, seed: 6}]});
    this.add({x: C.cruceiro.x, y: C.cruceiro.y, tall: A.cruceiro});
    this.solids.push({x0: C.cruceiro.x - 22, y0: C.cruceiro.y - 22, x1: C.cruceiro.x + 22, y1: C.cruceiro.y + 2});
    votive(C.cruceiro.x - 30, C.cruceiro.y + 8, 71); votive(C.cruceiro.x + 28, C.cruceiro.y + 10, 72); votive(C.cruceiro.x + 6, C.cruceiro.y + 16, 73);
    this.add({x: C.yew.x, y: C.yew.y, tall: A.yew});
    this.solids.push({x0: C.yew.x - 12, y0: C.yew.y - 12, x1: C.yew.x + 12, y1: C.yew.y + 2});
    this.add({x: C.peto.x, y: C.peto.y, tall: A.peto, flames: [{dx: 0, dy: -40, kind: 'sanctuary', seed: 8}], lights: [{dx: 0, dy: -36, r: 60, i: 0.85, c: 'red', g: 0.9, seed: 8}]});
    this.solids.push({x0: C.peto.x - 14, y0: C.peto.y - 12, x1: C.peto.x + 14, y1: C.peto.y + 2});
    votive(C.peto.x - 20, C.peto.y + 8, 81); votive(C.peto.x + 20, C.peto.y + 6, 82);
    for (const side of [-1, 1]) {
      this.add({x: C.gate.x - 4, y: side * 50 + 4, tall: A.pillar, flames: [{dx: 11, dy: -40, kind: 'lamp', seed: 10 + side}], lights: [{dx: 11, dy: -34, r: 124, i: 0.9, c: 'warm', g: 0.7, seed: 10 + side}]});
      this.add({x: C.stairs.x - 30, y: side * 62, tall: A.lamp, flames: [{dx: 1, dy: -54, kind: 'lamp', seed: 14 + side}], lights: [{dx: 1, dy: -50, r: 116, i: 0.85, c: 'warm', g: 0.65, seed: 14 + side}]});
    }
    this.add({x: LIGHTHOUSE.x, y: LIGHTHOUSE.y, tall: A.lighthouse, flames: [{dx: 0, dy: LIGHTHOUSE.lampY, kind: 'beacon', seed: 20}], lights: [{dx: 0, dy: LIGHTHOUSE.lampY, r: 210, i: 0.95, c: 'white', g: 0.8, seed: 20}]});
    // El velatorio.
    this.add({x: 0, y: 0, tall: A.coffin, wake: true, sort: 18});
    this.solids.push({x0: -44, y0: -12, x1: 44, y1: 14});
    this.add({x: -94, y: 2, tall: A.chair});
    this.add({x: 96, y: 6, tall: A.stool});
    CIRIOS.forEach((c, i) => this.add({x: c.x, y: c.y, tall: A.cirio, cirio: i}));
  }

  plot(quarter, v, x, y, seed, votive) {
    const A = this.art, h = n => hash(seed, n, 29);
    const tomb = (slabKind, headKind, deco) => {
      const head = headKind === 'lean' ? A.headLean[seed % 2] : A.head[headKind];
      this.add({x, y, flat: A.slab[slabKind], tall: head, sort: -4, tallDy: slabKind === 1 ? -2 : -4});
      if (h(11) < deco) this.add({x: x - 8, y: y + 12, flat: A.flowers[(seed % 4) * 2 + (h(12) > 0.55 ? 1 : 0)], flatDy: 0});
      if (h(13) < deco * 0.8) votive(x + 12, y + 14, seed);
      if (h(14) < deco * 0.35) votive(x - 2, y + 18, seed + 1);
    };
    if (quarter === 'viejo') {
      if (v < 0.26) tomb(0, 'lean', 0.2);
      else if (v < 0.36) tomb(1, 4, 0.15);
      else if (v < 0.52) this.add({x, y, tall: v < 0.44 ? A.ironLean[seed % 2] : A.iron});
      else if (v < 0.63) this.add({x, y, tall: A.woodLean[seed % 3]});
      else if (v < 0.69) this.add({x, y, tall: A.cypress[seed % 4]});
      else if (v < 0.75) tomb(0, 1, 0.3);
    } else if (quarter === 'panteones') {
      if (v < 0.24) tomb(2, 3, 0.7);
      else if (v < 0.44) tomb(0, 2, 0.5);
      else if (v < 0.54) tomb(0, h(15) > 0.5 ? 0 : 1, 0.5);
      else if (v < 0.63) this.add({x, y, tall: A.angel});
      else if (v < 0.69) this.add({x, y, tall: A.cypress[seed % 4]});
    } else if (quarter === 'pueblo') {
      if (v < 0.36) tomb(0, h(15) > 0.5 ? 0 : 1, 1);
      else if (v < 0.48) tomb(2, 0, 0.9);
      else if (v < 0.55) tomb(2, 5, 0.9);
      else if (v < 0.62) this.add({x, y, tall: A.iron});
      else if (v < 0.68) this.add({x, y, tall: A.cypress[seed % 4]});
      else if (v < 0.72) this.add({x, y: y + 6, flat: A.flowers[(seed % 4) * 2 + 1]});
    } else {
      if (v < 0.24) { this.add({x, y, flat: A.slab[1]}); this.add({x, y: y - 2, tall: A.woodLean[seed % 3]}); if (h(13) < 0.3) votive(x + 12, y + 12, seed); }
      else if (v < 0.36) this.add({x, y, tall: A.woodLean[seed % 3]});
      else if (v < 0.46) tomb(0, 4, 0.35);
      else if (v < 0.52) this.add({x, y, tall: A.cypress[4 + seed % 2]});
    }
  }

  /* ---------- suelo ---------- */

  chunk(cx, cy) {
    const key = cx * 4096 + cy;
    let c = this.chunks.get(key);
    if (!c) { c = paintChunk(cx, cy); this.chunks.set(key, c); }
    return c;
  }

  /* Pinta un trozo pendiente; se llama en la pantalla de título para no hacerlo durante la noche. */
  warm() {
    if (!this.warmQueue) {
      this.warmQueue = [];
      const m = WORLD.margin;
      for (let cy = Math.floor((T - m.n) / CELL); cy <= Math.floor((B + m.s) / CELL); cy++)
        for (let cx = Math.floor((L - m.w) / CELL); cx <= Math.floor((R + m.e) / CELL); cx++) this.warmQueue.push([cx, cy]);
      this.warmQueue.sort((a, b) => Math.hypot(a[0] + 0.5, a[1] + 0.5) - Math.hypot(b[0] + 0.5, b[1] + 0.5));
    }
    while (this.warmQueue.length) {
      const [cx, cy] = this.warmQueue.shift();
      if (this.chunks.has(cx * 4096 + cy)) continue;
      this.chunk(cx, cy);
      return true;
    }
    return false;
  }

  ground(ctx, camX, camY, w, h) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let cy = Math.floor(camY / CELL); cy <= Math.floor((camY + h) / CELL); cy++)
      for (let cx = Math.floor(camX / CELL); cx <= Math.floor((camX + w) / CELL); cx++)
        ctx.drawImage(this.chunk(cx, cy), cx * CELL - camX, cy * CELL - camY, CELL, CELL);
    ctx.restore();
  }

  /* El mar se mueve: destellos que van y vienen y la espuma en las rocas. */
  sea(ctx, camX, camY, w, h, time) {
    if (camX + w < R + 90) return;
    ctx.save();
    const y0 = Math.floor(camY / 12) * 12;
    for (let wy = y0; wy < camY + h; wy += 12) {
      const shore = shoreX(wy) + 30, row = wy / 12;
      const foam = shore + 3 + Math.sin(time * 0.9 + wy * 0.035) * 5;
      ctx.fillStyle = `rgba(190,214,226,${0.2 + 0.12 * Math.sin(time * 0.9 + wy * 0.035 + 1)})`;
      ctx.fillRect(Math.round(foam - camX), wy - camY, 4, 2);
      if (hash(row, 3, 41) > 0.4) ctx.fillRect(Math.round(foam + 6 - camX), wy - camY + 6, 2, 2);
      for (let k = 0; k < 4; k++) {
        const seed = hash(row, k, 42);
        if (seed < 0.35) continue;
        const span = 520 - (shore - R - 100);
        const x = shore + 14 + ((seed * 977 + time * (5 + seed * 7)) % span);
        const a = 0.05 + 0.12 * (0.5 + 0.5 * Math.sin(time * (0.7 + seed) + row * 1.7 + k));
        ctx.fillStyle = `rgba(150,186,214,${a})`;
        ctx.fillRect(Math.round(x - camX), wy - camY + Math.round(seed * 8), 6 + Math.round(seed * 10), 2);
      }
    }
    ctx.restore();
  }

  /* ---------- piezas en pantalla ---------- */

  /*
   * Dibuja lo que va a ras de suelo y devuelve en items lo que tiene altura,
   * para ordenarlo con las criaturas. flames y lights, en coordenadas de pantalla.
   */
  collect(ctx, camX, camY, w, h, time, state, items, flames, lights) {
    const cirios = state.cirios, dim = state.dim ?? 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (let cy = Math.floor((camY - 260) / CELL); cy <= Math.floor((camY + h + 320) / CELL); cy++) {
      for (let cx = Math.floor((camX - 300) / CELL); cx <= Math.floor((camX + w + 300) / CELL); cx++) {
        const cell = this.grid.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const p of cell) {
          const sx = Math.round(p.x - camX), sy = Math.round(p.y - camY);
          if (sx < -260 || sx > w + 260 || sy < -230 || sy > h + 300) continue;
          const seen = sx > -200 && sx < w + 200 && sy > -40;
          if (p.flat && seen) ctx.drawImage(p.flat.c, sx - p.flat.ox * 2, sy + (p.flatDy || 0) - p.flat.oy * 2, p.flat.w * 2, p.flat.h * 2);
          if (p.tall && seen) items.push({kind: 'prop', p, x: sx, y: sy + (p.tallDy || 0), sortY: p.back ? -1e6 + sy : sy + (p.sort || 0)});
          let lit = true;
          if (p.cirio !== undefined) {
            const c = cirios?.[p.cirio];
            lit = !c || c.lit;
            if (lit) {
              const flick = 0.9 + Math.sin(time * 7 + p.cirio * 3) * 0.06 + Math.sin(time * 19 + p.cirio) * 0.04;
              flames.push({x: sx, y: sy - 62, kind: 'cirio', f: flick, flare: c?.flare || 0});
              lights.push({x: sx, y: sy - 52, r: (124 + (c?.flare || 0) * 60) * flick, i: 1, c: 'warm', g: 1});
            }
            continue;
          }
          if (p.flames) for (const f of p.flames) {
            const flick = 0.85 + Math.sin(time * 9 + f.seed * 7) * 0.08 + Math.sin(time * 23 + f.seed) * 0.05;
            flames.push({x: sx + f.dx, y: sy + f.dy, kind: f.kind, f: flick});
          }
          if (p.lights) for (const l of p.lights) {
            const flick = 0.88 + Math.sin(time * 9 + l.seed * 7) * 0.07 + Math.sin(time * 23 + l.seed) * 0.05;
            lights.push({x: sx + l.dx, y: sy + l.dy, r: l.r * flick, i: l.i * (l.c === 'red' ? dim : 1), c: l.c, g: l.g});
          }
          if (p.wake) lights.push({x: sx, y: sy - 14, r: 90 + 36 * (state.lit ?? 4), i: 0.2 + 0.09 * (state.lit ?? 4), c: 'warm', g: 0.6});
        }
      }
    }
    ctx.restore();
  }

  drawProp(ctx, it, state) {
    const p = it.p, s = p.tall;
    if (p.cropW) ctx.drawImage(s.c, 0, 0, p.cropW, s.h, it.x - s.ox * 2, it.y - s.oy * 2, p.cropW * 2, s.h * 2);
    else ctx.drawImage(s.c, it.x - s.ox * 2, it.y - s.oy * 2, s.w * 2, s.h * 2);
    if (p.bell) {
      // La campana de la espadaña se mueve cuando da la hora.
      const swing = Math.sin((state.bell || 0) * 7) * Math.min(1, (state.bell || 0) / 1.5) * 0.5, b = this.art.bell;
      ctx.save();
      ctx.translate(it.x + p.bell.dx, it.y + p.bell.dy);
      ctx.rotate(swing);
      ctx.drawImage(b.c, -b.ox * 2, -b.oy * 2, b.w * 2, b.h * 2);
      ctx.restore();
    }
  }

  /* Lo que no se atraviesa: el ataúd, el cruceiro, el tejo y los nichos. */
  resolve(pos, radius = 9) {
    pos.x = Math.max(L + 14, Math.min(R - 14, pos.x));
    pos.y = Math.max(T + 26, Math.min(B - 8, pos.y));
    for (const s of this.solids) {
      const nx = Math.max(s.x0, Math.min(s.x1, pos.x)), ny = Math.max(s.y0, Math.min(s.y1, pos.y));
      const dx = pos.x - nx, dy = pos.y - ny, d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      if (d2 > 0.0001) { const d = Math.sqrt(d2); pos.x = nx + dx / d * radius; pos.y = ny + dy / d * radius; continue; }
      // Dentro del todo: sale por el lado más cercano.
      const out = [[pos.x - s.x0 + radius, -1, 0], [s.x1 - pos.x + radius, 1, 0], [pos.y - s.y0 + radius, 0, -1], [s.y1 - pos.y + radius, 0, 1]].sort((a, b) => a[0] - b[0])[0];
      pos.x += out[1] * out[0]; pos.y += out[2] * out[0];
    }
    return pos;
  }
}

/* Llamas dibujadas después de la oscuridad, para que brillen. */
export function drawFlames(c, flames, time) {
  c.save();
  for (const f of flames) {
    const x = Math.round(f.x), y = Math.round(f.y);
    const lean = Math.round(Math.sin(time * 3 + x) * 0.6);
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
function fogSprite() {
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
