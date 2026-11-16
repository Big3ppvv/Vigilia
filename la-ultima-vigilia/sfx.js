/*
 * Los efectos de sonido, uno por nombre. Cada receta recibe el motor (a) y sus
 * opciones (o): pan de -1 a 1 y lo que necesite. Todos se hacen con ruido
 * filtrado, tonos, cuerda pulsada y campana; no hay ningún archivo.
 */
import { NANA } from './music.js';

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84];

/* Cómo suena al deshacerse cada criatura. */
const DEATHS = {
  anima(a, out) {
    // Un suspiro que se va hacia arriba.
    a.noiseShot(out, {dur: 0.26, f0: 1700, f1: 700, q: 1.2, vol: 0.04, attack: 0.02});
    a.tone(out, {f0: rand(820, 900), f1: 1240, dur: 0.2, vol: 0.012});
  },
  hermano(a, out) {
    // La vela se apaga y el hábito cae.
    a.noiseShot(out, {dur: 0.2, type: 'highpass', f0: 2600, f1: 1400, q: 0.5, vol: 0.04, attack: 0.02});
    a.noiseShot(out, {dur: 0.09, type: 'lowpass', f0: 320, f1: 140, vol: 0.05, attack: 0.004});
  },
  urco(a, out, t) {
    a.tone(out, {type: 'sawtooth', f0: rand(480, 540), f1: 240, dur: 0.16, vol: 0.022});
    for (let i = 0; i < 4; i++) a.tone(out, {type: 'square', f0: rand(2200, 3100), dur: 0.02, vol: 0.008, when: t + 0.05 + i * rand(0.035, 0.06)});
  },
  curuxa(a, out) {
    a.tone(out, {f0: 520, f1: 300, dur: 0.18, vol: 0.03, vib: [9, 14]});
    a.noiseShot(out, {dur: 0.12, type: 'highpass', f0: 3600, vol: 0.02, attack: 0.01});
  },
  ahogado(a, out) {
    a.tone(out, {f0: 210, f1: 88, dur: 0.3, vol: 0.05, vib: [18, 28]});
    a.noiseShot(out, {dur: 0.22, type: 'highpass', f0: 1500, f1: 3200, vol: 0.035});
  },
  planidera(a, out) {
    a.tone(out, {type: 'triangle', f0: 700, f1: 350, dur: 0.22, vol: 0.03, vib: [11, 24]});
  },
  espantajo(a, out, t) {
    a.noiseShot(out, {dur: 0.3, f0: 3200, f1: 1800, q: 0.8, vol: 0.05, attack: 0.01});
    a.noiseShot(out, {dur: 0.03, type: 'highpass', f0: 2000, vol: 0.09, attack: 0.001, when: t + 0.04});
    a.tone(out, {f0: 150, f1: 60, dur: 0.14, vol: 0.07, when: t + 0.04});
  }
};

/* El golpe suena al material del arma: brasa, sal o nácar. */
const HITS = {
  ember(a, out) { a.noiseShot(out, {dur: 0.05, type: 'highpass', f0: 5200, vol: 0.018, attack: 0.002}); },
  salt(a, out) { a.noiseShot(out, {dur: 0.06, f0: 6200, f1: 3200, q: 2, vol: 0.02, attack: 0.002}); },
  sacred(a, out) { a.tone(out, {f0: rand(1280, 1360), dur: 0.11, vol: 0.011}); a.tone(out, {f0: rand(1930, 2010), dur: 0.07, vol: 0.005}); }
};

/* La voz de cada cual mientras se escribe su frase: tono, forma y temblor. */
const VOICES = {
  'Lucía': {f: 330, type: 'triangle', vol: 0.02},
  'Julián': {f: 152, type: 'triangle', vol: 0.028},
  'Matilde': {f: 262, type: 'triangle', vol: 0.02, vib: [13, 9]},
  'Amparo': {f: 415, type: 'sine', vol: 0.016, send: 0.5},
  'Carmela': {f: 196, type: 'square', vol: 0.009, send: 0.6}
};

export const SFX = {
  /* ---------- armas ---------- */
  chispa(a, o) {
    if (!a.limit('chispa', 0.07)) return;
    const out = a.out(a.sfxBus, o.pan, 0.08);
    // El rasgueo de la cerilla y la llama que sale.
    a.noiseShot(out, {dur: 0.05, f0: 3200, f1: 2200, q: 1.5, vol: 0.07});
    a.tone(out, {type: 'triangle', f0: rand(1000, 1250), f1: 620, dur: 0.07, vol: 0.03});
    a.noiseShot(out, {dur: 0.11, type: 'lowpass', f0: 700, f1: 1500, vol: 0.02, attack: 0.02});
  },
  sal(a, o) {
    if (!a.limit('sal', 0.12)) return;
    const out = a.out(a.sfxBus, o.pan, 0.14), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.16, type: 'lowpass', f0: 5200, f1: 700, q: 0.7, vol: 0.12, attack: 0.002});
    a.tone(out, {f0: 120, f1: 48, dur: 0.12, vol: 0.12});
    // Los granos que llueven después.
    a.noiseShot(out, {dur: 0.2, type: 'highpass', f0: 5600, vol: 0.022, attack: 0.03, when: t + 0.07});
  },
  campana(a) {
    if (!a.limit('campana', 0.3)) return;
    a.bellStrike(rand(640, 680), {vol: 0.06, decay: 1.9, send: 0.35});
  },
  golpe(a, o) {
    if (!a.limit('golpe', 0.05)) return;
    const out = a.out(a.sfxBus, o.pan, 0);
    a.tone(out, {f0: rand(170, 220), f1: 80, dur: 0.06, vol: o.crit ? 0.07 : 0.045});
    HITS[o.tone]?.(a, out);
    if (o.crit) a.tone(out, {type: 'triangle', f0: 1480, f1: 1900, dur: 0.07, vol: 0.016});
  },
  muerte(a, o) {
    if (!a.limit('muerte', 0.045)) return;
    const out = a.out(a.sfxBus, o.pan, 0.16);
    (DEATHS[o.type] || DEATHS.hermano)(a, out, a.ctx.currentTime);
  },
  risa(a, o) {
    if (!a.limit('risa', 0.4)) return;
    const t = a.ctx.currentTime;
    [69, 74, 78, 81].forEach((n, i) => a.pluck(n, {when: t + i * 0.055, vol: 0.09, pan: o.pan, send: 0.4, bus: a.sfxBus, bright: 3600}));
  },

  /* ---------- quien vela ---------- */
  herida(a) {
    if (!a.limit('herida', 0.2)) return;
    const out = a.out(a.sfxBus, 0, 0.15);
    a.tone(out, {f0: 120, f1: 44, dur: 0.26, vol: 0.32});
    a.noiseShot(out, {dur: 0.14, type: 'lowpass', f0: 900, f1: 200, vol: 0.14});
  },
  esquiva(a, o) {
    const out = a.out(a.sfxBus, o.pan, 0.2);
    a.noiseShot(out, {dur: 0.24, f0: 380, f1: 2600, q: 1.2, vol: 0.06, attack: 0.03});
  },
  paso(a, o) {
    if (!a.limit('paso', 0.2)) return;
    const out = a.out(a.sfxBus, rand(-0.12, 0.12), 0.05), t = a.ctx.currentTime;
    if (o.surface === 'grava') {
      a.noiseShot(out, {dur: 0.06, f0: rand(2200, 2900), q: 1.4, vol: 0.016, attack: 0.003});
      a.noiseShot(out, {dur: 0.04, f0: rand(3400, 4200), q: 2, vol: 0.009, attack: 0.002, when: t + 0.03});
    } else if (o.surface === 'piedra') a.noiseShot(out, {dur: 0.035, type: 'lowpass', f0: 1500, f1: 500, vol: 0.02, attack: 0.002});
    else if (o.surface === 'agua') a.noiseShot(out, {dur: 0.1, type: 'highpass', f0: 1600, f1: 3000, vol: 0.022, attack: 0.008});
    else a.noiseShot(out, {dur: 0.06, type: 'lowpass', f0: 700, f1: 300, vol: 0.011, attack: 0.008});
  },
  luz(a, o) {
    if (!a.limit('luz', 0.035)) return;
    a.combo = Math.min(PENTA.length - 1, a.combo + 1);
    a.comboClock = 0.55;
    const out = a.out(a.sfxBus, (o.pan || 0) * 0.5, 0.25);
    a.tone(out, {type: 'sine', f0: midiHz(PENTA[a.combo] + 12), dur: 0.11, vol: 0.022, attack: 0.003});
  },
  cafe(a) {
    const out = a.out(a.sfxBus, 0, 0.3), t = a.ctx.currentTime;
    a.tone(out, {type: 'sine', f0: 660, f1: 990, dur: 0.18, vol: 0.05});
    a.tone(out, {type: 'sine', f0: 990, dur: 0.25, vol: 0.03, when: t + 0.09});
  },
  recuerdo(a) { a.memoryMotif(); },
  recordatorio(a) {
    const out = a.out(a.sfxBus, 0, 0.3), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.05, type: 'highpass', f0: 4200, vol: 0.03, attack: 0.002});
    a.pluck(69, {when: t + 0.04, vol: 0.12, bus: a.sfxBus, send: 0.5});
    a.pluck(74, {when: t + 0.16, vol: 0.12, bus: a.sfxBus, send: 0.5});
  },
  rincon(a) {
    // Un rincón vuelve entero: el arranque de la nana, con su bajo y una campana lejos.
    const t = a.ctx.currentTime + 0.05;
    for (let k = 0; k < 5; k++) a.pluck(NANA[k][0] + 12, {when: t + k * 0.2, vol: 0.13, pan: 0.15, send: 0.6, bus: a.sfxBus, bright: 3400});
    [50, 57, 62].forEach((n, i) => a.pluck(n, {when: t + i * 0.07, vol: 0.12, pan: -0.15, send: 0.5, bus: a.sfxBus}));
    a.bellStrike(293.7, {when: t + 0.1, vol: 0.05, decay: 3.2, send: 0.8});
  },

  /* ---------- el velatorio ---------- */
  cerilla(a) {
    if (!a.limit('cerilla', 0.5)) return;
    const out = a.out(a.sfxBus, 0, 0.1), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.09, type: 'highpass', f0: 3200, vol: 0.04, attack: 0.004});
    a.noiseShot(out, {dur: 0.3, f0: 1200, f1: 600, q: 0.8, vol: 0.02, attack: 0.05, when: t + 0.07});
  },
  cirioPrende(a, o) {
    const out = a.out(a.sfxBus, o.pan, 0.4), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.26, type: 'lowpass', f0: 400, f1: 1300, vol: 0.05, attack: 0.04});
    a.pluck(62, {when: t + 0.03, vol: 0.13, pan: o.pan, bus: a.sfxBus, send: 0.5});
    a.pluck(69, {when: t + 0.12, vol: 0.11, pan: o.pan, bus: a.sfxBus, send: 0.5});
  },
  cirioFuera(a, o) {
    if (!a.limit('cirioFuera', 0.15)) return;
    const out = a.out(a.sfxBus, o.pan, 0.45), t = a.ctx.currentTime;
    // Un soplo, y dos notas que bajan medio tono.
    a.noiseShot(out, {dur: 0.32, f0: 900, f1: 300, q: 0.9, vol: 0.06, attack: 0.02});
    a.tone(out, {type: 'triangle', f0: 440, dur: 0.22, vol: 0.03, when: t + 0.05});
    a.tone(out, {type: 'triangle', f0: 415.3, dur: 0.4, vol: 0.03, when: t + 0.24});
  },
  levanta(a) {
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.5);
    a.noiseShot(out, {dur: 0.7, type: 'lowpass', f0: 200, f1: 2400, vol: 0.08, attack: 0.3});
    [50, 57, 62, 65, 69].forEach((n, i) => a.pluck(n, {when: t + 0.1 + i * 0.07, vol: 0.16, bus: a.sfxBus, send: 0.6}));
    a.bellStrike(293.7, {when: t + 0.12, vol: 0.09, decay: 4, send: 0.8});
  },
  arrullo(a, o) {
    a.hummed(o.voice);
    const out = a.out(a.sfxBus, 0, 0.6);
    a.noiseShot(out, {dur: 0.9, type: 'lowpass', f0: 300, f1: 900, vol: 0.03, attack: 0.3});
  },
  alma(a, o) {
    // Algo tira de Amparo: un grave con un batido que no descansa.
    const out = a.out(a.sfxBus, 0, 0.4), vol = 0.05 + 0.07 * (o.level || 0);
    a.tone(out, {f0: 73.4, f1: 65, dur: 0.42, vol});
    a.tone(out, {f0: 77.8, dur: 0.34, vol: vol * 0.45});
  },
  procesion(a, o) {
    // La campanilla de la Compaña, tres veces, por donde viene.
    const out = a.out(a.sfxBus, o.pan, 0.55), t = a.ctx.currentTime;
    for (let i = 0; i < 3; i++) a.tinkle(out, {when: t + i * 0.62, f: 1568, vol: 0.045});
    a.thump(out, {when: t + 0.1, vol: 0.09});
  },
  racha(a) {
    const out = a.out(a.sfxBus, 0, 0.3), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 1.1, f0: 300, f1: 1500, q: 0.7, vol: 0.12, attack: 0.5});
    a.noiseShot(out, {dur: 1.6, f0: 1500, f1: 380, q: 0.7, vol: 0.1, attack: 0.05, when: t + 1});
  },
  charco(a, o) {
    if (!a.limit('charco', 0.3)) return;
    const out = a.out(a.sfxBus, o.pan, 0.3), t = a.ctx.currentTime;
    a.tone(out, {f0: 300, f1: 140, dur: 0.12, vol: 0.04});
    for (let i = 0; i < 3; i++) a.tone(out, {f0: rand(420, 700), f1: rand(700, 1000), dur: 0.05, vol: 0.014, when: t + 0.15 + i * rand(0.08, 0.16)});
  },
  salpica(a, o) {
    if (!a.limit('salpica', 0.08)) return;
    const out = a.out(a.sfxBus, o.pan, 0.25);
    a.noiseShot(out, {dur: 0.25, type: 'highpass', f0: 1800, f1: 3500, vol: 0.06});
    a.tone(out, {type: 'sine', f0: 1600, f1: 2100, dur: 0.1, vol: 0.012});
  },

  /* ---------- criaturas ---------- */
  'gruñido'(a, o) {
    if (!a.limit('gruñido', 0.6)) return;
    const out = a.out(a.sfxBus, o.pan, 0.1);
    a.noiseShot(out, {dur: 0.55, type: 'lowpass', f0: 260, f1: 140, q: 4, vol: 0.09, attack: 0.05});
    a.tone(out, {type: 'sawtooth', f0: 82, f1: 70, dur: 0.5, vol: 0.02, attack: 0.08, vib: [26, 9]});
  },
  chillido(a, o) {
    if (!a.limit('chillido', 0.5)) return;
    const out = a.out(a.sfxBus, o.pan, 0.2);
    a.noiseShot(out, {dur: 0.32, f0: 2600, f1: 1700, q: 6, vol: 0.035, attack: 0.03});
  },
  llanto(a, o) {
    if (!a.limit('llanto', 0.5)) return;
    const out = a.out(a.sfxBus, o.pan, 0.4), t = a.ctx.currentTime;
    a.tone(out, {type: 'triangle', f0: 660, f1: 560, dur: 0.2, vol: 0.02, vib: [10, 16]});
    a.tone(out, {type: 'triangle', f0: 620, f1: 500, dur: 0.26, vol: 0.02, vib: [10, 16], when: t + 0.26});
  },
  lagrima(a, o) {
    if (!a.limit('lagrima', 0.12)) return;
    const out = a.out(a.sfxBus, o.pan, 0.25);
    a.tone(out, {type: 'triangle', f0: 760, f1: 420, dur: 0.16, vol: 0.022});
  },
  crujido(a, o) {
    if (!a.limit('crujido', 0.6)) return;
    const out = a.out(a.sfxBus, o.pan, 0.15);
    a.tone(out, {type: 'sawtooth', f0: 92, f1: 150, dur: 0.5, vol: 0.03, attack: 0.05, vib: [31, 22]});
    a.noiseShot(out, {dur: 0.4, f0: 2800, q: 1, vol: 0.016, attack: 0.1});
  },
  'guadaña'(a, o) {
    if (!a.limit('guadaña', 0.3)) return;
    const out = a.out(a.sfxBus, o.pan, 0.2), t = a.ctx.currentTime;
    a.noiseShot(out, {dur: 0.26, f0: 2200, f1: 320, q: 1.4, vol: 0.09, attack: 0.02});
    a.thump(out, {when: t + 0.12, vol: 0.1});
  },
  difunto(a) {
    // Llega alguien con nombre: una campana grave y dos notas que caen.
    const t = a.ctx.currentTime, out = a.out(a.sfxBus, 0, 0.6);
    a.bellStrike(98, {vol: 0.17, decay: 4.5, send: 0.8});
    a.noiseShot(out, {dur: 1.4, type: 'lowpass', f0: 120, f1: 420, q: 2, vol: 0.06, attack: 0.9});
    a.pluck(50, {when: t + 0.5, vol: 0.14, bus: a.sfxBus, send: 0.5});
    a.pluck(49, {when: t + 1.0, vol: 0.14, bus: a.sfxBus, send: 0.5});
  },
  difuntoCae(a) {
    const t = a.ctx.currentTime;
    [50, 57, 62, 66, 69].forEach((n, i) => a.pluck(n, {when: t + i * 0.09, vol: 0.15, bus: a.sfxBus, send: 0.6}));
    a.bellStrike(293.7, {when: t + 0.04, vol: 0.08, decay: 3.5, send: 0.8});
  },

  /* ---------- la noche ---------- */
  hora(a, o) { a.toll(o.count || 1, o.gap || 2.3); },
  guia(a) {
    const t = a.ctx.currentTime;
    a.bellStrike(73.4, {vol: 0.34, decay: 8, send: 0.8});
    const out = a.out(a.sfxBus, 0, 0.4);
    a.noiseShot(out, {dur: 3.2, type: 'lowpass', f0: 90, f1: 160, q: 2, vol: 0.12, attack: 1.2, when: t});
  },
  reloj(a) {
    const t = a.ctx.currentTime;
    a.bellStrike(98, {vol: 0.12, decay: 0.9, send: 0.5});
    a.tone(a.sfxBus, {type: 'square', f0: 1200, f1: 900, dur: 0.03, vol: 0.02, when: t + 0.02});
    a.duck.gain.cancelScheduledValues(t);
    a.duck.gain.setValueAtTime(0.3, t + 0.05);
    a.duck.gain.setTargetAtTime(1, t + 1.6, 0.6);
  },
  liberada(a) {
    const t = a.ctx.currentTime;
    [50, 57, 62, 66, 69, 74].forEach((n, i) => a.pluck(n, {when: t + i * 0.13, vol: 0.2, send: 0.6}));
    a.bellStrike(146.8, {vol: 0.16, decay: 6, send: 0.8, when: t + 0.05});
  },
  apagon(a) {
    const t = a.ctx.currentTime;
    a.tone(a.sfxBus, {f0: 220, f1: 55, dur: 1.6, vol: 0.18, attack: 0.02});
    a.noiseShot(a.out(a.sfxBus, 0, 0.6), {dur: 1.2, type: 'lowpass', f0: 800, f1: 90, vol: 0.12, attack: 0.01, when: t});
  },
  alba(a) { if (!a.soundtrack?.enabled) a.nana({vol: 0.22, tempo: 0.95, dawn: true}); },

  /* ---------- voces e interfaz ---------- */
  voz(a, o) {
    if (!a.limit('voz', 0.06)) return;
    const v = VOICES[o.speaker] || VOICES['Lucía'];
    const out = a.out(a.sfxBus, 0, v.send || 0.12);
    a.tone(out, {type: v.type, f0: v.f * rand(0.94, 1.07), dur: 0.05, vol: v.vol, attack: 0.006, vib: v.vib || null});
  },
  'ui-foco'(a) {
    if (!a.limit('ui-foco', 0.04)) return;
    a.tone(a.out(a.sfxBus, 0, 0.1), {f0: 1760, dur: 0.025, vol: 0.008, attack: 0.002});
  },
  'ui-elegir'(a) {
    const t = a.ctx.currentTime;
    a.pluck(74, {when: t, vol: 0.09, bus: a.sfxBus, send: 0.4, bright: 3400});
    a.tone(a.out(a.sfxBus, 0, 0.1), {f0: 1320, dur: 0.03, vol: 0.01, attack: 0.002});
  },
  'ui-abrir'(a) { a.noiseShot(a.out(a.sfxBus, 0, 0.2), {dur: 0.12, f0: 900, f1: 2400, q: 0.8, vol: 0.02, attack: 0.03}); },
  'ui-cerrar'(a) { a.noiseShot(a.out(a.sfxBus, 0, 0.2), {dur: 0.12, f0: 2400, f1: 800, q: 0.8, vol: 0.018, attack: 0.02}); }
};
