/*
 * La noche manda: qué pasa a cada hora y cuánta Compaña viene.
 */
import { TAU, rand } from './util.js';
import { NIGHT, MAX_ENEMIES } from './balance.js';
import { HOURS } from './story.js';

export const directorMethods = {
  onHour(h) {
    this.audio.sfx('hora', {count: h});
    this.banner(HOURS[h].name, HOURS[h].mood);
    this.bark('hour' + h, {delay: 1.2, priority: 2});
    if (h === 3) {
      // La hora de las ánimas: vienen de todas partes.
      for (let i = 0; i < 16; i++) {
        const e = this.spawn('anima');
        if (!e) break;
        const a = i / 16 * TAU, r = Math.max(this.width, this.height) * 0.65;
        e.x = this.player.x + Math.cos(a) * r; e.y = this.player.y + Math.sin(a) * r;
      }
    }
  },

  stopClock() {
    this.phase = 'stopped';
    this.time = NIGHT - 1;
    this.stoppedFor = 0;
    this.audio.sfx('reloj');
    this.banner('05:59', 'El reloj de la torre se ha parado');
    this.bark('stopped', {priority: 3, delay: 0.8});
  },

  spawnProcession() {
    const n = Math.min(11, 5 + Math.floor(this.time / 100));
    const a = Math.random() * TAU;
    const r = Math.max(this.width, this.height) * 0.62 + 40;
    let prev = null;
    for (let i = 0; i < n; i++) {
      const e = this.spawn('hermano', {x: this.player.x + Math.cos(a) * (r + i * 26), y: this.player.y + Math.sin(a) * (r + i * 26)});
      if (!e) break;
      e.speed = 36 * (1 + this.time / 1300);
      e.heading = a + Math.PI + rand(-0.9, 0.9);
      if (prev) { e.leader = prev; prev.follower = e; }
      prev = e;
    }
  },

  spawnSwarm(n) {
    const a = Math.random() * TAU, r = Math.max(this.width, this.height) * 0.6;
    const cx = this.player.x + Math.cos(a) * r, cy = this.player.y + Math.sin(a) * r;
    for (let i = 0; i < n; i++) this.spawn('anima', {x: cx + rand(-50, 50), y: cy + rand(-50, 50)});
  },

  /* Cuántas criaturas quiere la noche a cada hora: sube despacio hasta las cinco. */
  targetPopulation() {
    if (this.boss && this.boss.hp > 0) return 90;
    return Math.min(MAX_ENEMIES, 24 + this.time * 0.38);
  },

  spawning(dt) {
    if (this.phase === 'rush') return;
    this.t.spawn -= dt;
    if (this.t.spawn <= 0) {
      const alive = this.enemies.filter(e => !e.dissolve && !e.summoned).length;
      const deficit = this.targetPopulation() - alive;
      if (deficit > 0) {
        const count = Math.min(4, Math.ceil(deficit / 12));
        for (let i = 0; i < count; i++) if (!this.spawn()) break;
        this.t.spawn = deficit > 30 ? 0.18 : 0.42;
      } else this.t.spawn = 0.5;
    }
    if (this.time > 60 && !this.boss) {
      this.t.procession -= dt;
      if (this.t.procession <= 0) { this.t.procession = rand(24, 36); this.spawnProcession(); }
    }
    this.t.swarm -= dt;
    if (this.t.swarm <= 0 && !this.boss) { this.t.swarm = rand(45, 65); this.spawnSwarm(5 + Math.floor(Math.random() * 4)); }
  },
};
