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
- Town as safe haven surrounded by a wider dangerous world
- Randomly generated adversaries roam the wilderness and dungeon zones

### Town as Safe Haven
- The town (and all its interiors) is a **combat-free safe zone** — no enemies can enter
- Leaving town via exits on the map edge transitions the player into the **Wilderness**
- The Wilderness is a larger, scrolling overworld map with hostile zones, ruins, dungeons
- Players return to town to sell loot, queue for the economic zone, recover HP, and interact
- Visual cue at town boundary: the art style subtly shifts (darker palette, more jagged tiles) as you cross into danger
- NPCs in town can comment on what's happening in the wilderness ("adventurers haven't returned from the eastern ruins...")

### Zones
- **Town Square** — safe hub, shops, social, veQueue entry points
- **Town Interiors** — Tavern, Governance Hall, Marketplace, Treasury (all safe)
- **Wilderness / Overworld** — dangerous open world, enemies roam freely, multiple biomes
- **Dungeons / Ruins** — fixed-location deep-danger zones with rare loot and boss-level adversaries
- **Economic Zone** (Marketplace + Treasury interior) — gated behind veQueue, safe once inside

---

## Combat System

### Encounter Transition — Final Fantasy Style
- Combat triggers when the player walks into a hostile enemy in the wilderness (bump-to-fight)
- On trigger: the **screen pixelates outward** from the collision point (mosaic/pixelation effect), then zooms into a dedicated **battle screen** — a separate full-screen view with the two combatants facing off
- Battle screen art is more zoomed-in and detailed than the overworld — big sprites, visible HP bars, attack animations
- After the fight resolves (win, lose, or flee) the screen pixelates back and returns to the overworld at the same position
- The pixelation + zoom transition is the signature feel — players should immediately recognize "a fight is starting"

### Battle Screen Layout
- Player sprite on the left, enemy on the right (classic JRPG positioning)
- HP bars for both combatants displayed prominently
- Action menu: **Attack**, **Item**, **Flee** (turn-based, not real-time — simpler to implement, easier to balance)
- Enemy has a visible name, level, and loot preview (what they're carrying)
- Stat system feeds directly into combat: STR → damage, END → damage reduction, AGI → flee chance / who goes first, LCK → crit chance, VIT → max HP

### General Combat Rules
- Adversaries are all NPCs — no PvP
- Player starts with a basic weapon (e.g. sword) and shield/armor
- Defeating adversaries earns currency (variable amounts by enemy type/difficulty)
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

## Audio — SNES-Style Sound & Procedural Music

### Sound Effects
- SNES-style synthesized sound effects for all actions: footsteps, sword swing, hit, enemy death, coin pickup, queue ticket dispense, door open, vote cast, etc.
- Generated via Web Audio API (no audio file downloads needed) — short oscillator bursts shaped to mimic SNES SPC700 chip sound characteristics
- Each zone/building could have its own ambient sound layer (e.g. tavern crowd murmur, governance hall echo, marketplace bustle)

### Music
- Procedurally generated chiptune music — different track per zone, generated at runtime via Web Audio API
- Tracks should feel thematically distinct: town overworld (adventurous), governance hall (stately), tavern (upbeat), black market (tense)
- Procedural generation means no licensing issues and subtle variation each playthrough so it never feels like a loop
- Could use a simple chord progression + melody generator constrained to SNES-appropriate scales and instrument patches

### User Controls
- Volume sliders (or toggle buttons) for music and SFX independently — accessible from pause/character screen
- Mute all option
- Settings persist in localStorage

---

## Cookie / Session Integrity — Anti-Cheat

- Server should sign cookies with a secret key (HMAC) so tampered values are rejected on load
- Player state (tokens, inventory, queue position) stored in cookie as a signed payload — server verifies the signature on every reconnect; mismatched signature = cookie rejected, player starts fresh
- Secret key lives only on the server (env variable), never sent to client
- Prevents players from manually editing their localStorage/cookie to give themselves infinite tokens or fake items
- Does not need a database — the signed cookie IS the auth token; stateless verification
- Could also include a server-side "sanity check" layer: even a valid signed cookie gets rejected if values are implausible (e.g. token balance increased between sessions without a server-recorded earning event)
- **Implementation:** `HMAC-SHA256(JSON.stringify(playerState), SERVER_SECRET)` appended to the cookie; verified on `join` event before accepting state

---

## Core Design Tension — Time vs. Flexibility

The central feeling to create: **the queue isn't a punishment, it's the mechanism that makes everything else work.** If the game hits that, the veQueue whitepaper becomes intuitive.

### Balance targets
- **Auction bypass** — make it genuinely expensive but visually satisfying; players who pay to skip should feel like they spent something real, not just clicked through a fee
- **Queue seniority advantage** — meaningful but not overwhelming; a 10–15% edge is noticeable and motivating; a 10× advantage breaks the game and feels unfair
- **The exit decision** — the most emotionally resonant moment in the game; design it so players feel the genuine weight of leaving vs. staying; this is where the mechanic becomes felt rather than explained

### What to avoid
- Don't punish casual players so hard that the queue feels like a wall
- Don't make patience so dominant that spending feels stupid
- Don't let any single strategy (lock forever, bypass always, specialize early) be strictly dominant

### The internalization goal
Players should finish a session feeling: *"I understand why you'd want a queue like this. I felt what it does."* That's the moment the whitepaper clicks.

---

## Watermark Line on the Queue Visualization — Principal Protection

- The queue visualization shows players waiting; add a visible watermark line — a marker showing "this is where your locked tokens are protected"
- Players can see their principal is safe even while waiting
- When a governance event affects players in queue, the watermark makes it visually obvious their tokens can't be touched
- **Balance:** purely informational/educational, no gameplay impact; makes an abstract concept legible
- **Teaches:** watermark principal protection

---

## Idle Treasury — Tax Loop Viability

- Live treasury counter in the Governance Hall: a running total of the % of economic activity flowing back to queue members
- All revenue sources feed it visibly: rare item auction premiums, fast-lane bypass fees, exit donations, Black Market parent tax
- Queue members see their "passive share" tick upward in real time even while just exploring the world — no action required
- **Balance:** reinforces that staying in the queue has low-friction reward; not game-breaking, just a constant small drip; keeps the veQueue from feeling like pure cost/friction
- **Teaches:** tax loop — protocol revenue automatically funding the cooperative, without governance votes required

---

## NPC "Whale Arrival" Event — Flow-Rate Dilution Resistance

- Occasionally an NPC whale announces they're entering the queue with a massive token stake
- Players can see the projected impact on queue wait times *before* it happens (entry is rate-limited, so the math is visible)
- Players already in queue have time to react: stay for the seniority advantage, or exit now before wait times extend?
- The whale cannot skip the queue — even with 100× tokens they enter at the same rate as everyone else; their presence changes dynamics but can't harm existing players
- **Balance:** creates emergent strategic moments without the whale actually being able to harm existing players; the rate limit is the protection
- **Teaches:** flow-rate dilution resistance — you can see the threat coming, principal is protected, orderly entry even for large capital

---

## Queue Seniority Decay — Passive Dilution Mechanic

- Idle players in the queue see their queue seniority (priority score) slowly decay relative to active players — not slashing, just gentle erosion
- Active players who vote and trade accumulate seniority faster
- **Balance:** casual players aren't harshly punished — they can still participate; engaged players get a visible edge; soft incentive to log in and interact without making absence catastrophic
- **Teaches:** passive dilution from inactivity vs. active governance compounding; no slashing — just opportunity cost

---

## Governance Vote via Token Weight — Proportional Governance

- Periodically the Governance Hall holds votes on world events, e.g.:
  - "Should the Tavern sell XP potions this week?"
  - "Should adversary spawn rate increase for 24 hours (more loot, more danger)?"
  - "Should the exit queue fee be lowered?"
- Players vote with their locked token weight — more tokens locked = more vote weight
- Players in the exit queue forfeit voting rights until they re-enter
- Results display as a token-weighted tally in real time as votes come in
- **Balance:** large lockers get governance power but outcomes affect everyone equally (economy-wide, not individual-targeted); players who care lock more, players who don't can freeload on the outcome
- **Teaches:** proportional governance, exit queue = governance forfeit, why long-term commitment has value

---

## rvqALCX SubZones — Recursive veQueue / Specialized Revenue

Specialized sub-zones inside the economic zone, each requiring you to commit your queue position (vqShares) to enter. Only one sub-zone at a time — you gave up your general queue position to specialize; you can return to the general queue later but must re-queue.

| Sub-Zone | Cost | Upside | Tradeoff |
|----------|------|--------|----------|
| **The Armory** | Commit vqShares | Access to better weapon trades | Lose general marketplace access |
| **The Alchemist** | Commit vqShares | Potion crafting | Lose Armory access |
| **The Black Market** | Commit vqShares | Rare item drops, high reward | High risk; lose all other sub-zone access |

- **Parent tax mechanic:** a % of Black Market profits flows into the general treasury, shared by all queue members — visible in real time so players feel it happening
- **Balance:** specialization cost (giving up flexibility) is real but upside is genuine; creates distinct player archetypes (fighter, crafter, gambler)
- **Teaches:** rvqALCX specialization — commit deeper, earn more in your niche, sacrifice breadth; parent protocol earns a tax on sub-zone activity

---

## Exit Queue Donations — Below-Peg Mechanic

- When leaving the economic zone, if the exit queue is long/congested, players can optionally "donate" part of their tokens to jump ahead — donations go to the remaining players in the queue, enriching them
- Alternatively framed as: an "early exit fee" paid by impatient leavers, distributed to remaining members
- **Balance:** staying longer earns queue seniority + potentially receives donations from impatient exiters; exiting fast costs a bit; neither is wrong — depends what you're optimizing for
- **Teaches:** exit queue below-peg donation mechanics — remaining holders are enriched when others leave early

---

## Auction Fast Lane — Queue Bypass Mechanic

- Players who don't want to wait in the entry queue can bid in a live Queue Auction — pay above the current queue price to skip ahead
- The premium goes into the treasury
- Other players see the queue jump happening in real time
- **Balance:** auction price scales with queue depth — crowded queue = expensive bypass; patient players benefit from accumulating queue seniority while spenders burn currency; neither strategy is strictly dominant
- **Teaches:** entry queue premium capture — the mechanism earns from demand volatility

---

## Dev Tools

### God Mode / Cheat Codes
- Konami-code style sequence to toggle god mode (e.g. ↑↑↓↓←→←→BA)
- God mode effects: invincibility, unlimited currency, instant queue bypass, full inventory capacity
- Visually indicated (character glows or has a halo) so it's obvious when active
- Individual cheat codes for specific things: fill wallet, spawn adversary, skip queue, etc.
- Disabled/hidden in production; toggled via a dev flag in code
