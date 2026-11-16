/*
 * Piloto automático para las pruebas: se mueve apartándose de lo que viene,
 * recoge la cera, esquiva lo que está a punto de tocarle y compra con un
 * criterio sencillo. bot === 2 imita a alguien que juega por primera vez.
 */
import { clamp } from './util.js';
import { ARENA, PLAYER } from './balance.js';
import { WEAPON } from './arsenal.js';
import { ITEM } from './items.js';

const STAT_PRIORITY = {damage: 10, maxHp: 9, attackSpeed: 8, armor: 7, regen: 6, melee: 5, ranged: 5, elemental: 5, crit: 5, dodge: 5, speed: 4, lifesteal: 4, range: 3, luck: 2, harvest: 3, engineering: 2};

export const botMethods = {
  botMove() {
    const p = this.player, novice = this.bot === 2;
    let fx = 0, fy = 0;
    // Con armas cortas hay que acercarse; con armas largas, mantener la distancia.
    const reachOf = w => (WEAPON[w.id].kind === 'melee' || ['orbit', 'censer', 'pulse', 'flame'].includes(WEAPON[w.id].act)) ? 70 : 170;
    const comfort = this.run.weapons.length ? Math.min(...this.run.weapons.map(reachOf)) * 0.5 + Math.max(...this.run.weapons.map(reachOf)) * 0.5 : 150;
    // Repulsión de las criaturas cercanas, de los proyectiles y de los avisos.
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.dissolve) continue;
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      const reach = (e.type === 'guia' ? 260 : comfort) + (e.mode === 'windup' ? 80 : 0);
      if (d < reach) { const k = (reach - d) / reach; fx += dx / d * k * k * (e.elite ? 3 : 1.6); fy += dy / d * k * k * (e.elite ? 3 : 1.6); }
    }
    for (const s of this.enemyShots) {
      const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy) || 1;
      if (d < 90) { fx += dx / d * 1.4; fy += dy / d * 1.4; }
    }
    for (const h of this.hazards) {
      if (h.done) continue;
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
      if (d < h.r + 40) { fx += dx / d * 3; fy += dy / d * 3; }
    }
    for (const m of this.marks) {
      const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1;
      if (d < 70) { fx += dx / d * 0.8; fy += dy / d * 0.8; }
    }
    // Atracción hacia la cera cercana y, sin peligro, hacia el centro.
    let best = null, bd = (novice ? 180 : 340) ** 2;
    for (const d of this.drops) {
      const q = (d.x - p.x) ** 2 + (d.y - p.y) ** 2;
      if (q < bd) { bd = q; best = d; }
    }
    const danger = Math.hypot(fx, fy);
    // Si no hay nada cerca y las armas son cortas, va a buscar pelea.
    if (comfort < 120 && danger < 0.4) {
      let prey = null, pd = 420 ** 2;
      for (const e of this.enemies) { if (e.hp <= 0 || e.dissolve) continue; const q = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (q < pd) { pd = q; prey = e; } }
      if (prey) { const dx = prey.x - p.x, dy = prey.y - p.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 0.8; fy += dy / d * 0.8; }
    }
    if (best && danger < 1.2) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 0.9; fy += dy / d * 0.9; }
    const cx = -p.x / (ARENA.right - ARENA.left) * 2.4, cy = -p.y / (ARENA.bottom - ARENA.top) * 2.4;
    fx += cx * (danger > 0.5 ? 1.4 : 0.6); fy += cy * (danger > 0.5 ? 1.4 : 0.6);
    // Se mueve en círculos para no quedarse quieto delante de todo.
    const orbit = Math.atan2(p.y, p.x) + Math.PI / 2;
    fx += Math.cos(orbit) * 0.35; fy += Math.sin(orbit) * 0.35;
    if (!novice && this.state === 'running') {
      if (danger > 2.4 && this.dashCd <= 0) { this.botDashT = (this.botDashT || 0) + 1; if (this.botDashT > 3) { this.botDashT = 0; this.dashSoon = true; } }
      if (this.abilityCd <= 0 && (danger > 1.6 || (this.player.hp < this.d.maxHp * 0.4 && this.run.character === 'matilde'))) this.ability();
    }
    const len = Math.hypot(fx, fy);
    if (len < 0.05) return {x: 0, y: 0};
    return {x: clamp(fx / len, -1, 1), y: clamp(fy / len, -1, 1)};
  },

  botUpgrade() {
    let best = 0, score = -Infinity;
    this.choices.forEach((c, i) => {
      const s = (STAT_PRIORITY[c.stat] || 1) * (1 + c.tier * 0.6) + Math.random() * (this.bot === 2 ? 8 : 1);
      if (s > score) { score = s; best = i; }
    });
    return best;
  },

  /* Compra armas hasta tener cinco o seis (prefiere juntar), y después objetos. */
  botShop() {
    let guard = 0;
    while (guard++ < 12) {
      const snap = this.shopSnapshot();
      let pick = -1, value = -Infinity;
      snap.offers.forEach((o, i) => {
        if (!o.ok) return;
        let v;
        if (o.kind === 'weapon') {
          const owned = this.run.weapons.filter(w => w.id === o.id).length;
          v = (this.run.weapons.length < PLAYER.maxWeapons ? 30 : 0) + owned * 14 + o.tier * 18 + (o.combine ? 30 : 0);
        } else {
          const it = ITEM[o.id];
          v = 10 + it.rarity * 14;
          for (const [k, val] of Object.entries(it.stats)) v += (STAT_PRIORITY[k] || 1) * Math.sign(val) * Math.min(4, Math.abs(val) / 3);
        }
        v -= o.price * 0.05;
        if (v > value) { value = v; pick = i; }
      });
      if (pick < 0 || value < 4) {
        if (this.run.cera > this.rerollCost() + 40 && this.rerolls < 2) { this.rerollShop(); continue; }
        break;
      }
      this.buy(pick);
    }
    for (const w of [...this.run.weapons]) if (this.combinable(w.uid)) this.combineWeapon(w.uid);
    this.nextRound();
  },

  debugStats() {
    const r = this.run;
    return {round: r.round, level: r.level, kills: r.kills, cera: Math.round(r.cera), ceraTotal: Math.round(r.ceraTotal),
      weapons: r.weapons.map(w => `${WEAPON[w.id].name} ${'I'.repeat(w.tier + 1)}`), items: Object.keys(r.items).length,
      hp: Math.round(this.player.hp), maxHp: this.d.maxHp, elites: r.elitesDown, freed: r.freed, bossTime: r.bossTime};
  }
};
