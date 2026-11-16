/*
 * El atrio de la ermita del Carmen: el recinto donde se vela. Un enlosado de
 * granito con muro bajo, faroles en las esquinas y, al norte, el pórtico con
 * el ataúd de Amparo y sus cuatro cirios. Fuera del muro, el camposanto.
 *
 * El suelo se pinta una sola vez en un lienzo; las piezas con altura se
 * ordenan con las criaturas. Todo está en píxeles de arte: uno ocupa dos del mundo.
 */
import { lerp } from './util.js';
import { makeCanvas, hash } from './art.js';
import { ARENA, COFFIN } from './balance.js';
import { chapel, coffin, cirioSprite, chair, stool, lampPost, pillar, cypress, pine, headstone, ironCross, woodCross, slab,
  flowersSprite, votiveSprite, wallNorth, wallSouth, angel, yew, cruceiro, lean } from './props.js';

const {left: L, right: R, top: T, bottom: B} = ARENA;
/* Lo que se pinta del mundo: el atrio y un buen margen alrededor. */
const VIEW = {left: L - 420, right: R + 420, top: T - 520, bottom: B + 320};
export const CAMERA_BOUNDS = {left: L - 150, right: R + 150, top: T - 300, bottom: B + 120};
export const CIRIOS = [{x: -58, y: -30}, {x: 58, y: -30}, {x: -58, y: 38}, {x: 58, y: 38}].map(c => ({x: COFFIN.x + c.x, y: COFFIN.y + c.y}));

const GRASS = 0, PAVE = 1, FLAG = 2, WALL = 3, GRAVEL = 4, PORCH = 5, MOSAIC = 6, DARK = 7;

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return lerp(lerp(hash(xi, yi, seed), hash(xi + 1, yi, seed), sx), lerp(hash(xi, yi + 1, seed), hash(xi + 1, yi + 1, seed), sx), sy);
}

/* Qué hay en cada punto del mundo. */
export function terrain(wx, wy) {
  const inside = wx >= L && wx <= R && wy >= T && wy <= B;
  if (inside) {
    const r = Math.hypot(wx, wy * 1.25);
    if (r < 150) return MOSAIC;
    if (Math.abs(wx) < 34 || Math.abs(wy) < 26) return FLAG;
    return PAVE;
  }
  // El muro: una franja de piedra alrededor, abierta al norte por el pórtico.
  const band = 18;
  const nearX = wx > L - band && wx < R + band, nearY = wy > T - band && wy < B + band;
  if (nearX && nearY) {
    if (wy < T && Math.abs(wx) < 190) return PORCH;
    return WALL;
  }
  if (wy < T && wy > T - 230 && Math.abs(wx) < 190) return PORCH;
  if (wy < T - 470) return DARK;
  // Caminos de grava entre las sepulturas de fuera.
  if (Math.abs(wy) < 20 + vnoise(wx / 40, 1, 3) * 6 && (wx < L || wx > R)) return GRAVEL;
  if (Math.abs(wx) < 24 + vnoise(wy / 40, 2, 4) * 6 && wy > B) return GRAVEL;
  return GRASS;
}

function groundColor(k, ax, ay, wx, wy) {
  const n = hash(ax, ay, 39);
  switch (k) {
    case PAVE: {
      // Losas de granito en hileras, con juntas de musgo.
      const row = Math.floor(ay / 7), sx = ax + (row & 1) * 5, col = Math.floor(sx / 10);
      const v = hash(col, row, 62), moss = vnoise(wx / 90, wy / 90, 8);
      if (ay % 7 === 0 || sx % 10 === 0) return moss > 0.62 ? [34, 54, 40] : [30, 34, 36];
      const c = v > 0.72 ? [74, 80, 82] : v < 0.25 ? [52, 57, 60] : [62, 68, 70];
      if (moss > 0.7 && n > 0.55) return [44, 64, 48];
      return n > 0.92 ? [c[0] + 10, c[1] + 10, c[2] + 10] : n < 0.06 ? [c[0] - 8, c[1] - 8, c[2] - 8] : c;
    }
    case FLAG: {
      const row = Math.floor(ay / 12), col = Math.floor((ax + (row & 1) * 7) / 14);
      if (ay % 12 === 0 || (ax + (row & 1) * 7) % 14 === 0) return [36, 40, 42];
      const v = hash(col, row, 64);
      const c = v > 0.6 ? [86, 90, 90] : [76, 80, 81];
      return n > 0.9 ? [c[0] + 8, c[1] + 8, c[2] + 6] : c;
    }
    case MOSAIC: {
      // La rosa de piedra del centro: anillos claros y oscuros con una cruz.
      const r = Math.hypot(wx, wy * 1.25), ring = Math.floor(r / 22);
      const a = Math.atan2(wy * 1.25, wx), spoke = Math.abs(Math.sin(a * 4)) < 0.12;
      if (r < 18) return [148, 132, 96];
      if (spoke && r > 30) return [120, 108, 82];
      if (Math.abs(r % 22) < 2) return [38, 42, 44];
      const base = ring % 2 ? [92, 96, 96] : [70, 74, 76];
      return n > 0.9 ? [base[0] + 10, base[1] + 10, base[2] + 8] : base;
    }
    case WALL: {
      if (ay % 6 === 0 || (ax + Math.floor(ay / 6) * 4) % 11 === 0) return [34, 38, 40];
      return n > 0.85 ? [104, 110, 110] : n < 0.2 ? [72, 78, 80] : [88, 94, 96];
    }
    case PORCH: {
      const step = Math.floor((T - wy) / 26);
      if ((T - wy) % 26 < 3) return [40, 44, 46];
      const v = hash(Math.floor(ax / 9), step, 66);
      return v > 0.6 ? [96, 100, 100] : [84, 88, 90];
    }
    case GRAVEL: return n > 0.9 ? [72, 69, 60] : n < 0.25 ? [34, 33, 30] : [48, 46, 41];
    case DARK: return n > 0.95 ? [18, 16, 12] : [8, 11, 11];
    default: {
      const p = vnoise(wx / 120, wy / 120, 4);
      if (p < 0.4) return n < 0.14 ? [19, 29, 28] : [15, 23, 23];
      if (p < 0.66) return n < 0.14 ? [22, 34, 31] : [18, 27, 26];
      return n < 0.16 ? [27, 41, 35] : [21, 32, 29];
    }
  }
}

function paintGround() {
  const W = (VIEW.right - VIEW.left) / 2, H = (VIEW.bottom - VIEW.top) / 2;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const img = g.createImageData(W, H), d = img.data;
  const kinds = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wx = VIEW.left + x * 2, wy = VIEW.top + y * 2, ax = Math.floor(wx / 2) + 4096, ay = Math.floor(wy / 2) + 4096;
      const k = terrain(wx, wy), rgb = groundColor(k, ax, ay, wx, wy), i = (y * W + x) * 4;
      kinds[y * W + x] = k;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Matas, hojas secas de noviembre, grietas y margaritas.
  for (let y = 0; y < H; y += 5) {
    for (let x = 0; x < W; x += 5) {
      const h = hash(x, y, 55), px = x + Math.floor(hash(x, y, 56) * 4), py = y + Math.floor(hash(x, y, 57) * 4);
      if (px < 1 || py < 1 || px > W - 3 || py > H - 3) continue;
      const k = kinds[py * W + px];
      if (k === GRASS) {
        if (h > 0.78) { g.fillStyle = h > 0.93 ? '#2b473a' : '#1d2f28'; g.fillRect(px, py, 1, 2); g.fillRect(px - 1, py + 1, 1, 1); g.fillRect(px + 1, py - 1, 1, 2); }
        else if (h > 0.72) { g.fillStyle = '#4a3420'; g.fillRect(px, py, 2, 1); }
        else if (h < 0.012) { g.fillStyle = '#b9bfae'; g.fillRect(px, py, 1, 1); g.fillStyle = '#c9a94e'; g.fillRect(px + 1, py - 1, 1, 1); }
      } else if (k === PAVE || k === FLAG) {
        if (h > 0.985) { g.fillStyle = '#4a3420'; g.fillRect(px, py, 2, 1); g.fillRect(px + 1, py + 1, 1, 1); }
        else if (h < 0.01) { g.fillStyle = '#262b2d'; g.fillRect(px, py, 3, 1); g.fillRect(px + 2, py + 1, 2, 1); }
        else if (h > 0.5 && h < 0.506) { g.fillStyle = '#3d5b40'; g.fillRect(px, py, 2, 2); }
      }
    }
  }
  return c;
}

export class Arena {
  constructor() {
    this.ground_ = null;
    this.props = [];
    this.art = null;
  }

  /* Se prepara la primera vez que hace falta, para no frenar el arranque. */
  ensure() {
    if (this.ground_) return;
    this.ground_ = paintGround();
    const A = this.art = {
      chapel: chapel(), coffin: coffin(), cirio: cirioSprite(), chair: chair(), stool: stool(), lamp: lampPost(), pillar: pillar(),
      cypress: [0, 1, 2, 3].map(i => cypress(i * 13 + 3, i === 3 ? -1 : 0)), pine: [1, 2, 3].map(pine),
      head: [0, 1, 2, 3, 4, 5].map(headstone), iron: ironCross(), wood: woodCross(), slab: [slab(0), slab(1), slab(2)],
      flowers: [0, 1, 2, 3].flatMap(i => [flowersSprite(i * 7 + 2, false), flowersSprite(i * 5 + 1, true)]), votive: votiveSprite(),
      wallN: [wallNorth(1), wallNorth(2), wallNorth(3)], wallS: [wallSouth(1), wallSouth(2)], angel: angel(), yew: yew(), cruceiro: cruceiro()
    };
    A.woodLean = [lean(A.wood, 6, 1), lean(A.wood, 6, -1)];
    A.headLean = [lean(A.head[4], 7, 1), lean(A.head[4], 7, -1)];
    const add = p => { this.props.push(p); return p; };
    const lamp = (x, y, seed) => add({x, y, tall: A.lamp, flames: [{dx: 1, dy: -54, kind: 'lamp', seed}], lights: [{dx: 1, dy: -50, r: 175, i: 0.95, c: 'warm', g: 0.6, seed}]});
    const votive = (x, y, seed) => add({x, y, tall: A.votive, flames: [{dx: 0, dy: -11, kind: 'votive', seed}], lights: [{dx: 0, dy: -8, r: 50, i: 0.85, c: 'red', g: 0.9, seed}]});
    // El pórtico: la ermita, el ataúd, los cirios, la silla de quien vela.
    add({x: 0, y: T - 196, tall: A.chapel, back: true, flames: [{dx: 40, dy: -54, kind: 'lamp', seed: 5}, {dx: 2, dy: -110, kind: 'sanctuary', seed: 6}],
      lights: [{dx: 40, dy: -40, r: 170, i: 0.95, c: 'warm', g: 0.7, seed: 5}, {dx: 0, dy: -108, r: 40, i: 0.7, c: 'red', g: 0.9, seed: 6}]});
    add({x: COFFIN.x, y: COFFIN.y, tall: A.coffin, sort: 18, wake: true});
    CIRIOS.forEach((c, i) => add({x: c.x, y: c.y, tall: A.cirio, cirio: i}));
    add({x: COFFIN.x - 100, y: COFFIN.y + 4, tall: A.chair});
    add({x: COFFIN.x + 104, y: COFFIN.y + 8, tall: A.stool});
    // El muro: al norte se le ve la cara, con el hueco del pórtico; al sur tapa los pies.
    for (let x = L - 16; x < R + 16; x += 128) {
      if (x + 128 > -190 && x < 190) continue;
      add({x, y: T - 2, tall: A.wallN[Math.abs(x / 128 | 0) % 3], back: true});
    }
    for (let x = L - 16; x < R + 16; x += 128) add({x, y: B + 22, tall: A.wallS[Math.abs(x / 128 | 0) % 2]});
    for (const y of [T + 150, 0, B - 150]) { add({x: L - 12, y, tall: A.pillar}); add({x: R + 12, y, tall: A.pillar}); }
    // Faroles: en las esquinas, en los lados y a los pies del pórtico.
    lamp(L + 14, T + 12, 1); lamp(R - 14, T + 12, 2); lamp(L + 14, B - 6, 3); lamp(R - 14, B - 6, 4);
    lamp(L + 10, 0, 7); lamp(R - 10, 0, 8); lamp(-190, T + 8, 9); lamp(190, T + 8, 10);
    lamp(0, B - 4, 11);
    // Fuera del muro: cipreses, sepulturas con lamparillas y el pinar al norte.
    for (let y = T + 60; y <= B; y += 150) {
      for (const side of [-1, 1]) add({x: side * (R + 70 + hash(y, side, 3) * 30), y: y + side * 9, tall: A.cypress[Math.abs(y / 150 | 0) % 4]});
    }
    let seed = 1;
    for (const side of [-1, 1]) for (let y = T + 30; y < B + 200; y += 116) for (let k = 0; k < 2; k++) {
      const x = side * (R + 150 + k * 96 + hash(y, k, 9) * 20), v = hash(y, k + side, 11);
      seed++;
      if (v < 0.35) { add({x, y, flat: A.slab[seed % 3], tall: A.head[seed % 6], sort: -4, tallDy: -4}); if (hash(seed, 2, 3) < 0.5) votive(x + 12, y + 14, seed); }
      else if (v < 0.55) add({x, y, tall: A.iron});
      else if (v < 0.7) add({x, y, tall: A.woodLean[seed % 2]});
      else if (v < 0.8) add({x, y, tall: A.angel});
      else { add({x, y, flat: A.slab[1]}); if (hash(seed, 4, 3) < 0.6) votive(x - 6, y + 10, seed); }
    }
    for (let x = L - 300; x <= R + 300; x += 120) {
      seed++;
      if (Math.abs(x) < 260) continue;
      const y = B + 120 + hash(x, 1, 5) * 120, v = hash(x, 2, 6);
      if (v < 0.5) { add({x, y, flat: A.slab[seed % 3], tall: A.head[(seed + 2) % 6], sort: -4, tallDy: -4}); if (v < 0.25) votive(x + 10, y + 14, seed); }
      else add({x, y, tall: v < 0.75 ? A.iron : A.headLean[seed % 2]});
    }
    for (let i = 0; i < 26; i++) {
      const x = VIEW.left + hash(i, 1, 31) * (VIEW.right - VIEW.left);
      if (Math.abs(x) < 260) continue;
      add({x: Math.round(x), y: Math.round(T - 240 - hash(i, 2, 32) * 220), tall: A.pine[i % 3], back: true});
    }
    add({x: L - 200, y: T + 40, tall: A.yew});
    add({x: R + 230, y: B + 80, tall: A.cruceiro});
    // Flores a los pies del muro, por dentro: no estorban, solo se ven.
    for (let i = 0; i < 18; i++) {
      const t = hash(i, 4, 77), side = i % 4;
      const x = side < 2 ? lerp(L + 30, R - 30, t) : side === 2 ? L + 20 : R - 20;
      const y = side === 0 ? T + 22 : side === 1 ? B - 14 : lerp(T + 40, B - 30, t);
      if (Math.abs(x) < 200 && side === 0) continue;
      add({x: Math.round(x), y: Math.round(y), flat: A.flowers[i % 8]});
    }
    this.props.sort((a, b) => a.y - b.y);
  }

  /* El que vela no sale del atrio. */
  resolve(pos, radius = 10) {
    pos.x = Math.max(L + radius, Math.min(R - radius, pos.x));
    pos.y = Math.max(T + radius + 8, Math.min(B - radius * 0.4, pos.y));
    return pos;
  }

  surfaceAt(wx, wy) {
    const k = terrain(wx, wy);
    return k === GRASS ? 'hierba' : k === GRAVEL ? 'grava' : 'piedra';
  }

  ground(ctx, camX, camY, w, h) {
    this.ensure();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#080b0b';
    ctx.fillRect(0, 0, w, h);
    const sx = Math.max(0, (camX - VIEW.left) / 2), sy = Math.max(0, (camY - VIEW.top) / 2);
    const sw = Math.min(this.ground_.width - sx, w / 2 + 1), sh = Math.min(this.ground_.height - sy, h / 2 + 1);
    if (sw > 0 && sh > 0) ctx.drawImage(this.ground_, sx, sy, sw, sh, Math.round(VIEW.left + sx * 2 - camX), Math.round(VIEW.top + sy * 2 - camY), sw * 2, sh * 2);
    ctx.restore();
  }

  /*
   * Dibuja lo que va a ras de suelo y devuelve en items lo que tiene altura,
   * para ordenarlo con las criaturas. flames y lights, en coordenadas de pantalla.
   */
  collect(ctx, camX, camY, w, h, time, wake, items, flames, lights) {
    this.ensure();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const p of this.props) {
      const sx = Math.round(p.x - camX), sy = Math.round(p.y - camY);
      if (sx < -300 || sx > w + 300 || sy < -40 || sy > h + 320) continue;
      if (p.flat) ctx.drawImage(p.flat.c, sx - p.flat.ox * 2, sy - p.flat.oy * 2, p.flat.w * 2, p.flat.h * 2);
      if (p.tall) items.push({kind: 'prop', p, x: sx, y: sy + (p.tallDy || 0), sortY: p.back ? -1e6 + sy : sy + (p.sort || 0)});
      if (p.cirio !== undefined) {
        const flick = 0.9 + Math.sin(time * 7 + p.cirio * 3) * 0.06 + Math.sin(time * 19 + p.cirio) * 0.04;
        flames.push({x: sx, y: sy - 62, kind: 'cirio', f: flick, flare: wake.flare || 0});
        lights.push({x: sx, y: sy - 52, r: 150 * flick, i: 1, c: 'warm', g: 0.9});
        continue;
      }
      if (p.flames) for (const f of p.flames) {
        const flick = 0.85 + Math.sin(time * 9 + f.seed * 7) * 0.08 + Math.sin(time * 23 + f.seed) * 0.05;
        flames.push({x: sx + f.dx, y: sy + f.dy, kind: f.kind, f: flick});
      }
      if (p.lights) for (const l of p.lights) {
        const flick = 0.9 + Math.sin(time * 9 + l.seed * 7) * 0.06 + Math.sin(time * 23 + l.seed) * 0.04;
        lights.push({x: sx + l.dx, y: sy + l.dy, r: l.r * flick, i: l.i, c: l.c, g: l.g});
      }
      if (p.wake) lights.push({x: sx, y: sy - 14, r: 230, i: 0.55, c: 'warm', g: 0.5});
    }
    ctx.restore();
  }

  drawProp(ctx, it) {
    const s = it.p.tall;
    ctx.drawImage(s.c, it.x - s.ox * 2, it.y - s.oy * 2, s.w * 2, s.h * 2);
  }
}
