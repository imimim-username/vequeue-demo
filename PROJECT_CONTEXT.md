# Governance Town / veQueue Demo — Project Context

_Last updated: 2026-04-05_

---

## ⚡ Deploy (One Command)

```bash
ssh -i /workspace/group/.ssh/droplet_deploy -o StrictHostKeyChecking=no root@24.199.98.242 \
  "cd /root/vequeue-demo && git pull origin main && pm2 restart governance-town"
```

| Detail | Value |
|--------|-------|
| Droplet IP | `24.199.98.242` |
| SSH user | `root` |
| SSH key | `/workspace/group/.ssh/droplet_deploy` |
| Game directory | `/root/vequeue-demo` |
| PM2 process | `governance-town` |
| GitHub push key | `/workspace/extra/github-keys/github_deploy` |
| Live URL | `https://vequeue.imimim.info` |

**Full deploy flow:**
1. Make changes in `/workspace/extra/gits/vequeue-demo/`
2. Bump asset version in `public/index.html` (all `v=YYYYMMDDX` occurrences, currently `v=20260405e`)
3. `git add … && git commit -m "…"`
4. `GIT_SSH_COMMAND="ssh -i /workspace/extra/github-keys/github_deploy -o StrictHostKeyChecking=no" git push origin main`
5. Run the one-liner above to pull + restart on the droplet

---

## What This Project Is

A browser-based **multiplayer educational RPG** teaching the **veQueue protocol** — a rate-limited governance token locking mechanism with entry/exit queues, watermark/principal protection, ERC-6909 NFT positions, and vqShares.

- **Live at:** `https://vequeue.imimim.info`
- **Repo:** `/workspace/extra/gits/vequeue-demo/`
- **GitHub:** `github.com:imimim-username/vequeue-demo.git`
- **GitHub deploy key:** `/workspace/extra/github-keys/github_deploy`

---

## Current Asset Version

`v=20260402u` — set in `public/index.html` for CSS + all JS files. Bump each deploy.

---

## Architecture

| Layer | Tech |
|-------|------|
| Backend | Node.js + Socket.io, `server.js` |
| Frontend | `public/index.html` + `public/js/*.js` |
| Maps | `public/js/maps.js` |
| Rendering | `public/js/render.js` |
| Audio | `public/js/audio.js` |
| Data/config | `public/js/data.js` — `CFG`, `ZONES`, `ITEMS`, `ENEMIES`, etc. |
| Game logic | `public/js/game.js` — main game loop, all UI, socket handlers |
| Proxy | nginx → `localhost:3001` |
| Process manager | pm2, process name `governance-town` |

Canvas is **640×416** (`W=640`, `H=416`). All drawing on `cv-ui` canvas using `ctxUI`.

---

## Key Files

### `server.js`
- Socket.io server: queue management, NPC bot cycling, auction/serve logic
- Queue zones: `marketplace`, `treasury` (both `entry` and `exit` queue types)
- NPC bots seeded at startup (4–7 per zone entry queue); cycle out/in after serving
- Excluded from auction payouts; exist only to make queue feel real
- `queue_fast_exit` handler: player pays ALCX fee to skip exit queue
- `serveNext()`: advances queue, notifies player via `queue_served` event

### `public/js/game.js`
- All game state in `G` object (top of file)
- `gameLoop()` → `updateCamera()`, input handling, tick-based logic
- `renderHUD()` — world/overworld UI
- `renderInventoryScreen()` — pause screen: equipped gear + 8-slot bag
- `renderBattle()` / `drawBattleUI()` — combat screen canvas drawing
- `renderShop()` — vendor HTML overlay
- `renderQueuePanel()` / `updateQueuePanel()` — queue HUD widget
- Socket event handlers inline (search for `socket.on(`)

### `public/js/data.js`
- `CFG` — canvas size, starting stats, currency amounts
- `ZONES` — zone definitions (w, h, entry point)
- `ITEMS`, `WEAPONS`, `ARMORS`, `ENEMIES`, `VENDORS`
- `RARITY_COLOR`, `MAX_DUR`, `PLAYER_COLORS`, `HAIR_COLORS`, `SKIN_TONES`

---

## Game State (`G` object)

Key fields to know:

| Field | Description |
|-------|-------------|
| `G.zone` | Current zone name (`'world'`, `'marketplace'`, `'treasury'`, `'battle'`, …) |
| `G.inventory[0]` | Equipped weapon |
| `G.inventory[1]` | Equipped shield |
| `G.inventory[2..7]` | Bag slots (items, potions, accessories) |
| `G.equippedArmor` | Armor item object (separate from inventory) |
| `G.battle` | Active battle state or `null` |
| `G.queueState` | `{zone, type, ticket, served}` or `null` |
| `G.lockedAlcx` | ALCX locked while in entry queue |
| `G.zoneSeniority` | Increments every 300 ticks while in economic zone |
| `G._queueServExpiry` | Timestamp: 2-min window to enter after being served |
| `G._bagMenuIdx` | Selected bag slot index (for action sheet) or `null` |
| `G.paused` | Whether inventory/pause screen is open |
| `G.shop` | Active shop `{vendorId}` or `null` |
| `G.npcDialog` | Active NPC conversation state or `null` |

---

## veQueue Mechanic (How It's Taught)

1. Player enters **Marketplace** or **Treasury** zone → prompted to join entry queue
2. Queue shows real NPC bots ahead of them — must wait their turn
3. Player can **roam freely** while waiting (background queue); notified when served
4. Once served: 2-minute window to enter the economic zone; countdown shown in queue panel
5. In zone: ALCX drip every 300 ticks, multiplied by `zoneSeniority`
6. To leave: must join **exit queue** (same mechanic in reverse)
7. Fast-exit available: pay ALCX fee to skip exit queue (`doFastExit(fee)`)

**Seniority rule:** only accumulates while `G.zone === 'marketplace' || 'treasury'` (not while roaming or in queue lobby). Resets to 0 on zone exit.

---

## Item System

### Durability
- `itemMaxDur(item)` → max based on rarity (`MAX_DUR` table in data.js)
- `stampDurability(item)` → sets `item.durability = item.maxDurability` if not already set
- `degradeItem(item, amt=1)` → reduces `item.durability` by `amt`, floored at 0
- Items degrade on hit (weapon), on being hit (shield, armor)
- Broken items show warning; repair at shops

### Bag Action Sheet
Tapping a bag item (slots 2–7) selects it (`G._bagMenuIdx = i`). An action sheet appears:
- **[⚔ EQUIP]** — `equipFromBag(idx)` — move to slot 0 or 1
- **[🧪 USE]** — `usePotion(idx)` — consume potion (heal HP)
- **[💰 SELL Nsb]** — `sellFromBag(idx)` — sell for ~40% of cost price
- **[🗑 DROP]** — `dropFromBag(idx)` — 30% durability hit, emit `loot_drop` if online
- **[✕]** — dismiss action sheet

### `dropFromBag(idx)` (added 2026-04-03)
- Copies item, applies 30% durability loss (item thrown carelessly)
- If connected: `socket.emit('loot_drop', {zone, x, y, items:[dropped], …})` → world loot pile
- If offline: discards silently
- Clears `G.inventory[idx]`, saves state

---

## Battle System

- `G.battle` holds full state: `{enemy, hp, maxHp, phase, log, turn, …}`
- Battle canvas layout (all in px, on 640×416 canvas):
  - `pY = Math.floor(H * 0.58) = 241` — top of battle panel
  - **Left column** (x=4–264): battle log (3 lines) + weapon loadout below
  - **Middle column** (x=274–449): action buttons (Attack / Magic / Item / Flee + weapon swap)
  - **Right column** (x=460–640): player sprite + HP/MP bars + turn indicator
- Weapon loadout renders in left column starting at `pY+64`, each card 18px tall — fits 4 weapons
- HP/MP text rendered **inside** bars (at `piX+3`), not outside — avoids right-edge clipping

---

## Queue Panel UI

- Rendered by `updateQueuePanel()` into `#queue-panel` div (bottom-left HUD)
- Shows: queue position, ticket number, served status, expiry countdown (red under 30s)
- Fast-exit button appears when in exit queue
- `doFastExit(fee)` deducts ALCX, emits `queue_fast_exit`
- 1-second interval refreshes countdown when served: `setInterval(…, 1000)`

---

## 2026-04-05 — `v=20260405e` — save_character hardening + data restoration

| Change | Details |
|--------|---------|
| **alETH/alUSD wiped on reload — fixed (root cause)** | `save_character` was doing a full `pdb.data = clientData` replace, silently overwriting server-authoritative fields. On load, `G.alETH` initialised to 0 before `applyServerState` ran; if `saveToServer()` fired in that window it wrote 0 to the DB. Anti-cheat only blocked *increases*, so `alETH = 0` passed unchecked |
| **Bidirectional currency protection** | `save_character` now blocks catastrophic drops: if `data.alETH < prev.alETH * 0.1` and `prev.alETH > 0.01` the save is rejected and the server value is kept. Same guard applied to alUSD |
| **Server-only fields preserved** | After accepting a client save, `alcxVoteLocks`, `_lastZoneYield`, and `_lastQueueYield` are re-injected from the pre-save DB snapshot so they can never be wiped by a client payload |
| **Missing pdb guard added** | `save_character` now early-returns if `pdb[socket.accountId]` is undefined (previously would throw if pdb entry missing) |
| **Player data restoration** | Affected account restored: alETH back-calculated from active schmeckles bank loan (72.9) minus transmuter deposit (54.83) and Elven Ward purchase (0.7) = **17.37 alETH**; alUSD from active spacebucks loan (1015.2) minus transmuter (243.38), War Axe (280), Leather Armor (80), misc (≈30) = **381.82 alUSD** |

---

## 2026-04-05 — `v=20260405d` — mechanic bug fixes + NPC accessibility

| Change | Details |
|--------|---------|
| **Exchanger Rex unreachable — fixed** | Rex was placed at `TOWN_OX+24, TOWN_OY+8`, inside the Governance Hall wall box (rows 2–11, cols 22–38 are all WALL/MARBLE). No walkable path existed within 2-tile interaction range. Moved to `TOWN_OX+23, TOWN_OY+13` on the main road east of the fountain |
| **Armorer Brix unreachable — fixed** | Brix was at `TOWN_OY+11`, the bottom wall row of Governance Hall. Moved to `TOWN_OY+12` (open grass tile) |
| **ALCX zone/queue yield — server-authorised** | Client previously self-credited `G.alcx += drip` and then called `saveToServer()`, bypassing anti-cheat (server only blocked increases). Replaced with a request/response pattern: client emits `alcx_yield_request{source}`, server validates zone/queue membership, enforces 4s/8s throttle, pre-updates pdb.alcx, then emits `alcx_yield{amount}` back to client |
| **Fast-exit fee formula** | Changed from 5% of wallet ALCX (favoured wealthy players, meaningless for broke ones) to **2.5 ALCX × positions ahead in queue**. One position ahead = 2.5 ALCX fee; ten positions ahead = 25 ALCX |
| **Vote-locked ALCX shielded from fast-exit** | `doFastExit` fee is deducted from free ALCX only — `G.alcxVoteLock` portion (already removed from `G.alcx`) is no longer double-deducted |
| **Vote-locked ALCX shielded from auction bids** | `doAuctionBid` similarly no longer subtracts the vote lock a second time |
| **Queue-leave retains vote-committed stake** | All queue-leave paths now compute `refund = lockedAlcx − alcxVoteLock` and leave `G.lockedAlcx = G.alcxVoteLock`, so vote stake cannot be reclaimed by simply leaving the queue |
| **Vote settlement refunds stake to wallet** | On proposal passage/failure, server now credits `voteAmt` back to `pdb.alcx`, reduces `pdb.lockedAlcx`, and emits `gov_vote_released{refundAmt}` to the voter. Previously vote-committed ALCX was deleted with no refund |
| **`_govIdSeq` persisted across restarts** | Proposal IDs are now unique across server restarts (previously reset to 1, risking stale `alcxVoteLocks` matching a new Proposal #1) |

---

## 2026-04-05 — `v=20260405c` — queue/governance state-tracking bug fixes

| Change | Details |
|--------|---------|
| **`pdb.lockedAlcx` never updated on queue_join** | Queue stake was tracked in `G.lockedAlcx` client-side and saved via `save_character`, but `queue_join` on the server never updated `pdb.data.lockedAlcx` directly. Governance vote validation always read 0 from pdb → everyone blocked from voting even after joining the queue. Fixed: `queue_join` and `queue_leave` now both update `pdb.data.alcx` and `pdb.data.lockedAlcx` atomically and call `saveDb()` |
| **`lockedAlcx` anti-cheat added** | `save_character` now applies the same increase-block guard to `lockedAlcx` as it does to `alcx`, `alUSD`, and `alETH` — clients could previously inflate vote weight arbitrarily |
| **Vote weight validated against pdb** | `governance_propose` and `governance_vote` now read `pdb[socket.accountId].data.lockedAlcx` as the authoritative stake, not client-supplied free-wallet ALCX |
| **Governance history persistence** | `govProposals`, `idSeq`, and `history` are now all saved in `governance.json`. `EARMARK_RATE_LIVE` is also persisted — governance state survives server restarts |

---

## 2026-04-05 — `v=20260405b` — vote weight gated to queue-locked ALCX

| Change | Details |
|--------|---------|
| **Vote weight source redesigned** | Previously anyone could vote with free-wallet ALCX. Now only ALCX that is actively locked inside a veQueue position (`G.lockedAlcx`) counts as vote-eligible stake |
| **Amount selector in governance UI** | Players choose how much of their locked ALCX to commit to a proposal (1 to available-for-vote). Selected amount is further locked (`alcxVoteLocks[proposalId]`) and inaccessible until vote settles |
| **`alcxVoteLock` in HUD** | HUD notation: `⚗{alcx} 🔒{lockedAlcx} (🗳{alcxVoteLock})` — vote-committed portion is always visible |
| **Propose disabled when no queue stake** | Governance panel shows a clear message when `G.lockedAlcx === 0` instead of an enabled propose button |
| **Governance history panel** | Last 20 settled proposals rendered in governance UI: outcome, earmark rate, vote weights For/Against, proposer, timestamp |

---

## 2026-04-05 — `v=20260405a` — governance overhaul

| Change | Details |
|--------|---------|
| **24-hour voting epoch** | `VOTE_DURATION_MS = 24 * 60 * 60 * 1000` — proposals live for one full day before auto-settling |
| **Quorum requirement** | Proposals require ≥ 50 ALCX total vote weight to be actionable. Sub-quorum proposals fail even if For > Against |
| **`alcxVoteLocks` tracking** | Per-account map `{proposalId → alcxAmount}` stored server-side. Vote-committed ALCX is inaccessible for queue-leave, fast-exit, or auction bid while a vote is live |
| **`broadcastGovState`** | New server function emits current proposals with quorum status and remaining time to all connected clients on every governance event |
| **Governance state broadcast on connect** | Clients receive full governance state immediately on `auth_result` |

---

## Recent Changes (2026-04-05) — `v=20260402u`

| Change | Details |
|--------|---------|
| **Mobile battle buttons fixed** | Root cause: `setupTapMove` `touchstart` handler consumed all canvas touches (calling `preventDefault()`), killing the `click` event before battle buttons fired. Fix: added `G.battle` guard so tap-to-move ignores touches during combat. Added dedicated `touchstart` listener on `cv-ui` that calls `stopPropagation()` and immediately processes hit-testing via new shared `_handleBattleUIPoint()` helper — no 300ms delay |
| **Mobile audio fixed** | iOS Safari / Android Chrome suspend `AudioContext` on creation and only allow `resume()` inside a direct user-gesture handler. Added one-time capture-phase `touchstart`+`click` listener that creates the context, calls `resume()`, and plays a 1-sample silent buffer — the only reliable iOS unlock sequence |
| **Building name signs** | Floating banner labels rendered above each main building whenever player is in world zone: 🍺 The Tavern, 🏛 Governance Hall, 🏪 Marketplace, 💰 Treasury, 💱 Currency Exchange. Always visible from a distance so new players know what each building is |
| **`renderBuildingSigns(ctx)`** | New render function; `_BUILDING_SIGNS` constant array drives positions, labels, and colours. Called in game loop after `renderSpriteLayer()` |

## 2026-04-04 (continued) — `v=20260402t`

| Change | Details |
|--------|---------|
| **alETH/alUSD lost on refresh — fixed** | Server anti-cheat guard blocked all client-side currency increases, including legitimate quest rewards. Added `quest_reward` socket event on server that updates `pdb` before `save_character` so the guard sees the new value as baseline. Client now emits `quest_reward` after awarding quest loot, before calling `saveToServer()`. Also added missing alETH chatLog on quest turn-in |
| **Character stuck near outpost — fixed** | Outpost buildings had a 3-tile-wide WALL at the top, leaving only a 1-tile gap on each side — too narrow given the 20px player hitbox. Narrowed to single centre WALL tile and carved wider GRASS clearings around all four outposts. Widened GRATING (zone-entry trigger) columns from 3 to 5 tiles |
| **Quest outpost safe zones** | No random encounters within Manhattan radius 9 of any wilderness outpost building. No encounters within radius 6 of subzone spawn point (where quest NPC stands) |
| **River Raft** (280 alUSD, lvl 3) | Bought from Cartographer Ryn in Marketplace. Equip as accessory or keep in bag — crosses any WATER tile. `isSolid()` checks `hasRaft()` helper; 3 new water enemies: River Sprite, Murk Crawler, River Serpent |
| **Pathfinder Boots** (350 alUSD, lvl 5) | Unlocks TREE tile traversal — entire world map becomes explorable off-road. `isSolid()` checks `hasForestPass()`. 3 new forest enemies: Tree Spirit, Forest Warden, Thorn Beast. Music switches to Forest track when in TREE tiles |
| **Explorer's Pack** (0.5 alETH, lvl 7) | Bundle: raft + forest pass, `effect:'raftAndForest'` |
| **Cartographer Ryn** | New NPC in Marketplace selling exploration gear (`shop:'exploration'`) |
| **Forest music track** | D minor, 72 BPM, flute wave, `perc:'atmo'`. Haunting melody with Eb5 chromatic colour note. Plays when in TREE tiles with Pathfinder Boots |
| **6 new enemies** | `riverSprite`, `murkCrawler`, `serpentine` (water); `treeSpirit`, `forestWarden`, `thornBeast` (forest) |
| **`checkWaterEncounter()`** | 18% encounter rate on WATER tiles when rafting |
| **`checkForestEncounter()`** | 20% rate on TREE tiles with boots, scales by danger depth; two difficulty tiers |

## 2026-04-04 — `v=20260402s`

| Change | Details |
|--------|---------|
| **Music v6 — complete rewrite** | 13 tracks (12 zones + battle) rebuilt from scratch with SNES composition craft. Every track has a 2-bar singable hook with a characteristic interval leap, dotted rhythms for swing, proper chord progressions, walking bass, continuous texture. Beat-verified: all melodies sum to 32 quarter beats |
| **Battle music** | New `battle` track (A minor, 155 BPM, battle perc). `musPlay('battle')` called in `triggerBattle()` |
| **Victory fanfare** | `SFX.victoryFanfare()` — FF-style ascending phrase (A4×3 B4 C5 D5 E5 A5) with bass/pad harmony |
| **Battle music routing** | `musPlay('world')` on defeat/respawn; `musPlay(G.zone)` on victory return |

## Recent Changes (2026-04-04) — `v=20260402r` and earlier

| Change | Details |
|--------|---------|
| Music v2 — listenable | Lead wave completely rebuilt (harsh 3rd harmonic 0.78→0.10, warm round timbre). Pad wave softened. All arps redesigned: quarter notes with rests. World+tavern: 8-bar singable melodies, quarter-note walking bass. Version bumped `v=20260402p` |
| Music v1 | Complete rewrite of all 12 zone tracks: new `glass`/`flute` wave types, per-track ADSR, slower tempos, pads everywhere, Treasury→C minor, Dungeon→E Phrygian |
| Transaction toast | `showTxToast(msg, type)` — color-coded popup (green=buy/equip, gold=sell, red=drop, blue=use) at top-center, 2.2s dismiss, CSS animated slide-in |
| Battle crash fix | `ReferenceError: active before init` — hoisted `const active` to top of `renderBattleScreen()` |
| .gitignore | Added `audio-inspiration/` so MP3 reference files aren't committed |

---

## Previous Session Changes (2026-04-03)

| Change | Details |
|--------|---------|
| `dropFromBag()` added | 30% durability on drop, world loot emit if online |
| Bag action sheet wired | All 4 actions (EQUIP/USE/SELL/DROP) now functional |
| Battle loadout fix | Moved to left column — was overflowing y=416 canvas boundary |
| HP/MP text fix | Embedded inside bars — was overflowing x=640 right edge |
| Version bumped | `v=20260402l` |

---

## 2026-04-02

| Change | Details |
|--------|---------|
| NPC bots | 4–7 bots seeded per zone entry queue at startup; cycle after serving |
| Background queuing | Queue ticket persists while roaming; 2-min served window |
| Seniority fix | Now only increments inside economic zone, not while roaming |
| Exit queue cost | Fast-exit button with ALCX fee |
| Queue tutorial | 5-page tutorial, updated to reflect roam-while-waiting |
| Join message | "Roam freely — we'll notify you when your ticket is called!" |
| Queue served alert | Prominent 2-line chat notification + SFX on being served |

---

## Possible Next Steps

- [ ] More dungeon content / boss encounters
- [ ] NPC quest chain tied deeper into veQueue lore
- [ ] Auction mechanic for marketplace listings
- [ ] vqShares / ERC-6909 position NFT visualization
- [ ] Discord role reward on quest completion
- [ ] Sound effects expansion (currently sparse)
- [ ] World loot cleanup (server-side expiry for dropped items)
- [ ] Raft/forest biome expansion (new map areas reachable only by water/forest)
- [ ] Mobile HUD sizing pass (action sheet, shop, inventory on small screens)
- [x] ~~Governance proposal voting mini-game~~ (implemented: ALCX-weighted vote, earmark rate proposals)
- [x] ~~Mobile layout polish~~ (battle buttons fixed, audio unlock fixed, Apr 2026)
- [x] ~~Currency exchange~~ (implemented: Exchanger Rex, 0.3% fee, all token pairs)

---

## Git Push Command

```bash
GIT_SSH_COMMAND="ssh -i /workspace/extra/github-keys/github_deploy -o StrictHostKeyChecking=no" \
  git push origin main
```
