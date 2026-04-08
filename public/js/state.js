// ── GAME STATE ────────────────────────────────────────────────────────────────
import { CFG, PLAYER_COLORS, HAIR_COLORS, RESPAWN_TX, RESPAWN_TY, TS } from './data.js';

export const G = {
  zone:'world',
  x: (RESPAWN_TX+0.5)*TS,
  y: (RESPAWN_TY+0.5)*TS,
  dir:2, // 0=up,1=right,2=down,3=left
  frame:0, moveTimer:0, moving:false,
  hp:CFG.MAX_HP, maxHp:CFG.MAX_HP,
  mp:6, maxMp:6,
  spacebucks: CFG.START_SPACEBUCKS,
  schmeckles: 0,
  alUSD: CFG.START_ALUSD,
  alETH: 0,
  alcx: CFG.START_ALCX,
  bankPositions: [],
  transmuterDeposits: [], // [{type:'alUSD'|'alETH', amount, available}]
  _shownQueueTip: false,
  _pendingConfirm: null,  // {_info, onYes, onNo} — active in-game confirm/info dialog
  _queueDeclinedTile: null, // {tx,ty} — tile where player last declined a queue prompt
  inventory:new Array(8).fill(null),
  stats:{str:2,vit:2,agi:2,end:2,lck:2},
  xp:0,
  level:1,
  statPoints:0,
  nickname:'Hero',
  color:PLAYER_COLORS[0],
  hairColor:HAIR_COLORS[1],
  gender:'male',     // 'male' | 'female' — selects warrior sprite
  skinTone:2,        // index into SKIN_TONES (0=lightest, 5=darkest)
  species:'human',
  class_:'warrior',
  persist:true,
  godMode:false,
  paused:false,
  tick:0,
  camX:0,camY:0,
  _prevX:0,_prevY:0,_camVx:0,_camVy:0,  // camera lead tracking
  _lastEmitX:0,_lastEmitY:0,_lastEmitDir:2,_lastEmitMoving:false,_lastEmitTime:0, // net emit tracking
  queueState:null,      // {zone, type:'entry'|'exit', ticket, served}
  lockedAlcx:0,         // ALCX locked while in entry queue
  zoneSeniority:0,      // 5-min intervals spent in marketplace/treasury without leaving
  govProposals:[],      // active governance proposals
  govHistory:[],        // settled proposals (newest last)
  redemptionRate:0.005,      // % of deposited collateral sent to transmuter per tick (governance-controlled)
  sbYieldRate:0.002,         // Spacebucks/alUSD yield rate — drifts each tick
  sbYieldRateMin:0.0005,     // SB yield floor
  sbYieldRateMax:0.005,      // SB yield ceiling
  sbYieldDrift:0.0002,       // max SB yield shift per tick
  schYieldRate:0.001,        // Schmeckles/alETH yield rate — usually lower than SB
  schYieldRateMin:0.0003,    // SCH yield floor
  schYieldRateMax:0.003,     // SCH yield ceiling
  schYieldDrift:0.0001,      // max SCH yield shift per tick
  alcxVoteLock:0,       // ALCX locked in active governance vote (inaccessible)
  govQuorum:50,         // quorum required for a valid proposal result
  battle:null,          // active battle state or null
  showMinimap:false,
  npcDialog:null,       // {npc, lineIdx} — active NPC conversation
  shop:null,            // {vendorId} — active shop or null
  dungeonBossDefeated:false,
  cavernBossDefeated:false,
  hideoutBossDefeated:false,
  ruinsBossDefeated:false,
  villageBossDefeated:false,
  worldLoot:[],
  marketListings:[],
  worldEvent:null,      // active world event or null
  livePrices:{alUSD:1.00,alETH:1800.0,alcx:5.0},
  treasury:{alUSD:0,alETH:0},
  accessory:null,       // 'cape' | 'hat' | 'glasses' | null
  equippedArmor:null,   // armor item object or null
  maxInvSlots:8,        // 8–12; upgradeable at Expansion Vendor in marketplace
  quests:{},            // {questId: {progress, status:'active'|'ready'|'completed'}}
  kills:0,              // total enemy kills (tracked for Hall of Fame)
  graffiti:[],          // [{id, zone, tileX, tileY, author, text, ts}]
  hallOfFame:{topXP:[],topKills:[],topGold:[]},
  snowballEnemies:[],   // [{id, zone, tileX, tileY, baseType, name, killCount, loot}]
};

export default G;
