'use strict';

// 12 miner tiers. `rate` = ore units/second of `ore` type. Costs grow 1.15x each.
const BUILDINGS = [
  { id:'chisel',    name:'Chisel',           icon:'🔧', baseCost:15,        rate:0.1,     ore:'copper',  desc:'A rusty chisel and a lot of patience.' },
  { id:'prospector',name:'Prospector',       icon:'🧔', baseCost:100,       rate:1,       ore:'copper',  desc:'Knows a copper vein when he sees one.' },
  { id:'minecart',  name:'Minecart',         icon:'🛒', baseCost:1100,      rate:8,       ore:'copper',  desc:'Rattles ore up from the shallow tunnels.' },
  { id:'drill',     name:'Drill',            icon:'🪚', baseCost:12000,     rate:7,       ore:'iron',    desc:'Bites through rock. Unlocks iron ore!' },
  { id:'dynamite',  name:'Dynamite Rig',     icon:'🧨', baseCost:130000,    rate:72,      ore:'iron',    desc:'Controlled explosions, mostly controlled.' },
  { id:'mine',      name:'Underground Mine', icon:'⛏️', baseCost:1400000,   rate:800,     ore:'iron',    desc:'A real mine with lanterns and everything.' },
  { id:'geode',     name:'Crystal Geode',    icon:'🪨', baseCost:20000000,  rate:1500,    ore:'gold',    desc:'Hollow rocks full of gold. Unlocks the Garden!' },
  { id:'smelter',   name:'Smelter',          icon:'🔥', baseCost:330000000, rate:25000,   ore:'gold',    desc:'Turns raw gold into ... more gold, somehow.' },
  { id:'mole',      name:'Mole Machine',     icon:'🚜', baseCost:5100000000, rate:51000,  ore:'crystal', desc:'Tunnels anywhere. Unlocks crystal ore!' },
  { id:'deepbore',  name:'Deep Bore',        icon:'🌀', baseCost:75000000000, rate:750000, ore:'crystal', desc:'Drills toward the planet\'s core. Unlocks the Scanner!' },
  { id:'quarry',    name:'Gem Quarry',       icon:'💎', baseCost:1e12,      rate:1600000,  ore:'diamond', desc:'Open-pit violence in pursuit of sparkle.' },
  { id:'core',      name:'Core Extractor',   icon:'☀️', baseCost:14e12,     rate:21000000, ore:'diamond', desc:'Taps the molten heart of the earth itself.' },
];

const BUILDING_BY_ID = {};
BUILDINGS.forEach(b => BUILDING_BY_ID[b.id] = b);
