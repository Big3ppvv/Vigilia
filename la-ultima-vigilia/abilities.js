/*
 * La habilidad de cada cual (tecla R): un recurso con recarga que cambia el
 * momento. Las reglas viven aquí; el dibujo, en render y combat-fx.
 */
import { TAU, rand } from './util.js';
import { ABILITY_BALANCE } from './balance.js';
import { ABILITIES } from './story.js';

export const abilityMethods = {
  resetAbility() { this.abilityCd = 0; this.abilityBuff = null; this.abilitiesUsed = 0; },

  abilityMax() { return (ABILITY_BALANCE[this.run.character] || ABILITY_BALANCE.lucia).cooldown; },

  abilitySnapshot() {
    const info = ABILITIES[this.run.character] || ABILITIES.lucia;
    return {name: info.name, description: info.description, cd: this.abilityCd, max: this.abilityMax(), ready: this.abilityCd <= 0, active: !!this.abilityBuff};
  },

  ability() {
    if (this.state !== 'running' || this.abilityCd > 0) return false;
    const id = this.run.character, B = ABILITY_BALANCE[id], p = this.player;
    this.abilityCd = B.cooldown;
    this.abilitiesUsed++;
    const elem = Math.max(0, this.st.elemental);
    if (id === 'lucia') {
      // Lumbre: el fogonazo del móvil aturde y quema lo que rodea.
      const dmg = (B.damage + elem * 1.5) * this.d.damage;
      for (const e of this.queryGrid(p.x, p.y, B.radius + 30)) {
        if (e.hp <= 0 || e.dissolve || Math.hypot(e.x - p.x, e.y - p.y) > B.radius + e.r) continue;
        e.stun = Math.max(e.stun, e.type === 'guia' ? 0.25 : e.elite ? B.stun * 0.5 : B.stun);
        this.hurt(e, dmg, {knock: 160, from: p, tone: 'ember', by: 'habilidad'});
      }
      this.flashes.push({x: p.x, y: p.y - 14, r: B.radius * 2.4, life: 0.35, total: 0.35, c: 'white'});
      this.rings.push({x: p.x, y: p.y - 10, r: 10, max: B.radius, life: 0.4, total: 0.4, color: '#fff6e2', width: 4});
      if (this.options.flashes) { this.flash = Math.max(this.flash, 0.3); this.flashColor = '255,246,226'; }
    } else if (id === 'julian') {
      this.areas.push({kind: 'sal', owner: 'player', x: p.x, y: p.y + 4, r: B.radius, life: B.life, total: B.life, tick: B.tick, tickT: 0,
        dmg: (B.damage + Math.max(0, this.st.melee) * 0.5) * this.d.damage, slow: B.slow, tone: 'salt', weapon: 'habilidad'});
      for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; this.particle({x: p.x + Math.cos(a) * B.radius, y: p.y + 4 + Math.sin(a) * B.radius * 0.75, vx: rand(-20, 20), vy: rand(-60, -20), life: 0.6, size: 2, color: '#f4fbff', glow: true, grav: 120}); }
    } else if (id === 'matilde') {
      this.heal(this.d.maxHp * B.heal);
      this.knockAll(p.x, p.y, B.radius, B.knock);
      this.rings.push({x: p.x, y: p.y - 10, r: 10, max: B.radius, life: 0.6, total: 0.6, color: '#eecd81', width: 3, light: 260});
      this.burst(p.x, p.y - 16, 24, '#fff4d8', 150);
    } else if (id === 'tono') {
      this.abilityBuff = {t: B.life, attackSpeed: B.attackSpeed, speed: B.speed};
      this.rings.push({x: p.x, y: p.y - 10, r: 10, max: 150, life: 0.5, total: 0.5, color: '#9fe0c6', width: 3, light: 220});
    } else if (id === 'sabela') {
      const dir = this.lastMove, x = p.x + dir.x * B.range * 0.6, y = p.y + dir.y * B.range * 0.6;
      this.areas.push({kind: 'rede', owner: 'player', x, y, r: B.radius, life: B.root, total: B.root, tick: 1, tickT: 0, dmg: 0, root: true, tone: 'salt'});
      for (let i = 0; i < 14; i++) this.particle({x: p.x, y: p.y - 10, vx: dir.x * rand(200, 320) + rand(-50, 50), vy: dir.y * rand(200, 320) + rand(-50, 50), life: 0.35, size: 2, color: '#d9c9a0', drag: 4});
    } else if (id === 'anselmo') {
      const dmg = (B.damage + elem * 2) * this.d.damage;
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.dissolve || Math.hypot(e.x - p.x, e.y - p.y) > B.radius) continue;
        if (!e.elite && e.type !== 'guia' && e.hp / e.maxHp <= B.execute) this.hurt(e, e.hp + 1, {knock: 200, from: p, tone: 'sacred', by: 'habilidad', crit: true});
        else this.hurt(e, dmg, {knock: 220, from: p, tone: 'sacred', by: 'habilidad'});
      }
      this.flashes.push({x: p.x, y: p.y - 14, r: B.radius * 1.6, life: 0.4, total: 0.4, c: 'sacred'});
      if (this.options.flashes) { this.flash = Math.max(this.flash, 0.35); this.flashColor = '255,236,180'; }
      if (this.options.shake) this.shake = Math.max(this.shake, 6);
    }
    this.zoomPunch = 0.035;
    this.audio.sfx('habilidad_' + id);
    this.emitStats();
    return true;
  },

  updateAbility(dt) {
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    if (this.abilityBuff) {
      this.abilityBuff.t -= dt;
      if (Math.random() < 0.3) this.particle({x: this.player.x + rand(-14, 14), y: this.player.y - rand(10, 30), vx: rand(-20, 20), vy: rand(-60, -30), life: 0.8, size: 3, color: '#9fe0c6', glow: true, note: true});
      if (this.abilityBuff.t <= 0) this.abilityBuff = null;
    }
  }
};
