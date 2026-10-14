'use strict';

/* ---------------- audio (synthesized, no files) ---------------- */

let audioCtx = null;
function audioCtxGet(){
  if (!audioCtx){
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e){ audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playClickSound(){
  if (!S || !S.settings.sound) return;
  const ctx = audioCtxGet();
  if (!ctx) return;
  const t = ctx.currentTime;

  // thud: quick low sine sweep
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(170 + Math.random() * 40, t);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  osc.connect(g).connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.11);

  // crunch: short noise burst
  const len = Math.floor(ctx.sampleRate * 0.05);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = 'lowpass'; hp.frequency.value = 1400;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.16, t);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  src.connect(hp).connect(g2).connect(ctx.destination);
  src.start(t);
}

/* ---------------- clicking ---------------- */

// Distribute an integer number of ore units across unlocked tiers,
// weighted toward the newest tiers (largest-remainder method).
function allocateOre(units){
  const unlocked = unlockedOreIds();
  if (!unlocked.length) return {};
  const weights = unlocked.map((_, i) => ORE_CLICK_WEIGHTS[ORE_CLICK_WEIGHTS.length - unlocked.length + i]);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const exact = weights.map(w => units * w / wsum);
  const out = {};
  unlocked.forEach((id, i) => out[id] = Math.floor(exact[i]));
  let rem = units;
  Object.values(out).forEach(v => rem -= v);
  // largest remainder
  const order = exact.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) out[unlocked[order[k % order.length][1]]]++;
  return out;
}

function handleRockClick(ev){
  const units = clickPowerUnits();
  const got = allocateOre(units);
  let total = 0;
  for (const id in got){
    S.ore[id] += got[id];
    S.mined[id] += got[id];
    total += got[id];
  }
  S.stats.clicks++;

  playClickSound();

  // floating text: "12 Ore" or "5 Iron, 3 Copper"
  const parts = Object.keys(got).filter(k => got[k] > 0)
    .map(k => `${got[k]} ${ORE_BY_ID[k].name}`);
  const label = parts.length ? parts.join(', ') : `${total} ore`;
  spawnFloating(ev.clientX, ev.clientY, '+' + label, total >= 50);

  // rock anim
  const rock = document.getElementById('rock');
  if (rock){
    rock.classList.remove('hit', 'swing');
    void rock.offsetWidth; // restart animation
    rock.classList.add('hit', 'swing');
  }
}

function spawnFloating(x, y, text, big){
  const layer = document.getElementById('floatLayer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'floatNum' + (big ? ' big' : '');
  el.textContent = text;
  el.style.left = (x + (Math.random() * 40 - 20)) + 'px';
  el.style.top = (y - 10) + 'px';
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1050);
}

/* ---------------- motherlode event ---------------- */

let motherlode = null;   // {el, expiresAt}
let nextMotherlodeAt = 0;

function scheduleNextMotherlode(){
  nextMotherlodeAt = Date.now() + (180 + Math.random() * 240) * 1000; // 3–7 min
}

function maybeSpawnMotherlode(now){
  if (motherlode){
    if (now > motherlode.expiresAt){
      motherlode.el.remove();
      motherlode = null;
      scheduleNextMotherlode();
    }
    return;
  }
  if (now < nextMotherlodeAt) return;
  spawnMotherlode(now);
}

function spawnMotherlode(now){
  const area = document.getElementById('rockArea');
  if (!area) return;
  const el = document.createElement('div');
  el.id = 'motherlode';
  el.textContent = '✨🪨';
  el.title = 'A Motherlode! Click it!';
  const rect = area.getBoundingClientRect();
  const x = 20 + Math.random() * Math.max(40, rect.width - 90);
  const y = 90 + Math.random() * Math.max(40, rect.height - 140);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.addEventListener('click', (e) => { e.stopPropagation(); clickMotherlode(); });
  document.body.appendChild(el);
  motherlode = { el, expiresAt: now + 15000 };
}

function clickMotherlode(){
  if (!motherlode) return;
  motherlode.el.remove();
  motherlode = null;
  scheduleNextMotherlode();
  S.stats.motherlodes++;
  playClickSound();

  // weighted roll
  let roll = Math.random() * MOTHERLODE_LOOT.reduce((a, l) => a + l.w, 0);
  let pick = MOTHERLODE_LOOT[0];
  for (const l of MOTHERLODE_LOOT){ roll -= l.w; if (roll <= 0){ pick = l; break; } }

  if (pick.id === 'windfall'){
    const cps = totalCpsValue();
    const amount = Math.max(50, cps * (600 + Math.random() * 900)); // 10–25 min of production
    earnCash(amount);
    toast(`✨ Motherlode! Cash windfall of <b>${fmtCash(amount)}</b>!`, 'gold');
  } else if (pick.id === 'mega'){
    const cps = totalCpsValue();
    const amount = Math.max(500, cps * 3600); // 1 hour of production
    earnCash(amount);
    addBuff('mineFrenzy', 30);
    toast(`💥 MEGASEAM! <b>${fmtCash(amount)}</b> plus Mining Frenzy (x7, 30s)!`, 'gold');
  } else {
    addBuff(pick.id, BUFFS[pick.id].dur);
    toast(`✨ Motherlode: <b>${BUFFS[pick.id].name}</b> — ${BUFFS[pick.id].desc} for ${BUFFS[pick.id].dur}s!`, 'gold');
  }
}
