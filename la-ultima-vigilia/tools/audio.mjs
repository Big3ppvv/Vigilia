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
    for (const character of ['lucia', 'julian', 'matilde', 'tono', 'sabela', 'anselmo']) {
      active[character] = await render({sfx: 1, music: 0, amb: 0}, audio => audio.sfx('habilidad_' + character));
    }
    const shop = await render({sfx: 1, music: 0, amb: 0}, audio => { audio.sfx('tienda'); audio.sfx('compra'); audio.sfx('juntar'); });
    const music = await render({sfx: 0, music: 1, amb: 0}, audio => { for (let i = 0; i < 30; i++) audio.update(0.1, {scene: 'run', hour: 2, danger: 0.6, intensity: 0.9, hp: 1}); }, 4);
    return {active, shop, music};
  });
  for (const [name, sound] of Object.entries({...result.active, tienda: result.shop, musica: result.music})) {
    assert(sound.finite, `${name}: audio contiene valores no finitos`);
    assert(sound.peak < 1, `${name}: el sonido satura la salida`);
    assert(sound.rms > 0.0001, `${name}: el sonido no se oye`);
  }
  const textures = new Set(Object.values(result.active).map(s => Math.round(Math.log10(s.roughness + 1e-9) * 4)));
  assert(textures.size >= 4, 'las seis habilidades suenan casi igual');
  assert(result.active.lucia.roughness > result.active.matilde.roughness * 2, 'se perdió la diferencia entre fogonazo y responso');
  assert.deepEqual(errors, [], 'Errores de JavaScript');
  console.log(`✓ seis habilidades con ${textures.size} texturas distintas, la tienda y la muiñeira de las rondas: PCM finito, audible y sin saturación`);
  await context.close();
} finally {
  await browser.close();
}
