/*
 * Los números de la noche: cuánto dura, qué criaturas vienen y cuánto aguantan,
 * qué pasa a cada hora y cómo se defiende el velatorio.
 * Para cambiar el equilibrio, este es el archivo.
 */
import { clamp } from './util.js';

/* La noche de Difuntos va de 00:00 a 06:00: cien segundos por hora. */
export const NIGHT = 600;
export const HOUR = 100;
export const BOSS_AT = 500;
export const MAX_ENEMIES = 240;
export const MAX_LEVEL = 5;
export const COFFIN = {x: 0, y: 0};

/* Acciones voluntarias: alcance y tiempo en segundos, sin valores en la UI. */
export const ABILITY_BALANCE = {
  lucia: {cooldown: 18, radius: 210, damage: 28, knock: 330},
  julian: {cooldown: 20, radius: 158, damage: 34, knock: 260, wardLife: 4.5, wardDamage: 6, wardTick: 0.5},
  matilde: {cooldown: 22, radius: 190, damage: 24, knock: 360, healing: 0.14}
};
export const RITUAL_RADIUS = 48;
export const RITUAL_CHANNEL = 3.6;
export const RITUAL_LIGHT_RADIUS = 105;
export const RITUAL_SITES = [
  {id: 'oeste', x: -320, y: 0},
  {id: 'norte', x: 0, y: -320},
  {id: 'este', x: 320, y: 0}
];

export const fmtClock = t => {
  const s = clamp(t, 0, NIGHT);
  const h = Math.floor(s / HOUR), m = Math.min(59, Math.floor((s % HOUR) * 0.6));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/* unlock en segundos de noche; value es la luz que dejan al irse. */
export const ENEMIES = {
  anima: {unlock: 0, weight: 30, hp: 12, speed: 60, r: 10, damage: 6, value: 1, scale: 2},
  hermano: {unlock: 0, weight: 44, hp: 24, speed: 34, r: 13, damage: 9, value: 1, scale: 2},
  urco: {unlock: 100, weight: 20, hp: 34, speed: 52, r: 14, damage: 11, value: 2, scale: 2},
  curuxa: {unlock: 150, weight: 15, hp: 26, speed: 58, r: 12, damage: 10, value: 2, scale: 2},
  ahogado: {unlock: 200, weight: 24, hp: 64, speed: 29, r: 15, damage: 13, value: 3, scale: 2},
  planidera: {unlock: 250, weight: 12, hp: 38, speed: 40, r: 13, damage: 8, value: 3, scale: 2},
  espantajo: {unlock: 400, weight: 7, hp: 200, speed: 22, r: 22, damage: 20, value: 7, scale: 2},
  guia: {unlock: 9999, weight: 0, hp: 9000, speed: 27, r: 30, damage: 24, value: 0, scale: 3}
};

/* Con las horas, las criaturas aguantan más, corren un poco más y hieren más. */
export const SCALING = {
  hp: t => 1 + t / 260 + (t / 420) ** 2,
  speed: t => 1 + t / 1300,
  damage: t => 1 + t / 600
};

/*
 * Cada hora es un acto. pop: cuántas criaturas quiere la noche al empezar y al
 * acabar la hora. processions: cada cuántos segundos sale una procesión hacia
 * el velatorio. tide, gust y dark son lo que distingue a esa hora.
 */
export const ACTS = [
  {pop: [10, 44]},
  {pop: [44, 78], processions: [36, 48], roads: 1},
  {pop: [78, 112], processions: [34, 46], roads: 1, tide: [8, 11]},
  {pop: [112, 146], processions: [34, 46], roads: 2, gust: 2, bias: {anima: 2.2}},
  {pop: [140, 176], processions: [32, 44], roads: 2, dark: 0.86},
  {pop: [84, 84]}
];

/* La procesión: cuántos hermanos van en fila y cuánto más aguantan que los sueltos. */
export const PROCESSION = {base: 3, perHour: 1, max: 8, hp: 1.5, speed: 40};

/*
 * Los difuntos con nombre: uno por hora, con más aguante y su propia manía.
 * El primero no toca los cirios; el que va a por ellos llega cuando ya se sabe velar.
 */
export const ELITE_PLAN = [
  {at: 55, id: 'peto', type: 'anima'},
  {at: 155, id: 'urco', type: 'urco'},
  {at: 255, id: 'lema', type: 'ahogado'},
  {at: 355, id: 'curuxa', type: 'curuxa'},
  {at: 425, id: 'sobra', type: 'hermano'}
];
export const ELITE = {hp: 9, damage: 1.4, speed: 0.92, size: 1.5, light: 12};

/* No se puede recordar todo en una noche: cuatro armas y cinco recuerdos. */
export const SLOTS = {arma: 4, recuerdo: 5};

/* El velatorio: los cirios, el alma de Amparo y el arrullo. */
export const VIGIL = {
  reach: 46,              // a qué distancia se enciende un cirio
  relight: 1.0,           // segundos que hay que quedarse junto a él
  snuff: 1.6,             // lo que tarda un hermano en apagarlo
  bossSnuff: 2.4,         // lo que tarda la Guía; con rabia, bossSnuffRage
  bossSnuffRage: 1.6,
  soulRise: 34,           // segundos a oscuras hasta que se la llevan
  soulRiseBoss: 14,
  soulFall: 14,
  healRadius: 130, healBase: 0.6, healPerCirio: 0.55,
  revive: 0.35,           // vida con la que te levanta un cirio
  lullCooldown: 38, lullFirst: 14, lullTime: 4, lullSlow: 0.35, lullBossSlow: 0.6, lullHurt: 1.25
};

/*
 * El Camposanto del Carmen. El recinto es lo que queda dentro del muro; margin
 * es cuánto deja ver la cámara al otro lado (al este, el mar y el faro).
 */
export const WORLD = {left: -1560, right: 1560, top: -1160, bottom: 1160, margin: {n: 250, s: 110, w: 230, e: 520}};
export const LIGHTHOUSE = {x: 1905, y: 420, lampY: -174};

/* Los cuatro cirios del velatorio, alrededor del ataúd. */
export const CIRIOS = [{x: -58, y: -30}, {x: 58, y: -30}, {x: -58, y: 38}, {x: 58, y: 38}];

/* Por dónde entra la Compaña: la ermita, la cancela, el portillo y la escalera del mar. */
export const ROADS = [
  {id: 'ermita', x: 0, y: -1120, dx: 0, dy: -1},
  {id: 'cancela', x: -1500, y: 0, dx: -1, dy: 0},
  {id: 'portillo', x: 0, y: 1120, dx: 0, dy: 1},
  {id: 'mar', x: 1500, y: 0, dx: 1, dy: 0}
];
