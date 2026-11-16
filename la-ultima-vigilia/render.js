/*
 * El dibujo de cada fotograma: mundo, criaturas, oscuridad, luces y lo que brilla encima.
 */
import { TAU, clamp, rand, lerp } from './util.js';
import { NIGHT, COFFIN, ENEMIES, WORLD, LIGHTHOUSE } from './balance.js';
import { drawSprite, drawShadow, sprite } from './art.js';
import { drawFlames, drawFog } from './world.js';
import { ELITES, VIGIL_TEXT, BOSS } from './story.js';

const STEPS = [undefined, 'step1', undefined, 'step2'];
const RUN = ['run1', undefined, 'run2', undefined];

export const renderMethods = {
  nightLook() {
    const t = this.time;
    let dark;
    if (t < 300) dark = 0.8 + t / 300 * 0.1;
    else if (t < 450) dark = 0.9;
    else dark = 0.9 - (Math.min(t, NIGHT) - 450) / 150 * 0.2;
    let tint = [4, 7, 17];
    if (t > 470) { const k = clamp((t - 470) / 130, 0, 1); tint = [lerp(4, 30, k), lerp(7, 24, k), lerp(17, 52, k)]; }
    let warm = 0;
    if (this.state === 'ready') { dark = 0.8; tint = [4, 7, 17]; }
    if (this.state === 'dying') dark = lerp(dark, 0.985, clamp(this.dyingT / 1.6, 0, 1));
    if (this.state === 'ended' && !this.lastVictory) dark = 0.985;
    if (this.state === 'dawn' || (this.state === 'ended' && this.lastVictory)) {
      const k = this.state === 'dawn' ? clamp(this.dawnT / 7, 0, 1) : 1;
      const k2 = this.state === 'dawn' ? clamp((this.dawnT - 6) / 6, 0, 1) : 1;
      dark = lerp(lerp(dark, 0.42, k), 0.22, k2);
      tint = [lerp(tint[0], 24, k), lerp(tint[1], 30, k), lerp(tint[2], 64, k)];
      warm = k + k2 * 0.7;
    }
    if (this.options.softDark) dark *= 0.8;
    const fog = this.state === 'ready' ? 0.7 : t < 300 ? 0.55 + t / 300 * 0.45 : t < 450 ? 1 : 1 - (t - 450) / 150 * 0.5;
    const dawnFog = this.state === 'dawn' ? fog * Math.max(0.25, 1 - this.dawnT / 6) : this.state === 'ended' && this.lastVictory ? fog * 0.25 : fog;
    return {dark, tint: tint.map(v => Math.round(v)).join(','), warm, fog: dawnFog};
  },

  /* La cámara no sale del camposanto: deja ver un poco de lo que hay al otro lado del muro. */
  clampCamera() {
    const w = this.width, h = this.height, m = WORLD.margin;
    const x0 = WORLD.left - m.w + w / 2, x1 = WORLD.right + m.e - w / 2;
    const y0 = WORLD.top - m.n + h / 2, y1 = WORLD.bottom + m.s - h / 2;
    this.cam.x = x0 > x1 ? (x0 + x1) / 2 : clamp(this.cam.x, x0, x1);
    this.cam.y = y0 > y1 ? (y0 + y1) / 2 : clamp(this.cam.y, y0, y1);
  },

  /* Lo que el camposanto necesita saber del velatorio para dibujarse. */
  wakeLook() {
    const cirios = this.cirios || null;
    return {cirios, lit: cirios ? cirios.filter(c => c.lit).length : 4, bell: this.bellT || 0, dim: this.flameDim ?? 1};
  },

  /* El faro da una vuelta cada quince segundos. */
  beamAngle() { return this.clock * 0.42; },

  render() {
    const ctx = this.ctx, w = this.width, h = this.height, p = this.player;
    const title = this.state === 'ready';
    const target = title ? this.titleFocus : p;
    if (title) { this.cam.x = target.x; this.cam.y = target.y; }
    else { const k = 1 - Math.exp(-0.016 * 12); this.cam.x = lerp(this.cam.x, target.x, k); this.cam.y = lerp(this.cam.y, target.y, k); }
    this.clampCamera();
    const camX = Math.round(this.cam.x - w / 2), camY = Math.round(this.cam.y - h / 2);
    const look = this.nightLook();
    const flames = [], lights = [], items = [];
    const wake = this.wakeLook();
    ctx.save();
    if (this.shake > 0.2 && this.options.shake) ctx.translate(Math.round(rand(-1, 1) * this.shake), Math.round(rand(-1, 1) * this.shake));
    this.cemetery.ground(ctx, camX, camY, w, h);
    this.cemetery.sea(ctx, camX, camY, w, h, this.clock);
    this.drawPools(ctx, camX, camY);
    this.ambient.drawDecals(ctx, camX, camY, w, h);
    this.cemetery.collect(ctx, camX, camY, w, h, this.clock, wake, items, flames, lights);
    if (this.mem.farol && !title && this.state !== 'ended') this.combatFx.drawLanternAura(ctx, p, this.lightRadius() * 0.7, this.clock, camX, camY, this.options.flashes);

    // Café en el suelo
    for (const g of this.gems) {
      if (!g.cafe) continue;
      const x = g.x - camX, y = g.y - camY + Math.sin(this.clock * 3 + g.bob) * 2;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      drawShadow(ctx, x, y + 8, 7);
      drawSprite(ctx, 'cafe', x, y, {scale: 2});
      lights.push({x, y, r: 34, i: 0.6, c: 'warm', g: 0.3});
    }

    // Quién y qué hay en escena, ordenado de arriba abajo por donde pisa.
    if (title) this.titleCast(items, camX, camY, lights);
    for (const e of this.enemies) {
      const x = e.x - camX, y = e.y - camY;
      if (x < -90 || x > w + 90 || y < -110 || y > h + 90) continue;
      const flying = e.type === 'anima' || e.type === 'curuxa';
      items.push({kind: 'enemy', e, x, y, sortY: y + (flying ? 18 : e.r * 0.6)});
    }
    for (const c of this.corpses) items.push({kind: 'corpse', c, x: c.x - camX, y: c.y - camY, sortY: c.y - camY + 8});
    if (!title && this.state !== 'ended' || (this.state === 'ended' && this.lastVictory)) items.push({kind: 'player', x: p.x - camX, y: p.y - camY, sortY: p.y - camY + 10});
    items.sort((a, b) => a.sortY - b.sortY);

    for (const g of this.ghosts) {
      ctx.globalAlpha = g.life / 0.28 * 0.35;
      drawSprite(ctx, this.character, g.x - camX, g.y - camY - 12, {scale: 2, flip: g.face < 0, layer: 'white'});
    }
    ctx.globalAlpha = 1;
    const entityLights = [];
    for (const it of items) this.drawItem(ctx, it, entityLights, 'base');
    if (entityLights.length > 56) {
      const cx = w / 2, cy = h / 2;
      entityLights.sort((a, b) => ((a.x - cx) ** 2 + (a.y - cy) ** 2) - ((b.x - cx) ** 2 + (b.y - cy) ** 2));
      entityLights.length = 56;
    }
    for (const L of entityLights) lights.push(L);
    const sky = this.weatherLook();
    this.ambient.drawWeather(ctx, camX, camY, w, h, this.clock, sky.rain, sky.wind, sky.a);
    drawFog(ctx, camX, camY, w, h, this.clock, look.fog * 0.9);

    // Polillas
    for (const m of this.moths) drawSprite(ctx, 'polilla', m.x - camX, m.y - camY, {scale: 2, frame: Math.sin(m.flap) > 0 ? undefined : 'shut'});
    // Partículas sin luz propia
    for (const q of this.particles) {
      if (q.glow) continue;
      ctx.globalAlpha = clamp(q.life / q.total, 0, 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - camX - q.size / 2), Math.round(q.y - camY - q.size / 2), q.size, q.size);
    }
    ctx.globalAlpha = 1;

    // Luces de lo que se mueve
    if (!title && (this.state !== 'ended' || this.lastVictory)) lights.push({x: p.x - camX + p.face * 8, y: p.y - camY - 10, r: this.lightRadius() * (1 + 0.04 * this.flare), i: 1, c: 'warm', g: 0.5 + 0.3 * this.flare});
    let budget = 48;
    for (const s of this.shots) {
      if (s.x - camX < -100 || s.x - camX > w + 100 || s.y - camY < -100 || s.y - camY > h + 100 || budget <= 0) continue;
      budget--;
      const salt = s.kind === 'sal';
      lights.push({x: s.x - camX, y: s.y - camY, r: salt ? 26 : 55, a: s.a, stretch: salt ? 1.5 : 1.7,
        i: this.options.flashes ? 0.8 : 0.4, c: s.tone || (salt ? 'salt' : 'ember'), g: this.options.flashes ? 0.7 : 0.22});
    }
    if (this.mem.rosario && !title && this.state !== 'ended') {
      const beads = 1 + this.mem.rosario, R = 58 + 4 * this.mem.rosario;
      for (let i = 0; i < beads; i++) {
        const a = this.clock * 2.3 + i * TAU / beads;
        lights.push({x: p.x - camX + Math.cos(a) * R, y: p.y - 4 - camY + Math.sin(a) * R, r: 34, i: 0.42, c: 'sacred', g: this.options.flashes ? 0.4 : 0.18});
      }
    }
    this.combatFx.addLights(lights, camX, camY, this.options.flashes);
    for (const s of this.enemyShots) if (!(s.delay > 0)) lights.push({x: s.x - camX, y: s.y - camY, r: 30, i: 0.7, c: s.kind === 'cera' ? 'warm' : 'blue', g: 0.6});
    budget = 60;
    for (const g of this.gems) {
      if (g.cafe || budget <= 0 || this.state === 'dawn' || this.state === 'ended') continue;
      const x = g.x - camX, y = g.y - camY;
      if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
      budget--;
      if (g.card) lights.push({x, y, r: 70, i: 0.95, c: 'white', g: 0.8});
      else lights.push({x, y, r: 22, i: 0.55, c: 'warm', g: 0.35});
    }
    for (const r of this.rings) if (r.light) lights.push({x: r.x - camX, y: r.y - camY, r: r.light * (0.6 + 0.4 * r.r / r.max), i: 0.75 * r.life / r.total, c: 'warm', g: 0.4});
    for (const m of this.marks) lights.push({x: m.x - camX, y: m.y - camY, r: 40, i: 0.8, c: 'warm', g: 0.5});

    // El faro de su padre barre el camposanto
    const beams = [{x: LIGHTHOUSE.x - camX, y: LIGHTHOUSE.y + LIGHTHOUSE.lampY - camY, a: this.beamAngle(), spread: 0.06, len: 4600, i: this.state === 'dawn' ? 0.2 : 0.55}];

    this.lighting.render(ctx, lights, look.dark, look.tint, beams);
    this.lighting.glow(ctx, lights, 0.55 * (1 - look.warm * 0.6));
    drawFlames(ctx, flames, this.clock, this.gustT > 0 ? Math.cos(this.gustA) * 3 * Math.min(1, this.gustT) : 0);
    this.ambient.drawMoths(ctx, flames, this.clock);
    for (const it of items) this.drawItem(ctx, it, null, 'glow');

    // Luz que se recoge (al amanecer, sube y se va)
    const gemAlpha = this.state === 'dawn' ? clamp(1 - this.dawnT / 7, 0, 1) : this.state === 'ended' && this.lastVictory ? 0 : 1;
    ctx.globalAlpha = gemAlpha;
    for (const g of this.gems) {
      if (g.cafe || gemAlpha <= 0) continue;
      const x = Math.round(g.x - camX), y = Math.round(g.y - camY + Math.sin(this.clock * 4 + g.bob) * 2);
      if (x < -10 || x > w + 10 || y < -10 || y > h + 10) continue;
      if (g.card) {
        // El recordatorio: una estampa con su cruz y su orla negra.
        ctx.fillStyle = 'rgba(255,241,189,.35)'; ctx.fillRect(x - 8, y - 11, 16, 20);
        ctx.fillStyle = '#07080d'; ctx.fillRect(x - 6, y - 9, 12, 16);
        ctx.fillStyle = '#f1e8d2'; ctx.fillRect(x - 5, y - 8, 10, 14);
        ctx.fillStyle = '#1c1915'; ctx.fillRect(x - 1, y - 6, 2, 7); ctx.fillRect(x - 3, y - 4, 6, 2);
        ctx.fillRect(x - 3, y + 3, 6, 1);
        continue;
      }
      const big = g.v > 2;
      ctx.fillStyle = 'rgba(255,176,74,.3)'; ctx.fillRect(x - 4, y - 4, 8, big ? 11 : 9);
      ctx.fillStyle = big ? '#ffe9a8' : '#ffc46a'; ctx.fillRect(x - 2, y - (big ? 5 : 4), 4, big ? 9 : 8);
      ctx.fillRect(x - 1, y - (big ? 7 : 6), 2, 2);
      ctx.fillStyle = '#fff6d6'; ctx.fillRect(x - 1, y - 1, 2, 3);
    }
    ctx.globalAlpha = 1;
    // Los núcleos y las estelas se dibujan sobre la oscuridad que ellos iluminan.
    for (const s of this.shots) this.combatFx.drawProjectile(ctx, s, camX, camY, this.options.flashes);
    if (this.mem.rosario && !title && this.state !== 'ended') {
      this.combatFx.drawRosary(ctx, p, this.mem.rosario, this.clock, camX, camY, this.options.flashes);
    }
    this.combatFx.render(ctx, camX, camY, this.options.flashes);
    // Partículas con luz
    for (const q of this.particles) {
      if (!q.glow) continue;
      ctx.globalAlpha = clamp(q.life / q.total, 0, 1);
      ctx.fillStyle = q.color;
      ctx.fillRect(Math.round(q.x - camX - q.size / 2), Math.round(q.y - camY - q.size / 2), q.size, q.size);
    }
    ctx.globalAlpha = 1;
    this.drawTelegraphs(ctx, camX, camY);
    // Proyectiles enemigos
    for (const s of this.enemyShots) {
      if (s.delay > 0) continue;
      const x = Math.round(s.x - camX), y = Math.round(s.y - camY);
      if (s.kind === 'cera') {
        ctx.fillStyle = 'rgba(255,176,74,.5)'; ctx.fillRect(x - 5, y - 5, 10, 10);
        ctx.fillStyle = '#fff1bd'; ctx.fillRect(x - 3, y - 3, 6, 6);
      } else {
        ctx.fillStyle = 'rgba(134,191,242,.45)'; ctx.fillRect(x - 5, y - 6, 10, 12);
        ctx.fillStyle = '#e8f5ff'; ctx.fillRect(x - 2, y - 4, 4, 7);
        ctx.fillRect(x - 1, y - 6, 2, 2);
      }
    }
    for (const r of this.rings) {
      ctx.globalAlpha = clamp(r.life / r.total, 0, 1);
      ctx.strokeStyle = r.color; ctx.lineWidth = r.width || 2;
      ctx.beginPath(); ctx.arc(r.x - camX, r.y - camY, r.r, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.options.numbers) {
      ctx.textAlign = 'center'; ctx.font = 'bold 12px ui-monospace, monospace';
      for (const n of this.numbers) {
        ctx.globalAlpha = Math.min(1, n.life * 3);
        ctx.fillStyle = '#07080d'; ctx.fillText(n.text, n.x - camX + 1, n.y - camY + 1);
        ctx.fillStyle = n.color; ctx.fillText(n.text, n.x - camX, n.y - camY);
      }
      ctx.globalAlpha = 1;
    }
    if (!title && ['running', 'paused', 'upgrade'].includes(this.state)) this.drawPointers(ctx, camX, camY);
    this.drawOverlays(ctx, look);
    if (this.pointer) {
      ctx.strokeStyle = 'rgba(241,232,210,.25)'; ctx.fillStyle = 'rgba(241,232,210,.06)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.pointer.start.x, this.pointer.start.y, 40, 0, TAU); ctx.fill(); ctx.stroke();
      const mv = this.movement();
      ctx.fillStyle = 'rgba(255,213,154,.4)';
      ctx.beginPath(); ctx.arc(this.pointer.start.x + mv.x * 30, this.pointer.start.y + mv.y * 30, 13, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  titleCast(items, camX, camY, lights) {
    const sel = this.character;
    const cast = [
      {key: 'lucia', x: -132, y: 36, flip: false},
      {key: 'julian', x: 134, y: 34, flip: true},
      {key: 'matilde', x: -6, y: 98, flip: false}
    ];
    for (const c of cast) {
      const on = c.key === sel;
      const x = c.x - camX, y = c.y - camY;
      items.push({kind: 'cast', key: c.key, x, y, flip: c.flip, on, sortY: y + 22});
      lights.push({x: x + (c.flip ? -6 : 6), y: y - 8, r: on ? 150 : 70, i: on ? 1 : 0.55, c: 'warm', g: on ? 0.45 : 0.15});
    }
    // La Compaña pasa a lo lejos, sin mirar.
    const n = 8, base = ((this.clock * 20 + 1100) % 2600) - 1300;
    for (let i = 0; i < n; i++) {
      const x = base - i * 30 - camX, y = -230 + Math.sin((base - i * 30) * 0.004) * 30 - camY;
      items.push({kind: 'decor', key: 'hermano', x, y, flip: false, sortY: y + 20, alpha: 0.9});
      lights.push({x: x + 4, y: y - 4, r: 46, i: 0.8, c: 'warm', g: 0.5});
    }
    for (let i = 0; i < 5; i++) {
      const a = this.clock * 0.25 + i * TAU / 5, x = Math.cos(a) * 330 - camX, y = Math.sin(a) * 170 + 40 - camY;
      items.push({kind: 'decor', key: 'anima', x, y: y + Math.sin(this.clock * 2 + i) * 5, flip: false, sortY: y + 18});
      lights.push({x, y, r: 44, i: 0.7, c: 'blue', g: 0.7});
    }
  },

  drawItem(ctx, it, lights, layer) {
    const t = this.clock;
    if (it.kind === 'prop') {
      if (layer === 'base') this.cemetery.drawProp(ctx, it, this.wakeLook());
      return;
    }
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
    if (it.kind === 'player') {
      const p = this.player;
      if (layer === 'base') drawShadow(ctx, it.x, it.y + 10, 11);
      if (p.inv > 0 && p.inv < 50 && Math.floor(t * 20) % 2 && layer === 'base') ctx.globalAlpha = 0.55;
      const step = p.moving ? Math.abs(Math.sin(p.walk)) : 0;
      const recoil = this.options.shake && p.attack?.life > 0 ? Math.pow(p.attack.life / p.attack.total, 2) * (p.attack.kind === 'sal' ? 3 : 1.5) : 0;
      const a = p.attack?.a || 0;
      // Al andar levanta un pie y luego el otro; parado, parpadea de vez en cuando.
      const frame = p.moving ? (step > 0.45 ? (Math.floor(p.walk / Math.PI) & 1 ? 'walk2' : 'walk1') : undefined) : (t % 4.3 < 0.13 ? 'blink' : undefined);
      drawSprite(ctx, this.character, it.x - Math.cos(a) * recoil, it.y - 12 - Math.sin(a) * recoil, {scale: 2, flip: p.face < 0, bob: -step * 2, sy: 1 + step * 0.03 - recoil * 0.012, rot: -Math.cos(a) * recoil * 0.012, layer, frame});
      ctx.globalAlpha = 1;
      return;
    }
    if (it.kind === 'corpse') {
      const c = it.c, k = clamp(c.life / c.total, 0, 1);
      if (layer !== 'base') return;
      ctx.save();
      ctx.globalAlpha = k;
      const s = sprite(c.type), sy = c.kneel ? 0.55 + 0.45 * k : 0.35 + 0.65 * k;
      const feet = it.y + ENEMIES[c.type].r * 0.6;
      drawSprite(ctx, c.type, it.x, feet - (s.h * c.scale * sy) / 2, {scale: c.scale, flip: c.flip, sy, sx: c.kneel ? 1 : 1 + (1 - k) * 0.35, layer: 'white'});
      ctx.restore();
      return;
    }
    const e = it.e, d = ENEMIES[e.type], s = sprite(e.type), scale = d.scale * (e.size || 1);
    const flying = e.type === 'anima' || e.type === 'curuxa';
    let bob = flying ? Math.sin(t * (e.type === 'anima' ? 5 : 7) + e.seed) * 4 : Math.sin(t * 6 + e.seed) * 0.7;
    let sx = 1, sy = 1, rot = 0, x = it.x, y = it.y - (s.h * scale) / 2 + e.r * 0.6;
    // Cada criatura se mueve a su manera: unas dan pasos, otras aletean o tiemblan.
    let frame;
    switch (e.type) {
      case 'anima': frame = Math.floor(t * 7 + e.seed) % 2 ? 'flick' : undefined; break;
      case 'hermano': frame = e.blowing ? 'blow' : STEPS[Math.floor(t * 4.5 + e.seed) & 3]; break;
      case 'urco': frame = e.mode === 'lunge' ? 'run1' : e.mode === 'windup' ? 'run2' : e.mode === 'rest' ? undefined : RUN[Math.floor(t * 9 + e.seed) & 3]; break;
      case 'curuxa': frame = Math.floor(t * (e.mode === 'swoop' ? 14 : 8) + e.seed) % 2 ? 'down' : undefined; break;
      case 'ahogado': frame = STEPS[Math.floor(t * 3 + e.seed) & 3]; break;
      case 'planidera': frame = e.mode === 'cry' ? (Math.floor(t * 10) % 2 ? 'cry' : undefined) : STEPS[Math.floor(t * 4 + e.seed) & 3]; break;
      case 'espantajo': frame = e.mode === 'swing' || Math.floor(t * 2.5 + e.seed) % 3 === 0 ? 'rustle' : undefined; break;
      case 'guia': frame = Math.floor(t * 3) % 2 ? 'step1' : undefined; break;
      default: break;
    }
    if (e.type === 'urco') {
      if (e.mode === 'windup') { sy = 0.86; sx = 1.1; x += Math.sin(t * 60) * 1.5; }
      else if (e.mode === 'lunge') { sx = 1.18; sy = 0.92; }
      else bob = Math.abs(Math.sin(t * 9 + e.seed)) * -2;
    }
    if (e.type === 'hermano') rot = Math.sin(t * 3 + e.seed) * 0.03;
    if (e.type === 'ahogado') rot = Math.sin(t * 2 + e.seed) * 0.06;
    if (e.type === 'planidera' && e.mode === 'cry') x += Math.sin(t * 40) * 1.2;
    if (e.type === 'espantajo') { rot = Math.sin(t * 1.6 + e.seed) * 0.05; if (e.mode === 'swing') rot = Math.sin(t * 30) * 0.12; }
    if (e.type === 'guia') { bob = Math.sin(t * 2) * 1.5; if (e.stun > 0) x += Math.sin(t * 50) * 2; }
    let alpha = 1;
    if (e.dissolve) alpha = clamp(e.dissolveT / 1.2, 0, 1);
    if (e.rising > 0) {
      // Sale del charco: asoma de abajo arriba.
      const k = clamp(1 - e.rising / 0.7, 0.12, 1);
      y += s.h * scale * (1 - k) / 2; sy *= k;
    }
    if (e.blowing) rot = (e.flip ? -1 : 1) * 0.2;
    // El golpe se nota: la criatura se encoge un instante.
    if (e.hit > 0 && e.type !== 'guia') { const k = Math.min(1, e.hit / 0.09); sx *= 1 + 0.14 * k; sy *= 1 - 0.1 * k; }
    if (layer === 'base') {
      if (!flying) drawShadow(ctx, it.x, it.y + e.r * 0.6 + 4, s.w * scale * 0.33);
      else drawShadow(ctx, it.x, it.y + 18, 8, 0.25);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSprite(ctx, e.type, x, y, {scale, flip: e.flip, bob, sx, sy, rot, frame});
      // A la Guía le llueven golpes: un destello suave para que se la siga viendo.
      if (e.hit > 0) { ctx.globalAlpha = alpha * (e.type === 'guia' ? 0.28 : 0.85); drawSprite(ctx, e.type, x, y, {scale, flip: e.flip, bob, sx, sy, rot, frame, layer: 'white'}); }
      ctx.restore();
      if (lights) {
        if (e.type === 'hermano') lights.push({x: x + (e.flip ? -7 : 7), y: y - 4 + bob, r: e.carry ? 110 : 56, i: e.carry ? 1 : 0.85 * alpha, c: 'warm', g: e.carry ? 0.9 : 0.55});
        else if (e.type === 'anima') lights.push({x, y: y + bob, r: 48, i: 0.75 * alpha, c: 'blue', g: 0.75});
        else if (e.type === 'guia') lights.push({x: x + (e.flip ? -26 : 26), y: y + bob - 6, r: 170, i: 1, c: 'warm', g: 0.7});
        else if (e.type === 'planidera' && e.mode === 'cry') lights.push({x, y: y - 10, r: 40, i: 0.6, c: 'blue', g: 0.6});
        // A los difuntos con nombre se les ve venir.
        if (e.elite) lights.push({x, y: y + bob, r: 96 + Math.sin(t * 3 + e.seed) * 8, i: 0.8 * alpha, c: e.type === 'hermano' ? 'warm' : 'pale', g: 0.8});
      }
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawSprite(ctx, e.type, x, y, {scale, flip: e.flip, bob, sx, sy, rot, frame, layer: 'glow'});
      ctx.restore();
    }
  },

  drawTelegraphs(ctx, camX, camY) {
    const t = this.clock;
    ctx.save();
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const x = e.x - camX, y = e.y - camY;
      if (e.type === 'urco' && e.mode === 'windup') {
        ctx.strokeStyle = `rgba(255,78,58,${0.45 + Math.sin(t * 20) * 0.2})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        const L = e.speed * 4.4 * 0.42;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.lock) * L, y + Math.sin(e.lock) * L); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.type === 'curuxa' && e.mode === 'windup') {
        ctx.strokeStyle = `rgba(255,212,71,${0.4 + Math.sin(t * 24) * 0.2})`; ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
        const L = e.speed * 3.8 * 0.55;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(e.lock) * L, y + Math.sin(e.lock) * L); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (e.type === 'espantajo' && e.mode === 'swing') {
        const k = 1 - e.modeT / 0.85;
        ctx.strokeStyle = 'rgba(214,180,102,.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(x, y + 6, 92, 92 * 0.75, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(214,180,102,${0.08 + k * 0.14})`;
        ctx.beginPath(); ctx.ellipse(x, y + 6, 92 * k, 92 * 0.75 * k, 0, 0, TAU); ctx.fill();
      }
    }
    for (const h of this.hazards) {
      const x = h.x - camX, y = h.y - camY, k = 1 - h.t / h.total;
      ctx.strokeStyle = `rgba(207,232,255,${0.5 + k * 0.4})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, h.r, h.r * 0.8, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = `rgba(207,232,255,${0.08 + k * 0.2})`;
      ctx.beginPath(); ctx.ellipse(x, y, h.r * k, h.r * 0.8 * k, 0, 0, TAU); ctx.fill();
      // el frasco cae
      const fx = lerp(h.fromX - camX, x, k), fy = lerp(h.fromY - camY, y, k) - Math.sin(k * Math.PI) * 120;
      ctx.fillStyle = '#e8f5ff'; ctx.fillRect(Math.round(fx - 2), Math.round(fy - 3), 4, 6);
    }
    for (const m of this.marks) {
      const x = Math.round(m.x - camX), y = Math.round(m.y - camY), k = 1 - m.t / m.total;
      ctx.fillStyle = `rgba(255,176,74,${0.3 + k * 0.5})`; ctx.fillRect(x - 2, y - 6 - k * 4, 4, 6 + k * 4);
      ctx.fillStyle = '#fff1bd'; ctx.fillRect(x - 1, y - 3 - k * 3, 2, 3);
    }
    // Los charcos se adivinan también fuera de la luz.
    for (const q of this.pools) {
      const grow = Math.min(1, q.t / 1.2), a = grow * Math.min(1, (q.life - q.t) / 1.5), rx = q.r * (0.3 + 0.7 * grow);
      ctx.strokeStyle = `rgba(127,179,196,${0.26 * a})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(q.x - camX, q.y - camY, rx, rx * 0.7, 0, 0, TAU); ctx.stroke();
    }
    // Los cirios: el que está apagado se deja ver; encender y apagar llevan su cuenta.
    if (this.state !== 'ready' && this.state !== 'ended') for (const c of this.cirios) {
      const x = Math.round(c.x - camX), y = Math.round(c.y - 56 - camY);
      if (!c.lit) {
        const pulse = 0.35 + 0.25 * Math.sin(t * 5 + c.i);
        ctx.strokeStyle = `rgba(190,224,242,${pulse})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 13, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(255,116,46,${0.5 + pulse * 0.5})`; ctx.fillRect(x - 1, y - 1, 2, 2);
        if (c.relight > 0) {
          ctx.strokeStyle = '#ffd59a'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, 13, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c.relight, 0, 1)); ctx.stroke();
        }
      } else if (c.snuff > 0.03) {
        ctx.strokeStyle = 'rgba(159,180,216,.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y - 4, 14, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(c.snuff, 0, 1)); ctx.stroke();
      }
    }
    // El arrullo: el corro hasta donde llega la nana.
    if (this.lull > 0) {
      const p = this.player, k = clamp(this.lull / 4, 0, 1);
      ctx.strokeStyle = `rgba(243,227,192,${0.1 + 0.16 * k})`; ctx.lineWidth = 2; ctx.setLineDash([3, 9]);
      ctx.lineDashOffset = -t * 14;
      ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, this.lullR, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      for (const e of this.enemies) {
        if (!e.lulled || e.hp <= 0 || e.dissolve) continue;
        const x = Math.round(e.x - camX + Math.sin(t * 3 + e.seed) * 4), y = Math.round(e.y - camY - e.r - 20 - ((t * 14 + e.seed * 9) % 12));
        ctx.fillStyle = 'rgba(243,227,192,.8)'; ctx.fillRect(x, y, 2, 2); ctx.fillRect(x + 2, y - 3, 1, 4);
      }
    }
    // Los difuntos con nombre llevan el suyo encima.
    for (const e of this.enemies) {
      if (!e.elite || e.hp <= 0 || e.dissolve) continue;
      const x = clamp(Math.round(e.x - camX), 70, this.width - 70), y = Math.max(34, Math.round(e.y - camY - e.r * 2.6 - 26)), k = clamp(e.hp / e.maxHp, 0, 1);
      // Fuera de la vista ya lo señala su flecha.
      if (e.x - camX < 30 || e.x - camX > this.width - 30 || e.y - camY < 30 || e.y - camY > this.height - 30) continue;
      ctx.font = `600 ${Math.round(13 / (this.zoom || 1) + 2)}px Alegreya, Georgia, serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(7,8,12,.85)'; ctx.fillText(ELITES[e.elite].name, x + 1, y + 1);
      ctx.fillStyle = '#ffe2c8'; ctx.fillText(ELITES[e.elite].name, x, y);
      ctx.fillStyle = 'rgba(7,8,12,.8)'; ctx.fillRect(x - 31, y + 5, 62, 5);
      ctx.fillStyle = '#e0763a'; ctx.fillRect(x - 30, y + 6, Math.round(60 * k), 3);
    }
    ctx.restore();
  },

  /* Los charcos de la marea, a ras de suelo. */
  drawPools(ctx, camX, camY) {
    if (!this.pools.length) return;
    const t = this.clock, w = this.width, h = this.height;
    ctx.save();
    for (const q of this.pools) {
      const x = Math.round(q.x - camX), y = Math.round(q.y - camY);
      if (x < -90 || x > w + 90 || y < -70 || y > h + 70) continue;
      const grow = Math.min(1, q.t / 1.2), a = grow * Math.min(1, (q.life - q.t) / 1.5);
      const rx = q.r * (0.3 + 0.7 * grow), ry = rx * 0.7;
      ctx.fillStyle = `rgba(8,20,34,${0.8 * a})`;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(127,179,196,${0.4 * a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.45 + q.seed + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(150,196,214,${(1 - k) * 0.32 * a})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, rx * k, ry * k, 0, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = `rgba(190,224,242,${0.5 * a})`;
      for (let i = 0; i < 3; i++) {
        const gx = Math.sin(t * 0.7 + q.seed * 3 + i * 2.1) * rx * 0.55, gy = Math.cos(t * 0.5 + q.seed + i * 1.7) * ry * 0.5;
        ctx.fillRect(Math.round(x + gx), Math.round(y + gy), 4, 1);
      }
      if (q.rise && !q.done) {
        // Algo sube: burbujas antes de que asome.
        ctx.fillStyle = `rgba(207,232,255,${0.5 + 0.4 * Math.sin(t * 18)})`;
        for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x + Math.sin(t * 9 + i * 1.9) * 9), Math.round(y - ((t * 30 + i * 5) % 10)), 2, 2);
      }
    }
    ctx.restore();
  },

  /* Flechas hacia lo que importa cuando queda fuera de la vista: Amparo, la Guía, la procesión, un difunto, su recordatorio. */
  drawPointers(ctx, camX, camY) {
    const w = this.width, h = this.height;
    const arrow = (wx, wy, color, label) => {
      const x = wx - camX, y = wy - camY;
      if (x > 30 && x < w - 30 && y > 30 && y < h - 30) return;
      const cx = w / 2, cy = h / 2, a = Math.atan2(y - cy, x - cx);
      const m = 26, sx = clamp(cx + Math.cos(a) * (w / 2), m, w - m), sy = clamp(cy + Math.sin(a) * (h / 2), m, h - m);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(a);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -7); ctx.lineTo(-3, 0); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.font = `600 ${Math.round(12 / (this.zoom || 1))}px Alegreya Sans, system-ui, sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = color;
      const lx = clamp(sx - Math.cos(a) * 26, 40, w - 40), ly = clamp(sy - Math.sin(a) * 20, 20, h - 14);
      ctx.fillText(label, lx, ly + 4);
      ctx.restore();
    };
    const lit = this.litCount(), blink = 0.75 + 0.25 * Math.sin(this.clock * 9);
    arrow(COFFIN.x, COFFIN.y, lit === 4 ? 'rgba(255,213,154,.85)' : lit > 0 ? 'rgba(255,170,110,.95)' : `rgba(255,96,80,${blink})`, lit === 0 ? VIGIL_TEXT.wakeDark : VIGIL_TEXT.wake);
    if (this.boss && this.boss.hp > 0) arrow(this.boss.x, this.boss.y, 'rgba(255,120,90,.95)', BOSS.name);
    const head = this.boss ? null : this.processionHead();
    if (head && Math.hypot(head.x - COFFIN.x, head.y - COFFIN.y) < 1100) arrow(head.x, head.y, 'rgba(232,214,255,.9)', VIGIL_TEXT.procession);
    const elite = this.eliteAlive;
    if (elite && elite.hp > 0 && !elite.proc) arrow(elite.x, elite.y, 'rgba(255,226,200,.95)', ELITES[elite.elite].name);
    for (const g of this.gems) if (g.card) arrow(g.x, g.y, 'rgba(255,241,189,.95)', VIGIL_TEXT.card[0]);
  },

  drawOverlays(ctx, look) {
    const w = this.width, h = this.height;
    const p = this.player;
    // Viñeta
    if (!this.vignette || this.vignette.w !== w || this.vignette.h !== h) {
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
      this.vignette = {w, h, g: v};
    }
    ctx.fillStyle = this.vignette.g; ctx.fillRect(0, 0, w, h);
    // Poca vida: el borde late en rojo
    if (['running', 'paused', 'upgrade'].includes(this.state)) {
      const low = 1 - p.hp / this.st.maxHp;
      if (low > 0.62) {
        const k = (low - 0.62) / 0.38 * (this.options.flashes ? 0.6 + Math.sin(this.clock * 6) * 0.25 : 0.6);
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
        g.addColorStop(0, 'rgba(90,0,0,0)'); g.addColorStop(1, `rgba(110,10,8,${0.5 * k})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
    }
    // El alba entra por el este: rosa y oro sobre la piedra fría
    if (look.warm > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const R = Math.max(w, h) * 1.05;
      const g = ctx.createRadialGradient(w * 1.02, -h * 0.08, 0, w * 1.02, -h * 0.08, R);
      g.addColorStop(0, `rgba(255,178,110,${0.36 * look.warm})`);
      g.addColorStop(0.35, `rgba(214,120,120,${0.16 * look.warm})`);
      g.addColorStop(0.75, `rgba(90,80,150,${0.06 * look.warm})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    if (this.flash > 0.01 && this.options.flashes) {
      ctx.fillStyle = `rgba(${this.flashColor},${this.flash * 0.6})`;
      ctx.fillRect(0, 0, w, h);
    }
  },
};
