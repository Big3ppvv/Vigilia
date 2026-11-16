/*
 * Sonido generado en el navegador, sin archivos. Este módulo es el motor:
 * la mezcla, las piezas con las que se hace cada sonido y el ambiente de la
 * noche (viento, mar, orballo, grillos, la lechuza). Los efectos están en
 * sfx.js y la música, en music.js.
 */
import { cueMethods } from './audio-cues.js';
import { SFX } from './sfx.js';
import { ROUND_SFX } from './sfx-rondas.js';
import { Score, NANA, NANA_BASS } from './music.js';

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

Object.assign(SFX, ROUND_SFX);

/* Nivel base de cada grupo; los ajustes del jugador lo multiplican. */
const BUS = {sfx: 0.85, amb: 0.7, music: 1.15};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8;
    this.mix = {sfx: 1, amb: 1, music: 1};
    this.ready = false;
    this.plucks = new Map();
    this.last = {};
    this.combo = 0;
    this.comboClock = 0;
    this.nanaStep = 0;
    this.clock = 0;
    this.scene = 'title';
    this.timers = {cricket: 0.5, owl: 14, bird: 1, heart: 0, sea: 0, nana: 2.5, ctl: 0, soul: 0, drip: 3};
    this.score = new Score(this);
  }

  /* custom: un OfflineAudioContext para medir niveles en pruebas. */
  init(custom) {
    if (this.ctx) { this.resume(); return; }
    if (custom) { this.ctx = custom; this.offline = true; }
    else {
      const AC = window.AudioContext || window.webkitAudioContext;
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
    // Detrás, un tope para los momentos en que todo suena a la vez.
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -4; limiter.knee.value = 2; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.12;
    this.duck.connect(this.master); this.master.connect(comp); comp.connect(limiter); limiter.connect(c.destination);
    this.sfxBus = this.gain(BUS.sfx * this.mix.sfx, this.duck);
    this.ambBus = this.gain(BUS.amb * this.mix.amb, this.duck);
    this.musicBus = this.gain(BUS.music * this.mix.music, this.duck);
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.impulse(3.4);
    this.reverb.connect(this.gain(0.55, this.duck));
    this.noise = this.noiseBuffer(2.5);
    this.buildAmbient();
    this.score.build();
    this.ready = true;
    if (this.muted && !this.offline) c.suspend?.().catch(() => {});
  }

  resume() { if (this.ctx && !this.muted && this.ctx.state !== 'running') this.ctx.resume?.().catch(() => {}); }

  setMuted(value) {
    this.muted = !!value;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.05);
    if (this.muted) setTimeout(() => { if (this.muted) this.ctx.suspend?.().catch(() => {}); }, 200);
    else this.ctx.resume?.().catch(() => {});
  }

  setVolume(value) {
    this.volume = clamp(value, 0, 1);
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  /* Volumen de cada grupo, de 0 a 1: {music, sfx, amb}. */
  setMix(mix) {
    for (const key of ['music', 'sfx', 'amb']) if (mix[key] !== undefined) this.mix[key] = clamp(Number(mix[key]) || 0, 0, 1);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(BUS.sfx * this.mix.sfx, now, 0.05);
    this.ambBus.gain.setTargetAtTime(BUS.amb * this.mix.amb, now, 0.05);
    this.musicBus.gain.setTargetAtTime(BUS.music * this.mix.music, now, 0.05);
  }

  get live() { return this.ready && !this.muted && (this.offline || this.ctx.state === 'running'); }

  /* ---------- piezas básicas ---------- */

  gain(value, dest) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    if (dest) g.connect(dest);
    return g;
  }

  /* Salida de un sonido: su volumen, su sitio entre izquierda y derecha y cuánto va a la reverberación. */
  out(bus, pan = 0, send = 0) {
    const c = this.ctx;
    const g = c.createGain();
    let node = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p); node = p;
    }
    node.connect(bus);
    if (send > 0) { const s = this.gain(send, this.reverb); node.connect(s); }
    return g;
  }

  noiseBuffer(seconds) {
    const c = this.ctx, len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  impulse(seconds) {
    const c = this.ctx, rate = c.sampleRate, len = Math.floor(rate * seconds);
    const buf = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Más apagado con el tiempo: la piedra se come los agudos.
        const k = 0.15 + t * 0.8;
        lp += k * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.pow(1 - t, 2.4) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    return buf;
  }

  noiseShot(dest, {dur = 0.1, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, vol = 0.05, attack = 0.004, when = 0} = {}) {
    const c = this.ctx, t = when || c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const filter = c.createBiquadFilter();
    filter.type = type; filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(dest);
    if (dur > 0.8) { src.loop = true; src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05); }
    else src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  /* vib: [hercios, profundidad en hercios] para un temblor de voz. */
  tone(dest, {type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.05, attack = 0.005, when = 0, vib = null} = {}) {
    const c = this.ctx, t = when || c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) {
      const lfo = c.createOscillator(), depth = c.createGain();
      lfo.frequency.value = vib[0]; depth.gain.value = vib[1];
      lfo.connect(depth); depth.connect(o.frequency);
      lfo.start(t); lfo.stop(t + dur + 0.05);
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /* Golpe de tambor: un grave que cae y un poco de parche. */
  thump(dest, {when = 0, f0 = 92, f1 = 44, dur = 0.2, vol = 0.1} = {}) {
    const t = when || this.ctx.currentTime;
    this.tone(dest, {f0, f1, dur, vol, attack: 0.003, when: t});
    this.noiseShot(dest, {dur: 0.045, type: 'lowpass', f0: 900, f1: 300, vol: vol * 0.45, attack: 0.002, when: t});
  }

  /* Campanilla: tres parciales agudos y breves. */
  tinkle(dest, {when = 0, f = 1568, vol = 0.03, decay = 0.9} = {}) {
    const t = when || this.ctx.currentTime;
    for (const [ratio, amp, life] of [[1, 1, 1], [2.76, 0.4, 0.5], [5.4, 0.16, 0.25]]) this.tone(dest, {f0: f * ratio, dur: decay * life, vol: vol * amp, attack: 0.002, when: t});
  }

  /* Cuerda pulsada (Karplus-Strong), calculada una vez por nota. */
  pluckBuffer(midi) {
    if (this.plucks.has(midi)) return this.plucks.get(midi);
    const c = this.ctx, rate = c.sampleRate, f = midiHz(midi);
    const seconds = midi < 55 ? 3.2 : 2.4;
    const len = Math.floor(rate * seconds), period = Math.max(2, Math.round(rate / f));
    const buf = c.createBuffer(1, len, rate), d = buf.getChannelData(0);
    const ring = new Float32Array(period);
    let prev = 0;
    for (let i = 0; i < period; i++) {
      const n = Math.random() * 2 - 1;
      prev = prev * 0.55 + n * 0.45; // ataque más suave, como de nailon
      ring[i] = prev;
    }
    const decay = midi < 55 ? 0.9985 : 0.9965;
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const next = (idx + 1) % period;
      const v = ring[idx];
      ring[idx] = (v + ring[next]) * 0.5 * decay;
      d[i] = v;
      idx = next;
    }
    this.plucks.set(midi, buf);
    return buf;
  }

  pluck(midi, {when = 0, vol = 0.22, pan = 0, send = 0.35, bus = this.musicBus, bright = 2600} = {}) {
    if (!this.ready) return;
    const c = this.ctx, t = when || c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.pluckBuffer(midi);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = bright; lp.Q.value = 0.3;
    const g = this.out(bus, pan, send);
    g.gain.value = vol;
    src.connect(lp); lp.connect(g);
    src.start(t);
  }

  /* Una nota tarareada: voz sin letra, con su temblor. */
  hum(midi, {when = 0, dur = 0.5, vol = 0.08, vib = 5.2, depth = 0.012, bus = this.musicBus, pan = 0, send = 0.4} = {}) {
    const c = this.ctx, t = when || c.currentTime, f = midiHz(midi);
    const out = this.out(bus, pan, send);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = Math.min(2200, f * 3.2); lp.Q.value = 1.1;
    lp.connect(out);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
    g.gain.setValueAtTime(vol, t + Math.max(0.08, dur - 0.12));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
    g.connect(lp);
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = vib; lg.gain.value = f * depth;
    lfo.connect(lg);
    for (const [type, mul, amp] of [['triangle', 1, 1], ['sine', 2, 0.22]]) {
      const o = c.createOscillator(), og = c.createGain();
      o.type = type; o.frequency.value = f * mul; og.gain.value = amp;
      lg.connect(o.frequency);
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur + 0.2);
    }
    lfo.start(t); lfo.stop(t + dur + 0.2);
  }

  /* Campana: parciales inarmónicos con batido. */
  bellStrike(fund, {when = 0, vol = 0.2, decay = 5, pan = 0, send = 0.6, bus = this.sfxBus} = {}) {
    const c = this.ctx, t = when || c.currentTime;
    const out = this.out(bus, pan, send);
    out.gain.value = vol;
    const partials = [[0.5, 0.5, 1.4], [1, 1, 1], [1.19, 0.45, 0.7], [1.5, 0.35, 0.55], [2, 0.5, 0.5], [2.51, 0.22, 0.35], [2.66, 0.18, 0.3], [3.01, 0.15, 0.25], [4.16, 0.1, 0.18]];
    for (const [ratio, amp, life] of partials) {
      for (const detune of [0, 0.7]) {
        if (detune && ratio > 2.1) continue;
        const o = c.createOscillator();
        o.type = 'sine';
        o.frequency.value = fund * ratio + detune;
        const g = c.createGain();
        const end = t + decay * life;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp * (detune ? 0.5 : 1), t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, end);
        o.connect(g); g.connect(out);
        o.start(t); o.stop(end + 0.05);
      }
    }
    this.noiseShot(out, {dur: 0.05, type: 'highpass', f0: 3000, vol: 0.15, when: t});
  }

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
    this.sea.src.connect(this.sea.filter); this.sea.filter.connect(this.sea.gain); this.sea.src.start(0, 0.7);
    // Orballo: un siseo fino, sin graves
    this.rain = {src: loop(), filter: c.createBiquadFilter(), gain: this.gain(0.0001, this.ambBus)};
    this.rain.filter.type = 'highpass'; this.rain.filter.frequency.value = 3400; this.rain.filter.Q.value = 0.3;
    this.rain.src.connect(this.rain.filter); this.rain.filter.connect(this.rain.gain); this.rain.src.start(0, 1.3);
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
  update(dt, s) {
    if (!this.ready) return;
    this.clock += dt;
    this.comboClock = Math.max(0, this.comboClock - dt);
    if (this.comboClock === 0) this.combo = 0;
    if (!this.live) return;
    const c = this.ctx, now = c.currentTime;
    const scene = s.scene || 'title';
    this.scene = scene;
    const hour = s.hour || 0, playing = scene === 'run' || scene === 'pause';
    const T = this.timers;
    T.ctl -= dt;
    if (T.ctl <= 0) {
      T.ctl = 0.12;
      const gust = 0.5 + 0.5 * Math.sin(this.clock * 0.37) * Math.sin(this.clock * 0.13 + 1);
      const windVol = (scene === 'dawn' ? 0.012 : 0.018 + gust * 0.03) * (hour > 2.8 && hour < 4.6 ? 1.35 : 1);
      this.wind.gain.gain.setTargetAtTime(windVol, now, 0.4);
      this.wind.filter.frequency.setTargetAtTime(300 + gust * 520, now, 0.5);
      const danger = scene === 'run' ? (s.danger || 0) : 0;
      const droneVol = scene === 'run' ? 0.012 + danger * 0.036 + (s.boss ? 0.012 : 0) + (s.soul || 0) * 0.03 : scene === 'end' ? 0 : 0.004;
      this.drone.gain.gain.setTargetAtTime(droneVol, now, 0.8);
      this.drone.filter.frequency.setTargetAtTime(120 + danger * 380 + (s.boss ? 160 : 0), now, 0.6);
      this.rain.gain.gain.setTargetAtTime((scene === 'end' ? 0 : s.rain || 0) * 0.016, now, 1.2);
      // La pausa lo baja todo; el arrullo deja oír la nana por encima de lo demás.
      this.duck.gain.setTargetAtTime(scene === 'pause' ? 0.35 : 1, now, 0.15);
      this.ambBus.gain.setTargetAtTime(BUS.amb * this.mix.amb * (s.lull > 0 ? 0.45 : 1), now, 0.25);
    }
    // El mar respira cada pocos segundos; con la marea, más cerca.
    T.sea -= dt;
    if (T.sea <= 0) {
      T.sea = rand(6.5, 10);
      const peak = (scene === 'dawn' ? 0.05 : 0.07) * (s.tide ? 1.45 : 1);
      this.sea.gain.gain.cancelScheduledValues(now);
      this.sea.gain.gain.setTargetAtTime(peak, now, 1.4);
      this.sea.gain.gain.setTargetAtTime(0.012, now + 3.2, 1.8);
      this.sea.filter.frequency.setTargetAtTime(rand(320, 520), now, 1.5);
    }
    // Grillos hasta las tres; luego callan. Con el orballo se oyen menos.
    const crickets = (scene === 'title' ? 1 : playing ? Math.max(0, 1 - hour / 3.1) : 0) * (1 - (s.rain || 0) * 0.7);
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
    // A oscuras, algo tira de Amparo: un golpe grave cada vez más seguido.
    if (scene === 'run' && (s.soul || 0) > 0.02) {
      T.soul -= dt;
      if (T.soul <= 0) { T.soul = 1.35 - s.soul * 0.85; this.sfx('alma', {level: s.soul}); }
    } else T.soul = 0.3;
    // En la pantalla de título y en el puesto de Remedios suena la nana, sin prisa.
    if (scene === 'title' || scene === 'shop') {
      T.nana -= dt;
      if (T.nana <= 0) { T.nana = 34; this.nana({vol: 0.16, tempo: 0.86}); }
    } else T.nana = Math.min(T.nana, 6);
    this.score.update(s);
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
    this.tone(out, {f0: 426, f1: 410, dur: 0.42, vol: 1, attack: 0.06, when: t, vib: [7, 6]});
    this.tone(out, {f0: 387, f1: 372, dur: 0.3, vol: 1, attack: 0.06, when: t + 0.62, vib: [7, 6]});
    this.tone(out, {f0: 387, f1: 372, dur: 0.7, vol: 1, attack: 0.06, when: t + 1.02, vib: [7, 6]});
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

  /* ---------- la nana ---------- */

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
  }

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
  }

  /* El arrullo: quien vela tararea el siguiente trozo, cada uno con su voz. */
  hummed(voice = 'lucia') {
    if (!this.live) return;
    const v = {lucia: {shift: 0, vib: 5.2, depth: 0.012}, julian: {shift: -12, vib: 4.4, depth: 0.008}, matilde: {shift: -2, vib: 6.4, depth: 0.022}}[voice] || {shift: 0, vib: 5.2, depth: 0.012};
    let t = this.ctx.currentTime + 0.05, beats = 0;
    const beat = 0.44;
    for (let k = 0; k < 16 && beats < 8.5; k++) {
      const [note, len] = NANA[(this.nanaStep + k) % NANA.length];
      this.hum(note + v.shift, {when: t, dur: len * beat * 0.94, vol: 0.085, vib: v.vib, depth: v.depth, send: 0.55});
      t += len * beat; beats += len;
    }
    this.nanaStep = (this.nanaStep + 6) % NANA.length;
  }

  /* ---------- efectos ---------- */

  /* Para no repetir el mismo sonido demasiado seguido. */
  limit(key, gap) {
    const now = this.ctx.currentTime;
    if (this.last[key] && now - this.last[key] < gap) return false;
    this.last[key] = now;
    return true;
  }

  sfx(name, opts = {}) {
    if (!this.live) return;
    const play = SFX[name];
    if (play) play(this, {...opts, pan: clamp(opts.pan || 0, -1, 1)});
    else cueMethods.sfx.call(this, name, opts);
  }

  destroy() {
    clearTimeout(this.muteTimer);
    if (this.ctx && !this.offline) this.ctx.close?.().catch(() => {});
    this.ready = false; this.ctx = null; this.plucks.clear();
  }

  /* La campana de la torre da la hora. */
  toll(count, gap = 2.3) {
    if (!this.live) return;
    const t = this.ctx.currentTime + 0.05;
    for (let i = 0; i < count; i++) this.bellStrike(146.8, {when: t + i * gap, vol: 0.17 * (count > 6 ? 0.8 : 1), decay: 6.5, send: 0.75});
  }
}
