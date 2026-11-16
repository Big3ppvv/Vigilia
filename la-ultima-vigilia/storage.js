/* Almacenamiento compatible con las noches de la versión anterior. */
export const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem('vigilia2.' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('vigilia2.' + key, JSON.stringify(value)); }
    catch { /* El juego también funciona sin almacenamiento. */ }
  }
};

export function loadSettings(reducedMotion) {
  const defaults = {muted: false, volume: 0.8, music: 0.75, ambience: 0.7, effects: 0.85,
    shake: !reducedMotion, flashes: !reducedMotion, numbers: false, softDark: false};
  const saved = store.get('settings', {});
  if (!saved || typeof saved !== 'object') return defaults;
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean' && typeof saved[key] === 'boolean') defaults[key] = saved[key];
    else if (typeof defaults[key] === 'number' && Number.isFinite(saved[key])) defaults[key] = Math.max(0, Math.min(1, saved[key]));
  }
  return defaults;
}

export function loadFound() {
  const saved = store.get('found', {}) || {};
  return {memories: Array.isArray(saved.memories) ? saved.memories : [],
    creatures: Array.isArray(saved.creatures) ? saved.creatures : [],
    dawns: saved.dawns && typeof saved.dawns === 'object' ? saved.dawns : {},
    freed: Number.isFinite(saved.freed) ? saved.freed : 0};
}
