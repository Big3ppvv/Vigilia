/* La nana de Amparo y sus variaciones durante la noche. */
import { midiHz } from './audio-synth.js';
/* La nana de Amparo, en compás de 3/4: [nota MIDI, tiempos]. */
const NANA = [
  [69, 2], [74, 1], [72, 2], [69, 1], [70, 1], [69, 1], [67, 1], [69, 3],
  [65, 2], [67, 1], [69, 1], [67, 1], [65, 1], [64, 2], [61, 1], [62, 3]
];
/* Un bajo por compás. */
const NANA_BASS = [50, 53, 43, 45, 50, 46, 45, 50];

export const scoreMethods = {
  /* ---------- música ---------- */

  /* La nana completa. dawn: termina en mayor, como si se abriera una ventana. */
  nana({vol = 0.2, tempo = 1, dawn = false} = {}) {
    if (!this.live) return;
    const beat = 0.78 / tempo;
    let t = this.ctx.currentTime + 0.1, bar = 0, beats = 0;
    NANA.forEach(([note, len], i) => {
      if (beats % 3 === 0) {
        const bass = NANA_BASS[bar % NANA_BASS.length];
        this.pluck(bass, {when: t, vol: vol * 0.75, pan: -0.15, send: 0.3});
        bar++;
      }
      const last = i === NANA.length - 1;
      if (last && dawn) {
        [62, 66, 69, 74].forEach((n, k) => this.pluck(n, {when: t + k * 0.11, vol: vol * 1.05, pan: 0.1, send: 0.5}));
        this.pluck(50, {when: t, vol: vol * 0.8, pan: -0.15, send: 0.4});
      } else this.pluck(note, {when: t, vol, pan: 0.12, send: 0.42});
      t += len * beat;
      beats += len;
    });
  },

  /* Cada recuerdo toca el siguiente trozo de la nana. */
  memoryMotif() {
    if (!this.live) return;
    const t = this.ctx.currentTime + 0.02;
    for (let k = 0; k < 4; k++) {
      const [note] = NANA[(this.nanaStep + k) % NANA.length];
      this.pluck(note, {when: t + k * 0.16, vol: 0.2, pan: 0.1, send: 0.5});
    }
    this.pluck(NANA_BASS[Math.floor(this.nanaStep / 4) % NANA_BASS.length], {when: t, vol: 0.14, send: 0.4});
    this.nanaStep = (this.nanaStep + 4) % NANA.length;
  },

  /* Fragmentos del mismo tema: cuerdas de refugio, pulsos de la Compaña.
   * No se agenda una canción entera durante combate: una pausa no deja
   * compases nuevos sonando sobre la elección de recuerdos. */
  nightPhrase({hour = 0, danger = 0, boss = false, refuge = false} = {}) {
    if (!this.live) return;
    const t = this.ctx.currentTime + 0.02;
    const step = this.scoreStep++;
    const root = NANA_BASS[(step + Math.floor(hour)) % NANA_BASS.length];
    const out = this.out(this.musicBus, boss ? -0.15 : 0.1, 0.45, 4);
    if (refuge && !boss) {
      this.pluck(root, {when: t, vol: 0.075, pan: -0.18, send: 0.4});
      const note = NANA[(step * 2) % NANA.length][0];
      this.pluck(note, {when: t + 0.22, vol: 0.09, pan: 0.2, send: 0.5});
      this.pluck(note + 7, {when: t + 0.66, vol: 0.04, pan: -0.1, send: 0.5});
      return;
    }
    // Quinta abierta: grave y cuerda. La Guía introduce una segunda áspera.
    const notes = boss ? [root, root + 1, root + 7] : [root, root + 7];
    for (let i = 0; i < notes.length; i++) {
      this.tone(out, {type: 'triangle', f0: midiHz(notes[i]), dur: boss ? 1.6 : 2.2,
        vol: (boss ? 0.026 : 0.018) / (i + 1), attack: 0.32, when: t + i * 0.075});
    }
    this.pluck(root + 12, {when: t + 0.35, vol: 0.065 + danger * 0.045, pan: 0.22, send: 0.42});
    if (danger > 0.35 || boss) {
      const count = boss ? 3 : 2;
      for (let i = 0; i < count; i++) {
        this.noiseShot(out, {dur: 0.11, type: 'lowpass', f0: 360, f1: 90,
          vol: 0.025 + danger * 0.02, when: t + i * 0.48});
      }
    }
  },

};
