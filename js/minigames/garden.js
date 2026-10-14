'use strict';

/* Crystal Garden — 8x8 geode bed.
   Plot states: null (empty) | {ch:true} (empty & charged) | {t,p,fast} (growing)
   A growing plot is mature when elapsed >= growTime / fast. */

function gardenUnlocked(){ return (S.buildings.geode || 0) >= 1; }

function gardenGrowMs(oreId){ return ORE_BY_ID[oreId].seedGrow * 1000; }

function gardenStage(plot, now){
  if (!plot || !plot.t) return -1;
  const grow = gardenGrowMs(plot.t) / (plot.fast || 1);
  const elapsed = now - plot.p;
  if (elapsed >= grow) return 3;
  if (elapsed >= grow * 0.55) return 2;
  if (elapsed >= grow * 0.25) return 1;
  return 0;
}

function gardenProgress(plot, now){
  if (!plot || !plot.t) return 0;
  const grow = gardenGrowMs(plot.t) / (plot.fast || 1);
  return Math.min(1, (now - plot.p) / grow);
}

function gardenNeighbors(i){
  const r = Math.floor(i / 8), c = i % 8;
  const out = [];
  if (r > 0) out.push(i - 8);
  if (r < 7) out.push(i + 8);
  if (c > 0) out.push(i - 1);
  if (c < 7) out.push(i + 1);
  return out;
}

function gardenClusterBonus(i){
  const plot = S.garden.plots[i];
  if (!plot || !plot.t) return false;
  const now = Date.now();
  let n = 0;
  for (const j of gardenNeighbors(i)){
    const np = S.garden.plots[j];
    if (np && np.t === plot.t && gardenStage(np, now) === 3) n++;
  }
  return n >= 3; // 3+ mature neighbours of the same type = cluster x2
}

function plantGarden(i, oreId){
  const plot = S.garden.plots[i];
  if (plot && plot.t) return { ok:false, why:'Plot is occupied.' };
  if (!oreUnlocked(oreId)) return { ok:false, why:'Seed not unlocked.' };
  const cost = ORE_BY_ID[oreId].seedCost;
  if (S.cash < cost) return { ok:false, why:'Not enough cash.' };
  S.cash -= cost;
  S.garden.plots[i] = { t: oreId, p: Date.now(), fast: plot && plot.ch ? 2 : 1 };
  return { ok:true, charged: !!(plot && plot.ch) };
}

function harvestGarden(i){
  const plot = S.garden.plots[i];
  if (!plot || !plot.t) return { ok:false };
  const now = Date.now();
  if (gardenStage(plot, now) !== 3) return { ok:false, why:'Not ripe yet.' };
  const cluster = gardenClusterBonus(i);
  let yieldUnits = ORE_BY_ID[plot.t].seedYield * (cluster ? 2 : 1);
  yieldUnits = Math.round(yieldUnits);
  S.ore[plot.t] += yieldUnits;
  S.mined[plot.t] += yieldUnits;
  S.stats.harvests++;

  // charged plot 15% of the time: next plant there grows 2x faster
  const charged = Math.random() < 0.15;
  S.garden.plots[i] = charged ? { ch:true } : null;

  // 12% chance of a bonus buff
  let buff = null;
  if (Math.random() < 0.12){
    buff = Math.random() < 0.5 ? 'mineFrenzy' : 'steadyHand';
    addBuff(buff, BUFFS[buff].dur);
  }
  return { ok:true, ore:plot.t, qty:yieldUnits, cluster, charged, buff };
}

function selectedSeed(){
  return (S.garden && S.garden.sel) || 'copper';
}

function renderGarden(){
  const unlocked = gardenUnlocked();
  document.getElementById('gardenLocked').classList.toggle('hidden', unlocked);
  document.getElementById('gardenMain').classList.toggle('hidden', !unlocked);
  if (!unlocked) return;

  const now = Date.now();
  const sel = oreUnlocked(selectedSeed()) ? selectedSeed() : 'copper';
  S.garden.sel = sel;

  // seed picker
  const picker = document.getElementById('seedPicker');
  if (picker.dataset.built !== '1'){
    picker.innerHTML = ORES.map(o => `
      <div class="seed" data-seed="${o.id}">
        <span class="sIcon">${o.icon}</span>
        ${o.name}
        <div class="sCost">${fmtCash(o.seedCost)} · ${fmtTime(o.seedGrow)}</div>
        <div class="hint">yields ${fmtInt(o.seedYield)}</div>
      </div>`).join('');
    picker.dataset.built = '1';
    picker.querySelectorAll('.seed').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.seed;
        if (!oreUnlocked(id)) return;
        S.garden.sel = id;
        renderGarden();
      });
    });
  }
  picker.querySelectorAll('.seed').forEach(el => {
    const id = el.dataset.seed;
    el.classList.toggle('active', id === sel);
    el.classList.toggle('locked', !oreUnlocked(id));
  });

  // grid
  const grid = document.getElementById('gardenGrid');
  if (!grid.dataset.built || grid.dataset.sig !== plotSignature()){
    if (!grid.dataset.built){
      grid.innerHTML = S.garden.plots.map((_, i) => `<div class="gplot" data-i="${i}"></div>`).join('');
      grid.dataset.built = '1';
      grid.querySelectorAll('.gplot').forEach(el => {
        el.addEventListener('click', () => onPlotClick(parseInt(el.dataset.i, 10)));
      });
    }
    grid.dataset.sig = plotSignature();
    // full state refresh
    grid.querySelectorAll('.gplot').forEach(el => {
      const i = parseInt(el.dataset.i, 10);
      const plot = S.garden.plots[i];
      const stage = gardenStage(plot, now);
      el.classList.toggle('mature', stage === 3);
      el.classList.toggle('charged', !!(plot && plot.ch));
      let inner = '';
      if (plot && plot.ch) inner = '⚡';
      else if (plot && plot.t){
        if (stage === 3) inner = ORE_BY_ID[plot.t].icon;
        else if (stage === 2) inner = '🌿';
        else if (stage === 1) inner = '🌱';
        else inner = '🫘';
        if (stage < 3) inner += `<span class="growBar"><i style="width:${Math.round(gardenProgress(plot, now) * 100)}%"></i></span>`;
      } else inner = '';
      el.innerHTML = inner;
      el.title = plot && plot.t
        ? (stage === 3 ? 'Ripe! Click to harvest' : `${ORE_BY_ID[plot.t].name} — ${Math.round(gardenProgress(plot, now) * 100)}% grown`)
        : (plot && plot.ch ? 'Charged plot: next seed grows 2x faster!' : 'Empty plot');
    });
  }
}

function plotSignature(){
  const now = Date.now();
  return S.garden.plots.map(p => {
    if (!p) return '0';
    if (p.ch) return 'c';
    return gardenStage(p, now);
  }).join('');
}

function onPlotClick(i){
  const plot = S.garden.plots[i];
  const now = Date.now();
  const info = document.getElementById('gardenInfo');

  if (plot && plot.t){
    if (gardenStage(plot, now) === 3){
      const r = harvestGarden(i);
      if (r.ok){
        playClickSound();
        let msg = `Harvested <b>${fmtInt(r.qty)} ${ORE_BY_ID[r.ore].name}</b>!`;
        if (r.cluster) msg += ' <b>Cluster bonus x2!</b>';
        if (r.charged) msg += ' ⚡Plot charged!';
        if (r.buff) msg += ` ${BUFFS[r.buff].icon} <b>${BUFFS[r.buff].name}</b>!`;
        toast(msg, 'good');
      }
    } else {
      info.textContent = `${ORE_BY_ID[plot.t].name} is still growing — ${Math.round(gardenProgress(plot, now) * 100)}%`;
    }
    renderGarden();
    gridSigInvalidate();
    return;
  }

  // empty (possibly charged) → plant selected seed
  const r = plantGarden(i, selectedSeed());
  if (r.ok){
    playClickSound();
    info.textContent = r.charged ? '⚡ Charged plot! This crystal grows 2x faster.' : `Planted ${ORE_BY_ID[selectedSeed()].name}.`;
  } else {
    info.textContent = '⚠ ' + r.why;
  }
  gridSigInvalidate();
  renderGarden();
}

function gridSigInvalidate(){
  const grid = document.getElementById('gardenGrid');
  if (grid) delete grid.dataset.sig;
}
