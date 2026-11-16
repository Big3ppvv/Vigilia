/*
 * La banda sonora de la edición completa, compuesta a partir de la nana de
 * Amparo y renderizada sin conexión con el motor de sonido del juego más
 * instrumentos que no caben en tiempo real: cuerdas, coro, gaita con su
 * roncón, órgano, caja de música, bombo, pandeireta y tamboril.
 *
 * Se carga como módulo desde el servidor de desarrollo; lo usa render-banda.mjs.
 */
import { AudioEngine } from '../../audio.js';
import { NANA } from '../../music.js';

const RATE = 48000;
const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

/* Re menor y su vuelta; la B para el puente; re mayor para el alba. */
const MINOR = [
  {bass: 38, tones: [50, 57, 62, 65, 69]}, {bass: 41, tones: [53, 57, 60, 65, 69]},
  {bass: 43, tones: [55, 58, 62, 67, 70]}, {bass: 45, tones: [52, 57, 61, 64, 69]},
  {bass: 38, tones: [50, 57, 62, 65, 69]}, {bass: 46, tones: [53, 58, 62, 65, 70]},
  {bass: 45, tones: [52, 57, 61, 64, 69]}, {bass: 38, tones: [50, 57, 62, 65, 69]}
];
const BRIDGE = [
  {bass: 46, tones: [53, 58, 62, 65, 70]}, {bass: 41, tones: [53, 57, 60, 65, 69]},
  {bass: 48, tones: [55, 60, 64, 67, 72]}, {bass: 38, tones: [50, 57, 62, 65, 69]},
  {bass: 43, tones: [55, 58, 62, 67, 70]}, {bass: 38, tones: [50, 57, 62, 65, 69]},
  {bass: 45, tones: [52, 57, 61, 64, 69]}, {bass: 45, tones: [52, 57, 61, 64, 67]}
];
const MAJOR = [
  {bass: 38, tones: [50, 57, 62, 66, 69]}, {bass: 43, tones: [55, 59, 62, 67, 71]},
  {bass: 45, tones: [52, 57, 61, 64, 69]}, {bass: 38, tones: [50, 57, 62, 66, 69]},
  {bass: 47, tones: [54, 59, 62, 66, 71]}, {bass: 43, tones: [55, 59, 62, 67, 71]},
  {bass: 45, tones: [52, 57, 62, 64, 69]}, {bass: 38, tones: [50, 57, 62, 66, 69]}
];
/* La nana en mayor, para cuando amanece. */
const NANA_MAJOR = NANA.map(([n, l]) => [n === 65 ? 66 : n === 70 ? 71 : n === 72 ? 73 : n === 60 ? 61 : n, l]);
/* La nana compás a compás (3/4): [nota, tiempo de entrada, duración]. */
function nanaBars(melody = NANA) {
  const bars = Array.from({length: 8}, () => []);
  let beat = 0;
  for (const [n, l] of melody) {
    let start = beat, left = l;
    while (left > 0) {
      const bar = Math.floor(start / 3), inBar = start % 3, take = Math.min(left, 3 - inBar);
      if (bar < 8) bars[bar].push([n, inBar, take, start === beat]);
      start += take; left -= take;
    }
    beat += l;
  }
  return bars;
}
const SCALE = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77, 79, 81];
const step = (n, d) => { const i = SCALE.findIndex(s => s >= n); const j = Math.max(0, Math.min(SCALE.length - 1, (i < 0 ? SCALE.length - 1 : i) + d)); return SCALE[j]; };

let seed = 1;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

/* ---------- instrumentos ---------- */

function env(g, t, a, peak, hold, r) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + Math.max(0, hold));
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + Math.max(0, hold) + r);
}

class Band {
  constructor(a) {
    this.a = a; this.c = a.ctx;
    this.bus = a.musicBus;
    const c = this.c;
    // Buses compartidos: un filtro por instrumento, no uno por nota (es lo que cuesta).
    this.stringsIn = c.createGain();
    const slp = c.createBiquadFilter(); slp.type = 'lowpass'; slp.frequency.value = 2400; slp.Q.value = 0.6;
    this.stringsIn.connect(slp); slp.connect(a.out(this.bus, 0, 0.55));
    this.choirIn = c.createGain();
    const choirOut = a.out(this.bus, 0, 0.8);
    for (const [fc, q, amp] of [[760, 8, 1], [1150, 9, 0.6], [2650, 12, 0.25]]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fc; bp.Q.value = q;
      const ga = c.createGain(); ga.gain.value = amp * 3;
      this.choirIn.connect(bp); bp.connect(ga); ga.connect(choirOut);
    }
    this.gaitaIn = c.createGain();
    const gbp = c.createBiquadFilter(); gbp.type = 'bandpass'; gbp.frequency.value = 1350; gbp.Q.value = 0.9;
    const glp = c.createBiquadFilter(); glp.type = 'lowpass'; glp.frequency.value = 4200;
    const gout = a.out(this.bus, 0.15, 0.3);
    this.gaitaIn.connect(gbp); gbp.connect(glp); glp.connect(gout);
    const gdry = c.createGain(); gdry.gain.value = 0.35; this.gaitaIn.connect(gdry); gdry.connect(gout);
    this.droneIn = c.createGain();
    const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 700; dlp.Q.value = 1.2;
    this.droneIn.connect(dlp); dlp.connect(a.out(this.bus, -0.1, 0.2));
    this.organIn = a.out(this.bus, 0, 0.7);
    this.boxIn = a.out(this.bus, 0.2, 0.5);
    this.drumIn = a.out(this.bus, 0, 0.12);
    this.jingleIn = a.out(this.bus, 0.25, 0.18);
    this.snareIn = a.out(this.bus, -0.2, 0.15);
  }

  voice(dest, t, a, peak, hold, r) { const g = this.c.createGain(); env(g, t, a, peak, hold, r); g.connect(dest); return g; }
  osc(type, f, det, dest, t, end) { const o = this.c.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det; o.connect(dest); o.start(t); o.stop(end); return o; }

  /* Cuerdas: tres sierras desafinadas por el filtro común. */
  strings(midi, t, dur, vol = 0.03) {
    const f = midiHz(midi), g = this.voice(this.stringsIn, t, Math.min(0.6, dur * 0.35), vol * 1.4, dur - 0.6, 1.1);
    for (const det of [-9, 0, 10]) this.osc('sawtooth', f, det, g, t, t + dur + 1.2);
  }

  /* Coro en «a»: sierras por el banco de formantes común. */
  choir(midi, t, dur, vol = 0.02) {
    const f = midiHz(midi), g = this.voice(this.choirIn, t, 0.5, vol, dur - 0.5, 1.4);
    for (const det of [-8, 7]) this.osc('sawtooth', f, det, g, t, t + dur + 1.5);
  }

  /* Gaita: el punteiro, nasal, con un adorno rápido antes de la nota. */
  gaita(midi, t, dur, vol = 0.03, pan, grace = true) {
    const play = (m, t0, d, v) => {
      const f = midiHz(m), g = this.voice(this.gaitaIn, t0, 0.012, v, d - 0.03, 0.05);
      this.osc('square', f, 0, g, t0, t0 + d + 0.08);
      this.osc('sawtooth', f * 1.002, 0, g, t0, t0 + d + 0.08);
    };
    if (grace && dur > 0.18) { play(midi + (midi > 72 ? 2 : 5), t, 0.035, vol * 0.7); play(midi, t + 0.035, dur - 0.035, vol); }
    else play(midi, t, dur, vol);
  }

  /* El roncón: una sierra grave y filtrada que no para. */
  drone(midi, t, dur, vol = 0.014) {
    const g = this.voice(this.droneIn, t, 0.8, vol, dur - 0.8, 0.8);
    for (const [m, det] of [[midi, 0], [midi + 7, 3], [midi - 12, -2]]) this.osc('sawtooth', midiHz(m), det, g, t, t + dur + 0.9);
  }

  /* Órgano de la ermita: aditivo, con sus registros. */
  organ(midi, t, dur, vol = 0.02) {
    const f = midiHz(midi), g = this.voice(this.organIn, t, 0.09, vol, dur - 0.1, 0.5);
    for (const [mul, amp] of [[0.5, 0.6], [1, 1], [2, 0.55], [3, 0.3], [4, 0.25]]) {
      const og = this.c.createGain(); og.gain.value = amp * 0.3; og.connect(g);
      this.osc('sine', f * mul, 0, og, t, t + dur + 0.6);
    }
  }

  /* Caja de música: una campanita con su segundo parcial. */
  box(midi, t, vol = 0.05) {
    const f = midiHz(midi);
    for (const [mul, amp, life] of [[1, 1, 1.4], [4.02, 0.25, 0.5]]) {
      const g = this.voice(this.boxIn, t, 0.003, vol * amp, 0, life);
      this.osc('sine', f * mul, 0, g, t, t + life + 0.05);
    }
  }

  bombo(t, vol = 0.14) { this.a.thump(this.drumIn, {when: t, f0: 82, f1: 38, dur: 0.32, vol}); }
  pandeireta(t, vol = 0.02, accent = false) {
    this.a.noiseShot(this.jingleIn, {dur: accent ? 0.09 : 0.05, type: 'highpass', f0: accent ? 5600 : 7200, vol: vol * (accent ? 1.6 : 1), attack: 0.002, when: t});
    if (accent) this.a.tinkle(this.jingleIn, {when: t, f: 3520 + rnd() * 400, vol: vol * 0.35, decay: 0.25});
  }
  tamboril(t, vol = 0.05) {
    this.a.noiseShot(this.snareIn, {dur: 0.08, f0: 1900, f1: 1400, q: 0.8, vol, attack: 0.002, when: t});
    this.a.tone(this.snareIn, {f0: 190, f1: 150, dur: 0.06, vol: vol * 0.6, when: t});
  }
  pluck(midi, t, vol = 0.12, pan = 0, bright = 2600) { this.a.pluck(midi, {when: t, vol, pan, send: 0.4, bright}); }
  bell(f, t, vol = 0.1, decay = 4) { this.a.bellStrike(f, {when: t, vol, decay, send: 0.75, bus: this.bus}); }
}

/* La misma partitura sin sonar: sirve para medir la duración antes de renderizar. */
class DryBand {
  constructor() { this.a = {hum() {}}; }
  strings() {} choir() {} gaita() {} drone() {} organ() {} box() {} bombo() {} pandeireta() {} tamboril() {} pluck() {} bell() {}
}

/* ---------- las piezas ---------- */

/* Muiñeira de cada hora: 6/8, bombo en el uno y el cuatro, pandeireta y gaita sobre la nana. */
function muineira(b, hour, seconds) {
  const beat = [0.62, 0.58, 0.55, 0.6, 0.5][hour], bar = beat * 2, n8 = bar / 6;
  const bars = Math.max(16, Math.round(seconds / bar / 8) * 8);
  const nana = nanaBars();
  for (let i = 0; i < bars; i++) {
    const t = i * bar, phrase = Math.floor(i / 8), k = i % 8;
    const bridge = phrase % 4 === 2;
    const harm = (bridge ? BRIDGE : MINOR)[k];
    const intro = phrase === 0 && i < 4;
    // Percusión: más densa con la noche; la hora de las ánimas, contenida.
    const drive = [0.5, 0.65, 0.8, 0.55, 1][hour];
    b.bombo(t, 0.12 + drive * 0.05);
    if (!intro) b.bombo(t + n8 * 3, 0.07 + drive * 0.05);
    if (hour >= 2 && !intro && k % 2 === 1) b.bombo(t + n8 * 5, 0.05);
    for (let e = 0; e < 6; e++) if (!intro || e % 3 === 0) b.pandeireta(t + e * n8, 0.012 + drive * 0.008, e % 3 === 0);
    if (hour >= 1 && k === 7) for (let e = 0; e < 6; e++) b.tamboril(t + e * n8, 0.03 + e * 0.006);
    // Bajo y roncón.
    b.pluck(harm.bass, t, 0.16, -0.1, 1200);
    b.pluck(harm.bass + 7, t + n8 * 3, 0.1, -0.1, 1200);
    if (k === 0 && hour !== 3) b.drone(38, t, bar * 8, 0.008 + drive * 0.008);
    // Cuerdas y, desde las dos, coro.
    if (!intro) for (const [j, m] of [harm.tones[1], harm.tones[2], harm.tones[3]].entries()) b.strings(m, t, bar * 0.98, 0.012 + drive * 0.006, [-0.3, 0, 0.3][j], 1.5 + drive);
    if ((hour >= 2 && phrase % 2 === 1) || hour === 3) b.choir(harm.tones[2] + 12, t, bar, hour === 3 ? 0.03 : 0.018);
    if (hour === 3 && k % 2 === 0) b.bell(midiHz(harm.tones[4] + 12) / 2, t, 0.05, 2.5);
    // La gaita: la nana en corcheas con adornos y notas de paso.
    const sing = phrase >= 1 && !(phrase % 4 === 3 && k >= 4);
    if (sing && hour !== 3) {
      const notes = nana[k];
      let e8 = 0;
      for (const [n, at, len] of notes) {
        const start = at * 2, cnt = len * 2;
        for (let q = 0; q < cnt; q++) {
          const pattern = (phrase + k + q) % 4;
          const note = q === 0 ? n : pattern === 1 ? step(n, 1) : pattern === 3 ? step(n, -1) : n;
          const octave = hour >= 2 && phrase % 2 === 0 ? 12 : 0;
          b.gaita(note + octave, t + (start + q) * n8, n8 * (q === cnt - 1 ? 1.4 : 0.92), 0.02 + drive * 0.008, 0.15, q === 0);
          e8++;
        }
      }
    } else if (hour === 3 && phrase >= 1) {
      for (const [n, at, len] of nana[k]) b.pluck(n + 12, t + at * 2 * n8, 0.1, 0.25, 3600);
    }
    // Contracanto pulsado en la parte alta.
    if (phrase >= 2 && !bridge) for (let e = 0; e < 6; e += 2) b.pluck(harm.tones[(e / 2 + k) % 5] + 12, t + e * n8 + n8, 0.045, 0.3, 3000);
  }
  return bars * bar;
}

/* La Guía: órgano, coro, la campana grave y una marcha que no deja respirar. */
function guia(b, seconds) {
  const beat = 0.46, bar = beat * 3, bars = Math.max(16, Math.round(seconds / bar / 8) * 8);
  const nana = nanaBars();
  for (let i = 0; i < bars; i++) {
    const t = i * bar, phrase = Math.floor(i / 8), k = i % 8;
    const harm = (phrase % 3 === 2 ? BRIDGE : MINOR)[[0, 5, 2, 3, 0, 5, 6, 7][k]];
    for (const m of [harm.bass + 12, harm.tones[1], harm.tones[2], harm.tones[3]]) b.organ(m, t, bar * 0.96, 0.016);
    b.organ(harm.bass, t, bar, 0.02);
    b.bombo(t, 0.18); b.bombo(t + beat * 2, 0.12);
    for (let e = 0; e < 6; e++) b.tamboril(t + e * beat / 2, e % 2 ? 0.022 : 0.04);
    if (k % 4 === 0) b.bell(73.4, t, 0.16, 6);
    if (phrase >= 1) b.choir(harm.tones[2] + 12, t, bar, 0.026);
    if (phrase >= 1 && phrase % 2 === 1) for (const [n, at, len] of nana[k]) b.gaita(n + 12, t + at * beat, len * beat * 0.95, 0.024, 0.1);
    if (phrase >= 2) for (let e = 0; e < 6; e++) b.pluck(harm.tones[e % 5] + 12, t + e * beat / 2, 0.04, -0.3, 2400);
  }
  return bars * bar;
}

/* El puesto de Remedios: un vals tranquilo con caja de música. */
function tienda(b, seconds) {
  const beat = 0.7, bar = beat * 3, bars = Math.max(16, Math.round(seconds / bar / 8) * 8);
  const nana = nanaBars();
  for (let i = 0; i < bars; i++) {
    const t = i * bar, phrase = Math.floor(i / 8), k = i % 8;
    const harm = (phrase % 4 === 2 ? BRIDGE : MINOR)[k];
    b.pluck(harm.bass, t, 0.13, -0.15, 1400);
    b.pluck(harm.tones[2], t + beat, 0.07, 0.1, 2200); b.pluck(harm.tones[3], t + beat * 2, 0.07, 0.15, 2200);
    if (phrase >= 1) for (const m of [harm.tones[1], harm.tones[3]]) b.strings(m, t, bar, 0.008, 0, 1.6);
    if (phrase % 2 === 1 || phrase === 2) for (const [n, at, len] of nana[k]) b.box(n + 12, t + at * beat, 0.05);
    if (phrase % 2 === 0 && phrase > 0) for (const [n, at] of nana[k]) b.pluck(n + 12, t + at * beat, 0.06, 0.3, 3400);
  }
  return bars * bar;
}

/* El título: la nana despacio, campanas, cuerdas y un coro lejano. */
function titulo(b, seconds) {
  const beat = 0.85, bar = beat * 3, bars = Math.max(16, Math.round(seconds / bar / 8) * 8);
  const nana = nanaBars();
  for (let i = 0; i < bars; i++) {
    const t = i * bar, phrase = Math.floor(i / 8), k = i % 8;
    const harm = (phrase === 3 ? BRIDGE : MINOR)[k];
    if (k === 0) b.bell(146.8, t, 0.08, 6);
    b.pluck(harm.bass, t, 0.14, -0.1, 1300);
    for (const m of [harm.tones[1], harm.tones[2], harm.tones[3]]) b.strings(m, t, bar, phrase === 0 ? 0.008 : 0.012, 0, 1.4);
    if (phrase >= 1) for (const [n, at, len] of nana[k]) b.pluck(n, t + at * beat, 0.16, 0.12, 2800);
    if (phrase >= 2) for (const [n, at, len] of nana[k]) b.a.hum(n, {when: t + at * beat, dur: len * beat * 0.95, vol: 0.05, send: 0.6, bus: b.bus});
    if (phrase >= 3) b.choir(harm.tones[2] + 12, t, bar, 0.016);
    if (phrase >= 4 && k % 2 === 0) for (const [n, at] of nana[k]) b.box(n + 24, t + at * beat, 0.025);
  }
  return bars * bar;
}

/* El alba: la nana en mayor, cuerdas abiertas, coro y campanas. */
function alba(b, seconds) {
  const beat = 0.8, bar = beat * 3, bars = Math.max(8, Math.round(seconds / bar / 8) * 8);
  const nana = nanaBars(NANA_MAJOR);
  for (let i = 0; i < bars; i++) {
    const t = i * bar, k = i % 8, harm = MAJOR[k];
    if (k % 4 === 0) b.bell(293.7, t, 0.06, 4);
    b.pluck(harm.bass, t, 0.12, -0.1, 1500);
    for (const m of [harm.tones[1], harm.tones[2], harm.tones[3], harm.tones[4]]) b.strings(m, t, bar, 0.011, 0, 2);
    b.choir(harm.tones[3] + 12, t, bar, 0.018);
    for (const [n, at, len] of nana[k]) b.pluck(n + 12, t + at * beat, 0.12, 0.2, 3600);
  }
  return bars * bar;
}

/* El apagón: notas que caen, un grave que no se va y la campana. */
function apagon(b, seconds) {
  const fall = [74, 72, 70, 69, 67, 65, 64, 62, 61, 62];
  b.drone(26, 0, seconds, 0.018);
  for (let i = 0; i < fall.length; i++) b.pluck(fall[i], 0.4 + i * 1.7, 0.14, (i % 2 ? 0.3 : -0.3), 2000);
  for (let t = 0; t < seconds - 4; t += 7) b.bell(73.4, t + 0.2, 0.14, 7);
  b.strings(50, 0, seconds - 2, 0.01, 0, 1.2); b.strings(53, 0, seconds - 2, 0.008, 0, 1.2);
  return seconds;
}

export const TRACKS = {
  titulo: {seconds: 120, loop: true, write: titulo},
  'hora-0': {seconds: 105, loop: true, write: (b, s) => muineira(b, 0, s)},
  'hora-1': {seconds: 105, loop: true, write: (b, s) => muineira(b, 1, s)},
  'hora-2': {seconds: 105, loop: true, write: (b, s) => muineira(b, 2, s)},
  'hora-3': {seconds: 105, loop: true, write: (b, s) => muineira(b, 3, s)},
  'hora-4': {seconds: 105, loop: true, write: (b, s) => muineira(b, 4, s)},
  guia: {seconds: 120, loop: true, write: guia},
  tienda: {seconds: 90, loop: true, write: tienda},
  alba: {seconds: 60, loop: false, write: alba},
  apagon: {seconds: 30, loop: false, write: apagon}
};

/* Renderiza una pieza; si se repite, la cola de la reverberación se funde con el principio. */
export async function render(name) {
  const spec = TRACKS[name];
  seed = 7 + name.length * 131;
  const tail = 4;
  // Primero se escribe «en seco» para saber cuánto dura de verdad.
  const length = spec.write(new DryBand(), spec.seconds);
  seed = 7 + name.length * 131;
  const ctx = new OfflineAudioContext(2, Math.ceil(RATE * (length + tail)), RATE);
  const a = new AudioEngine(); a.setVolume(1); a.setMix({music: 1, sfx: 1, amb: 0}); a.init(ctx);
  spec.write(new Band(a), spec.seconds);
  const buffer = await ctx.startRendering();
  a.destroy();
  const frames = spec.loop ? Math.round(length * RATE) : buffer.length;
  const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
  const outL = new Float32Array(frames), outR = new Float32Array(frames);
  outL.set(L.subarray(0, frames)); outR.set(R.subarray(0, frames));
  if (spec.loop) for (let i = frames; i < buffer.length; i++) { outL[i - frames] += L[i]; outR[i - frames] += R[i]; }
  // Normaliza a -1 dBFS y codifica WAV de 16 bits.
  let peak = 0, energy = 0;
  for (let i = 0; i < frames; i++) { peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i])); energy += outL[i] * outL[i] + outR[i] * outR[i]; }
  const gain = peak > 0 ? 0.89 / peak : 1;
  const bytes = new Uint8Array(44 + frames * 4), view = new DataView(bytes.buffer);
  const text = (at, s) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); view.setUint32(4, 36 + frames * 4, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
  view.setUint32(24, RATE, true); view.setUint32(28, RATE * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, frames * 4, true);
  for (let i = 0; i < frames; i++) {
    view.setInt16(44 + i * 4, Math.max(-1, Math.min(1, outL[i] * gain)) * 32767, true);
    view.setInt16(46 + i * 4, Math.max(-1, Math.min(1, outR[i] * gain)) * 32767, true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  return {b64: btoa(bin), seconds: frames / RATE, bytes: bytes.length, peakDb: +(20 * Math.log10(peak)).toFixed(1), rmsDb: +(10 * Math.log10(energy / (frames * 2) + 1e-12) + 20 * Math.log10(gain)).toFixed(1), loop: spec.loop};
}
