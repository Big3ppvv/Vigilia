/*
 * Lo que se ve un instante y se va: partículas, anillos, números y la manera
 * de deshacerse de cada criatura. Aquí nada hiere ni cura.
 */
import { SceneEffects } from './scene-fx.js';
import { TAU, rand } from './util.js';
import { surfaceAt } from './world.js';

const MAX_PARTICLES = 420;

export const fxMethods = {
  /*
   * Una partícula: x, y, vx, vy, life, size, color. Opcionales: glow (se ve en
   * la oscuridad), grav, drag (frena), sway (se mece al caer, como una pluma).
   */
  particle(o) {
    if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
    o.total = o.life;
    this.particles.push(o);
  },

  updateFx(dt) {
    if (!this.sceneFx) this.sceneFx = new SceneEffects();
    this.sceneFx.update(dt, this);
    this.combatFx.update(dt);
    this.ambient.update(dt);
    if (this.player.attack) this.player.attack.life = Math.max(0, this.player.attack.life - dt);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const q of this.particles) {
      q.life -= dt;
      if (q.drag) { const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy *= k; }
      if (q.grav) q.vy += q.grav * dt;
      q.x += q.vx * dt + (q.sway ? Math.sin((q.total - q.life) * 5 + q.sway) * 26 * dt : 0);
      q.y += q.vy * dt;
    }
    this.particles = this.particles.filter(q => q.life > 0);
    for (const r of this.rings) { r.life -= dt; r.r += (r.max - r.r) * (1 - Math.exp(-dt * 10)); }
    this.rings = this.rings.filter(r => r.life > 0);
    for (const n of this.numbers) { n.life -= dt; n.y -= 24 * dt; }
    this.numbers = this.numbers.filter(n => n.life > 0);
    for (const c of this.corpses) c.life -= dt;
    this.corpses = this.corpses.filter(c => c.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter(g => g.life > 0);
  },

  /* Cada criatura se deshace a su manera y deja su huella en el suelo. */
  deathFx(e) {
    const x = e.x, y = e.y, big = e.elite ? 2 : 1;
    this.combatFx.emit('death', x, y - 6, {
      radius: e.elite ? 65 : 22, tone: ['anima', 'ahogado', 'planidera'].includes(e.type) ? 'salt' : 'ember'
    });
    const many = (n, make) => { for (let i = 0; i < n * big; i++) this.particle(make(i)); };
    switch (e.type) {
      case 'hermano':
        // El hábito se viene abajo y la llama de su vela sube sola un momento.
        many(7, i => ({x: x + rand(-8, 8), y: y - rand(0, 16), vx: rand(-34, 34), vy: rand(-50, -10), life: rand(0.6, 1.1), size: 3, color: i % 2 ? '#463f56' : '#2e2a38', grav: 120, drag: 1.5}));
        this.particle({x: x + (e.flip ? -7 : 7), y: y - 8, vx: 0, vy: -26, life: 1.1, size: 3, color: '#ffb04a', glow: true, sway: 1});
        this.particle({x: x + (e.flip ? -7 : 7), y: y - 10, vx: 0, vy: -26, life: 0.9, size: 2, color: '#fff1bd', glow: true, sway: 1});
        this.ambient.decal(Math.random() < 0.5 ? 'wax' : 'cloth', x, y + 10);
        break;
      case 'anima':
        // Se parte en hilos de luz que suben culebreando.
        many(4, i => ({x: x + rand(-4, 4), y: y - 4, vx: rand(-16, 16), vy: rand(-80, -50), life: rand(0.6, 1), size: 3, color: i % 2 ? '#e8f5ff' : '#86bff2', glow: true, sway: i + 1}));
        many(6, () => ({x, y, vx: rand(-90, 90), vy: rand(-90, 60), life: 0.4, size: 2, color: '#a8d4ff', glow: true, drag: 3}));
        break;
      case 'ahogado':
        many(12, () => ({x, y, vx: rand(-110, 110), vy: rand(-150, -20), life: 0.6, size: 2, color: '#7fb3c4', grav: 420}));
        this.rings.push({x, y: y + 8, r: 6, max: 34, life: 0.45, total: 0.45, color: '#7fb3c4', width: 2});
        this.ambient.decal('wet', x, y + 10, 12);
        break;
      case 'espantajo':
        many(18, i => ({x, y: y - 10, vx: rand(-150, 150), vy: rand(-170, 20), life: rand(0.6, 1.1), size: 2, color: i % 2 ? '#d6b466' : '#9a7a3a', grav: 300, drag: 1}));
        this.particle({x, y: y - 40, vx: rand(-60, 60), vy: -150, life: 1.1, size: 6, color: '#7a5434', grav: 320});
        this.ambient.decal('straw', x, y + 12, 14);
        break;
      case 'curuxa':
        // Plumas que bajan meciéndose.
        many(8, i => ({x: x + rand(-8, 8), y: y + rand(-6, 6), vx: rand(-40, 40), vy: rand(-50, 10), life: rand(1, 1.6), size: 2, color: i % 2 ? '#e6dabd' : '#9e8664', grav: 46, drag: 2, sway: i + 1}));
        this.ambient.decal('feather', x, y + 14);
        break;
      case 'planidera':
        many(8, () => ({x, y: y - 6, vx: rand(-70, 70), vy: rand(-110, -10), life: 0.7, size: 2, color: '#86bff2', glow: true, grav: 260}));
        many(4, i => ({x: x + rand(-8, 8), y: y - rand(0, 14), vx: rand(-26, 26), vy: rand(-40, -10), life: 0.9, size: 3, color: i % 2 ? '#30313f' : '#1d1d27', grav: 100, drag: 1.5}));
        this.ambient.decal('cloth', x, y + 10);
        break;
      case 'urco':
        // Humo negro y eslabones de la cadena.
        many(7, () => ({x: x + rand(-10, 10), y: y + rand(-6, 4), vx: rand(-40, 40), vy: rand(-60, -14), life: rand(0.6, 1), size: 4, color: '#14141a', drag: 2}));
        many(4, () => ({x, y, vx: rand(-90, 90), vy: rand(-130, -30), life: 0.7, size: 2, color: '#9aa6ae', grav: 420}));
        this.ambient.decal('ash', x, y + 10);
        break;
      default: break;
    }
  },

  /* Pisadas: polvo en la grava y ondas en los charcos. Devuelve lo que se pisa, para el sonido. */
  footstep() {
    const p = this.player, surface = this.inPool ? 'agua' : surfaceAt(p.x, p.y + 10);
    if (surface === 'agua') this.rings.push({x: p.x, y: p.y + 12, r: 3, max: 16, life: 0.35, total: 0.35, color: 'rgba(150,196,214,.8)', width: 1});
    else if (surface === 'grava') for (let i = 0; i < 2; i++) this.particle({x: p.x + rand(-4, 4), y: p.y + 11, vx: rand(-14, 14), vy: rand(-18, -6), life: 0.3, size: 2, color: '#5a574c'});
    this.audio.sfx('paso', {surface});
    return surface;
  },

  /* El destello circular de elegir un recuerdo, subir de rincón o levantarse. */
  burst(x, y, n, color, speed = 110) {
    for (let i = 0; i < n; i++) { const a = i / n * TAU; this.particle({x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.6, size: 2, color, glow: true}); }
  }
};
