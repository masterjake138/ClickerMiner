'use strict';

let _lastFrame = performance.now();
let _renderAcc = 0;
let _achAcc = 0;
let _saveAcc = 0;
let _gardenSigAcc = 0;

function startLoop(){
  _lastFrame = performance.now();
  scheduleNextMotherlode();
  requestAnimationFrame(gameFrame);
}

function gameFrame(now){
  let dt = (now - _lastFrame) / 1000;
  _lastFrame = now;
  if (dt > 1) dt = 1; // tab was backgrounded; production is handled by offline calc on load
  if (dt < 0) dt = 0;

  tick(dt);

  _renderAcc += dt;
  if (_renderAcc >= 0.1){
    _renderAcc = 0;
    render();
  }

  requestAnimationFrame(gameFrame);
}

function tick(dt){
  const now = Date.now();

  // 1. production → inventory
  const cps = cpsByOre();
  for (const o of ORES){
    const amt = cps[o.id] * dt;
    if (amt > 0){
      S.ore[o.id] += amt;
      S.mined[o.id] += amt;
    }
  }

  // 2. timers & events
  S.stats.timePlayed += dt;
  S.stats.runTime += dt;
  tickMarket(dt);
  pruneBuffs();
  tryGenerateOffers(now);
  maybeSpawnMotherlode(now);

  // 3. periodic checks
  _achAcc += dt;
  if (_achAcc >= 0.5){ _achAcc = 0; checkAchievements(); }

  _gardenSigAcc += dt;
  if (_gardenSigAcc >= 1){ _gardenSigAcc = 0; if (ui.activeTab === 'garden') gridSigInvalidate(); }

  _saveAcc += dt;
  if (_saveAcc >= 30){ _saveAcc = 0; saveGame(); }
}
