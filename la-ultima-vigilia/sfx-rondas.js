/*
 * Los sonidos de la vigilia por rondas: armas nuevas, la cera, el puesto de
 * Remedios, las criaturas nuevas y las habilidades. Mismas primitivas que
 * sfx.js: ruido filtrado, tonos, cuerda pulsada, golpe grave y campana.
 */
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84, 86, 89];

const whoosh = (a, o, up = true, vol = 0.07) => {
  const out = a.out(a.sfxBus, o.pan, 0.08);
  a.noiseShot(out, {dur: 0.14, f0: up ? 700 : 2600, f1: up ? 3200 : 600, q: 1.3, vol, attack: 0.01});
};

export const ROUND_SFX = {
  /* ---------- rondas y progreso ---------- */
  ronda(a, o) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.4);
    a.thump(out, {when: t, vol: 0.16});
    a.thump(out, {when: t + 0.18, f0: 80, vol: 0.1});
    [62, 69, 74].forEach((n, i) => a.pluck(n + (o.round > 12 ? 2 : 0), {when: t + 0.05 + i * 0.07, vol: 0.12, bus: a.sfxBus, send: 0.4}));
  },
  rondaFin(a) {
    const t = a.ctx.currentTime;
    [62, 66, 69, 74, 78].forEach((n, i) => a.pluck(n, {when: t + i * 0.06, vol: 0.13, bus: a.sfxBus, send: 0.5, bright: 3600}));
    a.bellStrike(587.3, {when: t + 0.05, vol: 0.06, decay: 2.2, send: 0.6});
  },
  nivel(a) {
    if (!a.limit('nivel', 0.2)) return;
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.35);
    [74, 78, 81, 86].forEach((n, i) => a.tone(out, {type: 'triangle', f0: midiHz(n), dur: 0.16, vol: 0.05, when: t + i * 0.055}));
    a.noiseShot(out, {dur: 0.4, type: 'highpass', f0: 5000, vol: 0.02, attack: 0.05, when: t + 0.1});
  },
  cera(a, o) {
    a.combo = Math.min(PENTA.length - 1, (o.combo || 0) % PENTA.length);
    const out = a.out(a.sfxBus, 0, 0.2);
    a.tone(out, {type: 'sine', f0: midiHz(PENTA[a.combo] + 12), dur: 0.08, vol: 0.026, attack: 0.002});
    a.tone(out, {type: 'triangle', f0: midiHz(PENTA[a.combo] + 24), dur: 0.04, vol: 0.008, attack: 0.002});
  },
  ofrendaCae(a, o) {
    const out = a.out(a.sfxBus, o.pan, 0.3), t = a.ctx.currentTime;
    a.thump(out, {when: t, f0: 140, f1: 70, vol: 0.08});
    a.tinkle(out, {when: t + 0.05, f: 2093, vol: 0.03});
  },
  ofrenda(a) {
    const t = a.ctx.currentTime;
    [69, 76, 81].forEach((n, i) => a.pluck(n, {when: t + i * 0.08, vol: 0.12, bus: a.sfxBus, send: 0.5, bright: 3800}));
  },
  esquivaGolpe(a) {
    if (!a.limit('esquivaGolpe', 0.15)) return;
    whoosh(a, {pan: 0}, true, 0.05);
    a.tinkle(a.out(a.sfxBus, 0, 0.3), {f: 2637, vol: 0.02, decay: 0.4});
  },

  /* ---------- armas ---------- */
  estocada(a, o) { if (a.limit('estocada', 0.06)) whoosh(a, o, true, 0.06); },
  barrido(a, o) { if (a.limit('barrido', 0.08)) whoosh(a, o, false, 0.07); },
  chispas(a, o) { a.sfx('chispa', o); },
  escopeta(a, o) { a.sfx('sal', o); },
  honda(a, o) {
    if (!a.limit('honda', 0.08)) return;
    const out = a.out(a.sfxBus, o.pan, 0.06);
    a.tone(out, {type: 'triangle', f0: 260, f1: 120, dur: 0.09, vol: 0.05});
    a.noiseShot(out, {dur: 0.06, f0: 1400, f1: 3000, q: 1.2, vol: 0.04});
  },
  arpon(a, o) {
    if (!a.limit('arpon', 0.1)) return;
    const out = a.out(a.sfxBus, o.pan, 0.1);
    a.thump(out, {f0: 110, f1: 50, dur: 0.12, vol: 0.1});
    a.noiseShot(out, {dur: 0.2, f0: 500, f1: 2400, q: 1.5, vol: 0.06, attack: 0.01});
  },
  vieiras(a, o) {
    if (!a.limit('vieiras', 0.08)) return;
    const out = a.out(a.sfxBus, o.pan, 0.2);
    a.tone(out, {type: 'triangle', f0: 1760, f1: 1500, dur: 0.06, vol: 0.02});
    a.noiseShot(out, {dur: 0.08, f0: 2400, f1: 3600, q: 1, vol: 0.03});
  },
  pandeireta(a, o) {
    if (!a.limit('pandeireta', 0.1)) return;
    const out = a.out(a.sfxBus, o.pan, 0.2), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.04, type: 'lowpass', f0: 600, vol: 0.06});
    for (let i = 0; i < 4; i++) a.noiseShot(out, {dur: 0.05, type: 'highpass', f0: 6500, vol: 0.03, when: t + 0.02 + i * 0.03});
  },
  foguetes(a, o) {
    if (!a.limit('foguetes', 0.1)) return;
    const out = a.out(a.sfxBus, o.pan, 0.15);
    a.noiseShot(out, {dur: 0.35, type: 'highpass', f0: 1800, f1: 5200, vol: 0.05, attack: 0.02});
  },
  gaita(a, o) {
    if (!a.limit('gaita', 0.2)) return;
    const out = a.out(a.sfxBus, o.pan, 0.35), t = a.ctx.currentTime, n = [74, 76, 78, 81][o.tier || 0];
    a.tone(out, {type: 'sawtooth', f0: midiHz(50), dur: 0.42, vol: 0.016, attack: 0.03});
    a.tone(out, {type: 'square', f0: midiHz(n), dur: 0.16, vol: 0.02, attack: 0.01, vib: [6, 8]});
    a.tone(out, {type: 'square', f0: midiHz(n - 3), dur: 0.2, vol: 0.018, attack: 0.01, when: t + 0.12, vib: [6, 8]});
  },
  agua(a, o) {
    if (!a.limit('agua', 0.1)) return;
    a.tinkle(a.out(a.sfxBus, o.pan, 0.2), {f: 1975, vol: 0.02, decay: 0.3});
  },
  frasco(a, o) {
    const out = a.out(a.sfxBus, o.pan, 0.25), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.12, type: 'highpass', f0: 3200, vol: 0.06});
    for (let i = 0; i < 3; i++) a.tinkle(out, {when: t + 0.02 + i * 0.04, f: rand(2400, 3600), vol: 0.018, decay: 0.25});
    a.noiseShot(out, {dur: 0.3, type: 'highpass', f0: 1400, f1: 2600, vol: 0.03, when: t + 0.05});
  },
  campanilla(a, o) {
    if (!a.limit('campanilla', 0.15)) return;
    a.bellStrike(1046.5 + (o.tier || 0) * 60, {vol: 0.05, decay: 1.2, send: 0.4});
  },
  cirio(a, o) {
    const out = a.out(a.sfxBus, o.pan, 0.1);
    a.noiseShot(out, {dur: 0.3, type: 'lowpass', f0: 500, f1: 1100, vol: 0.035, attack: 0.05});
  },
  explosion(a, o) {
    if (!a.limit('explosion', 0.07)) return;
    const out = a.out(a.sfxBus, o.pan, 0.3), t = a.ctx.currentTime;
    a.thump(out, {when: t, f0: 90, f1: 34, dur: 0.3, vol: 0.2});
    a.noiseShot(out, {dur: 0.4, type: 'lowpass', f0: 2600, f1: 200, vol: 0.13, attack: 0.002});
    a.noiseShot(out, {dur: 0.08, type: 'highpass', f0: 3000, vol: 0.05, when: t + 0.01});
  },
  paja(a, o) { if (a.limit('paja', 0.15)) a.noiseShot(a.out(a.sfxBus, o.pan, 0.05), {dur: 0.08, f0: 1600, f1: 900, q: 1, vol: 0.03}); },
  abellas(a, o) {
    if (!a.limit('abellas', 0.4)) return;
    a.tone(a.out(a.sfxBus, o.pan, 0.1), {type: 'sawtooth', f0: 210, f1: 240, dur: 0.5, vol: 0.012, attack: 0.05, vib: [40, 12]});
  },

  /* ---------- criaturas nuevas ---------- */
  trasno(a, o) {
    if (!a.limit('trasno', 0.25)) return;
    const out = a.out(a.sfxBus, o.pan, 0.15), t = a.ctx.currentTime;
    [88, 91, 86, 93].forEach((n, i) => a.tone(out, {type: 'triangle', f0: midiHz(n), dur: 0.05, vol: 0.018, when: t + i * 0.05}));
  },
  lavandeira(a, o) {
    if (!a.limit('lavandeira', 0.6)) return;
    const out = a.out(a.sfxBus, o.pan, 0.6), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.12, type: 'lowpass', f0: 900, f1: 300, vol: 0.06});
    a.tone(out, {type: 'sine', f0: 523, f1: 494, dur: 0.9, vol: 0.02, attack: 0.2, when: t + 0.1, vib: [5, 10]});
  },
  trueno(a, o) {
    if (!a.limit('trueno', 0.12)) return;
    const out = a.out(a.sfxBus, o.pan, 0.5), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.06, type: 'highpass', f0: 2600, vol: 0.12, attack: 0.001});
    a.noiseShot(out, {dur: 1.1, type: 'lowpass', f0: 500, f1: 60, vol: 0.16, attack: 0.02, when: t + 0.03});
    a.thump(out, {when: t, f0: 70, f1: 30, dur: 0.5, vol: 0.12});
  },
  golpeCruz(a, o) {
    const out = a.out(a.sfxBus, o.pan, 0.4), t = a.ctx.currentTime;
    a.thump(out, {when: t, f0: 80, f1: 30, dur: 0.4, vol: 0.22});
    a.bellStrike(110, {when: t, vol: 0.1, decay: 2.5, send: 0.6});
  },
  horda(a) {
    const out = a.out(a.sfxBus, 0, 0.5), t = a.ctx.currentTime;
    for (let i = 0; i < 6; i++) a.thump(out, {when: t + i * 0.09, f0: 90 - i * 4, vol: 0.06 + i * 0.012});
    a.tone(out, {type: 'triangle', f0: midiHz(62), dur: 1.2, vol: 0.03, attack: 0.4, vib: [5, 6]});
    a.tone(out, {type: 'triangle', f0: midiHz(65), dur: 1.2, vol: 0.025, attack: 0.4, vib: [5, 6]});
  },

  /* ---------- el puesto de Remedios ---------- */
  tienda(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.4);
    a.tinkle(out, {when: t, f: 2637, vol: 0.04, decay: 0.8});
    a.tinkle(out, {when: t + 0.12, f: 3136, vol: 0.03, decay: 0.8});
    a.pluck(62, {when: t + 0.05, vol: 0.1, bus: a.sfxBus, send: 0.5});
  },
  compra(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.25);
    a.noiseShot(out, {dur: 0.03, type: 'highpass', f0: 4000, vol: 0.05});
    a.pluck(81, {when: t + 0.02, vol: 0.12, bus: a.sfxBus, send: 0.3, bright: 4200});
    a.pluck(86, {when: t + 0.09, vol: 0.12, bus: a.sfxBus, send: 0.3, bright: 4200});
  },
  venta(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.2);
    for (let i = 0; i < 3; i++) a.tinkle(out, {when: t + i * 0.05, f: 2349 + i * 200, vol: 0.025, decay: 0.3});
  },
  tirada(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.1);
    for (let i = 0; i < 5; i++) a.noiseShot(out, {dur: 0.025, f0: rand(1800, 3200), q: 2, vol: 0.035, when: t + i * 0.035});
  },
  candado(a) { a.tone(a.out(a.sfxBus, 0, 0.05), {type: 'square', f0: 900, f1: 600, dur: 0.04, vol: 0.02}); },
  candadoAbre(a) { a.tone(a.out(a.sfxBus, 0, 0.05), {type: 'square', f0: 600, f1: 900, dur: 0.04, vol: 0.02}); },
  juntar(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.4);
    a.noiseShot(out, {dur: 0.4, f0: 400, f1: 3200, q: 2, vol: 0.05, attack: 0.1});
    a.bellStrike(784, {when: t + 0.32, vol: 0.07, decay: 2, send: 0.6});
    [74, 81].forEach((n, i) => a.pluck(n, {when: t + 0.34 + i * 0.07, vol: 0.12, bus: a.sfxBus, send: 0.5}));
  },
  sinCera(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.1);
    a.tone(out, {type: 'square', f0: 220, dur: 0.07, vol: 0.02, when: t});
    a.tone(out, {type: 'square', f0: 185, dur: 0.1, vol: 0.02, when: t + 0.08});
  },
  elegir(a, o) {
    const t = a.ctx.currentTime, up = (o.tier || 0) * 2;
    [62, 66, 69, 74].forEach((n, i) => a.pluck(n + up, {when: t + i * 0.05, vol: 0.12, bus: a.sfxBus, send: 0.5}));
    if (o.tier >= 2) a.bellStrike(587.3 * (o.tier === 3 ? 1.5 : 1), {when: t + 0.1, vol: 0.05, decay: 2, send: 0.7});
  },
  ofrendaAbre(a, o) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.3);
    a.noiseShot(out, {dur: 0.2, f0: 900, f1: 2200, q: 0.8, vol: 0.04, attack: 0.04});
    const notes = [[69], [69, 74], [69, 74, 78], [69, 74, 78, 81, 86]][o.tier || 0];
    notes.forEach((n, i) => a.pluck(n, {when: t + 0.15 + i * 0.07, vol: 0.13, bus: a.sfxBus, send: 0.55, bright: 3800}));
  },
  salir(a) {
    whoosh(a, {pan: 0}, true, 0.05);
    a.pluck(57, {when: a.ctx.currentTime + 0.05, vol: 0.1, bus: a.sfxBus, send: 0.4});
  },

  /* ---------- habilidades ---------- */
  habilidad_lucia(a) {
    const out = a.out(a.sfxBus, 0, 0.4), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.25, type: 'highpass', f0: 2400, f1: 7000, vol: 0.09, attack: 0.005});
    a.tone(out, {type: 'triangle', f0: 1568, f1: 2093, dur: 0.3, vol: 0.04, when: t + 0.02});
  },
  habilidad_julian(a) {
    const out = a.out(a.sfxBus, 0, 0.4), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.35, type: 'lowpass', f0: 5200, f1: 500, vol: 0.12, attack: 0.002});
    a.thump(out, {when: t, f0: 100, f1: 40, vol: 0.15});
    for (let i = 0; i < 4; i++) a.noiseShot(out, {dur: 0.03, type: 'highpass', f0: 4800, vol: 0.02, when: t + 0.1 + i * 0.04});
  },
  habilidad_matilde(a) {
    const t = a.ctx.currentTime;
    [62, 66, 69, 74].forEach((n, i) => a.pluck(n, {when: t + i * 0.09, vol: 0.16, bus: a.sfxBus, send: 0.7}));
    a.bellStrike(293.7, {when: t, vol: 0.09, decay: 3.5, send: 0.8});
  },
  habilidad_tono(a) {
    const out = a.out(a.sfxBus, 0, 0.4), t = a.ctx.currentTime;
    a.tone(out, {type: 'sawtooth', f0: midiHz(50), dur: 1.2, vol: 0.02, attack: 0.05});
    [74, 76, 78, 81, 83, 86].forEach((n, i) => a.tone(out, {type: 'square', f0: midiHz(n), dur: 0.11, vol: 0.022, when: t + i * 0.09, vib: [6, 8]}));
  },
  habilidad_sabela(a) {
    const out = a.out(a.sfxBus, 0, 0.2), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.3, f0: 600, f1: 1800, q: 1, vol: 0.07, attack: 0.02});
    a.tone(out, {type: 'sawtooth', f0: 140, f1: 170, dur: 0.3, vol: 0.015, when: t + 0.2, vib: [30, 10]});
  },
  habilidad_anselmo(a) {
    const out = a.out(a.sfxBus, 0, 0.7), t = a.ctx.currentTime;
    a.bellStrike(146.8, {when: t, vol: 0.18, decay: 5, send: 0.8});
    a.tone(out, {type: 'triangle', f0: midiHz(62), dur: 1.4, vol: 0.03, attack: 0.3});
    a.tone(out, {type: 'triangle', f0: midiHz(69), dur: 1.4, vol: 0.025, attack: 0.3});
    a.tone(out, {type: 'triangle', f0: midiHz(74), dur: 1.4, vol: 0.02, attack: 0.3});
  }
};
