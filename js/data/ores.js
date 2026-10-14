'use strict';

// Ore tiers. `gateway` = building id that must be owned (count >= 1) to unlock this ore.
const ORES = [
  { id:'copper',  name:'Copper',  icon:'🟠', price:1,    gateway:null,     seedCost:100,       seedGrow:45,  seedYield:1000 },
  { id:'iron',    name:'Iron',    icon:'⚪', price:8,    gateway:'drill',  seedCost:5000,      seedGrow:90,  seedYield:300  },
  { id:'gold',    name:'Gold',    icon:'🟡', price:60,   gateway:'geode',  seedCost:250000,    seedGrow:180, seedYield:150  },
  { id:'crystal', name:'Crystal', icon:'🔮', price:450,  gateway:'mole',   seedCost:50000000,  seedGrow:360, seedYield:60   },
  { id:'diamond', name:'Diamond', icon:'💎', price:3000, gateway:'quarry', seedCost:25000000000, seedGrow:600, seedYield:20 },
];

const ORE_BY_ID = {};
ORES.forEach(o => ORE_BY_ID[o.id] = o);

// Click allocation weights, indexed by tier position (older tiers get the small weights).
const ORE_CLICK_WEIGHTS = [0.01, 0.04, 0.15, 0.3, 0.5];
