# veQueue Game — Ideas & Design Notes

_Last updated: 2026-03-31_

---

## 1. Game Identity

### Name
Should tie to "vq" (veQueue) somehow. Candidates:
- **Victory Quest** — VQ as initialism, heroic/adventurous feel ✅ *(current implementation)*
- **VaultQuest** — nods to treasury/governance theme
- **QuestMark** — references the queue watermark mechanic
- **vqRealm** — fantasy flavor
- **vqWorld** — simple, descriptive
- **Que Town** — playful pun on queue + frontier town
- **The vQ** — stylized, short

---

## 2. Visual Style — Mega Man X (SNES) Quality Target

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
- Smooth multi-frame animation: walk cycle (6–8 frames), attack, jump, hurt, death sequences ✅ *(6-frame walk cycle implemented)*
- Color-coded per character — each adversary type has a distinct hue so they're immediately readable

**Tiles — rich and layered**
- Floor tiles have texture and depth — not flat solid colors
- Wall tiles have foreground/background separation: e.g. structural frame in front, detail behind
- Decorative elements (pipes, conduits, vines, banners) layered over base tiles
- Some foreground tiles the player walks *behind*, creating depth illusion ✅ *(implemented)*

**Color palette — bold and zone-themed**
- Each zone/building has a dominant color theme (e.g. Governance Hall = deep blue + gold; Tavern = warm amber + wood brown; Treasury = cool green + steel)
- Saturated, punchy colors with strong contrast between sprite and background
- SNES-style: no more than ~16 colors per sprite, but backgrounds can use full 256-color range
- Dithering patterns used to simulate gradients (e.g. sky gradients, cave lighting falloff)

**UI — minimal but pixel-perfect**
- Health bar: vertical or horizontal row of segmented pixel blocks (heart containers or HP bar)
- Token/currency counter with a small coin icon (all 5 currencies shown on HUD)
- Weapon/item slots: small icon grid in corner
- No floating text clutter — everything is iconographic
- HUD elements have a subtle dark border or panel behind them to stay readable

**Camera**
- Camera leads the player slightly in movement direction (not just centered) ✅ *(implemented)*
- Smooth lerp, never jarring
- Screen locks at zone boundaries

### Implementation approach for canvas
- Draw background layers on separate off-screen canvases, composite at render time ✅ *(6-canvas stack implemented)*
- Use larger tile size (e.g. 16×16 or 32×32 logical px before scaling) instead of current tiny tiles
- Pre-render static tile layers to a buffer; only redraw when camera moves
- Sprite sheets for animation frames — each character direction × action has its own strip
- Scale factor ×2 or ×3 for crisp pixel-perfect rendering on modern screens (`image-rendering: pixelated`)

---

## 3. Character System

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
- Starting wallet: 100 Spacebucks, 0 Schmeckles, 0 alUSD, 0 alETH, 20 ALCX

### Stats & Leveling
- Gain XP from combat; level up grants stat points
- Upgrades from bank/market (requiring veQueue entry — reinforces core mechanic):
  - Max health (more hearts)
  - Attack power (weapon damage)
  - Defense (shield/armor reduction)
  - Inventory capacity (more item slots)
  - Speed (movement rate)

### Magic Points (MP)
- Characters have a **magic points bar** alongside their HP bar on the HUD
- Using any magic ability depletes MP proportionally to the ability's power — this includes spells, passive-triggered effects, and active species/class abilities like Holy Light, Shadow Strike, etc.
- MP regenerates gradually over time on its own — no item required, just wait
- Max MP scales with character stats (e.g. Luck or a future INT stat)
- HUD shows MP as a blue segmented bar below the HP bar
- MP regen rate could be a tunable parameter in the admin dashboard

### Inventory
- Fixed number of item slots (e.g. 8 to start, upgradeable)
- Must sell or drop excess before picking up new items
- Encourages strategic decisions about what to keep vs. sell

### Pause = Character Screen
- Pausing opens the character/inventory screen — same button, dual purpose (Zelda-style)
- Shows: equipped items, inventory grid, current stats, all token balances, quest log, active bank positions
- Player can equip/unequip items and review stats
- No separate menu flow — pause IS the character screen

---

## 4. World & Exploration

### Overall Feel
- Zelda-style top-down action RPG
- Town as safe haven surrounded by a wider dangerous world
- Randomly generated adversaries roam the wilderness and dungeon zones

### Town as Safe Haven
- The town (and all its interiors) is a **combat-free safe zone** — no enemies can enter
- Leaving town via exits on the map edge transitions the player into the **Wilderness**
- The Wilderness is a larger, scrolling overworld map with hostile zones, ruins, dungeons
- Players return to town to bank, queue, recover HP, and interact
- Visual cue at town boundary: the art style subtly shifts (darker palette, more jagged tiles) as you cross into danger
- NPCs in town can comment on what's happening in the wilderness ("adventurers haven't returned from the eastern ruins...")

### Zones
- **Town Square** — safe hub, currency exchange, social, veQueue entry point
- **Town Interiors** — Tavern, Governance Hall (all safe, free to enter)
- **Wilderness / Overworld** — dangerous open world, enemies roam freely, multiple biomes
- **Dungeons / Ruins** — fixed-location deep-danger zones with rare loot and boss-level adversaries
- **Economic Zone** (Marketplace + Bank + Transmuter) — gated behind veQueue; safe once inside

---

## 5. Combat System

### Encounter Transition — Final Fantasy Style
- Combat triggers when the player walks into a hostile enemy in the wilderness (bump-to-fight)
- On trigger: the **screen pixelates outward** from the collision point (mosaic/pixelation effect), then zooms into a dedicated **battle screen** — a separate full-screen view with the two combatants facing off
- Battle screen art is more zoomed-in and detailed than the overworld — big sprites, visible HP bars, attack animations
- After the fight resolves (win, lose, or flee) the screen pixelates back and returns to the overworld at the same position
- The pixelation + zoom transition is the signature feel — players should immediately recognize "a fight is starting"

### Battle Screen Layout
- Player sprite on the left, enemy on the right (classic JRPG positioning)
- HP bars for both combatants displayed prominently
- Action menu: **Attack**, **Magic**, **Item**, **Flee** (turn-based, not real-time — simpler to implement, easier to balance)
- Enemy has a visible name, level, and loot preview (what they're carrying)
- Stat system feeds directly into combat: STR → damage, END → damage reduction, AGI → flee chance / who goes first, LCK → crit chance, VIT → max HP

### Enemy Loot by Tier

| Enemy | Currency Dropped | Notes |
|-------|-----------------|-------|
| Wolf, Goblin | Spacebucks | Common collateral |
| Skeleton | Spacebucks (more) | Mid-tier |
| Dark Knight | Schmeckles | Rare collateral |
| Ancient Lich | Schmeckles (large) | Boss; most valuable drop |

### General Combat Rules
- Adversaries are all NPCs — no PvP
- Player starts with a basic weapon (e.g. sword) and shield/armor
- Defeating adversaries earns Spacebucks or Schmeckles depending on enemy tier
- Adversary populations regenerate slowly over real time; clearing an area makes it safer for others temporarily

---

## 6. Death, Respawn & Adversary Progression

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

## 7. Economy

### Currency System — Five Tokens (Alchemix-Inspired)

The game uses five distinct currencies that mirror the real Alchemix protocol token ecosystem. Live prices for alUSD, alETH, and ALCX are fetched from CoinGecko and updated approximately once per hour.

| Token | Symbol | How Obtained | Role |
|-------|--------|--------------|------|
| **Spacebucks** | 🪙 | Common enemy drops (wolves, goblins) | Raw collateral; deposited in bank to borrow alUSD |
| **Schmeckles** | 💀 | Rare enemy drops (dark knights, Lich) | Premium collateral; deposited in bank to borrow alETH |
| **alUSD** | $aUSD | Borrowed from bank against Spacebucks | Everyday spending — common/mid-tier items, potions |
| **alETH** | ⟠ | Borrowed from bank against Schmeckles | Premium spending — rare/high-power items |
| **ALCX** | ⚗️ | Queue participation drip; buyable at exchange | Protocol token — locked for veQueue entry, spent to jump lines |

**Currency Design Notes:**
- **Spacebucks** are common; **Schmeckles** are rare and more valuable — mirrors the ETH/stablecoin collateral split in real Alchemix
- **alUSD** and **alETH** are never dropped by enemies — they must be borrowed from the bank
- **ALCX** is never earned from combat — it is earned by participating in the queue (time-in-queue drip) and can be purchased at the currency exchange
- Items can be purchased cross-currency (e.g. pay alETH for an alUSD-priced item), but a conversion fee applies at the point of sale

### Live Price Feed
- alUSD, alETH, and ALCX prices fetched from CoinGecko API approximately once per hour
- Price movements create in-game events (see **Price Feed Events** below)
- Spacebucks and Schmeckles are purely in-game tokens with no external price

---

## 8. The Bank — Alchemix v3 Self-Repaying Loans

The Bank is located inside the veQueue economic zone (requires queue entry to access). It is the central financial mechanic of the game and a direct playable simulation of Alchemix v3.

### How It Works

**Depositing collateral and borrowing:**
1. Player deposits Spacebucks → can borrow up to **90% of deposit value** as alUSD immediately
2. Player deposits Schmeckles → can borrow up to **90% of deposit value** as alETH immediately
3. No interest is charged — the loan is **self-repaying** via yield generated on the deposited collateral
4. Yield slowly ticks the outstanding debt down automatically, visible as a progress bar in the bank UI
5. The bank UI shows: collateral deposited, alUSD/alETH borrowed, % repaid, estimated time to full repayment

**When the loan is fully repaid:**
- The position flips from debt-generating to yield-generating
- Yield continues to accumulate in alUSD (for Spacebucks positions) or alETH (for Schmeckles positions)
- Collateral is **not automatically returned** — player must visit the bank and actively claim it
- While unclaimed, the collateral continues earning yield (now pure profit with no debt)

**No liquidation from price swings:**
- Spacebucks and Schmeckles are in-game tokens with no market price fluctuation
- Liquidation risk does not apply as long as the player does not borrow more than the 90% ceiling
- Teaches Alchemix's core safety guarantee: *your collateral is safe, your debt repays itself*

### Bank UI Elements
- Portfolio view: all active and cleared positions
- Each position shows: collateral type, amount deposited, debt remaining, % repaid, est. time to full repayment
- Cleared positions show: collateral available to claim, yield accumulated since payoff
- Glowing "CLAIM" button when collateral is claimable
- "Your loan will be fully repaid in approximately X hours" projection

### Alchemix v3 Protocol Analogs

| Game mechanic | Real Alchemix v3 equivalent |
|--------------|----------------------------|
| Spacebucks collateral → borrow alUSD | yvDAI / yield-bearing stablecoin → mint alUSD |
| Schmeckles collateral → borrow alETH | yvETH / yield-bearing ETH → mint alETH |
| 90% max LTV | Alchemix v3 max borrowing LTV (90%) |
| Self-repaying via yield | MYT (Mix-Yield Token) yield driving debt repayment |
| Yield on cleared positions | Depositor yield after full self-repayment |
| 15% yield fee to treasury | MYT Yield Fee (15% performance fee on gross yield) |

---

## 9. The Transmuter

The Transmuter is a separate station inside the economic zone. It is the mechanism that converts alUSD/alETH back into underlying collateral (Spacebucks/Schmeckles) at 1:1, driven by periodic redemptions from borrowers — not a fixed time lock.

### How It Works — Two Sides

**Borrower side (automatic, no action required):**
1. Every borrower has an outstanding debt. Their debt as a fraction of **total system debt** determines how fast their collateral is earmarked
2. Earmarked collateral accumulates silently over time — the borrower doesn't have to do anything
3. Periodically (every N game ticks, governance-tunable), a **redemption event** fires:
   - Each borrower's earmarked collateral is redeemed proportionally
   - Their debt is reduced by the redeemed amount (1:1, same as self-repayment)
   - The redeemed collateral flows into the Transmuter pool, available to Transmuter depositors
4. **Temporal advantage:** because redemption is deferred, a borrower's full collateral keeps earning yield right up until the moment of redemption — not just the post-redemption remainder

**Transmuter depositor side (player action):**
1. Player deposits alUSD or alETH into the Transmuter station
2. They wait. As redemption events fire from borrowers, the Transmuter pool fills with Spacebucks (for alUSD depositors) or Schmeckles (for alETH depositors)
3. Depositors receive their share of redeemed collateral at 1:1, pro-rata based on their share of the Transmuter pool
4. Player withdraws their Spacebucks/Schmeckles whenever they want — no lockup on the exit side

> **Open design question:** Is distribution to Transmuter depositors **pro-rata** (everyone receives proportionally to their deposit) or **FIFO queue** (first depositor gets filled first)? Pro-rata is simpler and fairer; FIFO creates interesting strategy around timing. Recommend pro-rata for v1, optional FIFO upgrade later.

### The Earmarking Rate — Governance Lever
- The earmarking rate controls how quickly borrower collateral gets earmarked per redemption cycle
- **Too high** → collateral redeems too fast; borrowers lose the temporal yield advantage; deposits shrink before they can compound
- **Too low** → Transmuter depositors wait too long; the arbitrage return becomes unattractive; peg weakens
- This rate is **votable via ALCX governance weight** in the Governance Hall — a live demonstration of DAO parameter-setting with real in-game consequences players can feel

### Peg Stabilization & Arbitrage
- The Transmuter guarantees 1:1 redemption (eventually), which creates an arbitrage floor
- When alUSD trades below $1 at the currency exchange, players can buy cheap alUSD and deposit it in the Transmuter — they'll receive 1 Spacebuck for every alUSD when redemptions flow through
- The tighter the earmarking rate (more frequent redemptions), the shorter the wait, the higher the annualized arbitrage return → stronger peg pull
- Town crier NPC announces when alUSD depegs below $0.98 and the Transmuter has a positive arbitrage spread

---

## 10. The Currency Exchange

Located in the town square, **outside** the veQueue economic zone — freely accessible without queuing.

### What It Trades
All five currencies can be exchanged in any direction:
- Spacebucks ↔ Schmeckles
- Spacebucks ↔ alUSD
- Schmeckles ↔ alETH
- alUSD ↔ alETH
- Any token ↔ ALCX (including buying ALCX with Spacebucks or alUSD)

### Fee & Rates
- **0.30% fee** on all swaps, goes to protocol treasury
- Exchange rates for alUSD/alETH/ALCX reflect live CoinGecko prices (updated ~hourly)
- Spacebucks/Schmeckles exchange rates are set by in-game supply/demand mechanics

### Price Feed Events
When live prices move significantly, the town crier NPC announces it and exchange dynamics shift:
- **alUSD depegs below $0.98** → Transmuter arbitrage window opens; crier announces it
- **alETH drops >5% in 24h** → Exchange is busier (simulated queue); harder to swap
- **ALCX pumps >10%** → Queue-jumping becomes more expensive; players in queue earn more from others jumping

---

## 11. Economy — Consignment Marketplace

- Players list items on consignment in the economic zone; no selling directly to NPCs at fixed prices
- Items sit in shared marketplace (server memory) until another player buys them asynchronously
- Server takes a percentage cut of each sale — mirrors a protocol fee (veQueue mechanic analogy)
- Seller sets asking price in alUSD or alETH; buyer pays it whenever they next enter the economic zone
- Rare loot from powerful adversaries commands higher prices
- Items unsold for too long decay in value — encourages realistic pricing
- Creates a real player-driven economy: prices fluctuate based on supply/demand across sessions

### Item Pricing Tiers

| Tier | Priced In | Example Items |
|------|-----------|---------------|
| Common | alUSD | Health potions, Iron Sword, Wooden Shield |
| Premium | alETH | Flame Blade, Shadow Blade, Elven Ward |
| Cross-currency | Either, with conversion fee | Player's choice; 0.30% conversion fee applies |

---

## 12. Fee Structure — Matching Alchemix v3

All game treasury fees are set to match published Alchemix v3 fee rates exactly.

| Fee | Rate | Trigger | Where fee goes |
|-----|------|---------|---------------|
| **Bank Yield Fee** | **15%** | Taken on all yield generated by collateral deposits before crediting debt repayment | Protocol treasury (visible in Governance Hall) |
| **Borrower Redemption Fee** | **0.50%** | Charged in collateral tokens when a redemption event fires against a borrower's earmarked collateral | Protocol treasury |
| **Transmuter Withdrawal** | **0%** | Depositor withdraws their redeemed collateral from the Transmuter at any time | N/A |
| **Currency Exchange Fee** | **0.30%** | All currency swaps at the exchange | Protocol treasury |
| **Queue Jump Fee** | Market price | Player spends ALCX to skip ahead in the veQueue | Distributed to all players currently waiting in queue |

*Note: The 15%, 0.50%, and 1% fees are the three publicly documented user-facing rates in the Alchemix v3 docs. The 0.30% exchange fee is modeled on standard DEX swap fees.*

### Treasury Visibility
- All fee inflows are displayed live in the Governance Hall as a running counter
- Queue members can see their pro-rata share of treasury revenue ticking upward in real time
- Teaches: tax loop — protocol revenue automatically funding the cooperative

---

## 13. Core Mechanic — veQueue as Economic Gate

- All economic activity (buying weapons, banking, Transmuter, consignment marketplace) happens in a zone gated behind a veQueue
- To enter the Marketplace / Treasury, players must lock **ALCX** into the queue and wait their turn
- Makes the veQueue mechanic not just a tutorial step but a lived, repeated experience central to gameplay
- Creates natural scarcity and pacing — you can't spam-buy items; you have to queue
- Players with more ALCX locked earn higher-priority queue positions (teaches watermark/principal protection)
- Real-time queue visualization: see other players waiting, watch the serving counter advance
- Entering releases your locked ALCX (teaches entry/exit queue mechanics)
- vqShares: players who stay locked in longer accumulate "queue seniority" giving them higher ALCX drip and discounts
- To **leave** the economic zone, players must join an exit queue — you can't just walk out; teaches exit queue as a lived experience
- Creates a genuine decision: stay longer for better ALCX yield, or exit sooner to get back to fighting?

### ALCX — The Protocol Token

ALCX is the veQueue/Alchemix governance and protocol token. It is not earned from combat and cannot be dropped by enemies — it is earned through protocol participation and bought at the exchange.

**How ALCX Is Earned:**
- **Queue participation drip** — every minute a player spends waiting in the veQueue earns a small ALCX drip. The longer you wait, the more you accumulate
- **Queue seniority multiplier** — players who have been in the queue longer without leaving earn a higher drip rate (teaches compounding seniority)
- **Purchasable** at the currency exchange for a modest fee (any token → ALCX)

**How ALCX Is Spent:**
- **Locked to enter veQueue** — a fixed ALCX amount is locked as the queue deposit (returned on entry or exit)
- **Queue jumping** — spend ALCX to skip ahead in the line; that ALCX is distributed to all current queue members proportionally. The more congested the queue, the more expensive the jump
- **Governance votes** — ALCX weight determines vote power in Governance Hall decisions

*ALCX is never used to buy items directly. Items in the market are priced in alUSD or alETH only.*

---

## 14. veQueue Mechanics — Design Details

### Watermark Line on the Queue Visualization — Principal Protection
- The queue visualization shows players waiting; add a visible watermark line — a marker showing "this is where your locked tokens are protected"
- Players can see their principal is safe even while waiting
- When a governance event affects players in queue, the watermark makes it visually obvious their tokens can't be touched
- **Teaches:** watermark principal protection

### Queue Seniority Decay — Passive Dilution Mechanic
- Idle players in the queue see their queue seniority (priority score) slowly decay relative to active players — not slashing, just gentle erosion
- Active players who vote and trade accumulate seniority faster
- **Balance:** casual players aren't harshly punished — they can still participate; engaged players get a visible edge; soft incentive to log in and interact without making absence catastrophic
- **Teaches:** passive dilution from inactivity vs. active governance compounding; no slashing — just opportunity cost

### Auction Fast Lane — Queue Bypass Mechanic
- Players who don't want to wait in the entry queue can bid ALCX in a live Queue Auction — pay above the current queue price to skip ahead
- The ALCX premium is distributed proportionally to all players currently waiting in queue (they earn from others jumping)
- Other players see the queue jump happening in real time
- **Balance:** auction price scales with queue depth — crowded queue = expensive bypass; patient players benefit from accumulating queue seniority while spenders burn ALCX; neither strategy is strictly dominant
- **Teaches:** entry queue premium capture — the mechanism earns from demand volatility; queue members are enriched by jumpers

### Exit Queue Donations — Below-Peg Mechanic
- When leaving the economic zone, if the exit queue is long/congested, players can optionally "donate" ALCX to the remaining queue members to jump ahead
- Alternatively framed as: an "early exit fee" paid by impatient leavers, distributed to remaining members
- **Balance:** staying longer earns queue seniority + potentially receives donations from impatient exiters; exiting fast costs a bit; neither is wrong — depends what you're optimizing for
- **Teaches:** exit queue below-peg donation mechanics — remaining holders are enriched when others leave early

### NPC "Whale Arrival" Event — Flow-Rate Dilution Resistance
- Occasionally an NPC whale announces they're entering the queue with a massive ALCX stake
- Players can see the projected impact on queue wait times *before* it happens (entry is rate-limited, so the math is visible)
- Players already in queue have time to react: stay for the seniority advantage, or exit now before wait times extend?
- The whale cannot skip the queue — even with 100× ALCX they enter at the same rate as everyone else; their presence changes dynamics but can't harm existing players
- **Teaches:** flow-rate dilution resistance — you can see the threat coming, principal is protected, orderly entry even for large capital

---

## 15. Idle Treasury — Tax Loop Viability

- Live treasury counter in the Governance Hall: a running total of all protocol fees collected
- Revenue sources: 15% bank yield fee, 0.50% borrower redemption fee, 1% early transmutation fee, 0.30% exchange fee, ALCX queue-jump fees
- Queue members see their pro-rata share ticking upward in real time even while just exploring the world — no action required
- **Teaches:** tax loop — protocol revenue automatically funding the cooperative, without governance votes required

---

## 16. Governance

### Governance Vote via Token Weight — Proportional Governance
- Periodically the Governance Hall holds votes on world events, e.g.:
  - "Should the Tavern sell XP potions this week?"
  - "Should adversary spawn rate increase for 24 hours (more loot, more danger)?"
  - "Should the exit queue fee be lowered?"
  - "Should the bank yield rate increase?" (mirrors Alchemix DAO setting MYT APR)
  - "Should the Transmuter term be shortened to 12 hours?" (mirrors DAO-configurable redemption period)
- Players vote with their locked ALCX weight — more ALCX locked = more vote weight
- Players in the exit queue forfeit voting rights until they re-enter
- Results display as an ALCX-weighted tally in real time as votes come in
- **Teaches:** proportional governance, exit queue = governance forfeit, why long-term commitment has value

---

## 17. rvqALCX SubZones — Recursive veQueue / Specialized Revenue

Specialized sub-zones inside the economic zone, each requiring you to commit your queue position (vqShares) to enter. Only one sub-zone at a time.

| Sub-Zone | Cost | Upside | Tradeoff |
|----------|------|--------|----------|
| **The Armory** | Commit vqShares | Access to better weapon trades | Lose general marketplace access |
| **The Alchemist** | Commit vqShares | Potion crafting | Lose Armory access |
| **The Black Market** | Commit vqShares | Rare item drops, high reward | High risk; lose all other sub-zone access |

- **Parent tax mechanic:** a % of Black Market profits flows into the general treasury, shared by all queue members — visible in real time so players feel it happening
- **Teaches:** rvqALCX specialization — commit deeper, earn more in your niche, sacrifice breadth; parent protocol earns a tax on sub-zone activity

---

## 18. Multiplayer — Asynchronous BBS Door Game Style

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

## 19. Core Design Tension — Time vs. Flexibility

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

## 20. Persistence — Server Accounts + Local Fallback

- Server-side accounts: username + SHA-256 PIN hash stored in flat JSON file (`players.json`)
- Character state saved to server on regular interval and on zone change
- Local localStorage fallback for guest players (progress not guaranteed across sessions)
- Future: HMAC-signed state payload to prevent client-side tampering
- Bank positions and Transmuter deposits must persist server-side (not just localStorage)

### Cookie / Session Integrity — Anti-Cheat
- Server should sign cookies with a secret key (HMAC) so tampered values are rejected on load
- Player state (tokens, inventory, queue position) stored in cookie as a signed payload — server verifies the signature on every reconnect; mismatched signature = cookie rejected, player starts fresh
- Secret key lives only on the server (env variable), never sent to client
- Prevents players from manually editing their localStorage/cookie to give themselves infinite tokens or fake items
- **Implementation:** `HMAC-SHA256(JSON.stringify(playerState), SERVER_SECRET)` appended to the cookie; verified on `join` event before accepting state

---

## 21. Audio — SNES-Style Sound & Procedural Music ✅ *(implemented)*

### Sound Effects
- SNES-style synthesized sound effects for all actions: footsteps, sword swing, hit, enemy death, coin pickup, queue ticket dispense, door open, vote cast, etc.
- Generated via Web Audio API (no audio file downloads needed)

### Music ✅
- Procedurally generated chiptune music — different track per zone, generated at runtime via Web Audio API
- 7 zone tracks: world (C major 126BPM), wilderness (A minor 88BPM), tavern (G major jig 160BPM), governance (D minor 96BPM), marketplace (F major 144BPM), treasury (Eb minor 92BPM), dungeon (E minor 80BPM)
- Look-ahead scheduler; switches zones seamlessly

### User Controls
- 🔊 SFX mute + 🎶 music mute buttons on HUD ✅
- Settings persist in localStorage

---

## 22. Admin Dashboard

A password-protected operator panel served at `/admin` on the same Node.js server. Designed for live demos and real-time governance demonstrations.

### Access & Auth
- Served at `/admin` route by the existing Express/Node server
- Protected by `ADMIN_PASSWORD` env var — simple POST login, session cookie
- Separate page from the game canvas; no in-game UI

### Live Stats Panel (read-only, real-time via Socket.io)
- Connected player count + each player's current zone
- Queue depth for marketplace and treasury (separate counters)
- Protocol treasury balance (accumulated from all fees)
- Total token supply in circulation: Spacebucks / Schmeckles / alUSD / alETH / ALCX
- Active bank positions count + total outstanding debt

### Tunable Parameters (push to all clients instantly)

| Parameter | Default | Control |
|-----------|---------|---------|
| Bank LTV % | 90% | Slider 0–100 |
| Bank yield fee % | 15% | Slider 0–50 |
| Loan auto-repayment speed | 0.5%/tick | Slider |
| Exchange fee % | 0.30% | Slider 0–5% |
| ALCX queue drip rate | 1 per 5s | Slider |
| MP regen rate | configurable | Slider |
| Enemy difficulty multiplier | 1× | Slider 0.5–5× |
| XP multiplier | 1× | Slider 0.5–5× |
| Shop prices multiplier | 1× | Slider 0.25–3× |
| Starting wallet (new players) | 100 SB / 50 alUSD / 20 ALCX | Number inputs |

### Admin Actions
- **Kick player** — disconnect by username
- **Teleport player** — move a specific player to any zone
- **Airdrop currencies** — grant tokens to all players simultaneously
- **Trigger whale arrival** — fire the NPC whale event (flow-rate dilution demo)
- **Broadcast message** — send a message to all players' in-game chat
- **Reset treasury** — zero the treasury balance counter
- **Toggle god mode** — enable/disable for a specific player
- **Force queue serve** — immediately serve the next player in a queue

### Why This Is High-Value for Demos
During a live presentation, the admin can say: *"Watch what happens when I lower the Bank LTV from 90% to 50%"* — and everyone in the game feels it immediately. Makes governance mechanics tangible rather than theoretical.

---

## 23. Dev Tools

### God Mode / Cheat Codes
- Konami-code style sequence to toggle god mode (e.g. ↑↑↓↓←→←→BA)
- God mode effects: invincibility, unlimited currency, instant queue bypass, full inventory capacity
- Visually indicated (character glows or has a halo) so it's obvious when active ✅ *(halo implemented)*
- Individual cheat codes for specific things: fill wallet, spawn adversary, skip queue, etc.
- Disabled/hidden in production; toggled via a dev flag in code
