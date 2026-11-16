/*
 * Lo que se ve un instante y se va: partículas, anillos, números de daño,
 * fogonazos de luz, estelas de la esquiva y la manera de deshacerse de cada
 * criatura. Aquí nada hiere ni cura.
 */
import { TAU, rand } from './util.js';

const MAX_PARTICLES = 520;
const MAX_NUMBERS = 90;
const MAX_FLASHES = 48;

export const fxMethods = {
  /*
   * Una partícula: x, y, vx, vy, life, size, color. Opcionales: glow (brilla
   * sobre la oscuridad), grav, drag (frena), sway (se mece al caer).
   */
  particle(o) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.splice(0, 20);
    o.total = o.life;
    this.particles.push(o);
  },

  updateFx(dt) {
    this.combatFx.update(dt);
    this.ambient.update(dt);
    this.shake = Math.max(0, this.shake - dt * 24);
    this.flash = Math.max(0, this.flash - dt * 2.6);
    this.zoomPunch = Math.max(0, this.zoomPunch - dt * 0.25);
    this.pickupComboT = Math.max(0, (this.pickupComboT || 0) - dt);
    this.ceraFlash = Math.max(0, (this.ceraFlash || 0) - dt * 4);
    for (const q of this.particles) {
      q.life -= dt;
      if (q.drag) { const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy *= k; }
      if (q.grav) q.vy += q.grav * dt;
      q.x += q.vx * dt + (q.sway ? Math.sin((q.total - q.life) * 5 + q.sway) * 26 * dt : 0);
      q.y += q.vy * dt;
    }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.max - r.r) * (1 - Math.exp(-dt * 12)); }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const n of this.numbers) { n.life -= dt; n.x += n.vx * dt; n.y += n.vy * dt; n.vy += 160 * dt; n.vx *= Math.exp(-dt * 4); }
    this.numbers = this.numbers.filter(n => n.life > 0);
    for (const f of this.flashes) f.life -= dt;
    this.flashes = this.flashes.filter(f => f.life > 0);
    if (this.flashes.length > MAX_FLASHES) this.flashes.splice(0, this.flashes.length - MAX_FLASHES);
    for (const c of this.corpses) c.life -= dt;
    this.corpses = this.corpses.filter(c => c.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter(g => g.life > 0);
  },

  /* Números de daño: saltan, caen un poco y se van. Los críticos, más grandes y dorados. */
  damageNumber(x, y, value, crit = false, burn = false, small = false, player = false) {
    if (!this.options.numbers && !player) return;
    if (this.numbers.length >= MAX_NUMBERS) this.numbers.shift();
    const text = player ? `−${value}` : String(value);
    const color = player ? '#ff6b5e' : crit ? '#ffd447' : burn ? '#ff9a4a' : small ? '#cfe8ff' : '#f6f2ea';
    this.numbers.push({x: x + rand(-6, 6), y, vx: rand(-40, 40), vy: rand(-150, -110), text, color, size: player ? 15 : crit ? 15 : small || burn ? 9 : 11,
      life: crit || player ? 0.85 : 0.6, total: crit || player ? 0.85 : 0.6, pop: crit || player});
  },

  /* Un rótulo corto sobre la escena: «¡Recuerdas algo!», «Esquivas». */
  floatText(x, y, text, color = '#fff1bd', life = 1, big = false) {
    if (this.numbers.length >= MAX_NUMBERS) this.numbers.shift();
    this.numbers.push({x, y, vx: 0, vy: -70, text, color, size: big ? 14 : 11, life, total: life, pop: true, label: true});
  },

  /* Cada criatura se deshace a su manera. quiet: al acabar la ronda, sin luz de golpe. */
  deathFx(e, quiet = false) {
    const x = e.x, y = e.y, big = e.elite ? 2.2 : e.type === 'guia' ? 3 : 1;
    const many = (n, make) => { for (let i = 0; i < n * big; i++) this.particle(make(i)); };
    const palette = {
      anima: ['#e8f5ff', '#86bff2'], hermano: ['#463f56', '#ffb04a'], urco: ['#14141a', '#9aa6ae'], curuxa: ['#e6dabd', '#9e8664'],
      planidera: ['#86bff2', '#30313f'], ahogado: ['#7fb3c4', '#c9bb9a'], trasno: ['#9ed36a', '#ffd447'], lavandeira: ['#d9e6ff', '#eef8ff'],
      espantajo: ['#d6b466', '#7a5434'], nubeiro: ['#b4c2ff', '#e8f5ff'], lobishome: ['#5a4a3a', '#a8968a'], guia: ['#fff1bd', '#c9a04c']
    }[e.type] || ['#c9c2b8', '#8a8f99'];
    many(quiet ? 4 : 9, i => ({x: x + rand(-6, 6), y: y - rand(2, 14), vx: rand(-150, 150), vy: rand(-190, -20), life: rand(0.35, 0.7), size: rand(2, 4), color: palette[i % 2], glow: i % 3 === 0, grav: 380, drag: 1}));
    if (!quiet) {
      this.flashes.push({x, y: y - 8, r: 70 * Math.min(2, big), life: 0.12, total: 0.12, c: e.type === 'anima' || e.type === 'lavandeira' || e.type === 'nubeiro' ? 'blue' : 'warm'});
      this.combatFx.emit('pop', x, y - 6, {radius: e.r * 1.6 * Math.min(2, big), tone: e.type === 'anima' || e.type === 'lavandeira' ? 'salt' : 'ember'});
    }
    switch (e.type) {
      case 'hermano':
        this.particle({x: x + (e.flip ? -7 : 7), y: y - 8, vx: 0, vy: -26, life: 1.1, size: 3, color: '#ffb04a', glow: true, sway: 1});
        this.ambient.decal(Math.random() < 0.5 ? 'wax' : 'cloth', x, y + 10);
        break;
      case 'anima':
        many(3, i => ({x: x + rand(-4, 4), y: y - 4, vx: rand(-16, 16), vy: rand(-80, -50), life: rand(0.6, 1), size: 3, color: i % 2 ? '#e8f5ff' : '#86bff2', glow: true, sway: i + 1}));
        break;
      case 'ahogado':
        this.rings.push({x, y: y + 8, r: 6, max: 34 * big, life: 0.45, total: 0.45, color: '#7fb3c4', width: 2});
        this.ambient.decal('wet', x, y + 10, 10);
        break;
      case 'espantajo':
        many(10, i => ({x, y: y - 10, vx: rand(-150, 150), vy: rand(-170, 20), life: rand(0.6, 1.1), size: 2, color: i % 2 ? '#d6b466' : '#9a7a3a', grav: 300, drag: 1}));
        this.ambient.decal('straw', x, y + 12, 12);
        if (!quiet && this.options.shake) this.shake = Math.max(this.shake, 4);
        break;
      case 'curuxa':
        many(6, i => ({x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-40, 40), vy: rand(-50, 10), life: rand(1, 1.6), size: 2, color: i % 2 ? '#e6dabd' : '#9e8664', grav: 46, drag: 2, sway: i + 1}));
        this.ambient.decal('feather', x, y + 14);
        break;
      case 'urco': case 'lobishome':
        many(6, () => ({x: x + rand(-10, 10), y: y + rand(-6, 4), vx: rand(-40, 40), vy: rand(-60, -14), life: rand(0.6, 1), size: 4, color: '#14141a', drag: 2}));
        this.ambient.decal('ash', x, y + 10);
        break;
      case 'trasno':
        if (e.stolen > 0) many(4, () => ({x, y: y - 6, vx: rand(-120, 120), vy: rand(-200, -80), life: 0.6, size: 3, color: '#ffd447', glow: true, grav: 420}));
        break;
      default: break;
    }
    if (!quiet && (e.elite || e.type === 'guia')) {
      this.flashes.push({x, y: y - 10, r: 320, life: 0.4, total: 0.4, c: 'white'});
      for (let i = 0; i < 28; i++) this.particle({x, y: y - 12, vx: rand(-200, 200), vy: rand(-240, 40), life: rand(0.6, 1.3), size: rand(2, 4), color: i % 3 ? '#fff1bd' : '#ffb04a', glow: true, grav: 80});
    }
    this.corpses.push({type: e.type, x, y, flip: e.flip, life: 0.22, total: 0.22, scale: 2 * (e.size || 1)});
  },

  /* Pisadas: un poco de polvo y el sonido de la piedra o la hierba. */
  footstep() {
    const p = this.player;
    const surface = this.wading < 1 ? 'agua' : this.arena.surfaceAt(p.x, p.y + 10);
    if (surface === 'agua') this.rings.push({x: p.x, y: p.y + 12, r: 3, max: 16, life: 0.35, total: 0.35, color: 'rgba(150,196,214,.8)', width: 1});
    else for (let i = 0; i < 2; i++) this.particle({x: p.x + rand(-4, 4), y: p.y + 11, vx: rand(-18, 18) - p.vx * 0.05, vy: rand(-18, -6), life: 0.3, size: 2, color: surface === 'hierba' ? '#2c3d33' : '#5a574c'});
    this.audio.sfx('paso', {surface});
    return surface;
  },

  /* El destello circular de subir de nivel, levantarse o liberar a la Guía. */
  burst(x, y, n, color, speed = 110) {
    for (let i = 0; i < n; i++) { const a = i / n * TAU; this.particle({x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.6, size: 2, color, glow: true, drag: 1.5}); }
  }
};
