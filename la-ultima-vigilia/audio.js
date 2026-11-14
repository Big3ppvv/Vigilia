/*
 * Sonido generado en el navegador, sin archivos: viento, mar, grillos, la lechuza,
 * la campana que da las horas y la nana de Amparo tocada con una cuerda pulsada.
 */

const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);

/* La nana de Amparo, en compás de 3/4: [nota MIDI, tiempos]. */
const NANA = [
  [69, 2], [74, 1], [72, 2], [69, 1], [70, 1], [69, 1], [67, 1], [69, 3],
  [65, 2], [67, 1], [69, 1], [67, 1], [65, 1], [64, 2], [61, 1], [62, 3]
];
/* Un bajo por compás. */
const NANA_BASS = [50, 53, 43, 45, 50, 46, 45, 50];
const PENTA = [62, 65, 67, 69, 72, 74, 77, 79, 81, 84];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.volume = 0.8;
    this.ready = false;
    this.plucks = new Map();
    this.last = {};
    this.combo = 0;
    this.comboClock = 0;
    this.nanaStep = 0;
    this.clock = 0;
    this.scene = 'title';
    this.timers = {cricket: 0.5, owl: 14, bird: 1, heart: 0, sea: 0, nana: 2.5, ctl: 0};
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
    this.duck.connect(this.master); this.master.connect(comp); comp.connect(c.destination);
    this.sfxBus = this.gain(0.85, this.duck);
    this.ambBus = this.gain(0.7, this.duck);
    this.musicBus = this.gain(0.75, this.duck);
    this.reverb = c.createConvolver();
    this.reverb.buffer = this.impulse(3.4);
    this.reverb.connect(this.gain(0.55, this.duck));
    this.noise = this.noiseBuffer(2.5);
    this.buildAmbient();
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
    this.volume = Math.max(0, Math.min(1, value));
    if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
  }

  get live() { return this.ready && !this.muted && (this.offline || this.ctx.state === 'running'); }

  /* ---------- piezas básicas ---------- */

  gain(value, dest) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    if (dest) g.connect(dest);
    return g;
  }

  out(bus, pan = 0, send = 0) {
    const c = this.ctx;
    const g = c.createGain();
    let node = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
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

  tone(dest, {type = 'sine', f0 = 440, f1 = f0, dur = 0.15, vol = 0.05, attack = 0.005, when = 0} = {}) {
    const c = this.ctx, t = when || c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
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

  pluck(midi, {when = 0, vol = 0.22, pan = 0, send = 0.35, bus = this.musicBus} = {}) {
    if (!this.ready) return;
    const c = this.ctx, t = when || c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.pluckBuffer(midi);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.3;
    const g = this.out(bus, pan, send);
    g.gain.value = vol;
    src.connect(lp); lp.connect(g);
    src.start(t);
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
    const hour = s.hour || 0;
    const T = this.timers;
    T.ctl -= dt;
    if (T.ctl <= 0) {
      T.ctl = 0.12;
      const gust = 0.5 + 0.5 * Math.sin(this.clock * 0.37) * Math.sin(this.clock * 0.13 + 1);
      const windVol = (scene === 'dawn' ? 0.012 : 0.018 + gust * 0.03) * (hour > 2.8 && hour < 4.6 ? 1.35 : 1);
      this.wind.gain.gain.setTargetAtTime(windVol, now, 0.4);
      this.wind.filter.frequency.setTargetAtTime(300 + gust * 520, now, 0.5);
      const danger = scene === 'run' ? (s.danger || 0) : 0;
      const droneVol = scene === 'run' ? 0.012 + danger * 0.045 + (s.boss ? 0.03 : 0) : scene === 'end' ? 0 : 0.004;
      this.drone.gain.gain.setTargetAtTime(droneVol, now, 0.8);
      this.drone.filter.frequency.setTargetAtTime(120 + danger * 380 + (s.boss ? 160 : 0), now, 0.6);
      this.duck.gain.setTargetAtTime(scene === 'pause' ? 0.35 : 1, now, 0.15);
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

  /* ---------- efectos ---------- */

  limit(key, gap) {
    const now = this.ctx.currentTime;
    if (this.last[key] && now - this.last[key] < gap) return false;
    this.last[key] = now;
    return true;
  }

  sfx(name, opts = {}) {
    if (!this.live) return;
    const pan = Math.max(-1, Math.min(1, opts.pan || 0));
    const b = this.sfxBus;
    switch (name) {
      case 'chispa': {
        if (!this.limit('chispa', 0.07)) return;
        const out = this.out(b, pan, 0.08);
        this.noiseShot(out, {dur: 0.05, f0: 3200, f1: 2200, q: 1.5, vol: 0.07});
        this.tone(out, {type: 'triangle', f0: rand(1000, 1250), f1: 620, dur: 0.07, vol: 0.03});
        break;
      }
      case 'sal': {
        if (!this.limit('sal', 0.12)) return;
        const out = this.out(b, pan, 0.12);
        this.noiseShot(out, {dur: 0.16, type: 'lowpass', f0: 5200, f1: 700, q: 0.7, vol: 0.12, attack: 0.002});
        this.tone(out, {f0: 120, f1: 48, dur: 0.12, vol: 0.12});
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
  }

  /* La campana de la torre da la hora. */
  toll(count, gap = 2.3) {
    if (!this.live) return;
    const t = this.ctx.currentTime + 0.05;
    for (let i = 0; i < count; i++) this.bellStrike(146.8, {when: t + i * gap, vol: 0.17 * (count > 6 ? 0.8 : 1), decay: 6.5, send: 0.75});
  }
}
