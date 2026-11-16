/* Gestos sonoros de combate, criaturas y acontecimientos. */
import { midiHz, audioRand } from './audio-synth.js';
const rand = audioRand;
const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84];

export const cueMethods = {
  /* ---------- efectos ---------- */

  limit(key, gap) {
    const now = this.ctx.currentTime;
    if (this.last[key] !== undefined && now - this.last[key] < gap) return false;
    this.last[key] = now;
    return true;
  },

  sfx(name, opts = {}) {
    if (!this.live) return;
    const pan = Math.max(-1, Math.min(1, opts.pan || 0));
    const b = this.sfxBus;
    switch (name) {
      case 'chispa': {
        if (!this.limit('chispa', 0.07)) return;
        const out = this.out(b, pan, 0.08);
        const sacred = (opts.character || this.character) === 'matilde';
        this.noiseShot(out, {dur: sacred ? 0.08 : 0.065, f0: sacred ? 2800 : 3400, f1: 1200, q: 1.5, vol: 0.055});
        this.tone(out, {type: sacred ? 'sine' : 'triangle', f0: sacred ? 1175 : rand(920, 1120), f1: sacred ? 880 : 460, dur: sacred ? 0.15 : 0.09, vol: 0.035});
        this.tone(out, {f0: 170, f1: 82, dur: 0.045, vol: 0.035});
        break;
      }
      case 'sal': {
        if (!this.limit('sal', 0.12)) return;
        const out = this.out(b, pan, 0.12);
        this.noiseShot(out, {dur: 0.16, type: 'lowpass', f0: 5200, f1: 700, q: 0.7, vol: 0.12, attack: 0.002});
        this.tone(out, {f0: 120, f1: 48, dur: 0.12, vol: 0.12});
        // El golpe grave de la descarga acaba en granos sobre piedra.
        const t = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) this.noiseShot(out, {dur: 0.028, type: 'highpass', f0: 4200,
          f1: 2600, vol: 0.018, when: t + 0.055 + i * 0.026});
        break;
      }
      case 'golpe': {
        if (!this.limit('golpe', 0.05)) return;
        const out = this.out(b, pan, 0);
        this.tone(out, {f0: rand(170, 220), f1: 80, dur: 0.06, vol: 0.045});
        break;
      }
      case 'muerte': {
        if (!this.limit('muerte', 0.045)) return;
        const out = this.out(b, pan, 0.15);
        this.noiseShot(out, {dur: 0.18, f0: rand(1300, 1700), f1: 260, q: 0.9, vol: 0.05, attack: 0.01});
        this.tone(out, {type: 'triangle', f0: rand(520, 600), f1: 300, dur: 0.12, vol: 0.012});
        break;
      }
      case 'apagar': {
        if (!this.limit('apagar', 0.06)) return;
        const out = this.out(b, pan, 0.2);
        this.noiseShot(out, {dur: 0.22, type: 'highpass', f0: 2600, f1: 1400, q: 0.5, vol: 0.04, attack: 0.02});
        break;
      }
      case 'luz': {
        if (!this.limit('luz', 0.035)) return;
        this.combo = Math.min(PENTA.length - 1, this.combo + 1);
        this.comboClock = 0.55;
        const out = this.out(b, pan * 0.5, 0.25);
        this.tone(out, {type: 'sine', f0: midiHz(PENTA[this.combo] + 12), dur: 0.11, vol: 0.022, attack: 0.003});
        break;
      }
      case 'cafe': {
        const out = this.out(b, 0, 0.3);
        this.tone(out, {type: 'sine', f0: 660, f1: 990, dur: 0.18, vol: 0.05});
        this.tone(out, {type: 'sine', f0: 990, dur: 0.25, vol: 0.03, when: this.ctx.currentTime + 0.09});
        break;
      }
      case 'recuerdo': this.memoryMotif(); break;
      case 'herida': {
        if (!this.limit('herida', 0.2)) return;
        const out = this.out(b, 0, 0.15);
        this.tone(out, {f0: 120, f1: 44, dur: 0.26, vol: 0.32});
        this.noiseShot(out, {dur: 0.14, type: 'lowpass', f0: 900, f1: 200, vol: 0.14});
        break;
      }
      case 'esquiva': {
        const out = this.out(b, pan, 0.2);
        this.noiseShot(out, {dur: 0.24, f0: 380, f1: 2600, q: 1.2, vol: 0.06, attack: 0.03});
        break;
      }
      case 'paso': {
        if (!this.limit('paso', 0.18)) return;
        const out = this.out(b, pan, 0.035, 0.8);
        const soft = ['grass', 'mud', 'hierba', 'barro'].includes(opts.surface);
        this.noiseShot(out, {dur: soft ? 0.075 : 0.045, type: 'bandpass', f0: soft ? 700 : 1500,
          f1: soft ? 260 : 520, q: 0.55, vol: soft ? 0.025 : 0.032});
        this.tone(out, {f0: rand(105, 130), f1: 65, dur: 0.045, vol: 0.018});
        break;
      }
      case 'select': {
        if (!this.limit('select', 0.08)) return;
        const out = this.out(b, 0, 0.12, 0.6);
        this.tone(out, {f0: 740, f1: 880, dur: 0.065, vol: 0.035});
        break;
      }
      case 'pulse': {
        if (!this.limit('pulse', 0.35)) return;
        const t = this.ctx.currentTime, out = this.out(b, pan, 0.32, 4);
        const character = opts.character || this.character || 'lucia';
        if (character === 'julian') {
          // La sal se derrama alrededor del sepulturero y queda vibrando.
          this.noiseShot(out, {dur: 0.65, type: 'highpass', f0: 4200, f1: 700, vol: 0.12, attack: 0.045});
          this.tone(out, {f0: 92, f1: 41, dur: 0.5, vol: 0.16});
          for (let i = 0; i < 6; i++) this.tone(out, {f0: midiHz(86 + i % 3 * 2),
            dur: 0.12, vol: 0.022, when: t + i * 0.07});
        } else if (character === 'matilde') {
          // Responso: consonancia de voces, más cálida que una alarma.
          for (const [i, note] of [62, 65, 69, 74].entries()) {
            this.tone(out, {f0: midiHz(note), dur: 1.5, vol: 0.045, attack: 0.16, when: t + i * 0.055});
            this.tone(out, {f0: midiHz(note) * 2.003, dur: 0.85, vol: 0.012, attack: 0.13, when: t + i * 0.055});
          }
          this.bellStrike(587.3, {vol: 0.035, decay: 1.5, send: 0.4});
        } else {
          // Lucía abre el fuego de la vela: aspiración, ráfaga y ascuas.
          this.noiseShot(out, {dur: 0.16, type: 'bandpass', f0: 400, f1: 2400, vol: 0.11, attack: 0.04});
          this.noiseShot(out, {dur: 0.52, type: 'lowpass', f0: 4800, f1: 180, vol: 0.16, attack: 0.014, when: t + 0.12});
          this.tone(out, {f0: 240, f1: 55, dur: 0.45, vol: 0.15, when: t + 0.12});
          for (let i = 0; i < 4; i++) this.noiseShot(out, {dur: 0.035, f0: 3200, f1: 1600,
            vol: 0.023, when: t + 0.25 + i * 0.08});
        }
        break;
      }
      case 'ritual': {
        if (!this.limit('ritual', 0.5)) return;
        const t = this.ctx.currentTime;
        [62, 69, 74].forEach((note, i) => this.bellStrike(midiHz(note),
          {when: t + i * 0.18, vol: 0.045, decay: 2.8, send: 0.45, pan: (i - 1) * 0.18}));
        this.noiseShot(this.out(b, 0, 0.25, 2), {dur: 0.8, type: 'highpass', f0: 800, f1: 4200, vol: 0.035, attack: 0.22});
        break;
      }
      case 'ritualReady': {
        if (!this.limit('ritualReady', 0.8)) return;
        const t = this.ctx.currentTime, out = this.out(b, 0, 0.22, 1.5);
        this.tone(out, {f0: midiHz(74), dur: 0.28, vol: 0.032, attack: 0.02});
        this.tone(out, {f0: midiHz(81), dur: 0.42, vol: 0.024, attack: 0.025, when: t + 0.14});
        break;
      }
      case 'perfectDash': {
        if (!this.limit('perfectDash', 0.3)) return;
        const out = this.out(b, pan, 0.22, 1.2);
        this.tone(out, {f0: 880, f1: 1320, dur: 0.22, vol: 0.045});
        break;
      }
      case 'campana': {
        if (!this.limit('campana', 0.3)) return;
        this.bellStrike(rand(640, 680), {vol: 0.06, decay: 1.9, send: 0.35});
        break;
      }
      case 'gruñido': {
        if (!this.limit('gruñido', 0.6)) return;
        const out = this.out(b, pan, 0.1);
        this.noiseShot(out, {dur: 0.55, type: 'lowpass', f0: 260, f1: 140, q: 4, vol: 0.09, attack: 0.05});
        break;
      }
      case 'chillido': {
        if (!this.limit('chillido', 0.5)) return;
        const out = this.out(b, pan, 0.2);
        this.noiseShot(out, {dur: 0.32, f0: 2600, f1: 1700, q: 6, vol: 0.035, attack: 0.03});
        break;
      }
      case 'lagrima': {
        if (!this.limit('lagrima', 0.12)) return;
        const out = this.out(b, pan, 0.25);
        this.tone(out, {type: 'triangle', f0: 760, f1: 420, dur: 0.16, vol: 0.022});
        break;
      }
      case 'salpica': {
        if (!this.limit('salpica', 0.08)) return;
        const out = this.out(b, pan, 0.25);
        this.noiseShot(out, {dur: 0.25, type: 'highpass', f0: 1800, f1: 3500, vol: 0.06});
        this.tone(out, {type: 'sine', f0: 1600, f1: 2100, dur: 0.1, vol: 0.012});
        break;
      }
      case 'hora': this.toll(opts.count || 1, opts.gap || 2.3); break;
      case 'guia': {
        const t = this.ctx.currentTime;
        this.bellStrike(73.4, {vol: 0.34, decay: 8, send: 0.8});
        const out = this.out(b, 0, 0.4);
        this.noiseShot(out, {dur: 3.2, type: 'lowpass', f0: 90, f1: 160, q: 2, vol: 0.12, attack: 1.2, when: t});
        break;
      }
      case 'reloj': {
        const t = this.ctx.currentTime;
        this.bellStrike(98, {vol: 0.12, decay: 0.9, send: 0.5});
        this.tone(b, {type: 'square', f0: 1200, f1: 900, dur: 0.03, vol: 0.02, when: t + 0.02});
        this.duck.gain.cancelScheduledValues(t);
        this.duck.gain.setValueAtTime(0.3, t + 0.05);
        this.duck.gain.setTargetAtTime(1, t + 1.6, 0.6);
        break;
      }
      case 'liberada': {
        const t = this.ctx.currentTime;
        [50, 57, 62, 66, 69, 74].forEach((n, i) => this.pluck(n, {when: t + i * 0.13, vol: 0.2, send: 0.6}));
        this.bellStrike(146.8, {vol: 0.16, decay: 6, send: 0.8, when: t + 0.05});
        break;
      }
      case 'apagon': {
        const t = this.ctx.currentTime;
        this.tone(b, {f0: 220, f1: 55, dur: 1.6, vol: 0.18, attack: 0.02});
        this.noiseShot(this.out(b, 0, 0.6), {dur: 1.2, type: 'lowpass', f0: 800, f1: 90, vol: 0.12, attack: 0.01, when: t});
        break;
      }
      case 'alba': this.nana({vol: 0.22, tempo: 0.95, dawn: true}); break;
      default: break;
    }
  },

  /* La campana de la torre da la hora. */
  toll(count, gap = 2.3) {
    if (!this.live) return;
    const t = this.ctx.currentTime + 0.05;
    for (let i = 0; i < count; i++) this.bellStrike(146.8, {when: t + i * gap, vol: 0.17 * (count > 6 ? 0.8 : 1), decay: 6.5, send: 0.75});
  },
};
