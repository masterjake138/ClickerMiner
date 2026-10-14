'use strict';

/* ---------------- market prices ---------------- */

function oreBasePrice(oreId){ return ORE_BY_ID[oreId].price; }

function orePrice(oreId){
  const base = oreBasePrice(oreId);
  const factor = S.prices[oreId] || 1;
  return base * factor * buffMult('price');
}

// quick-sell rate: market price minus a cut (5%, or 2% with Bulk Buyer)
function quickSellRate(oreId){
  const cut = S.upgrades.quick_bonus ? 0.02 : 0.05;
  return orePrice(oreId) * (1 - cut);
}

let marketTimer = 0;
function tickMarket(dt){
  marketTimer += dt;
  if (marketTimer < 10) return;
  marketTimer = 0;
  driftPrices();
}

function driftPrices(){
  for (const o of ORES){
    let f = S.prices[o.id] || 1;
    f += (1 - f) * 0.12;                 // mean-reverting
    f += (Math.random() - 0.5) * 0.05;   // noise
    S.prices[o.id] = Math.min(1.5, Math.max(0.7, f));
  }
}

/* ---------------- quick sell ---------------- */

function quickSell(oreId, frac){
  const have = S.ore[oreId] || 0;
  let qty = frac >= 1 ? Math.floor(have) : Math.floor(have * frac);
  if (qty < 1) return 0;
  const earned = qty * quickSellRate(oreId);
  S.ore[oreId] -= qty;
  if (S.ore[oreId] < 0.0001) S.ore[oreId] = 0;
  earnCash(earned);
  S.stats.quickSells++;
  return earned;
}

function earnCash(amount){
  S.cash += amount;
  S.runCash += amount;
  S.lifetimeCash += amount;
}

/* ---------------- listings ---------------- */

function listingSlotsUsed(){ return S.listings.length; }

function createListing(oreId, qty){
  if (S.listings.length >= listingSlots()) return { ok:false, why:'All listing slots full.' };
  qty = Math.floor(qty);
  if (!(qty >= 1)) return { ok:false, why:'Enter a quantity.' };
  if ((S.ore[oreId] || 0) < qty) return { ok:false, why:'Not enough ore in inventory.' };
  S.ore[oreId] -= qty;
  const now = Date.now();
  const id = S.listingSeq++;
  S.listings.push({
    id, ore:oreId, qty, postedAt:now,
    nextOfferAt: now + nextOfferDelay(),
    offerId: null,
  });
  S.stats.listingsPosted++;
  return { ok:true, id };
}

function cancelListing(id){
  const i = S.listings.findIndex(l => l.id === id);
  if (i < 0) return;
  const l = S.listings[i];
  if (l.offerId) S.offers = S.offers.filter(o => o.id !== l.offerId);
  S.ore[l.ore] = (S.ore[l.ore] || 0) + l.qty; // ore returned
  S.listings.splice(i, 1);
}

/* ---------------- offers ---------------- */

function nextOfferDelay(){
  const base = 20 + Math.random() * 40;          // 20–60s
  return (base / upgradeProduct('offerSpeed')) * 1000;
}

function offerPriceFor(oreId){
  const dist = DISTRIBUTORS[Math.floor(Math.random() * DISTRIBUTORS.length)];
  const haggle = 1 + (S.upgrades.offer_price ? UPGRADE_BY_ID.offer_price.value : 0);
  const r = 0.93 + Math.random() * 0.3;          // 0.93–1.23 of market
  return { price: orePrice(oreId) * dist.mult * r * haggle, dist };
}

function tryGenerateOffers(now){
  if (S.offers.length >= Math.max(6, S.listings.length * 2)) return;
  for (const l of S.listings){
    if (l.offerId) continue;
    if (now < l.nextOfferAt) continue;
    const { price, dist } = offerPriceFor(l.ore);
    const offer = {
      id: S.offerSeq++, listingId: l.id, ore: l.ore, qty: l.qty,
      price, dist: DISTRIBUTORS.indexOf(dist), createdAt: now,
    };
    S.offers.push(offer);
    l.offerId = offer.id;
    if (typeof toast === 'function') toast(`📨 ${dist.name} sent an offer on your ${ORE_BY_ID[l.ore].name} listing.`);
    return; // one offer per tick
  }
}

function acceptOffer(id){
  const i = S.offers.findIndex(o => o.id === id);
  if (i < 0) return null;
  const o = S.offers[i];
  const earned = o.qty * o.price;
  earnCash(earned);
  S.offers.splice(i, 1);
  const li = S.listings.findIndex(l => l.id === o.listingId);
  if (li >= 0) S.listings.splice(li, 1);
  S.stats.offersAccepted++;
  S.stats.listingsSold++;
  S.stats.biggestSale = Math.max(S.stats.biggestSale, earned);
  return { offer:o, earned };
}

// Instant counter-offer outcome: they accept (paying your price) or walk away.
// Chance falls as your ask rises above their offer (+60% is nearly hopeless).
function counterOffer(id, askPrice){
  const i = S.offers.findIndex(o => o.id === id);
  if (i < 0) return null;
  const o = S.offers[i];
  const ratio = askPrice / o.price;
  let accepted;
  if (ratio <= 1.02) accepted = true;
  else accepted = Math.random() < Math.max(0.05, Math.min(0.95, 1 - (ratio - 1) / 0.6));

  if (accepted){
    const earned = o.qty * askPrice;
    earnCash(earned);
    S.offers.splice(i, 1);
    const li = S.listings.findIndex(l => l.id === o.listingId);
    if (li >= 0) S.listings.splice(li, 1);
    S.stats.countersWon++;
    S.stats.listingsSold++;
    S.stats.biggestSale = Math.max(S.stats.biggestSale, earned);
    return { result:'accept', offer:o, earned };
  } else {
    // distributor walks: offer withdrawn, listing stays
    S.offers.splice(i, 1);
    const li = S.listings.findIndex(l => l.id === o.listingId);
    if (li >= 0){ S.listings[li].offerId = null; S.listings[li].nextOfferAt = Date.now() + nextOfferDelay() * 0.5; }
    S.stats.countersLost++;
    return { result:'walk', offer:o };
  }
}

function offerById(id){ return S.offers.find(o => o.id === id) || null; }
function listingById(id){ return S.listings.find(l => l.id === id) || null; }
