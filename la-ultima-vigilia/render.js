/*
 * El dibujo de cada fotograma: el atrio, lo que pisa el suelo, las criaturas,
 * quien vela con sus armas alrededor, los proyectiles, la oscuridad con sus
 * luces y, encima, lo que brilla: llamas, núcleos de los golpes y números.
 */
import { TAU, clamp, rand, lerp } from './util.js';
import { ENEMIES, ARENA, clockAt } from './balance.js';
import { drawSprite, drawShadow, sprite, makeCanvas } from './art.js';
import { drawFlames, drawFog } from './props.js';
import { CAMERA_BOUNDS } from './arena.js';
import { WEAPON } from './arsenal.js';
import { UPRIGHT } from './sprites-extra.js';
import { CHARACTERS } from './story.js';

const STEPS = [undefined, 'step1', undefined, 'step2'];
const RUN = ['run1', undefined, 'run2', undefined];
const FLYING = new Set(['anima', 'curuxa', 'lavandeira', 'nubeiro']);
const TONE_RGB = {ember: '255,116,46', salt: '190,224,242', sacred: '238,205,129', sea: '120,176,255', music: '159,224,198', iron: '230,230,236'};

let vignette = null;
function vignetteSprite() {
  if (vignette) return vignette;
  vignette = makeCanvas(256, 256);
  const g = vignette.getContext('2d'), r = g.createRadialGradient(128, 128, 60, 128, 128, 182);
  r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(0.7, 'rgba(0,0,0,.18)'); r.addColorStop(1, 'rgba(0,0,0,.62)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return vignette;
}

export const renderMethods = {
  /* Cuánta noche hay: más oscura a las cuatro, clareando al alba. */
  nightLook() {
    let h = clockAt(this.run.round, 1 - this.timeLeft / Math.max(1, this.roundLength)) / 60;
    if (this.state === 'ready') h = 0.5;
    let dark = h < 3 ? 0.42 + h * 0.035 : h < 4.6 ? 0.525 : 0.525 - (h - 4.6) * 0.06;
    let tint = [5, 8, 20], warm = 0;
    if (this.state === 'ready') dark = 0.6;
    if (this.state === 'dying') dark = lerp(dark, 0.9, clamp(this.dyingT / 1.6, 0, 1));
    if (this.state === 'ended' && !this.lastVictory) dark = 0.88;
    if (this.state === 'dawn' || (this.state === 'ended' && this.lastVictory)) {
      const k = this.state === 'dawn' ? clamp(this.dawnT / 6, 0, 1) : 1;
      dark = lerp(dark, 0.18, k);
      tint = [lerp(5, 34, k), lerp(8, 26, k), lerp(20, 58, k)];
      warm = k;
    }
    if (this.options.softDark) dark *= 0.7;
    const fog = this.state === 'ready' ? 0.6 : h < 3 ? 0.4 + h * 0.15 : h < 4.6 ? 0.85 : 0.85 - (h - 4.6) * 0.4;
    return {dark, tint: tint.map(v => Math.round(v)).join(','), warm, fog: Math.max(0.15, fog)};
  },

  updateCamera(dt) {
    const p = this.player, w = this.width, h = this.height;
    const title = this.state === 'ready';
    const target = title ? this.titleFocus : {x: p.x + p.vx * 0.14, y: p.y - 10 + p.vy * 0.14};
    if (title) { this.cam.x = target.x; this.cam.y = target.y; }
    else { const k = 1 - Math.exp(-clamp(dt, 0, 0.05) * 9); this.cam.x = lerp(this.cam.x, target.x, k); this.cam.y = lerp(this.cam.y, target.y, k); }
    const B = CAMERA_BOUNDS;
    const x0 = B.left + w / 2, x1 = B.right - w / 2, y0 = B.top + h / 2, y1 = B.bottom - h / 2;
    this.cam.x = x0 > x1 ? (x0 + x1) / 2 : clamp(this.cam.x, x0, x1);
    this.cam.y = y0 > y1 ? (y0 + y1) / 2 : clamp(this.cam.y, y0, y1);
  },

  render(dt = 1 / 60) {
    const ctx = this.ctx, w = this.width, h = this.height, p = this.player;
    const title = this.state === 'ready';
    const playing = !title && !(this.state === 'ended' && !this.lastVictory);
    this.updateCamera(dt);
    let camX = Math.round(this.cam.x - w / 2), camY = Math.round(this.cam.y - h / 2);
    if (this.shake > 0.2 && this.options.shake) { camX += Math.round(rand(-1, 1) * this.shake); camY += Math.round(rand(-1, 1) * this.shake); }
    const look = this.nightLook();
    const flames = [], lights = [], items = [];
    ctx.save();
    if (this.zoomPunch > 0.001) {
      const z = 1 + this.zoomPunch;
      ctx.translate(w / 2, h / 2); ctx.scale(z, z); ctx.translate(-w / 2, -h / 2);
    }
    this.arena.ground(ctx, camX, camY, w, h);
    this.drawAreas(ctx, camX, camY);
    this.ambient.drawDecals(ctx, camX, camY, w, h);
    this.drawMarks(ctx, camX, camY, lights);
    this.drawHazards(ctx, camX, camY, lights);
    this.arena.collect(ctx, camX, camY, w, h, this.clock, {flare: 0}, items, flames, lights);
    this.drawDrops(ctx, camX, camY, lights);

    if (title) this.titleCast(items, camX, camY, lights);
    for (const e of this.enemies) {
      const x = e.x - camX, y = e.y - camY;
      if (x < -120 || x > w + 120 || y < -140 || y > h + 120) continue;
      items.push({kind: 'enemy', e, x, y, sortY: y + (FLYING.has(e.type) ? 18 : e.r * 0.6)});
    }
    for (const s of this.structures) items.push({kind: 'structure', s, x: s.x - camX, y: s.y - camY, sortY: s.y - camY});
    for (const c of this.corpses) items.push({kind: 'corpse', c, x: c.x - camX, y: c.y - camY, sortY: c.y - camY + 8});
    if (playing) {
      items.push({kind: 'player', x: p.x - camX, y: p.y - camY, sortY: p.y - camY + 10});
      const n = this.run.weapons.length;
      this.run.weapons.forEach((wpn, i) => items.push({kind: 'weapon', wpn, i, n, x: wpn.x - camX, y: wpn.y - camY, sortY: wpn.y - camY + (wpn.y < p.y - 14 ? 0 : 24)}));
    }
    items.sort((a, b) => a.sortY - b.sortY);

    // Estela de la esquiva.
    for (const g of this.ghosts) {
      ctx.globalAlpha = g.life / g.total * 0.4;
      drawSprite(ctx, this.run.character, g.x - camX, g.y - camY - 12, {scale: 2, flip: g.face < 0, layer: 'white'});
    }
    ctx.globalAlpha = 1;
    const entityLights = [];
    for (const it of items) this.drawItem(ctx, it, entityLights, 'base');
    if (entityLights.length > 70) {
      const cx = w / 2, cy = h / 2;
      entityLights.sort((a, b) => ((a.x - cx) ** 2 + (a.y - cy) ** 2) - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
      entityLights.length = 70;
    }
    for (const L of entityLights) lights.push(L);

    const sky = this.weatherLook();
    if (this.options.weather) this.ambient.drawWeather(ctx, camX, camY, w, h, this.clock, sky.rain, sky.wind, sky.a);
    drawFog(ctx, camX, camY, w, h, this.clock, look.fog * 0.75);

    // Partículas sin luz propia.
    for (const q of this.particles) {
      if (q.glow) continue;
      ctx.globalAlpha = clamp(q.life / q.total, 0, 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - camX - q.size / 2), Math.round(q.y - camY - q.size / 2), q.size, q.size);
    }
    ctx.globalAlpha = 1;

    // Las luces de lo que se mueve.
    if (playing) lights.push({x: p.x - camX, y: p.y - camY - 14, r: 300 + (this.ceraFlash || 0) * 24, i: 1, c: 'warm', g: 0.32});
    let budget = 56;
    for (const s of this.shots) {
      const x = s.x - camX, y = s.y - camY;
      if (x < -80 || x > w + 80 || y < -80 || y > h + 80 || budget-- <= 0) continue;
      lights.push({x, y, r: s.kind === 'foguete' ? 90 : s.kind === 'onda' ? 70 : 52, a: s.a, stretch: 1.4, i: this.options.flashes ? 0.85 : 0.45, c: lightTone(s.tone), g: this.options.flashes ? 0.7 : 0.25});
    }
    for (const s of this.enemyShots) lights.push({x: s.x - camX, y: s.y - camY, r: 38, i: 0.8, c: s.kind === 'vela' ? 'warm' : 'blue', g: 0.7});
    for (const f of this.flashes) {
      if (!this.options.flashes && f.r > 120) continue;
      const k = f.life / f.total;
      lights.push({x: f.x - camX, y: f.y - camY, r: f.r * (0.6 + 0.4 * k), i: k * (this.options.flashes ? 1 : 0.5), c: f.c, g: this.options.flashes ? 0.85 : 0.3});
    }
    for (const r of this.rings) if (r.light) lights.push({x: r.x - camX, y: r.y - camY, r: r.light * (0.6 + 0.4 * r.r / r.max), i: 0.8 * r.life / r.total, c: 'warm', g: 0.5});
    for (const wpn of this.run.weapons) {
      const def = WEAPON[wpn.id];
      if (def.act === 'flame' && wpn.burning > 0) lights.push({x: wpn.x - camX + Math.cos(wpn.aim) * 50, y: wpn.y - camY + Math.sin(wpn.aim) * 50, r: 120, i: 0.9, c: 'ember', g: 0.8});
      else if (def.id === 'botafumeiro' || def.id === 'cirio' || def.id === 'tea') lights.push({x: wpn.x - camX, y: wpn.y - camY, r: 60, i: 0.7, c: 'warm', g: 0.5});
    }
    if (this.sp?.beam > 0 && playing) this.beamLight(lights, camX, camY);
    this.combatFx.addLights(lights, camX, camY, this.options.flashes);

    this.lighting.render(ctx, lights, look.dark, look.tint, this.sp?.beam > 0 && playing ? [this.beamShape(camX, camY)] : []);
    this.lighting.glow(ctx, lights, (this.options.flashes ? 0.62 : 0.4) * (1 - look.warm * 0.6));
    drawFlames(ctx, flames, this.clock, 0);
    for (const it of items) this.drawItem(ctx, it, null, 'glow');

    this.drawDropsGlow(ctx, camX, camY);
    this.drawShots(ctx, camX, camY);
    this.combatFx.render(ctx, camX, camY, this.options.flashes);
    for (const q of this.particles) {
      if (!q.glow) continue;
      ctx.globalAlpha = clamp(q.life / q.total, 0, 1);
      ctx.fillStyle = q.color;
      if (q.note) { ctx.fillRect(Math.round(q.x - camX), Math.round(q.y - camY) - 4, 1, 5); ctx.fillRect(Math.round(q.x - camX) - 2, Math.round(q.y - camY), 3, 2); continue; }
      ctx.fillRect(Math.round(q.x - camX - q.size / 2), Math.round(q.y - camY - q.size / 2), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    this.drawTelegraphs(ctx, camX, camY);
    this.drawEnemyShots(ctx, camX, camY);
    for (const r of this.rings) {
      ctx.globalAlpha = clamp(r.life / r.total, 0, 1);
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width || 2;
      ctx.beginPath(); ctx.ellipse(r.x - camX, r.y - camY, r.r, r.r * 0.8, 0, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.drawNumbers(ctx, camX, camY);
    ctx.restore();
    this.drawOverlays(ctx);
    if (this.pointer) {
      ctx.strokeStyle = 'rgba(241,232,210,.25)'; ctx.fillStyle = 'rgba(241,232,210,.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.pointer.start.x, this.pointer.start.y, 40, 0, TAU); ctx.fill(); ctx.stroke();
      const mv = this.movement();
      ctx.fillStyle = 'rgba(255,213,154,.4)';
      ctx.beginPath(); ctx.arc(this.pointer.start.x + mv.x * 30, this.pointer.start.y + mv.y * 30, 13, 0, TAU); ctx.fill();
    }
  },

  /* ---------- en el suelo ---------- */

  drawAreas(ctx, camX, camY) {
    for (const z of this.areas) {
      const x = z.x - camX, y = z.y - camY, k = clamp(z.life / Math.min(0.6, z.total), 0, 1);
      ctx.save();
      ctx.globalAlpha = k;
      if (z.kind === 'wet') {
        ctx.fillStyle = 'rgba(14,30,44,.75)';
        ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.7, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(127,179,196,.55)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, z.r - 2 + Math.sin(this.clock * 3) * 2, z.r * 0.7 - 2, 0, 0, TAU); ctx.stroke();
      } else if (z.kind === 'agua') {
        ctx.fillStyle = 'rgba(150,200,230,.18)';
        ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.75, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#bee0f2'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]); ctx.lineDashOffset = -this.clock * 20;
        ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.75, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 5; i++) { const a = this.clock * 1.5 + i * 1.3; ctx.fillStyle = '#f4fbff'; ctx.fillRect(Math.round(x + Math.cos(a) * z.r * 0.6), Math.round(y + Math.sin(a * 1.3) * z.r * 0.4), 2, 2); }
      } else if (z.kind === 'sal') {
        ctx.strokeStyle = '#f4fbff'; ctx.lineWidth = 3; ctx.globalAlpha = k * 0.85;
        ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.75, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = 'rgba(190,224,242,.1)'; ctx.fill();
        for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; ctx.fillStyle = i % 2 ? '#c9d6dc' : '#f4fbff'; ctx.fillRect(Math.round(x + Math.cos(a) * z.r), Math.round(y + Math.sin(a) * z.r * 0.75), 2, 2); }
      } else if (z.kind === 'rede') {
        ctx.strokeStyle = 'rgba(217,201,160,.85)'; ctx.lineWidth = 1;
        for (let i = -4; i <= 4; i++) {
          ctx.beginPath(); ctx.moveTo(x + i * z.r / 4 - z.r * 0.3, y - z.r * 0.6); ctx.lineTo(x + i * z.r / 4 + z.r * 0.3, y + z.r * 0.6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + i * z.r / 4 + z.r * 0.3, y - z.r * 0.6); ctx.lineTo(x + i * z.r / 4 - z.r * 0.3, y + z.r * 0.6); ctx.stroke();
        }
        ctx.beginPath(); ctx.ellipse(x, y, z.r, z.r * 0.7, 0, 0, TAU); ctx.stroke();
      }
      ctx.restore();
    }
  },

  /* Las marcas de aparición: una cruz que late y un aro que se cierra. */
  drawMarks(ctx, camX, camY, lights) {
    for (const m of this.marks) {
      const x = Math.round(m.x - camX), y = Math.round(m.y - camY), k = 1 - clamp(m.t / m.total, 0, 1);
      if (x < -60 || x > this.width + 60 || y < -60 || y > this.height + 60) continue;
      ctx.save();
      if (m.type === 'arrow') {
        ctx.translate(x, y); ctx.rotate(m.a);
        ctx.fillStyle = `rgba(255,176,74,${0.4 + 0.5 * Math.abs(Math.sin(this.clock * 10))})`;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 14, -9); ctx.lineTo(i * 14 + 10, 0); ctx.lineTo(i * 14, 9); ctx.lineTo(i * 14 + 4, 0); ctx.fill(); }
        ctx.restore();
        lights.push({x, y, r: 60, i: 0.7, c: 'warm', g: 0.6});
        continue;
      }
      const big = m.type === 'guia' ? 3 : m.type === 'elite' ? 2 : 1;
      const color = big > 1 ? '255,128,96' : '255,82,70';
      const pulse = 0.55 + 0.45 * Math.sin(this.clock * 14 + m.seed);
      const R = (14 + (1 - k) * 18) * big;
      ctx.strokeStyle = `rgba(${color},${0.35 + 0.4 * k})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.7, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(${color},${0.5 + 0.5 * pulse})`; ctx.lineWidth = 2 + big;
      const s = 6 * big;
      ctx.beginPath(); ctx.moveTo(x - s, y - s * 0.7); ctx.lineTo(x + s, y + s * 0.7); ctx.moveTo(x + s, y - s * 0.7); ctx.lineTo(x - s, y + s * 0.7); ctx.stroke();
      ctx.restore();
      lights.push({x, y, r: 34 * big + k * 20, i: 0.4 + 0.4 * k, c: 'red', g: 0.7});
    }
  },

  drawHazards(ctx, camX, camY, lights) {
    for (const hz of this.hazards) {
      if (hz.done) continue;
      const x = hz.x - camX, y = hz.y - camY, k = 1 - clamp(hz.t / hz.total, 0, 1);
      const rgb = hz.kind === 'rayo' ? '190,214,255' : hz.kind === 'cruz' ? '255,226,150' : '214,180,102';
      ctx.save();
      ctx.fillStyle = `rgba(${rgb},${0.08 + k * 0.18})`;
      ctx.beginPath(); ctx.ellipse(x, y, hz.r, hz.r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${rgb},${0.18 + k * 0.25})`;
      ctx.beginPath(); ctx.ellipse(x, y, hz.r * k, hz.r * 0.75 * k, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(${rgb},${0.6 + 0.4 * Math.abs(Math.sin(this.clock * 12))})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, hz.r, hz.r * 0.75, 0, 0, TAU); ctx.stroke();
      if (hz.kind === 'cruz') { ctx.fillStyle = `rgba(${rgb},.6)`; ctx.fillRect(x - 2, y - 18, 4, 30); ctx.fillRect(x - 10, y - 10, 20, 4); }
      ctx.restore();
      lights.push({x, y, r: hz.r * 1.3, i: 0.3 + k * 0.5, c: hz.kind === 'rayo' ? 'pale' : 'warm', g: 0.5});
    }
  },

  drawDrops(ctx, camX, camY, lights) {
    let budget = 80;
    for (const d of this.drops) {
      const x = Math.round(d.x - camX), y = Math.round(d.y - camY);
      if (x < -20 || x > this.width + 20 || y < -30 || y > this.height + 20) continue;
      const lift = Math.round(d.z || 0) + (d.z > 0 ? 0 : Math.round(Math.sin(this.clock * 4 + d.bob) * 1.5));
      drawShadow(ctx, x, y + 4, d.kind === 'crate' ? 9 : 4, 0.35);
      if (d.kind === 'crate') {
        drawSprite(ctx, 'ofrenda', x, y - 6 - lift, {scale: 2});
        if (budget-- > 0) lights.push({x, y: y - 6 - lift, r: 80, i: 0.9, c: 'white', g: 0.7});
      } else if (d.kind === 'cafe') {
        drawSprite(ctx, 'cafe', x, y - 6 - lift, {scale: 2});
        if (budget-- > 0) lights.push({x, y: y - 6 - lift, r: 40, i: 0.6, c: 'warm', g: 0.3});
      } else if (budget-- > 0) lights.push({x, y: y - 4 - lift, r: d.v > 3 ? 34 : 24, i: 0.6, c: 'warm', g: 0.45});
    }
  },

  /* La cera: una gota ámbar con su brillo, por encima de la oscuridad. */
  drawDropsGlow(ctx, camX, camY) {
    for (const d of this.drops) {
      if (d.kind !== 'cera') continue;
      const x = Math.round(d.x - camX), y = Math.round(d.y - camY - 4 - (d.z || 0) + (d.z > 0 ? 0 : Math.sin(this.clock * 4 + d.bob) * 1.5));
      if (x < -10 || x > this.width + 10 || y < -10 || y > this.height + 10) continue;
      const big = d.v > 3;
      ctx.fillStyle = 'rgba(255,176,74,.32)'; ctx.fillRect(x - 4, y - 4, 8, big ? 11 : 9);
      ctx.fillStyle = big ? '#ffe9a8' : '#ffc46a'; ctx.fillRect(x - 2, y - (big ? 5 : 3), 4, big ? 9 : 7);
      ctx.fillRect(x - 1, y - (big ? 7 : 5), 2, 2);
      ctx.fillStyle = '#fff6d6'; ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  },

  /* ---------- lo que tiene altura ---------- */

  drawItem(ctx, it, lights, layer) {
    const t = this.clock;
    if (it.kind === 'prop') { if (layer === 'base') this.arena.drawProp(ctx, it); return; }
    if (it.kind === 'cast' || it.kind === 'decor') {
      const bob = it.key === 'anima' ? 0 : Math.sin(t * 2 + it.x) * 0.6;
      if (layer === 'base' && it.key !== 'anima') drawShadow(ctx, it.x, it.y + 20, 11);
      const frame = it.kind === 'cast' ? ((t + it.x * 0.37) % 4.3 < 0.13 ? 'blink' : undefined)
        : it.key === 'anima' ? (Math.floor(t * 7 + it.x) % 2 ? 'flick' : undefined) : STEPS[Math.floor(t * 4.5 + it.x * 0.1) & 3];
      ctx.save();
      if (it.alpha !== undefined) ctx.globalAlpha = it.alpha;
      drawSprite(ctx, it.key, it.x, it.y, {scale: 2, flip: it.flip, bob, layer, frame});
      ctx.restore();
      return;
    }
    if (it.kind === 'player') { this.drawPlayer(ctx, it, layer); return; }
    if (it.kind === 'weapon') { this.drawWeapon(ctx, it, layer); return; }
    if (it.kind === 'structure') { this.drawStructure(ctx, it, layer, lights); return; }
    if (it.kind === 'corpse') {
      const c = it.c, k = clamp(c.life / c.total, 0, 1);
      if (layer !== 'base') return;
      ctx.save();
      ctx.globalAlpha = k;
      const s = sprite(c.type);
      drawSprite(ctx, c.type, it.x, it.y - (s.h * c.scale * (0.5 + 0.5 * k)) / 2 + ENEMIES[c.type].r * 0.6, {scale: c.scale, flip: c.flip, sy: 0.5 + 0.5 * k, sx: 1 + (1 - k) * 0.6, layer: 'white'});
      ctx.restore();
      return;
    }
    this.drawEnemy(ctx, it, layer, lights);
  },

  drawPlayer(ctx, it, layer) {
    const p = this.player, t = this.clock, key = this.run.character;
    const sp = Math.hypot(p.vx, p.vy), moving = sp > 25;
    if (layer === 'base') {
      // Un aro cálido bajo los pies: quien vela se encuentra siempre, aunque haya gentío.
      ctx.save(); ctx.strokeStyle = 'rgba(255,213,154,.55)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(it.x, it.y + 10, 15, 6, 0, 0, TAU); ctx.stroke(); ctx.restore();
      drawShadow(ctx, it.x, it.y + 10, 11);
    }
    const blink = p.inv > 0 && p.inv < 50 && this.state === 'running' && Math.floor(t * 22) % 2 && p.hurtT <= 0;
    const step = moving ? Math.abs(Math.sin(p.walk)) : 0;
    const frame = moving ? (step > 0.45 ? (Math.floor(p.walk / Math.PI) & 1 ? 'walk2' : 'walk1') : undefined) : (t % 4.3 < 0.13 ? 'blink' : undefined);
    const dash = this.dashTime > 0;
    const sq = p.squash;
    const sx = (dash ? 1.18 : 1) * (1 + sq * 0.15), sy = (dash ? 0.86 : 1 + step * 0.04) * (1 - sq * 0.12);
    const opts = {scale: 2, flip: p.face < 0, bob: -step * 2.5, sx, sy, rot: p.lean + (dash ? (p.face < 0 ? -0.15 : 0.15) : 0), layer, frame};
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    drawSprite(ctx, key, it.x, it.y - 12, opts);
    if (p.hurtT > 0 && layer === 'base') { ctx.globalAlpha = clamp(p.hurtT / 0.3, 0, 1) * 0.9; drawSprite(ctx, key, it.x, it.y - 12, {...opts, layer: 'white'}); }
    ctx.restore();
    if (layer === 'glow' && this.abilityBuff) {
      ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 10);
      ctx.strokeStyle = '#9fe0c6'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(it.x, it.y + 8, 18, 7, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  },

  /* Las armas en corro: giran hacia lo que atacan y retroceden al disparar. */
  drawWeapon(ctx, it, layer) {
    const wpn = it.wpn, def = WEAPON[wpn.id], t = this.clock;
    if (def.act === 'orbit') { if (layer === 'glow') this.drawBeads(ctx, wpn, it.x - wpn.x, it.y - wpn.y); return; }
    const upright = UPRIGHT.has(wpn.id);
    const recoil = wpn.recoil || 0;
    const a = wpn.aim || 0;
    let x = it.x - Math.cos(a) * recoil * 5, y = it.y - Math.sin(a) * recoil * 5;
    const scale = 2;
    const tierGlow = ['', 'rgba(110,160,255,.5)', 'rgba(190,110,255,.55)', 'rgba(255,90,70,.6)'][wpn.tier];
    if (layer === 'base') {
      if (wpn.anim && (def.act === 'sweep' || def.act === 'spin')) {
        // El arco del barrido: un abanico claro que se desvanece detrás de la hoja.
        const an = wpn.anim, p = this.player, cx = p.x - (wpn.x - it.x), cy = p.y - 12 - (wpn.y - it.y);
        const a0 = an.a0, a1 = an.a0 + (an.a1 - an.a0) * clamp(an.t / an.total * 1.2, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.35 * (1 - an.t / an.total);
        ctx.fillStyle = `rgba(${TONE_RGB[def.tone] || TONE_RGB.iron},.6)`;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        for (let s = 0; s <= 10; s++) { const aa = a0 + (a1 - a0) * s / 10; ctx.lineTo(cx + Math.cos(aa) * an.range, cy + Math.sin(aa) * an.range * 0.85); }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (upright) {
        const bob = Math.sin(t * 3 + it.i) * 2;
        if (tierGlow) { ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = tierGlow; ctx.beginPath(); ctx.ellipse(x, y + 12, 8, 3, 0, 0, TAU); ctx.fill(); ctx.restore(); }
        drawSprite(ctx, 'w:' + wpn.id, x, y + bob, {scale: def.act === 'censer' ? 2 : 1.5, rot: def.act === 'censer' ? Math.sin(t * 3.1) * 0.5 : recoil * 0.3});
      } else {
        const flip = Math.cos(a) < 0;
        drawSprite(ctx, 'w:' + wpn.id, x, y, {scale, rot: flip ? a - Math.PI : a, flip, sy: 1});
        if (tierGlow && layer === 'base') {
          ctx.save(); ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 4 + it.i); ctx.fillStyle = tierGlow;
          ctx.fillRect(Math.round(x + Math.cos(a) * 12) - 2, Math.round(y + Math.sin(a) * 12) - 2, 4, 4);
          ctx.restore();
        }
      }
    } else if (def.act === 'flame' && wpn.burning > 0) {
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff1bd';
      ctx.fillRect(Math.round(x + Math.cos(a) * 10) - 2, Math.round(y + Math.sin(a) * 10) - 2, 4, 4);
      ctx.restore();
    } else if (upright) {
      drawSprite(ctx, 'w:' + wpn.id, x, y + Math.sin(t * 3 + it.i) * 2, {scale: def.act === 'censer' ? 2 : 1.5, rot: def.act === 'censer' ? Math.sin(t * 3.1) * 0.5 : 0, layer: 'glow'});
    }
  },

  /* Las cuentas del rosario: perlas con un rastro corto. */
  drawBeads(ctx, wpn, ox, oy) {
    const p = this.player, n = wpn.beads || 2, R = this.weaponRange(wpn);
    for (let i = 0; i < n; i++) {
      const a = (wpn.spin || 0) + i / n * TAU;
      const bx = Math.round(p.x + Math.cos(a) * R + ox), by = Math.round(p.y - 10 + Math.sin(a) * R * 0.8 + oy);
      for (let k = 3; k >= 1; k--) {
        const aa = a - k * 0.12;
        ctx.fillStyle = `rgba(238,205,129,${0.18 * (4 - k) / 3})`;
        ctx.fillRect(Math.round(p.x + Math.cos(aa) * R + ox) - 2, Math.round(p.y - 10 + Math.sin(aa) * R * 0.8 + oy) - 2, 4, 4);
      }
      this.combatFx.halo(ctx, 'sacred', bx, by, 16, 0.4);
      ctx.fillStyle = '#25202e'; ctx.fillRect(bx - 4, by - 3, 8, 6); ctx.fillRect(bx - 3, by - 4, 6, 8);
      ctx.fillStyle = '#eecd81'; ctx.fillRect(bx - 3, by - 2, 6, 4); ctx.fillRect(bx - 2, by - 3, 4, 6);
      ctx.fillStyle = '#fff4d8'; ctx.fillRect(bx - 2, by - 2, 2, 2);
    }
  },

  drawStructure(ctx, it, layer, lights) {
    const s = it.s, t = this.clock;
    if (s.kind === 'cruceiro') {
      if (layer === 'base') {
        ctx.save(); ctx.strokeStyle = 'rgba(143,227,154,.35)'; ctx.lineWidth = 1; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -t * 10;
        ctx.beginPath(); ctx.ellipse(it.x, it.y, 110, 82, 0, 0, TAU); ctx.stroke(); ctx.restore();
        drawShadow(ctx, it.x, it.y + 2, 12);
        const art = this.arena.art?.cruceiro;
        if (art) ctx.drawImage(art.c, it.x - art.ox, it.y - art.oy, art.w, art.h);
        if (lights) lights.push({x: it.x, y: it.y - 30, r: 110, i: 0.6, c: 'sacred', g: 0.4});
      }
      return;
    }
    const key = s.kind === 'colmena' ? 'colmena' : 'espantallo';
    if (layer === 'base') drawShadow(ctx, it.x, it.y + 2, 10);
    drawSprite(ctx, key, it.x, it.y - 16 + Math.sin(t * 2) * 0.5, {scale: 2, layer, rot: s.recoil * 0.1 * (Math.cos(s.aim) < 0 ? -1 : 1), flip: Math.cos(s.aim) < 0});
    if (layer === 'base' && lights) lights.push({x: it.x, y: it.y - 20, r: 50, i: 0.5, c: 'warm', g: 0.3});
  },

  drawEnemy(ctx, it, layer, lights) {
    const t = this.clock, e = it.e, d = ENEMIES[e.type], s = sprite(e.type), scale = d.scale * (e.size || 1);
    const flying = FLYING.has(e.type);
    let bob = flying ? Math.sin(t * (e.type === 'anima' ? 5 : 4) + e.seed) * 4 : Math.sin(t * 6 + e.seed) * 0.7;
    let sx = 1, sy = 1, rot = 0, x = it.x, y = it.y - (s.h * scale) / 2 + e.r * 0.6;
    let frame;
    switch (e.type) {
      case 'anima': frame = Math.floor(t * 7 + e.seed) % 2 ? 'flick' : undefined; break;
      case 'hermano': frame = STEPS[Math.floor(t * 4.5 + e.seed) & 3]; break;
      case 'urco': frame = e.mode === 'lunge' ? 'run1' : e.mode === 'windup' ? 'run2' : e.mode === 'rest' ? undefined : RUN[Math.floor(t * 9 + e.seed) & 3]; break;
      case 'lobishome': frame = e.mode === 'lunge' ? 'run1' : e.mode === 'windup' ? 'run2' : RUN[Math.floor(t * 8 + e.seed) & 3]; break;
      case 'curuxa': frame = Math.floor(t * (e.mode === 'swoop' ? 14 : 8) + e.seed) % 2 ? 'down' : undefined; break;
      case 'ahogado': frame = STEPS[Math.floor(t * 3 + e.seed) & 3]; break;
      case 'planidera': frame = e.mode === 'cast' ? (Math.floor(t * 10) % 2 ? 'cry' : undefined) : STEPS[Math.floor(t * 4 + e.seed) & 3]; break;
      case 'espantajo': frame = e.mode === 'swing' || Math.floor(t * 2.5 + e.seed) % 3 === 0 ? 'rustle' : undefined; break;
      case 'trasno': case 'lavandeira': frame = STEPS[Math.floor(t * 8 + e.seed) & 3]; break;
      case 'nubeiro': frame = Math.floor(t * 9 + e.seed) % 3 ? undefined : 'flick'; break;
      case 'guia': frame = Math.floor(t * 3) % 2 ? 'step1' : undefined; break;
      default: break;
    }
    if (e.type === 'urco' || e.type === 'lobishome') {
      if (e.mode === 'windup') { sy = 0.86; sx = 1.1; x += Math.sin(t * 60) * 1.5; }
      else if (e.mode === 'lunge') { sx = 1.2; sy = 0.9; }
    }
    if (e.type === 'hermano') rot = Math.sin(t * 3 + e.seed) * 0.03;
    if (e.type === 'ahogado') rot = Math.sin(t * 2 + e.seed) * 0.06;
    if (e.type === 'trasno') { bob = -Math.abs(Math.sin(t * 14 + e.seed)) * 3; rot = Math.sin(t * 10 + e.seed) * 0.08; }
    if (e.mode === 'cast') x += Math.sin(t * 40) * 1.2;
    if (e.type === 'espantajo') { rot = Math.sin(t * 1.6 + e.seed) * 0.05; if (e.mode === 'swing') rot = Math.sin(t * 30) * 0.14; }
    if (e.type === 'guia') { bob = Math.sin(t * 2) * 1.5; if (e.mode === 'windup') x += Math.sin(t * 50) * 2; }
    if (e.stun > 0) x += Math.sin(t * 50) * 1;
    let alpha = 1;
    if (e.dissolve) alpha = clamp(e.dissolveT / 0.8, 0, 1);
    if (e.rising > 0) {
      const k = clamp(1 - e.rising / 0.32, 0.15, 1);
      y += s.h * scale * (1 - k) / 2; sy *= k; alpha *= k;
    }
    // El golpe se nota: la criatura se aplasta un instante y se pone blanca.
    if (e.squash > 0.02) { sx *= 1 + 0.2 * e.squash; sy *= 1 - 0.16 * e.squash; }
    const flip = e.flip;
    if (layer === 'base') {
      if (!flying) drawShadow(ctx, it.x, it.y + e.r * 0.6 + 4, s.w * scale * 0.33);
      else drawShadow(ctx, it.x, it.y + 18, 8, 0.25);
      if (e.elite || e.type === 'guia') {
        ctx.save();
        ctx.strokeStyle = e.type === 'guia' ? 'rgba(255,241,189,.5)' : `rgba(255,128,96,${0.45 + 0.25 * Math.sin(t * 5)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(it.x, it.y + e.r * 0.6 + 4, e.r + 10, (e.r + 10) * 0.4, 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSprite(ctx, e.type, x, y, {scale, flip, bob, sx, sy, rot, frame});
      if (e.flash > 0) { ctx.globalAlpha = alpha * clamp(e.flash / 0.11, 0, 1) * (e.type === 'guia' ? 0.5 : 0.95); drawSprite(ctx, e.type, x, y, {scale, flip, bob, sx, sy, rot, frame, layer: 'white'}); }
      if (e.burnT > 0) { ctx.globalAlpha = alpha * 0.25; ctx.fillStyle = '#ff742e'; ctx.fillRect(Math.round(x - s.w * scale / 2), Math.round(y + bob - s.h * scale / 2), s.w * scale, s.h * scale); }
      ctx.restore();
      if (e.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; ctx.fillStyle = '#fff1bd'; ctx.fillRect(Math.round(x + Math.cos(a) * 10), Math.round(y - s.h * scale / 2 - 6 + Math.sin(a) * 3), 2, 2); }
      if (e.root > 0) { ctx.strokeStyle = 'rgba(217,201,160,.9)'; ctx.lineWidth = 1; ctx.strokeRect(Math.round(x - 8), Math.round(y - 8), 16, 16); }
      if (lights) {
        if (e.type === 'hermano') lights.push({x: x + (flip ? -7 : 7), y: y - 4 + bob, r: 60, i: 0.85 * alpha, c: 'warm', g: 0.6});
        else if (e.type === 'anima') lights.push({x, y: y + bob, r: 52, i: 0.8 * alpha, c: 'blue', g: 0.8});
        else if (e.type === 'lavandeira') lights.push({x, y: y + bob, r: 70, i: 0.7 * alpha, c: 'pale', g: 0.6});
        else if (e.type === 'nubeiro') lights.push({x, y: y + bob + 10, r: 56, i: 0.6 * alpha, c: 'pale', g: 0.6});
        else if (e.type === 'trasno' && e.stolen > 0) lights.push({x, y, r: 40 + Math.min(40, e.stolen * 3), i: 0.8, c: 'warm', g: 0.8});
        else if (e.type === 'guia') lights.push({x: x + (flip ? -26 : 26), y: y + bob - 6, r: 190, i: 1, c: 'warm', g: 0.7});
        if (e.elite) lights.push({x, y: y + bob, r: 110 + Math.sin(t * 3 + e.seed) * 8, i: 0.85 * alpha, c: 'red', g: 0.7});
        if (e.mode === 'cast') lights.push({x, y: y - 10, r: 46, i: 0.7, c: e.type === 'nubeiro' ? 'pale' : 'blue', g: 0.7});
      }
      // Barra de vida para los que tienen nombre.
      if (e.elite && e.hp > 0) {
        const bw = 40, bx = Math.round(it.x - bw / 2), by = Math.round(y - s.h * scale / 2 - 12);
        ctx.fillStyle = 'rgba(7,8,13,.8)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
        ctx.fillStyle = '#ff8a6a'; ctx.fillRect(bx, by, Math.round(bw * clamp(e.hp / e.maxHp, 0, 1)), 3);
      }
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSprite(ctx, e.type, x, y, {scale, flip, bob, sx, sy, rot, frame, layer: 'glow'});
      ctx.restore();
    }
  },

  /* Las embestidas y los picados se anuncian con una banda en el suelo. */
  drawTelegraphs(ctx, camX, camY) {
    const t = this.clock;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve || e.mode !== 'windup') continue;
      const x = e.x - camX, y = e.y - camY;
      if (x < -260 || x > this.width + 260 || y < -260 || y > this.height + 260) continue;
      const length = e.lockLen || 180, width = e.r + 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(e.lock);
      const rgb = e.type === 'curuxa' ? '255,214,120' : '255,96,72';
      ctx.fillStyle = `rgba(${rgb},${0.1 + 0.08 * Math.sin(t * 20)})`; ctx.fillRect(0, -width, length, width * 2);
      ctx.strokeStyle = `rgba(${rgb},.85)`; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.moveTo(0, -width); ctx.lineTo(length, -width); ctx.moveTo(0, width); ctx.lineTo(length, width); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) { const dd = length * i / 4; ctx.beginPath(); ctx.moveTo(dd - 5, -5); ctx.lineTo(dd, 0); ctx.lineTo(dd - 5, 5); ctx.stroke(); }
      ctx.restore();
    }
  },

  /* ---------- proyectiles ---------- */

  drawShots(ctx, camX, camY) {
    const fl = this.options.flashes;
    for (const s of this.shots) {
      const x = s.x - camX, y = s.y - camY;
      if (x < -60 || x > this.width + 60 || y < -80 || y > this.height + 60) continue;
      switch (s.kind) {
        case 'chispas': this.combatFx.drawProjectile(ctx, {...s, kind: 'chispa', tone: 'ember'}, camX, camY, fl); break;
        case 'sal': this.combatFx.drawProjectile(ctx, {...s, kind: 'sal', tone: 'salt'}, camX, camY, fl); break;
        case 'piedra': case 'paja': {
          this.trail(ctx, s, camX, camY, s.kind === 'paja' ? '214,180,102' : '170,176,186', 2);
          ctx.fillStyle = s.kind === 'paja' ? '#d6b466' : '#aab1be';
          ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 6, 6);
          ctx.fillStyle = '#eef0f2'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 2, 2);
          break;
        }
        case 'vieira': this.combatFx.halo(ctx, 'sacred', x, y, 20, 0.5); drawSprite(ctx, 'w:vieiras', x, y, {scale: 1.4, rot: s.spin}); break;
        case 'pandeireta': this.combatFx.halo(ctx, 'sacred', x, y, 26, 0.5); drawSprite(ctx, 'w:pandeireta', x, y, {scale: 1.6, rot: s.spin}); break;
        case 'foguete': drawSprite(ctx, 'w:foguetes', x, y, {scale: 1.6, rot: s.a}); this.combatFx.halo(ctx, 'ember', x - Math.cos(s.a) * 10, y - Math.sin(s.a) * 10, 22, 0.8); break;
        case 'arpon': this.trail(ctx, s, camX, camY, '200,220,235', 1); drawSprite(ctx, 'w:arpon', x, y, {scale: 2, rot: s.a}); break;
        case 'onda': {
          ctx.save(); ctx.translate(x, y); ctx.rotate(s.a);
          const k = clamp(s.life / s.total, 0, 1);
          ctx.globalAlpha = 0.4 + 0.6 * k;
          for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = i ? 'rgba(159,224,198,.7)' : '#e2fbf1'; ctx.lineWidth = i ? 2 : 3;
            ctx.beginPath(); ctx.arc(-i * 8, 0, s.r, -s.arc / 2 - 0.2, s.arc / 2 + 0.2); ctx.stroke();
          }
          ctx.restore();
          break;
        }
        case 'frasco': {
          const k = 1 - clamp(s.life / s.total, 0, 1), lift = Math.sin(k * Math.PI) * 60;
          drawShadow(ctx, x, y + 6, 4, 0.3);
          drawSprite(ctx, 'w:agua', x, y - lift, {scale: 1.5, rot: k * 8});
          break;
        }
        case 'abella': {
          ctx.fillStyle = '#ffd447'; ctx.fillRect(Math.round(x) - 2, Math.round(y) - 1, 4, 3);
          ctx.fillStyle = '#1d1d27'; ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 3);
          ctx.fillStyle = 'rgba(238,248,255,.8)'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3 + (Math.floor(this.clock * 30) % 2), 2, 2);
          break;
        }
        default: this.combatFx.drawProjectile(ctx, s, camX, camY, fl);
      }
    }
  },

  trail(ctx, s, camX, camY, rgb, width) {
    const tail = s.trail;
    for (let i = 0; i < tail.length; i++) {
      const from = tail[i], to = tail[i + 1] || s, k = (i + 1) / tail.length;
      ctx.strokeStyle = `rgba(${rgb},${k * 0.5})`; ctx.lineWidth = width + k * 2;
      ctx.beginPath(); ctx.moveTo(from.x - camX, from.y - camY); ctx.lineTo(to.x - camX, to.y - camY); ctx.stroke();
    }
  },

  drawEnemyShots(ctx, camX, camY) {
    for (const s of this.enemyShots) {
      const x = Math.round(s.x - camX), y = Math.round(s.y - camY);
      if (x < -20 || x > this.width + 20 || y < -20 || y > this.height + 20) continue;
      if (s.kind === 'vela') {
        ctx.fillStyle = 'rgba(255,176,74,.45)'; ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = '#ffb04a'; ctx.fillRect(x - 3, y - 4, 6, 8);
        ctx.fillStyle = '#fff1bd'; ctx.fillRect(x - 1, y - 2, 3, 4);
      } else if (s.kind === 'pluma') {
        ctx.save(); ctx.translate(x, y); ctx.rotate(s.a);
        ctx.fillStyle = '#e6dabd'; ctx.fillRect(-6, -1, 12, 3); ctx.fillStyle = '#9e8664'; ctx.fillRect(-6, 0, 12, 1);
        ctx.restore();
      } else {
        const blue = s.kind === 'agua' ? '#7fb3c4' : '#86bff2';
        ctx.fillStyle = 'rgba(134,191,242,.45)'; ctx.fillRect(x - 6, y - 6, 12, 12);
        ctx.fillStyle = blue; ctx.fillRect(x - 3, y - 4, 6, 8);
        ctx.fillStyle = '#e8f5ff'; ctx.fillRect(x - 2, y - 3, 3, 4); ctx.fillRect(x - 1, y - 6, 2, 2);
      }
    }
  },

  /* ---------- encima de todo ---------- */

  drawNumbers(ctx, camX, camY) {
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const n of this.numbers) {
      const k = clamp(n.life / n.total, 0, 1), age = n.total - n.life;
      const pop = n.pop ? 1 + Math.max(0, 0.6 - age * 6) : 1;
      const size = Math.round(n.size * pop);
      ctx.font = `${n.label ? 700 : 800} ${size}px ui-monospace, 'Alegreya Sans', monospace`;
      ctx.globalAlpha = Math.min(1, k * 2.4);
      const x = Math.round(n.x - camX), y = Math.round(n.y - camY);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(7,8,13,.9)'; ctx.strokeText(n.text, x, y);
      ctx.fillStyle = n.color; ctx.fillText(n.text, x, y);
    }
    ctx.restore();
  },

  drawOverlays(ctx) {
    const w = this.width, h = this.height;
    ctx.save();
    ctx.drawImage(vignetteSprite(), -w * 0.04, -h * 0.04, w * 1.08, h * 1.08);
    const p = this.player, low = this.state === 'running' && p.hp < this.d.maxHp * 0.3;
    if (low) {
      const pulse = 0.5 + 0.5 * Math.sin(this.clock * 6);
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
      g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(150,16,12,${0.2 + pulse * 0.2})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    if (this.flash > 0.01) {
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = `rgb(${this.flashColor})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  },

  /* El haz del faro de su padre barre el atrio. */
  beamShape(camX, camY) {
    const ox = ARENA.right + 260 - camX, oy = ARENA.top - 160 - camY;
    return {x: ox, y: oy, a: (this.beamA || 0) + Math.PI * 0.5, spread: 0.06, len: 2600, i: 0.6};
  },

  beamLight(lights, camX, camY) {
    const b = this.beamShape(camX, camY);
    for (let i = 1; i < 6; i++) lights.push({x: b.x + Math.cos(b.a) * i * 260, y: b.y + Math.sin(b.a) * i * 260, r: 70, i: 0.4, c: 'white', g: 0.4});
  },

  /* En el título: quien vela junto al ataúd y la Compaña que pasa a lo lejos. */
  titleCast(items, camX, camY, lights) {
    const sel = this.character;
    const others = Object.keys(CHARACTERS).filter(k => k !== sel);
    const spots = [{x: -150, y: -446}, {x: 150, y: -450}, {x: -250, y: -400}, {x: 250, y: -404}, {x: -60, y: -380}];
    items.push({kind: 'cast', key: sel, x: 0 - camX, y: -420 - camY, flip: false, on: true, sortY: -420 - camY + 22});
    lights.push({x: 6 - camX, y: -430 - camY, r: 200, i: 1, c: 'warm', g: 0.5});
    others.slice(0, 3).forEach((k, i) => {
      const s = spots[i];
      items.push({kind: 'cast', key: k, x: s.x - camX, y: s.y - camY, flip: s.x > 0, sortY: s.y - camY + 22, alpha: 0.85});
    });
    const n = 9, base = ((this.clock * 22 + 900) % 2200) - 1100;
    for (let i = 0; i < n; i++) {
      const x = base - i * 30 - camX, y = -250 + Math.sin((base - i * 30) * 0.004) * 30 - camY;
      items.push({kind: 'decor', key: 'hermano', x, y, flip: false, sortY: y + 20, alpha: 0.9});
      lights.push({x: x + 7, y: y - 4, r: 56, i: 0.85, c: 'warm', g: 0.55});
    }
    for (let i = 0; i < 5; i++) {
      const a = this.clock * 0.25 + i * TAU / 5, x = Math.cos(a) * 360 - camX, y = Math.sin(a) * 150 - 300 - camY;
      items.push({kind: 'decor', key: 'anima', x, y: y + Math.sin(this.clock * 2 + i) * 5, flip: false, sortY: y + 18});
      lights.push({x, y, r: 50, i: 0.7, c: 'blue', g: 0.75});
    }
  }
};

function lightTone(tone) { return {ember: 'ember', salt: 'salt', sacred: 'sacred', sea: 'blue', music: 'sacred', iron: 'white'}[tone] || 'warm'; }
