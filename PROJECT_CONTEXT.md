# Governance Town / veQueue Demo — Project Context

_Last updated: 2026-04-03_

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
2. Bump asset version in `public/index.html` (all `v=YYYYMMDDX` occurrences, currently `v=20260402l`)
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

`v=20260402l` — set in `public/index.html` for CSS + all JS files. Bump each deploy.

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

## Recent Changes (This Session — 2026-04-03)

| Change | Details |
|--------|---------|
| `dropFromBag()` added | 30% durability on drop, world loot emit if online |
| Bag action sheet wired | All 4 actions (EQUIP/USE/SELL/DROP) now functional |
| Battle loadout fix | Moved to left column — was overflowing y=416 canvas boundary |
| HP/MP text fix | Embedded inside bars — was overflowing x=640 right edge |
| Version bumped | `v=20260402l` |

---

## Previous Session Changes (2026-04-02)

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
- [ ] Governance proposal voting mini-game
- [ ] Discord role reward on quest completion
- [ ] Mobile layout polish (D-pad, action sheet sizing)
- [ ] Sound effects expansion (currently sparse)
- [ ] World loot cleanup (server-side expiry for dropped items)

---

## Git Push Command

```bash
GIT_SSH_COMMAND="ssh -i /workspace/extra/github-keys/github_deploy -o StrictHostKeyChecking=no" \
  git push origin main
```
