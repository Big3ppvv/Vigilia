/*
 * Los números de la vigilia: cuánto dura cada ronda, cuánta Compaña viene,
 * cuánto aguanta, cuánto cuesta cada cosa en el puesto de Remedios y cómo
 * crece todo a lo largo de la noche. Para cambiar el equilibrio, este es el archivo.
 */
import { clamp } from './util.js';

/* La noche va de 00:00 a 06:00 en dieciocho rondas de veinte minutos: tres por hora. */
export const ROUNDS = 18;
export const MINUTES_PER_ROUND = 20;
export const BOSS_ROUND = 18;
/* Segundos que dura cada ronda: 20, 25, 30… hasta 60; la última, 90. */
export const roundTime = r => r >= ROUNDS ? 90 : Math.min(60, 15 + r * 5);

/* El atrio de la ermita: el recinto en el que se vela. */
export const ARENA = {left: -760, right: 760, top: -500, bottom: 500};
export const COFFIN = {x: 0, y: -592};
export const MAX_ENEMIES = 260;

/* Quien vela. speed en unidades de mundo por segundo. */
export const PLAYER = {
  speed: 225, accel: 26, radius: 12, pickup: 78,
  dashCd: 2.2, dashTime: 0.17, dashSpeed: 3.5, hurtInvuln: 0.45,
  weaponRing: 30, maxWeapons: 6
};

/* Cuánta luz (experiencia) pide cada nivel. Se sube durante la ronda y se elige al acabarla. */
export const xpFor = level => Math.round(8 + level * 5 + level * level * 0.9);

/* La economía de la cera: precios, tiradas y lo que vale una ofrenda. */
export const ECONOMY = {
  priceGrowth: 0.12,               // cada ronda, todo cuesta un 12 % más
  itemBase: [16, 32, 58, 96],      // objetos por rareza (I-IV)
  weaponBase: [18, 36, 66, 112],   // armas por nivel (I-IV)
  rerollBase: 1, rerollPerRound: 0.6, rerollStep: 1, // primera tirada y cuánto sube cada una
  sellRate: 0.3,                   // lo que te da Remedios por un arma
  upgradeReroll: [2, 1],           // repensar una mejora: base y subida por nivel
  harvestGrowth: 0.05,             // la cosecha crece un 5 % cada ronda
  meltPerPickup: 1,                // cera fundida que se suma a cada gota recogida
  crateChance: 0.012,              // probabilidad base de que caiga una ofrenda
  crateMax: 3,                     // como mucho, ofrendas por ronda (sin contar élites)
  cafeChance: 0.012                // un café del termo
};

/*
 * Rarezas (I-IV): desde qué ronda empiezan a salir, con qué probabilidad y
 * cuánto sube cada ronda. La suerte multiplica todas menos la común.
 */
export const RARITY = [
  {name: 'Común'},
  {name: 'Poco común', from: 2, start: 0.1, step: 0.035, max: 0.55},
  {name: 'Rara', from: 4, start: 0.035, step: 0.019, max: 0.32},
  {name: 'Legendaria', from: 8, start: 0.008, step: 0.008, max: 0.11}
];

/* Topes de las estadísticas. */
export const CAPS = {dodge: 60, crit: 100, lifesteal: 60, speedMin: -60, attackSpeedMin: -60};

/*
 * Las criaturas. hp, damage y speed son los de la primera ronda; SCALING los
 * hace crecer. value es la cera que dejan; from, la ronda en la que empiezan a venir.
 */
export const ENEMIES = {
  anima:     {from: 1,  weight: 30, hp: 4,   speed: 135, r: 10, damage: 1, value: 1, scale: 2, xp: 1},
  hermano:   {from: 2,  weight: 24, hp: 9,   speed: 82,  r: 13, damage: 2, value: 1, scale: 2, xp: 1},
  urco:      {from: 4,  weight: 12, hp: 12,  speed: 118, r: 14, damage: 3, value: 1, scale: 2, xp: 2},
  curuxa:    {from: 5,  weight: 10, hp: 9,   speed: 128, r: 12, damage: 2, value: 1, scale: 2, xp: 1},
  planidera: {from: 6,  weight: 9,  hp: 11,  speed: 72,  r: 13, damage: 2, value: 1, scale: 2, xp: 2},
  ahogado:   {from: 7,  weight: 10, hp: 30,  speed: 58,  r: 15, damage: 3, value: 2, scale: 2, xp: 2},
  trasno:    {from: 8,  weight: 9,  hp: 6,   speed: 210, r: 9,  damage: 1, value: 1, scale: 2, xp: 1},
  lavandeira:{from: 10, weight: 5,  hp: 22,  speed: 54,  r: 13, damage: 2, value: 2, scale: 2, xp: 3},
  espantajo: {from: 11, weight: 4,  hp: 90,  speed: 48,  r: 22, damage: 5, value: 4, scale: 2, xp: 4},
  nubeiro:   {from: 12, weight: 5,  hp: 20,  speed: 64,  r: 13, damage: 3, value: 2, scale: 2, xp: 3},
  lobishome: {from: 14, weight: 5,  hp: 40,  speed: 150, r: 16, damage: 4, value: 2, scale: 2, xp: 3},
  guia:      {from: 99, weight: 0,  hp: 24000, speed: 70, r: 30, damage: 9, value: 0, scale: 3, xp: 0}
};

/* Ronda a ronda, las criaturas aguantan más, hieren más y corren un poco más. */
export const SCALING = {
  hp: r => 1 + (r - 1) * 0.45 + (r - 1) ** 2 * 0.09,
  damage: r => 1 + (r - 1) * 0.3 + (r - 1) ** 2 * 0.012,
  speed: r => 1 + Math.min(0.28, (r - 1) * 0.016),
  value: r => 1 + Math.floor((r - 1) / 6) * 0.25
};

/* Cuántas criaturas quiere la ronda a la vez y cada cuánto llega un grupo. */
export const SPAWN = {
  population: r => Math.round(14 + r * 7 + (r > 10 ? (r - 10) * 5 : 0)),
  interval: r => clamp(1.7 - r * 0.055, 0.6, 1.7),
  group: r => [2 + Math.floor(r / 4), 4 + Math.floor(r / 2.4)],
  telegraph: 0.9,
  minDistance: 150
};

/* Rondas con algo especial: el difunto con nombre de cada hora, las hordas y la Guía. */
export const ELITE_ROUNDS = {3: 'peto', 6: 'urco', 9: 'lema', 12: 'curuxa', 15: 'sobra'};
export const HORDE_ROUNDS = [5, 8, 11, 14, 17];
export const ELITE = {
  peto:   {type: 'anima',   hp: 22,  damage: 1.6, size: 2.0, speed: 0.75},
  urco:   {type: 'urco',    hp: 22,  damage: 1.5, size: 1.6, speed: 0.95},
  lema:   {type: 'ahogado', hp: 18,  damage: 1.5, size: 1.5, speed: 0.95},
  curuxa: {type: 'curuxa',  hp: 24,  damage: 1.5, size: 1.7, speed: 0.9},
  sobra:  {type: 'hermano', hp: 26,  damage: 1.6, size: 1.6, speed: 0.9}
};

/* La dificultad de la vigilia: se desbloquea ganando en la anterior. */
export const DANGER = [
  {id: 0, name: 'Primera noche', note: 'La vigilia tal y como se cuenta.', hp: 1, damage: 1, speed: 1, elites: 1},
  {id: 1, name: 'Noche cerrada', note: 'La Compaña aguanta y hiere un 15 % más.', hp: 1.15, damage: 1.15, speed: 1, elites: 1},
  {id: 2, name: 'Noche de ánimas', note: '+30 % de aguante y daño. Corren más.', hp: 1.3, damage: 1.3, speed: 1.06, elites: 1.2},
  {id: 3, name: 'Noche sin fin', note: '+50 % de aguante y daño. Los difuntos con nombre no vienen solos.', hp: 1.5, damage: 1.5, speed: 1.1, elites: 1.5}
];

/* Habilidades de cada personaje (R): recarga en segundos y lo que hacen. */
export const ABILITY_BALANCE = {
  lucia: {cooldown: 14, radius: 175, damage: 10, stun: 1.1},
  julian: {cooldown: 16, radius: 135, life: 4.5, tick: 0.5, damage: 3, slow: 0.45},
  matilde: {cooldown: 20, radius: 170, heal: 0.3, knock: 420},
  tono: {cooldown: 18, life: 6, attackSpeed: 45, speed: 15},
  sabela: {cooldown: 14, radius: 110, root: 2.2, range: 230},
  anselmo: {cooldown: 22, execute: 0.22, damage: 18, radius: 420}
};

/* Una ronda equivale a veinte minutos de noche. */
export const clockAt = (round, progress) => (round - 1 + clamp(progress, 0, 1)) * MINUTES_PER_ROUND;
export const fmtClock = minutes => {
  const m = clamp(Math.floor(minutes), 0, 360);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
