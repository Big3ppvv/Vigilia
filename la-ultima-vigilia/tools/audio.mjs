/* Renderiza sonido real sin altavoces: mezcla, eventos y presupuesto de voces.
 *   node build.mjs && node tools/audio.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
try {
  const context = await browser.newContext({offline: true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const file = new URL('../la-ultima-vigilia.html', import.meta.url).href;
  await page.goto(`${file}?debug`);
  await page.waitForFunction(() => window.vigilia);
  const result = await page.evaluate(async () => {
    const game = window.vigilia;
    cancelAnimationFrame(game.raf);
    const Engine = game.audio.constructor;
    const render = async (mix, emit, seconds = 3) => {
      const ctx = new OfflineAudioContext(2, 22050 * seconds, 22050);
      const audio = new Engine();
      audio.setVolume(1);
      audio.setMix(mix);
      audio.init(ctx);
      emit(audio, ctx);
      const buffer = await ctx.startRendering();
      let energy = 0, peak = 0, delta = 0, previous = 0, finite = true;
      const samples = buffer.getChannelData(0);
      for (const value of samples) {
        finite &&= Number.isFinite(value);
        peak = Math.max(peak, Math.abs(value));
        energy += value * value;
        delta += (value - previous) ** 2;
        previous = value;
      }
      const output = {peak, rms: Math.sqrt(energy / samples.length), roughness: delta / Math.max(energy, 1e-12), finite};
      audio.destroy();
      return output;
    };
    const onlyEffects = {effects: 1, music: 0, ambience: 0};
    const silent = await render({effects: 0, music: 0, ambience: 0}, audio => {
      audio.sfx('ritual'); audio.sfx('pulse', {character: 'julian'}); audio.memoryMotif();
    });
    const musicMuted = await render(onlyEffects, audio => audio.memoryMotif());
    const effectsMuted = await render({effects: 0, music: 1, ambience: 0}, audio => {
      audio.sfx('ritual'); audio.sfx('campana');
    });
    const active = {};
    for (const character of ['lucia', 'julian', 'matilde']) {
      active[character] = await render(onlyEffects, audio => audio.sfx('pulse', {character}));
    }
    const event = await render(onlyEffects, audio => {
      audio.sfx('ritual'); audio.sfx('ritualReady'); audio.sfx('sal'); audio.sfx('chispa');
      audio.sfx('esquiva'); audio.sfx('herida'); audio.sfx('paso');
    });
    const ambience = await render({effects: 0, music: 0, ambience: 1}, audio => {
      audio.update(0.2, {scene: 'run', hour: 3.5, danger: 0.8, boss: true, nearCoffin: true});
    });
    const score = await render({effects: 0, music: 1, ambience: 0}, audio => {
      audio.nightPhrase({hour: 3, danger: 0.9, boss: true});
    });
    const bounded = new Engine();
    bounded.init(new OfflineAudioContext(2, 22050, 22050));
    for (let i = 0; i < 1000; i++) bounded.out(bounded.sfxBus, 0.2, 0.3, 3);
    const groups = bounded.transients.length;
    bounded.setMix({effects: NaN, music: 5, ambience: -2});
    const clampedMix = {...bounded.mix};
    bounded.destroy();
    const unsupported = new Engine();
    const supportedAC = globalThis.AudioContext, supportedWebkitAC = globalThis.webkitAudioContext;
    globalThis.AudioContext = undefined;
    globalThis.webkitAudioContext = undefined;
    unsupported.init();
    const gracefulUnsupported = !unsupported.ctx && !unsupported.ready;
    globalThis.AudioContext = supportedAC;
    globalThis.webkitAudioContext = supportedWebkitAC;
    unsupported.setMix({effects: 0.4});
    unsupported.update(0.1, {scene: 'run'});
    unsupported.sfx('pulse'); // Safe before a user gesture or unsupported audio.
    unsupported.destroy();
    return {silent, musicMuted, effectsMuted, active, event, ambience, score, groups, clampedMix, gracefulUnsupported};
  });
  for (const [name, sound] of Object.entries({...result.active, event: result.event, ambience: result.ambience, score: result.score})) {
    assert(sound.finite, `${name}: audio contiene valores no finitos`);
    assert(sound.peak < 1, `${name}: el sonido satura la salida`);
    assert(sound.rms > 0.0001, `${name}: el sonido no se oye`);
  }
  assert(result.silent.peak === 0, 'La mezcla silenciada deja pasar reverberación');
  assert(result.musicMuted.peak === 0, 'Silenciar música deja pasar la nana o su reverberación');
  assert(result.effectsMuted.peak === 0, 'Silenciar efectos deja pasar campanas o su reverberación');
  assert(result.active.lucia.roughness > result.active.matilde.roughness * 2, 'Se perdió la diferencia entre fuego y responso');
  assert(result.groups <= 128, 'Los grupos transitorios crecen sin límite');
  assert(result.gracefulUnsupported, 'El juego falla cuando Web Audio no está disponible');
  assert.deepEqual(result.clampedMix, {music: 1, ambience: 0, effects: 0.85});
  assert.deepEqual(errors, [], 'Errores de JavaScript');
  console.log('✓ audio sin conexión: habilidades distintas, rituales, nana dinámica y ambiente con PCM finito sin saturación');
  console.log('✓ mezcla: cada canal silencia también su reverberación; 1000 grupos quedan acotados a 128');
  await context.close();
} finally {
  await browser.close();
}
