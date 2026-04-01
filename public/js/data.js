'use strict';
// ═══════════════════════════════════════════════════════════════════════════
//  VICTORY QUEST  —  Graphics Engine + Game Client
// ═══════════════════════════════════════════════════════════════════════════

// ── CONFIG ──────────────────────────────────────────────────────────────────
const CFG = {
  W:640, H:416,          // logical canvas resolution
  TS:32,                 // tile size (logical px)
  TW:20, TH:13,          // viewport in tiles
  SPEED:2.2,             // player speed px/frame
  START_SPACEBUCKS:100,
  START_ALUSD:50,
  START_ALCX:50,
  MAX_HP:10,
  KONAMI:[38,38,40,40,37,39,37,39,66,65],
};
const {W,H,TS,TW,TH} = CFG;

// ── TILE CONSTANTS ───────────────────────────────────────────────────────────
const T={
  VOID:0, GRASS:1, ROAD:2, WALL:3, TREE:4, SIGN:5,
  FENCE:6, WATER:7, PLANK:8, MARBLE:9, STONE:10,
  VELVET:11, WINDOW:12, COUNTER:13, COLUMN:14,
  DOOR_O:15, DOOR_C:16, GRATING:17, VAULT:18,
  STALL:19, FOUNTAIN:20, PATH:21, SHRUB:22,
  QUEUE_IN:23, QUEUE_OUT:24, TICKET:25, DIRT:26,
};
const SOLID_TILES = new Set([
  T.WALL,T.TREE,T.FENCE,T.COLUMN,T.DOOR_C,T.SIGN,T.SHRUB,T.STALL
]); // T.VAULT intentionally walkable — decorative floor plating
const WORLD_SOLID = new Set([...SOLID_TILES, T.WATER]);
// Town offset within the world map
const WORLD_W=220, WORLD_H=150;
const TOWN_OX=90, TOWN_OY=55; // top-left of town in world tile coords
const NS_L=TOWN_OX+19, NS_R=TOWN_OX+20; // N-S road cols (109,110)
const EW_T=TOWN_OY+13, EW_B=TOWN_OY+14; // E-W road rows (68,69)
const RESPAWN_TX=TOWN_OX+20, RESPAWN_TY=TOWN_OY+14; // Town respawn tile (road intersection)

// ── COLORS ───────────────────────────────────────────────────────────────────
const PLAYER_COLORS = ['#2255DD','#DD2222','#22AA44','#9922CC','#DD8822','#116688','#CC44AA','#44AACC'];
const COLOR_NAMES   = ['Blue','Red','Green','Purple','Orange','Teal','Pink','Cyan'];

function hexToRgb(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return{r,g,b}}
function lighten(h,a){const{r,g,b}=hexToRgb(h);return`rgb(${Math.min(255,r+a)},${Math.min(255,g+a)},${Math.min(255,b+a)})`}
function darken(h,a){const{r,g,b}=hexToRgb(h);return`rgb(${Math.max(0,r-a)},${Math.max(0,g-a)},${Math.max(0,b-a)})`}

// ── HAIR COLORS ───────────────────────────────────────────────────────────────
const HAIR_COLORS  = ['#1A0A00','#3A2010','#7A5020','#C8A040','#E8E0C0','#E04030','#4080D0','#20A060'];
const HAIR_NAMES   = ['Black','Brown','Auburn','Blonde','Silver','Red','Blue','Green'];

// ── SPECIES ───────────────────────────────────────────────────────────────────
const SPECIES = {
  human: {
    label:'Human', baseHp:6,
    statCaps:{str:5,vit:5,agi:5,end:5,lck:5},
    desc:'Versatile. No caps, no weakness. The safe choice.',
    bodyW:24, bodyH:40, // sprite dimensions
  },
  elf: {
    label:'Elf', baseHp:5,
    statCaps:{str:3,vit:4,agi:6,end:3,lck:6},
    desc:'Swift and perceptive. Fragile in direct combat.',
    bodyW:22, bodyH:44,
  },
  dwarf: {
    label:'Dwarf', baseHp:8,
    statCaps:{str:6,vit:6,agi:3,end:6,lck:3},
    desc:'Ironclad and powerful. Slow, but nearly unkillable.',
    bodyW:28, bodyH:34,
  },
  goblin: {
    label:'Goblin', baseHp:4,
    statCaps:{str:3,vit:3,agi:7,end:3,lck:7},
    desc:'Insanely lucky and fast. Paper-thin health.',
    bodyW:20, bodyH:32,
  },
  orc: {
    label:'Orc', baseHp:7,
    statCaps:{str:7,vit:5,agi:3,end:6,lck:2},
    desc:'Pure destruction. Terrifying strength, poor luck.',
    bodyW:30, bodyH:40,
  },
  robot: {
    label:'Robot', baseHp:6,
    statCaps:{str:5,vit:4,agi:4,end:7,lck:1},
    desc:'Durable machine. No luck at all — just cold engineering.',
    bodyW:26, bodyH:40,
  },
};

// ── CLASSES ───────────────────────────────────────────────────────────────────
const CLASSES = {
  warrior: {
    label:'Warrior', icon:'⚔',
    classFloor:{str:2,end:2},   // locked minimums — identity you can't remove
    startWeapon:{name:'Iron Sword',icon:'⚔',dmg:4,type:'melee'},
    startShield:{name:'Kite Shield',icon:'🛡'},
    desc:'Frontline fighter. STR+END locked in — spend free pts on the rest.',
  },
  mage: {
    label:'Mage', icon:'🔮',
    classFloor:{lck:2,agi:1},
    startWeapon:{name:'Arcane Staff',icon:'🔮',dmg:3,type:'magic'},
    desc:'Spellcaster. LCK+AGI locked in — high crit ceiling, low durability.',
  },
  rogue: {
    label:'Rogue', icon:'🗡',
    classFloor:{agi:2,lck:1},
    startWeapon:{name:'Twin Daggers',icon:'🗡',dmg:3,type:'melee'},
    desc:'Swift striker. AGI+LCK locked in — hits first, hits often.',
  },
  paladin: {
    label:'Paladin', icon:'✝',
    classFloor:{vit:2,end:1},
    startWeapon:{name:'Holy Mace',icon:'⚒',dmg:3,type:'holy'},
    startShield:{name:'Sacred Shield',icon:'🛡'},
    desc:'Holy tank. VIT+END locked in — outlasts everything.',
  },
};

// ── ENEMIES ───────────────────────────────────────────────────────────────────
// Wilderness danger-zone encounter table (south of river, rows 38+)
const ENEMIES = {
  wolf: {
    type:'wolf', name:'Dire Wolf', maxHp:12, atk:3, def:1, spd:5,
    xp:12, drops:{spacebucks:8},
    msg:'A Dire Wolf lunges from the shadows!',
  },
  skeleton: {
    type:'skeleton', name:'Skeleton', maxHp:16, atk:5, def:2, spd:2,
    xp:20, drops:{spacebucks:15},
    msg:'A Skeleton rises from the ancient earth!',
  },
  goblin: {
    type:'goblin', name:'Cave Goblin', maxHp:9, atk:3, def:1, spd:6,
    xp:10, drops:{spacebucks:12},
    msg:'A Cave Goblin springs an ambush!',
  },
  darkKnight: {
    type:'darkKnight', name:'Dark Knight', maxHp:28, atk:7, def:5, spd:2,
    xp:40, drops:{schmeckles:5},
    msg:'A Dark Knight bars your path!',
  },
  lich: {
    type:'lich', name:'Ancient Lich', maxHp:80, atk:15, def:8, spd:1,
    xp:500, drops:{schmeckles:25},
    msg:'The Ancient Lich rises from its obsidian throne!',
  },
  // ── Wilderness sub-zone enemies ─────────────────────────────────────────
  iceTroll: {
    type:'iceTroll', name:'Ice Troll', maxHp:22, atk:5, def:3, spd:2,
    xp:28, drops:{spacebucks:18},
    msg:'A massive Ice Troll lurches forward, trailing frost!',
  },
  bandit: {
    type:'bandit', name:'Bandit Raider', maxHp:10, atk:4, def:1, spd:5,
    xp:16, drops:{spacebucks:22},
    msg:'A Bandit Raider springs from the shadows, blade gleaming!',
  },
  specter: {
    type:'specter', name:'Wailing Specter', maxHp:14, atk:6, def:0, spd:5,
    xp:24, drops:{schmeckles:3},
    msg:'A Wailing Specter tears through the stone — it cannot be reasoned with!',
  },
  ruinGuardian: {
    type:'ruinGuardian', name:'Ruin Guardian', maxHp:38, atk:9, def:6, spd:1,
    xp:65, drops:{schmeckles:8},
    msg:'A Ruin Guardian awakens from ages of slumber, its stone eyes blazing!',
  },
};

// ── DUNGEON MAP ───────────────────────────────────────────────────────────────
const DGN_W=50, DGN_H=36;
const DUNGEON_MAP=(()=>{
  const m=Array.from({length:DGN_H},()=>new Array(DGN_W).fill(T.WALL));
  function f(r1,c1,r2,c2,t){for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)m[r][c]=t;}
  function s(r,c,t){m[r][c]=t;}
  // ── Room 1: Entry ──────────────────────────────────────────────────────────
  f(2,2,10,14,T.STONE);
  // Exit door visual (north wall opening) — triggers zone transition
  s(2,7,T.DOOR_O);s(2,8,T.DOOR_O);
  // Pillars
  s(3,3,T.COLUMN);s(3,13,T.COLUMN);s(9,3,T.COLUMN);s(9,13,T.COLUMN);
  // Grating floor accents
  s(5,8,T.GRATING);s(7,7,T.GRATING);s(7,9,T.GRATING);
  // Passage east to corridor (rows 5-7 at col 14 are STONE not WALL)
  // (already filled above — row 2-10 cols 2-14 all STONE)
  // ── Corridor 1 ─────────────────────────────────────────────────────────────
  f(5,14,7,26,T.STONE);
  // ── Room 2: Middle ─────────────────────────────────────────────────────────
  f(2,26,13,40,T.STONE);
  s(3,27,T.COLUMN);s(3,39,T.COLUMN);s(12,27,T.COLUMN);s(12,39,T.COLUMN);
  s(7,32,T.GRATING);s(7,33,T.GRATING);s(7,34,T.GRATING);
  s(5,37,T.COLUMN);s(9,37,T.COLUMN); // alcove columns
  // Passage south to corridor
  f(13,31,13,34,T.STONE);
  // ── Corridor 2: South ──────────────────────────────────────────────────────
  f(13,31,24,34,T.STONE);
  // ── Boss Room ──────────────────────────────────────────────────────────────
  f(24,22,34,48,T.VAULT);
  // Walls around boss room
  for(let c=22;c<=48;c++){m[24][c]=T.WALL;m[34][c]=T.WALL;}
  for(let r=24;r<=34;r++){m[r][22]=T.WALL;m[r][48]=T.WALL;}
  // Corridor opening into boss room
  s(24,31,T.VAULT);s(24,32,T.VAULT);s(24,33,T.VAULT);s(24,34,T.VAULT);
  // Pillars
  s(25,24,T.COLUMN);s(25,30,T.COLUMN);s(25,38,T.COLUMN);s(25,46,T.COLUMN);
  s(33,24,T.COLUMN);s(33,30,T.COLUMN);s(33,38,T.COLUMN);s(33,46,T.COLUMN);
  // Altar/throne at far east
  f(28,44,30,47,T.STONE);
  s(29,46,T.COLUMN);s(29,47,T.WALL);
  // Grating accents
  s(29,28,T.GRATING);s(29,34,T.GRATING);s(29,40,T.GRATING);
  s(27,26,T.GRATING);s(31,26,T.GRATING);
  return m;
})();

// ── QUEST DEFINITIONS ─────────────────────────────────────────────────────────
const QUEST_DEFS = {
  wolf_hunt:{
    id:'wolf_hunt', title:'Wolf Culling', giver:'Town Crier',
    type:'kill', target:'wolf', required:5,
    reward:{xp:150,alUSD:80},
    offerLines:[
      "Traveller, a word. The Dire Wolves south of the river grow bolder.",
      "They've attacked three merchant caravans this month alone.",
      "Would you be willing to slay 5 of them? There's a reward in it for you.",
    ],
    inProgressLine:"The wolves still roam. Keep at it!",
    readyLines:[
      "Word reached me — you've done it! Five wolves slain.",
      "The roads are safer because of you.",
    ],
    completedLines:["The roads are safer thanks to you, hero. Safe travels!"],
  },
  goblin_hunt:{
    id:'goblin_hunt', title:'Goblin Problem', giver:'Grizzled Regular',
    type:'kill', target:'goblin', required:5,
    reward:{xp:120,alUSD:60},
    offerLines:[
      "Those damned goblins keep springing out of the wilderness at traders.",
      "I lost three good friends to goblin ambushes. Three.",
      "Kill five of those little monsters for me, would you?",
    ],
    inProgressLine:"Still need more goblin scalps. Keep going.",
    readyLines:[
      "Five goblins down? Ha! I knew you had it in you.",
      "Least I can do is share some of my coin.",
    ],
    completedLines:["Haven't seen a goblin since you went to work. Fine job."],
  },
  dark_knight_hunt:{
    id:'dark_knight_hunt', title:'Knight Slayer', giver:'Barkeep Moe',
    type:'kill', target:'darkKnight', required:1,
    reward:{xp:300,alUSD:150},
    offerLines:[
      "Word is a Dark Knight prowls the deep south — past the second river.",
      "It's terrorized every poor soul who wandered that far.",
      "I'll make it worth your while if you put it down.",
    ],
    inProgressLine:"That Dark Knight still walks? Be careful out there.",
    readyLines:[
      "You killed it?! By the gods, I heard thunder from here.",
      "You've earned this — and a legend to go with it.",
    ],
    completedLines:["A hero walks among us. Drinks on the house. ...Eventually."],
  },
  lich_quest:{
    id:'lich_quest', title:'The Ancient Evil', giver:'Senior Clerk Praxis',
    type:'kill', target:'lich', required:1,
    reward:{xp:800,alUSD:500,alETH:0.05},
    offerLines:[
      "The records speak of an Ancient Lich entombed beneath the dungeon entrance.",
      "It predates this town, the rivers, perhaps civilization itself.",
      "This is an official matter of state. We need a champion willing to end it.",
    ],
    inProgressLine:"The Lich still draws breath. The realm counts on you.",
    readyLines:[
      "It is done. I can feel the darkness lifting even here in this hall.",
      "The realm owes you a debt beyond measure. Take this — it is the least we can offer.",
      "That reward includes alETH — a synthetic asset backed by ETH yield. Rare, and valuable. Spend it in the Marketplace.",
    ],
    completedLines:["Peace shall reign. We'll need to update the records. Extensively."],
  },
  dark_knight_elite:{
    id:'dark_knight_elite', title:'Knight Slayer Elite', giver:'Armorer Brix',
    prereq:'dark_knight_hunt',
    type:'kill', target:'darkKnight', required:3,
    reward:{xp:500,alETH:0.02},
    offerLines:[
      "Three Dark Knights have been spotted forming a war band in the south.",
      "The city coffers can't pay in common coin — but I have alETH for someone brave enough.",
      "Slay all three and I'll make it worth your while.",
    ],
    inProgressLine:"More Dark Knights to slay. Don't stop now.",
    readyLines:[
      "Three Dark Knights, all dead? The south road is safe at last.",
      "Here — alETH, the currency of the on-chain realm. Spend it wisely in the Marketplace.",
    ],
    completedLines:["Try the Marketplace inside the economic zone — alETH buys the finest gear."],
  },
  cavern_quest:{
    id:'cavern_quest', title:'Frozen Depths', giver:'Miner Gundra',
    type:'kill', target:'iceTroll', required:3,
    reward:{xp:220, alUSD:110, item:{name:'Ice Crystal Shard',icon:'💎',desc:'A fragment of ancient glacial crystal. Rare crafting material.',type:'material'}},
    offerLines:[
      "Adventurer, the Crystal Cavern is overrun with Ice Trolls.",
      "They drove out my whole mining crew. Three dead, the rest fled.",
      "Slay three of the brutes and I'll share something valuable from the dig.",
    ],
    inProgressLine:"The Ice Trolls still haunt the cavern. Don't give up!",
    readyLines:[
      "Three Ice Trolls down! My crew can finally go back to work.",
      "Here — we found this shard deep in the ice. It's worth keeping.",
    ],
    completedLines:["The Crystal Cavern is ours again. Come back anytime, hero."],
  },
  hideout_quest:{
    id:'hideout_quest', title:'Bandit Bounty', giver:'Captain Dura',
    type:'kill', target:'bandit', required:6,
    reward:{xp:190, alUSD:95},
    offerLines:[
      "The Bandit Hideout is crawling with Raider gangs.",
      "They've ambushed three trade caravans this moon. Six dead merchants.",
      "I'll pay in alUSD for every six Raiders you put down.",
    ],
    inProgressLine:"Still bandits in the hideout. Keep clearing them!",
    readyLines:[
      "Six Raiders! Merchants can breathe again thanks to you.",
      "Here's your bounty — coin well earned.",
    ],
    completedLines:["The trade roads are clear. You've earned a drink, if we had ale out here."],
  },
  ruins_quest:{
    id:'ruins_quest', title:'Silence the Specters', giver:'Scholar Vex',
    type:'kill', target:'specter', required:4,
    reward:{xp:260, alUSD:130, item:{name:'Ancient Tome',icon:'📖',desc:'A weathered tome of forgotten lore. Collectors pay handsomely for these.',type:'material'}},
    offerLines:[
      "The Ancient Ruins are extraordinary — but the Specters make study impossible.",
      "Four of them haunt the inner chambers. They phase through walls. Terrifying.",
      "Banish four Specters and I'll give you a tome I recovered from the outer ring.",
    ],
    inProgressLine:"Still four Specters to banish. The ruins await, hero.",
    readyLines:[
      "The Specters are gone — finally silence! I can work in peace.",
      "As promised, this tome. Treat it well — it predates the town by centuries.",
    ],
    completedLines:["The ruins yield their secrets slowly. Visit again when you have time."],
  },
  village_quest:{
    id:'village_quest', title:'Guardian of the Fallen', giver:'Aldric',
    type:'kill', target:'ruinGuardian', required:1,
    reward:{xp:400, alUSD:220, item:{name:'Guardian Relic',icon:'🔮',desc:'A relic of immense power. Holding it, you feel stronger.',type:'relic',statBoost:{str:1,vit:1}}},
    offerLines:[
      "My family lived in this village before the Guardian drove us out.",
      "It's a colossus of stone and ancient magic. It cannot be bargained with.",
      "Defeat the Guardian and I'll give you the most precious thing I have left.",
    ],
    inProgressLine:"The Guardian still stands. Be strong — this matters.",
    readyLines:[
      "...It's really gone? You did it. After so many years.",
      "Take this relic. It was the Guardian's own core — now it serves you.",
    ],
    completedLines:["Perhaps one day this village will live again. Because of you."],
  },
};

// ── SHOP CATALOG ───────────────────────────────────────────────────────────────
const SHOP_CATALOG = {
  zelda: [
    // Weapons
    {name:'Iron Sword',    icon:'⚔',  desc:'Balanced starter blade.',         type:'weapon', dmg:4,  cost:50,  lvl:1, currency:'alUSD'},
    {name:'Steel Sword',   icon:'⚔',  desc:'Forged for seasoned fighters.',   type:'weapon', dmg:7,  cost:160, lvl:2, currency:'alUSD'},
    {name:'War Axe',       icon:'🪓', desc:'Heavy, brutal, effective.',        type:'weapon', dmg:9,  cost:280, lvl:3, currency:'alUSD'},
    {name:'Flame Blade',   icon:'🔥', desc:'Burns with ancient fire magic.',   type:'weapon', dmg:12, cost:0.5, lvl:5, currency:'alETH'},
    {name:'Shadow Blade',  icon:'🌑', desc:'Strikes from darkness for big crits.', type:'weapon', dmg:15, cost:0.9, lvl:8, currency:'alETH'},
    // Potions
    {name:'Health Potion', icon:'🧪', desc:'Restores 5 HP.',                  type:'potion', heal:5,       cost:25, lvl:1, currency:'alUSD'},
    {name:'Mega Potion',   icon:'💊', desc:'Fully restores HP.',               type:'potion', healFull:true,cost:80, lvl:3, currency:'alUSD'},
  ],
  flint: [
    {name:'Wooden Shield', icon:'🛡', desc:'Better than nothing.',             type:'shield', def:1, cost:40,  lvl:1, currency:'alUSD'},
    {name:'Iron Shield',   icon:'🛡', desc:'Solid protection.',                type:'shield', def:3, cost:150, lvl:2, currency:'alUSD'},
    {name:'Steel Shield',  icon:'🛡', desc:'Heavy but tough.',                 type:'shield', def:5, cost:350, lvl:4, currency:'alUSD'},
    {name:'Elven Ward',    icon:'✨', desc:'Magical barrier. Rare find.',       type:'shield', def:8, cost:0.7, lvl:7, currency:'alETH'},
  ],
};

// Offscreen canvases for the pixelation transition effect
const _snapCanvas=document.createElement('canvas');
_snapCanvas.width=W;_snapCanvas.height=H;
const _snapCtx=_snapCanvas.getContext('2d');
const _pixCanvas=document.createElement('canvas');
const _pixCtx=_pixCanvas.getContext('2d');
_pixCtx.imageSmoothingEnabled=false;

// Battle button hit-boxes (populated each frame during renderBattleScreen)
const BATTLE_BTNS={};

