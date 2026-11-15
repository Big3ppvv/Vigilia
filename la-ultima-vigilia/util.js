/* Herramientas pequeñas que usa todo el juego. */
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const lerp = (a, b, t) => a + (b - a) * t;
