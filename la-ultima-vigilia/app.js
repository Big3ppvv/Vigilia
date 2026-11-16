/*
 * La interfaz: título, HUD de la ronda, recuerdos, ofrendas, el puesto de
 * Remedios, la pausa, el final y los diálogos. Solo pinta lo que el juego le
 * cuenta (snapshots) y llama a sus acciones; las reglas no viven aquí.
 */
import { syncScreens, bindOverlayKeyboard } from './interface.js';
import { VigilGame } from './game.js';
import { drawPortrait, drawSprite, sprite } from './art.js';
import { WORLD, CHARACTERS, CREATURES, BOSS, AMPARO, HELP, ABILITIES, ELITES, ENDINGS } from './story.js';
import { WEAPONS, WEAPON, CLASSES, TIER_NAMES, TIER_LABEL, tierValue, SCALE_NAMES } from './arsenal.js';
import { ITEMS, ITEM } from './items.js';
import { STATS, STAT } from './stats.js';
import { DANGER, ROUNDS } from './balance.js';
import { store, loadSettings, loadProgress } from './storage.js';
import { Assets } from './assets.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = loadSettings(reducedMotion);
const progress = loadProgress();
const saved = store.get('selected', {}) || {};
let selected = CHARACTERS[saved.character] ? saved.character : 'lucia';
let selectedWeapon = saved.weapon;
let selectedDanger = Number.isFinite(saved.danger) ? saved.danger : 0;

/* ---------- el juego ---------- */

const game = new VigilGame($('game'), {onStats, onState, onLevelUp, onCrate, onShop, onEnd, onSubtitle, onBanner, onDiscover, onSave, onLevel});
game.character = selected;
game.reset();
game.muted = settings.muted;
game.audio.muted = settings.muted;
game.audio.volume = settings.volume;
game.audio.setMix({music: settings.music, sfx: settings.sfx, amb: settings.amb});
game.setOptions({shake: settings.shake, flashes: settings.flashes, weather: settings.weather, numbers: settings.numbers, softDark: settings.softDark});
if (params.has('debug')) window.vigilia = game;
const speed = Number(params.get('speed'));
if (speed > 1) game.timeScale = Math.min(20, speed);
if (params.get('bot') === '1') game.bot = true;
if (params.get('bot') === '2') game.bot = 2;
if (params.get('god') === '1') game.god = true;

let subTimer = null, toastTimer = null, lastStats = null, lastLevel = 1, hudSig = '', shopSnap = null, selectedSlot = null, levelSnap = null;

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
}

/* Iconos: se pintan una vez y se reutilizan como imagen. */
const iconCache = new Map();
function iconURL(key, size = 48) {
  const id = key + '@' + size;
  if (iconCache.has(id)) return iconCache.get(id);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const s = sprite(key);
  const weapon = key.startsWith('w:');
  const fit = weapon ? Math.hypot(s.w, s.h) * 0.8 : Math.max(s.w, s.h);
  const scale = Math.max(1, Math.floor((size - 4) / fit));
  const long = weapon && s.w > s.h * 1.6;
  drawSprite(g, key, size / 2, size / 2, {scale, rot: long ? -Math.PI / 4 : 0});
  drawSprite(g, key, size / 2, size / 2, {scale, rot: long ? -Math.PI / 4 : 0, layer: 'glow'});
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}
function icon(key, size = 48, alt = '') {
  const img = document.createElement('img');
  img.src = iconURL(key, size); img.width = size; img.height = size; img.alt = alt; img.className = 'px';
  return img;
}
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
/* Ilustración de la edición completa, si la hay: carta, retrato o escena. */
function art(key, cls = 'art', alt = '') {
  const url = Assets.image(key);
  if (!url) return null;
  const img = el('img', cls);
  img.src = url; img.alt = alt; img.decoding = 'async'; img.loading = 'lazy';
  return img;
}
const cardKey = (kind, id) => `carta:${kind}:${id}`;
document.getElementById('cargaEdicion')?.remove();
const fmt = v => (Math.round(v * 10) / 10).toLocaleString('es-ES');

/* ---------- título ---------- */

$('introLine').textContent = WORLD.intro;
$('placeLine').textContent = `${WORLD.night} · ${WORLD.place}`;
$('briefLine').textContent = WORLD.tagline;

const unlockedChar = id => {
  const u = CHARACTERS[id].unlock;
  if (!u) return true;
  if (u.round) return progress.maxRound >= u.round;
  if (u.wins) return Object.values(progress.wins).reduce((a, b) => a + b, 0) >= u.wins;
  return true;
};
const unlockedDanger = d => d === 0 || (progress.wins[d - 1] || 0) > 0;

const castEl = $('cast');
for (const [id, ch] of Object.entries(CHARACTERS)) {
  const b = el('button', 'cast-card');
  b.dataset.character = id;
  b.setAttribute('role', 'radio');
  const c = document.createElement('canvas');
  c.width = 56; c.height = 64;
  drawPortrait(c.getContext('2d'), id, 56, 64);
  b.append(c, el('span', 'name', ch.name), el('span', 'role', ch.role));
  b.addEventListener('click', () => selectCharacter(id));
  castEl.append(b);
}
castEl.addEventListener('keydown', e => {
  const ids = Object.keys(CHARACTERS);
  const i = ids.indexOf(selected);
  let next = null;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = ids[(i + 1) % ids.length];
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = ids[(i - 1 + ids.length) % ids.length];
  else if (e.key === 'Home') next = ids[0];
  else if (e.key === 'End') next = ids.at(-1);
  if (!next) return;
  e.preventDefault();
  selectCharacter(next);
  castEl.querySelector(`[data-character="${next}"]`)?.focus();
});

function selectCharacter(id) {
  if (!CHARACTERS[id] || game.state !== 'ready') return;
  selected = id;
  game.character = id;
  game.reset();
  const ch = CHARACTERS[id], open = unlockedChar(id);
  for (const b of castEl.children) {
    const on = b.dataset.character === id;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
    b.classList.toggle('locked', !unlockedChar(b.dataset.character));
  }
  $('castDetail').textContent = open ? `${ch.age}. ${ch.blurb}` : `Bloqueado. ${ch.unlock.text}`;
  $('castPerk').textContent = open ? ch.perk : '';
  $('castAbility').textContent = open ? `${ABILITIES[id].name} (R) · ${ABILITIES[id].description}` : '';
  const portrait = Assets.image(cardKey('p', id));
  $('castArt').classList.toggle('hidden', !portrait);
  if (portrait) { $('castArt').src = portrait; $('castArt').classList.toggle('locked', !open); }
  if (!ch.weapons.includes(selectedWeapon)) selectedWeapon = ch.weapons[0];
  renderStartWeapons();
  $('startButton').disabled = !open;
  saveSelection();
}

function renderStartWeapons() {
  const wrap = $('startWeapons');
  wrap.replaceChildren();
  for (const id of CHARACTERS[selected].weapons) {
    const w = WEAPON[id];
    const b = el('button', 'weapon-chip');
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === selectedWeapon));
    b.tabIndex = id === selectedWeapon ? 0 : -1;
    b.title = `${w.name}: ${w.line}`;
    b.append(icon('w:' + id, 36, ''), el('span', '', w.name));
    b.addEventListener('click', () => { selectedWeapon = id; renderStartWeapons(); saveSelection(); });
    wrap.append(b);
  }
}

function renderDangers() {
  const wrap = $('dangers');
  wrap.replaceChildren();
  if (!unlockedDanger(selectedDanger)) selectedDanger = 0;
  for (const d of DANGER) {
    const open = unlockedDanger(d.id);
    const b = el('button', 'danger-chip' + (open ? '' : ' locked'), String(d.id));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(d.id === selectedDanger));
    b.setAttribute('aria-label', `${d.name}${open ? '' : ', bloqueada'}`);
    b.tabIndex = d.id === selectedDanger ? 0 : -1;
    b.title = open ? `${d.name}: ${d.note}` : 'Vela una noche entera en la dificultad anterior para desbloquearla.';
    b.disabled = !open;
    b.addEventListener('click', () => { selectedDanger = d.id; renderDangers(); saveSelection(); });
    wrap.append(b);
  }
  const d = DANGER[selectedDanger];
  $('dangerNote').textContent = `${d.name} · ${d.note}`;
}

function saveSelection() { store.set('selected', {character: selected, weapon: selectedWeapon, danger: selectedDanger}); }

function updateNightCount() {
  const wins = Object.values(progress.wins).reduce((a, b) => a + b, 0);
  const n = progress.nights.length;
  $('nightCount').textContent = (n === 0 ? 'Primera noche' : `Noche ${n + 1}${wins ? ` · ${wins} ${wins === 1 ? 'amanecer' : 'amaneceres'}` : ''} · récord: ronda ${progress.maxRound}`)
    + (Assets.available ? ` · Edición completa: ${Assets.info.count} recursos, ${Math.round(Assets.info.bytes / 1048576)} MB` : '');
  const save = store.get('run', null);
  const valid = save && save.v === 3 && CHARACTERS[save.run?.character];
  $('continueButton').classList.toggle('hidden', !valid);
  if (valid) $('continueLabel').textContent = `Continuar · ${CHARACTERS[save.run.character].name}, ronda ${save.run.round + 1}`;
}

function layoutTitle() {
  const wide = innerWidth > 900;
  const zoom = game.zoom || 1;
  game.titleFocus = wide ? {x: (-Math.min(600, innerWidth * 0.46) / 2) / zoom, y: -470} : {x: 0, y: -470 + innerHeight * 0.3 / zoom};
}
addEventListener('resize', layoutTitle);
layoutTitle();

function start() {
  if (game.state !== 'ready' && game.state !== 'ended') return;
  if (!unlockedChar(selected)) return;
  if (game.state === 'ended') game.backToTitle();
  store.remove('run');
  game.audio.init();
  game.setMuted(settings.muted);
  game.start(selected, selectedWeapon, selectedDanger);
  prepareHud();
}

function continueRun() {
  const save = store.get('run', null);
  if (!save) return;
  game.audio.init();
  game.setMuted(settings.muted);
  if (!game.continueRun(save)) { store.remove('run'); updateNightCount(); toast('No se pudo recuperar la partida.'); return; }
  selected = save.run.character;
  prepareHud();
}

function prepareHud() {
  const ch = CHARACTERS[game.run.character];
  $('hudName').textContent = ch.name;
  $('hudRole').textContent = ch.role;
  lastLevel = game.run.level; hudSig = '';
  $('hpGhost').style.width = '100%';
}

$('startButton').addEventListener('click', start);
$('continueButton').addEventListener('click', continueRun);
$('againButton').addEventListener('click', start);
$('otherButton').addEventListener('click', () => { game.backToTitle(); selectCharacter(selected); });
$('quitButton').addEventListener('click', () => { game.backToTitle(); selectCharacter(selected); });
$('resumeButton').addEventListener('click', () => game.resume());
$('pauseButton').addEventListener('click', () => game.state === 'paused' ? game.resume() : game.pause());
$('dashButton').addEventListener('click', () => { game.dash(); $('game').focus({preventScroll: true}); });
$('abilityButton').addEventListener('click', () => { game.ability(); $('game').focus({preventScroll: true}); });

/* ---------- durante la ronda ---------- */

function setBar(fill, ratio, ghost) {
  const pct = `${Math.max(0, Math.min(100, ratio * 100))}%`;
  fill.style.width = pct;
  if (ghost) {
    const now = parseFloat(ghost.style.width) || 100;
    if (ratio * 100 > now) ghost.style.width = pct;
    else { clearTimeout(ghost._t); ghost._t = setTimeout(() => { ghost.style.width = pct; }, 260); }
  }
}

function onStats(s) {
  lastStats = s;
  const hp = Math.max(0, s.hp);
  setBar($('hpBar'), hp / s.maxHp, $('hpGhost'));
  $('hpText').textContent = `${Math.ceil(hp)} / ${Math.round(s.maxHp)}`;
  $('hpMeter').setAttribute('aria-valuenow', String(Math.ceil(hp)));
  $('hpMeter').setAttribute('aria-valuemax', String(Math.round(s.maxHp)));
  $('hpMeter').classList.toggle('low', hp < s.maxHp * 0.3);
  // La barra de experiencia: se llena gota a gota y destella al subir de nivel.
  const xpBar = $('xpBar');
  if (s.level > lastLevel) {
    xpBar.style.transition = 'none';
    xpBar.style.width = '100%';
    $('xpMeter').classList.remove('flash'); void $('xpMeter').offsetWidth; $('xpMeter').classList.add('flash');
    requestAnimationFrame(() => { xpBar.style.transition = ''; xpBar.style.width = `${Math.min(100, s.xp / s.xpNext * 100)}%`; });
  } else xpBar.style.width = `${Math.min(100, s.xp / s.xpNext * 100)}%`;
  lastLevel = s.level;
  $('levelText').textContent = `Nv ${s.level}`;
  $('xpText').textContent = `${Math.floor(s.xp)} / ${s.xpNext}`;
  $('xpMeter').setAttribute('aria-valuenow', String(Math.round(s.xp / s.xpNext * 100)));
  $('ceraText').textContent = Math.floor(s.cera).toLocaleString('es-ES');
  $('meltBox').classList.toggle('hidden', s.melt < 1);
  $('meltText').textContent = `+${Math.ceil(s.melt)}`;
  $('pendingBox').classList.toggle('hidden', !s.pending);
  $('pendingText').textContent = s.pending;
  $('crateBox').classList.toggle('hidden', !s.crates);
  $('crateText').textContent = s.crates;
  // La ronda: cuenta atrás, reloj y la noche entera.
  $('roundLabel').innerHTML = `Ronda ${s.round} <small>/ ${s.rounds}</small>`;
  const secs = Math.ceil(s.timeLeft);
  $('countdown').textContent = s.stopped ? '∞' : String(secs);
  $('countdown').classList.toggle('urgent', !s.stopped && secs <= 5 && s.state === 'running');
  $('clock').textContent = s.clock;
  $('mood').textContent = s.mood;
  $('roundBar').style.width = `${Math.min(100, (1 - s.timeLeft / Math.max(1, s.roundLength)) * 100)}%`;
  $('nightBar').style.width = `${Math.min(100, ((s.round - 1) + (1 - s.timeLeft / Math.max(1, s.roundLength))) / s.rounds * 100)}%`;
  $('kills').textContent = s.kills.toLocaleString('es-ES');
  // Esquiva y habilidad.
  const ready = s.dashCd <= 0;
  $('dashFill').style.width = `${ready ? 100 : (1 - s.dashCd / s.dashMax) * 100}%`;
  $('dashButton').classList.toggle('cooling', !ready);
  $('dashButton').disabled = !ready || s.state !== 'running';
  const ab = s.ability;
  $('abilityName').textContent = ab.ready ? ab.name : `${ab.name} · ${Math.ceil(ab.cd)}`;
  $('abilityFill').style.width = `${ab.ready ? 100 : Math.max(0, 1 - ab.cd / ab.max) * 100}%`;
  $('abilityButton').classList.toggle('cooling', !ab.ready);
  $('abilityButton').classList.toggle('active', ab.active);
  $('abilityButton').disabled = !ab.ready || s.state !== 'running';
  $('abilityButton').title = `${ab.description} (R)`;
  // Difunto con nombre o la Guía.
  const boss = s.boss && s.boss.alive ? s.boss : s.elite;
  $('bossBox').classList.toggle('hidden', !boss);
  if (boss) {
    $('bossName').textContent = s.boss && s.boss.alive ? BOSS.name : ELITES[s.elite.id]?.name || '';
    $('bossTitle').textContent = s.boss && s.boss.alive ? (s.boss.rage ? BOSS.rage : BOSS.title) : ELITES[s.elite.id]?.epitaph || '';
    setBar($('bossBar'), boss.hp / boss.maxHp, $('bossGhost'));
    $('bossBox').classList.toggle('elite', !(s.boss && s.boss.alive));
  }
  const sig = s.weapons.map(w => w.id + w.tier).join('|');
  if (sig !== hudSig) {
    hudSig = sig;
    const wrap = $('hudWeapons');
    wrap.replaceChildren();
    for (const w of s.weapons) {
      const d = el('div', `slot tier-${w.tier}`);
      d.title = `${WEAPON[w.id].name} ${TIER_NAMES[w.tier]}`;
      d.append(icon('w:' + w.id, 28, ''));
      wrap.append(d);
    }
  }
  $('pauseClock').textContent = `Ronda ${s.round} de ${s.rounds} · ${s.clock}`;
}

function onLevel() {
  const m = $('xpMeter');
  m.classList.remove('flash'); void m.offsetWidth; m.classList.add('flash');
}

const OVERLAYS = ['levelup', 'crate', 'shop', 'pause', 'end'];
function onState(state) {
  syncScreens(state);
  const inRun = ['running', 'paused', 'roundEnd', 'dying', 'dawn', 'levelup', 'crate', 'shop'].includes(state);
  document.body.classList.toggle('playing', inRun);
  document.body.dataset.state = state;
  $('title').classList.toggle('hidden', state !== 'ready');
  $('hud').classList.toggle('hidden', !inRun || state === 'shop');
  const show = {levelup: 'levelup', crate: 'crate', shop: 'shop', paused: 'pause', ended: 'end'}[state];
  for (const id of OVERLAYS) $(id).classList.toggle('hidden', id !== show);
  if (state === 'paused') { renderPause(); requestAnimationFrame(() => $('resumeButton').focus({preventScroll: true})); }
  if (state === 'ready') { updateNightCount(); onSubtitle(null); selectCharacter(selected); renderDangers(); }
  if (state === 'running') { $('game').focus({preventScroll: true}); hideTooltip(); }
  if (state === 'shop') requestAnimationFrame(() => $('nextRound').focus({preventScroll: true}));
}

/* ---------- recordar (subir de nivel) ---------- */

function statLine(stat, value) {
  const s = STAT[stat];
  return `${value > 0 ? '+' : '−'}${fmt(Math.abs(value))}${s.pct ? ' %' : ''} ${s.name}`;
}

function onLevelUp(snap) {
  levelSnap = snap;
  $('levelEyebrow').textContent = `Nivel ${snap.level} · +1 de vida máxima`;
  $('levelTitle').textContent = 'Recuerdas…';
  $('levelSub').textContent = snap.pending > 1 ? `Te quedan ${snap.pending} recuerdos por elegir.` : 'Elige uno.';
  const wrap = $('levelCards');
  wrap.replaceChildren();
  snap.choices.forEach((c, i) => {
    const b = el('button', `card tier-${c.tier}`);
    b.append(el('kbd', '', String(i + 1)), icon(c.icon, 56, ''), el('span', 'kind', TIER_LABEL[c.tier]), el('h3', '', c.name));
    const eff = el('p', 'effect good', statLine(c.stat, c.value));
    const now = el('p', 'now', `Ahora: ${fmt(snap.stats[c.stat])}${STAT[c.stat].pct ? ' %' : ''} → ${fmt(snap.stats[c.stat] + c.value)}${STAT[c.stat].pct ? ' %' : ''}`);
    b.append(eff, now);
    b.addEventListener('click', () => game.chooseUpgrade(i));
    wrap.append(b);
  });
  $('levelRerollText').textContent = `Pensar otra cosa · ${snap.rerollCost}`;
  $('levelReroll').disabled = snap.cera < snap.rerollCost;
  $('levelCera').textContent = Math.floor(snap.cera);
  requestAnimationFrame(() => wrap.querySelector('button')?.focus({preventScroll: true}));
}
$('levelReroll').addEventListener('click', () => game.rerollUpgrades());

/* ---------- ofrendas ---------- */

function itemCard(id, cls = 'card') {
  const it = ITEM[id];
  const b = el('div', `${cls} tier-${it.rarity}`);
  b.append(art(cardKey('i', id), 'card-art', it.name) || icon(it.icon, 56, ''), el('span', 'kind', `Objeto · ${TIER_LABEL[it.rarity]}`), el('h3', '', it.name));
  const ul = el('ul', 'effects');
  for (const [k, v] of Object.entries(it.stats)) ul.append(el('li', v > 0 ? 'good' : 'bad', statLine(k, v)));
  b.append(ul, el('p', 'memory', it.line));
  return b;
}

function onCrate(c) {
  $('crateEyebrow').textContent = c.remaining ? `Quedan ${c.remaining + 1} ofrendas` : 'Una cesta de ofrenda';
  $('crateTitle').textContent = ITEM[c.id].name;
  const wrap = $('crateCard');
  wrap.replaceChildren(itemCard(c.id));
  $('crateSellText').textContent = `Dejarla · +${c.sell}`;
  requestAnimationFrame(() => $('crateTake').focus({preventScroll: true}));
}
$('crateTake').addEventListener('click', () => game.takeCrate());
$('crateSell').addEventListener('click', () => game.sellCrate());

/* ---------- el puesto de Remedios ---------- */

{
  const kc = $('keeperPortrait').getContext('2d');
  drawPortrait(kc, 'remedios', 72, 80);
  const keeper = art(cardKey('p', 'remedios'), 'keeper', 'Remedios');
  if (keeper) $('keeperPortrait').replaceWith(keeper);
}

function weaponEffects(id, tier, live) {
  const w = WEAPON[id];
  const ul = el('ul', 'effects');
  const scale = Object.entries(w.scale).map(([k, v]) => `${Math.round(v * 100)} % ${SCALE_NAMES[k] || k}`).join(', ');
  ul.append(el('li', '', `Daño ${live ? live.damage : tierValue(w.dmg, tier)}${scale ? ` (+${scale})` : ''}`));
  ul.append(el('li', '', `Cada ${fmt(live ? live.cooldown : tierValue(w.cd, tier))} s · alcance ${live ? live.range : w.range}`));
  const crit = live ? Math.round(live.crit * 100) : Math.round(w.crit * 100);
  ul.append(el('li', '', `Crítico ${crit} % (×${fmt(w.critMul)})`));
  const extra = [];
  if (w.count && w.act !== 'orbit') { const n = tierValue(w.count, tier); extra.push(`${n} ${w.act === 'spread' ? (n === 1 ? 'perdigón' : 'perdigones') : (n === 1 ? 'proyectil' : 'proyectiles')}`); }
  if (w.act === 'orbit') extra.push(`${tierValue(w.count, tier)} cuentas`);
  if (w.pierce) extra.push(`atraviesa ${tierValue(w.pierce, tier)}`);
  if (w.bounces) extra.push(`rebota ${tierValue(w.bounces, tier)}`);
  if (w.blast) extra.push(`estalla (${tierValue(w.blast, tier)})`);
  if (w.burn) extra.push('quema');
  if (w.slow) extra.push('frena');
  if (w.act === 'boomerang') extra.push('va y vuelve');
  if (extra.length) ul.append(el('li', 'special', extra.join(' · ')));
  return ul;
}

function onShop(s) {
  shopSnap = s;
  $('shopEyebrow').textContent = `Ronda ${s.round} superada · ${s.hour}`;
  $('shopLine').textContent = s.line || '';
  $('shopCera').textContent = Math.floor(s.cera).toLocaleString('es-ES');
  $('shopHarvest').textContent = s.lastHarvest ? `Cosecha: +${s.lastHarvest}` : s.harvest ? `Cosecha: ${s.harvest} por ronda` : '';
  $('rerollText').textContent = s.rerollCost === 0 ? `Otra tirada · gratis (${s.freeRerolls})` : `Otra tirada · ${s.rerollCost}`;
  $('rerollButton').disabled = s.cera < s.rerollCost;
  $('nextRoundText').textContent = s.next > ROUNDS ? 'Esperar al alba' : `Seguir velando · Ronda ${s.next}${s.next === ROUNDS ? ' (la Guía)' : ''}`;
  $('shopLevel').textContent = `Nv ${s.level}`;
  // Las cuatro ofertas.
  const offers = $('offers');
  offers.replaceChildren();
  s.offers.forEach((o, i) => {
    const card = el('div', `offer tier-${o.tier}${o.sold ? ' sold' : ''}${o.locked ? ' locked' : ''}`);
    if (o.sold) { card.append(el('p', 'sold-note', 'Vendido')); offers.append(card); return; }
    const head = el('div', 'offer-head');
    const isW = o.kind === 'weapon';
    head.append(art(cardKey(isW ? 'w' : 'i', o.id), 'offer-art') || icon(isW ? 'w:' + o.id : ITEM[o.id].icon, 56, ''));
    const title = el('div', 'offer-title');
    title.append(el('span', 'kind', isW ? `Arma ${TIER_NAMES[o.tier]} · ${WEAPON[o.id].classes.map(c => CLASSES[c].name).join(' · ')}` : `Objeto · ${TIER_LABEL[o.tier]}`),
      el('h3', '', isW ? WEAPON[o.id].name : ITEM[o.id].name));
    head.append(title);
    card.append(el('kbd', 'hot', String(i + 1)), head);
    if (isW) {
      card.append(weaponEffects(o.id, o.tier));
      card.append(el('p', 'memory', WEAPON[o.id].line));
      const owned = s.weapons.filter(w => w.id === o.id && w.tier === o.tier).length;
      if (owned && o.tier < 3) card.append(el('p', 'note', o.combine ? 'Se junta con la tuya: sube de nivel' : `Ya tienes ${owned} igual: puedes juntarlas`));
    } else {
      const it = ITEM[o.id];
      const ul = el('ul', 'effects');
      for (const [k, v] of Object.entries(it.stats)) ul.append(el('li', v > 0 ? 'good' : 'bad', statLine(k, v)));
      card.append(ul, el('p', 'memory', it.line));
      const have = s.items[o.id] || 0;
      if (have) card.append(el('p', 'note', `Tienes ${have}${it.max ? ` de ${it.max}` : ''}`));
    }
    const row = el('div', 'offer-actions');
    const buy = el('button', 'buy');
    buy.append(el('span', '', o.ok ? 'Comprar' : o.reason), el('b', '', String(o.price)));
    buy.disabled = !o.ok;
    buy.setAttribute('aria-label', `${o.ok ? 'Comprar' : o.reason}: ${isW ? WEAPON[o.id].name : ITEM[o.id].name}, ${o.price} de cera`);
    buy.addEventListener('click', () => game.buy(i));
    const lock = el('button', 'lock icon-btn small');
    lock.setAttribute('aria-pressed', String(o.locked));
    lock.setAttribute('aria-label', o.locked ? 'Quitar el candado' : 'Guardar para la próxima vez');
    lock.title = o.locked ? 'Guardado para la próxima visita' : 'Guardar para la próxima visita';
    lock.innerHTML = `<svg aria-hidden="true"><use href="#i-${o.locked ? 'lock' : 'unlock'}"/></svg>`;
    lock.addEventListener('click', () => game.toggleLock(i));
    row.append(buy, lock);
    card.append(row);
    offers.append(card);
  });
  // Tus armas: seis huecos.
  $('weaponCount').textContent = `${s.weapons.length} / ${s.maxWeapons}`;
  const slots = $('shopWeapons');
  slots.replaceChildren();
  if (selectedSlot && !s.weapons.some(w => w.uid === selectedSlot)) selectedSlot = null;
  for (let i = 0; i < s.maxWeapons; i++) {
    const w = s.weapons[i];
    if (!w) { slots.append(el('div', 'slot empty')); continue; }
    const b = el('button', `slot tier-${w.tier}${w.uid === selectedSlot ? ' selected' : ''}${w.combine ? ' can-combine' : ''}`);
    b.append(icon('w:' + w.id, 40, ''), el('span', 'tier', TIER_NAMES[w.tier]));
    b.setAttribute('aria-label', `${WEAPON[w.id].name} ${TIER_NAMES[w.tier]}${w.combine ? ', se puede juntar' : ''}`);
    b.addEventListener('click', () => { selectedSlot = selectedSlot === w.uid ? null : w.uid; onShop(shopSnap); });
    slots.append(b);
  }
  const help = $('weaponHelp');
  help.replaceChildren();
  const sel = s.weapons.find(w => w.uid === selectedSlot);
  if (sel) {
    const box = el('div', `weapon-detail tier-${sel.tier}`);
    box.append(el('h4', '', `${WEAPON[sel.id].name} ${TIER_NAMES[sel.tier]}`), weaponEffects(sel.id, sel.tier, sel));
    const acts = el('div', 'detail-actions');
    if (sel.combine) { const c = el('button', 'secondary', 'Juntar con la otra igual'); c.addEventListener('click', () => game.combineWeapon(sel.uid)); acts.append(c); }
    const sell = el('button', 'secondary', `Vender · +${sel.sell}`);
    sell.disabled = !s.canSell;
    sell.addEventListener('click', () => { game.sellWeapon(sel.uid); selectedSlot = null; });
    acts.append(sell);
    box.append(acts);
    help.append(box);
  } else help.textContent = s.weapons.some(w => w.combine) ? 'Tienes dos armas iguales: tócalas para juntarlas en una de más nivel.' : 'Toca un arma para venderla o juntarla con otra igual.';
  // Tus cosas.
  const items = $('shopItems');
  items.replaceChildren();
  const owned = Object.entries(s.items);
  $('itemCount').textContent = owned.reduce((a, [, n]) => a + n, 0);
  for (const [id, n] of owned) {
    const it = ITEM[id];
    const d = el('button', `item tier-${it.rarity}`);
    d.append(icon(it.icon, 32, ''));
    if (n > 1) d.append(el('b', 'count', `×${n}`));
    d.setAttribute('aria-label', `${it.name}${n > 1 ? ` por ${n}` : ''}`);
    d.addEventListener('mouseenter', () => showTooltip(d, id));
    d.addEventListener('focus', () => showTooltip(d, id));
    d.addEventListener('mouseleave', hideTooltip);
    d.addEventListener('blur', hideTooltip);
    items.append(d);
  }
  // Premios de clase.
  const classes = $('shopClasses');
  classes.replaceChildren();
  for (const [c, n] of Object.entries(s.classes)) {
    const bonus = CLASSES[c].bonus[Math.min(6, n)];
    const txt = bonus ? Object.entries(bonus).map(([k, v]) => statLine(k, v)).join(', ') : 'con 2 armas de esta clase, un premio';
    classes.append(el('span', 'class-chip' + (bonus ? ' on' : ''), `${CLASSES[c].name} ×${n} · ${txt}`));
  }
  renderStats($('shopStats'), s.stats);
}

function renderStats(dl, stats) {
  dl.replaceChildren();
  for (const st of STATS) {
    const v = stats[st.id] || 0;
    const dt = el('dt', '');
    dt.append(icon(st.icon, 20, ''), el('span', '', st.name));
    dt.title = st.hint;
    const dd = el('dd', v > 0 ? 'good' : v < 0 ? 'bad' : '', `${fmt(v)}${st.pct ? ' %' : ''}`);
    dl.append(dt, dd);
  }
}

function showTooltip(anchor, id) {
  const it = ITEM[id], tip = $('tooltip');
  tip.replaceChildren(el('b', '', it.name), el('small', '', TIER_LABEL[it.rarity]));
  const ul = el('ul', 'effects');
  for (const [k, v] of Object.entries(it.stats)) ul.append(el('li', v > 0 ? 'good' : 'bad', statLine(k, v)));
  tip.append(ul, el('p', '', it.line));
  tip.classList.remove('hidden');
  const r = anchor.getBoundingClientRect();
  tip.style.left = `${Math.min(innerWidth - 260, Math.max(8, r.left - 80))}px`;
  tip.style.top = `${Math.max(8, r.top - tip.offsetHeight - 8)}px`;
}
function hideTooltip() { $('tooltip').classList.add('hidden'); }

$('rerollButton').addEventListener('click', () => game.rerollShop());
$('nextRound').addEventListener('click', () => { selectedSlot = null; hideTooltip(); game.nextRound(); });

/* Atajos en las pantallas entre rondas. */
addEventListener('keydown', e => {
  if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
  const n = Number(e.key);
  if (game.state === 'levelup') {
    if (n >= 1 && n <= 4) { e.preventDefault(); game.chooseUpgrade(n - 1); }
    else if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); game.rerollUpgrades(); }
  } else if (game.state === 'crate') {
    if (n === 1) { e.preventDefault(); game.takeCrate(); }
    else if (n === 2) { e.preventDefault(); game.sellCrate(); }
  } else if (game.state === 'shop') {
    if (n >= 1 && n <= 4 && !e.repeat) { e.preventDefault(); game.buy(n - 1); }
    else if (e.code === 'KeyR' && !e.repeat) { e.preventDefault(); game.rerollShop(); }
  }
});

function onSave(data) {
  if (data && !game.bot) store.set('run', data);
}

/* ---------- pausa ---------- */

function renderPause() {
  const wrap = $('pauseBuild');
  wrap.replaceChildren();
  const s = lastStats;
  if (!s) return;
  const row = el('div', 'build-row');
  for (const w of s.weapons) { const d = el('span', `slot tier-${w.tier}`); d.title = `${WEAPON[w.id].name} ${TIER_NAMES[w.tier]}`; d.append(icon('w:' + w.id, 32, '')); row.append(d); }
  for (const [id, n] of Object.entries(s.items)) { const d = el('span', `item tier-${ITEM[id].rarity}`); d.title = ITEM[id].name; d.append(icon(ITEM[id].icon, 28, '')); if (n > 1) d.append(el('b', 'count', `×${n}`)); row.append(d); }
  wrap.append(row);
  renderStats($('pauseStats'), s.stats);
}

/* ---------- letreros, subtítulos y hallazgos ---------- */

function onSubtitle(item) {
  const box = $('subtitle'), line = $('subLine');
  clearInterval(subTimer);
  if (!item) { box.classList.remove('show'); return; }
  box.className = 'subtitle show' + (item.speaker === AMPARO.name ? ' amparo' : '');
  $('subSpeaker').textContent = item.speaker;
  if (reducedMotion) { line.textContent = item.text; return; }
  let i = 0, tick = 0;
  line.textContent = '';
  subTimer = setInterval(() => {
    i = Math.min(item.text.length, i + 2);
    line.textContent = item.text.slice(0, i);
    if (tick++ % 3 === 0 && /[a-záéíóúñ]/i.test(item.text.slice(i - 2, i))) game.audio.sfx('voz', {speaker: item.speaker});
    if (i >= item.text.length) clearInterval(subTimer);
  }, 28);
}

function onBanner({title, sub, tone, art: key}) {
  const b = $('banner');
  b.className = 'banner';
  void b.offsetWidth;
  $('bannerTitle').textContent = title;
  $('bannerSub').textContent = sub || '';
  const picture = key ? Assets.image(key) : null;
  $('bannerArt').classList.toggle('hidden', !picture);
  if (picture) $('bannerArt').src = picture;
  b.className = `banner show ${tone || ''}${picture ? ' with-art' : ''}`;
}

function onDiscover({kind, id}) {
  const list = {weapon: progress.found.weapons, item: progress.found.items, creature: progress.found.creatures, elite: progress.found.elites}[kind];
  if (!list || list.includes(id) || game.bot) return;
  list.push(id);
  store.set('progress', progress);
}

/* ---------- el final ---------- */

const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

function onEnd(result) {
  const ch = CHARACTERS[result.character];
  const n = progress.nights.length + 1;
  const memorial = $('memorial');
  memorial.classList.toggle('out', !result.victory);
  const scene = Assets.image(result.victory ? 'escena:alba' : 'escena:apagon');
  $('endArt').classList.toggle('hidden', !scene);
  if (scene) $('endArt').src = scene;
  const before = {chars: Object.keys(CHARACTERS).filter(unlockedChar), dangers: DANGER.filter(d => unlockedDanger(d.id)).map(d => d.id)};
  $('endEyebrow').textContent = `Noche ${n} · ${ch.name} · ${DANGER[result.danger].name}`;
  if (result.victory) {
    $('endTitle').textContent = ENDINGS.dawnTitle;
    const first = !progress.dawns[result.character];
    $('endText').textContent = `${fill(ENDINGS.dawn, {difunta: WORLD.deceased})} ${ch.victory}`;
    $('endWords').textContent = `${AMPARO.dawn} ${first ? fill(ENDINGS.firstDawn, {quien: ch.name}) : ENDINGS.laterDawn}`;
  } else {
    $('endTitle').textContent = fill(ENDINGS.outTitle, {hora: result.clock});
    $('endText').textContent = `${fill(ENDINGS.out, {ronda: result.round})} ${ch.defeat}`;
    $('endWords').textContent = WORLD.loop;
  }
  const stats = $('endStats');
  stats.replaceChildren();
  const reached = result.victory ? ROUNDS : result.round;
  for (const [value, label] of [[`${reached} / ${ROUNDS}`, 'rondas'], [result.clock, 'la hora'], [result.kills.toLocaleString('es-ES'), 'ahuyentados'], [result.level, 'nivel'], [Math.round(result.cera).toLocaleString('es-ES'), 'cera']]) {
    const d = el('div');
    d.append(el('b', '', String(value)), el('span', '', label));
    stats.append(d);
  }
  // Qué arma hizo qué: una barra por arma.
  const wrap = $('endWeapons');
  wrap.replaceChildren();
  const max = Math.max(1, ...result.weapons.map(w => w.damage));
  for (const w of [...result.weapons].sort((a, b) => b.damage - a.damage)) {
    const row = el('div', `damage-row tier-${w.tier}`);
    const bar = el('div', 'damage-bar');
    const i = el('i'); i.style.width = `${w.damage / max * 100}%`;
    bar.append(i);
    row.append(icon('w:' + w.id, 28, ''), el('span', '', `${WEAPON[w.id].name} ${TIER_NAMES[w.tier]}`), bar, el('b', '', w.damage.toLocaleString('es-ES')));
    wrap.append(row);
  }
  // Progreso entre noches.
  if (!game.bot) {
    progress.maxRound = Math.max(progress.maxRound, reached);
    progress.best[result.character] = Math.max(progress.best[result.character] || 0, reached);
    if (result.victory) {
      progress.wins[result.danger] = (progress.wins[result.danger] || 0) + 1;
      progress.dawns[result.character] = (progress.dawns[result.character] || 0) + 1;
    }
    progress.nights.push({n, character: result.character, victory: result.victory, round: reached, clock: result.clock, kills: result.kills, level: result.level, danger: result.danger, date: new Date().toISOString()});
    if (progress.nights.length > 80) progress.nights = progress.nights.slice(-80);
    store.set('progress', progress);
    store.remove('run');
  }
  const newChars = Object.keys(CHARACTERS).filter(unlockedChar).filter(id => !before.chars.includes(id));
  const newDangers = DANGER.filter(d => unlockedDanger(d.id) && !before.dangers.includes(d.id));
  const unlocks = [...newChars.map(id => `${CHARACTERS[id].name} ya puede velar`), ...newDangers.map(d => `Nueva dificultad: ${d.name}`)];
  $('endUnlock').textContent = unlocks.join(' · ');
  requestAnimationFrame(() => $('againButton').focus({preventScroll: true}));
}

/* ---------- álbum y noches ---------- */

function renderAlbum() {
  const f = progress.found;
  const weapons = $('albumWeapons');
  weapons.replaceChildren();
  $('albumWeaponsCount').textContent = `${f.weapons.length} de ${WEAPONS.length}`;
  for (const w of WEAPONS) {
    const known = f.weapons.includes(w.id);
    const d = el('div', 'item' + (known ? '' : ' unknown'));
    if (known) d.append(art(cardKey('w', w.id), 'thumb') || icon('w:' + w.id, 36, ''), el('b', '', w.name), el('small', '', w.classes.map(c => CLASSES[c].name).join(' · ')), el('p', '', w.line));
    else d.append(el('p', '', 'Todavía no la has tenido en las manos.'));
    weapons.append(d);
  }
  const items = $('albumItems');
  items.replaceChildren();
  $('albumItemsCount').textContent = `${f.items.length} de ${ITEMS.length}`;
  for (const it of ITEMS) {
    const known = f.items.includes(it.id);
    const d = el('div', `item tier-${it.rarity}` + (known ? '' : ' unknown'));
    if (known) d.append(art(cardKey('i', it.id), 'thumb') || icon(it.icon, 36, ''), el('b', '', it.name), el('small', '', TIER_LABEL[it.rarity]), el('p', '', it.line));
    else d.append(el('p', '', 'Remedios aún no te lo ha enseñado.'));
    items.append(d);
  }
  const eliteGrid = $('eliteGrid');
  eliteGrid.replaceChildren();
  for (const [id, elite] of Object.entries(ELITES)) {
    const known = f.elites.includes(id);
    const d = el('div', 'elite' + (known ? '' : ' unknown'));
    const picture = known ? art(cardKey('e', id), 'thumb wide') : null;
    if (picture) d.append(picture);
    d.append(el('b', '', known ? elite.name : 'Alguien que aún no ha venido'), el('p', '', known ? elite.epitaph : 'Cada hora viene uno. Todos tienen nombre.'));
    eliteGrid.append(d);
  }
  const best = $('bestiaryGrid');
  best.replaceChildren();
  for (const [id, c] of Object.entries(CREATURES)) {
    const known = f.creatures.includes(id);
    const d = el('div', 'beast' + (known ? '' : ' unknown'));
    const canvas = document.createElement('canvas');
    canvas.width = 260; canvas.height = 92;
    const g = canvas.getContext('2d');
    const s = sprite(id), scale = Math.min(3, Math.floor(84 / s.h)) || 1;
    if (known) { drawSprite(g, id, 130, 46, {scale}); drawSprite(g, id, 130, 46, {scale, layer: 'glow'}); }
    else { g.globalAlpha = 0.5; drawSprite(g, id, 130, 46, {scale, layer: 'glow'}); }
    d.append((known && art(cardKey('c', id), 'thumb wide')) || canvas, el('b', '', known ? c.name : 'Algo que aún no has visto'), el('small', '', known ? c.tag : ' '), el('p', '', known ? c.lore : 'Solo se le ven los ojos.'));
    best.append(d);
  }
  const watch = $('watchersGrid');
  watch.replaceChildren();
  for (const [id, ch] of Object.entries(CHARACTERS)) {
    const dawns = progress.dawns[id] || 0, bestRound = progress.best[id] || 0;
    const d = el('div', 'watcher' + (unlockedChar(id) ? '' : ' unknown'));
    const c = document.createElement('canvas'); c.width = 56; c.height = 64;
    drawPortrait(c.getContext('2d'), id, 56, 64);
    const box = el('div');
    box.append(el('b', '', ch.name), el('small', '', `${ch.role} · ${dawns ? `${dawns} ${dawns === 1 ? 'amanecer' : 'amaneceres'}` : bestRound ? `hasta la ronda ${bestRound}` : 'sin velar'}`),
      el('p', '', unlockedChar(id) ? (dawns ? ch.victory : ch.blurb) : ch.unlock.text));
    d.append((unlockedChar(id) && art(cardKey('p', id), 'thumb')) || c, box);
    watch.append(d);
  }
}

function renderRecords() {
  const nights = progress.nights;
  const wins = nights.filter(r => r.victory).length;
  const sum = $('recordSummary');
  sum.replaceChildren();
  for (const [v, l] of [[nights.length, 'noches veladas'], [wins, wins === 1 ? 'amanecer' : 'amaneceres'], [`${progress.maxRound} / ${ROUNDS}`, 'ronda más lejana']]) {
    const d = el('div');
    d.append(el('b', '', String(v)), el('span', '', l));
    sum.append(d);
  }
  const ol = $('recordList');
  ol.replaceChildren();
  for (const r of [...nights].reverse().slice(0, 30)) {
    const li = el('li', r.victory ? 'dawn' : '');
    const ch = CHARACTERS[r.character];
    li.append(el('b', '', `Noche ${r.n}`), el('span', '', `${ch?.name || '—'} · ${r.victory ? ENDINGS.recordDawn : `ronda ${r.round}, ${r.clock}`} · ${(r.kills || 0).toLocaleString('es-ES')} ahuyentados · nivel ${r.level || 1}${r.danger ? ` · ${DANGER[r.danger]?.name}` : ''}`));
    ol.append(li);
  }
}

/* ---------- diálogos y ajustes ---------- */

const helpList = $('helpList');
for (const [term, text] of HELP) helpList.append(el('dt', '', term), el('dd', '', text));

let dialogOpener = null;
for (const b of document.querySelectorAll('[data-open]')) {
  b.addEventListener('click', () => {
    const d = $(b.dataset.open);
    if (game.state === 'running') game.pause();
    if (d.id === 'albumDialog') renderAlbum();
    if (d.id === 'recordsDialog') renderRecords();
    dialogOpener = b;
    d.showModal();
    game.audio.sfx('ui-abrir');
  });
}
for (const d of document.querySelectorAll('dialog')) {
  d.querySelector('[data-close]')?.addEventListener('click', () => d.close());
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
  d.addEventListener('close', () => { game.audio.sfx('ui-cerrar'); dialogOpener?.focus?.({preventScroll: true}); });
}

function saveSettings() {
  store.set('settings', settings);
  game.setOptions({shake: settings.shake, flashes: settings.flashes, weather: settings.weather, numbers: settings.numbers, softDark: settings.softDark});
  game.audio.setMix({music: settings.music, sfx: settings.sfx, amb: settings.amb});
}
function syncSound() {
  $('soundButton').querySelector('use').setAttribute('href', settings.muted ? '#i-mute' : '#i-sound');
  $('soundButton').setAttribute('aria-label', settings.muted ? 'Activar sonido' : 'Silenciar');
  $('optSound').checked = !settings.muted;
}
function setMuted(v) { settings.muted = v; game.audio.init(); game.setMuted(v); syncSound(); saveSettings(); }
$('soundButton').addEventListener('click', () => { setMuted(!settings.muted); toast(settings.muted ? 'Sonido apagado' : 'Sonido encendido'); });
$('optSound').addEventListener('change', e => setMuted(!e.target.checked));
for (const [id, key] of [['optVolume', 'volume'], ['optMusic', 'music'], ['optSfx', 'sfx'], ['optAmb', 'amb']]) {
  $(id).value = Math.round(settings[key] * 100);
  $(id).addEventListener('input', e => {
    settings[key] = Number(e.target.value) / 100;
    if (key === 'volume') game.setVolume(settings.volume);
    saveSettings();
  });
}
for (const [id, key] of [['optShake', 'shake'], ['optFlashes', 'flashes'], ['optNumbers', 'numbers'], ['optWeather', 'weather'], ['optSoftDark', 'softDark']]) {
  $(id).checked = settings[key];
  $(id).addEventListener('change', e => { settings[key] = e.target.checked; saveSettings(); });
}
syncSound();

$('fullscreenButton').addEventListener('click', () => {
  const doc = document;
  if (doc.fullscreenElement) doc.exitFullscreen?.();
  else doc.documentElement.requestFullscreen?.().catch(() => toast('Este navegador no permite pantalla completa.'));
});

for (const b of document.querySelectorAll('button')) b.addEventListener('focus', () => { if (game.state !== 'running') game.audio.sfx('ui-foco'); });

bindOverlayKeyboard();
/* El navegador pide un gesto antes de sonar: el primero, en el título, ya despierta la música. */
const wakeAudio = () => {
  removeEventListener('pointerdown', wakeAudio); removeEventListener('keydown', wakeAudio);
  game.audio.init(); game.setMuted(settings.muted);
};
addEventListener('pointerdown', wakeAudio); addEventListener('keydown', wakeAudio);
selectCharacter(selected);
renderDangers();
updateNightCount();
onState(game.state);

/* Para probar: ?autostart=1&char=julian&weapon=pala&danger=0 */
if (params.get('autostart') === '1') {
  const ch = params.get('char');
  if (CHARACTERS[ch]) selected = ch;
  const wp = params.get('weapon');
  selectedWeapon = CHARACTERS[selected].weapons.includes(wp) ? wp : CHARACTERS[selected].weapons[0];
  const dg = Number(params.get('danger'));
  selectedDanger = DANGER[dg] ? dg : 0;
  game.audio.init();
  game.start(selected, selectedWeapon, selectedDanger);
  prepareHud();
  const r = Number(params.get('round'));
  if (r > 1) { game.run.round = r - 1; game.startRound(r); }
}
