AI DISCLAIMER, i vibe coded this with opencode, it was fun i thought the results i got with open code and the free model 'big pickle'
# ⛏️ Open Clicker — a cave mining clicker/idler

A browser clicker/idler inspired by *Cookie Clicker*, but you're a cave miner.

You click a rock to mine **ore**, hire **miners** to dig for you, and sell ore to
**distributors** for **cash**. Cash buys more miners and upgrades. Two minigames,
random Motherlode events, achievements, offline progress and a prestige system are built in.

## How to play

> If your browser allows local saves, you can also just **double-click `index.html`.**
> Some browsers block `localStorage` on `file://` pages, in which case the game still
> runs but won't auto-save — the game will warn you and you can use **Stats → Export save**.

### Controls
- **Click the rock** (or press **Space**) to mine ore.
- **Miners** (center column) auto-mine ore for you. Buy 1 / 10 / 100 / Max.
- **Trade tab** → sell ore:
  - **Quick sell** instantly at market price (takes a small cut).
  - **Post a listing** (ore + quantity) and distributors send **offers**.
  - **Confirm** an offer, or **counter** with your own price — the distributor
    replies instantly: accepts, or walks away.
- **Upgrades tab** — click power, production multipliers, offline cap, better offers.
- **Garden** (unlocks with a Crystal Geode) — plant seed crystals, wait, harvest for ore.
- **Scanner** (unlocks with a Deep Bore) — minesweeper-style. Left-click to scan (free),
  right-click to dig a hidden cell for ore + cash. Read the numbers to find the veins.
- **Motherlode** — a glowing rock appears every few minutes; click it for buffs/cash.
- **Descend Deeper** (left column) — prestige: reset your run for **Deep Crystals**,
  each giving a permanent +1% to production and clicking.

## Ore tiers
Copper → Iron → Gold → Crystal → Diamond. Each new ore unlocks when you buy its
gateway miner (Drill, Crystal Geode, Mole Machine, Gem Quarry). Market prices drift
over time, so selling timing matters a little.

## Files
```
index.html          layout
css/style.css       cave theme, animations
play.bat            one-click local server + open browser
serve.ps1           the tiny PowerShell static server
js/
  data/             ore, buildings, upgrades, achievements, distributors, events (all data-driven)
  state.js          game state + all the math (production, multipliers)
  market.js         prices, quick sell, listings, offers, counter-offers
  clicker.js        clicking, floating numbers, punchy synthesized sound, Motherlode
  save.js           save/load/export/import + offline progress
  prestige.js       Deep Crystal resets
  minigames/        garden.js, scanner.js
  progress.js       achievements + upgrade unlocks
  ui.js             rendering + input wiring
  loop.js           game loop (production, timers, autosave)
  main.js           boot
```

Saving is automatic (every 30s, and when you leave the tab). Everything is plain
JavaScript with no build step and no dependencies.
