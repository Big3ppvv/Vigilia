/* Primitivas Web Audio: fuentes, envolventes y espacio acústico. */
export const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
export const audioRand = (a, b) => a + Math.random() * (b - a);

export const synthMethods = {
  /* ---------- piezas básicas ---------- */

  gain(value, dest) {
    const g = this.ctx.createGain();
    g.gain.value = value;
    if (dest) g.connect(dest);
    return g;
  },

  out(bus, pan = 0, send = 0, life = 12) {
    const c = this.ctx;
    const g = c.createGain();
    const nodes = [g];
    let node = g;
    if (pan && c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p); node = p;
      nodes.push(p);
    }
    node.connect(bus);
    if (send > 0) {
      const s = this.gain(send, this.reverbs.get(bus));
      node.connect(s); nodes.push(s);
    }
    this.transients.push({nodes, until: c.currentTime + life});
    this.pruneVoices();
    return g;
  },

  pruneVoices() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.transients = this.transients.filter(group => {
      if (group.until > now) return true;
      for (const node of group.nodes) node.disconnect();
      return false;
    });
    while (this.transients.length > this.maxGroups) {
      // Preserva notas y campanadas ya agendadas para más adelante.
      let shortest = 0;
      for (let i = 1; i < this.transients.length; i++) {
        if (this.transients[i].until < this.transients[shortest].until) shortest = i;
      }
      const [group] = this.transients.splice(shortest, 1);
      for (const node of group.nodes) node.disconnect();
    }
  },

  noiseBuffer(seconds) {
    const c = this.ctx, len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  },

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
  },

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
    src.onended = () => { src.disconnect(); filter.disconnect(); g.disconnect(); };
    if (dur > 0.8) { src.loop = true; src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05); }
    else src.start(t, Math.random() * 1.5, dur + 0.05);
  },

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
    o.onended = () => { o.disconnect(); g.disconnect(); };
    o.start(t); o.stop(t + dur + 0.05);
  },

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
  },

  pluck(midi, {when = 0, vol = 0.22, pan = 0, send = 0.35, bus = this.musicBus} = {}) {
    if (!this.ready) return;
    const c = this.ctx, t = when || c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.pluckBuffer(midi);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.3;
    const g = this.out(bus, pan, send, Math.max(5, t - c.currentTime + src.buffer.duration + 1));
    g.gain.value = vol;
    src.connect(lp); lp.connect(g);
    src.onended = () => { src.disconnect(); lp.disconnect(); };
    src.start(t);
  },

  /* Campana: parciales inarmónicos con batido. */
  bellStrike(fund, {when = 0, vol = 0.2, decay = 5, pan = 0, send = 0.6, bus = this.sfxBus} = {}) {
    const c = this.ctx, t = when || c.currentTime;
    const out = this.out(bus, pan, send, t - c.currentTime + decay * 1.4 + 1);
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
        o.onended = () => { o.disconnect(); g.disconnect(); };
        o.start(t); o.stop(end + 0.05);
      }
    }
    this.noiseShot(out, {dur: 0.05, type: 'highpass', f0: 3000, vol: 0.15, when: t});
  },

};
