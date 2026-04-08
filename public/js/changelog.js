// ── CHANGELOG ─────────────────────────────────────────────────────────────────
// Add new entries at the TOP. Each entry: { version, date, sections[] }
// Each section: { title, items[] }
// LATEST_VERSION in ui.js is driven by CHANGELOG[0].version.
export const CHANGELOG=[
  {
    version:'1.1.0', date:'Apr 8 2026',
    sections:[
      {title:'Content — Battle Sprites',items:[
        'Added battle sprites for all 6 previously invisible enemies: River Sprite (aqua fairy with dragonfly wings and water-trail form), Murk Crawler (wide swamp crab with eye-stalks and pincers), River Serpent (coiled blue-green snake with slit eye and forked tongue), Tree Spirit (spectral bark creature with green aura and root tendrils), Forest Warden (tall bark-armoured guardian with leaf cloak and great club), Thorn Beast (heavy quadruped with spine ridge and red slit eyes). All 19 enemy types now have full pixel-art battle sprites.',
      ]},
      {title:'Bug Fix — Inventory',items:[
        'Fixed crash when unequipping any weapon, shield, or armour. The UNEQUIP button was embedding the callback function as a serialised string in an inline onclick attribute — Vite\'s minifier renamed closure variables (e.g. G → O) inside the bundle, so those names were undefined when the inline handler ran in global scope. Button now attaches the callback via addEventListener, keeping it inside the module closure where all names resolve correctly.',
      ]},
      {title:'UI — Stat Labels',items:[
        'LCK now correctly shows all three things it drives in every stat display: character creation row (was "LCK (Drop)", now "LCK (Crit / MP)"), in-game character screen (was "LCK (Crit / Drop)", now "LCK (Crit / MP / Drop)"). The How To Play guide already had this correct.',
        'Character creation preview card now shows the starting MP pool alongside HP (e.g. "♥ 5  ⚔ 2  ◆ 4mp"), updating live as you allocate LCK points.',
      ]},
    ],
  },
  {
    version:'1.0.9', date:'Apr 8 2026',
    sections:[
      {title:'Bug Fixes — Queue & Input',items:[
        'Mobile ESC button now correctly dismisses queue confirm dialogs (Y/N prompt). Previously only the keyboard Escape key worked; the on-screen ESC button called handleEsc() which skipped the pending-confirm check entirely, leaving mobile players unable to decline queue entry.',
        'Fixed a trap: after declining queue entry at the Marketplace or Treasury gate, players are now nudged back to the E-W road. Previously the player was left inside the solid fence box — moving north cleared the decline flag and moving south re-triggered the dialog in a loop with no lateral escape.',
        'How To Play guide: corrected gate directions for Marketplace (was "east gate", now "south-west gate") and Treasury (was "south gate", now "south-east gate").',
      ]},
      {title:'Visual — Governance Hall',items:[
        'Removed interior ceiling renders. The ceiling strip was painting a dark band over north-wall doors, obscuring exits and NPC tooltips when approaching from the south.',
        'Chamber Warden NPC repositioned to stand directly in front of the locked Chamber door (was offset to the right, partially hidden).',
        'Added a velvet carpet strip at the approach to the Chamber door to visually signal the guarded zone boundary.',
      ]},
    ],
  },
  {
    version:'1.0.8', date:'Apr 6 2026',
    sections:[
      {title:'Economy — Four-Currency Price Feeds & Arbitrage',items:[
        'Each currency now has its own independent live price feed from CoinGecko:',
        '  • Spacebucks — hardcoded $1.00 (USD stablecoin equivalent)',
        '  • alUSD — live alUSD market price (~$0.99); no longer hardcoded to $1',
        '  • Schmeckles — pegged to spot ETH price (ethereum on CoinGecko, ~$2,100+)',
        '  • alETH — pegged to the alETH liquid-staking token price (alchemix-eth on CoinGecko, distinct from spot ETH)',
        '  • ALCX — live ALCX governance token price (unchanged)',
        'This creates real arbitrage opportunities: alUSD/spacebucks spread (~0.5%), alETH/schmeckles spread (~3–5%) depending on alETH depeg.',
        'Server emits an alert in town chat when alETH diverges from spot ETH by more than 1.5% — useful signal for traders.',
        'Currency exchange now uses the correct cross-rate: 1 schmeckle exchanged for alUSD yields ~$2,100 worth of alUSD (less 0.3% fee), not $1.',
        'Schmeckles precision upgraded to 4 decimal places (matching alETH) since the ETH price makes sub-unit amounts meaningful.',
      ]},
      {title:'Economy — UI Fixes',items:[
        'Exchange panel now shows schmeckle balance with live USD value, e.g. "2.5000 💀 (≈$5,370)".',
        'HUD alUSD balance now shows 2 decimal places ($164.57 instead of $164) — small exchange credits are no longer invisible.',
      ]},
      {title:'Security — New-Account Currency Hardening',items:[
        'Fixed a gap in the server-authoritative economy: on a brand-new account\'s very first save_character call, the server had no existing currency data, so it would fall back to whatever the client sent.',
        'Server now always initialises new accounts to zero for all currency fields (spacebucks, schmeckles, alUSD, alETH, ALCX, lockedAlcx) regardless of what the client sends.',
        'Bank positions and transmuter deposits likewise default to empty arrays on first save, preventing fabricated loan or deposit records.',
      ]},
      {title:'Engineering — Test Suite',items:[
        'Added 37-test integration + unit test suite (tests/server.test.mjs) using Node\'s built-in node:test runner.',
        'Integration tests connect to the live server via socket.io-client and exercise: authentication (register/login/PIN rejection), save_character client-authoritative field persistence, save_character server-owned field protection, currency_exchange validation, bank_borrow validation.',
        'Unit tests cover: exchange rate cross-currency math (including schmeckles↔alUSD at ETH rate), bank LTV calculations, and transmuter fee calculations.',
        'Run with: cd tests && node --test server.test.mjs',
      ]},
    ],
  },
  {
    version:'1.0.7', date:'Apr 5 2026',
    sections:[
      {title:'Architecture — Server-Authoritative Economy',items:[
        'All economy state (spacebucks, schmeckles, alUSD, alETH, ALCX, bank positions, transmuter deposits, lockedAlcx) is now owned exclusively by the server.',
        'Client no longer sends currency fields in save_character — the server always restores them from its own pdb, ignoring whatever the client sends. A devtools hack on G currencies will never reach the database.',
        'Removed HMAC signature system (signPlayerData / verifyPlayerData / _sig). The signature\'s secret was in the source code, making it weak; more importantly, every server-side handler that mutated currencies needed to re-sign before saving, which was the root cause of the data-loss bug fixed in v1.0.6.',
        'Removed save_character inflation guard and all bidirectional anti-cheat checks — no longer needed since the server never accepts client-provided currency values.',
        'Removed G._txPending race-condition guard — no longer needed since currencies are not part of the client save payload.',
        'save_character now only carries gameplay state: appearance, stats, HP/MP, XP/level, inventory, quests, kills. This payload is fully client-authoritative and contains no economically sensitive data.',
      ]},
    ]
  },
  {
    version:'1.0.6', date:'Apr 5 2026',
    sections:[
      {title:'Critical Fix — Currency Exchange & Data Persistence',items:[
        'Fixed root cause of currency exchange losses: server-side handlers (currency_exchange, bank_borrow, bank_claim, transmuter_withdraw, loot_pickup, market_buy, alcx_yield, quest_reward, queue_join/leave, governance settlement) were mutating pdb currency values and calling saveDb() without recalculating the HMAC signature.',
        'Result: after any server-authoritative transaction, the on-disk save had mismatched data vs. signature. If the server restarted before the client\'s follow-up save_character arrived (which was the only save that re-signed), HMAC tamper detection fired at next login and wiped all player data.',
        'Fix: added d._sig=signPlayerData(d) immediately before saveDb() in all 14 affected handlers so every write is always self-consistent.',
        'Also fixed race condition guard: auto-save timer (every 5 s) is now blocked during in-flight server-authoritative transactions via G._txPending flag, preventing the client from sending stale currency values between exchange/bank/transmuter request and response.',
        'Also fixed doAuctionBid ALCX deduction not being persisted across restarts (saveDb was missing from queue_auction_bid handler).',
      ]},
    ]
  },
  {
    version:'1.0.5', date:'Apr 5 2026',
    sections:[
      {title:'Bug Fixes — ES Module Runtime Errors',items:[
        'Fixed "G is not defined" error firing every game-loop frame: render.js was using the player state object without importing it from state.js.',
        'Fixed "clearRect on undefined" crash: ui.js had a stale local let ctxTiles declaration that shadowed the properly-initialised canvas context exported by game.js.',
        'Fixed "WORLD_H / DUNGEON_MAP is not defined" at startup: maps.js was missing several constants from its data.js import.',
        'Fixed "lighten / darken is not defined" in render.js: colour utility helpers were private in data.js and not exported.',
        'Fixed "T / RARITY_COLOR / RESPAWN_TX / musPlay / ZONES" not defined in combat.js: completed missing imports from data.js, audio.js, and maps.js.',
        'Fixed "degradeItem / itemEffDmg / itemMaxDur" not defined in combat.js: functions were unexported from ui.js.',
        'Fixed "hasRaft / hasForestPass" not defined in combat.js: helper functions in game.js were not exported.',
        'Fixed "MAP_W / MAP_H" wrong import source in game.js and ui.js (live in maps.js, not data.js).',
        'Fixed "saveToServer / socket / others / xpForLevel" wrong import source in ui.js (live in socket.js / combat.js).',
        'Game now loads and runs without any ReferenceError or TypeError on startup.',
      ]},
    ]
  },
  {
    version:'1.0.4', date:'Apr 5 2026',
    sections:[
      {title:'Engineering — Vite Build & ES Module Split',items:[
        'All client-side JavaScript converted to ES modules (import/export syntax).',
        'Monolithic game.js (~5 000 lines) split into focused modules: state.js, combat.js, ui.js, socket.js, input.js, and a lean core game.js.',
        'Vite bundler added — single optimised JS bundle (~370 kB) replaces six individual script tags.',
        'socket.io-client is now an npm dependency, bundled at build time instead of served separately.',
        'Production server now serves the Vite-built dist/ folder; development uses Vite\'s hot-reload dev server.',
        'Stray </style> tag removed from style.css (caused lightningcss build failure).',
      ]},
    ]
  },
  {
    version:'1.0.3', date:'Apr 5 2026',
    sections:[
      {title:'Governance Chamber — Voting Inside the District',items:[
        'New Governance Chamber zone added as a third room in the veQueue inner district.',
        'Accessible via the east door of the Treasury — no re-queuing required.',
        'The Governance Board NPC inside the Chamber lets you vote on protocol parameters using your queue-locked ALCX.',
        'Chamber includes the Chamber Clerk (explains voting rules) and Chamber Warden (guides you back).',
        'The existing Governance Hall (outside the queue) now directs players to the Chamber for actual voting.',
        'Zone seniority and ALCX yield continue to accumulate while inside the Governance Chamber.',
        'Live price / treasury panel is shown on the HUD inside the Chamber.',
        'South exit door in the Chamber returns you to the world map if needed.',
      ]},
    ]
  },
  {
    version:'1.0.2', date:'Apr 5 2026',
    sections:[
      {title:'Balance — Monster Schmeckle Rewards',items:[
        'Schmeckle drops from all enemies reduced by roughly 50–60% to make the currency feel scarce and earned.',
        'Wailing Specter: 3→1 · Dark Knight: 5→2 · Shadow Wraith: 5→2 · Forest Warden: 5→2.',
        'River Serpent: 6→2 · Stone Golem: 6→2 · Shadow Mage: 7→3 · Ruin Guardian: 8→3.',
        'Thorn Beast: 9→4 · Ancient Lich: 25→10.',
        'alUSD and Spacebucks drops from enemies are unchanged.',
      ]},
    ]
  },
  {
    version:'1.0.1', date:'Apr 5 2026',
    sections:[
      {title:'Bank Loan Repayment Fix',items:[
        'Loans were repaying in ~10 minutes instead of the intended ~17 hours.',
        'Root cause: a client-side game-loop ticker was firing every 3 seconds at 0.5% of original principal — ~100× faster than the server\'s 5-minute transmuter tick — and continuously overwriting the server\'s debt values.',
        'Fix: removed client-side repayment entirely. Debt now reduces server-side only (earmark rate × current debt every 5 minutes).',
        'At the default 0.5% earmark rate, full loan repayment now takes ~17 hours.',
      ]},
      {title:'Earmark Rate Persistence Fix',items:[
        'Admin panel earmark rate changes were lost on every server restart.',
        'Root cause: saveGov() was persisting proposals, history, and ID sequence, but omitting earmarkRate from the file.',
        'Fix: earmarkRate is now included in governance.json; admin changes and governance vote outcomes both survive restarts.',
      ]},
    ]
  },
  {
    version:'1.0.0', date:'Apr 5 2026',
    sections:[
      {title:'Inner-District Tunnels',items:[
        'Marketplace and Treasury are now connected by a direct passage — no re-queuing required.',
        'Velvet corridor strips lead to each portal; open doorways cut through the shared wall.',
        'Corridor Warden NPCs at each entrance explain the free-passage rule.',
        'Once inside the veQueue district (having earned your spot through the queue), you can walk freely between Marketplace and Treasury as many times as you like.',
        'Chat log announces the corridor transition so you always know which zone you entered.',
      ]},
    ]
  },
  {
    version:'0.9.9', date:'Apr 5 2026',
    sections:[
      {title:'How to Play Guide',items:[
        'New 8-page tabbed "How to Play" overlay covering all game systems.',
        'Auto-shown when a brand-new character first enters the world.',
        'Re-open any time via "📖 HOW TO PLAY" button in the Escape / Character menu.',
        'Press Escape to close the guide without leaving the menu.',
        'Tabs: Getting Around · Currencies · Bank · Transmuter · veQueue · Governance · Combat · NPCs.',
      ]},
    ]
  },
  {
    version:'0.9.8', date:'Apr 5 2026',
    sections:[
      {title:'Currency Persistence Fix',items:[
        'Fixed a critical bug where alETH, alUSD, and other currency gains vanished on every reload.',
        'Root cause: save_character anti-cheat blocked ALL client-side currency increases — including legitimate ones from bank borrows, transmuter claims, and exchanges. Players saw correct balances during play (ghost balances) but pdb was never updated.',
        'Bank borrow, bank claim, transmuter claim, transmuter early-withdrawal, and currency exchange are now fully server-authoritative: pdb is updated first, then the client receives canonical balances.',
        'Five new server socket events: bank_borrow, bank_claim, transmuter_claim, transmuter_withdraw, currency_exchange.',
        'Fixed transmuter_sync incorrectly crediting alUSD/alETH when available dropped (should credit spacebucks/schmeckles); credit now handled by the new transmuter_claim handler.',
      ]},
    ]
  },
  {
    version:'0.9.7', date:'Apr 5 2026',
    sections:[
      {title:'Save System Hardening',items:[
        'save_character now re-injects server-only fields (alcxVoteLocks, _lastZoneYield, _lastQueueYield) after writing client data — previously a full replace wiped them on every save.',
        'Anti-cheat extended bidirectionally: saves where alETH or alUSD drops below 10% of the stored value are now rejected, catching accidental zero-saves at startup.',
        'Added missing pdb existence guard in save_character to prevent potential crash on unregistered accounts.',
        'Governance proposal IDs now persist across server restarts (idSeq saved to governance.json) — prevents vote lock ID collisions.',
      ]},
      {title:'NPC Accessibility',items:[
        'Exchanger Rex moved from inside Governance Hall wall tiles (unreachable) to main road east of the fountain.',
        'Armorer Brix moved one tile south to walkable ground.',
      ]},
    ]
  },
  {
    version:'0.9.6', date:'Apr 5 2026',
    sections:[
      {title:'veQueue & Governance Mechanics Review',items:[
        'Fixed: pdb.lockedAlcx was never updated on queue_join/leave — vote validation always read 0, blocking all players from voting even after joining a queue.',
        'Fixed: auction bid and fast-exit fee double-deducted vote-locked ALCX (it\'s inside lockedAlcx, not free alcx).',
        'Fixed: queue leave returned full lockedAlcx including vote-committed portion — players could recover vote-staked ALCX by simply leaving the queue.',
        'Fixed: vote settlement deleted alcxVoteLocks entry but did not refund the ALCX — vote-staked tokens were silently destroyed. Settlement now credits the refund and emits gov_vote_released.',
        'Fixed: zone/queue ALCX yield bypassed anti-cheat (client self-credited). Replaced with server-authoritative alcx_yield_request / alcx_yield pattern with per-source throttling (4s zone, 8s queue).',
        'Fast-exit fee changed from 5% of wallet to 2.5 ALCX × positions ahead — fairer and chain-agnostic.',
      ]},
    ]
  },
  {
    version:'0.9.5', date:'Apr 5 2026',
    sections:[
      {title:'Governance Overhaul',items:[
        'Voting epochs extended to 24 hours (was 5 minutes).',
        'Votes now require ALCX locked inside a veQueue zone — free-wallet ALCX cannot vote.',
        'Players choose how much of their queue-locked ALCX to commit to each vote.',
        'Committed ALCX is inaccessible for other purposes (withdrawals, bids) until the epoch settles.',
        'Quorum raised to 50 ALCX total weight before a vote can pass.',
        'Governance history (last 20 votes) now persisted across server restarts.',
        'Earmark rate live value persisted in governance.json.',
      ]},
    ]
  },
  {
    version:'0.9.4', date:'Apr 2 2026',
    sections:[
      {title:'UX Polish',items:[
        'Gear auto-equips on purchase if the slot is empty; otherwise prompts clearly.',
        'Quest tracker strip always visible below XP bar — shows progress or "READY TO TURN IN".',
        'FLEE button now shows live escape chance % based on your AGI vs enemy speed.',
        'Potion picker in battle: multiple potion types show a chooser instead of auto-using the first.',
        'Unspent stat points pulse orange on the HUD level display with a count.',
        'Minimap shows NPC markers: 🛒 shop · ! quest available · ★ quest ready · ✓ done.',
        'Death penalty (30% currency + bag items) explained once on first battle.',
      ]},
      {title:'Mobile',items:[
        '⛶ fullscreen button added to mobile HUD — locks to landscape on Android.',
        'iOS: PWA meta tags added; Add to Home Screen for true native fullscreen.',
      ]},
    ]
  },
  {
    version:'0.9.3', date:'Apr 2 2026',
    sections:[
      {title:'Combat — Weapon Switching',items:[
        'Removed clunky two-step SWITCH WPN overlay.',
        'New persistent LOADOUT strip below action buttons shows all weapons at all times.',
        'One click on any alternate weapon swaps it in (costs a turn).',
        'W / Tab keyboard shortcut cycles through weapons.',
        'Durability bars visible on each weapon card in the loadout.',
      ]},
    ]
  },
  {
    version:'0.9.2', date:'Apr 2 2026',
    sections:[
      {title:'Balance Overhaul',items:[
        'Enemy scaling fixed: weapon damage now has 0.85× weight in power formula (was 0.5×).',
        'Depth-scaling drops: loot × (1 + min(2, depth/15)) — up to 3× at depth 30+.',
        'Shop inflation: prices rise 12%/level above 1. Arbitrage opportunity for low-level players.',
        'LCK shop discount: 1%/pt off prices (up to 10%) — makes LCK useful beyond crits.',
        'Gear durability: weapons degrade per attack, shields/armor per hit. Repair in shop.',
        'LCK rebalanced: crit cap 80%→40%, potion drop cap 60%→45%.',
        'Deep-zone armor penetration: enemies at depth 30+ bypass up to 55% of flat DEF.',
        'Quest rewards scale +8%/level above 1 — quests stay relevant throughout.',
      ]},
    ]
  },
  {
    version:'0.9.1', date:'Apr 2 2026',
    sections:[
      {title:'Sprites — Hair & Color Fixes',items:[
        'Female warrior, mage, rogue, paladin, elf, and orc: hair cascade now drawn before armor.',
        'Changing hair color no longer recolors the entire character body.',
        'Armor color changes now only affect armor elements as expected.',
      ]},
      {title:'Sprites — New Characters',items:[
        'All species and classes now have fully procedural canvas sprites (no PNGs).',
        'Human: warrior, mage, rogue, paladin — male and female variants.',
        'Non-human: elf, dwarf, goblin, orc, robot — male and female variants.',
        'drawPlayerSprite routing updated for all species/class combinations.',
      ]},
    ]
  },
];
