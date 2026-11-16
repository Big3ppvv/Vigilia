/*
 * Lo que decide quien vela: alzar su luz y encender los faroles del camino.
 * El reloj, el daño y los dibujos siguen perteneciendo a sus propios sistemas.
 */
import { TAU, clamp, rand } from './util.js';
import { ABILITY_BALANCE, RITUAL_RADIUS, RITUAL_CHANNEL, RITUAL_LIGHT_RADIUS, RITUAL_SITES } from './balance.js';
import { ABILITIES, RITES } from './story.js';

const TONES = {lucia: '#ffb04a', julian: '#bee0f2', matilde: '#eecd81'};

export const ritualMethods = {
  resetRituals() {
    this.rituals = RITUAL_SITES.map(site => ({...site, label: RITES.labels[site.id], progress: 0, lit: false}));
    this.ritualActiveId = null;
    this.ritualInterrupted = 0;
    this.ritualIntro = false;
    this.abilityCd = 0;
    this.abilityTime = 0;
    this.abilitiesUsed = 0;
    this.wards = [];
  },

  litRituals() { return this.rituals.filter(site => site.lit).length; },

  abilityMax() { return ABILITY_BALANCE[this.character].cooldown * (1 - this.litRituals() * 0.06); },

  abilitySnapshot() {
    return {...ABILITIES[this.character], cd: this.abilityCd, max: this.abilityMax(), ready: this.abilityCd <= 0 && this.state === 'running' && this.phase !== 'rush'};
  },

  ritualSnapshot() {
    const p = this.player;
    const remaining = this.rituals.filter(site => !site.lit);
    const nearest = remaining.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    const info = nearest ? {id: nearest.id, label: nearest.label, distance: Math.round(Math.hypot(nearest.x - p.x, nearest.y - p.y)), progress: nearest.progress} : null;
    return {lit: this.litRituals(), total: this.rituals.length, active: this.ritualActiveId ? info : null, nearest: info, interrupted: this.ritualInterrupted > 0};
  },

  ability() {
    if (this.state !== 'running' || this.phase === 'rush' || this.abilityCd > 0) return false;
    const p = this.player, config = ABILITY_BALANCE[this.character], color = TONES[this.character];
    this.abilityCd = this.abilityMax();
    this.abilityTime = 0.7;
    this.abilitiesUsed++;
    p.inv = Math.max(p.inv, 0.4);
    // Una amenaza anunciada conserva su origen, pero el pulso disipa su proyectil.
    this.enemyShots = this.enemyShots.filter(shot => Math.hypot(shot.x - p.x, shot.y - p.y) > config.radius);
    this.hazards = this.hazards.filter(hazard => Math.hypot(hazard.x - p.x, hazard.y - p.y) > config.radius);
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0 || enemy.dissolve || Math.hypot(enemy.x - p.x, enemy.y - p.y) > config.radius + enemy.r) continue;
      this.hurt(enemy, config.damage + Math.min(20, (this.level - 1) * 1.5), {knock: config.knock, from: p, fx: this.character === 'julian' ? 'salt' : this.character === 'lucia' ? 'ember' : 'sacred'});
      if (this.character === 'matilde' && enemy.type === 'guia' && enemy.hp > 0) {
        enemy.stun = Math.max(enemy.stun, 1.2);
        this.soul = Math.max(0, this.soul - 0.1);
      }
    }
    if (this.character === 'lucia') {
      for (const gem of this.gems) if (Math.hypot(gem.x - p.x, gem.y - p.y) < 410) gem.magnet = true;
    } else if (this.character === 'julian') {
      this.wards.push({x: p.x, y: p.y, r: config.radius, life: config.wardLife, total: config.wardLife, tick: config.wardTick});
    } else p.hp = Math.min(this.st.maxHp, p.hp + this.st.maxHp * config.healing);
    this.rings.push({x: p.x, y: p.y - 4, r: 12, max: config.radius, life: 0.65, total: 0.65, color, width: 3, light: config.radius});
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * TAU;
      this.particle({x: p.x, y: p.y - 8, vx: Math.cos(angle) * rand(110, 220), vy: Math.sin(angle) * rand(110, 220), life: rand(0.3, 0.65), size: 2, color, glow: true});
    }
    this.audio.sfx('pulse', {character: this.character});
    if (this.options.shake) this.shake = Math.max(this.shake, 2.5);
    this.emitStats();
    return true;
  },

  enemySlow(enemy) {
    if (this.wards.some(ward => ward.life > 0 && Math.hypot(enemy.x - ward.x, enemy.y - ward.y) < ward.r)) return enemy.type === 'guia' ? 0.8 : 0.45;
    if (this.rituals.some(site => site.lit && Math.hypot(enemy.x - site.x, enemy.y - site.y) < RITUAL_LIGHT_RADIUS)) return 0.8;
    return 1;
  },

  updateRituals(dt) {
    const p = this.player;
    const previousCd = this.abilityCd;
    this.abilityCd = Math.max(0, this.abilityCd - dt);
    this.abilityTime = Math.max(0, this.abilityTime - dt);
    this.ritualInterrupted = Math.max(0, this.ritualInterrupted - dt);
    if (previousCd > 0 && this.abilityCd === 0) this.audio.sfx('ritualReady');
    if (!this.ritualIntro && this.time >= 10 && this.phase === 'night') {
      this.ritualIntro = true;
      this.banner(RITES.introduction.title, RITES.introduction.sub, 'ritual');
    }
    this.ritualActiveId = null;
    for (const site of this.rituals) {
      if (site.lit) continue;
      const nearby = Math.hypot(p.x - site.x, p.y - site.y) <= RITUAL_RADIUS;
      const channeling = nearby && !p.moving && this.dashTime <= 0 && this.ritualInterrupted <= 0 && this.phase === 'night';
      if (channeling) {
        this.ritualActiveId = site.id;
        site.progress = clamp(site.progress + dt / RITUAL_CHANNEL, 0, 1);
        if (site.progress >= 1) this.lightRitual(site);
      } else site.progress = Math.max(0, site.progress - dt * 0.12);
    }
    const config = ABILITY_BALANCE.julian;
    for (const ward of this.wards) {
      const activeDt = Math.min(dt, ward.life);
      ward.tick -= activeDt;
      while (ward.tick <= 0) {
        ward.tick += config.wardTick;
        for (const enemy of this.enemies) {
          if (enemy.hp > 0 && !enemy.dissolve && Math.hypot(enemy.x - ward.x, enemy.y - ward.y) < ward.r + enemy.r) this.hurt(enemy, config.wardDamage, {knock: 0, from: ward, silent: true});
        }
      }
      ward.life = Math.max(0, ward.life - dt);
    }
    this.wards = this.wards.filter(ward => ward.life > 0);
  },

  lightRitual(site) {
    if (site.lit) return false;
    const oldMax = this.abilityMax();
    site.lit = true;
    site.progress = 1;
    this.ritualActiveId = null;
    this.player.hp = Math.min(this.st.maxHp, this.player.hp + this.st.maxHp * 0.16);
    this.xp += Math.ceil(this.xpNext * 0.65);
    this.abilityCd *= this.abilityMax() / oldMax;
    this.rings.push({x: site.x, y: site.y, r: 8, max: 155, life: 1, total: 1, color: '#ffb04a', width: 3, light: 190});
    for (let i = 0; i < 20; i++) this.particle({x: site.x + rand(-10, 10), y: site.y - 20, vx: rand(-65, 65), vy: rand(-100, -30), life: rand(0.5, 1), size: 2, color: '#ffe2a0', glow: true});
    this.audio.sfx('ritual');
    const allLit = this.litRituals() === this.rituals.length;
    this.banner(allLit ? RITES.allLit.title : site.label, allLit ? RITES.allLit.sub : RITES.completed, 'ritual');
    this.emitStats();
    return true;
  },

  interruptRitual() {
    this.ritualInterrupted = 0.9;
    this.ritualActiveId = null;
    for (const site of this.rituals) if (!site.lit) site.progress = Math.max(0, site.progress - 0.2);
  }
};
