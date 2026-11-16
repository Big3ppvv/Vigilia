import { VigilGame } from './game.js';
import { drawPortrait, drawSprite, sprite } from './art.js';
import { WORLD, CHARACTERS, MEMORIES, CREATURES, BOSS, AMPARO, HELP, ROOMS, ELITES, VIGIL_TEXT, ENDINGS } from './story.js';

const $ = id => document.getElementById(id);
const MEMORY = Object.fromEntries(MEMORIES.map(m => [m.id, m]));
const params = new URLSearchParams(location.search);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- lo que se guarda en este navegador ---------- */

const store = {
  get(key, fallback) { try { const v = JSON.parse(localStorage.getItem('vigilia2.' + key)); return v ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('vigilia2.' + key, JSON.stringify(value)); } catch { /* sin almacenamiento */ } }
};
const settings = Object.assign({muted: false, volume: 0.8, music: 1, sfx: 1, amb: 1, shake: !reducedMotion, flashes: !reducedMotion, weather: !reducedMotion, numbers: false, softDark: false}, store.get('settings', {}));
let nights = store.get('nights', []);
if (!Array.isArray(nights)) nights = [];
const found = Object.assign({memories: [], creatures: [], rooms: [], elites: [], dawns: {}, freed: 0, lulled: false}, store.get('found', {}));
for (const key of ['memories', 'creatures', 'rooms', 'elites']) if (!Array.isArray(found[key])) found[key] = [];
let selected = store.get('selected', 'lucia');
if (!CHARACTERS[selected]) selected = 'lucia';

/* ---------- el juego ---------- */

const game = new VigilGame($('game'), {onStats, onState, onLevelUp, onEnd, onSubtitle, onBanner, onDiscover});
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

let choices = [];
let subTimer = null;
let memSignature = '';
let toastTimer = null;
let wakeSignature = '';
let lullWasReady = false;
let lastStats = null;

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2800);
}

function iconCanvas(id, size, scale) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  drawSprite(g, id, size / 2, size / 2, {scale});
  return c;
}

/* ---------- título ---------- */

$('introLine').textContent = WORLD.intro;
$('taglineLine').textContent = WORLD.tagline;
$('placeLine').textContent = `${WORLD.night} · ${WORLD.place}`;

const castEl = $('cast');
for (const [id, ch] of Object.entries(CHARACTERS)) {
  const b = document.createElement('button');
  b.className = 'cast-card';
  b.dataset.character = id;
  b.setAttribute('role', 'radio');
  const c = document.createElement('canvas');
  c.width = 56; c.height = 64;
  drawPortrait(c.getContext('2d'), id, 56, 64);
  const name = document.createElement('span'); name.className = 'name'; name.textContent = ch.name;
  const role = document.createElement('span'); role.className = 'role'; role.textContent = ch.role;
  b.append(c, name, role);
  b.addEventListener('click', () => selectCharacter(id));
  castEl.append(b);
}

function selectCharacter(id) {
  if (!CHARACTERS[id] || game.state !== 'ready') return;
  selected = id;
  store.set('selected', id);
  game.character = id;
  game.reset();
  for (const el of castEl.children) el.setAttribute('aria-checked', String(el.dataset.character === id));
  const ch = CHARACTERS[id];
  $('castDetail').textContent = `${ch.age}. ${ch.blurb}`;
  $('castPerk').textContent = ch.perk;
}

function updateNightCount() {
  const dawns = Object.values(found.dawns).reduce((a, b) => a + b, 0);
  const n = nights.length;
  $('nightCount').textContent = n === 0 ? 'Primera noche' : `Noche ${n + 1}${dawns ? ` · ${dawns} ${dawns === 1 ? 'amanecer' : 'amaneceres'}` : ''}`;
}

function layoutTitle() {
  const wide = innerWidth > 860;
  const zoom = game.zoom || 1;
  if (wide) game.titleFocus = {x: (-Math.min(560, innerWidth * 0.48) / 2 + 20) / zoom, y: 30};
  else game.titleFocus = {x: 0, y: 30 + innerHeight * 0.36 / zoom};
}
addEventListener('resize', layoutTitle);
layoutTitle();

function start() {
  if (game.state !== 'ready' && game.state !== 'ended') return;
  if (game.state === 'ended') game.backToTitle();
  game.audio.init();
  game.setMuted(settings.muted);
  game.start(selected);
  memSignature = ''; wakeSignature = ''; lullWasReady = false;
  const ch = CHARACTERS[selected];
  $('hudName').textContent = ch.name;
  $('hudRole').textContent = ch.role;
  const t = Number(params.get('t'));
  if (t > 0) game.skipTo(t);
}

$('startButton').addEventListener('click', start);
$('againButton').addEventListener('click', start);
$('otherButton').addEventListener('click', () => { game.backToTitle(); selectCharacter(selected); });
$('quitButton').addEventListener('click', () => { game.backToTitle(); selectCharacter(selected); });
$('resumeButton').addEventListener('click', () => game.resume());
$('pauseButton').addEventListener('click', () => game.state === 'paused' ? game.resume() : game.pause());
$('dashButton').addEventListener('click', () => game.dash());
$('lullButton').addEventListener('click', () => game.arrullo());

/* ---------- durante la noche ---------- */

function onStats(s) {
  const hp = Math.max(0, s.hp);
  $('hpBar').style.width = `${Math.max(0, Math.min(100, hp / s.maxHp * 100))}%`;
  $('hpText').textContent = `${Math.ceil(hp)} / ${Math.round(s.maxHp)}`;
  $('clock').textContent = s.clock;
  $('mood').textContent = s.mood;
  $('nightBar').style.width = `${Math.min(100, s.time / 600 * 100)}%`;
  $('kills').textContent = s.kills.toLocaleString('es-ES');
  $('xpBar').style.width = `${Math.min(100, s.xp / s.xpNext * 100)}%`;
  const total = Object.values(s.mem).reduce((a, b) => a + b, 0);
  $('levelText').textContent = `Recuerdos · ${total}`;
  const ready = s.dashCd <= 0;
  $('dashFill').style.width = `${ready ? 100 : (1 - s.dashCd / s.dashMax) * 100}%`;
  $('dashButton').classList.toggle('cooling', !ready);
  $('dashKey').textContent = ready ? 'Espacio' : `${Math.ceil(s.dashCd)} s`;
  lastStats = s;
  // El arrullo
  const lullReady = s.lullCd <= 0, singing = s.lull > 0;
  $('lullFill').style.width = `${lullReady ? 100 : (1 - s.lullCd / s.lullMax) * 100}%`;
  $('lullButton').classList.toggle('cooling', !lullReady && !singing);
  $('lullButton').classList.toggle('singing', singing);
  $('lullKey').textContent = lullReady ? 'E' : `${Math.ceil(s.lullCd)} s`;
  if (lullReady && !lullWasReady && s.state === 'running') {
    $('lullButton').classList.remove('ready-now'); void $('lullButton').offsetWidth; $('lullButton').classList.add('ready-now');
    if (!found.lulled) toast(`${matchMedia('(pointer: coarse)').matches ? 'Arrullar' : 'E'} · ${VIGIL_TEXT.lullHint}`);
  }
  if (singing && !found.lulled) { found.lulled = true; store.set('found', found); }
  lullWasReady = lullReady;
  // Los cirios y el alma
  const wakeSig = s.cirios.join('');
  if (wakeSig !== wakeSignature) {
    wakeSignature = wakeSig;
    const lit = s.cirios.filter(v => v === 1).length;
    [...$('wake').children].forEach((el, i) => { el.className = s.cirios[i] === 1 ? 'on' : s.cirios[i] ? 'half' : ''; });
    $('wake').classList.toggle('dark', lit === 0);
    $('wake').setAttribute('aria-label', `Cirios encendidos: ${lit} de 4`);
  }
  $('soulBox').classList.toggle('hidden', s.soul < 0.01);
  $('soulBar').style.width = `${s.soul * 100}%`;
  $('soulBox').classList.toggle('danger', s.soul > 0.5);
  const boss = s.boss && s.boss.alive;
  $('bossBox').classList.toggle('hidden', !boss);
  if (boss) {
    $('bossBar').style.width = `${s.boss.hp / s.boss.maxHp * 100}%`;
    $('bossBox').classList.toggle('danger', s.soul > 0.5);
  }
  $('pauseClock').textContent = `${s.clock} · ${s.mood}`;
  const sig = s.order.map(id => id + s.mem[id]).join('|');
  if (sig !== memSignature) {
    const before = memSignature;
    memSignature = sig;
    renderHudMemories(s, before);
  }
}

function renderHudMemories(s, before) {
  const wrap = $('hudMemories');
  wrap.replaceChildren();
  for (const id of s.order) {
    const m = MEMORY[id];
    if (!m) continue;
    const el = document.createElement('div');
    el.className = 'mem';
    el.title = `${m.name} · nivel ${s.mem[id]}`;
    el.append(iconCanvas(id, 24, 2));
    const pips = document.createElement('div');
    pips.className = 'pips';
    for (let i = 0; i < 5; i++) { const p = document.createElement('i'); if (i < s.mem[id]) p.className = 'on'; pips.append(p); }
    el.append(pips);
    if (before && !before.includes(id + s.mem[id])) el.classList.add('fresh');
    wrap.append(el);
  }
}

function onState(state) {
  const playing = ['running', 'paused', 'upgrade', 'dying', 'dawn'].includes(state);
  document.body.classList.toggle('playing', playing);
  $('title').classList.toggle('hidden', state !== 'ready');
  $('hud').classList.toggle('hidden', !playing);
  $('choice').classList.toggle('hidden', state !== 'upgrade');
  $('pause').classList.toggle('hidden', state !== 'paused');
  $('end').classList.toggle('hidden', state !== 'ended');
  if (state === 'paused') { renderPauseBuild(); requestAnimationFrame(() => $('resumeButton').focus({preventScroll: true})); }
  if (state === 'ready') { updateNightCount(); onSubtitle(null); }
  if (state === 'running') $('game').focus({preventScroll: true});
}

/* Lo que se lleva reunido de cada rincón, para la pausa. */
function renderPauseBuild() {
  const wrap = $('pauseBuild');
  wrap.replaceChildren();
  const s = lastStats;
  if (!s || !s.rooms.length) return;
  const h = document.createElement('h3'); h.textContent = 'Rincones reunidos';
  wrap.append(h);
  for (const room of ROOMS) {
    if (!s.rooms.includes(room.id)) continue;
    const p = document.createElement('p');
    const b = document.createElement('b'); b.textContent = room.name;
    p.append(b, ` · ${room.effect}`);
    wrap.append(p);
  }
}

function onLevelUp({choices: list, free, slots}) {
  choices = list;
  $('choiceEyebrow').textContent = free ? VIGIL_TEXT.cardEyebrow : VIGIL_TEXT.levelEyebrow;
  $('choiceSlots').textContent = slots ? `Armas ${slots.arma[0]} de ${slots.arma[1]} · Recuerdos ${slots.recuerdo[0]} de ${slots.recuerdo[1]}` : '';
  const wrap = $('choiceCards');
  wrap.replaceChildren();
  list.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    const kindLabel = c.kind === 'arma' ? 'Arma' : c.kind === 'consuelo' ? 'Consuelo' : 'Recuerdo';
    const level = c.kind === 'consuelo' ? '' : c.isNew ? '<span class="new">· nuevo</span>' : `· nivel ${c.level}`;
    b.innerHTML = `<kbd>${i + 1}</kbd><span class="kind">${kindLabel} ${level}</span><h3></h3><p class="memory"></p><p class="room"></p><p class="effect"></p>`;
    b.prepend(iconCanvas(c.id, 48, 4));
    b.querySelector('h3').textContent = c.name;
    b.querySelector('.memory').textContent = c.line;
    b.querySelector('.effect').textContent = c.effect;
    const roomEl = b.querySelector('.room');
    if (c.room) {
      // A qué rincón pertenece y cuánto falta para reunirlo.
      const name = document.createElement('b'); name.textContent = c.room.name;
      const have = c.room.have + (c.isNew ? 1 : 0);
      roomEl.append(name, ` · ${have} de ${c.room.total}`);
      if (c.room.completes) {
        roomEl.classList.add('closes');
        const what = document.createElement('small'); what.textContent = c.room.effect;
        roomEl.append(what);
      }
    } else roomEl.remove();
    b.addEventListener('click', () => game.chooseUpgrade(c.id));
    wrap.append(b);
  });
  requestAnimationFrame(() => wrap.querySelector('button')?.focus({preventScroll: true}));
}

function onSubtitle(item) {
  const el = $('subtitle'), line = $('subLine');
  clearInterval(subTimer);
  if (!item) { el.classList.remove('show'); return; }
  el.className = 'subtitle show' + (item.speaker === AMPARO.name ? ' amparo' : item.speaker === 'Carmela' ? ' carmela' : '');
  $('subSpeaker').textContent = item.speaker;
  if (reducedMotion) { line.textContent = item.text; game.audio.sfx('voz', {speaker: item.speaker}); return; }
  let i = 0, tick = 0;
  line.textContent = '';
  subTimer = setInterval(() => {
    i = Math.min(item.text.length, i + 2);
    line.textContent = item.text.slice(0, i);
    // Cada cual tiene su voz: un murmullo mientras se escribe la frase.
    if (tick++ % 3 === 0 && /[a-záéíóúñ]/i.test(item.text.slice(i - 2, i))) game.audio.sfx('voz', {speaker: item.speaker});
    if (i >= item.text.length) clearInterval(subTimer);
  }, 30);
}

function onBanner({title, sub, tone}) {
  const b = $('banner');
  b.className = 'banner';
  void b.offsetWidth;
  $('bannerTitle').textContent = title;
  $('bannerSub').textContent = sub || '';
  b.className = `banner show ${tone || ''}`;
}

function onDiscover({kind, id}) {
  const list = {memory: found.memories, creature: found.creatures, room: found.rooms, elite: found.elites}[kind];
  if (!list || list.includes(id)) return;
  list.push(id);
  store.set('found', found);
}

/* ---------- el final ---------- */

function list(items) {
  if (items.length <= 1) return items[0] || '';
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

/* Rellena {quien}, {hora}… en una frase de story.js. */
const fill = (text, values) => text.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');

function remembered(result) {
  const owned = result.order.filter(id => MEMORY[id] && result.memories[id] > 0);
  return [...owned]
    .sort((a, b) => result.memories[b] - result.memories[a] || owned.indexOf(a) - owned.indexOf(b))
    .slice(0, 3)
    .map(id => MEMORY[id].fragment);
}

function onEnd(result) {
  const ch = CHARACTERS[result.character];
  const n = nights.length + 1;
  const total = Object.values(result.memories).reduce((a, b) => a + b, 0);
  const frags = remembered(result);
  const memorial = $('memorial');
  memorial.classList.toggle('out', !result.victory);
  if (result.victory) {
    $('endEyebrow').textContent = `Noche ${n} · ${ch.name}`;
    $('endTitle').textContent = ENDINGS.dawnTitle;
    $('endText').textContent = `${fill(ENDINGS.dawn, {difunta: WORLD.deceased, recuerdos: list(frags)})} ${ch.victory}`;
    $('endWords').textContent = AMPARO.dawn;
    const first = !found.dawns[result.character];
    found.dawns[result.character] = (found.dawns[result.character] || 0) + 1;
    if (result.freed) found.freed = (found.freed || 0) + 1;
    $('loopLine').textContent = first ? fill(ENDINGS.firstDawn, {quien: ch.name}) : ENDINGS.laterDawn;
  } else {
    $('endEyebrow').textContent = `Noche ${n} · ${ch.name}`;
    $('endTitle').textContent = fill(result.cause === 'took' ? ENDINGS.tookTitle : ENDINGS.outTitle, {hora: result.clock});
    const opening = result.cause === 'took' ? BOSS.took : ENDINGS.out;
    $('endText').textContent = `${opening} ${ch.defeat}`;
    $('endWords').textContent = frags.length ? fill(ENDINGS.remembered, {recuerdos: list(frags)}) : '';
    $('loopLine').textContent = WORLD.loop;
  }
  $('endStats').innerHTML = '';
  for (const [value, label] of [[result.clock, 'la hora'], [result.kills.toLocaleString('es-ES'), 'ahuyentados'], [total, 'recuerdos'], [result.relit, result.relit === 1 ? 'cirio encendido' : 'cirios encendidos']]) {
    const d = document.createElement('div');
    const b = document.createElement('b'); b.textContent = value;
    const s = document.createElement('span'); s.textContent = label;
    d.append(b, s);
    $('endStats').append(d);
  }
  nights.push({n, character: result.character, victory: result.victory, cause: result.cause, clock: result.clock, kills: result.kills, memories: total,
    rooms: result.rooms, relit: result.relit, revives: result.revives, date: new Date().toISOString()});
  if (nights.length > 60) nights = nights.slice(-60);
  store.set('nights', nights);
  store.set('found', found);
  requestAnimationFrame(() => $('againButton').focus({preventScroll: true}));
}

/* ---------- álbum y libro de noches ---------- */

function renderAlbum() {
  const grid = $('albumGrid');
  grid.replaceChildren();
  $('albumCount').textContent = `${found.memories.length} de ${MEMORIES.length}`;
  for (const m of MEMORIES) {
    const known = found.memories.includes(m.id);
    const el = document.createElement('div');
    el.className = 'item' + (known ? '' : ' unknown');
    if (known) {
      el.append(iconCanvas(m.id, 36, 3));
      const b = document.createElement('b'); b.textContent = m.name;
      const s = document.createElement('small'); s.textContent = m.kind === 'arma' ? 'Arma' : 'Recuerdo';
      const p = document.createElement('p'); p.textContent = m.line;
      el.append(b, s, p);
    } else {
      const p = document.createElement('p'); p.textContent = 'Aún no lo recuerdas.';
      el.append(p);
    }
    grid.append(el);
  }
  const roomGrid = $('roomGrid');
  roomGrid.replaceChildren();
  $('roomCount').textContent = `${found.rooms.length} de ${ROOMS.length}`;
  for (const room of ROOMS) {
    const known = found.rooms.includes(room.id);
    const el = document.createElement('div');
    el.className = 'room' + (known ? '' : ' unknown');
    const b = document.createElement('b'); b.textContent = known ? room.name : 'Un rincón que aún no has reunido';
    const small = document.createElement('small');
    small.textContent = room.members.map(id => found.memories.includes(id) ? MEMORY[id].name : '···').join(' · ');
    const p = document.createElement('p'); p.textContent = known ? room.effect : 'Hay recuerdos que van juntos.';
    el.append(b, small, p);
    if (known) { const em = document.createElement('em'); em.textContent = room.line; el.append(em); }
    roomGrid.append(el);
  }
  const eliteGrid = $('eliteGrid');
  eliteGrid.replaceChildren();
  for (const [id, elite] of Object.entries(ELITES)) {
    const known = found.elites.includes(id);
    const el = document.createElement('div');
    el.className = 'elite' + (known ? '' : ' unknown');
    const b = document.createElement('b'); b.textContent = known ? elite.name : 'Alguien que aún no ha venido';
    const p = document.createElement('p'); p.textContent = known ? elite.epitaph : 'Cada hora viene uno. Todos tienen nombre.';
    el.append(b, p);
    eliteGrid.append(el);
  }
  const best = $('bestiaryGrid');
  best.replaceChildren();
  for (const [id, c] of Object.entries(CREATURES)) {
    const known = found.creatures.includes(id);
    const el = document.createElement('div');
    el.className = 'beast' + (known ? '' : ' unknown');
    const canvas = document.createElement('canvas');
    canvas.width = 260; canvas.height = 92;
    const g = canvas.getContext('2d');
    const s = sprite(id), scale = Math.min(3, Math.floor(84 / s.h)) || 1;
    if (known) { drawSprite(g, id, 130, 46, {scale}); drawSprite(g, id, 130, 46, {scale, layer: 'glow'}); }
    else { g.globalAlpha = 0.5; drawSprite(g, id, 130, 46, {scale, layer: 'glow'}); }
    const b = document.createElement('b'); b.textContent = known ? c.name : 'Algo que aún no has visto';
    const small = document.createElement('small'); small.textContent = known ? c.tag : ' ';
    const p = document.createElement('p'); p.textContent = known ? c.lore : 'Solo se le ven los ojos.';
    el.append(canvas, b, small, p);
    best.append(el);
  }
  const watch = $('watchersGrid');
  watch.replaceChildren();
  for (const [id, ch] of Object.entries(CHARACTERS)) {
    const dawns = found.dawns[id] || 0;
    const el = document.createElement('div');
    el.className = 'watcher';
    const c = document.createElement('canvas'); c.width = 56; c.height = 64;
    drawPortrait(c.getContext('2d'), id, 56, 64);
    const box = document.createElement('div');
    const b = document.createElement('b'); b.textContent = ch.name;
    const s = document.createElement('small'); s.textContent = `${ch.role} · ${dawns ? `${dawns} ${dawns === 1 ? 'amanecer' : 'amaneceres'}` : 'sin amanecer'}`;
    const p = document.createElement('p'); p.textContent = dawns ? ch.victory : 'Todavía no ha visto amanecer junto a Amparo.';
    box.append(b, s, p);
    el.append(c, box);
    watch.append(el);
  }
}

function renderRecords() {
  const dawns = nights.filter(r => r.victory).length;
  const latest = nights.filter(r => !r.victory).reduce((best, r) => (r.clock > best ? r.clock : best), '00:00');
  const sum = $('recordSummary');
  sum.innerHTML = '';
  for (const [v, l] of [[nights.length, 'noches veladas'], [dawns, dawns === 1 ? 'amanecer' : 'amaneceres'], [dawns ? '06:00' : latest, 'la hora más tardía']]) {
    const d = document.createElement('div');
    const b = document.createElement('b'); b.textContent = v;
    const s = document.createElement('span'); s.textContent = l;
    d.append(b, s); sum.append(d);
  }
  const ol = $('recordList');
  ol.replaceChildren();
  if (!nights.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Todavía no has velado ninguna noche.'; ol.append(li); return; }
  for (const r of [...nights].reverse()) {
    const li = document.createElement('li');
    const n = document.createElement('b'); n.textContent = `Noche ${r.n}`;
    const who = document.createElement('span'); who.textContent = CHARACTERS[r.character]?.name || '—';
    const what = document.createElement('span');
    what.textContent = r.victory ? ENDINGS.recordDawn : fill(r.cause === 'took' ? ENDINGS.tookTitle : ENDINGS.outTitle, {hora: r.clock}).replace(/\.$/, '');
    if (r.victory) what.className = 'won';
    const meta = document.createElement('small');
    meta.textContent = `${r.kills} ahuyentados · ${r.memories} recuerdos${r.rooms?.length ? ` · ${r.rooms.length} ${r.rooms.length === 1 ? 'rincón' : 'rincones'}` : ''}`;
    li.append(n, who, what, meta);
    ol.append(li);
  }
}

/* ---------- ajustes y ayuda ---------- */

function saveSettings() {
  store.set('settings', settings);
  game.setOptions({shake: settings.shake, flashes: settings.flashes, weather: settings.weather, numbers: settings.numbers, softDark: settings.softDark});
}

function syncSoundButton() {
  const btn = $('soundButton');
  btn.querySelector('use').setAttribute('href', settings.muted ? '#i-mute' : '#i-sound');
  btn.setAttribute('aria-label', settings.muted ? 'Activar sonido' : 'Silenciar');
  $('optSound').checked = !settings.muted;
}

function setMuted(m) {
  settings.muted = m;
  game.audio.init();
  game.setMuted(m);
  syncSoundButton();
  saveSettings();
}

$('soundButton').addEventListener('click', () => { setMuted(!settings.muted); toast(settings.muted ? 'Sonido apagado' : 'Sonido encendido'); });
$('optSound').addEventListener('change', e => setMuted(!e.target.checked));
$('optVolume').value = Math.round(settings.volume * 100);
$('optVolume').addEventListener('input', e => { settings.volume = Number(e.target.value) / 100; game.setVolume(settings.volume); saveSettings(); });
for (const [id, key] of [['optMusic', 'music'], ['optSfx', 'sfx'], ['optAmb', 'amb']]) {
  $(id).value = Math.round(settings[key] * 100);
  $(id).addEventListener('input', e => { settings[key] = Number(e.target.value) / 100; game.audio.setMix({[key]: settings[key]}); saveSettings(); });
}
for (const [id, key] of [['optShake', 'shake'], ['optFlashes', 'flashes'], ['optWeather', 'weather'], ['optNumbers', 'numbers'], ['optSoftDark', 'softDark']]) {
  $(id).checked = !!settings[key];
  $(id).addEventListener('change', e => { settings[key] = e.target.checked; saveSettings(); });
}
syncSoundButton();

const help = $('helpList');
for (const [term, text] of HELP) {
  const dt = document.createElement('dt'); dt.textContent = term;
  const dd = document.createElement('dd'); dd.textContent = text;
  help.append(dt, dd);
}

$('fullscreenButton').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { toast('Este navegador no permite pantalla completa.'); }
});

/* ---------- diálogos ---------- */

function openDialog(id) {
  const d = $(id);
  if (!d || d.open) return;
  game.audio.sfx('ui-abrir');
  if (game.state === 'running') game.pause();
  if (id === 'albumDialog') renderAlbum();
  if (id === 'recordsDialog') renderRecords();
  d.showModal();
}
document.querySelectorAll('[data-open]').forEach(el => el.addEventListener('click', () => openDialog(el.dataset.open)));
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('close', () => game.audio.sfx('ui-cerrar'));
  d.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => d.close()));
  d.addEventListener('click', e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  });
});

/* ---------- sonidos de la interfaz ---------- */

// Los botones de la noche (esquivar, arrullar, pausa) ya tienen su propio sonido en el juego.
const pressable = el => { const hit = el?.closest?.('button, .card, .cast-card'); return hit && !hit.closest('#hud') ? hit : null; };
let lastFocus = null;
const focusSound = e => {
  const el = pressable(e.target);
  if (!el || el === lastFocus || el.disabled) return;
  lastFocus = el;
  game.audio.sfx('ui-foco');
};
document.addEventListener('pointerover', focusSound);
document.addEventListener('focusin', focusSound);
document.addEventListener('pointerout', e => { if (pressable(e.target) === lastFocus) lastFocus = null; });
document.addEventListener('click', e => { if (pressable(e.target)) game.audio.sfx('ui-elegir'); });

/* ---------- teclado ---------- */

const order = Object.keys(CHARACTERS);
addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]')) return;
  if (e.key === '?') { e.preventDefault(); openDialog('helpDialog'); return; }
  if (game.state === 'upgrade' && ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].includes(e.code)) {
    e.preventDefault();
    const c = choices[Number(e.code.at(-1)) - 1];
    if (c) game.chooseUpgrade(c.id);
    return;
  }
  if (game.state === 'ready') {
    if (['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { selectCharacter(order[Number(e.code.at(-1)) - 1]); return; }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      const i = order.indexOf(selected), next = order[(i + (e.code === 'ArrowRight' ? 1 : order.length - 1)) % order.length];
      selectCharacter(next);
      castEl.querySelector(`[data-character="${next}"]`)?.focus({preventScroll: true});
      return;
    }
    if (e.code === 'Enter' && (document.activeElement === document.body || document.activeElement === $('game'))) { e.preventDefault(); start(); }
  }
});

/* El primer gesto enciende el ambiente del título (los navegadores lo exigen). */
const wake = () => { game.audio.init(); game.setMuted(settings.muted); removeEventListener('pointerdown', wake); removeEventListener('keydown', wake); };
addEventListener('pointerdown', wake);
addEventListener('keydown', wake);

selectCharacter(selected);
onState('ready');
if (params.get('autostart') === '1') {
  const ch = params.get('char');
  if (CHARACTERS[ch]) selectCharacter(ch);
  start();
}
