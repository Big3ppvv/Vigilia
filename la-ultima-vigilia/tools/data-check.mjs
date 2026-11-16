/*
 * Los datos del juego, sin navegador: armas, objetos, recuerdos, personajes,
 * criaturas y textos. Falla si algo apunta a lo que no existe, si un número
 * por nivel no tiene sus cuatro valores o si una estadística no es válida.
 *
 *   node tools/data-check.mjs
 */
import assert from 'node:assert/strict';
import { WEAPONS, WEAPON, CLASSES } from '../arsenal.js';
import { ITEMS, UPGRADES } from '../items.js';
import { STAT_IDS } from '../stats.js';
import { CHARACTERS, ABILITIES, CREATURES, ELITES, BARKS, SHOPKEEPER, HELP } from '../story.js';
import { ENEMIES, ELITE, ELITE_ROUNDS, ABILITY_BALANCE, ROUNDS, roundTime, xpFor, ECONOMY, RARITY, DANGER, SCALING } from '../balance.js';
import { SPRITES, ICONS } from '../sprites.js';
import { EXTRA_SPRITES, EXTRA_ICONS, WEAPON_SPRITES, EXTRA_PALETTE } from '../sprites-extra.js';
import { PALETTE } from '../sprites.js';

const sprites = {...SPRITES, ...EXTRA_SPRITES}, icons = {...ICONS, ...EXTRA_ICONS};
const palette = {...PALETTE, ...EXTRA_PALETTE};
const ACTS = ['thrust', 'sweep', 'spin', 'shot', 'spread', 'bounce', 'ricochet', 'boomerang', 'rocket', 'wave', 'puddle', 'orbit', 'pulse', 'flame', 'censer'];
const four = (v, what) => { if (Array.isArray(v)) assert.equal(v.length, 4, `${what}: necesita cuatro valores (I-IV)`); };

/* Armas */
const ids = new Set();
for (const w of WEAPONS) {
  assert(!ids.has(w.id), `arma repetida: ${w.id}`); ids.add(w.id);
  assert(ACTS.includes(w.act), `${w.id}: forma de atacar desconocida «${w.act}»`);
  assert(WEAPON_SPRITES[w.id], `${w.id}: no tiene dibujo`);
  for (const c of w.classes) assert(CLASSES[c], `${w.id}: clase desconocida ${c}`);
  for (const key of ['dmg', 'cd', 'count', 'pierce', 'bounces', 'blast', 'burn', 'grow']) if (w[key] !== undefined) four(w[key], `${w.id}.${key}`);
  for (const [i, d] of w.dmg.entries()) if (i) assert(d > w.dmg[i - 1], `${w.id}: el daño debe crecer con el nivel`);
  for (const [i, c] of w.cd.entries()) if (i) assert(c <= w.cd[i - 1], `${w.id}: la recarga no puede empeorar con el nivel`);
  for (const stat of Object.keys(w.scale)) assert(STAT_IDS.includes(stat), `${w.id}: escala con «${stat}», que no existe`);
  assert(w.line && w.name, `${w.id}: le falta nombre o recuerdo`);
}
for (const [id, c] of Object.entries(CLASSES)) {
  assert.equal(c.bonus.length, 7, `${id}: premios de 0 a 6 armas`);
  for (const b of c.bonus.filter(Boolean)) for (const stat of Object.keys(b)) assert(STAT_IDS.includes(stat), `${id}: premio con «${stat}»`);
  assert(WEAPONS.filter(w => w.classes.includes(id)).length >= 2, `${id}: una clase necesita al menos dos armas`);
}

/* Objetos y recuerdos */
const items = new Set();
const SPECIALS = ['cafe', 'pickup', 'elite', 'interest', 'double', 'thorns', 'explode', 'burn', 'xp', 'discount', 'freeReroll', 'structure', 'revive', 'slowAura', 'cera', 'bell', 'beam'];
for (const it of ITEMS) {
  assert(!items.has(it.id), `objeto repetido: ${it.id}`); items.add(it.id);
  assert([0, 1, 2, 3].includes(it.rarity), `${it.id}: rareza fuera de rango`);
  assert(icons[it.icon] || sprites[it.icon], `${it.id}: el icono «${it.icon}» no existe`);
  for (const stat of Object.keys(it.stats)) assert(STAT_IDS.includes(stat), `${it.id}: estadística «${stat}» desconocida`);
  for (const sp of Object.keys(it.special || {})) assert(SPECIALS.includes(sp), `${it.id}: regla «${sp}» desconocida`);
  assert(Object.keys(it.stats).length || it.special, `${it.id}: no hace nada`);
  assert(it.line, `${it.id}: le falta su frase`);
}
for (const r of [0, 1, 2, 3]) assert(ITEMS.filter(i => i.rarity === r).length >= 6, `pocas cosas de rareza ${r}`);
assert.deepEqual(UPGRADES.map(u => u.stat).sort(), [...STAT_IDS].sort(), 'cada estadística necesita su recuerdo');
for (const u of UPGRADES) { four(u.values, u.stat); assert(icons[u.icon] || sprites[u.icon] || WEAPON_SPRITES[u.icon], `${u.stat}: icono «${u.icon}»`); }

/* Personajes, criaturas y textos */
for (const [id, ch] of Object.entries(CHARACTERS)) {
  assert(sprites[id], `${id}: no tiene dibujo`);
  assert(ABILITIES[id] && ABILITY_BALANCE[id], `${id}: falta su habilidad`);
  assert(BARKS[id]?.start?.length, `${id}: no dice nada al empezar`);
  for (const w of ch.weapons) assert(WEAPON[w], `${id}: arma inicial «${w}» no existe`);
  for (const it of ch.items || []) assert(items.has(it), `${id}: objeto inicial «${it}» no existe`);
  for (const stat of Object.keys(ch.stats || {})) assert(STAT_IDS.includes(stat), `${id}: estadística «${stat}»`);
  assert(ch.victory && ch.defeat, `${id}: le falta un final`);
}
for (const [id, e] of Object.entries(ENEMIES)) {
  assert(sprites[id], `${id}: criatura sin dibujo`);
  assert(CREATURES[id], `${id}: criatura sin texto`);
  assert(e.from >= 1 && e.hp > 0 && e.speed > 0, `${id}: números inválidos`);
}
for (const [round, id] of Object.entries(ELITE_ROUNDS)) {
  assert(ELITE[id] && ELITES[id], `ronda ${round}: difunto «${id}» sin datos o texto`);
  assert(ENEMIES[ELITE[id].type], `${id}: tipo ${ELITE[id].type}`);
}
assert(SHOPKEEPER.greet.length && SHOPKEEPER.buy.length && SHOPKEEPER.hour.length === 6, 'Remedios necesita sus frases');
assert(HELP.length >= 10, 'la ayuda está incompleta');

/* Cada dibujo usa colores de la paleta. */
for (const [name, rows] of Object.entries({...sprites, ...icons, ...Object.fromEntries(Object.entries(WEAPON_SPRITES).map(([k, v]) => ['w:' + k, v]))})) {
  for (const row of rows) for (const ch of row) assert(ch === '.' || palette[ch], `${name}: color «${ch}» fuera de la paleta`);
}

/* Equilibrio: crece lo que tiene que crecer. */
assert.equal(ROUNDS, 18, 'la noche son dieciocho rondas');
for (let r = 2; r <= ROUNDS; r++) {
  assert(roundTime(r) >= roundTime(r - 1), 'las rondas no se acortan');
  assert(SCALING.hp(r) > SCALING.hp(r - 1) && SCALING.damage(r) > SCALING.damage(r - 1), 'las criaturas crecen ronda a ronda');
}
for (let l = 2; l < 60; l++) assert(xpFor(l) > xpFor(l - 1), 'cada nivel pide más');
assert.equal(ECONOMY.itemBase.length, 4); assert.equal(ECONOMY.weaponBase.length, 4); assert.equal(RARITY.length, 4);
for (let i = 1; i < DANGER.length; i++) assert(DANGER[i].hp > DANGER[i - 1].hp, 'cada dificultad aprieta más');

console.log(`✓ Datos: ${WEAPONS.length} armas, ${Object.keys(CLASSES).length} clases, ${ITEMS.length} objetos, ${UPGRADES.length} recuerdos, ${Object.keys(CHARACTERS).length} personajes, ${Object.keys(ENEMIES).length} criaturas`);
