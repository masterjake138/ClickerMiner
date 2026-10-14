'use strict';

// Deep Crystals: sqrt of run earnings per $100K. $100K -> 1, $10M -> 10, $1B -> 100.
function prestigeGain(){
  return Math.floor(Math.sqrt(S.runCash / 1e5));
}

function prestigeCan(){ return prestigeGain() >= 1; }

function doPrestige(){
  const gain = prestigeGain();
  if (gain < 1) return false;
  if (!confirm(`Descend deeper?\n\nYou will lose your cash, miners, upgrades, ore and listings,\nand gain <b>${gain}</b> Deep Crystal${gain === 1 ? '' : 's'} (+${gain}% production & clicking, forever).`)) return false;

  S.crystals += gain;
  S.resets++;
  S.runCash = 0;
  S.cash = 0;
  S.buildings = {};
  BUILDINGS.forEach(b => S.buildings[b.id] = 0);
  S.upgrades = {};
  ORES.forEach(o => { S.ore[o.id] = 0; });
  S.listings = [];
  S.offers = [];
  S.buffs = [];
  S.stats.runTime = 0;
  // garden, scanner, achievements, lifetime stats, crystals & settings persist
  scheduleNextMotherlode();
  toast(`🔻 You descend deeper. <b>+${gain} Deep Crystal${gain === 1 ? '' : 's'}</b>!`, 'gold');
  if (typeof renderAll === 'function') renderAll();
  return true;
}
