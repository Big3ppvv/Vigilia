/*
 * Partículas, anillos y números: lo que se ve un instante y se va.
 */


export const fxMethods = {
  particle(o) {
    if (this.particles.length >= 420) this.particles.shift();
    o.total = o.life;
    this.particles.push(o);
  },

  updateFx(dt) {
    this.combatFx.update(dt);
    if (this.player.attack) this.player.attack.life = Math.max(0, this.player.attack.life - dt);
    this.shake = Math.max(0, this.shake - dt * 22);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.grav) q.vy += q.grav * dt; }
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
};
