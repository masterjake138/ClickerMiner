'use strict';

// ~57 achievements, each worth +0.5% to global production & clicking.
const ACHIEVEMENTS = [
  // clicks
  { id:'c10',     name:'First Strike',      icon:'👆', desc:'Mine 10 times',            check:s=>s.stats.clicks>=10 },
  { id:'c100',    name:'Getting Warmed Up', icon:'👋', desc:'Mine 100 times',           check:s=>s.stats.clicks>=100 },
  { id:'c1k',     name:'Tunnel Vision',     icon:'🕳️', desc:'Mine 1,000 times',         check:s=>s.stats.clicks>=1000 },
  { id:'c10k',    name:'Pick Habit',        icon:'💪', desc:'Mine 10,000 times',        check:s=>s.stats.clicks>=10000 },
  { id:'c50k',    name:'Rock Rheumatism',   icon:'🦴', desc:'Mine 50,000 times',        check:s=>s.stats.clicks>=50000 },
  { id:'c100k',   name:'Mountain Mover',    icon:'⛰️', desc:'Mine 100,000 times',       check:s=>s.stats.clicks>=100000 },

  // lifetime cash
  { id:'m1k',     name:'First Paycheck',    icon:'💵', desc:'Earn $1K lifetime',        check:s=>s.lifetimeCash>=1e3 },
  { id:'m1m',     name:'Six Figures',       icon:'💸', desc:'Earn $1M lifetime',        check:s=>s.lifetimeCash>=1e6 },
  { id:'m1b',     name:'Mining Magnate',    icon:'💰', desc:'Earn $1B lifetime',        check:s=>s.lifetimeCash>=1e9 },
  { id:'m1t',     name:'Trillionaire',      icon:'🏆', desc:'Earn $1T lifetime',        check:s=>s.lifetimeCash>=1e12 },

  // ore mined per tier
  ...ORES.flatMap(o => [
    { id:o.id+'_10k',  name:o.name+' Grinder',  icon:o.icon, desc:'Mine 10K '+o.name+' ore', check:s=>s.mined[o.id]>=1e4 },
    { id:o.id+'_10m',  name:o.name+' Baron',    icon:o.icon, desc:'Mine 10M '+o.name+' ore', check:s=>s.mined[o.id]>=1e7 },
  ]),

  // buildings owned
  ...BUILDINGS.flatMap(b => [
    { id:b.id+'_10', name:'10× '+b.name,     icon:b.icon, desc:'Own 10 '+b.name+'s',    check:s=>(s.buildings[b.id]||0)>=10 },
    { id:b.id+'_25', name:'25× '+b.name,     icon:b.icon, desc:'Own 25 '+b.name+'s',    check:s=>(s.buildings[b.id]||0)>=25 },
  ]),

  // trading
  { id:'sale1',    name:'Closed the Deal',   icon:'🤝', desc:'Sell your first listing',       check:s=>s.stats.listingsSold>=1 },
  { id:'sale10',   name:'Regular Customer',  icon:'📮', desc:'Sell 10 listings',              check:s=>s.stats.listingsSold>=10 },
  { id:'sale100',  name:'Bulk Trader',       icon:'🚛', desc:'Sell 100 listings',             check:s=>s.stats.listingsSold>=100 },
  { id:'counter1', name:'Hard Bargain',      icon:'😤', desc:'Win your first counter-offer',  check:s=>s.stats.countersWon>=1 },
  { id:'counter10',name:'Master Negotiator', icon:'🧠', desc:'Win 10 counter-offers',         check:s=>s.stats.countersWon>=10 },
  { id:'quick10',  name:'Cash and Carry',    icon:'⚡', desc:'Quick-sell 10 times',           check:s=>s.stats.quickSells>=10 },

  // events
  { id:'ml1',      name:'Lucky Strike',      icon:'✨', desc:'Click a Motherlode',            check:s=>s.stats.motherlodes>=1 },
  { id:'ml25',     name:'Vein Hunter',       icon:'🌟', desc:'Click 25 Motherlodes',          check:s=>s.stats.motherlodes>=25 },

  // prestige
  { id:'p1',       name:'Into the Deep',     icon:'🔻', desc:'Descend deeper once',           check:s=>s.resets>=1 },
  { id:'p10',      name:'Deepest Descent',   icon:'🌀', desc:'Descend deeper 10 times',       check:s=>s.resets>=10 },

  // garden
  { id:'g1',       name:'Green Thumb',       icon:'🌱', desc:'Harvest your first crystal',    check:s=>s.stats.harvests>=1 },
  { id:'g100',     name:'Crystal Farmer',    icon:'🌾', desc:'Harvest 100 crystals',          check:s=>s.stats.harvests>=100 },

  // scanner
  { id:'s1',       name:'Seam Sweeper',      icon:'📡', desc:'Clear your first sector',       check:s=>s.stats.sectorsCleared>=1 },
  { id:'s25',      name:'Deep Cartographer', icon:'🗺️', desc:'Clear 25 sectors',              check:s=>s.stats.sectorsCleared>=25 },
];
