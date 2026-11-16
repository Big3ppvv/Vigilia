/*
 * Prueba de humo: abre la versión de un solo archivo, deja que el piloto
 * automático vele una noche entera (dieciocho rondas, tienda incluida) con
 * cada personaje y falla si aparece algún error o si no llega a amanecer.
 *
 *   node tools/smoke.mjs [lucia julian …]
 */
import { launchBrowser } from './browser.mjs';
import { CHARACTERS } from '../story.js';

const file = process.env.VIGILIA_TEST_URL || new URL('../la-ultima-vigilia.html', import.meta.url).href;
const characters = process.argv.length > 2 ? process.argv.slice(2) : Object.keys(CHARACTERS);
const browser = await launchBrowser();
let failed = false;

async function night(character) {
  const page = await browser.newPage({viewport: {width: 1280, height: 800}});
  // La fuente remota es opcional; el recorrido no depende de Google Fonts.
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({contentType: 'text/css', body: ''}));
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const started = Date.now();
  await page.goto(`${file}?debug&autostart=1&bot=1&god=1&speed=12&char=${character}`);
  try {
    await page.waitForFunction(() => window.vigilia?.state === 'ended', null, {timeout: 420000, polling: 1000});
  } catch {
    errors.push('la noche no terminó en siete minutos');
  }
  const r = await page.evaluate(() => {
    const g = window.vigilia;
    if (!g) return null;
    return {state: g.state, dawn: g.lastVictory, ...g.debugStats(), endShown: !document.getElementById('end').classList.contains('hidden'), title: document.getElementById('endTitle').textContent};
  });
  if (!r) errors.push('el juego no llegó a arrancar');
  else if (r.state === 'ended' && !r.endShown) errors.push('la noche terminó pero no se mostró el final');
  else if (!r.dawn || r.round !== 18 || !r.freed) errors.push(`no amaneció: ${r.title} (ronda ${r.round})`);
  const seconds = ((Date.now() - started) / 1000).toFixed(0);
  if (errors.length) { failed = true; console.log(`✗ ${character}: ${errors.slice(0, 4).join(' | ')}`); }
  else console.log(`✓ ${character}: «${r.title}» · 18 rondas · nivel ${r.level} · ${r.kills} ahuyentados · ${r.weapons.length} armas, ${r.items} objetos · ${seconds} s`);
  await page.close();
}

// Tres noches a la vez: el ordenador de pruebas no da para más sin falsear tiempos.
for (let i = 0; i < characters.length; i += 3) await Promise.all(characters.slice(i, i + 3).map(night));
await browser.close();
process.exit(failed ? 1 : 0);
