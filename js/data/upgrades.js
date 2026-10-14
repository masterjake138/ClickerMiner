'use strict';

// Upgrade types:
//   clickAdd   -> flat +value ore per click
//   clickMult  -> multiply click power
//   globalMult -> multiply ALL production (and clicks)
//   buildingMult -> multiply one building's output (building: id)
//   offlineHours -> raise offline progress cap
//   offerSpeed -> offers arrive faster
//   offerPrice -> distributor offers pay more
//   listingSlots -> more simultaneous listings
//   quickSell  -> better quick-sell rate (less market cut)
// req: { clicks, lifetimeCash, buildings:{id:n}, stats:{key:n} }
const UPGRADES = [
  // --- click power ---
  { id:'click_add1', name:'Sharpened Pickaxe',   icon:'🔨', cost:50,        type:'clickAdd',   value:1, req:{clicks:10},         desc:'+1 ore per click' },
  { id:'click_mul1', name:'Steel Pickaxe',       icon:'⛏️', cost:750,       type:'clickMult',  value:2, req:{clicks:50},         desc:'Click power x2' },
  { id:'click_add2', name:'Weighted Gloves',     icon:'🧤', cost:8000,      type:'clickAdd',   value:5, req:{clicks:200},        desc:'+5 ore per click' },
  { id:'click_mul2', name:'Diamond Tip',         icon:'💠', cost:150000,    type:'clickMult',  value:2, req:{clicks:750},        desc:'Click power x2' },
  { id:'click_mul3', name:'Powered Gauntlet',    icon:'🤖', cost:5e6,       type:'clickMult',  value:3, req:{clicks:2500},       desc:'Click power x3' },
  { id:'click_mul4', name:'Molecular Cutter',    icon:'⚛️', cost:1e9,       type:'clickMult',  value:5, req:{clicks:8000},       desc:'Click power x5' },
  { id:'click_mul5', name:'Quantum Pickaxe',     icon:'🌀', cost:2e12,      type:'clickMult',  value:10, req:{clicks:25000},     desc:'Click power x10' },

  // --- global production ---
  { id:'global1', name:'Geology Survey',   icon:'🗺️', cost:15000,  type:'globalMult', value:1.1,  req:{lifetimeCash:1e4},   desc:'All production & clicking +10%' },
  { id:'global2', name:'Union Miners',     icon:'🤝', cost:2.5e7,  type:'globalMult', value:1.1,  req:{lifetimeCash:1e7},   desc:'All production & clicking +10%' },
  { id:'global3', name:'Deep Core Research', icon:'🧪', cost:5e11, type:'globalMult', value:1.15, req:{lifetimeCash:1e11},  desc:'All production & clicking +15%' },

  // --- per-building doubles (cost = baseCost x 100, requires 10 owned) ---
  { id:'up_chisel',    name:'Reinforced Chisel',   icon:'🔧', cost:1500,      type:'buildingMult', building:'chisel',    value:2, req:{buildings:{chisel:10}},    desc:'Chisels produce x2' },
  { id:'up_prospector',name:'Assayer Kit',         icon:'🧐', cost:10000,     type:'buildingMult', building:'prospector',value:2, req:{buildings:{prospector:10}},desc:'Prospectors produce x2' },
  { id:'up_minecart',  name:'Rail Upgrade',        icon:'🛤️', cost:110000,    type:'buildingMult', building:'minecart',  value:2, req:{buildings:{minecart:10}},  desc:'Minecarts produce x2' },
  { id:'up_drill',     name:'Carbide Bits',        icon:'🪚', cost:1200000,   type:'buildingMult', building:'drill',     value:2, req:{buildings:{drill:10}},     desc:'Drills produce x2' },
  { id:'up_dynamite',  name:'Stable Explosives',   icon:'💥', cost:13000000,  type:'buildingMult', building:'dynamite',  value:2, req:{buildings:{dynamite:10}},  desc:'Dynamite Rigs produce x2' },
  { id:'up_mine',      name:'Reinforced Beams',    icon:'🪵', cost:140000000, type:'buildingMult', building:'mine',      value:2, req:{buildings:{mine:10}},      desc:'Underground Mines produce x2' },
  { id:'up_geode',     name:'Resonance Hammer',    icon:'🔨', cost:2e9,       type:'buildingMult', building:'geode',     value:2, req:{buildings:{geode:10}},     desc:'Crystal Geodes produce x2' },
  { id:'up_smelter',   name:'Coke Furnace',        icon:'♨️', cost:3.3e10,    type:'buildingMult', building:'smelter',   value:2, req:{buildings:{smelter:10}},   desc:'Smelters produce x2' },
  { id:'up_mole',      name:'Titanium Treads',     icon:'🚜', cost:5.1e11,    type:'buildingMult', building:'mole',      value:2, req:{buildings:{mole:10}},      desc:'Mole Machines produce x2' },
  { id:'up_deepbore',  name:'Plasma Drillhead',    icon:'🔥', cost:7.5e12,    type:'buildingMult', building:'deepbore',  value:2, req:{buildings:{deepbore:10}},  desc:'Deep Bores produce x2' },
  { id:'up_quarry',    name:'Diamond Saws',        icon:'🪚', cost:1e14,      type:'buildingMult', building:'quarry',    value:2, req:{buildings:{quarry:10}},    desc:'Gem Quarries produce x2' },
  { id:'up_core',      name:'Containment Field',   icon:'🛡️', cost:1.4e15,    type:'buildingMult', building:'core',      value:2, req:{buildings:{core:10}},      desc:'Core Extractors produce x2' },

  // --- offline & trade ---
  { id:'offline8',  name:'Extended Shift',     icon:'🌙', cost:1e7,   type:'offlineHours', value:8,  req:{lifetimeCash:1e6},        desc:'Offline progress cap: 2h → 8h' },
  { id:'offline24', name:'Night Crew',         icon:'🌃', cost:1e10,  type:'offlineHours', value:24, req:{lifetimeCash:1e9},        desc:'Offline progress cap: 8h → 24h' },
  { id:'offer_speed', name:'Sales Team',       icon:'👔', cost:5e5,   type:'offerSpeed',   value:1.5, req:{stats:{listingsSold:5}},  desc:'Distributor offers arrive 50% faster' },
  { id:'offer_price', name:'Haggle Training',  icon:'🗣️', cost:1e7,   type:'offerPrice',   value:0.1, req:{stats:{listingsSold:20}}, desc:'Offers pay 10% more' },
  { id:'listing_slots', name:'Expanded Warehouse', icon:'📦', cost:2e6, type:'listingSlots', value:3,  req:{stats:{listingsPosted:10}}, desc:'Post up to 7 listings at once (from 4)' },
  { id:'quick_bonus', name:'Bulk Buyer',       icon:'🧾', cost:2.5e5, type:'quickSell',    value:0.03, req:{stats:{quickSells:10}},  desc:'Quick-sell cut reduced (5% → 2%)' },
];

const UPGRADE_BY_ID = {};
UPGRADES.forEach(u => UPGRADE_BY_ID[u.id] = u);
