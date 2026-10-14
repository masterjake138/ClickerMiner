'use strict';

/* Seam Scanner — minesweeper-lite.
   Hidden grid of ore veins. Scans are FREE and reveal how many veins touch the cell.
   Digs cost cash and reveal a hidden cell: strike a vein for ore + cash, or hit nothing.
   cell: {v:vein bool, st:0 hidden | 1 scanned | 2 vein extracted | 3 miss} */

const SCAN_SIZE = 64;

function scannerUnlocked(){ return (S.buildings.deepbore || 0) >= 1; }

function scannerDigCost(sector){ return 1e9 * Math.pow(2, sector - 1); }

function scannerVeinCount(sector){ return Math.min(10 + sector - 1, 22); }

function initScanner(sector){
  const n = scannerVeinCount(sector);
  const cells = [];
  for (let i = 0; i < SCAN_SIZE; i++) cells.push({ v:false, st:0 });
  let placed = 0;
  while (placed < n){
    const i = Math.floor(Math.random() * SCAN_SIZE);
    if (!cells[i].v){ cells[i].v = true; placed++; }
  }
  S.scanner = { sector, cells, digs:0, startedCash:S.cash };
}

function ensureScanner(){
  if (!S.scanner) initScanner(1);
}

function scanNeighbors(i){
  const r = Math.floor(i / 8), c = i % 8;
  const out = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++){
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) out.push(nr * 8 + nc);
    }
  return out;
}

function scanAdjacentVeins(i){
  return scanNeighbors(i).filter(j => S.scanner.cells[j].v).length;
}

function scanCell(i){
  ensureScanner();
  const cell = S.scanner.cells[i];
  if (cell.st !== 0) return { ok:false };
  cell.st = 1;
  const count = scanAdjacentVeins(i);
  // flood-fill zeros so clean areas open up (still free, like minesweeper)
  if (count === 0){
    const queue = [i], seen = new Set([i]);
    while (queue.length){
      const cur = queue.shift();
      S.scanner.cells[cur].st = 1;
      for (const j of scanNeighbors(cur)){
        if (seen.has(j)) continue;
        seen.add(j);
        const jc = S.scanner.cells[j];
        if (jc.st !== 0) continue;
        const jcCount = scanAdjacentVeins(j);
        jc.st = 1;
        if (jcCount === 0) queue.push(j);
      }
    }
  }
  return { ok:true, count };
}

function digYield(sector){
  const cost = scannerDigCost(sector);
  const cash = cost * (1.5 + Math.random() * 3.5);
  const best = unlockedOreIds().slice(-1)[0] || 'copper';
  const oreUnits = Math.max(1, Math.round(cost * 0.1 / ORE_BY_ID[best].price));
  return { cash, ore:best, oreUnits };
}

function digCell(i){
  ensureScanner();
  const sc = S.scanner;
  const cell = sc.cells[i];
  if (cell.st !== 0) return { ok:false };
  const cost = scannerDigCost(sc.sector);
  if (S.cash < cost) return { ok:false, why:'Not enough cash to dig.' };
  S.cash -= cost;
  sc.digs++;

  if (cell.v){
    cell.st = 2;
    const y = digYield(sc.sector);
    earnCash(y.cash);
    S.ore[y.ore] += y.oreUnits;
    S.mined[y.ore] += y.oreUnits;
    const cleared = scannerAllVeinsDug();
    let bonus = 0;
    if (cleared && !sc.doneNotified){
      sc.doneNotified = true;
      bonus = cost * 10;
      earnCash(bonus);
      S.stats.sectorsCleared++;
    }
    return { ok:true, hit:true, yield:y, cleared, bonus, cost };
  } else {
    cell.st = 3;
    return { ok:true, hit:false, cost };
  }
}

function scannerAllVeinsDug(){
  return S.scanner.cells.every(c => !c.v || c.st === 2);
}

function nextSector(){
  if (!S.scanner || !scannerAllVeinsDug()) return false;
  initScanner(S.scanner.sector + 1);
  return true;
}

function renderScanner(){
  const unlocked = scannerUnlocked();
  document.getElementById('scannerLocked').classList.toggle('hidden', unlocked);
  document.getElementById('scannerMain').classList.toggle('hidden', !unlocked);
  if (!unlocked) return;
  ensureScanner();

  const sc = S.scanner;
  const cost = scannerDigCost(sc.sector);
  const left = sc.cells.filter(c => c.v && c.st !== 2).length;
  const total = sc.cells.filter(c => c.v).length;
  document.getElementById('scanHeader').innerHTML = `
    <span>Sector <b>#${sc.sector}</b></span>
    <span>Dig cost: <b>${fmtCash(cost)}</b></span>
    <span>Veins left: <b>${left}/${total}</b></span>
    <span class="hint">free scan = number of touching veins</span>`;

  const grid = document.getElementById('scanGrid');
  if (grid.dataset.sector !== String(sc.sector)){
    grid.innerHTML = sc.cells.map((_, i) => `<div class="scell" data-i="${i}"></div>`).join('');
    grid.dataset.sector = String(sc.sector);
    grid.querySelectorAll('.scell').forEach(el => {
      const i = parseInt(el.dataset.i, 10);
      el.addEventListener('click', () => onScanCellClick(i, false));
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); onScanCellClick(i, true); });
    });
  }
  // update cell states in place
  grid.querySelectorAll('.scell').forEach(el => {
    const i = parseInt(el.dataset.i, 10);
    const c = sc.cells[i];
    el.className = 'scell';
    delete el.dataset.n;
    if (c.st === 0){ el.textContent = ''; el.title = 'Click to scan (free) · right-click to dig'; }
    else if (c.st === 1){
      el.classList.add('revealed');
      const n = scanAdjacentVeins(i);
      if (n > 0){ el.textContent = n; el.dataset.n = n; }
      else el.textContent = '';
      el.title = 'Scanned — ' + (n || 'no') + ' veins touch this cell';
    }
    else if (c.st === 2){ el.classList.add('vein'); el.textContent = '💎'; el.title = 'Vein extracted!'; }
    else { el.classList.add('miss'); el.textContent = '✖'; el.title = 'Cave-in — nothing here'; }
  });

  document.getElementById('nextSectorBtn').classList.toggle('hidden', !scannerAllVeinsDug());
}

function onScanCellClick(i, dig){
  const c = S.scanner.cells[i];
  const info = () => renderScanner();

  if (c.st !== 0){
    return; // already revealed
  }
  if (dig){
    const r = digCell(i);
    if (!r.ok){ if (r.why) toast('⚠ ' + r.why, 'bad'); return; }
    playClickSound();
    if (r.hit){
      let msg = `💎 Vein! <b>${fmtCash(r.yield.cash)}</b> + ${fmtInt(r.yield.oreUnits)} ${ORE_BY_ID[r.yield.ore].name}!`;
      if (r.cleared) msg += ` 🏆 Sector cleared — <b>+${fmtCash(r.bonus)}</b> bonus!`;
      toast(msg, r.cleared ? 'gold' : 'good');
    } else {
      toast(`✖ Cave-in! You lost ${fmtCash(r.cost)} digging empty rock.`, 'bad');
    }
  } else {
    const r = scanCell(i);
    if (!r.ok) return;
    // free scans make no sound; tiny feedback via re-render
  }
  info();
}
