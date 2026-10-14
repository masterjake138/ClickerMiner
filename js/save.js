'use strict';

const SAVE_KEY = 'openClickerSave';

// localStorage can be blocked on file:// in some browsers — detect once and warn the player.
let storageOK = true;
function checkStorage(){
  try{
    localStorage.setItem('__octest', '1');
    localStorage.removeItem('__octest');
    storageOK = true;
  }catch(e){ storageOK = false; }
  return storageOK;
}

function saveGame(){
  if (!S) return;
  try{
    S.lastSave = Date.now();
    S.lastTick = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  }catch(e){ console.warn('Save failed', e); }
}

function hasSave(){
  try{ return !!localStorage.getItem(SAVE_KEY); }catch(e){ return false; }
}

// Returns an offline report {dt, ore:{id:amount}, value} or null.
function loadGame(){
  let raw = null;
  try{ raw = localStorage.getItem(SAVE_KEY); }catch(e){}
  let loaded = false;
  if (raw){
    try{
      const data = JSON.parse(raw);
      S = migrateState(data);
      loaded = true;
    }catch(e){ console.warn('Corrupt save, starting fresh', e); }
  }
  if (!loaded) S = defaultState();

  // offline production
  let report = null;
  const now = Date.now();
  const dt = (now - (S.lastTick || now)) / 1000;
  if (loaded && dt > 60) report = applyAwayProduction(dt);
  // offers shouldn't burst on login; push pending ones a few seconds out
  const floor = now + 5000;
  for (const l of S.listings) if (l.nextOfferAt < floor) l.nextOfferAt = floor;
  // drop expired buffs
  pruneBuffs();
  S.lastTick = now;
  return report;
}

// Grant production for `dt` seconds of absence (capped by offline upgrade).
// Returns a report {dt, applied, capped, ore:{}, value} or null if nothing earned.
function applyAwayProduction(dt){
  if (dt <= 60) return null;
  const cap = offlineCapHours() * 3600;
  const applied = Math.min(dt, cap);
  const cps = cpsByOre();
  const gained = {};
  let value = 0;
  for (const o of ORES){
    const amt = cps[o.id] * applied;
    if (amt > 0){
      S.ore[o.id] += amt;
      S.mined[o.id] += amt;
      gained[o.id] = amt;
      value += amt * orePrice(o.id);
    }
  }
  return { dt, applied, capped: applied < dt, ore: gained, value };
}

function migrateState(data){
  const base = defaultState();
  const s = Object.assign(base, data);
  // deep-ish merges for safety
  s.settings = Object.assign({ sound:true, notation:'short' }, data.settings || {});
  s.stats = Object.assign(base.stats, data.stats || {});
  s.garden = data.garden && Array.isArray(data.garden.plots) ? data.garden : base.garden;
  ORES.forEach(o => {
    if (typeof s.ore[o.id] !== 'number') s.ore[o.id] = 0;
    if (typeof s.mined[o.id] !== 'number') s.mined[o.id] = 0;
    if (typeof s.prices[o.id] !== 'number') s.prices[o.id] = 1;
  });
  BUILDINGS.forEach(b => { if (typeof s.buildings[b.id] !== 'number') s.buildings[b.id] = 0; });
  s.listings = Array.isArray(s.listings) ? s.listings : [];
  s.offers = Array.isArray(s.offers) ? s.offers : [];
  s.buffs = Array.isArray(s.buffs) ? s.buffs : [];
  return s;
}

function exportSave(){
  saveGame();
  try{
    return btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  }catch(e){ return ''; }
}

function importSave(code){
  try{
    const json = decodeURIComponent(escape(atob(code.trim())));
    const data = JSON.parse(json);
    S = migrateState(data);
    pruneBuffs();
    S.lastTick = Date.now();
    saveGame();
    if (typeof renderAll === 'function') renderAll();
    return true;
  }catch(e){
    console.warn('Import failed', e);
    return false;
  }
}

function wipeSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  S = defaultState();
  scheduleNextMotherlode();
  if (typeof renderAll === 'function') renderAll();
}

function showOfflineModal(report){
  const box = document.getElementById('modalBox');
  const lines = Object.keys(report.ore)
    .filter(k => report.ore[k] > 0.5)
    .map(k => `<div class="oline"><span>${ORE_BY_ID[k].icon} ${ORE_BY_ID[k].name} mined</span><span>${fmtOre(report.ore[k])}</span></div>`)
    .join('');
  box.innerHTML = `
    <h2>While you were away…</h2>
    <p class="hint">Your miners worked for ${fmtTime(report.applied)}${report.capped ? ' (offline cap reached)' : ''}.</p>
    ${lines || '<div class="oline"><span>Nothing was mined — your miners are on strike.</span></div>'}
    <div class="oline total"><span>Ore value at market</span><span>${fmtCash(report.value)}</span></div>
    <button class="btn good" id="modalClose" style="width:100%">Back to the caves</button>`;
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('modalClose').addEventListener('click', () => {
    document.getElementById('modalOverlay').classList.add('hidden');
  });
}
