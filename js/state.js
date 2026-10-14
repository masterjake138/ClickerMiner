'use strict';

let S = null; // the single game state, assigned by save.js

function defaultState(){
  const ore = {}, mined = {}, buildings = {}, prices = {};
  ORES.forEach(o => { ore[o.id] = 0; mined[o.id] = 0; prices[o.id] = 1; });
  BUILDINGS.forEach(b => buildings[b.id] = 0);
  return {
    version: 1,
    cash: 0,
    runCash: 0,          // $ earned since last prestige (prestige basis)
    lifetimeCash: 0,     // $ earned all time
    crystals: 0,         // prestige currency
    resets: 0,
    ore,                  // inventory: {copper: 12.5, ...}
    mined,                // lifetime ore mined per type
    buildings,
    upgrades: {},         // id:true
    achievements: {},     // id:true
    listings: [],         // {id, ore, qty, postedAt, nextOfferAt, offerId}
    offers: [],           // {id, listingId, ore, qty, price, dist (index), createdAt}
    listingSeq: 1,
    offerSeq: 1,
    prices,               // market factor per ore (~1.0, drifts)
    buffs: [],            // {id, kind, mult, endsAt}
    stats: {
      clicks:0, listingsPosted:0, listingsSold:0, offersAccepted:0,
      countersWon:0, countersLost:0, quickSells:0, motherlodes:0,
      harvests:0, sectorsCleared:0, biggestSale:0,
      timePlayed:0, runTime:0,
    },
    garden: { plots: new Array(64).fill(null) },   // {t: oreId, p: plantedAt, c: charged}
    scanner: null,        // {sector, cells:[{v,r,d}], digs, cleared}
    settings: { sound:true, notation:'short' },
    lastTick: Date.now(),
    lastSave: Date.now(),
    seenHelp: {},
  };
}

/* ---------------- unlock & cost helpers ---------------- */

function oreUnlocked(oreId){
  const o = ORE_BY_ID[oreId];
  if (!o) return false;
  if (!o.gateway) return true;
  return (S.buildings[o.gateway] || 0) >= 1;
}

function unlockedOreIds(){ return ORES.filter(o => oreUnlocked(o.id)).map(o => o.id); }

const COST_MULT = 1.15;

function buildingCost(id, qty){
  const b = BUILDING_BY_ID[id];
  const owned = S.buildings[id] || 0;
  if (qty === 'max') qty = maxAffordable(id);
  if (qty <= 0) return 0;
  return b.baseCost * Math.pow(COST_MULT, owned) * (Math.pow(COST_MULT, qty) - 1) / (COST_MULT - 1);
}

function maxAffordable(id){
  const b = BUILDING_BY_ID[id];
  const owned = S.buildings[id] || 0;
  const base = b.baseCost * Math.pow(COST_MULT, owned);
  // n such that base*(1.15^n -1)/0.15 <= cash
  const n = Math.log(1 + S.cash * (COST_MULT - 1) / base) / Math.log(COST_MULT);
  return Math.max(0, Math.floor(n + 1e-9));
}

/* ---------------- multipliers ---------------- */

function achievementCount(){ return Object.keys(S.achievements).length; }

function achievementMult(){ return 1 + 0.005 * achievementCount(); }

function crystalMult(){ return 1 + 0.01 * S.crystals; }

function buffMult(kind){
  let m = 1;
  const now = Date.now();
  for (const b of S.buffs) if (b.kind === kind && b.endsAt > now) m *= b.mult;
  return m;
}

function upgradeSum(type){
  let v = 0;
  for (const u of UPGRADES) if (S.upgrades[u.id] && u.type === type) v += u.value;
  return v;
}

function upgradeProduct(type){
  let v = 1;
  for (const u of UPGRADES) if (S.upgrades[u.id] && u.type === type) v *= u.value;
  return v;
}

// Global multiplier: achievements x crystals x global upgrades x production buffs.
// Applies to BOTH production and clicking.
function globalMult(){
  return achievementMult() * crystalMult() * upgradeProduct('globalMult') * buffMult('prod');
}

function buildingMult(id){
  let m = 1;
  for (const u of UPGRADES) {
    if (S.upgrades[u.id] && u.type === 'buildingMult' && u.building === id) m *= u.value;
  }
  return m;
}

/* ---------------- production ---------------- */

function cpsByOre(){
  const out = {};
  ORES.forEach(o => out[o.id] = 0);
  const g = globalMult();
  for (const b of BUILDINGS){
    const n = S.buildings[b.id] || 0;
    if (!n) continue;
    out[b.ore] += n * b.rate * buildingMult(b.id) * g;
  }
  return out;
}

function totalCpsValue(){
  const cps = cpsByOre();
  let v = 0;
  for (const o of ORES) v += cps[o.id] * orePrice(o.id);
  return v;
}

function clickPowerUnits(){
  const raw = (1 + upgradeSum('clickAdd')) * upgradeProduct('clickMult') * globalMult() * buffMult('click');
  return Math.max(1, Math.round(raw));
}

function offlineCapHours(){
  let h = 2;
  for (const u of UPGRADES) if (S.upgrades[u.id] && u.type === 'offlineHours') h = Math.max(h, u.value);
  return h;
}

function listingSlots(){ return 4 + upgradeSum('listingSlots'); }

/* ---------------- buffs ---------------- */

function addBuff(typeId, durationSec){
  const def = BUFFS[typeId];
  if (!def) return;
  const now = Date.now();
  const existing = S.buffs.find(b => b.id === typeId);
  if (existing) existing.endsAt = now + durationSec * 1000; // refresh, don't stack
  else S.buffs.push({ id: typeId, kind: def.kind, mult: def.mult, endsAt: now + durationSec * 1000 });
}

function pruneBuffs(){
  const now = Date.now();
  S.buffs = S.buffs.filter(b => b.endsAt > now);
}

function activeBuffList(){
  const now = Date.now();
  return S.buffs.filter(b => b.endsAt > now);
}
