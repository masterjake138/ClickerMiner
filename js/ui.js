'use strict';

const ui = {
  buyAmount: 1,
  activeTab: 'upgrades',
  counterOpen: new Set(),
  pendingAch: 0,
  upgSig: null, invSig: null, listingsSig: null, offersSig: null, achSig: null,
  listOreSig: null, buffSig: null,
  buildingRows: {},
  invRows: {},
};

/* ---------------- bootstrapping ---------------- */

function initUI(){
  buildBuildingList();
  buildInvList();
  buildAchGrid();
  wireTabs();
  wireBuyAmounts();
  wireListingForm();
  wireSettings();
  wireSaveButtons();
  wireRock();
  wirePrestige();

  document.getElementById('newsText').textContent =
    NEWS_HEADLINES.join('   ✦   ') + '   ✦   ';
}

function buildBuildingList(){
  const list = document.getElementById('buildingList');
  list.innerHTML = BUILDINGS.map(b => `
    <div class="bRow" data-id="${b.id}">
      <div class="bIcon">${b.icon}</div>
      <div class="bMid">
        <div class="bName">${b.name}</div>
        <div class="bEff"></div>
      </div>
      <div class="bRight">
        <div class="bCost"></div>
        <div class="bBuy"></div>
      </div>
      <div class="bCount"></div>
    </div>`).join('');
  list.querySelectorAll('.bRow').forEach(row => {
    const id = row.dataset.id;
    ui.buildingRows[id] = {
      row,
      eff: row.querySelector('.bEff'),
      cost: row.querySelector('.bCost'),
      buy: row.querySelector('.bBuy'),
      count: row.querySelector('.bCount'),
    };
    row.addEventListener('click', () => buyBuilding(id));
  });
}

function buildInvList(){
  const list = document.getElementById('invList');
  list.innerHTML = ORES.map(o => `
    <div class="invRow" data-ore="${o.id}">
      <span class="iIcon">${o.icon}</span>
      <span class="iName">${o.name}</span>
      <span class="iQty" title="In inventory">0</span>
      <span class="iPrice" title="Market price"></span>
      <span class="iBtns">
        <button class="btn small" data-act="sell10">Sell 10%</button>
        <button class="btn small good" data-act="sell">Sell all</button>
        <button class="btn small" data-act="list">List</button>
      </span>
    </div>`).join('');
  list.querySelectorAll('.invRow').forEach(row => {
    const oreId = row.dataset.ore;
    ui.invRows[oreId] = {
      row,
      qty: row.querySelector('.iQty'),
      price: row.querySelector('.iPrice'),
      buttons: row.querySelectorAll('button'),
    };
    row.querySelector('[data-act="sell10"]').addEventListener('click', () => {
      const n = quickSell(oreId, 0.1);
      if (n > 0){ playClickSound(); toast(`Sold 10% for <b>${fmtCash(n)}</b>.`, 'good'); }
      else toast('Nothing to sell.', 'bad');
    });
    row.querySelector('[data-act="sell"]').addEventListener('click', () => {
      const n = quickSell(oreId, 1);
      if (n > 0){ playClickSound(); toast(`Sold ore for <b>${fmtCash(n)}</b>.`, 'good'); }
      else toast('Nothing to sell.', 'bad');
    });
    row.querySelector('[data-act="list"]').addEventListener('click', () => {
      document.getElementById('listOre').value = oreId;
      const have = Math.floor(S.ore[oreId] || 0);
      document.getElementById('listQty').value = have > 0 ? have : 1;
      document.getElementById('listQty').focus();
    });
  });
}

function buildAchGrid(){
  const grid = document.getElementById('achGrid');
  grid.innerHTML = ACHIEVEMENTS.map(a => `
    <div class="ach" data-id="${a.id}">${a.icon}
      <span class="tip"><b>${a.name}</b>${a.desc}</span>
    </div>`).join('');
}

function wireTabs(){
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      ui.activeTab = name;
      document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.pane').forEach(p => p.classList.toggle('hidden', p.id !== 'pane-' + name));
      if (name === 'achievements'){ ui.pendingAch = 0; }
      if (name === 'garden') renderGarden();
      if (name === 'scanner') renderScanner();
      render();
    });
  });
}

function wireBuyAmounts(){
  document.querySelectorAll('.amt').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.buyAmount = btn.dataset.amt === 'max' ? 'max' : parseInt(btn.dataset.amt, 10);
      document.querySelectorAll('.amt').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });
  });
}

function wireListingForm(){
  document.getElementById('listQtyMax').addEventListener('click', () => {
    const oreId = document.getElementById('listOre').value;
    document.getElementById('listQty').value = Math.floor(S.ore[oreId] || 0);
  });
  document.getElementById('postListing').addEventListener('click', () => {
    const oreId = document.getElementById('listOre').value;
    const qty = parseInt(document.getElementById('listQty').value, 10);
    const r = createListing(oreId, qty);
    if (r.ok){
      playClickSound();
      toast(`📋 Listed <b>${fmtInt(qty)} ${ORE_BY_ID[oreId].name}</b> — offers incoming…`, 'good');
    } else {
      toast('⚠ ' + r.why, 'bad');
    }
    render();
  });
}

function wireSettings(){
  const notation = document.getElementById('setNotation');
  notation.value = S.settings.notation;
  notation.addEventListener('change', () => {
    S.settings.notation = notation.value;
    renderAll();
  });
  const sound = document.getElementById('setSound');
  sound.checked = !!S.settings.sound;
  sound.addEventListener('change', () => { S.settings.sound = sound.checked; });
}

function wireSaveButtons(){
  document.getElementById('btnSave').addEventListener('click', () => {
    saveGame();
    toast('💾 Game saved.', 'good');
  });
  document.getElementById('btnExport').addEventListener('click', () => {
    const ta = document.getElementById('saveText');
    ta.value = exportSave();
    ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    toast('📤 Save exported (copied to clipboard).', 'good');
  });
  document.getElementById('btnImport').addEventListener('click', () => {
    const ta = document.getElementById('saveText');
    if (!ta.value.trim()){ toast('Paste a save code first.', 'bad'); return; }
    if (importSave(ta.value)){
      toast('📥 Save imported!', 'gold');
      renderAll();
    } else {
      toast('⚠ That save code is not valid.', 'bad');
    }
  });
  document.getElementById('btnWipe').addEventListener('click', () => {
    if (confirm('Hard reset? EVERYTHING will be deleted — crystals, achievements, all of it.')){
      wipeSave();
      toast('🗑 Save wiped. Fresh cave, fresh start.', 'bad');
    }
  });
}

function wireRock(){
  const rock = document.getElementById('rock');
  rock.addEventListener('click', (ev) => handleRockClick(ev));
  window.addEventListener('keydown', (ev) => {
    if (ev.code !== 'Space') return;
    const tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    ev.preventDefault();
    const rect = rock.getBoundingClientRect();
    handleRockClick({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });
  });
}

function wirePrestige(){
  document.getElementById('prestigeBtn').addEventListener('click', () => doPrestige());
}

/* ---------------- purchases ---------------- */

function buyBuilding(id){
  const qty = ui.buyAmount === 'max' ? maxAffordable(id) : ui.buyAmount;
  if (qty < 1) return;
  const cost = buildingCost(id, qty);
  if (S.cash < cost) return;
  S.cash -= cost;
  S.buildings[id] = (S.buildings[id] || 0) + qty;
  playClickSound();
  render();
}

/* ---------------- toasts ---------------- */

function toast(msg, cls){
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (cls || '');
  el.innerHTML = msg;
  wrap.appendChild(el);
  while (wrap.children.length > 6) wrap.firstChild.remove();
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4100);
}

function markAchDirty(){ ui.pendingAch++; }

/* ---------------- render ---------------- */

function renderAll(){
  ui.upgSig = null; ui.invSig = null; ui.listingsSig = null; ui.offersSig = null;
  ui.achSig = null; ui.listOreSig = null; ui.buffSig = null;
  const sg = document.getElementById('gardenGrid');
  if (sg){ delete sg.dataset.built; delete sg.dataset.sig; }
  const scg = document.getElementById('scanGrid');
  if (scg) delete scg.dataset.sector;
  render();
}

function render(){
  if (!S) return;
  const cpsVal = totalCpsValue();

  // --- header ---
  document.getElementById('statCash').textContent = fmtCash(S.cash);
  document.getElementById('statCps').textContent = fmtRate(cpsVal);
  document.getElementById('statCrystals').textContent = `🔷 ${S.crystals} (+${S.crystals}%)`;
  document.getElementById('statAch').textContent = `+${(0.5 * achievementCount()).toFixed(1)}%`;

  // --- buffs ---
  const buffs = activeBuffList();
  const bsig = buffs.map(b => b.id + Math.ceil((b.endsAt - Date.now()) / 1000)).join('|');
  if (bsig !== ui.buffSig){
    ui.buffSig = bsig;
    document.getElementById('buffBar').innerHTML = buffs.map(b => {
      const def = BUFFS[b.id];
      const secs = Math.max(0, Math.ceil((b.endsAt - Date.now()) / 1000));
      return `<div class="buffIcon" title="${def.name}: ${def.desc}">${def.icon}<span class="bt">${secs}s</span></div>`;
    }).join('');
  }

  // --- rock info ---
  const power = clickPowerUnits();
  const got = allocateOre(power);
  let clickVal = 0;
  for (const id in got) clickVal += got[id] * orePrice(id);
  document.getElementById('clickPowerTxt').textContent = `${fmtInt(power)} ore/click · ${fmtCash(clickVal)}`;
  const hint = document.getElementById('oreHint');
  hint.textContent = S.stats.clicks < 5
    ? 'Click the rock to mine ore!'
    : `${fmtRate(cpsVal)} auto-mined · sell ore in the Trade tab`;

  // --- buildings ---
  for (const b of BUILDINGS){
    const ref = ui.buildingRows[b.id];
    if (!ref) continue;
    const owned = S.buildings[b.id] || 0;
    const visible = owned > 0 || b.id === 'chisel' ||
      (BUILDINGS[BUILDINGS.indexOf(b) - 1] && S.buildings[BUILDINGS[BUILDINGS.indexOf(b) - 1].id] > 0);
    ref.row.classList.toggle('hidden', !visible);
    if (!visible) continue;

    const qty = ui.buyAmount === 'max' ? Math.max(1, maxAffordable(b.id)) : ui.buyAmount;
    const cost = buildingCost(b.id, qty);
    const can = S.cash >= cost && !(ui.buyAmount === 'max' && maxAffordable(b.id) < 1);
    ref.row.classList.toggle('cant', !can);
    ref.count.textContent = owned > 0 ? owned : '';
    ref.cost.textContent = fmtCash(cost);
    ref.buy.textContent = `buy ${qty}`;
    const unitVal = b.rate * buildingMult(b.id) * globalMult() * orePrice(b.ore);
    ref.eff.innerHTML = owned > 0
      ? `${fmtRate(unitVal * owned)} <span class="hint">(${b.rate}×${owned} ${ORE_BY_ID[b.ore].name}/s)</span>`
      : `<span class="hint">${b.rate} ${ORE_BY_ID[b.ore].name}/s · ${fmtRate(unitVal)}</span>`;
    ref.row.title = b.desc;
  }

  // --- upgrades ---
  renderUpgrades();

  // --- trade ---
  renderTrade();

  // --- badges ---
  setBadge('upgBadge', visibleUpgrades().filter(u => S.cash >= u.cost).length);
  setBadge('offerBadge', S.offers.length);
  setBadge('achBadge', ui.pendingAch);

  // --- prestige ---
  const gain = prestigeGain();
  document.getElementById('prestigeInfo').innerHTML =
    `Run earnings: <b>${fmtCash(S.runCash)}</b> · crystals if you descend now: <b>${gain}</b> (+${gain}%)`;
  const pbtn = document.getElementById('prestigeBtn');
  pbtn.disabled = gain < 1;
  pbtn.textContent = gain >= 1 ? `Descend deeper (+${gain} 🔷)` : `Descend deeper (need $100K run earnings)`;

  // --- active pane ---
  if (ui.activeTab === 'garden') renderGarden();
  else if (ui.activeTab === 'scanner') renderScanner();
  else if (ui.activeTab === 'stats') renderStats();

  renderAchievementStates();
}

function setBadge(id, n){
  const el = document.getElementById(id);
  el.textContent = n;
  el.classList.toggle('hidden', n <= 0);
}

function renderUpgrades(){
  const list = visibleUpgrades();
  const sig = list.map(u => u.id + (S.cash >= u.cost ? '1' : '0')).join(',');
  if (sig !== ui.upgSig){
    ui.upgSig = sig;
    const wrap = document.getElementById('upgList');
    if (!list.length){
      wrap.innerHTML = '<div class="empty">No upgrades available yet — keep mining.</div>';
      return;
    }
    wrap.innerHTML = list.map(u => `
      <div class="upg ${S.cash >= u.cost ? '' : 'cant'}" data-id="${u.id}">
        <span class="uIcon">${u.icon}</span>
        <div>
          <div class="uName">${u.name}</div>
          <div class="uDesc">${u.desc}</div>
          <div class="uCost">${fmtCash(u.cost)}</div>
        </div>
      </div>`).join('');
    wrap.querySelectorAll('.upg').forEach(el => {
      el.addEventListener('click', () => {
        if (buyUpgrade(el.dataset.id)){ playClickSound(); render(); }
      });
    });
  }
}

function renderTrade(){
  document.getElementById('quickSellHint').textContent =
    `— quick sell takes a ${S.upgrades.quick_bonus ? '2%' : '5%'} market cut`;

  // listing ore dropdown
  const unlocked = unlockedOreIds().join(',');
  if (unlocked !== ui.listOreSig){
    ui.listOreSig = unlocked;
    const sel = document.getElementById('listOre');
    const prev = sel.value;
    sel.innerHTML = ORES.filter(o => oreUnlocked(o.id))
      .map(o => `<option value="${o.id}">${o.icon} ${o.name}</option>`).join('');
    if (unlocked.split(',').includes(prev)) sel.value = prev;
    const inp = document.getElementById('listQty');
    if (!inp.value || parseInt(inp.value, 10) < 1) inp.value = 100;
  }

  // inventory rows (update in place)
  for (const o of ORES){
    const ref = ui.invRows[o.id];
    if (!ref) continue;
    const unlockedOre = oreUnlocked(o.id);
    ref.row.classList.toggle('lockedOre', !unlockedOre);
    ref.qty.textContent = unlockedOre ? fmtOre(S.ore[o.id] || 0) : '🔒 locked';
    const p = orePrice(o.id);
    const base = o.price;
    let delta = '';
    if (S.prices[o.id] > 1.02) delta = ' <span class="up">▲</span>';
    else if (S.prices[o.id] < 0.98) delta = ' <span class="down">▼</span>';
    ref.price.innerHTML = `${fmtCash(p)}${delta} <span class="hint">@${fmtCash(quickSellRate(o.id))}</span>`;
    const have = (S.ore[o.id] || 0) >= 1;
    ref.buttons.forEach(btn => btn.disabled = !unlockedOre || !have);
  }

  // listings
  const lsig = S.listings.map(l => `${l.id}:${l.ore}:${l.qty}:${l.offerId || '-'}`).join('|');
  if (lsig !== ui.listingsSig){
    ui.listingsSig = lsig;
    const wrap = document.getElementById('listingsList');
    document.getElementById('listingCount').textContent =
      `(${S.listings.length}/${listingSlots()} slots used)`;
    wrap.innerHTML = S.listings.length ? S.listings.map(l => `
      <div class="listing" data-id="${l.id}">
        <div class="lMain">
          <span class="lQty">${fmtInt(l.qty)} ${ORE_BY_ID[l.ore].icon} ${ORE_BY_ID[l.ore].name}</span>
          <div class="lSub">listing #${l.id} · ${l.offerId ? '📨 offer waiting!' : 'waiting for offers…'}</div>
        </div>
        <button class="btn small danger" data-act="cancel">Cancel</button>
      </div>`).join('')
      : '<div class="empty">No active listings.</div>';
    wrap.querySelectorAll('[data-act="cancel"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.closest('.listing').dataset.id, 10);
        cancelListing(id);
        toast('Listing cancelled — ore returned to inventory.', 'bad');
        render();
      });
    });
  }
  // listing countdowns
  document.querySelectorAll('#listingsList .listing').forEach(el => {
    const l = listingById(parseInt(el.dataset.id, 10));
    if (!l) return;
    const sub = el.querySelector('.lSub');
    if (l.offerId) sub.textContent = `listing #${l.id} · 📨 offer waiting!`;
    else {
      const secs = Math.max(0, Math.ceil((l.nextOfferAt - Date.now()) / 1000));
      sub.textContent = `listing #${l.id} · next offer in ~${secs}s`;
    }
  });

  // offers
  const osig = S.offers.map(o => `${o.id}:${Math.round(o.price * 100)}`).join('|');
  if (osig !== ui.offersSig){
    ui.offersSig = osig;
    const wrap = document.getElementById('offersList');
    wrap.innerHTML = S.offers.length ? S.offers.map(o => {
      const d = DISTRIBUTORS[o.dist] || DISTRIBUTORS[0];
      const market = orePrice(o.ore);
      const pct = Math.round((o.price / market - 1) * 100);
      const total = o.qty * o.price;
      const open = ui.counterOpen.has(o.id);
      const suggest = Math.round(o.price * 1.25);
      return `
      <div class="offer" data-id="${o.id}">
        <div class="oTop">
          <span>${d.icon}</span><span class="oName">${d.name}</span>
          <span class="oPrice">${fmtCash(o.price)}/unit</span>
        </div>
        <div class="oSub">
          ${fmtInt(o.qty)} ${ORE_BY_ID[o.ore].icon} ${ORE_BY_ID[o.ore].name} · total <b>${fmtCash(total)}</b>
          · market ${fmtCash(market)} (${pct >= 0 ? '+' : ''}${pct}%)
        </div>
        <div class="oBtns">
          <button class="btn small good" data-act="accept">Confirm sale</button>
          <button class="btn small" data-act="counter">${open ? 'Hide counter' : 'Counter offer'}</button>
          ${open ? `
          <span class="counterBox">
            <input type="number" min="0" step="any" value="${suggest}" data-role="ask">
            <button class="btn small" data-act="send">Send</button>
          </span>
          <span class="hint">instant reply: accept or walk</span>` : ''}
        </div>
      </div>`;
    }).join('')
      : '<div class="empty">No offers right now — post a listing and wait for the knock.</div>';

    wrap.querySelectorAll('.offer').forEach(el => {
      const id = parseInt(el.dataset.id, 10);
      el.querySelector('[data-act="accept"]').addEventListener('click', () => {
        const r = acceptOffer(id);
        if (r){
          playClickSound();
          ui.counterOpen.delete(id);
          toast(`🤝 Sold to ${DISTRIBUTORS[r.offer.dist].name} for <b>${fmtCash(r.earned)}</b>!`, 'good');
          render();
        }
      });
      const counterBtn = el.querySelector('[data-act="counter"]');
      counterBtn.addEventListener('click', () => {
        if (ui.counterOpen.has(id)) ui.counterOpen.delete(id);
        else ui.counterOpen.add(id);
        ui.offersSig = null; // force rebuild
        render();
      });
      const send = el.querySelector('[data-act="send"]');
      if (send) send.addEventListener('click', () => {
        const input = el.querySelector('[data-role="ask"]');
        const ask = parseFloat(input.value);
        if (!(ask > 0)){ toast('Enter a price per unit.', 'bad'); return; }
        const r = counterOffer(id, ask);
        ui.counterOpen.delete(id);
        ui.offersSig = null;
        if (r && r.result === 'accept'){
          playClickSound();
          toast(`🗣️ <b>${DISTRIBUTORS[r.offer.dist].name}</b> accepted your counter — <b>${fmtCash(r.earned)}</b>!`, 'gold');
        } else {
          toast(`🗣️ They laughed and walked away. Listing is back on the market.`, 'bad');
        }
        render();
      });
    });
  }
}

function renderAchievementStates(){
  const sig = achievementCount();
  if (String(sig) !== ui.achSig){
    ui.achSig = String(sig);
    document.getElementById('achProgress').textContent =
      `${sig}/${ACHIEVEMENTS.length} · +${(0.5 * sig).toFixed(1)}% global bonus`;
    document.querySelectorAll('.ach').forEach(el => {
      el.classList.toggle('unlocked', !!S.achievements[el.dataset.id]);
    });
  }
}

function renderStats(){
  const totalMiners = BUILDINGS.reduce((a, b) => a + (S.buildings[b.id] || 0), 0);
  const totalOre = ORES.reduce((a, o) => a + S.mined[o.id], 0);
  const invOre = ORES.reduce((a, o) => a + (S.ore[o.id] || 0), 0);
  const rows = [
    ['Clicks', fmtInt(S.stats.clicks)],
    ['Time played', fmtTime(S.stats.timePlayed)],
    ['This run', fmtTime(S.stats.runTime)],
    ['Cash on hand', fmtCash(S.cash)],
    ['Run earnings', fmtCash(S.runCash)],
    ['Lifetime earnings', fmtCash(S.lifetimeCash)],
    ['Best single sale', fmtCash(S.stats.biggestSale)],
    ['Deep crystals', `${S.crystals} (+${S.crystals}%)`],
    ['Prestiges', fmtInt(S.resets)],
    ['Miners owned', fmtInt(totalMiners)],
    ['Ore in inventory', fmtInt(invOre)],
    ['Ore mined (lifetime)', fmtInt(totalOre)],
    ['Listings posted', fmtInt(S.stats.listingsPosted)],
    ['Listings sold', fmtInt(S.stats.listingsSold)],
    ['Offers accepted', fmtInt(S.stats.offersAccepted)],
    ['Counter-offers won', `${fmtInt(S.stats.countersWon)} / ${fmtInt(S.stats.countersWon + S.stats.countersLost)}`],
    ['Quick-sells', fmtInt(S.stats.quickSells)],
    ['Motherlodes', fmtInt(S.stats.motherlodes)],
    ['Crystals harvested', fmtInt(S.stats.harvests)],
    ['Scanner sectors cleared', fmtInt(S.stats.sectorsCleared)],
    ...ORES.map(o => [`${o.name} mined`, fmtInt(S.mined[o.id])]),
  ];
  document.getElementById('statsList').innerHTML = rows.map(([k, v]) =>
    `<div class="stRow"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
}
