/*
 * Orquesta de la vigilia: ciclo de vida, mezcla y paisaje sonoro.
 * Las voces se sintetizan sin archivos ni dependencias; funciona sin conexión.
 */
import { synthMethods, audioRand } from './audio-synth.js';
import { scoreMethods } from './audio-score.js';
import { cueMethods } from './audio-cues.js';
const rand = audioRand;

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8;
    this.mix = {music: 0.75, ambience: 0.7, effects: 0.85};
    this.ready = false;
    this.plucks = new Map();
    this.last = {};
    this.combo = 0;
    this.comboClock = 0;
    this.nanaStep = 0;
    this.clock = 0;
    this.scene = 'title';
    this.transients = [];
    this.maxGroups = 128;
    this.stepSide = 1;
    this.scoreStep = 0;
    this.timers = {cricket: 0.5, owl: 14, bird: 1, heart: 0, sea: 0, nana: 2.5, ctl: 0, step: 0, score: 3, flame: 0.4};
  }

  /* custom: un OfflineAudioContext para medir niveles en pruebas. */
  init(custom) {
    if (this.ctx) { this.resume(); return; }
    if (custom) { this.ctx = custom; this.offline = true; }
    else {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch { this.ctx = null; return; }
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.duck = c.createGain();
    this.duck.gain.value = 1;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    this.duck.connect(this.master); this.master.connect(comp); comp.connect(c.destination);
    this.sfxBus = this.gain(this.mix.effects, this.duck);
    this.ambBus = this.gain(this.mix.ambience, this.duck);
    this.musicBus = this.gain(this.mix.music, this.duck);
    // Cada retorno termina en su categoría: silenciar música elimina también
    // su reverberación, sin silenciar las campanas ni el mar.
    this.reverbs = new Map();
    const impulse = this.impulse(2.8);
    for (const bus of [this.sfxBus, this.ambBus, this.musicBus]) {
      const reverb = c.createConvolver();
      reverb.buffer = impulse;
      reverb.connect(this.gain(0.42, bus));
      this.reverbs.set(bus, reverb);
    }
    this.noise = this.noiseBuffer(2.5);
    this.buildAmbient();
    this.ready = true;
    if (this.muted && !this.offline) c.suspend?.().catch(() => {});
  }

  resume() { if (this.ctx && !this.offline && !this.muted && this.ctx.state !== 'running') this.ctx.resume?.().catch(() => {}); }

  setMuted(value) {
    this.muted = !!value;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.05);
    clearTimeout(this.muteTimer);
    if (!this.offline) {
      if (this.muted) this.muteTimer = setTimeout(() => { if (this.muted) this.ctx?.suspend?.().catch(() => {}); }, 200);
      else this.ctx.resume?.().catch(() => {});
    }
  }

  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this.volume = Math.max(0, Math.min(1, value));
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  setMix(values = {}) {
    const buses = {music: this.musicBus, ambience: this.ambBus, effects: this.sfxBus};
    for (const key of Object.keys(this.mix)) {
      if (!Number.isFinite(values[key])) continue;
      this.mix[key] = Math.max(0, Math.min(1, values[key]));
      if (this.ctx && buses[key]) {
        const gain = buses[key].gain, now = this.ctx.currentTime;
        gain.cancelScheduledValues(now);
        gain.setTargetAtTime(this.mix[key], now, 0.035);
      }
    }
  }

  destroy() {
    clearTimeout(this.muteTimer);
    this.ready = false;
    for (const group of this.transients) for (const node of group.nodes) node.disconnect();
    this.transients = [];
    if (this.ctx && !this.offline) this.ctx.close?.().catch(() => {});
    this.ctx = null;
    this.plucks.clear();
  }

  get live() { return this.ready && !this.muted && (this.offline || this.ctx.state === 'running'); }

  /* ---------- ambiente ---------- */

  buildAmbient() {
    const c = this.ctx;
    const loop = () => { const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; return s; };
    // Viento
    this.wind = {src: loop(), filter: c.createBiquadFilter(), gain: this.gain(0.0001, this.ambBus)};
    this.wind.filter.type = 'bandpass'; this.wind.filter.Q.value = 0.8; this.wind.filter.frequency.value = 420;
    this.wind.src.connect(this.wind.filter); this.wind.filter.connect(this.wind.gain); this.wind.src.start();
    // Mar
    this.sea = {src: loop(), filter: c.createBiquadFilter(), gain: this.gain(0.0001, this.ambBus)};
    this.sea.filter.type = 'lowpass'; this.sea.filter.frequency.value = 380; this.sea.filter.Q.value = 0.2;
    this.sea.src.connect(this.sea.filter);
    const seaOut = c.createStereoPanner ? c.createStereoPanner() : this.gain(1);
    if (seaOut.pan) seaOut.pan.value = 0.52; // El mar está al este del camposanto.
    this.sea.filter.connect(seaOut); seaOut.connect(this.sea.gain); this.sea.src.start(0, 0.7);
    // Zumbido grave que sube con el peligro
    this.drone = {gain: this.gain(0.0001, this.ambBus), filter: c.createBiquadFilter(), oscs: []};
    this.drone.filter.type = 'lowpass'; this.drone.filter.frequency.value = 160; this.drone.filter.Q.value = 3;
    this.drone.filter.connect(this.drone.gain);
    for (const f of [36.7, 36.95, 55.1]) {
      const o = c.createOscillator();
      o.type = f > 50 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      o.connect(this.drone.filter); o.start();
      this.drone.oscs.push(o);
    }
  }

  /* Se llama cada fotograma con el estado de la noche. */
  update(dt, s = {}) {
    if (!this.ready) return;
    this.pruneVoices();
    this.clock += dt;
    this.comboClock = Math.max(0, this.comboClock - dt);
    if (this.comboClock === 0) this.combo = 0;
    if (!this.live) return;
    const c = this.ctx, now = c.currentTime;
    const scene = s.scene || 'title';
    this.character = s.character || this.character || 'lucia';
    if (scene !== this.scene) {
      this.timers.score = scene === 'run' ? 1.5 : 3;
      if (scene === 'title') this.scoreStep = 0;
      this.scene = scene;
    }
    const hour = s.hour || 0;
    const T = this.timers;
    T.ctl -= dt;
    if (T.ctl <= 0) {
      T.ctl = 0.12;
      const gust = 0.5 + 0.5 * Math.sin(this.clock * 0.37) * Math.sin(this.clock * 0.13 + 1);
      const windVol = (scene === 'dawn' ? 0.012 : 0.018 + gust * 0.03) * (hour > 2.8 && hour < 4.6 ? 1.35 : 1);
      this.wind.gain.gain.setTargetAtTime(windVol, now, 0.4);
      this.wind.filter.frequency.setTargetAtTime(300 + gust * 520, now, 0.5);
      const danger = scene === 'run' ? Math.max(0, Math.min(1, s.danger || 0)) : 0;
      const droneVol = scene === 'run' ? 0.012 + danger * 0.045 + (s.boss ? 0.03 : 0) : scene === 'end' ? 0 : 0.004;
      this.drone.gain.gain.setTargetAtTime(droneVol, now, 0.8);
      this.drone.filter.frequency.setTargetAtTime(120 + danger * 380 + (s.boss ? 160 : 0), now, 0.6);
      this.duck.gain.setTargetAtTime(scene === 'pause' ? 0.35 : 1, now, 0.15);
    }
    // Los pasos siguen el desplazamiento real; esquivar y pausar los suspenden.
    T.step -= dt;
    if (scene === 'run' && s.moving && !s.dash && T.step <= 0) {
      T.step = Math.max(0.22, Math.min(0.46, 44 / Math.max(95, s.speed || 125)));
      this.sfx('paso', {pan: this.stepSide * 0.09, surface: s.surface});
      this.stepSide *= -1;
    } else if (!s.moving || scene !== 'run') T.step = 0.06;
    // Leña/cera próxima al velatorio; el murmullo crece al encender un farol.
    T.flame -= dt;
    if (T.flame <= 0) {
      T.flame = rand(0.35, 0.95);
      if ((scene === 'title' || scene === 'run') && (scene === 'title' || s.nearCoffin || s.ritualProgress > 0)) {
        const out = this.out(this.ambBus, rand(-0.2, 0.2), 0.08, 1.2);
        this.noiseShot(out, {dur: 0.055, type: 'highpass', f0: 1600, f1: 700, vol: 0.018 + (s.ritualProgress || 0) * 0.024});
      }
    }
    // El mar respira cada pocos segundos.
    T.sea -= dt;
    if (T.sea <= 0) {
      T.sea = rand(6.5, 10);
      const peak = scene === 'dawn' ? 0.05 : 0.07;
      this.sea.gain.gain.cancelScheduledValues(now);
      this.sea.gain.gain.setTargetAtTime(peak, now, 1.4);
      this.sea.gain.gain.setTargetAtTime(0.012, now + 3.2, 1.8);
      this.sea.filter.frequency.setTargetAtTime(rand(320, 520), now, 1.5);
    }
    // Grillos hasta las tres; luego callan.
    const crickets = scene === 'title' ? 1 : scene === 'run' || scene === 'pause' ? Math.max(0, 1 - hour / 3.1) : 0;
    T.cricket -= dt;
    if (T.cricket <= 0) {
      T.cricket = rand(0.25, 0.9) / Math.max(0.15, crickets);
      if (crickets > 0.05 && scene !== 'pause') this.cricket(rand(-0.8, 0.8), crickets);
    }
    // La lechuza, de vez en cuando.
    T.owl -= dt;
    if (T.owl <= 0) {
      T.owl = rand(24, 55);
      if ((scene === 'title' || (scene === 'run' && hour > 0.4 && hour < 5.3))) this.owl(rand(-0.9, 0.9));
    }
    // Pájaros al clarear.
    const birds = scene === 'dawn' ? 1 : scene === 'run' && hour > 5.45 && !s.boss ? (hour - 5.45) * 1.6 : 0;
    T.bird -= dt;
    if (T.bird <= 0) {
      T.bird = rand(0.35, 1.4) / Math.max(0.2, birds);
      if (birds > 0.05) this.bird(rand(-0.9, 0.9));
    }
    // Latido con poca vida.
    if (scene === 'run' && (s.hp ?? 1) < 0.3) {
      T.heart -= dt;
      if (T.heart <= 0) { T.heart = 0.62 + (s.hp || 0) * 1.2; this.heartbeat(); }
    } else T.heart = 0.2;
    // En la pantalla de título suena la nana, sin prisa.
    if (scene === 'title') {
      T.nana -= dt;
      if (T.nana <= 0) { T.nana = 34; this.nana({vol: 0.16, tempo: 0.86}); }
    } else T.nana = Math.min(T.nana, 6);
    // Una frase breve responde al peligro, dejando espacio para oír ataques.
    T.score -= dt;
    if (scene === 'run' && T.score <= 0) {
      const danger = Math.max(0, Math.min(1, s.danger || 0));
      T.score = s.boss ? 2.4 : danger > 0.35 ? 4.2 : 7.2;
      this.nightPhrase({hour, danger, boss: !!s.boss, refuge: !!s.nearCoffin});
    }
  }

  cricket(pan, density) {
    const out = this.out(this.ambBus, pan, 0.1);
    out.gain.value = 0.012 * (0.6 + density * 0.4);
    const t = this.ctx.currentTime, f = rand(4300, 4900), pulses = 3 + (Math.random() * 2 | 0);
    for (let i = 0; i < pulses; i++) this.tone(out, {f0: f, dur: 0.028, vol: 1, attack: 0.003, when: t + i * 0.045});
  }

  owl(pan) {
    const out = this.out(this.ambBus, pan, 0.5);
    out.gain.value = 0.05;
    const t = this.ctx.currentTime;
    const hoot = (when, f, dur) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f * 1.04, when); o.frequency.exponentialRampToValueAtTime(f, when + dur);
      lfo.frequency.value = 7; lg.gain.value = 6; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(1, when + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.onended = () => { o.disconnect(); g.disconnect(); };
      lfo.onended = () => { lfo.disconnect(); lg.disconnect(); };
      o.connect(g); g.connect(out); o.start(when); lfo.start(when); o.stop(when + dur + 0.05); lfo.stop(when + dur + 0.05);
    };
    hoot(t, 410, 0.42);
    hoot(t + 0.62, 372, 0.3);
    hoot(t + 1.02, 372, 0.7);
  }

  bird(pan) {
    const out = this.out(this.ambBus, pan, 0.25);
    out.gain.value = 0.028;
    const t = this.ctx.currentTime, n = 2 + (Math.random() * 4 | 0), base = rand(2600, 3600);
    for (let i = 0; i < n; i++) {
      const w = t + i * rand(0.07, 0.13), up = Math.random() > 0.4;
      this.tone(out, {f0: up ? base : base * 1.35, f1: up ? base * 1.4 : base * 0.9, dur: rand(0.05, 0.1), vol: 1, attack: 0.008, when: w});
    }
  }

  heartbeat() {
    const t = this.ctx.currentTime;
    this.tone(this.sfxBus, {f0: 70, f1: 42, dur: 0.12, vol: 0.18, when: t});
    this.tone(this.sfxBus, {f0: 62, f1: 40, dur: 0.14, vol: 0.13, when: t + 0.18});
  }

}

Object.assign(AudioEngine.prototype, synthMethods, scoreMethods, cueMethods);
