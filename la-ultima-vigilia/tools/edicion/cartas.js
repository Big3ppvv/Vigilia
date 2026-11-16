/*
 * Cartas ilustradas de la edición completa, pintadas en el navegador con el
 * mismo pixel art del juego: cielo de óleo hecho con ruido, horizonte de
 * camposanto, niebla, la figura ampliada píxel a píxel con su luz, motas de
 * cera, grano de papel, marco por rareza y la cartela con el nombre.
 *
 * Se carga como módulo desde el servidor de desarrollo; lo usa render-cartas.mjs.
 */
import { sprite, makeCanvas, hash } from '../../art.js';
import { cypress, headstone, ironCross, woodCross, pine, chapel, coffin, cirioSprite, lampPost, angel } from '../../props.js';
import { WEAPONS } from '../../arsenal.js';
import { ITEMS } from '../../items.js';
import { CHARACTERS, CREATURES, ELITES, SHOPKEEPER } from '../../story.js';
import { ELITE } from '../../balance.js';

const W = 900, H = 1200;
const TIER = [
  {metal: ['#8d8473', '#d8cdb4'], glow: '255,214,150', label: 'I'},
  {metal: ['#4f79b8', '#bcd6ff'], glow: '130,180,255', label: 'II'},
  {metal: ['#7a4fb0', '#e2c6ff'], glow: '196,140,255', label: 'III'},
  {metal: ['#a8322a', '#ffd38a'], glow: '255,110,80', label: 'IV'}
];
const MOODS = {
  weapon: {sky: [[34, 22, 30], [122, 64, 34], [26, 18, 16]], light: '255,176,92', ground: ['rgba(20,12,10,.97)', 'rgba(6,4,4,1)']},
  item: {sky: [[24, 26, 44], [104, 74, 58], [18, 16, 22]], light: '255,206,140', ground: ['rgba(14,12,16,.97)', 'rgba(5,5,7,1)']},
  creature: {sky: [[12, 22, 46], [44, 84, 118], [10, 14, 24]], light: '150,200,255', ground: ['rgba(6,10,16,.97)', 'rgba(3,4,7,1)']},
  elite: {sky: [[34, 10, 18], [128, 40, 36], [16, 6, 8]], light: '255,110,90', ground: ['rgba(16,5,6,.97)', 'rgba(5,2,2,1)']},
  character: {sky: [[30, 22, 40], [130, 82, 46], [18, 12, 12]], light: '255,186,110', ground: ['rgba(16,10,8,.97)', 'rgba(5,4,3,1)']},
  keeper: {sky: [[14, 30, 22], [70, 104, 58], [10, 16, 12]], light: '200,240,160', ground: ['rgba(8,14,9,.97)', 'rgba(3,5,3,1)']}
};

/* Ruido de valor suave, para pintar cielos y niebla sin texturas externas. */
function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
}
const fbm = (x, y, seed, oct = 5) => { let v = 0, amp = 0.5, f = 1; for (let i = 0; i < oct; i++) { v += vnoise(x * f, y * f, seed + i * 17) * amp; f *= 2.03; amp *= 0.5; } return v; };
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* El cielo: pinceladas de ruido a baja resolución, ampliadas con suavizado como un óleo. */
function paintSky(ctx, w, h, mood, seed) {
  const lw = Math.ceil(w / 6), lh = Math.ceil(h / 6), low = canvas(lw, lh), g = low.getContext('2d');
  const img = g.createImageData(lw, lh), d = img.data;
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const n = fbm(x / 22, y / 18, seed), m = fbm(x / 9 + 40, y / 7, seed + 9, 3);
    const t = Math.min(1, Math.max(0, y / lh * 0.9 + (n - 0.5) * 0.7));
    let c = t < 0.55 ? mix(mood.sky[0], mood.sky[1], t / 0.55) : mix(mood.sky[1], mood.sky[2], (t - 0.55) / 0.45);
    c = c.map(v => v * (0.8 + m * 0.45));
    const i = (y * lw + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(low, 0, 0, w, h);
  ctx.restore();
}

function glow(ctx, x, y, r, rgb, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(0.35, `rgba(${rgb},${a * 0.45})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/* Bandas de niebla que se deshacen hacia los lados. */
function fog(ctx, w, h, y0, seed, alpha) {
  const band = canvas(Math.ceil(w / 4), 60), g = band.getContext('2d'), img = g.createImageData(band.width, 60);
  for (let y = 0; y < 60; y++) for (let x = 0; x < band.width; x++) {
    const n = fbm(x / 30, y / 9, seed, 4), edge = Math.sin(y / 60 * Math.PI);
    const i = (y * band.width + x) * 4;
    img.data[i] = 200; img.data[i + 1] = 210; img.data[i + 2] = 220; img.data[i + 3] = Math.max(0, (n - 0.35) * 2) * edge * 255;
  }
  g.putImageData(img, 0, 0);
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(band, 0, y0, w, h * 0.12);
  ctx.restore();
}

/* Un trozo de camposanto a contraluz en el horizonte: se pinta aparte y se tiñe solo él. */
function horizon(ctx, w, h, y, seed, tint) {
  const pieces = [cypress(seed % 5 + 1), cypress(seed % 7 + 3, -1), headstone(seed % 6), ironCross(), woodCross(), headstone((seed + 2) % 6), pine(seed % 3 + 1), angel(), lampPost()];
  const layer = canvas(w, h), g = layer.getContext('2d');
  g.imageSmoothingEnabled = false;
  const scale = 5;
  let x = -40 - hash(seed, 1, 2) * 60, i = 0;
  while (x < w + 40) {
    const p = pieces[(seed + i * 3) % pieces.length];
    const sc = scale * (0.75 + hash(seed, i, 7) * 0.5);
    g.drawImage(p.c, x, y - p.oy * sc + hash(seed, i, 8) * 16, p.w * sc, p.h * sc);
    x += p.w * sc * (0.7 + hash(seed, i, 9) * 0.9);
    i++;
  }
  g.fillStyle = '#000'; g.fillRect(0, y + 20, w, h - y);
  g.globalCompositeOperation = 'source-in';
  const grad = g.createLinearGradient(0, y - 200, 0, h);
  grad.addColorStop(0, tint[0]); grad.addColorStop(1, tint[1]);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  ctx.drawImage(layer, 0, 0);
}

/* La figura: el sprite del juego ampliado sin suavizar, con su sombra, su luz y lo que brilla. */
function figure(ctx, key, cx, cy, maxW, maxH, opts = {}) {
  const s = sprite(key, opts.frame);
  const rot = opts.rot || 0;
  const bw = rot ? (s.w + s.h) * 0.72 : s.w, bh = rot ? (s.w + s.h) * 0.72 : s.h;
  const scale = Math.max(2, Math.floor(Math.min(maxW / bw, maxH / bh)));
  const w = s.w * scale, h = s.h * scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.imageSmoothingEnabled = false;
  // Sombra suave en el suelo y contorno de luz.
  ctx.save(); ctx.filter = 'blur(18px)'; ctx.globalAlpha = 0.55; ctx.drawImage(s.base, -w / 2 + 14, -h / 2 + 22, w, h); ctx.restore();
  ctx.save(); ctx.filter = `blur(6px) brightness(3)`; ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(s.base, -w / 2, -h / 2, w, h); ctx.restore();
  ctx.drawImage(s.base, -w / 2, -h / 2, w, h);
  if (s.glow) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(22px)'; ctx.globalAlpha = 0.9; ctx.drawImage(s.glow, -w / 2, -h / 2, w, h);
    ctx.filter = 'blur(6px)'; ctx.drawImage(s.glow, -w / 2, -h / 2, w, h);
    ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.drawImage(s.glow, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  ctx.restore();
  return {w, h, scale};
}

/* Motas de cera y chispas flotando en la luz. */
function motes(ctx, w, h, seed, rgb, n = 70) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = hash(seed, i, 31) * w, y = h * 0.15 + hash(seed, i, 32) * h * 0.6, s = 2 + Math.floor(hash(seed, i, 33) * 4) * 2;
    const a = 0.25 + hash(seed, i, 34) * 0.6;
    glow(ctx, x, y, s * 4, rgb, a * 0.35);
    ctx.fillStyle = `rgba(${rgb},${a})`; ctx.fillRect(Math.round(x), Math.round(y), s, s);
  }
  ctx.restore();
}

/* Grano de papel y viñeta: lo último antes del marco. */
function grain(ctx, w, h, seed, amount = 14) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  let s = seed * 9301 + 49297;
  for (let i = 0; i < d.length; i += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const n = ((s >> 8) & 255) / 255 - 0.5;
    const k = n * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + k)); d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + k * 0.95)); d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + k * 0.85));
  }
  ctx.putImageData(img, 0, 0);
  const v = ctx.createRadialGradient(w / 2, h * 0.46, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
}

/* El marco: metal según la rareza, filetes, esquinas y la cartela con el nombre. */
function frame(ctx, w, h, tier, title, subtitle) {
  const T = TIER[tier];
  const metal = ctx.createLinearGradient(0, 0, w, h);
  metal.addColorStop(0, T.metal[1]); metal.addColorStop(0.5, T.metal[0]); metal.addColorStop(1, T.metal[1]);
  ctx.save();
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = '#07080c'; ctx.lineWidth = 34; ctx.strokeRect(17, 17, w - 34, h - 34);
  ctx.strokeStyle = metal; ctx.lineWidth = 7; ctx.strokeRect(30, 30, w - 60, h - 60);
  ctx.strokeStyle = 'rgba(7,8,12,.85)'; ctx.lineWidth = 3; ctx.strokeRect(40, 40, w - 80, h - 80);
  ctx.strokeStyle = metal; ctx.lineWidth = 1.5; ctx.strokeRect(46, 46, w - 92, h - 92);
  // Esquinas: una cruz pequeña de metal en cada una.
  for (const [x, y] of [[30, 30], [w - 30, 30], [30, h - 30], [w - 30, h - 30]]) {
    ctx.fillStyle = '#07080c'; ctx.fillRect(x - 16, y - 16, 32, 32);
    ctx.fillStyle = metal; ctx.fillRect(x - 3, y - 13, 6, 26); ctx.fillRect(x - 13, y - 3, 26, 6);
    ctx.fillStyle = T.metal[1]; ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  // El número de la rareza arriba, en su medallón.
  ctx.fillStyle = '#07080c'; ctx.beginPath(); ctx.arc(w / 2, 30, 30, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = metal; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(w / 2, 30, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = T.metal[1]; ctx.font = '700 26px "DejaVu Serif", "Liberation Serif", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(T.label, w / 2, 31);
  // La cartela.
  const ph = subtitle ? 150 : 118, py = h - ph - 70;
  ctx.fillStyle = 'rgba(7,8,12,.86)'; ctx.fillRect(80, py, w - 160, ph);
  ctx.strokeStyle = metal; ctx.lineWidth = 3; ctx.strokeRect(80, py, w - 160, ph);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; ctx.strokeRect(88, py + 8, w - 176, ph - 16);
  ctx.fillStyle = '#f3e9d4';
  let size = 58;
  ctx.font = `500 ${size}px "DejaVu Serif", "Liberation Serif", serif`;
  while (ctx.measureText(title).width > w - 220 && size > 30) { size -= 2; ctx.font = `500 ${size}px "DejaVu Serif", "Liberation Serif", serif`; }
  ctx.fillText(title, w / 2, py + (subtitle ? 58 : ph / 2 + 2));
  if (subtitle) {
    ctx.fillStyle = T.metal[1]; ctx.font = 'italic 30px "Liberation Serif", "DejaVu Serif", serif';
    let s2 = 30;
    while (ctx.measureText(subtitle).width > w - 220 && s2 > 18) { s2 -= 1; ctx.font = `italic ${s2}px "Liberation Serif", "DejaVu Serif", serif`; }
    ctx.fillText(subtitle, w / 2, py + 112);
  }
  ctx.restore();
}

/* Una carta completa. */
function card(spec) {
  const c = canvas(W, H), ctx = c.getContext('2d');
  const mood = MOODS[spec.kind], seed = spec.seed;
  paintSky(ctx, W, H, mood, seed);
  // La luna o el resplandor detrás de la figura.
  glow(ctx, W / 2, H * 0.4, 520, TIER[spec.tier].glow, 0.38);
  glow(ctx, W / 2, H * 0.4, 260, mood.light, 0.42);
  if (spec.kind === 'creature' || spec.kind === 'elite') {
    ctx.fillStyle = 'rgba(235,240,250,.85)'; ctx.beginPath(); ctx.arc(W * 0.72, H * 0.18, 54, 0, Math.PI * 2); ctx.fill();
    glow(ctx, W * 0.72, H * 0.18, 220, '220,230,255', 0.35);
  }
  fog(ctx, W, H, H * 0.5, seed + 3, 0.5);
  horizon(ctx, W, H, H * 0.74, seed, mood.ground);
  fog(ctx, W, H, H * 0.66, seed + 5, 0.35);
  motes(ctx, W, H, seed, mood.light, spec.kind === 'item' ? 50 : 80);
  const fig = figure(ctx, spec.sprite, W / 2, H * 0.43, W * 0.66, H * 0.48, {rot: spec.rot, frame: spec.frame});
  // Suelo bajo la figura: un charco de luz.
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.scale(1, 0.25); glow(ctx, W / 2, (H * 0.43 + fig.h / 2) * 4, 260, mood.light, 0.3);
  ctx.restore();
  fog(ctx, W, H, H * 0.78, seed + 7, 0.4);
  grain(ctx, W, H, seed);
  frame(ctx, W, H, spec.tier, spec.title, spec.subtitle);
  return c;
}

/* Escenas grandes para el título, el alba y el apagón. */
function scene(kind) {
  const w = 1600, h = 900, c = canvas(w, h), ctx = c.getContext('2d');
  const dawn = kind === 'alba', out = kind === 'apagon';
  const mood = dawn ? {sky: [[84, 76, 124], [236, 164, 118], [52, 38, 56]], light: '255,214,160'} : out ? {sky: [[8, 10, 16], [30, 34, 48], [5, 5, 8]], light: '120,150,200'} : {sky: [[12, 18, 40], [52, 66, 108], [8, 10, 18]], light: '255,186,110'};
  paintSky(ctx, w, h, mood, kind.length * 7);
  if (dawn) { glow(ctx, w * 0.5, h * 0.62, 700, '255,200,140', 0.55); glow(ctx, w * 0.5, h * 0.62, 240, '255,240,200', 0.7); }
  else { ctx.fillStyle = 'rgba(235,240,250,.9)'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.16, 46, 0, Math.PI * 2); ctx.fill(); glow(ctx, w * 0.8, h * 0.16, 260, '220,230,255', 0.3); }
  fog(ctx, w, h, h * 0.45, 11, 0.45);
  horizon(ctx, w, h, h * 0.66, 19, dawn ? ['rgba(48,30,40,.95)', 'rgba(16,10,14,1)'] : ['rgba(8,10,16,.96)', 'rgba(3,4,6,1)']);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  const ch = chapel(), cof = coffin(), cir = cirioSprite(), S = 3;
  ctx.drawImage(ch.c, w / 2 - ch.ox * S, h * 0.72 - ch.oy * S, ch.w * S, ch.h * S);
  ctx.drawImage(cof.c, w / 2 - cof.ox * S, h * 0.85 - cof.oy * S, cof.w * S, cof.h * S);
  for (const dx of [-130, 130]) for (const dy of [-16, 26]) {
    ctx.drawImage(cir.c, w / 2 + dx - cir.ox * S, h * 0.85 + dy - cir.oy * S, cir.w * S, cir.h * S);
    if (!out) { glow(ctx, w / 2 + dx, h * 0.85 + dy - 90, 90, '255,190,110', 0.8); ctx.fillStyle = '#ffe9a8'; ctx.fillRect(w / 2 + dx - 4, h * 0.85 + dy - 96, 8, 14); }
    else { ctx.fillStyle = 'rgba(180,190,200,.25)'; for (let k = 0; k < 6; k++) ctx.fillRect(w / 2 + dx - 2 + Math.sin(k) * 4, h * 0.85 + dy - 96 - k * 14, 4, 10); }
  }
  ctx.restore();
  if (!dawn) {
    // La Compaña pasa por detrás, en fila, cada uno con su vela.
    for (let i = 0; i < 11; i++) {
      const x = w * 0.12 + i * 46, y = h * 0.64 + Math.sin(i * 0.6) * 6;
      const s = sprite('hermano'), sc = 3;
      ctx.save(); ctx.globalAlpha = out ? 0.55 : 0.9; ctx.imageSmoothingEnabled = false;
      ctx.drawImage(s.base, x - s.w * sc / 2, y - s.h * sc, s.w * sc, s.h * sc);
      ctx.restore();
      glow(ctx, x + 10, y - 40, 40, '255,180,100', out ? 0.25 : 0.6);
    }
  }
  if (dawn) motes(ctx, w, h, 5, '255,230,180', 60);
  else motes(ctx, w, h, 9, out ? '150,190,255' : '255,186,110', 90);
  fog(ctx, w, h, h * 0.8, 29, 0.5);
  grain(ctx, w, h, 77, 12);
  return c;
}

/* Lo que se pinta: id de recurso → cómo. */
export function catalog() {
  const list = [];
  for (const w of WEAPONS) list.push({key: 'carta:w:' + w.id, kind: 'weapon', sprite: 'w:' + w.id, title: w.name, subtitle: 'Arma', tier: 0, rot: sprite('w:' + w.id).w > sprite('w:' + w.id).h * 1.6 ? -Math.PI / 4 : 0});
  for (const it of ITEMS) list.push({key: 'carta:i:' + it.id, kind: 'item', sprite: it.icon, title: it.name, subtitle: ['Común', 'Poco común', 'Rara', 'Legendaria'][it.rarity], tier: it.rarity});
  for (const [id, c] of Object.entries(CREATURES)) list.push({key: 'carta:c:' + id, kind: id === 'guia' ? 'elite' : 'creature', sprite: id, title: c.name, subtitle: c.tag, tier: id === 'guia' ? 3 : 1});
  for (const [id, e] of Object.entries(ELITES)) list.push({key: 'carta:e:' + id, kind: 'elite', sprite: ELITE[id].type, title: e.name, subtitle: 'Difunto con nombre', tier: 2});
  for (const [id, ch] of Object.entries(CHARACTERS)) list.push({key: 'carta:p:' + id, kind: 'character', sprite: id, title: ch.name, subtitle: ch.role, tier: 0});
  list.push({key: 'carta:p:remedios', kind: 'keeper', sprite: 'remedios', title: SHOPKEEPER.name, subtitle: SHOPKEEPER.role, tier: 0});
  list.forEach((s, i) => { s.seed = 1000 + i * 37; });
  for (const k of ['titulo', 'alba', 'apagon']) list.push({key: 'escena:' + k, scene: k});
  // Las armas cambian de nivel en la tienda: su carta lleva el marco de bronce, el nivel lo pone el juego.
  return list;
}

/* Pinta una y la devuelve como PNG en base64 (sin la cabecera data:). */
export async function render(key) {
  const spec = catalog().find(s => s.key === key);
  if (!spec) throw new Error('No existe ' + key);
  const c = spec.scene ? scene(spec.scene) : card(spec);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 32768) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
  return {b64: btoa(bin), bytes: buf.length, w: c.width, h: c.height};
}

export { makeCanvas };
