/*
 * La banda sonora grabada de la edición completa: una pieza por momento de la
 * noche (título, cada hora, la Guía, la tienda, el alba y el apagón) que suena
 * en bucle y se funde con la siguiente. Si no hay grabaciones, update()
 * devuelve false y suena la música que se escribe en tiempo real.
 */
import { Assets } from './assets.js';

const FADE = 1.6;
const LEVEL = 0.55;

export class Soundtrack {
  constructor(engine) {
    this.a = engine;
    this.want = null;
    this.current = null;
  }

  get enabled() { return Assets.has('musica:titulo'); }

  /* Qué pieza toca según la escena. */
  pick(s) {
    switch (s.scene) {
      case 'title': return 'musica:titulo';
      case 'shop': return 'musica:tienda';
      case 'dawn': return 'musica:alba';
      case 'end': return 'musica:apagon';
      default: return s.boss ? 'musica:guia' : `musica:hora-${Math.max(0, Math.min(4, Math.floor(s.hour || 0)))}`;
    }
  }

  update(s) {
    if (!this.enabled || !this.a.ready) return false;
    const key = this.pick(s);
    if (!Assets.has(key)) return true;
    if (key !== this.want) {
      this.want = key;
      Assets.buffer(this.a.ctx, key).then(buffer => { if (buffer && this.want === key) this.play(key, buffer); });
    }
    return true;
  }

  play(key, buffer) {
    const a = this.a, c = a.ctx, now = c.currentTime;
    if (this.current?.key === key) return;
    const meta = Assets.meta(key) || {};
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = !!meta.loop;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(LEVEL, now + FADE);
    src.connect(g); g.connect(a.musicBus);
    src.start(now + 0.02);
    const old = this.current;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(Math.max(0.0001, old.gain.gain.value), now);
      old.gain.gain.exponentialRampToValueAtTime(0.0001, now + FADE);
      old.src.stop(now + FADE + 0.05);
    }
    this.current = {key, src, gain: g};
  }

  stop() {
    if (!this.current || !this.a.ctx) return;
    try { this.current.src.stop(); } catch { /* ya parada */ }
    this.current = null; this.want = null;
  }
}
