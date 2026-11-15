/*
 * Los números de la noche: cuánto dura, qué criaturas vienen y cuánto aguantan.
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
  guia: {unlock: 9999, weight: 0, hp: 2700, speed: 27, r: 30, damage: 24, value: 0, scale: 3}
};

/*
 * El Camposanto del Carmen. El recinto es lo que queda dentro del muro; margin
 * es cuánto deja ver la cámara al otro lado (al este, el mar y el faro).
 */
export const WORLD = {left: -1560, right: 1560, top: -1160, bottom: 1160, margin: {n: 250, s: 110, w: 230, e: 520}};
export const LIGHTHOUSE = {x: 1905, y: 420, lampY: -168};

/* Los cuatro cirios del velatorio, alrededor del ataúd. */
export const CIRIOS = [{x: -58, y: -30}, {x: 58, y: -30}, {x: -58, y: 38}, {x: 58, y: 38}];
