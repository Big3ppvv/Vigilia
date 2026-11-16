/* Catálogo, sinergias, límites y elecciones sin navegador ni dependencias. */
import assert from 'node:assert/strict';
import { OBJECTS, OBJECT_COLLECTIONS } from '../objects.js';
import { MEMORIES, ROOMS } from '../story.js';
import { memoryMethods } from '../memories.js';
import { MAX_LEVEL, SLOTS } from '../balance.js';

assert.equal(OBJECTS.length, 500);
assert.equal(new Set(MEMORIES.map(m => m.id)).size, 514);
assert.equal(new Set(OBJECTS.map(m => m.name)).size, 500);
function game() {
  const g = {...memoryMethods, mem: Object.fromEntries(MEMORIES.map(m => [m.id, 0])),
    rooms: new Set(), character: 'lucia', player: {hp: 100}, hooks: {},
    keys: new Set(), audio: {sfx() {}}, setState() {}, emitStats() {}};
  g.computeStats();
  return g;
}
for (const collection of OBJECT_COLLECTIONS) {
  assert.equal(collection.members.length, 25);
  const g = game();
  for (const id of collection.members) {
    const item = OBJECTS.find(m => m.id === id);
    assert.equal(item.collection, collection.id);
    assert.ok(item.icon && item.line && item.effect && item.fragment);
  }
  const [a, b] = collection.members;
  g.mem[a] = MAX_LEVEL;
  assert.equal(g.checkRooms(false), false, 'Subir de nivel no sustituye al compañero');
  assert.equal(g.roomTag(b).completes, true);
  g.mem[b] = 1;
  g.computeStats();
  const before = {...g.st};
  assert.equal(g.checkRooms(false), true);
  for (const [stat, value] of Object.entries(collection.bonus)) {
    assert.ok(Math.abs(g.st[stat] - before[stat] - value) < 1e-9, collection.id);
  }
  const active = {...g.st};
  assert.equal(g.checkRooms(false), false);
  g.computeStats();
  assert.deepEqual(g.st, active, 'Los bonus no se acumulan al recalcular');
}
const g = game();
g.mem.chispas = 1;
for (let i = 0; i < 500; i++) {
  g.levelUp(true);
  assert.equal(g.choices.length, 3);
  assert.equal(new Set(g.choices.map(c => c.id)).size, 3);
  assert.ok(g.choices.some(c => !c.collection), 'Siempre se pueden encontrar recuerdos clásicos');
}
for (const item of OBJECTS.slice(0, SLOTS.recuerdo)) g.mem[item.id] = MAX_LEVEL;
for (let i = 0; i < 50; i++) {
  g.levelUp(true);
  assert.ok(g.choices.every(c => !c.collection), 'Se respeta el límite de huecos');
}
for (const room of ROOMS.filter(r => !r.required)) {
  const classic = game();
  for (const id of room.members) classic.mem[id] = 1;
  classic.checkRooms(false);
  assert.ok(classic.rooms.has(room.id));
}
console.log('500 objetos, 20 colecciones, bonus, huecos y 550 elecciones: OK');
