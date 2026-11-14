/*
 * Prueba de humo: abre la versión de un solo archivo, deja que el piloto
 * automático vele una noche entera a toda velocidad con cada personaje y
 * falla si aparece algún error o si la noche no llega a terminar.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   node tools/smoke.mjs [lucia julian matilde]
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const file = new URL('../la-ultima-vigilia.html', import.meta.url).href;
const characters = process.argv.length > 2 ? process.argv.slice(2) : ['lucia', 'julian', 'matilde'];

const browser = await chromium.launch();
let failed = false;
for (const character of characters) {
  const page = await browser.newPage({viewport: {width: 1280, height: 800}});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const started = Date.now();
  await page.goto(`${file}?debug&autostart=1&bot=1&god=1&speed=12&char=${character}`);
  try {
    await page.waitForFunction(() => window.vigilia?.state === 'ended', null, {timeout: 300000, polling: 1000});
  } catch {
    errors.push('la noche no terminó en cinco minutos');
  }
  const night = await page.evaluate(() => {
    const g = window.vigilia;
    if (!g) return null;
    return {state: g.state, clock: g.getSnapshot().clock, kills: g.kills, level: g.level, dawn: g.lastVictory,
      endShown: !document.getElementById('end').classList.contains('hidden'),
      title: document.getElementById('endTitle').textContent};
  });
  if (!night) errors.push('el juego no llegó a arrancar');
  else if (night.state === 'ended' && !night.endShown) errors.push('la noche terminó pero no se mostró el final');
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  if (errors.length) {
    failed = true;
    console.log(`✗ ${character}: ${errors.join(' | ')}`);
  } else {
    console.log(`✓ ${character}: «${night.title}» · ${night.clock} · ${night.kills} ahuyentados · ${night.level - 1} recuerdos elegidos · ${seconds} s`);
  }
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
