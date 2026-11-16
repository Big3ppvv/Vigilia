/*
 * Piloto automático para las pruebas. bot = 1 juega con reflejos y cuida el
 * velatorio; bot = 2 imita a quien vela por primera vez: reacciona tarde,
 * esquiva a medias y tarda en darse cuenta de que le han apagado los cirios.
 */
import { COFFIN } from './balance.js';

export const botMethods = {
  botMove() {
    const p = this.player;
    const sloppy = this.bot === 2;
    if (sloppy && this.botMemo && this.clock - this.botMemo.at < 0.28) return this.botMemo.mv;
    let fx = 0, fy = 0, crowd = 0;
    const sense = sloppy ? 95 : 150;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d2 = dx * dx + dy * dy;
      if (d2 < 130 * 130) crowd++;
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
    if (!sloppy) for (const q of this.pools) {
      const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy) || 1;
      if (d < q.r + 26) { fx += dx / d * 1.6; fy += dy / d * 1.6; }
    }

    // Qué quiere: encender lo apagado, parar a la Guía o a la procesión, y si no, rondar el velatorio.
    const out = this.cirios.filter(c => !c.lit);
    const tend = out.length > 0 && (!sloppy || out.length >= 2 || this.soul > 0.2);
    const boss = this.boss && this.boss.hp > 0 ? this.boss : null;
    let tx, ty, pull = 0.9;
    if (tend) {
      let c = out[0];
      for (const o of out) if (Math.hypot(o.x - p.x, o.y - p.y) < Math.hypot(c.x - p.x, c.y - p.y)) c = o;
      tx = c.x + (p.x < c.x ? -14 : 14); ty = c.y + 14;
      pull = sloppy ? 1.6 : 2.8;
    } else if (boss) {
      const a = Math.atan2(p.y - boss.y, p.x - boss.x) + 0.6;
      tx = boss.x + Math.cos(a) * 120; ty = boss.y + Math.sin(a) * 120;
    } else {
      const card = this.gems.find(g => g.card);
      let head = null, hd = 720;
      if (!sloppy) for (const e of this.enemies) {
        if (!e.proc || e.hp <= 0 || e.dissolve || (e.leader && e.leader.hp > 0)) continue;
        const d = Math.hypot(e.x - COFFIN.x, e.y - COFFIN.y);
        if (d < hd) { hd = d; head = e; }
      }
      if (card && (!head || hd > 300)) { tx = card.x; ty = card.y; pull = 1.4; }
      else if (head) {
        // Se planta entre la procesión y los cirios.
        const a = Math.atan2(head.y - COFFIN.y, head.x - COFFIN.x), r = Math.max(110, Math.min(250, hd - 140));
        tx = COFFIN.x + Math.cos(a) * r; ty = COFFIN.y + Math.sin(a) * r; pull = 1.3;
      } else {
        const a = Math.atan2(p.y - COFFIN.y, p.x - COFFIN.x) + 0.5, r = sloppy ? 290 : 230;
        tx = COFFIN.x + Math.cos(a) * r; ty = COFFIN.y + Math.sin(a) * r;
        let best = null, bd = 160 * 160;
        for (const g of this.gems) { const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2; if (d < bd) { bd = d; best = g; } }
        if (best) { tx = best.x; ty = best.y; }
      }
    }
    // Para encender un cirio hay que aguantar el tipo: quien vela se deja tocar antes que soltarlo.
    if (tend) { fx *= 0.45; fy *= 0.45; }
    const gx = tx - p.x, gy = ty - p.y, gd = Math.hypot(gx, gy) || 1;
    if (gd > 6) { fx += gx / gd * pull; fy += gy / gd * pull; }
    const len = Math.hypot(fx, fy);

    if (this.state === 'running' && this.lullCd === 0) {
      const nearWake = Math.hypot(p.x - COFFIN.x, p.y - COFFIN.y) < this.lullRadius() - 70;
      const want = (out.length >= (sloppy ? 3 : 2) && nearWake) || (out.length >= 1 && nearWake && crowd >= 4)
        || crowd >= (sloppy ? 12 : 8) || p.hp < this.st.maxHp * 0.3;
      if (want && (!sloppy || Math.random() < 0.05)) this.arrullo();
    }
    if (this.dashCd === 0 && this.dashTime <= 0 && this.state === 'running' && (!sloppy || Math.random() < 0.3)) {
      const close = this.enemies.some(e => e.hp > 0 && !e.dissolve && !(e.rising > 0) && Math.hypot(e.x - p.x, e.y - p.y) < e.r + 22);
      if (close && len > 0.01) { this.dashDir = {x: fx / len, y: fy / len}; this.dashTime = 0.24; this.dashCd = this.st.dashCd; this.dashHit = new Set(); p.inv = Math.max(p.inv, 0.5); }
    }
    const mv = len > 0.05 ? {x: fx / len, y: fy / len} : {x: 0, y: 0};
    if (sloppy) this.botMemo = {at: this.clock, mv};
    return mv;
  },

  /* bot = 2 elige al azar. bot = 1 cierra rincones, se arma pronto y luego sube lo que tiene. */
  botChoice() {
    const list = this.choices;
    if (this.bot === 2) return list[Math.floor(Math.random() * list.length)].id;
    let best = list[0], top = -1;
    for (const c of list) {
      let score = Math.random() * 0.5;
      if (c.room?.completes) score += 3;
      if (c.kind === 'arma') score += c.isNew ? (this.slotsUsed('arma') < 3 ? 2 : 0.8) : 1.4;
      else if (c.kind === 'recuerdo') score += c.isNew ? 0.9 : 1;
      else if (c.id === 'cafe' && this.player.hp < this.st.maxHp * 0.5) score += 2;
      if (score > top) { top = score; best = c; }
    }
    return best.id;
  },

  /* Lo que miran las pruebas de equilibrio al acabar la noche. */
  debugStats() {
    return {lit: this.litCount(), apagados: this.snuffed, encendidos: this.relit, levantadas: this.revives, arrullos: this.lullUsed,
      rincones: [...this.rooms].join('+') || '-', difuntos: this.elitesDown, procesiones: this.processions, alma: +this.soulMax.toFixed(2), guia: this.freedAt};
  }
};
