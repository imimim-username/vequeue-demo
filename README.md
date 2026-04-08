# Victory Quest — veQueue Demo

A browser-based multiplayer RPG that teaches Alchemix protocol mechanics (self-repaying loans, synthetic assets, governance) through gameplay. Economic systems — queues, yield, debt repayment, voting — are first-class game mechanics, not a side layer.

**Live:** https://vequeue.imimim.info

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Running the Game](#running-the-game)
5. [Server — Backend Systems](#server--backend-systems)
   - [Database & Persistence](#database--persistence)
   - [Authentication](#authentication)
   - [Economy: Five Currencies](#economy-five-currencies)
   - [Currency Exchange](#currency-exchange)
   - [Bank (Self-Repaying Loans)](#bank-self-repaying-loans)
   - [Transmuter](#transmuter)
   - [Queue System](#queue-system)
   - [Governance](#governance)
   - [Live Price Feeds](#live-price-feeds)
   - [World Events](#world-events)
   - [Snowball Enemies](#snowball-enemies)
   - [Loot System](#loot-system)
   - [Marketplace](#marketplace)
   - [Hall of Fame](#hall-of-fame)
   - [Treasury](#treasury)
   - [Socket Event Reference](#socket-event-reference)
6. [Client — Frontend Systems](#client--frontend-systems)
   - [Global State (G)](#global-state-g)
   - [Game Loop](#game-loop)
   - [Rendering](#rendering)
   - [Combat](#combat)
   - [Quests](#quests)
   - [User Interface](#user-interface)
   - [Controls](#controls)
   - [Audio](#audio)
7. [World & Maps](#world--maps)
8. [Character System](#character-system)
9. [Security Model](#security-model)
10. [Test Suite](#test-suite)
11. [Deployment](#deployment)
12. [Admin Panel](#admin-panel)

---

## Overview

Victory Quest is a real-time multiplayer action RPG where players explore a pixel-art world, battle enemies, complete quests, and participate in an on-chain-inspired economy. The economic layer directly models how Alchemix protocol works:

- **Bank** → deposit collateral, mint synthetic assets (self-repaying loan)
- **Transmuter** → lock synthetics to receive redeemed collateral over time
- **Queue** → time-weighted access; patience earns ALCX governance tokens
- **Governance** → vote with queue-staked ALCX to set protocol parameters

Every economic action affects every other player. Governance votes set the bank earmark rate. Transmuter depositors receive a share of bank repayments. Queue jumpers pay ALCX that gets distributed to patients in line. The game is a living Alchemix simulation.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    BROWSER (Client)                  │
│                                                      │
│  Vite-bundled Vanilla JS + Canvas                    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐  │
│  │ game.js │ │render.js│ │combat.js│ │  ui.js   │  │
│  │  loop   │ │  canvas │ │ battles │ │ overlays │  │
│  └────┬────┘ └─────────┘ └─────────┘ └──────────┘  │
│       │  state.js (G object)  socket.js             │
└───────┼──────────────────────┬──────────────────────┘
        │   Socket.io (WSS)    │
        ▼                      ▼
┌─────────────────────────────────────────────────────┐
│               Node.js Server (server.js)             │
│                                                      │
│  Express HTTP + Socket.io                            │
│  ┌──────────────────────────────────────────────┐   │
│  │ Economy Engine                               │   │
│  │  bank ticks · transmuter · exchange          │   │
│  │  queue · governance · loot · market          │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ JSON persistence (fs write on every change)  │   │
│  │  players.json · governance.json              │   │
│  │  marketplace.json · graffiti.json            │   │
│  │  hall_of_fame.json · snowball_enemies.json   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Client-authoritative:** Character appearance, position, XP, kills, level, inventory contents, quest progress — the client sends these; the server clamps and validates.

**Server-authoritative:** All five currencies, bank positions, transmuter deposits, locked ALCX, vote locks, marketplace listings, loot spawns, queue state — the server never accepts these from the client. Any mutation comes from a server handler, then is written directly to the player database.

---

## File Structure

```
vequeue-demo/
├── server.js                 # Backend: all game server logic (~1,400 lines)
├── package.json
├── vite.config.js            # Builds public/ → dist/
├── admin.html                # Admin dashboard
│
├── public/                   # Source files (built by Vite)
│   ├── index.html            # Main game HTML — all screens & overlays
│   ├── style.css             # Dark theme, responsive layout
│   └── js/
│       ├── main.js           # Entry point; window exports for HTML onclick=
│       ├── state.js          # Global G state object + livePrices
│       ├── game.js           # Main game loop, zones, NPCs, quests, collisions
│       ├── socket.js         # Socket.io client + all server event handlers
│       ├── combat.js         # Battle system, XP, leveling, loot rolls
│       ├── ui.js             # All overlays: bank, transmuter, exchange, market,
│       │                     #   governance, shop, inventory, changelog
│       ├── render.js         # Canvas rendering: tiles, sprites, HUD, battle
│       ├── maps.js           # Zone tile maps, NPC positions, door triggers
│       ├── data.js           # Constants: enemies, items, quests, tiles, colors
│       ├── input.js          # Keyboard + touch controls
│       └── audio.js          # SFX + music via Web Audio API
│
├── tests/
│   └── server.test.mjs       # 37-test integration + unit suite
│
└── dist/                     # Vite build output (served by Express)
```

---

## Running the Game

### Development

```bash
npm install
npm run dev        # Vite dev server (port 5173, proxies socket.io → 3001)
node server.js     # Game server (port 3001)
```

### Production

```bash
npm run build      # Builds public/ → dist/
node server.js     # Serves dist/ on port 3001
# or
pm2 start server.js --name governance-town
```

### Running Tests

```bash
node --test tests/server.test.mjs
```

Tests connect to the live server at `https://vequeue.imimim.info` (configurable via `TEST_SERVER` env var).

---

## Server — Backend Systems

### Database & Persistence

All data lives in JSON files loaded into memory at startup and written to disk on every mutation:

| File | Contents |
|------|----------|
| `players.json` | All player accounts — credentials, character data, currencies, bank/transmuter positions |
| `governance.json` | Active proposal + last 20 settled proposals |
| `marketplace.json` | All active item listings (24-hour TTL) |
| `graffiti.json` | Player wall messages (max 100, rolling) |
| `hall_of_fame.json` | Top 5 players by XP, kills, spacebucks |
| `snowball_enemies.json` | Cascading boss enemies currently alive in the world |

**Player record structure:**

```javascript
{
  accountId: "abc123",
  username: "PlayerOne",
  pin_hash: sha256("vq2026:" + pin),
  created: 1712345678000,
  updated: 1712389000000,
  data: {
    // Client-authoritative (server clamps; never overwrites from server)
    nickname, color, hairColor, gender, skinTone,
    species, class_, stats, hp, maxHp, mp, maxMp,
    xp, level, statPoints, inventory, accessory, equippedArmor,
    maxInvSlots, quests, kills, zoneSeniority,
    dungeonBossDefeated, cavernBossDefeated, /* ...boss flags */

    // Server-authoritative (client cannot modify these)
    spacebucks, schmeckles, alUSD, alETH, alcx,
    lockedAlcx, alcxVoteLocks,
    bankPositions: [ { collateral, deposited, borrowed, debt, claimed, interest, openedAt } ],
    transmuterDeposits: [ { type, amount, available } ],

    // Internal
    _lastZoneYield, _lastQueueYield,
  }
}
```

### Authentication

| Event | Description |
|-------|-------------|
| `auth_register` | Creates account. Username 2–20 chars, PIN 4+ digits. PIN is SHA-256 hashed with salt `vq2026:`. Duplicate usernames rejected. |
| `auth_login` | Returns `savedData` on success. If another session exists for this account, it is disconnected. Returns all server-authoritative fields (currencies, bank positions, etc.) which the client cannot forge. |

New accounts are created with all currencies set to 0 server-side (except ALCX, which starts at 10), regardless of what the client sends on its first `save_character`.

### Economy: Five Currencies

| Currency | Symbol | Peg | Source | Sink |
|----------|--------|-----|--------|------|
| **Spacebucks** | 🪙 | $1.00 (hardcoded) | Enemy drops, quests, loot chests | Shop purchases, bank deposit, exchange |
| **Schmeckles** | 💀 | Live spot ETH price (~$2,100+) | Deep-world enemy kills, special drops | Bank deposit, exchange |
| **alUSD** | $ | Live alUSD market price (~$0.99) | Bank borrow (90% of spacebucks), exchange | Transmuter deposit, exchange, quest rewards |
| **alETH** | ⟠ | Live alETH token price (~$2,000+) | Bank borrow (90% of schmeckles), exchange | Transmuter deposit, exchange, market |
| **ALCX** | ⚗ | Live ALCX price | Zone seniority yield, queue patience, quest rewards | Queue-jump bids, governance votes |

All five currencies have independent live prices from CoinGecko (see [Live Price Feeds](#live-price-feeds)). This creates real spread between pairs — for example, alUSD (~$0.994) vs spacebucks ($1.000) is a ~0.6% arbitrage opportunity through the exchange.

### Currency Exchange

**Event:** `currency_exchange` `{ from, to, amount }`

**Formula:**
```
gross    = amount × (rate[from] / rate[to])
fee      = gross × 0.003          (0.3%)
received = round(gross − fee, dp)
```

Where `dp` is 4 decimal places for alETH, alcx, and schmeckles; 2 for spacebucks and alUSD.

Exchange rates at runtime:
```javascript
rates = {
  spacebucks: 1,                // hardcoded $1
  schmeckles: livePrices.ETH,   // spot ETH price
  alUSD:      livePrices.alUSD, // live alUSD (~$0.99)
  alETH:      livePrices.alETH, // alETH token price (distinct from ETH)
  alcx:       livePrices.alcx,  // live ALCX
}
```

**Arbitrage pairs** (illustrative at typical prices):
- `spacebucks ↔ alUSD`: ~0.6% spread (alUSD depeg)
- `schmeckles ↔ alETH`: ~3–5% spread (alETH liquid staking discount)

The 0.3% exchange fee goes to the protocol treasury.

### Bank (Self-Repaying Loans)

The bank implements Alchemix's core mechanic: deposit collateral, borrow a synthetic, and the debt repays itself over time from yield.

**Events:** `bank_borrow`, `bank_claim`, `bank_sync`

#### Borrowing

| Collateral | Synthetic Minted | LTV |
|------------|-----------------|-----|
| Spacebucks | alUSD | 90% |
| Schmeckles | alETH | 90% |

Example: Deposit 100 spacebucks → borrow up to 90 alUSD. Server deducts spacebucks and credits alUSD atomically.

#### Debt Repayment (Yield + Redemption Ticks)

Every **15 minutes**, the server runs two passes for all open bank positions:

**Yield pass** (collateral earns while loan is outstanding):
```
SB/alUSD positions:  yieldAmount = debt × 0.002   (0.2% per tick)
SCH/alETH positions: yieldAmount = debt × 0.001   (0.1% per tick)
debt -= yieldAmount
```

**Redemption pass** (governance-controlled repayment):
```
redemptionAmount = debt × redemptionRate   (default 0.5%)
redemptionFee    = redemptionAmount × 0.005
redeemed         = redemptionAmount − redemptionFee
debt -= redeemed
```

- `redemptionRate` is set by governance vote (range 0.1%–2.0%)
- The redemption fee goes to treasury
- At 0.5% redemption + 0.2% yield per 15-min tick, a SB/alUSD debt half-life is ~8 hours

#### Post-Repay Interest

Once `debt ≤ 0.001`, the position starts accruing interest:
```
interest += deposited × 0.001   (0.1% per tick)
```

#### Claiming

When debt is fully repaid, players can claim their original collateral plus any accrued interest via `bank_claim { idx }`.

#### Bank → Transmuter Connection

Each earmark tick also distributes redeemed collateral to transmuter depositors (see [Transmuter](#transmuter)).

### Transmuter

The transmuter lets players lock synthetic assets and receive redeemed collateral as bank positions repay.

**Events:** `transmuter_claim`, `transmuter_withdraw`, `transmuter_sync`

#### Depositing

Players deposit alUSD or alETH. Deposits are held server-side. The transmuter is one-directional: deposited synthetics wait for redemption events.

#### Redemption Distribution

Each bank tick distributes the redeemed collateral pro-rata among transmuter depositors of the matching type:
- alUSD depositors receive redeemed spacebucks
- alETH depositors receive redeemed schmeckles

The distribution is proportional to each depositor's share of the total transmuter pool.

#### Early Exit

If a player wants their synthetics back before redemption:
```
exitFee      = deposit × 0.10   (10% early exit penalty)
returned     = deposit − exitFee
```
The exit fee goes to the treasury.

#### Claiming Redeemed Collateral

Once a deposit's `available` balance grows (from redemption events), the player can claim it via `transmuter_claim { idx }`.

### Queue System

The queue is the veQueue core mechanic: time is a scarce resource and patience is rewarded.

**Events:** `queue_join`, `queue_leave`, `queue_auction_bid`, `queue_fast_exit`

#### Structure

- Two economic zones: **Marketplace** and **Treasury**
- Each zone has an **entry queue** (to get in) and an **exit queue** (to leave)
- The server ticks each queue every **10 seconds**, serving the front player
- 4–7 NPC bots seed each queue organically

#### ALCX Locking

When a player joins a queue, their free ALCX wallet is locked:
```
lockedAlcx += G.alcx
G.alcx      = 0
```
This locked ALCX is their governance weight. The lock persists for the **entire veQueue district visit** (Marketplace, Treasury, and Governance Chamber). Free ALCX is restored (minus any vote locks for active proposals) only when the player leaves the district entirely.

#### Patience Yield

Players earn ALCX while waiting:
- **Queue patience:** +1 ALCX every ~2 minutes while waiting in queue
- **Zone seniority:** +1 ALCX every 5 minutes spent inside a zone (seniority bonus grows slowly over time)

These yields are granted server-side via `alcx_yield_request` to prevent client forgery.

#### Queue Jumping

**Auction bid** (`queue_auction_bid { zone, queueType, alcx }`):
- Pay ALCX to jump to the front of the line
- The ALCX paid is distributed evenly among all other waiting players
- Encourages patience: jumpers pay the patient

**Fast exit** (`queue_fast_exit { zone, queueType }`):
- Pay a fee to skip the exit queue entirely
- Allows leaving the zone immediately when demand is high

#### Whale Arrivals

Randomly, the server spawns a "whale" player with a large ALCX queue lock. This signals high economic activity and gives waiting players governance weight context.

### Governance

Players vote with their **queue-locked ALCX** (not free wallet ALCX) to set the bank redemption rate.

**Events:** `governance_propose`, `governance_vote`

#### Proposal Lifecycle

1. Any player with locked ALCX submits a proposal: `{ rate: 0.008, amount: 50 }` (rate in decimal, e.g. 0.8%)
2. Proposal is active for **24 hours**
3. Other players vote YES or NO with their locked ALCX: `{ proposalId, choice: 'yes'|'no', amount }`
4. Voted ALCX is frozen (locked) until proposal settles
5. At expiry, the server settles:
   - If YES weight > NO weight **and** total weight ≥ quorum (50 ALCX) → earmark rate is updated
   - Otherwise → no change
6. All vote locks are released; ALCX returned to players' locked pools

#### Governance Parameters

| Parameter | Default | Governance-adjustable |
|-----------|---------|----------------------|
| Redemption rate | 0.5% per tick | Yes (0.1%–2.0%) |
| Quorum | 50 ALCX | No |
| Proposal duration | 24 hours | No |

### Live Price Feeds

The server fetches prices from CoinGecko every **60 minutes**:

```javascript
GET /api/v3/simple/price?ids=alchemix-usd,ethereum,alchemix-eth,alchemix&vs_currencies=usd&precision=4
```

| CoinGecko ID | Maps to | Used for |
|-------------|---------|----------|
| `alchemix-usd` | `livePrices.alUSD` | alUSD exchange rate |
| `ethereum` | `livePrices.ETH` | Schmeckles exchange rate (spot ETH) |
| `alchemix-eth` | `livePrices.alETH` | alETH exchange rate (liquid staking token) |
| `alchemix` | `livePrices.alcx` | ALCX exchange rate |

These prices are broadcast to all connected clients via `price_update`.

#### Price Events

The server detects and broadcasts notable price movements:

| Event | Trigger | Town Chat Message |
|-------|---------|-------------------|
| alUSD depeg | `alUSD < 0.98` | Transmuter arbitrage window alert |
| ETH pump | ETH ≥ +5% | Schmeckles value increase alert |
| ETH drop | ETH ≤ −5% | Schmeckles value decrease warning |
| alETH/ETH spread | `|alETH − ETH| / ETH > 1.5%` | Arbitrage opportunity alert |
| ALCX pump | ALCX ≥ +10% | Queue-jump cost increase |
| ALCX drop | ALCX ≤ −10% | Queue-jump cost decrease |

### World Events

Dynamic world events affect gameplay for all players simultaneously.

| Event | Effect | Duration |
|-------|--------|----------|
| 🌑 Dark Storm | 2× enemy encounter rate | 3–8 min |
| 🩸 Blood Moon | 2× currency drops from enemies | 3–8 min |
| 🛒 Merchant Convoy | 20% discount at all shops | 3–8 min |
| 👾 Monster Swarm | 3× enemy encounter rate | 3–8 min |
| 💎 Treasure Surge | 50% richer loot from all sources | 3–8 min |

Events spawn every ~12 minutes with 45% probability. Only one event is active at a time. Start and end are broadcast to all players in the affected zone.

### Snowball Enemies

When a player drops loot in the world zone, there is a **40% chance** a snowball enemy spawns nearby (if none is already close).

#### Cascading Power

Each time a snowball enemy is killed, it gets **stronger** and accumulates its killer's loot:

```
HP  += 30% per kill
ATK += 2 per kill
DEF += 0.5 per kill
name escalates: Feral → Bloodsoaked → Vengeful → Empowered → Dreadlord → ...
```

The enemy's loot pool grows by 50% of each new kill's loot value. A snowball enemy that has been killed 10 times is enormously powerful but drops correspondingly huge rewards.

Snowball enemies have a 30-minute TTL and are cleared on server restart. The `snowball_kill` event is server-authoritative: the server verifies the kill and grants the accumulated loot.

### Loot System

**Spawning:** Combat victory triggers `loot_drop` with a set of items and currencies.

**TTL:** Loot despawns after **10 minutes** if unclaimed.

**Pickup (`loot_pickup { lootId }`):**
- Server validates the loot exists
- Adds currencies to server-owned fields
- Adds items to inventory (if space available)
- Applies **20% durability decay** to all picked-up items (anti-farming)
- Triggers snowball enemy check (40% spawn chance)

**Item inventory:**
- Slots 0–1: Equipped (weapon, armor)
- Slots 2–7: Backpack (6 slots, default)
- Slots 8–11: Expandable via the Expansion Vendor (costs alUSD per slot)

### Marketplace

Player-to-player item trading via consignment.

**Events:** `market_list`, `market_buy`, `market_cancel`

| Action | Details |
|--------|---------|
| List | Sell any unbound item for alUSD or alETH. Item removed from inventory immediately. |
| Buy | Server deducts buyer's currency, adds item to buyer's inventory. Seller receives 95% of price immediately. 5% → treasury. |
| Cancel | Seller can cancel at any time; item returned. |
| Expiry | Listings automatically delist after 24 hours. Item returned to seller. |

Bound items (from quest rewards, special drops) cannot be listed.

### Hall of Fame

Top 5 players tracked across three categories:

- **Top XP** — total experience earned
- **Top Kills** — total enemy kills
- **Top Gold** — spacebucks balance

Updated on every `save_character`. Broadcast to all players when standings change.

### Treasury

The protocol treasury accumulates fees from all economic activity:

| Source | Rate |
|--------|------|
| Currency exchange | 0.3% of all swaps |
| Bank redemption | 0.5% of each redemption tick |
| Transmuter early exit | 10% of withdrawn amount |
| Marketplace commission | 5% of all sales |

The treasury balance is tracked per-currency (alUSD and alETH) and displayed in the governance panel.

### Socket Event Reference

#### Authentication
| Event (client→server) | Payload | Response |
|-----------------------|---------|----------|
| `auth_register` | `{username, pin}` | `auth_result {ok, msg, savedData}` |
| `auth_login` | `{username, pin}` | `auth_result {ok, msg, savedData}` |

#### Character
| Event | Payload | Notes |
|-------|---------|-------|
| `save_character` | `{nickname, level, xp, ..., inventory, quests}` | Server clamps all numeric fields; ignores all currency fields |
| `join` | `{nickname, color, ...zone}` | Adds player to room; broadcasts `player_joined` |
| `move` | `{x, y, zone, dir, frame}` | 20Hz; rebroadcast to zone as `zone_pos_tick` |
| `chat` | `{text}` | Broadcasts to zone as `chat` |

#### Economy (all server-authoritative)
| Event | Payload | Response |
|-------|---------|----------|
| `currency_exchange` | `{from, to, amount}` | `currency_exchange_result {ok, from, to, received, newBal}` |
| `bank_borrow` | `{collateral, amount}` | `bank_borrow_result {ok, msg, ...}` |
| `bank_claim` | `{idx}` | `bank_claim_result {ok, returned, interest}` |
| `transmuter_claim` | `{idx}` | `transmuter_claim_result {ok, amount, type}` |
| `transmuter_withdraw` | `{idx}` | `transmuter_withdraw_result {ok, returned, fee}` |
| `loot_pickup` | `{lootId}` | `loot_claimed {ok, items, currencies}` |
| `quest_reward` | `{alUSD, alETH, alcx}` | saves server-side |
| `alcx_yield_request` | `{source}` | `alcx_yield {amount}` |
| `market_list` | `{inventorySlot, price, currency}` | `market_list_ok` |
| `market_buy` | `{listingId}` | `market_buy_result {ok, item}` |
| `market_cancel` | `{listingId}` | `market_cancel_ok` |
| `snowball_kill` | `{id}` | `snowball_kill_result {ok, loot}` |

#### Queue
| Event | Payload | Response |
|-------|---------|----------|
| `queue_join` | `{zone, queueType, locked}` | `queue_joined`; periodic `queue_state` |
| `queue_leave` | `{zone, queueType, passingThrough?}` | queue advances; `passingThrough:true` skips ALCX refund (gate transit) |
| `queue_auction_bid` | `{zone, queueType, alcx}` | `auction_result` |
| `queue_fast_exit` | `{zone, queueType}` | `queue_served` |

#### Governance
| Event | Payload | Response |
|-------|---------|----------|
| `governance_propose` | `{rate, amount}` | `gov_result {ok, proposal}` |
| `governance_vote` | `{proposalId, choice, amount}` | `gov_result {ok}` |

#### Server → Client Broadcasts
| Event | When |
|-------|------|
| `price_update` | CoinGecko fetch (hourly) |
| `price_event` | Notable price movement detected |
| `world_event_start` | New world event spawned |
| `world_event_end` | World event expires |
| `hall_of_fame` | Leaderboard changes |
| `world_loot_added` | New loot drop |
| `world_loot_removed` | Loot claimed or expired |
| `snowball_update` | Snowball enemy state change |
| `graffiti_state` | Wall message posted |
| `gov_state` | Governance state broadcast (on login, vote, settle) |
| `gov_vote_released` | Vote locks freed after proposal settles |

---

## Client — Frontend Systems

### Global State (G)

All client-side state lives in a single exported object `G` in `state.js`. It is never serialized by the client with currency fields — those always come from the server.

```javascript
// World & movement
G.zone          // 'world' | 'town' | 'dungeon' | 'cavern' | ...
G.x, G.y        // pixel position
G.dir           // 'down'|'up'|'left'|'right'
G.frame         // animation frame (0–3)

// Character
G.nickname, G.species, G.class_, G.level, G.xp
G.hp, G.maxHp, G.mp, G.maxMp
G.stats         // {str, vit, agi, end, lck}
G.statPoints    // unspent stat points
G.inventory     // [{name, icon, dmg, def, rarity, bound, durability, ...}]
G.equippedArmor, G.accessory

// Currencies (always written from server responses, never client-modified for saves)
G.spacebucks, G.schmeckles, G.alUSD, G.alETH, G.alcx
G.lockedAlcx, G.alcxVoteLock

// Economic state (always written from server)
G.bankPositions[]     // active loan positions
G.transmuterDeposits[] // active transmuter deposits

// Governance
G.govProposals[], G.govHistory[]
G.redemptionRate, G.govQuorum

// World
G.worldLoot[]         // visible loot on the ground
G.marketListings[]    // all active marketplace listings
G.worldEvent          // current world event (or null)
G.snowballEnemies[]   // cascading bosses in the world
G.graffiti[]          // wall messages

// Live data
G.livePrices          // {alUSD, alETH, ETH, alcx} — from server
G.treasury            // {alUSD, alETH} — protocol fee accumulation

// UI state
G.battle              // combat state (or null)
G.npcDialog           // active NPC dialog (or null)
G.paused, G.godMode, G.persist
```

### Game Loop

`game.js` runs a `requestAnimationFrame` loop that:

1. **Input:** Read `input.js` key states; compute intended movement delta
2. **Collision:** Check 4-corner hitbox against solid tiles in current zone
3. **Zone transitions:** Detect door tiles; trigger queue prompts or zone switches
4. **NPC interaction:** Proximity check to NPCs; `E` key opens dialog/shop
5. **Encounter check:** Random roll based on depth, world event, tile type
6. **Battle:** If encounter triggered, pause movement and enter combat flow
7. **Render:** Call `render.js` to draw all canvas layers
8. **HUD update:** Refresh currency displays, XP bar, zone name, player count

The loop targets 60fps. Socket.io position broadcasts are sent at ~20Hz independently.

### Rendering

`render.js` draws to five stacked `<canvas>` elements:

| Layer | Contents |
|-------|----------|
| Background | Sky / floor fill |
| Tiles | World tilemap (grass, road, water, walls, etc.) |
| Sprites | Players, NPCs, loot sparkles, snowball enemies |
| Foreground | Trees, rooftops, overlapping elements |
| UI | HUD, minimap, XP bar, damage numbers, chat log |

**Sprites** are palette-swapped pixel art. Player color, hair color, and skin tone are applied at runtime by recoloring specific pixel values. Species and class affect the base sprite sheet used.

**Water tiles** animate through 8 frames. **Combat** fades in/out with a pixel transition effect. **Damage numbers** float upward and fade.

**Minimap** renders a zoomed-out pixel overview of the current zone with player dot.

### Combat

Encounters trigger when the player walks on a non-road tile at sufficient depth from town center. Encounter probability:

```
baseChance = 0.18 + (depth / worldSize) × 0.48   (18%–66% per step)
worldEventMultiplier = 2× (Dark Storm) or 3× (Monster Swarm)
```

#### Enemy Scaling

Each enemy type has a base difficulty multiplier (0.55–2.2). The server's encounter system scales enemy stats to player power:

```
playerPower = (avgStat + 0.85 × weaponDmg)
enemyHP     = base × multiplier × (1 + depth bonus)
enemyATK    = similar scaling
```

#### Damage Calculation

```
rawDmg  = attacker.atk × rand(0.85, 1.15)
reduced = rawDmg − defender.def × 0.5
damage  = max(1, reduced)
```

Type weaknesses apply multipliers:

| Type | Weak to | Resistant to |
|------|---------|-------------|
| Undead | Holy (1.8×) | Physical (0.7×) |
| Golem | Physical (1.5×) | Magic (0.4×) |
| Spectre | Magic (1.6×), Holy (1.8×) | Physical (0.3×) |

#### Death Penalty

On player death:
- Lose 30% of all currency balances
- Drop all unbound items as world loot
- Bound items (quest rewards, special gear) are kept
- Respawn at zone entry point

#### Leveling

```javascript
xpForLevel(l) = 100 × 1.5^(l−1)
```

Level up awards:
- +1 max HP
- +3 stat points to distribute (STR, VIT, AGI, END, LCK)
- VIT investment: +5 max HP per point

Level cap: **50**

### Quests

Quests are defined in `data.js` with prerequisite chaining. Each quest has:

```javascript
{
  id: 'quest_1',
  name: 'First Blood',
  requires: null,           // prerequisite quest ID or null
  offerDialog: [...],       // NPC greeting lines
  activeDialog: [...],      // NPC lines while quest is active
  readyDialog: [...],       // NPC lines when objective complete
  completeDialog: [...],    // NPC lines on turn-in
  objective: { type: 'kill', target: 'Wolf', count: 3 },
  reward: { spacebucks: 50, xp: 100, item: {...} },
}
```

**Level scaling:** Quest rewards scale by +8% per level above 1.

**Quest turn-in** is server-authorized: the server adds currencies via `quest_reward` before the client saves, preventing turn-in exploits.

**Abandon penalty:** Abandoning a quest mid-progress costs 50 alUSD.

### User Interface

All UI overlays are in `ui.js` and `index.html`. Key overlays:

| Overlay | Access | Contents |
|---------|--------|----------|
| **Pause/Inventory** | Esc | 8–12 slot inventory grid, equipped gear, stats panel, quest log |
| **Shop** | NPC interact | Buy items, repair gear (2 alUSD/durability), vendor descriptions |
| **Bank** | NPC interact | Open positions with debt % bar, borrow form, claim button |
| **Transmuter** | NPC interact | Deposit form, redemption progress bars, early exit with fee |
| **Exchange** | Pause menu | Live price display, from/to selectors, amount input, fee preview |
| **Market** | NPC interact | Browse tab (sortable listings), List tab (select inventory item, set price) |
| **Governance** | NPC interact | Active proposal vote bars, history, new proposal form |
| **Help** | Pause menu | Tabbed guide covering all game mechanics |
| **Hall of Fame** | NPC interact | Top 5 leaderboard by XP/kills/gold |
| **Changelog** | HUD button | Versioned patch notes with "new" badge |

**Exchange UI** shows each currency's live USD value. Schmeckles are shown as `2.5000 💀 (≈$5,370)` using the live ETH price.

**HUD** always shows: zone name, HP/MP bars, level, XP bar, all five currency balances, online player count, mute toggles, changelog badge.

### Controls

| Key | Action |
|-----|--------|
| Arrow keys / WASD | Move |
| E / Space | Interact with NPC or object |
| Esc | Open pause / close overlay |
| T | Open chat |
| G | Write graffiti at current position |
| M | Toggle minimap |
| Konami code | God mode (developer unlock) |

**Touch controls:** Tap canvas to walk toward tap point. On-screen buttons for ACT (interact), ESC (pause), MAP (minimap), and fullscreen.

### Audio

`audio.js` uses the Web Audio API (with silent fallback) for:

| Sound | Trigger |
|-------|---------|
| Step | Each movement frame |
| Coin | Currency received |
| Attack / Damage | Combat hits |
| Level up | XP threshold crossed |
| Select | Menu navigation |
| Error | Invalid action |
| Buy | Successful purchase |

Music tracks loop: title screen, exploration, and battle each have their own theme. SFX and music can be toggled independently from the HUD.

---

## World & Maps

**Zones:**

| Zone | Size | Contents |
|------|------|----------|
| `world` | 220×150 tiles | Main overworld: wilderness, forests, rivers, mountains |
| `town` | 30×30 | Safe hub: all NPCs, no encounters |
| `dungeon` | 50×36 | Hand-crafted dungeon with boss room |
| `cavern` | — | Sub-zone: cave enemies |
| `hideout` | — | Sub-zone: bandit camp |
| `ruins` | — | Sub-zone: undead stronghold |
| `village` | — | Sub-zone: allied village with unique quests |

**Tile types (27):** Grass, road, wall, tree, water, door, fountain, chest, sand, snow, lava, dungeon floor/wall, water bridge, swamp, etc.

**NPC placements (town):**

| NPC | Role |
|-----|------|
| Bank Clerk | Bank UI — borrow, view positions, claim |
| Transmuter Alchemist | Transmuter UI — deposit, claim, early exit |
| Exchange Broker | Currency exchange |
| Market Stall Keeper | Marketplace browse and list |
| Governance Hall Steward | Governance voting and proposals |
| Quest Giver (×2) | Progressive quest chains |
| Shop Vendor (×2) | Buy/repair weapons and armor |
| Expansion Vendor | Buy extra inventory slots |
| Hall of Fame Curator | Leaderboard display |
| Town Crier | Broadcasts price events and world alerts |

**Door triggers** connect zones with entry/exit queues for economic zones, or free transitions for non-economic zones.

---

## Character System

### Species

| Species | Stat Caps | HP Base | Flavor |
|---------|-----------|---------|--------|
| Human | Balanced | 100 | Versatile |
| Elf | AGI/LCK high | 85 | Glass cannon |
| Dwarf | VIT/END high | 120 | Tank |
| Goblin | AGI high, STR low | 80 | Evasive |
| Orc | STR high, END high | 130 | Brawler |
| Robot | END high, LCK low | 110 | Consistent |

### Classes

| Class | Stat Floor | Role |
|-------|-----------|------|
| Warrior | STR/VIT floor | Frontline fighter |
| Mage | — (no floor, but magic scaling) | Spell damage |
| Rogue | AGI floor | Speed and crits |
| Paladin | VIT/END floor | Sustain, holy bonus |

### Stats

| Stat | Effect |
|------|--------|
| STR | Physical attack power |
| VIT | Max HP (+5 per point) |
| AGI | Speed, dodge, crit chance |
| END | Defense scaling, endurance |
| LCK | Drop rates, crit bonus |

### Items

**Weapons** contribute `dmg` to attack rolls. **Armor** contributes `def` to damage reduction. **Relics** (accessories) provide stat bonuses without occupying weapon/armor slots.

**Rarity tiers:** Common → Rare → Epic → Legendary (color coded; higher rarity = higher stat ranges)

**Durability:** Gear decays on loot pickup (−20%) and combat damage. At 0 durability, gear provides no bonus. Repaired by vendors at 2 alUSD per point.

**Bound vs. unbound:** Quest rewards and some special drops are bound (cannot be sold or dropped). Purchased and looted items are unbound (tradeable).

---

## Security Model

Victory Quest uses a hybrid client/server authority model:

### Client-authoritative fields (server validates and clamps)

These fields are sent in `save_character` and the server accepts them — with validation:

| Field | Clamp |
|-------|-------|
| `level` | 1–50 |
| `xp` | 0–1,000,000 |
| `kills` | 0–999,999 |
| `zoneSeniority` | 0–999 |
| `hp` / `mp` | 0–maxHp/maxMp |
| String fields | Length-limited, sanitized |

### Server-authoritative fields (never accepted from client)

The server always overwrites these from its own database, ignoring whatever the client sends:

- `spacebucks`, `schmeckles`, `alUSD`, `alETH`, `alcx`
- `lockedAlcx`, `alcxVoteLocks`
- `bankPositions`, `transmuterDeposits`

### New-account hardening

On the very first `save_character` for a new account (where `pdb[id].data` is null or has no existing currency fields), the server initializes all currencies to **0** and all array fields to `[]`, regardless of client payload. This prevents a first-save inflation attack.

### No HMAC signatures

The HMAC system (`signPlayerData`/`verifyPlayerData`) was removed. It provided weak protection (secret in source code) and caused data loss: any server handler that mutated currencies needed to re-sign before saving, and missing re-signs caused tamper-detection false positives on restart, wiping player data.

The current model is simpler and safer: server handlers write directly to `pdb` and call `saveDb()`. No signature needed because the server never trusts the client for economy fields.

### Transaction logging

All `currency_exchange` calls emit console logs:
```
[Exchange] accountId: 1 schmeckles→alUSD | bal_before=3.0000
[Exchange] OK: gross=2145.73 fee=6.44 received=2139.29 | schmeckles_after=2.0000 alUSD_after=2303.36
```
This allows live debugging of economy transactions via `pm2 logs`.

---

## Test Suite

`tests/server.test.mjs` uses Node's built-in `node:test` runner with `socket.io-client` to test the live server.

```bash
node --test tests/server.test.mjs
# or
TEST_SERVER=https://vequeue.imimim.info node --test tests/server.test.mjs
```

### Test Coverage (37 tests)

**Authentication (7 tests)**
- Register new account
- Reject duplicate username
- Reject username < 2 chars
- Reject PIN < 4 digits
- Login with correct credentials
- Reject wrong PIN
- Reject unknown user

**save_character — client-authoritative fields (5 tests)**
- Nickname, level, xp, kills persist across login
- Level clamped to [1, 50]
- XP clamped to [0, 1,000,000]
- Kills clamped to [0, 999,999]
- zoneSeniority clamped to [0, 999]

**save_character — server-owned field protection (4 tests)**
- Client cannot inflate spacebucks
- Client cannot inflate alUSD
- Client cannot inflate alcx
- Client cannot fabricate bank positions

**Currency exchange validation (6 tests)**
- Unauthenticated exchange rejected
- Same-currency exchange rejected
- Unknown currency rejected
- Zero/negative amount rejected
- Insufficient balance rejected
- Exchange with sufficient balance succeeds

**Bank validation (3 tests)**
- Borrow with zero collateral balance rejected
- Borrow of zero amount rejected
- Borrow with unknown collateral type rejected

**Exchange rate unit tests (8 tests)**
- Spacebucks ↔ alUSD cross-rate with live prices
- Schmeckles ↔ alUSD using ETH price (not alETH price)
- alETH ↔ alUSD using alETH token price
- ALCX ↔ spacebucks
- 0.3% fee always applied and deducted
- 4dp precision for schmeckles (ETH-priced)
- 2dp precision for spacebucks/alUSD

**Bank LTV unit tests (2 tests)**
- 90% LTV for spacebucks→alUSD
- 90% LTV for schmeckles→alETH

**Transmuter fee unit tests (2 tests)**
- 10% exit fee on early withdrawal
- Net received = deposit × 0.90

### Test Helpers

```javascript
mkSocket()         // Create socket.io-client connection
rpc(sock, event, payload, responseEvent)  // Promise wrapper for socket RPC
loginSocket()      // Register + login + return authenticated socket
loginWithData()    // loginSocket() + save_character (initializes pdb.data for bank/exchange tests)
saveChar(sock, overrides)  // Emit save_character with field overrides
```

Each test run creates throw-away accounts (`tb_<timestamp_base36>`) to avoid polluting live data.

---

## Deployment

### Server

The game runs on a DigitalOcean droplet at `24.199.98.242`:
- App path: `/root/vequeue-demo`
- Process manager: pm2, process name `governance-town`
- Nginx reverse proxy: `https://vequeue.imimim.info` → `http://127.0.0.1:3001`

### Deploy workflow

```bash
# From local machine
ssh -i /path/to/deploy_key root@24.199.98.242 \
  "cd /root/vequeue-demo && git pull && npm run build && pm2 restart governance-town"
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3001` | HTTP server port |
| `ADMIN_PASSWORD` | `vq-admin-2026` | Admin namespace auth |
| `TEST_SERVER` | `https://vequeue.imimim.info` | Test suite target |

### Logs

```bash
pm2 logs governance-town          # Live server logs
pm2 logs governance-town --lines 200  # Last 200 lines
```

Economy transactions, price fetches, and errors all log to stdout.

---

## Admin Panel

`/admin.html` connects to the `/admin` Socket.io namespace (password-protected).

**Capabilities:**

| Action | Description |
|--------|-------------|
| Broadcast message | Send announcement to all players |
| Set earmark rate | Override governance-set rate immediately |
| Adjust spawn chance | Tune enemy encounter probability |
| Clear world loot | Remove all loot from the world |
| Trigger whale | Spawn a high-ALCX whale player in a queue |
| Kick player | Disconnect a socket |
| Delete user | Remove account from database |
| Real-time stats | Player count, treasury, active queues (updates every 5s) |

---

*Victory Quest is a demo of protocol-native game design. Economic mechanics — queues, yield, governance, debt — are the gameplay, not a skin on top of it.*
