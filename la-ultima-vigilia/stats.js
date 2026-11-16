/*
 * Las estadísticas de quien vela. Todo lo que se compra, se recuerda o se
 * hereda de un personaje suma o resta aquí; las armas leen el resultado.
 */
import { clamp } from './util.js';
import { CAPS, PLAYER } from './balance.js';

/* Orden del panel y cómo se escribe cada una. pct: se muestra con %. */
export const STATS = [
  {id: 'maxHp', name: 'Vida máxima', icon: 'caldo', hint: 'Cuánto daño aguantas.'},
  {id: 'regen', name: 'Regeneración', icon: 'pan', hint: 'Vida que recuperas poco a poco.'},
  {id: 'lifesteal', name: 'Robo de vida', icon: 'manos', pct: true, hint: 'Probabilidad de curarte 1 al golpear.'},
  {id: 'damage', name: 'Daño', icon: 'chispas', pct: true, hint: 'Multiplica el daño de todas tus armas.'},
  {id: 'melee', name: 'Cuerpo a cuerpo', icon: 'hoz', hint: 'Daño de las armas de cuerpo a cuerpo.'},
  {id: 'ranged', name: 'A distancia', icon: 'honda', hint: 'Daño de las armas que disparan.'},
  {id: 'elemental', name: 'Elemental', icon: 'campana', hint: 'Daño del fuego, la sal y el agua bendita.'},
  {id: 'attackSpeed', name: 'Vel. de ataque', icon: 'radio', pct: true, hint: 'Cuánto tardan tus armas en volver a atacar.'},
  {id: 'crit', name: 'Crítico', icon: 'risa', pct: true, hint: 'Probabilidad de un golpe que multiplica el daño.'},
  {id: 'engineering', name: 'Ingenio', icon: 'espantallo', hint: 'Daño de lo que construyes: espantallos, colmenas, cruceiros.'},
  {id: 'range', name: 'Alcance', icon: 'gafas', hint: 'Hasta dónde llegan tus armas.'},
  {id: 'armor', name: 'Armadura', icon: 'zuecos', hint: 'Reduce el daño que recibes.'},
  {id: 'dodge', name: 'Evasión', icon: 'ruda', pct: true, hint: 'Probabilidad de que un golpe no te toque.'},
  {id: 'speed', name: 'Velocidad', icon: 'mecedora', pct: true, hint: 'Lo deprisa que te mueves.'},
  {id: 'luck', name: 'Suerte', icon: 'herradura', hint: 'Mejores objetos, más ofrendas y más café.'},
  {id: 'harvest', name: 'Cosecha', icon: 'cesta', hint: 'Cera que recibes al acabar cada ronda. Crece sola.'}
];
export const STAT = Object.fromEntries(STATS.map(s => [s.id, s]));
export const STAT_IDS = STATS.map(s => s.id);

export function blankStats() { return Object.fromEntries(STAT_IDS.map(id => [id, 0])); }

/* «+5 Vida máxima», «−3 % Velocidad». */
export function formatStat(id, value, {sign = true} = {}) {
  const s = STAT[id];
  const v = Math.round(value * 100) / 100;
  const txt = `${Math.abs(v)}`.replace('.', ',');
  const pre = sign ? (v > 0 ? '+' : v < 0 ? '−' : '') : (v < 0 ? '−' : '');
  return `${pre}${txt}${s?.pct ? ' %' : ''} ${s ? s.name : id}`;
}

/* Multiplicador del daño recibido: cada punto de armadura quita algo menos que el anterior. */
export function armorFactor(armor) {
  return armor >= 0 ? 1 / (1 + armor / 15) : 1 + Math.abs(armor) / 15;
}

/* Vida por segundo con una regeneración dada. */
export function regenPerSecond(regen) { return regen > 0 ? 0.12 + regen * 0.09 : 0; }

/* Lo que de verdad usa la simulación, con los topes aplicados. */
export function derived(st) {
  return {
    maxHp: Math.max(1, Math.round(st.maxHp)),
    hps: regenPerSecond(st.regen),
    lifesteal: clamp(st.lifesteal, 0, CAPS.lifesteal) / 100,
    damage: Math.max(0.05, 1 + st.damage / 100),
    attackSpeed: Math.max(0.4, 1 + Math.max(CAPS.attackSpeedMin, st.attackSpeed) / 100),
    crit: clamp(st.crit, 0, CAPS.crit) / 100,
    armor: armorFactor(st.armor),
    dodge: clamp(st.dodge, 0, CAPS.dodge) / 100,
    speed: PLAYER.speed * Math.max(0.35, 1 + Math.max(CAPS.speedMin, st.speed) / 100),
    luck: st.luck,
    range: st.range,
    harvest: Math.max(0, st.harvest)
  };
}
