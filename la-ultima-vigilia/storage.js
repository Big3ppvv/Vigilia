/*
 * Lo que se guarda en este navegador: ajustes, progreso entre noches y la
 * partida a medias (se guarda al entrar en el puesto de Remedios). El juego
 * funciona igual si el almacenamiento no está disponible.
 */
const PREFIX = 'vigilia3.';

export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(PREFIX + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
    catch { /* Sin almacenamiento: se sigue jugando. */ }
  },
  remove(key) {
    try { localStorage.removeItem(PREFIX + key); }
    catch { /* nada */ }
  }
};

/* Ajustes: los de esta versión o, si no hay, los de la anterior. */
export function loadSettings(reducedMotion) {
  const defaults = {muted: false, volume: 0.8, music: 0.85, sfx: 1, amb: 0.8,
    shake: !reducedMotion, flashes: !reducedMotion, numbers: true, weather: !reducedMotion, softDark: false};
  let saved = store.get('settings', null);
  if (!saved) { try { saved = JSON.parse(localStorage.getItem('vigilia2.settings')); } catch { saved = null; } }
  if (!saved || typeof saved !== 'object') return defaults;
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean' && typeof saved[key] === 'boolean') defaults[key] = saved[key];
    else if (typeof defaults[key] === 'number' && Number.isFinite(saved[key])) defaults[key] = Math.max(0, Math.min(1, saved[key]));
  }
  return defaults;
}

/* Lo que se recuerda entre noches. */
export function loadProgress() {
  const p = store.get('progress', {}) || {};
  const list = v => Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  return {
    nights: Array.isArray(p.nights) ? p.nights.slice(-80) : [],
    maxRound: Number.isFinite(p.maxRound) ? p.maxRound : 0,
    wins: obj(p.wins), dawns: obj(p.dawns), best: obj(p.best),
    found: {weapons: list(p.found?.weapons), items: list(p.found?.items), creatures: list(p.found?.creatures), elites: list(p.found?.elites)}
  };
}
