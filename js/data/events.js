'use strict';

// Timed buffs. `mult` kinds: click (xN clicks), prod (xN production), price (xN ore prices)
const BUFFS = {
  clickFrenzy: { id:'clickFrenzy', name:'Click Frenzy', icon:'⚡', desc:'x7 click power',   dur:30, kind:'click', mult:7 },
  mineFrenzy:  { id:'mineFrenzy',  name:'Mining Frenzy',icon:'⛏️', desc:'x7 production',    dur:30, kind:'prod',  mult:7 },
  marketSurge: { id:'marketSurge', name:'Market Surge', icon:'📈', desc:'Ore prices +50%',  dur:60, kind:'price', mult:1.5 },
  steadyHand:  { id:'steadyHand',  name:'Steady Hand',  icon:'🖐️', desc:'x3 click power',   dur:45, kind:'click', mult:3 },
};

// Motherlode loot table: [weight, resolve(state) description function]
const MOTHERLODE_LOOT = [
  { w:30, id:'windfall',  label:'CASH WINDFALL' },
  { w:25, id:'clickFrenzy', label:'CLICK FRENZY' },
  { w:25, id:'mineFrenzy',  label:'MINING FRENZY' },
  { w:15, id:'marketSurge', label:'MARKET SURGE' },
  { w:5,  id:'mega',      label:'MEGASEAM!' },
];

const NEWS_HEADLINES = [
  'Local miner insists the pickaxe "does the real work".',
  'Copper prices steady; distributor seen nodding slowly.',
  'Geode gardeners report crystals "definitely faster when nobody watches".',
  'Seam Scanner warns: numbers on the wall are not a constellation.',
  'Distributor counters your offer, then counters their own offer out of confusion.',
  'Scientists confirm cave is, in fact, underground.',
  'Dynamite rig denies responsibility for the new skylight.',
  'Motherlode spotted near tunnel 4 — grab it before it regenerates.',
  'Deep Bore crew reaches depth labeled "do not drill past this".',
  'Union miners request hazard pay for encountering Motherlodes.',
  'Diamond quarry reports sparkle levels "irresponsibly high".',
  'Trade board flooded with listings; distributors reportedly "feeling it".',
  'Geologists debate: is ore just rocks with better PR?',
  'Night Crew upgrade meets resistance from actual night owls.',
  'Mole Machine found stop-motion digging between shifts.',
  'Sell-all button described by economist as "the free-market button".',
  'Crystal gardeners invent new sport: competitive waiting.',
  'Escalator to surface broken; miners describe descent as "on brand".',
  'Report: 9 out of 10 cave-ins avoidable, 10th extremely avoidable.',
  'Market analyst: "The arrow going down is still an arrow."',
];
