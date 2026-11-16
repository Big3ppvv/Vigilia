/*
 * La música de la noche sale de la nana de Amparo: su bajo, sus acordes y, de
 * vez en cuando, su melodía. Cada hora la toca de otra manera; la Compaña trae
 * su tambor y su campanilla cuando se acerca en procesión.
 *
 * No hay grabaciones: un compás se escribe cuando está a punto de sonar, según
 * cómo va la noche en ese momento.
 */

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* La nana de Amparo, en compás de 3/4: [nota MIDI, tiempos]. */
export const NANA = [
  [69, 2], [74, 1], [72, 2], [69, 1], [70, 1], [69, 1], [67, 1], [69, 3],
  [65, 2], [67, 1], [69, 1], [67, 1], [65, 1], [64, 2], [61, 1], [62, 3]
];
/* Un bajo por compás. */
export const NANA_BASS = [50, 53, 43, 45, 50, 46, 45, 50];

/* Los ocho compases: el bajo y las notas del acorde, de grave a agudo. */
const BARS = [
  {bass: 38, tones: [50, 57, 62, 65, 69]},   // re menor
  {bass: 41, tones: [53, 57, 60, 65, 69]},   // fa
  {bass: 43, tones: [55, 58, 62, 67, 70]},   // sol menor
  {bass: 45, tones: [52, 57, 61, 64, 69]},   // la
  {bass: 38, tones: [50, 57, 62, 65, 69]},   // re menor
  {bass: 46, tones: [53, 58, 62, 65, 70]},   // si bemol
  {bass: 45, tones: [52, 57, 61, 64, 69]},   // la
  {bass: 38, tones: [50, 57, 62, 65, 69]}    // re menor
];
/* La melodía, compás a compás: [nota, tiempo en el que entra]. */
const MELODY = [
  [[69, 0], [74, 2]], [[72, 0], [69, 2]], [[70, 0], [69, 1], [67, 2]], [[69, 0]],
  [[65, 0], [67, 2]], [[69, 0], [67, 1], [65, 2]], [[64, 0], [61, 2]], [[62, 0]]
];
const GLASS = [74, 77, 79, 81, 84, 86];
const WALTZ = [[0, 2, 3, 4, 3, 2], [0, 1, 2, 3, 2, 1]];

/*
 * Cómo suena cada hora. beat: segundos por tiempo. El resto, de 0 a 1:
 * cuánto hay de bajo, de arpegio, de colchón de acordes y de melodía.
 */
const MOODS = [
  {beat: 0.72, bass: 0.7, arp: 0.45, pad: 0.25, melody: 0.5},              // medianoche: casi nada
  {beat: 0.68, bass: 0.7, arp: 0.6, pad: 0.4, melody: 0.35},               // la una: pasos
  {beat: 0.64, bass: 0.8, arp: 0.85, pad: 0.6, melody: 0.3},               // las dos: la marea
  {beat: 0.78, bass: 0.3, arp: 0, pad: 0.9, glass: 1, melody: 0.12},       // las tres: frío y quieto
  {beat: 0.70, bass: 0.9, arp: 0.3, pad: 0.8, pulse: 1, melody: 0},        // las cuatro: lo más oscuro
  {beat: 0.56, bass: 1, arp: 1, pad: 1, drum: 1, organ: 1, melody: 0}      // las cinco: la Guía
];

export class Score {
  constructor(engine) {
    this.a = engine;
    this.bar = 0;
    this.next = 0;
    this.playedMelody = -9;
  }

  /* El colchón de acordes pasa por un filtro común que se abre con el peligro. */
  build() {
    const a = this.a, c = a.ctx;
    this.padFilter = c.createBiquadFilter();
    this.padFilter.type = 'lowpass'; this.padFilter.frequency.value = 620; this.padFilter.Q.value = 0.6;
    this.padOut = a.out(a.musicBus, 0, 0.5);
    this.padOut.gain.value = 1;
    this.padFilter.connect(this.padOut);
  }

  /* Se llama cada fotograma: escribe el siguiente compás cuando está a punto de sonar. */
  update(s) {
    const a = this.a, now = a.ctx.currentTime;
    const playing = s.scene === 'run' || s.scene === 'pause';
    // Las doce campanadas van solas; la música entra después.
    if (!playing || (s.hour < 0.2 && !s.boss)) { this.next = 0; return; }
    if (!this.next || this.next < now - 0.4) { this.next = now + 0.12; this.bar = 0; }
    this.padFilter.frequency.setTargetAtTime(520 + (s.danger || 0) * 900 + (s.boss ? 500 : 0), now, 0.5);
    let guard = 0;
    while (this.next < now + 0.3 && guard++ < 4) {
      const mood = s.boss ? MOODS[5] : MOODS[clamp(Math.floor(s.hour), 0, 4)];
      this.write(this.next, mood, s);
      this.next += mood.beat * 3;
      this.bar++;
    }
  }

  write(t, mood, s) {
    const a = this.a, bus = a.musicBus, beat = mood.beat;
    // La Guía acorta la vuelta: re menor, si bemol, sol menor, la.
    const bar = s.boss ? BARS[[0, 5, 2, 3][this.bar % 4]] : BARS[this.bar % 8];
    const danger = s.danger || 0, tense = clamp(danger + (s.soul || 0) * 0.6, 0, 1);
    const human = () => rand(-0.008, 0.008);

    if (mood.bass && Math.random() < 0.55 + mood.bass * 0.45) a.pluck(bar.bass, {when: t, vol: 0.13 * mood.bass, pan: -0.12, send: 0.25, bright: 1400});

    // El arpegio: en calma solo marca los tiempos; con la Compaña encima, corre.
    const arp = mood.arp * (0.7 + tense * 0.5);
    if (arp > 0.05) {
      const pattern = WALTZ[this.bar % 2], busy = arp > 0.5;
      for (let i = 0; i < 6; i++) {
        if (!busy && i % 2) continue;
        if (i && Math.random() < 0.14) continue;
        const note = bar.tones[pattern[i]] + (i === 3 && Math.random() < 0.18 ? 12 : 0);
        a.pluck(note, {when: t + i * beat / 2 + human(), vol: (i === 0 ? 0.085 : 0.055) * clamp(arp, 0.4, 1.1) * rand(0.85, 1.1), pan: 0.14 + (i % 2 ? 0.1 : -0.06), send: 0.4, bright: 1800 + tense * 1400});
      }
    }

    if (mood.pad) {
      this.padNote(bar.tones[1], t, beat * 3, 0.034 * mood.pad);
      this.padNote(bar.tones[2], t, beat * 3, 0.028 * mood.pad);
      if (mood.pad > 0.7) this.padNote(bar.tones[3], t, beat * 3, 0.018 * mood.pad);
      // A oscuras, una nota que no encaja se cuela debajo.
      if ((s.soul || 0) > 0.05) this.padNote(bar.bass + 13, t, beat * 3, 0.02 * s.soul);
    }

    if (mood.glass && Math.random() < 0.6) {
      const out = a.out(bus, rand(-0.6, 0.6), 0.9), note = GLASS[Math.floor(Math.random() * GLASS.length)], when = t + beat * Math.floor(rand(0, 3));
      a.tone(out, {f0: midiHz(note), dur: 2.8, vol: 0.022, attack: 0.35, when});
      a.tone(out, {f0: midiHz(note) * 2.01, dur: 1.6, vol: 0.006, attack: 0.3, when});
    }

    // La melodía vuelve a ratos, una octava arriba, cuando hay un respiro.
    if (mood.melody && danger < 0.45 && !(s.lull > 0)) {
      const slot = this.bar % 8;
      if (slot === 0 && Math.random() < mood.melody) this.playedMelody = this.bar;
      if (this.bar - this.playedMelody < 8 && this.bar >= this.playedMelody) {
        for (const [note, at] of MELODY[slot]) a.pluck(note + 12, {when: t + at * beat + human(), vol: 0.075, pan: 0.3, send: 0.6, bright: 3200});
      }
    }

    if (mood.pulse) {
      a.thump(bus, {when: t, f0: 70, f1: 40, dur: 0.22, vol: 0.075});
      a.thump(bus, {when: t + beat * 0.42, f0: 62, f1: 38, dur: 0.2, vol: 0.05});
    }
    if (mood.drum) {
      a.thump(bus, {when: t, vol: 0.11});
      a.thump(bus, {when: t + beat * 2, f0: 84, vol: 0.075});
      a.noiseShot(bus, {dur: 0.03, type: 'highpass', f0: 4200, vol: 0.016, when: t + beat});
    }
    if (mood.organ) {
      for (const [note, vol] of [[bar.bass, 0.03], [bar.bass + 7, 0.02], [bar.bass + 12, 0.014]]) this.padNote(note, t, beat * 3, vol, 'sawtooth');
    }

    // La procesión marca el paso: tambor en el uno y en el tres, y la campanilla en medio.
    const proc = s.procession || 0;
    if (proc > 0.05 && !s.boss) {
      const out = a.out(bus, clamp(s.procPan || 0, -0.9, 0.9), 0.35), near = clamp(proc, 0.15, 1);
      a.thump(out, {when: t, vol: 0.12 * near});
      a.thump(out, {when: t + beat * 2, f0: 80, vol: 0.075 * near});
      a.tinkle(out, {when: t + beat, f: 1568, vol: 0.02 + 0.03 * near});
      if (near > 0.6) a.tinkle(out, {when: t + beat * 1.5, f: 1760, vol: 0.02 * near, decay: 0.6});
    }
  }

  /* Una nota larga del colchón: dos osciladores apenas desafinados, que entran y salen despacio. */
  padNote(midi, t, dur, vol, type = 'triangle') {
    const c = this.a.ctx, f = midiHz(midi);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.45);
    g.gain.setValueAtTime(vol, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.1);
    g.connect(this.padFilter);
    for (const detune of [-5, 6]) {
      const o = c.createOscillator();
      o.type = type; o.frequency.value = f; o.detune.value = detune;
      o.connect(g);
      o.start(t); o.stop(t + dur + 1.2);
    }
  }
}
