/*
 * El sonido, sin altavoces: toca una noche resumida en un OfflineAudioContext
 * y mide el resultado. Falla si alguna receta lanza un error, si un tramo
 * queda mudo o si la mezcla satura.
 *
 *   node build.mjs && node tools/audio-check.mjs [salida.wav]
 * Requiere Playwright y Chromium, igual que tools/smoke.mjs.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const file = new URL('../la-ultima-vigilia.html', import.meta.url).href;
const wavPath = process.argv[2];

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${file}?debug`);
  await page.waitForFunction(() => window.vigilia);

  const result = await page.evaluate(async wantWav => {
    const g = window.vigilia;
    cancelAnimationFrame(g.raf);
    const rate = 44100;
    const run = {scene: 'run', danger: 0.2, hp: 1, boss: false, soul: 0, lull: 0, rain: 0, tide: false, procession: 0, procPan: 0};
    // Cada tramo es un momento de la noche; fire son los efectos que suenan en él.
    const scenes = [
      {name: 'título', len: 7, state: {scene: 'title', hour: 0}, fire: ['ui-foco', 'ui-elegir', 'ui-abrir', 'ui-cerrar']},
      {name: 'la una', len: 9, state: {...run, hour: 1.2},
        fire: ['hora', 'chispa', 'golpe', 'luz', 'luz', 'luz', 'muerte:anima', 'muerte:hermano', 'paso:hierba', 'paso:grava', 'paso:piedra', 'esquiva', 'recuerdo', 'voz:Lucía', 'voz:Julián', 'voz:Matilde', 'voz:Amparo', 'voz:Carmela', 'cafe', 'procesion']},
      {name: 'las dos, con procesión', len: 9, state: {...run, hour: 2.3, danger: 0.7, rain: 1, tide: true, procession: 0.85, procPan: -0.6},
        fire: ['sal', 'golpe:salt', 'golpe:sacred', 'campana', 'muerte:urco', 'muerte:curuxa', 'muerte:ahogado', 'muerte:planidera', 'muerte:espantajo', 'gruñido', 'chillido', 'llanto', 'lagrima', 'crujido', 'guadaña', 'charco', 'salpica', 'paso:agua', 'cirioFuera', 'cerilla', 'cirioPrende', 'herida', 'risa']},
      {name: 'las tres', len: 8, state: {...run, hour: 3.2, rain: 1}, fire: ['racha', 'difunto', 'difuntoCae', 'recordatorio', 'rincon', 'arrullo:matilde']},
      {name: 'las cuatro, a oscuras', len: 8, state: {...run, hour: 4.5, danger: 0.5, soul: 0.7, hp: 0.2, rain: 0.5}, fire: ['levanta', 'arrullo:julian', 'cirioFuera', 'herida']},
      {name: 'la Guía', len: 9, state: {...run, hour: 5.2, danger: 0.9, boss: true}, fire: ['guia', 'reloj', 'campana', 'sal', 'chispa', 'golpe', 'arrullo:lucia', 'liberada']},
      {name: 'el alba', len: 8, state: {scene: 'dawn', hour: 6}, fire: ['alba']},
      // Lo peor que puede pasar a la vez: horda, campanas, levantarse y un difunto.
      {name: 'todo a la vez', len: 5, state: {...run, hour: 4.9, danger: 1, soul: 0.9, procession: 1, rain: 1}, burst: true,
        fire: ['sal', 'chispa', 'campana', 'golpe', 'golpe:sacred', 'muerte:espantajo', 'muerte:ahogado', 'herida', 'levanta', 'difunto', 'hora', 'guadaña', 'racha', 'cirioFuera', 'risa', 'arrullo:lucia']}
    ];
    const total = scenes.reduce((sum, sc) => sum + sc.len, 0);
    const ctx = new OfflineAudioContext(2, rate * total, rate);
    const a = g.audio;
    a.muted = false; a.volume = 0.8;
    a.init(ctx);
    const thrown = [], played = new Set();
    const fire = spec => {
      const [name, arg] = spec.split(':');
      const opts = name === 'muerte' ? {type: arg} : name === 'paso' ? {surface: arg} : name === 'voz' ? {speaker: arg} : name === 'golpe' ? {tone: arg || 'ember', crit: arg === 'sacred'}
        : name === 'arrullo' ? {voice: arg} : name === 'hora' ? {count: 2} : {};
      try { a.sfx(name, {...opts, pan: (played.size % 5 - 2) / 3}); played.add(name); } catch (error) { thrown.push(`${spec}: ${error.message}`); }
    };
    let start = 0;
    const marks = [];
    for (const sc of scenes) {
      marks.push({name: sc.name, from: start, to: start + sc.len});
      const steps = sc.len * 10;
      for (let i = 0; i < steps; i++) {
        const at = start + i / 10;
        const tick = () => {
          try { a.update(0.1, sc.state); } catch (error) { thrown.push(`update en «${sc.name}»: ${error.message}`); }
          if (sc.burst) { if (i < 12) for (const spec of sc.fire) fire(spec); }
          else {
            const every = Math.max(1, Math.floor((steps - 20) / sc.fire.length)), k = (i - 4) / every;
            if (i >= 4 && Number.isInteger(k) && k < sc.fire.length) fire(sc.fire[k]);
          }
        };
        if (at === 0) tick(); else ctx.suspend(at).then(() => { tick(); ctx.resume(); });
      }
      start += sc.len;
    }
    const buffer = await ctx.startRendering();
    const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
    const db = v => v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120;
    const stats = marks.map(mark => {
      let peak = 0, sum = 0, clipped = 0, bad = 0;
      const from = Math.floor(mark.from * rate), to = Math.floor(mark.to * rate);
      for (let i = from; i < to; i++) {
        const l = L[i], r = R[i];
        if (!Number.isFinite(l) || !Number.isFinite(r)) { bad++; continue; }
        const m = Math.max(Math.abs(l), Math.abs(r));
        if (m > peak) peak = m;
        if (m >= 0.999) clipped++;
        sum += (l * l + r * r) / 2;
      }
      return {name: mark.name, peak: +peak.toFixed(3), peakDb: db(peak), rmsDb: db(Math.sqrt(sum / (to - from))), clipped, bad};
    });
    let wav = null;
    if (wantWav) {
      // WAV de 16 bits para poder escucharlo fuera.
      const n = L.length, bytes = new Uint8Array(44 + n * 4), view = new DataView(bytes.buffer);
      const text = (at, s) => { for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i)); };
      text(0, 'RIFF'); view.setUint32(4, 36 + n * 4, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
      view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true); view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) {
        view.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true);
        view.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true);
      }
      let bin = '';
      for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
      wav = btoa(bin);
    }
    return {stats, thrown, played: [...played], wav, seconds: total};
  }, !!wavPath);

  assert.deepEqual(errors, [], 'errores de JavaScript');
  assert.deepEqual(result.thrown, [], 'alguna receta de sonido falla');
  for (const s of result.stats) {
    console.log(`${s.clipped || s.bad ? '✗' : '✓'} ${s.name.padEnd(24)} pico ${String(s.peakDb).padStart(6)} dB · media ${String(s.rmsDb).padStart(6)} dB${s.clipped ? ` · ${s.clipped} muestras saturadas` : ''}`);
    assert.equal(s.bad, 0, `${s.name}: muestras no válidas`);
    assert(s.rmsDb > -60, `${s.name}: el tramo queda mudo (${s.rmsDb} dB)`);
    assert.equal(s.clipped, 0, `${s.name}: la mezcla satura`);
    assert(s.peak <= 0.97, `${s.name}: pico demasiado alto (${s.peak})`);
  }
  console.log(`✓ ${result.played.length} efectos distintos en ${result.seconds} s de noche resumida, sin errores`);
  if (wavPath && result.wav) { writeFileSync(wavPath, Buffer.from(result.wav, 'base64')); console.log(`  escrito ${wavPath}`); }
} finally {
  await browser.close();
}
