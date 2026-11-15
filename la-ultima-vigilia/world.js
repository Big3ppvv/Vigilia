/*
 * El camposanto: el suelo, las tumbas, el velatorio de Amparo y la niebla.
 * Todo se dibuja con código y siempre queda en el mismo sitio.
 */
import { TAU } from './util.js';
import { makeCanvas, hash } from './art.js';

/* ---------- piezas sueltas ---------- */

function px(c, u, x, y, w, h, color) {
  c.fillStyle = color;
  c.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u));
}

/* Lamparilla de cristal rojo, como las del día de Todos los Santos. */
function votive(c, x, y, flames, lights, time, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  px(c, 2, -2, 0, 4, 1, '#07080d');
  px(c, 2, -2, -4, 4, 4, '#5e1d14');
  px(c, 2, -1, -4, 2, 3, '#a8331f');
  px(c, 2, -2, -5, 4, 1, '#07080d');
  c.restore();
  const flick = 0.85 + Math.sin(time * 9 + seed * 7) * 0.08 + Math.sin(time * 23 + seed) * 0.05;
  flames.push({x, y: y - 11, kind: 'votive', f: flick});
  lights.push({x, y: y - 8, r: 46 * flick, i: 0.85, c: 'red', g: 0.9});
}

function cirioStand(c, x, y, flames, lights, time, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  px(c, 2, -4, 0, 8, 2, '#07080d');
  px(c, 2, -3, -1, 6, 2, '#8a6a2c');
  px(c, 2, -1, -14, 2, 14, '#8a6a2c');
  px(c, 2, -1, -14, 1, 14, '#c9a04c');
  px(c, 2, -3, -15, 6, 2, '#c9a04c');
  px(c, 2, -1, -22, 2, 7, '#f1e8d2');
  px(c, 2, 0, -22, 1, 7, '#c9bb9a');
  c.restore();
  const flick = 0.9 + Math.sin(time * 7 + seed * 3) * 0.06 + Math.sin(time * 19 + seed) * 0.04;
  flames.push({x, y: y - 48, kind: 'cirio', f: flick});
  lights.push({x, y: y - 44, r: 120 * flick, i: 1, c: 'warm', g: 1});
}

function flowers(c, x, y, seed) {
  for (let i = 0; i < 7; i++) {
    const fx = x + (hash(seed, i, 3) - 0.5) * 18, fy = y + (hash(seed, i, 5) - 0.5) * 8;
    c.fillStyle = '#26402c'; c.fillRect(Math.round(fx) - 1, Math.round(fy), 3, 3);
    c.fillStyle = hash(seed, i, 9) > 0.45 ? '#ebe8dc' : '#e8c25a';
    c.fillRect(Math.round(fx) - 1, Math.round(fy) - 2, 3, 3);
    c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(Math.round(fx), Math.round(fy) - 1, 1, 1);
  }
}

function tomb(c, x, y, v, flames, lights, time, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  const u = 2;
  px(c, u, -12, 6, 25, 4, 'rgba(2,3,8,.45)');
  // losa
  px(c, u, -10, -2, 20, 11, '#07080d');
  px(c, u, -9, -1, 18, 9, '#3c4447');
  px(c, u, -9, -1, 18, 2, '#4d5659');
  px(c, u, -9, 6, 18, 2, '#2a3134');
  // cabecera
  px(c, u, -7, -16, 14, 15, '#07080d');
  px(c, u, -6, -15, 12, 14, '#4a5356');
  px(c, u, -5, -17, 10, 2, '#07080d');
  px(c, u, -5, -16, 10, 2, '#5a6366');
  px(c, u, 4, -14, 2, 13, '#353d40');
  if (v > 0.5) { px(c, u, -1, -13, 2, 8, '#2a3134'); px(c, u, -3, -11, 6, 2, '#2a3134'); }
  else { for (let i = 0; i < 4; i++) px(c, u, -4, -12 + i * 3, i === 3 ? 5 : 8, 1, '#30383b'); }
  // musgo
  px(c, u, -6, -3, 3, 2, '#2f4632'); px(c, u, 4, -2, 2, 2, '#2f4632');
  c.restore();
  if (hash(seed, 2, 41) > 0.5) flowers(c, x - 6, y + 4, seed);
  if (hash(seed, 3, 17) > 0.45) votive(c, x + 9, y + 10, flames, lights, time, seed);
}

function ironCross(c, x, y, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  const u = 2;
  px(c, u, -6, 8, 12, 3, 'rgba(2,3,8,.45)');
  px(c, u, -3, 6, 6, 3, '#2a3134');
  px(c, u, -1, -20, 2, 27, '#07080d');
  px(c, u, -7, -14, 14, 2, '#07080d');
  px(c, u, -1, -20, 1, 26, '#3a3f4a');
  px(c, u, -7, -14, 13, 1, '#3a3f4a');
  px(c, u, -3, -16, 1, 1, '#3a3f4a'); px(c, u, 2, -16, 1, 1, '#3a3f4a');
  px(c, u, -3, -12, 1, 1, '#3a3f4a'); px(c, u, 2, -12, 1, 1, '#3a3f4a');
  c.restore();
  if (hash(seed, 7, 2) > 0.5) flowers(c, x, y + 10, seed);
}

function woodCross(c, x, y, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate((hash(seed, 1, 1) - 0.5) * 0.18);
  const u = 2;
  px(c, u, -6, 7, 12, 3, 'rgba(2,3,8,.4)');
  px(c, u, -2, -16, 4, 24, '#07080d');
  px(c, u, -7, -10, 14, 4, '#07080d');
  px(c, u, -1, -15, 2, 22, '#5a3e27');
  px(c, u, -6, -9, 12, 2, '#5a3e27');
  px(c, u, -1, -15, 1, 22, '#7a5434');
  c.restore();
}

function cypress(c, x, y, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  c.fillStyle = 'rgba(2,3,8,.5)';
  c.beginPath(); c.ellipse(4, 4, 22, 8, 0, 0, TAU); c.fill();
  c.fillStyle = '#2b1f16'; c.fillRect(-2, -8, 5, 12);
  const h = 92 + hash(seed, 1, 8) * 30;
  for (let i = 0; i < h; i += 4) {
    const t = i / h;
    const wv = (Math.sin(t * Math.PI) * 0.85 + 0.15) * (13 + hash(seed, i, 2) * 3) * (1 - t * 0.35);
    const jag = hash(seed, i, 4) * 3;
    c.fillStyle = '#07080d'; c.fillRect(Math.round(-wv - 1 - jag), -8 - i - 4, Math.round(wv * 2 + 2 + jag), 5);
    c.fillStyle = '#12211a'; c.fillRect(Math.round(-wv - jag), -8 - i - 4, Math.round(wv * 2 + jag), 4);
    c.fillStyle = '#1c3226'; c.fillRect(Math.round(-wv * 0.4), -8 - i - 4, Math.round(wv * 0.7), 3);
  }
  c.restore();
}

function angel(c, x, y) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  const u = 2;
  px(c, u, -9, 8, 18, 3, 'rgba(2,3,8,.45)');
  px(c, u, -7, 0, 14, 9, '#07080d'); px(c, u, -6, 1, 12, 7, '#4a5356'); px(c, u, -6, 1, 12, 1, '#5d6669');
  // alas
  px(c, u, -9, -22, 6, 16, '#07080d'); px(c, u, 3, -22, 6, 16, '#07080d');
  px(c, u, -8, -21, 4, 14, '#7c8388'); px(c, u, 4, -21, 4, 14, '#7c8388');
  px(c, u, -8, -21, 2, 10, '#9aa1a5'); px(c, u, 6, -21, 2, 10, '#9aa1a5');
  // figura
  px(c, u, -3, -24, 6, 25, '#07080d'); px(c, u, -2, -18, 4, 18, '#9aa1a5'); px(c, u, -2, -18, 1, 18, '#b6bcbf');
  px(c, u, -2, -23, 4, 5, '#9aa1a5'); px(c, u, -1, -22, 2, 2, '#b6bcbf');
  px(c, u, -1, -19, 2, 1, '#7c8388');
  px(c, u, -3, -16, 6, 2, '#7c8388');
  c.restore();
}

function niches(c, x, y, flames, lights, time, seed) {
  c.save(); c.translate(Math.round(x), Math.round(y));
  const u = 2;
  px(c, u, -33, 18, 66, 4, 'rgba(2,3,8,.5)');
  px(c, u, -32, -26, 64, 45, '#07080d');
  px(c, u, -31, -25, 62, 43, '#535b5d');
  px(c, u, -31, -25, 62, 3, '#6a7274');
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const nx = -29 + col * 12, ny = -21 + row * 13;
    px(c, u, nx, ny, 11, 11, '#07080d');
    px(c, u, nx + 1, ny + 1, 9, 9, row === 1 && col === 2 ? '#2a3134' : '#3e4648');
    px(c, u, nx + 2, ny + 3, 6, 1, '#2c3336');
    px(c, u, nx + 2, ny + 5, 5, 1, '#2c3336');
    const h = hash(seed + col, row, 77);
    if (h > 0.62) { c.fillStyle = h > 0.8 ? '#e8c25a' : '#ebe8dc'; c.fillRect(Math.round((nx + 7) * u), Math.round((ny + 7) * u), 4, 4); c.fillStyle = '#26402c'; c.fillRect(Math.round((nx + 7) * u), Math.round((ny + 9) * u), 4, 2); }
    if (h < 0.22) votive(c, x + (nx + 3) * u, y + (ny + 10) * u, flames, lights, time, seed + row * 7 + col);
  }
  c.restore();
}

/* ---------- el velatorio de Amparo, en el centro del mundo ---------- */

export function drawVelatorio(c, sx, sy, time, flames, lights) {
  const u = 2;
  c.save(); c.translate(Math.round(sx), Math.round(sy));
  // alfombra de luz sucia en el suelo
  c.fillStyle = 'rgba(70,52,30,.22)';
  c.beginPath(); c.ellipse(0, 6, 120, 58, 0, 0, TAU); c.fill();
  // sombra
  px(c, u, -22, 6, 44, 6, 'rgba(2,3,8,.5)');
  // caballetes
  px(c, u, -16, 4, 2, 8, '#07080d'); px(c, u, 14, 4, 2, 8, '#07080d');
  px(c, u, -15, 4, 1, 7, '#4e3420'); px(c, u, 15, 4, 1, 7, '#4e3420');
  // ataúd
  px(c, u, -21, -8, 42, 15, '#07080d');
  px(c, u, -20, -7, 40, 13, '#7a4a31');
  px(c, u, -20, -7, 40, 2, '#94603f');
  px(c, u, -19, -5, 38, 9, '#4f2e20');
  px(c, u, -18, -4, 36, 7, '#ece6e9');
  px(c, u, -18, 2, 36, 1, '#bcb2bb');
  // almohada y Amparo
  px(c, u, -17, -3, 5, 5, '#f7f3f0');
  px(c, u, -17, -2, 2, 3, '#e4e2da');
  px(c, u, -15, -2, 3, 3, '#d9c7b4');
  px(c, u, -13, -1, 1, 1, '#b88a6a');
  px(c, u, -12, -3, 22, 5, '#1d1d27');
  px(c, u, -12, -3, 22, 1, '#30313f');
  px(c, u, -6, -2, 3, 2, '#d9c7b4');
  px(c, u, -5, 0, 1, 1, '#f1e8d2'); px(c, u, -3, 0, 1, 1, '#f1e8d2'); px(c, u, -4, 1, 1, 1, '#c9a04c');
  px(c, u, 10, -2, 4, 3, '#1d1d27');
  // corona de crisantemos a los pies
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU;
    c.fillStyle = i % 3 ? '#ebe8dc' : '#e8c25a';
    c.fillRect(Math.round(52 + Math.cos(a) * 9) - 2, Math.round(-2 + Math.sin(a) * 6) - 2, 4, 4);
  }
  c.fillStyle = '#26402c'; c.fillRect(48, -4, 3, 3);
  // la silla de quien vela, vacía
  px(c, u, -30, 14, 10, 2, '#07080d'); px(c, u, -29, 8, 8, 7, '#07080d');
  px(c, u, -28, 9, 6, 5, '#7a5434'); px(c, u, -28, 9, 6, 1, '#94603f');
  px(c, u, -29, 2, 2, 7, '#07080d'); px(c, u, -22, 2, 2, 7, '#07080d');
  px(c, u, -29, 2, 9, 2, '#07080d'); px(c, u, -28, 2, 7, 1, '#7a5434');
  px(c, u, -28, 3, 1, 6, '#4e3420'); px(c, u, -22, 3, 1, 6, '#4e3420');
  // taburete con el termo de café y dos tazas
  px(c, u, 20, 13, 9, 2, '#07080d'); px(c, u, 21, 10, 7, 4, '#4e3420');
  px(c, u, 21, 4, 3, 7, '#07080d'); px(c, u, 21, 5, 2, 5, '#5b646c'); px(c, u, 21, 5, 1, 5, '#9aa6ae');
  px(c, u, 25, 8, 2, 2, '#f1e8d2'); px(c, u, 25, 8, 2, 1, '#07080d');
  c.restore();
  const corners = [[-50, -26], [50, -26], [-50, 34], [50, 34]];
  corners.forEach(([x, y], i) => cirioStand(c, sx + x, sy + y, flames, lights, time, i + 1));
  lights.push({x: sx, y: sy, r: 230, i: 0.55, c: 'warm', g: 0.6});
}

/* ---------- el suelo y lo que hay sobre él ---------- */

let ground;
function groundTile() {
  if (ground) return ground;
  ground = makeCanvas(256, 256);
  const c = ground.getContext('2d');
  c.fillStyle = '#121a1b'; c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const n = hash(x, y, 39);
    if (n < 0.13) c.fillStyle = '#152022';
    else if (n < 0.24) c.fillStyle = '#16231f';
    else if (n < 0.3) c.fillStyle = '#0d1314';
    else continue;
    c.fillRect(x * 2, y * 2, 2, 2);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(hash(i, 2) * 124) * 2, y = Math.floor(hash(i, 3) * 124) * 2;
    c.fillStyle = i % 3 ? '#1d2f28' : '#243a30';
    c.fillRect(x, y, 2, 4); c.fillRect(x - 2, y + 2, 2, 2); c.fillRect(x + 2, y - 2, 2, 4);
  }
  for (let i = 0; i < 14; i++) {
    const x = hash(i, 18) * 245 | 0, y = hash(i, 17) * 245 | 0;
    c.fillStyle = '#2b3236'; c.fillRect(x, y, 4, 2); c.fillRect(x + 1, y + 2, 3, 1);
    c.fillStyle = '#0b1012'; c.fillRect(x, y + 3, 4, 1);
  }
  // hojas secas de noviembre
  for (let i = 0; i < 18; i++) {
    const x = hash(i, 51) * 250 | 0, y = hash(i, 52) * 250 | 0;
    c.fillStyle = i % 2 ? '#3a2a1c' : '#4a3420'; c.fillRect(x, y, 3, 2); c.fillRect(x + 1, y + 2, 2, 1);
  }
  return ground;
}

const PATH = 640;

/*
 * Dibuja el mundo visible. Rellena flames (llamas para la capa que brilla) y lights (agujeros en la oscuridad).
 * Coordenadas de pantalla en píxeles CSS.
 */
export function drawWorld(c, camX, camY, w, h, time, flames, lights) {
  c.save();
  c.imageSmoothingEnabled = false;
  const tile = groundTile(), ts = 256;
  const sx0 = Math.floor(camX / ts), sy0 = Math.floor(camY / ts);
  for (let y = sy0; y <= (camY + h) / ts; y++) for (let x = sx0; x <= (camX + w) / ts; x++) c.drawImage(tile, Math.floor(x * ts - camX), Math.floor(y * ts - camY));
  // paseos de grava
  for (let i = Math.floor((camX - 40) / PATH); i <= (camX + w + 40) / PATH; i++) {
    const xx = Math.round(i * PATH - camX);
    c.fillStyle = 'rgba(122,112,92,.13)'; c.fillRect(xx - 26, 0, 52, h);
    for (let y = Math.floor(camY / 6) * 6; y < camY + h; y += 6) {
      const n = hash(i, y, 5);
      if (n > 0.55) { c.fillStyle = n > 0.85 ? 'rgba(170,160,140,.18)' : 'rgba(30,30,28,.3)'; c.fillRect(xx - 24 + Math.floor(hash(i, y, 6) * 48), Math.floor(y - camY), 2, 2); }
    }
  }
  for (let j = Math.floor((camY - 40) / PATH); j <= (camY + h + 40) / PATH; j++) {
    const yy = Math.round(j * PATH - camY);
    c.fillStyle = 'rgba(122,112,92,.13)'; c.fillRect(0, yy - 26, w, 52);
    for (let x = Math.floor(camX / 6) * 6; x < camX + w; x += 6) {
      const n = hash(x, j, 7);
      if (n > 0.55) { c.fillStyle = n > 0.85 ? 'rgba(170,160,140,.18)' : 'rgba(30,30,28,.3)'; c.fillRect(Math.floor(x - camX), yy - 24 + Math.floor(hash(x, j, 8) * 48), 2, 2); }
    }
  }
  // objetos en una rejilla con azar fijo: el camposanto es siempre el mismo
  const cell = 150, objects = [];
  for (let gy = Math.floor((camY - 150) / cell); gy <= (camY + h + 170) / cell; gy++) {
    for (let gx = Math.floor((camX - 120) / cell); gx <= (camX + w + 120) / cell; gx++) {
      const wx = gx * cell + hash(gx, gy, 25) * 80 + 35, wy = gy * cell + hash(gx, gy, 88) * 80 + 35;
      if (Math.hypot(wx, wy * 1.4) < 230) continue;
      // nada encima de los paseos
      const mx = ((wx % PATH) + PATH) % PATH, my = ((wy % PATH) + PATH) % PATH;
      if (mx < 46 || mx > PATH - 46 || my < 50 || my > PATH - 40) continue;
      objects.push({sx: Math.round(wx - camX), sy: Math.round(wy - camY), v: hash(gx, gy, 73), gx, gy});
    }
  }
  objects.sort((a, b) => a.sy - b.sy);
  for (const o of objects) {
    const seed = o.gx * 31 + o.gy * 17;
    if (o.gx % 7 === 3 && o.gy % 5 === 1) { niches(c, o.sx, o.sy, flames, lights, time, seed); continue; }
    if (o.v < 0.12) cypress(c, o.sx, o.sy, seed);
    else if (o.v < 0.44) tomb(c, o.sx, o.sy, hash(o.gx, o.gy, 11), flames, lights, time, seed);
    else if (o.v < 0.54) ironCross(c, o.sx, o.sy, seed);
    else if (o.v < 0.62) woodCross(c, o.sx, o.sy, seed);
    else if (o.v < 0.66) angel(c, o.sx, o.sy);
    else if (o.v < 0.74) flowers(c, o.sx, o.sy, seed);
    else if (o.v > 0.97) votive(c, o.sx, o.sy, flames, lights, time, seed);
  }
  if (Math.abs(camX + w / 2) < w + 200 && Math.abs(camY + h / 2) < h + 200) drawVelatorio(c, -camX, -camY, time, flames, lights);
  c.restore();
}

/* Llamas de vela, dibujadas después de la oscuridad para que brillen. */
export function drawFlames(c, flames, time) {
  c.save();
  for (const f of flames) {
    const x = Math.round(f.x), y = Math.round(f.y), tall = f.kind === 'cirio' ? 1 : 0;
    const lean = Math.round(Math.sin(time * 3 + x) * 0.6);
    c.fillStyle = f.kind === 'votive' ? 'rgba(255,107,58,.55)' : 'rgba(255,176,74,.6)';
    c.fillRect(x - 2, y - 1, 4, 5 + tall * 2);
    c.fillStyle = '#ffb04a';
    c.fillRect(x - 1 + lean, y - 2 - tall * 2, 2, 5 + tall * 2);
    c.fillStyle = '#fff1bd';
    c.fillRect(x - 1 + lean, y + (f.f > 0.95 ? -1 : 0) - tall, 2, 2 + tall);
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
