/*
 * Los recuerdos son las mejoras: la luz que se recoge y lo que vuelve con ella.
 * En una noche caben cuatro armas y cinco recuerdos; los que van juntos forman
 * un rincón de Amparo y, al reunirlos, vuelve algo más.
 */
import { TAU, rand, pick } from './util.js';
import { MAX_LEVEL, SLOTS, VIGIL } from './balance.js';
import { CHARACTERS, MEMORIES, FALLBACK_CHOICES, AMPARO, ROOMS, VIGIL_TEXT } from './story.js';

const MEMORY = Object.fromEntries(MEMORIES.map(m => [m.id, m]));
const ROOM_OF = {};
for (const room of ROOMS) for (const id of room.members) ROOM_OF[id] = room;

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const memoryMethods = {
  computeStats() {
    const m = this.mem, ch = CHARACTERS[this.character] || CHARACTERS.lucia, rooms = this.rooms;
    const prevMax = this.st?.maxHp;
    this.st = {
      maxHp: ch.hp + 20 * m.caldo,
      speed: ch.speed * (1 + 0.05 * m.mecedora),
      regen: 0.5 * m.pan,
      cadence: Math.pow(0.9, m.radio),
      pickup: 72 * (1 + 0.35 * m.gafas),
      memory: ch.memory * (1 + 0.15 * m.fotos),
      crit: 0.04 + 0.07 * m.risa,
      armor: Math.min(0.6, ch.armor + 0.08 * m.manos),
      dashCd: 5 * Math.pow(0.85, m.mecedora) * (rooms.has('alcoba') ? 0.8 : 1),
      light: 178 * ch.light * (1 + 0.1 * m.farol),
      heal: rooms.has('cocina') ? 1.5 : 1,
      lullCd: VIGIL.lullCooldown
    };
    if (prevMax && this.player) this.player.hp = Math.min(this.st.maxHp, this.player.hp + Math.max(0, this.st.maxHp - prevMax));
  },

  xpFor(level) { return Math.floor(6 + level * 4 + level * level * 0.3); },

  slotsUsed(kind) {
    let n = 0;
    for (const m of MEMORIES) if (m.kind === kind && this.mem[m.id] > 0) n++;
    return n;
  },

  /* A qué rincón pertenece un recuerdo y cuánto falta para reunirlo. */
  roomTag(id) {
    const room = ROOM_OF[id];
    if (!room) return null;
    const have = room.members.filter(k => this.mem[k] > 0).length;
    return {id: room.id, name: room.name, have, total: room.members.length, completes: !this.mem[id] && have === room.members.length - 1, effect: room.effect};
  },

  /* Si se acaba de reunir un rincón, vuelve entero. */
  checkRooms(announce = true) {
    let changed = false;
    for (const room of ROOMS) {
      if (this.rooms.has(room.id) || !room.members.every(k => this.mem[k] > 0)) continue;
      this.rooms.add(room.id);
      changed = true;
      this.hooks.onDiscover?.({kind: 'room', id: room.id});
      if (!announce) continue;
      this.banner(room.name, VIGIL_TEXT.room, 'room');
      this.say(room.line, AMPARO.name, {italic: true, priority: 3, delay: 0.6});
      this.audio.sfx('rincon');
    }
    if (changed) this.computeStats();
    return changed;
  },

  dropGem(x, y, v) {
    if (this.gems.length > 240) {
      const g = this.gems[Math.floor(Math.random() * this.gems.length)];
      if (!g.cafe && !g.card) { g.v += v; return; }
    }
    this.gems.push({x: x + rand(-4, 4), y: y + rand(-4, 4), v, magnet: false, bob: Math.random() * 6});
  },

  updatePickups(dt) {
    const p = this.player, R = this.st.pickup;
    for (const g of this.gems) {
      const dx = p.x - g.x, dy = p.y - 4 - g.y, d = Math.hypot(dx, dy);
      if (d < R) g.magnet = true;
      if (g.magnet) { const s = Math.max(200, 460 - d); g.x += dx / (d || 1) * s * dt; g.y += dy / (d || 1) * s * dt; }
      if (d < 15) {
        g.got = true;
        if (g.cafe) {
          this.heal(25);
          this.audio.sfx('cafe');
          for (let i = 0; i < 6; i++) this.particle({x: p.x, y: p.y - 10, vx: rand(-30, 30), vy: rand(-60, -30), life: 0.8, size: 2, color: '#f1e8d2', glow: false});
        } else if (g.card) {
          this.cards++;
          this.cardPending = true;
          this.audio.sfx('recordatorio');
        } else {
          this.xp += g.v * this.st.memory;
          this.lightGot += g.v;
          this.audio.sfx('luz', {pan: 0});
          this.flare = Math.min(1, this.flare + 0.35);
        }
      }
    }
    this.gems = this.gems.filter(g => !g.got && Math.abs(g.x - p.x) < 4200 && Math.abs(g.y - p.y) < 3200);
  },

  /* free: un recordatorio de difunto; se elige sin gastar luz. */
  levelUp(free = false) {
    if (!free) {
      this.xp -= this.xpNext;
      this.level++;
      this.xpNext = this.xpFor(this.level);
    }
    this.keys.clear(); this.pointer = null;
    const full = {arma: this.slotsUsed('arma') >= SLOTS.arma, recuerdo: this.slotsUsed('recuerdo') >= SLOTS.recuerdo};
    const owned = MEMORIES.filter(m => this.mem[m.id] > 0 && this.mem[m.id] < MAX_LEVEL);
    const fresh = MEMORIES.filter(m => this.mem[m.id] === 0 && !full[m.kind]);
    let picks = shuffled([...owned, ...fresh]).slice(0, 3);
    // Que siempre haya algo nuevo y algo conocido, si se puede.
    if (owned.length && !picks.some(c => this.mem[c.id] > 0)) picks[2] = pick(owned);
    if (fresh.length && !picks.some(c => this.mem[c.id] === 0)) picks[1] = pick(fresh);
    // Si a un rincón le falta un solo recuerdo, a veces vuelve justo ese.
    const closing = fresh.filter(m => this.roomTag(m.id)?.completes);
    if (closing.length && !picks.some(c => closing.includes(c)) && Math.random() < 0.45) picks[0] = pick(closing);
    picks = [...new Set(picks)].filter(Boolean);
    for (const f of FALLBACK_CHOICES) if (picks.length < 3) picks.push(f);
    this.choices = picks.map(c => ({...c, level: (this.mem[c.id] || 0) + 1, isNew: !this.mem[c.id] && MEMORY[c.id] !== undefined, room: this.roomTag(c.id)}));
    this.choiceFree = free;
    this.audio.sfx('recuerdo');
    this.setState('upgrade');
    this.emitStats();
    if (this.bot) { this.chooseUpgrade(this.botChoice()); return; }
    this.hooks.onLevelUp?.({level: this.level, choices: this.choices, free,
      slots: {arma: [this.slotsUsed('arma'), SLOTS.arma], recuerdo: [this.slotsUsed('recuerdo'), SLOTS.recuerdo]}});
  },

  chooseUpgrade(id) {
    if (this.state !== 'upgrade') return false;
    const choice = this.choices.find(c => c.id === id);
    if (!choice) return false;
    const p = this.player;
    if (id === 'cafe') this.heal(35);
    else if (id === 'silencio') { this.dashCd = 0; this.lullCd = Math.max(0, this.lullCd - 12); }
    else {
      const first = this.mem[id] === 0;
      this.mem[id] = Math.min(MAX_LEVEL, this.mem[id] + 1);
      if (first) { this.order.push(id); this.hooks.onDiscover?.({kind: 'memory', id}); }
      this.computeStats();
      const room = this.checkRooms();
      if (id === 'caldo') this.heal(30);
      if (id === 'campana' && first) this.t.campana = 0.6;
      const said = room || this.bark('memory_' + id, {priority: 2});
      if (!said && first && Math.random() < 0.4) {
        const line = AMPARO.lines.find(l => !this.amparoSaid.has(l));
        if (line) { this.amparoSaid.add(line); this.say(line, AMPARO.name, {italic: true}); }
      }
    }
    this.choices = [];
    this.rings.push({x: p.x, y: p.y, r: 12, max: 120, life: 0.7, total: 0.7, color: '#ffd59a', width: 2, light: 160});
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; this.particle({x: p.x, y: p.y - 6, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, life: 0.6, size: 2, color: '#ffe2a0', glow: true}); }
    this.lastFrame = performance.now();
    this.setState('running');
    this.emitStats();
    this.canvas.focus?.({preventScroll: true});
    return true;
  }
};
