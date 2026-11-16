/* Renderiza sonido real sin altavoces: mezcla, eventos y presupuesto de voces.
 *   node build.mjs && node tools/audio.mjs
 */
import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
try {
  const context = await browser.newContext({offline: !process.env.VIGILIA_TEST_URL});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
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
    const active = {};
    for (const character of ['lucia', 'julian', 'matilde']) {
      active[character] = await render({sfx: 1, music: 0, amb: 0}, audio => audio.sfx('pulse', {character}));
    }
    const ritual = await render({sfx: 1, music: 0, amb: 0}, audio => {
      audio.sfx('ritual'); audio.sfx('ritualReady');
    });
    return {active, ritual};
  });
  for (const [name, sound] of Object.entries({...result.active, ritual: result.ritual})) {
    assert(sound.finite, `${name}: audio contiene valores no finitos`);
    assert(sound.peak < 1, `${name}: el sonido satura la salida`);
    assert(sound.rms > 0.0001, `${name}: el sonido no se oye`);
  }
  assert(result.active.lucia.roughness > result.active.matilde.roughness * 2, 'Se perdió la diferencia entre fuego y responso');
  assert.deepEqual(errors, [], 'Errores de JavaScript');
  console.log('✓ habilidades diferenciadas y faroles: PCM finito, audible y sin saturación');
  await context.close();
} finally {
  await browser.close();
}
