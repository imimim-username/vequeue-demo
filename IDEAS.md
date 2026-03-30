# veQueue Game — Ideas & Design Notes

_Last updated: 2026-03-30_

---

## Game Identity

### Name
Should tie to "vq" (veQueue) somehow. Candidates:
- **Victory Quest** — VQ as initialism, heroic/adventurous feel
- **VaultQuest** — nods to treasury/governance theme
- **QuestMark** — references the queue watermark mechanic
- **vqRealm** — fantasy flavor
- **vqWorld** — simple, descriptive
- **Que Town** — playful pun on queue + frontier town
- **The vQ** — stylized, short

### Currency
Silly pop-culture-inspired units rather than generic "gold" or "tokens". Inspiration: Rick and Morty's Flurbos/Schmeckles, Spaceballs' Spacebucks, Futurama's Nixonbucks. Candidates:
- **Queeblos** — original, riffs on "queue", sounds absurd
- **Schmeckles** — classic R&M, already has cultural recognition
- **Quoins** — pun on "coins" + "queue" (also an archaic word for coins)
- **Vörks** — short, punchy, vaguely vq-adjacent
- **Schmov** — mashup of Schmeckle + GOV
- **Flurbs** — R&M adjacent
- Could have multiple denominations with different silly names (e.g. 100 Queeblos = 1 Vörk)

---

## Core Mechanic — veQueue as Economic Gate

- All economic activity (buying weapons, selling loot, upgrading armor, trading) happens in a zone gated behind a veQueue
- To enter the Marketplace / Treasury, players must lock tokens into the queue and wait their turn
- Makes the veQueue mechanic not just a tutorial step but a lived, repeated experience central to gameplay
- Creates natural scarcity and pacing — you can't spam-buy items; you have to queue
- Players with more tokens locked earn higher-priority queue positions (teaches watermark/principal protection)
- Real-time queue visualization: see other players waiting, watch the serving counter advance
- Entering releases your locked tokens (teaches entry/exit queue mechanics)
- vqShares: players who stay locked in longer accumulate "queue seniority" giving them discounts or early access to rare items
- To **leave** the economic zone, players must join an exit queue — you can't just walk out; teaches exit queue as a lived experience
- Creates a genuine decision: stay longer for better deals, or exit sooner to get back to fighting?

---

## Visual Style — Mega Man X (SNES) Quality Target

Reference: Mega Man X (Capcom, 1993) on SNES. This is the visual bar to hit.

### Key characteristics to replicate in canvas

**Backgrounds — multi-layer parallax**
- 3–4 distinct depth layers scrolling at different speeds (far sky, mid architecture, near foreground)
- Each layer uses its own distinct color palette range (cooler/desaturated in back, warmer/saturated in front)
- Backgrounds have rich environmental detail: machinery, pipes, foliage, windows, structural elements
- Animated background elements: blinking lights, moving platforms, falling rain, flowing water, smoke

**Sprites — large, detailed, heavily shaded**
- Player and enemy sprites are large (32×32 px minimum) — not tiny 8×8 characters
- Every sprite has at minimum 3 shading levels: highlight, midtone, shadow
- Strong dark outlines around sprites to pop them off the background
- Smooth multi-frame animation: walk cycle (6–8 frames), attack, jump, hurt, death sequences
- Color-coded per character — each adversary type has a distinct hue so they're immediately readable

**Tiles — rich and layered**
- Floor tiles have texture and depth — not flat solid colors
- Wall tiles have foreground/background separation: e.g. structural frame in front, detail behind
- Decorative elements (pipes, conduits, vines, banners) layered over base tiles
- Some foreground tiles the player walks *behind*, creating depth illusion

**Color palette — bold and zone-themed**
- Each zone/building has a dominant color theme (e.g. Governance Hall = deep blue + gold; Tavern = warm amber + wood brown; Treasury = cool green + steel)
- Saturated, punchy colors with strong contrast between sprite and background
- SNES-style: no more than ~16 colors per sprite, but backgrounds can use full 256-color range
- Dithering patterns used to simulate gradients (e.g. sky gradients, cave lighting falloff)

**UI — minimal but pixel-perfect**
- Health bar: vertical or horizontal row of segmented pixel blocks (heart containers or HP bar)
- Token/currency counter with a small coin icon
- Weapon/item slots: small icon grid in corner
- No floating text clutter — everything is iconographic
- HUD elements have a subtle dark border or panel behind them to stay readable

**Camera**
- Camera leads the player slightly in movement direction (not just centered)
- Smooth lerp, never jarring
- Screen locks at zone boundaries

### Implementation approach for canvas
- Draw background layers on separate off-screen canvases, composite at render time
- Use larger tile size (e.g. 16×16 or 32×32 logical px before scaling) instead of current tiny tiles
- Pre-render static tile layers to a buffer; only redraw when camera moves
- Sprite sheets for animation frames — each character direction × action has its own strip
- Scale factor ×2 or ×3 for crisp pixel-perfect rendering on modern screens (`image-rendering: pixelated`)

---

## World & Exploration

### Overall Feel
- Zelda-style top-down action RPG
- Small town world with outdoor map and enterable buildings
- Randomly generated adversaries roam the map and building interiors

### Zones
- Outdoor town (free exploration, combat)
- Economic Zone (Marketplace + Treasury) — gated behind veQueue
- Governance Hall — quest-related NPC interactions
- Tavern — social hub, messages, leaderboard

---

## Combat System

- Player starts with a basic weapon (e.g. sword) and shield/armor
- Zelda-style combat: attack, block/dodge with shield
- Defeating adversaries earns currency (variable amounts by enemy type/difficulty)
- Adversaries are all NPCs — no PvP
- Adversary populations regenerate slowly over real time; clearing an area makes it safer for others temporarily

---

## Character System

### Character Creation (New Game)
Full RPG-style creation screen at game start:
- **Physical customization:** sprite silhouette, skin tone, hair style/color, clothing/armor color, accessories (hat, cape, glasses, etc.)
- **Stat allocation:** fixed pool of points (e.g. 10) to distribute across:
  - Strength (attack damage)
  - Vitality (max HP)
  - Agility (movement speed)
  - Endurance (defense/damage reduction)
  - Luck (drop rate from adversaries)
- **Nickname**
- Choices saved in cookie/localStorage and visible to other players in the world

### Starting Loadout
- Basic sword, basic shield, 3 hearts, 8 inventory slots

### Stats & Leveling
Upgrades purchased in the economic zone (requiring entry/exit queue — reinforces core mechanic):
- Max health (more hearts)
- Attack power (weapon damage)
- Defense (shield/armor reduction)
- Inventory capacity (more item slots)
- Speed (movement rate)

### Inventory
- Fixed number of item slots (e.g. 8 to start, upgradeable)
- Must sell or drop excess before picking up new items
- Encourages strategic decisions about what to keep vs. sell

### Pause = Character Screen
- Pausing opens the character/inventory screen — same button, dual purpose (Zelda-style)
- Shows: equipped items, inventory grid, current stats, token balance, quest log
- Player can equip/unequip items and review stats
- No separate menu flow — pause IS the character screen

---

## Death, Respawn & Adversary Progression

- If killed by an adversary, player respawns at start with only basic weapon + armor
- On death, player drops all items and tokens on the ground
- The adversary that killed them picks up the dropped loot and becomes stronger/richer
- Adversaries can snowball in power as they accumulate loot from fallen players
- Boss-level adversaries emerge naturally from well-fed NPCs that have killed many players
- Other players are incentivized to hunt strong adversaries (they drop all accumulated loot when defeated)
- Teaches a parallel to veQueue risk: the longer you stay in the field without cashing out, the more you risk losing to a powerful adversary

### Item Decay on Recovery
- When a player defeats the adversary that previously killed them, recovered items are **decayed** — degraded versions of what was lost (lower stats, partial token value, reduced durability)
- The longer the adversary has been carrying the loot, the more it decays
- Encourages players to hunt down their killer quickly
- Decay percentage visible on adversary health bar or tooltip so player knows what they're working with

---

## Economy — Consignment Marketplace

- Players list items on consignment in the economic zone; no selling directly to NPCs at fixed prices
- Items sit in shared marketplace (server memory) until another player buys them asynchronously
- Server takes a percentage cut of each sale — mirrors a protocol fee (veQueue mechanic analogy)
- Seller sets asking price; buyer pays it whenever they next enter the economic zone
- Rare loot from powerful adversaries commands higher prices
- Items unsold for too long decay in value — encourages realistic pricing
- Creates a real player-driven economy: prices fluctuate based on supply/demand across sessions

---

## Multiplayer — Asynchronous BBS Door Game Style

Inspired by classic BBS door games (Trade Wars, Legend of the Red Dragon). Players don't need to be online simultaneously to affect each other.

### Async Interaction Mechanics
- Loot/corpses left by defeated players persist on the map for others to find
- Players can leave messages or "graffiti" at locations others see when visiting
- Token economy is shared/global — one player cornering the Marketplace raises prices for everyone
- Adversary populations regenerate over real time; clearing an area temporarily helps the next player
- Players can place bounties on adversaries using tokens
- Persistent hall of fame leaderboard: top earners, most quests completed, strongest adversary defeated
- Daily/weekly events triggered by collective player actions (e.g. "town is under siege — harder enemies today")

---

## Persistence — No Database

- All world state lives in server memory (resets on restart — acceptable, world regenerating feels natural)
- Per-player state (tokens, inventory, quests, position) stored in browser cookie or localStorage
- No database setup, migrations, or persistence layer to maintain
- Stack stays dead simple: Node.js + Socket.io, no file I/O required
- Player progress survives server restarts via their own cookie

---

## Dev Tools

### God Mode / Cheat Codes
- Konami-code style sequence to toggle god mode (e.g. ↑↑↓↓←→←→BA)
- God mode effects: invincibility, unlimited currency, instant queue bypass, full inventory capacity
- Visually indicated (character glows or has a halo) so it's obvious when active
- Individual cheat codes for specific things: fill wallet, spawn adversary, skip queue, etc.
- Disabled/hidden in production; toggled via a dev flag in code
