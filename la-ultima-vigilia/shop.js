/*
 * Entre ronda y ronda: los recuerdos que se eligen al subir de nivel, las
 * ofrendas que se abren y el puesto de Remedios. Las reglas viven aquí; la
 * interfaz solo pinta lo que devuelven los snapshots y llama a estas acciones.
 */
import { pick } from './util.js';
import { ECONOMY, RARITY, PLAYER } from './balance.js';
import { WEAPONS, WEAPON } from './arsenal.js';
import { ITEMS, ITEM, UPGRADES } from './items.js';
import { SHOPKEEPER, HOURS } from './story.js';
import { STAT } from './stats.js';

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const shopMethods = {
  /* Qué rareza sale: las altas se tiran primero. round puede ser una ronda «equivalente». */
  rarityRoll(round, bonus = 0) {
    const luck = 1 + Math.max(-90, this.st.luck) / 100;
    for (let t = 3; t >= 1; t--) {
      const R = RARITY[t];
      if (round < R.from) continue;
      const p = Math.min(R.max, R.start + (round - R.from) * R.step) * luck;
      if (Math.random() < p) return Math.min(3, t + bonus);
    }
    return Math.min(3, bonus);
  },

  priceGrowth() { return 1 + ECONOMY.priceGrowth * (this.run.round); },

  priceOf(kind, id, tier) {
    const base = kind === 'weapon' ? ECONOMY.weaponBase[tier] * (WEAPON[id]?.priceMul || 1) : ECONOMY.itemBase[tier] * (ITEM[id]?.priceMul || 1);
    return Math.max(1, Math.round(base * this.priceGrowth() * (1 - this.sp.discount)));
  },

  itemCount(id) { return this.run.items[id] || 0; },
  itemAvailable(it) { return !it.max || this.itemCount(it.id) < it.max; },

  /* ---------- recuerdos (subir de nivel) ---------- */

  rollUpgrades() {
    const level = this.run.level - this.run.pending + 1;
    const stats = shuffled(UPGRADES).slice(0, 4);
    this.choices = stats.map(u => {
      const tier = this.rarityRoll(1 + level * 0.8);
      return {stat: u.stat, name: u.name, icon: u.icon, tier, value: u.values[tier], label: STAT[u.stat].name, pct: !!STAT[u.stat].pct};
    });
  },

  upgradeRerollCost() {
    const [base, per] = ECONOMY.upgradeReroll;
    return Math.round(base + this.run.level * per * 0.5 + this.upgradeRerolls * Math.max(1, Math.floor(this.run.level / 4)));
  },

  openLevelUp() {
    this.upgradeRerolls = 0;
    this.rollUpgrades();
    this.setState('levelup');
    this.audio.sfx('recuerdo');
    if (this.bot) { this.chooseUpgrade(this.botUpgrade()); return; }
    this.hooks.onLevelUp?.(this.levelSnapshot());
  },

  levelSnapshot() {
    return {level: this.run.level - this.run.pending + 1, pending: this.run.pending, choices: this.choices.map(c => ({...c})),
      rerollCost: this.upgradeRerollCost(), cera: this.run.cera, stats: {...this.st}};
  },

  chooseUpgrade(index) {
    if (this.state !== 'levelup') return false;
    const c = this.choices[index];
    if (!c) return false;
    this.run.bonus[c.stat] += c.value;
    this.run.pending = Math.max(0, this.run.pending - 1);
    this.computeStats();
    this.audio.sfx('elegir', {tier: c.tier});
    this.choices = [];
    this.emitStats();
    this.nextScreen();
    return true;
  },

  rerollUpgrades() {
    if (this.state !== 'levelup') return false;
    const cost = this.upgradeRerollCost();
    if (this.run.cera < cost) { this.audio.sfx('sinCera'); return false; }
    this.run.cera -= cost;
    this.upgradeRerolls++;
    this.rollUpgrades();
    this.audio.sfx('tirada');
    this.hooks.onLevelUp?.(this.levelSnapshot());
    return true;
  },

  /* ---------- ofrendas ---------- */

  rollItem(tier) {
    for (let t = tier; t >= 0; t--) {
      const pool = ITEMS.filter(it => it.rarity === t && this.itemAvailable(it));
      if (pool.length) return pick(pool);
    }
    return ITEMS[0];
  },

  openCrate() {
    const c = this.run.crates.shift();
    const tier = Math.max(c.rarity || 0, this.rarityRoll(this.run.round + 4));
    const it = this.rollItem(tier);
    this.crate = {id: it.id, tier: it.rarity, sell: Math.max(1, Math.round(this.priceOf('item', it.id, it.rarity) * 0.5)), remaining: this.run.crates.length};
    this.setState('crate');
    this.audio.sfx('ofrendaAbre', {tier: it.rarity});
    if (this.bot) { this.takeCrate(); return; }
    this.hooks.onCrate?.({...this.crate});
  },

  takeCrate() {
    if (this.state !== 'crate' || !this.crate) return false;
    this.addItem(this.crate.id);
    this.crate = null;
    this.nextScreen();
    return true;
  },

  sellCrate() {
    if (this.state !== 'crate' || !this.crate) return false;
    this.run.cera += this.crate.sell;
    this.audio.sfx('venta');
    this.crate = null;
    this.nextScreen();
    return true;
  },

  /* ---------- el puesto de Remedios ---------- */

  /* Una oferta nueva. Las armas que ya llevas salen más, para poder juntarlas. */
  rollOffer() {
    const R = this.run.round + 1;
    const tier = this.rarityRoll(R);
    const weaponRoll = Math.random() < (this.run.weapons.length < 3 ? 0.45 : 0.32);
    if (weaponRoll) {
      const owned = this.run.weapons.map(w => w.id);
      const id = owned.length && Math.random() < 0.4 ? pick(owned) : pick(WEAPONS).id;
      const wt = Math.min(3, tier);
      return {kind: 'weapon', id, tier: wt, price: this.priceOf('weapon', id, wt), locked: false, sold: false};
    }
    const it = this.rollItem(tier);
    return {kind: 'item', id: it.id, tier: it.rarity, price: this.priceOf('item', it.id, it.rarity), locked: false, sold: false};
  },

  fillOffers() {
    const kept = this.offers.filter(o => o.locked && !o.sold);
    const out = [...kept];
    let guard = 0;
    while (out.length < 4 && guard++ < 40) {
      const o = this.rollOffer();
      if (out.some(x => x.kind === o.kind && x.id === o.id && x.tier === o.tier)) continue;
      out.push(o);
    }
    // Lo que se guardó con candado se vuelve a poner a precio de hoy.
    for (const o of out) o.price = this.priceOf(o.kind, o.id, o.tier);
    this.offers = out;
  },

  openShop(resume = false) {
    const run = this.run;
    if (!resume) {
      run.shopVisits++;
      this.offers = (run.lockedOffers || []).map(o => ({...o, sold: false}));
      run.lockedOffers = [];
      this.rerolls = 0;
      this.fillOffers();
    }
    this.freeRerolls = this.sp.freeReroll;
    const hour = Math.min(5, Math.floor((run.round) / 3));
    this.shopLine = (hour > 0 && run.round % 3 === 0 ? SHOPKEEPER.hour[hour] : '') || pick(SHOPKEEPER.greet);
    this.setState('shop');
    this.audio.sfx('tienda');
    this.hooks.onSave?.(this.saveData());
    if (this.bot) { this.botShop(); return; }
    this.emitShop();
  },

  rerollCost() {
    if (this.freeRerolls > 0) return 0;
    const R = this.run.round + 1;
    return Math.round(ECONOMY.rerollBase + Math.floor(R * ECONOMY.rerollPerRound) + this.rerolls * Math.max(ECONOMY.rerollStep, Math.floor(R / 3)));
  },

  rerollShop() {
    if (this.state !== 'shop') return false;
    const cost = this.rerollCost();
    if (this.run.cera < cost) { this.shopLine = pick(SHOPKEEPER.poor); this.audio.sfx('sinCera'); this.emitShop(); return false; }
    if (this.freeRerolls > 0) this.freeRerolls--;
    else { this.run.cera -= cost; this.rerolls++; }
    this.fillOffers();
    this.shopLine = pick(SHOPKEEPER.reroll);
    this.audio.sfx('tirada');
    this.emitShop();
    return true;
  },

  toggleLock(i) {
    const o = this.offers[i];
    if (this.state !== 'shop' || !o || o.sold) return false;
    o.locked = !o.locked;
    this.audio.sfx(o.locked ? 'candado' : 'candadoAbre');
    this.emitShop();
    return true;
  },

  /* ¿Se puede comprar? Con seis armas solo si se junta con una igual. */
  canBuy(o) {
    if (!o || o.sold) return {ok: false, reason: 'Vendido'};
    if (this.run.cera < o.price) return {ok: false, reason: 'Falta cera'};
    if (o.kind === 'weapon' && this.run.weapons.length >= PLAYER.maxWeapons) {
      const twin = this.run.weapons.find(w => w.id === o.id && w.tier === o.tier && w.tier < 3);
      if (!twin) return {ok: false, reason: 'Sin hueco'};
      return {ok: true, combine: true};
    }
    if (o.kind === 'item' && !this.itemAvailable(ITEM[o.id])) return {ok: false, reason: 'Ya tienes bastantes'};
    return {ok: true};
  },

  buy(i) {
    if (this.state !== 'shop') return false;
    const o = this.offers[i], check = this.canBuy(o);
    if (!check.ok) {
      if (check.reason === 'Falta cera') { this.shopLine = pick(SHOPKEEPER.poor); this.audio.sfx('sinCera'); this.emitShop(); }
      return false;
    }
    this.run.cera = Math.round((this.run.cera - o.price) * 10) / 10;
    o.sold = true; o.locked = false;
    if (o.kind === 'weapon') {
      if (check.combine) {
        const twin = this.run.weapons.find(w => w.id === o.id && w.tier === o.tier);
        twin.tier++;
        this.computeStats();
        this.audio.sfx('juntar');
        this.shopLine = pick(SHOPKEEPER.combine);
      } else {
        this.addWeapon(o.id, o.tier);
        this.audio.sfx('compra');
        this.shopLine = pick(SHOPKEEPER.buy);
      }
      this.hooks.onDiscover?.({kind: 'weapon', id: o.id});
    } else {
      this.addItem(o.id);
      this.shopLine = pick(SHOPKEEPER.buy);
    }
    this.emitShop();
    return true;
  },

  sellValue(w) { return Math.max(1, Math.round(this.priceOf('weapon', w.id, w.tier) * ECONOMY.sellRate)); },

  sellWeapon(uid) {
    if (this.state !== 'shop') return false;
    const i = this.run.weapons.findIndex(w => w.uid === uid);
    if (i < 0 || this.run.weapons.length <= 1) return false;
    const w = this.run.weapons[i];
    this.run.cera += this.sellValue(w);
    this.run.weapons.splice(i, 1);
    this.computeStats();
    this.audio.sfx('venta');
    this.shopLine = pick(SHOPKEEPER.sell);
    this.emitShop();
    return true;
  },

  combinable(uid) {
    const w = this.run.weapons.find(x => x.uid === uid);
    if (!w || w.tier >= 3) return null;
    return this.run.weapons.find(x => x !== w && x.id === w.id && x.tier === w.tier) || null;
  },

  combineWeapon(uid) {
    if (this.state !== 'shop') return false;
    const w = this.run.weapons.find(x => x.uid === uid), twin = this.combinable(uid);
    if (!w || !twin) return false;
    this.run.weapons.splice(this.run.weapons.indexOf(twin), 1);
    w.tier++;
    this.computeStats();
    this.audio.sfx('juntar');
    this.shopLine = pick(SHOPKEEPER.combine);
    this.emitShop();
    return true;
  },

  shopSnapshot() {
    const run = this.run;
    return {round: run.round, next: run.round + 1, cera: run.cera, melt: run.melt, line: this.shopLine, speaker: SHOPKEEPER.name,
      hour: HOURS[Math.min(5, Math.floor(run.round / 3))].mood, harvest: Math.round(this.d.harvest), lastHarvest: this.lastHarvest || 0,
      rerollCost: this.rerollCost(), freeRerolls: this.freeRerolls,
      offers: this.offers.map(o => ({...o, ...this.canBuy(o)})),
      weapons: run.weapons.map(w => ({uid: w.uid, id: w.id, tier: w.tier, sell: this.sellValue(w), combine: !!this.combinable(w.uid),
        damage: Math.round(this.weaponDamage(w)), cooldown: this.weaponCooldown(w), range: Math.round(this.weaponRange(w)), crit: this.weaponCrit(w)})),
      items: {...run.items}, stats: {...this.st}, classes: {...this.classCounts}, level: run.level, maxWeapons: PLAYER.maxWeapons,
      canSell: run.weapons.length > 1};
  },

  emitShop() {
    this.hooks.onShop?.(this.shopSnapshot());
    this.emitStats();
  }
};
