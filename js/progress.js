'use strict';

function checkAchievements(){
  let unlockedAny = false;
  for (const a of ACHIEVEMENTS){
    if (S.achievements[a.id]) continue;
    let hit = false;
    try{ hit = a.check(S); }catch(e){ hit = false; }
    if (hit){
      S.achievements[a.id] = true;
      unlockedAny = true;
      toast(`🏅 Achievement: <b>${a.name}</b> — ${a.desc}<br><span class="hint">+0.5% production &amp; clicking</span>`, 'good');
      if (typeof markAchDirty === 'function') markAchDirty();
    }
  }
  return unlockedAny;
}

function upgradeReqMet(u){
  const r = u.req || {};
  if (r.clicks && S.stats.clicks < r.clicks) return false;
  if (r.lifetimeCash && S.lifetimeCash < r.lifetimeCash) return false;
  if (r.buildings){
    for (const id in r.buildings) if ((S.buildings[id] || 0) < r.buildings[id]) return false;
  }
  if (r.stats){
    for (const k in r.stats) if ((S.stats[k] || 0) < r.stats[k]) return false;
  }
  return true;
}

function buyUpgrade(id){
  const u = UPGRADE_BY_ID[id];
  if (!u || S.upgrades[id]) return false;
  if (!upgradeReqMet(u)) return false;
  if (S.cash < u.cost) return false;
  S.cash -= u.cost;
  S.upgrades[id] = true;
  toast(`⬆️ Upgrade: <b>${u.name}</b> — ${u.desc}`, 'gold');
  return true;
}

// Upgrades the player can currently see (requirement met, not yet bought).
function visibleUpgrades(){
  return UPGRADES.filter(u => !S.upgrades[u.id] && upgradeReqMet(u));
}
