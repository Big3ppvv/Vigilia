/*
 * Teclado, dedo y mando: cómo se mueve, esquiva y arrulla quien vela.
 */
import { rand } from './util.js';

const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Escape', 'KeyP', 'KeyE', 'KeyQ'];

export const inputMethods = {
  listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); this.handlers.push(() => target.removeEventListener(type, fn, opts)); },

  bindInput() {
    this.pad = {x: 0, y: 0, held: new Set()};
    this.listen(window, 'keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable || document.querySelector('dialog[open]')) return;
      if (!KEYS.includes(e.code)) return;
      if (['running', 'paused'].includes(this.state)) e.preventDefault();
      if (e.repeat && ['Escape', 'KeyP', 'Space', 'KeyE', 'KeyQ'].includes(e.code)) return;
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.state === 'running') this.pause(); else if (this.state === 'paused') this.resume(); }
      else if (e.code === 'Space') { if (this.state === 'running') this.dash(); }
      else if (e.code === 'KeyE' || e.code === 'KeyQ') { if (this.state === 'running') this.arrullo(); }
      else this.keys.add(e.code);
    });
    this.listen(window, 'keyup', e => this.keys.delete(e.code));
    this.listen(window, 'blur', () => { this.keys.clear(); this.pointer = null; if (this.state === 'running' && !this.bot) this.pause(); });
    this.listen(document, 'visibilitychange', () => { if (document.hidden && this.state === 'running' && !this.bot) this.pause(); });
    const pos = e => { const r = this.canvas.getBoundingClientRect(), z = this.zoom || 1; return {x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z}; };
    this.listen(this.canvas, 'pointerdown', e => {
      if (this.state !== 'running' || e.button > 0) return;
      e.preventDefault();
      const p = pos(e);
      this.pointer = {id: e.pointerId, start: p, current: p};
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.listen(this.canvas, 'pointermove', e => { if (this.pointer?.id === e.pointerId) this.pointer.current = pos(e); });
    const end = e => { if (this.pointer?.id === e.pointerId) this.pointer = null; };
    this.listen(this.canvas, 'pointerup', end);
    this.listen(this.canvas, 'pointercancel', end);
  },

  /* Mando: palanca izquierda o cruceta para moverse, A esquiva, X o B arrulla, Start pausa. */
  pollGamepad() {
    const pad = this.pad;
    pad.x = 0; pad.y = 0;
    let gp = null;
    try { gp = [...(navigator.getGamepads?.() || [])].find(g => g && g.connected) || null; } catch { gp = null; }
    if (!gp) { pad.held.clear(); return; }
    const dead = v => Math.abs(v) < 0.22 ? 0 : v;
    const on = i => !!gp.buttons[i]?.pressed;
    pad.x = dead(gp.axes[0] || 0) + (on(15) ? 1 : 0) - (on(14) ? 1 : 0);
    pad.y = dead(gp.axes[1] || 0) + (on(13) ? 1 : 0) - (on(12) ? 1 : 0);
    const pressed = i => { const now = on(i), was = pad.held.has(i); if (now) pad.held.add(i); else pad.held.delete(i); return now && !was; };
    const dash = pressed(0), lull = pressed(2), lullB = pressed(1), start = pressed(9);
    if (this.state === 'running') {
      if (dash) this.dash();
      if (lull || lullB) this.arrullo();
      if (start) this.pause();
    } else if (this.state === 'paused' && (start || dash)) this.resume();
  },

  movement() {
    let x = (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);
    let y = (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0);
    if (this.pad && (this.pad.x || this.pad.y)) { x += this.pad.x; y += this.pad.y; }
    if (this.pointer) {
      const dx = this.pointer.current.x - this.pointer.start.x, dy = this.pointer.current.y - this.pointer.start.y, len = Math.hypot(dx, dy);
      if (len > 6) { x = dx / Math.max(40, len); y = dy / Math.max(40, len); }
    }
    const len = Math.hypot(x, y);
    return len > 1 ? {x: x / len, y: y / len} : {x, y};
  },

  dash() {
    if (this.state !== 'running' || this.dashCd > 0) return false;
    const mv = this.bot ? this.botMove() : this.movement();
    const len = Math.hypot(mv.x, mv.y);
    this.dashDir = len > 0.05 ? {x: mv.x / len, y: mv.y / len} : {...this.lastMove};
    this.dashTime = 0.24;
    this.dashCd = this.st.dashCd;
    this.dashHit = new Set();
    this.player.inv = Math.max(this.player.inv, 0.5);
    this.audio.sfx('esquiva');
    for (let i = 0; i < 8; i++) this.particle({x: this.player.x, y: this.player.y + 8, vx: rand(-60, 60), vy: rand(-30, 10), life: 0.4, size: 3, color: '#3a3f46'});
    this.emitStats();
    return true;
  }
};
