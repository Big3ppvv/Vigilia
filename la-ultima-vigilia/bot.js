/*
 * Piloto automático para las pruebas. bot = 1 juega con reflejos; bot = 2, como quien vela por primera vez.
 */


export const botMethods = {
  botMove() {
    const p = this.player;
    // bot = 2 imita a alguien que juega por primera vez: reacciona tarde y esquiva a medias.
    const sloppy = this.bot === 2;
    if (sloppy && this.botMemo && this.clock - this.botMemo.at < 0.28) return this.botMemo.mv;
    let fx = 0, fy = 0;
    const sense = sloppy ? 95 : 150;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
      if (d2 < sense * sense) {
        const d = Math.sqrt(d2) || 1, near = d < 70 + e.r ? 6 : 1;
        const w = (e.type === 'guia' ? 2 : 1) * near * 1600 / (d2 + 300);
        fx += dx / d * w; fy += dy / d * w;
      }
    }
    for (const s of this.enemyShots) {
      const dx = p.x - s.x, dy = p.y - s.y, d2 = dx * dx + dy * dy;
      if (d2 < 110 * 110) { const d = Math.sqrt(d2) || 1; fx += dx / d * 3000 / (d2 + 200); fy += dy / d * 3000 / (d2 + 200); }
    }
    for (const h of this.hazards) {
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (d < h.r + 30) { fx += dx / d * 4; fy += dy / d * 4; }
    }
    // Da vueltas alrededor del velatorio; cuando llega la Guía, va a por ella.
    let tx, ty;
    if (this.boss && this.boss.hp > 0) {
      const a = Math.atan2(p.y - this.boss.y, p.x - this.boss.x) + 0.6;
      tx = this.boss.x + Math.cos(a) * 120; ty = this.boss.y + Math.sin(a) * 120;
    } else {
      const a = Math.atan2(p.y, p.x) + 0.5;
      tx = Math.cos(a) * 260; ty = Math.sin(a) * 260;
      let best = null, bd = 160 * 160;
      for (const g of this.gems) { const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d < bd) { bd = d; best = g; } }
      if (best) { tx = best.x; ty = best.y; }
    }
    const gx = tx - p.x, gy = ty - p.y, gd = Math.hypot(gx, gy) || 1;
    fx += gx / gd * 0.9; fy += gy / gd * 0.9;
    const len = Math.hypot(fx, fy);
    if (this.dashCd === 0 && this.dashTime <= 0 && this.state === 'running' && (!sloppy || Math.random() < 0.3)) {
      const close = this.enemies.some(e => e.hp > 0 && !e.dissolve && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 22);
      if (close && len > 0.01) { this.dashDir = {x: fx / len, y: fy / len}; this.dashTime = 0.24; this.dashCd = this.st.dashCd; p.inv = Math.max(p.inv, 0.5); }
    }
    const mv = len > 0.05 ? {x: fx / len, y: fy / len} : {x: 0, y: 0};
    if (sloppy) this.botMemo = {at: this.clock, mv};
    return mv;
  },
};
