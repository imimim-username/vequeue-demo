import { G } from './state.js';
import { T, ENEMIES, QUEST_DEFS, TS, RARITY_COLOR, RESPAWN_TX, RESPAWN_TY, _snapCanvas, _snapCtx, _pixCanvas, _pixCtx, BATTLE_BTNS } from './data.js';
import { SFX, musPlay } from './audio.js';
// These are imported from game.js (circular is fine — only used inside functions, not at eval time)
import { chatLog, changeZone, updateQuestProgress, W, H, ctxUI, hasRaft, hasForestPass } from './game.js';
import { saveToServer } from './socket.js';
import { ZONES, WORLD_MAP } from './maps.js';
// ui.js imports — circular (ui.js imports xpForLevel etc. from combat.js), safe inside function bodies
import { degradeItem, itemEffDmg, itemMaxDur } from './ui.js';

// ── BATTLE SYSTEM ─────────────────────────────────────────────────────────────

// ── Combat scaling ─────────────────────────────────────────────────────────────
// Player "power level" = average stat value + half weapon damage.
// Enemies scale to this so fights are always proportionate to your build.
export function playerPowerLevel(){
  const s=G.stats;
  const avg=(s.str+s.vit+s.agi+s.end+s.lck)/5; // 2.0 at start; rises as you invest points
  const wdmg=G.inventory[0]?.dmg||2;
  // Weight weapon damage at 0.85 (was 0.5) so buying better gear properly pushes
  // enemy scaling to match the real attack increase, closing the gear-power gap.
  return avg+wdmg*0.85;
}

// Build a scaled enemy: HP / ATK / DEF are calculated from player power.
// Each enemy type has a difficulty multiplier (<1 = easier, >1 = harder).
// Depth below the river adds a small bonus (deeper = slightly tougher).
export function makeScaledEnemy(key,depth){
  const tmpl=ENEMIES[key];
  const pl=playerPowerLevel();
  const baseMult={wolf:0.65,goblin:0.55,skeleton:0.82,darkKnight:1.15,lich:2.2,
    iceTroll:0.88,bandit:0.60,specter:0.75,ruinGuardian:1.20}[key]||0.75;
  const depthBonus=Math.min(0.15,depth/130); // up to +15% at the very bottom
  const m=baseMult+depthBonus;
  return{
    ...tmpl,
    maxHp:   Math.max(6, Math.round(pl*m*3.6)),
    atk:     Math.max(1, Math.round(pl*m*0.70)),
    def:     Math.max(0, Math.round(pl*m*0.28)),
    currentHp:Math.max(6,Math.round(pl*m*3.6)),
    xp:      Math.max(tmpl.xp, Math.round(tmpl.xp*m*G.level)),
  };
}

// ── XP & LEVELING ──────────────────────────────────────────────────────────────
// XP required to advance from level L to L+1. Grows by ~50% per level.
export function xpForLevel(l){ return Math.floor(100*Math.pow(1.5,l-1)); }

// Call after adding XP — handles multi-level-ups in one call.
export function checkLevelUp(){
  while(G.xp>=xpForLevel(G.level)){
    G.xp-=xpForLevel(G.level);
    G.level++;
    G.statPoints+=3;
    // reset per-session spend tracker so the minus button knows what's refundable
    if(!G.pendingStats)G.pendingStats={str:0,vit:0,agi:0,end:0,lck:0};
    G.maxHp++;
    G.hp=Math.min(G.maxHp,G.hp+2); // partial HP restore on level-up
    SFX.levelUp();
    chatLog(`★ LEVEL UP! You are now level ${G.level}! +3 stat points, +1 max HP`,'#FFD700');
    if(G.paused)renderInventoryScreen(); // refresh stat panel if open
  }
}

// Spend one stat point into the given stat key.
export function spendStat(st){
  if(G.statPoints<=0)return;
  G.stats[st]++;
  if(!G.pendingStats)G.pendingStats={str:0,vit:0,agi:0,end:0,lck:0};
  G.pendingStats[st]=(G.pendingStats[st]||0)+1;
  G.statPoints--;
  if(st==='vit'){G.maxHp++;G.hp=Math.min(G.maxHp,G.hp+1);}
  renderInventoryScreen();
}

// Refund one spent-this-session stat point back to the pool.
export function refundStat(st){
  if(!G.pendingStats||(G.pendingStats[st]||0)<=0)return;
  G.stats[st]--;
  G.pendingStats[st]--;
  G.statPoints++;
  if(st==='vit'){G.maxHp--;G.hp=Math.min(G.maxHp,G.hp);}
  renderInventoryScreen();
}

// Safe ring defined by four rivers. Depth = tiles outside the ring.
export function worldDangerDepth(){
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  // Inside the ring (between all 4 rivers) → depth 0
  if(tx>52&&tx<165&&ty>24&&ty<100)return 0;
  const dx=Math.max(0,52-tx,tx-164);
  const dy=Math.max(0,24-ty,ty-99);
  return dx+dy;
}

// Outpost safe zones — quest-giver buildings in the wilderness. No encounters near them.
// Format: {tx, ty, r} — tile centre + Manhattan radius
export const OUTPOST_SAFE_ZONES=[
  {tx:70,  ty:10,  r:9},  // Crystal Cavern outpost (NW)
  {tx:40,  ty:120, r:9},  // Bandit Hideout outpost (SW)
  {tx:186, ty:9,   r:9},  // Ancient Ruins outpost (NE)
  {tx:96,  ty:106, r:9},  // Abandoned Village outpost (S)
];
export function isNearOutpost(){
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  return OUTPOST_SAFE_ZONES.some(o=>Math.abs(tx-o.tx)+Math.abs(ty-o.ty)<=o.r);
}

export function checkEncounter(){
  if(G.battle)return;
  if(G.zone!=='world')return;
  if(!G.moving)return;
  if(G.tick%50!==0)return;
  const depth=worldDangerDepth();
  if(depth<8)return;             // safe zone (inside river ring)
  if(isNearOutpost())return;     // safe near quest outpost buildings
  let encounterRate=0.22;
  if(G.worldEvent?.type==='dark_storm')encounterRate=0.44;
  if(G.worldEvent?.type==='monster_swarm')encounterRate=0.66;
  if(Math.random()>encounterRate)return;
  let key;
  if(depth<20)      key=['wolf','goblin','wraith'][Math.floor(Math.random()*3)]==='wraith'&&Math.random()<0.15?'wraith':Math.random()<0.55?'wolf':'goblin';
  else if(depth<40) key=['wolf','skeleton','goblin','wraith','voidMage'][Math.floor(Math.random()*5)];
  else              key=['darkKnight','skeleton','stoneGolem','shadowMage','voidMage'][Math.floor(Math.random()*5)];
  triggerBattle(key,depth);
}

export function checkBossEncounter(){
  if(G.battle||G.zone!=='dungeon'||G.dungeonBossDefeated)return;
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  if(ty>=26&&tx>=23&&tx<=47){
    chatLog('★ The air grows cold... something ancient stirs!','#AA00FF');
    triggerBattle('lich',999);
  }
}

// Sub-zone random encounters — each zone has its own encounter table
export const SUBZONE_ENCOUNTERS = {
  cavern:  {pool:['iceTroll','iceTroll','wolf','stoneGolem'],          rate:0.20, depth:25},
  hideout: {pool:['bandit','bandit','voidMage','wolf'],                rate:0.22, depth:20},
  ruins:   {pool:['specter','wraith','skeleton','shadowMage'],         rate:0.20, depth:28},
  village: {pool:['ruinGuardian','stoneGolem','shadowMage','skeleton'],rate:0.18, depth:30},
};
// Boss-like zone bosses (one per zone, flagged on G)
export const SUBZONE_BOSSES = {
  cavern:  {flag:'cavernBossDefeated',  enemy:'iceTroll',  area:{tx0:3,ty0:1,tx1:19,ty1:4}},
  hideout: {flag:'hideoutBossDefeated', enemy:'bandit',    area:{tx0:3,ty0:1,tx1:19,ty1:4}},
  ruins:   {flag:'ruinsBossDefeated',   enemy:'ruinGuardian',area:{tx0:7,ty0:5,tx1:16,ty1:11}},
  village: {flag:'villageBossDefeated', enemy:'ruinGuardian',area:{tx0:6,ty0:7,tx1:15,ty1:12}},
};

export function checkSubZoneEncounter(){
  if(G.battle)return;
  if(!G.moving)return;
  if(G.tick%55!==0)return;
  const enc=SUBZONE_ENCOUNTERS[G.zone];
  if(!enc)return;
  // Safe zone near the subzone entrance/spawn (where the quest NPC stands)
  const z=ZONES[G.zone];
  if(z){
    const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
    if(Math.abs(tx-z.spawnX)+Math.abs(ty-z.spawnY)<=6)return; // safe near entrance
  }
  if(Math.random()>enc.rate)return;
  const key=enc.pool[Math.floor(Math.random()*enc.pool.length)];
  triggerBattle(key,enc.depth);
}

export function checkSubZoneBoss(){
  const bossInfo=SUBZONE_BOSSES[G.zone];
  if(!bossInfo)return;
  if(G.battle||G[bossInfo.flag])return;
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  const {tx0,ty0,tx1,ty1}=bossInfo.area;
  if(tx>=tx0&&tx<=tx1&&ty>=ty0&&ty<=ty1){
    chatLog(`★ The ${ENEMIES[bossInfo.enemy]?.name||'creature'} senses an intruder!`,'#AA00FF');
    triggerBattle(bossInfo.enemy,40);
  }
}

// Water encounter — triggered when rafting across rivers or lakes
export function checkWaterEncounter(){
  if(G.battle||G.zone!=='world'||!G.moving)return;
  if(G.tick%65!==0)return;
  if(!hasRaft())return;
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  if(WORLD_MAP[ty]?.[tx]!==T.WATER)return;
  if(Math.random()>0.18)return;
  const pool=['riverSprite','murkCrawler','riverSprite','serpentine'];
  triggerBattle(pool[Math.floor(Math.random()*pool.length)],18);
}

// Forest encounter — triggered when walking through trees with Pathfinder Boots
export function checkForestEncounter(){
  if(G.battle||G.zone!=='world'||!G.moving)return;
  if(G.tick%58!==0)return;
  if(!hasForestPass())return;
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  if(WORLD_MAP[ty]?.[tx]!==T.TREE)return;
  const depth=worldDangerDepth();
  if(depth<5)return; // safe forest near town ring
  if(Math.random()>0.20)return;
  const pool=depth<25
    ? ['treeSpirit','forestWarden','wolf','treeSpirit']
    : ['forestWarden','thornBeast','treeSpirit','forestWarden'];
  triggerBattle(pool[Math.floor(Math.random()*pool.length)],depth);
}

export function triggerBattle(key,depth=0){
  const tmpl=ENEMIES[key];if(!tmpl)return;
  // One-time death penalty reminder shown before the player's very first fight
  if(!G._shownDeathWarning){
    G._shownDeathWarning=true;
    chatLog('⚠ Death penalty: lose 30% currency + unbound bag items. Bound/equipped gear is safe.','#FF8C00');
  }
  // Snapshot all rendered layers into _snapCanvas
  _snapCtx.clearRect(0,0,W,H);
  ['cv-bg','cv-tiles','cv-sprites'].forEach(id=>{
    const cv=document.getElementById(id);if(cv)_snapCtx.drawImage(cv,0,0);
  });
  G.battle={
    enemy:makeScaledEnemy(key,depth),
    depth,           // stored so drop scaling and armor penetration can reference it
    phase:'transition_in',
    animTimer:0,
    hitShake:0,
    playerHitShake:0,
    log:[tmpl.msg,'What will you do?'],
    result:null,
    xpGained:0,spacebucksGained:0,schmecklesGained:0,
    savedX:G.x,savedY:G.y,
    anims:[],
  };
  G.paused=true;
  document.getElementById('cv-ui').style.pointerEvents='auto';
  SFX.battleStart();
  musPlay('battle');
  runPixelTransition('in',()=>{G.battle.phase='player_turn';});
}

export function triggerSnowballBattle(se){
  const baseType=se.baseType||'skeleton';
  const tmpl=ENEMIES[baseType]||ENEMIES['skeleton'];
  const depth=30; // treat as mid-wilderness encounter
  const base=makeScaledEnemy(baseType,depth);
  const kc=Math.min(se.killCount||1,10);
  const enemy={
    ...base,
    name:se.name,
    type:baseType,
    maxHp:Math.round(base.maxHp*(1+kc*0.3)),
    currentHp:Math.round(base.maxHp*(1+kc*0.3)),
    atk:base.atk+kc*2,
    def:base.def+Math.floor(kc*0.5),
    xp:Math.round(base.xp*(1+kc*0.5)),
    msg:`${se.name} snarls — ${se.killCount} player kill${se.killCount!==1?'s':''} in its wake!`,
  };
  _snapCtx.clearRect(0,0,W,H);
  ['cv-bg','cv-tiles','cv-sprites'].forEach(id=>{const cv=document.getElementById(id);if(cv)_snapCtx.drawImage(cv,0,0);});
  G.battle={
    enemy,phase:'transition_in',animTimer:0,hitShake:0,playerHitShake:0,
    log:[enemy.msg,'What will you do?'],
    result:null,xpGained:0,spacebucksGained:0,schmecklesGained:0,
    savedX:G.x,savedY:G.y,
    snowballId:se.id, // claim bonus loot on win
    anims:[],
  };
  G.paused=true;
  document.getElementById('cv-ui').style.pointerEvents='auto';
  SFX.battleStart();
  musPlay('battle');
  runPixelTransition('in',()=>{G.battle.phase='player_turn';});
}

export function runPixelTransition(dir,onComplete){
  const FRAMES=38;let tick=0;
  function step(){
    tick++;
    const t=dir==='in'?tick/FRAMES:1-tick/FRAMES;
    const blockSize=Math.max(1,Math.round(Math.pow(48,t)));
    ctxUI.clearRect(0,0,W,H);
    if(blockSize>1){
      const dw=Math.max(1,Math.floor(W/blockSize));
      const dh=Math.max(1,Math.floor(H/blockSize));
      _pixCanvas.width=dw;_pixCanvas.height=dh;
      _pixCtx.drawImage(_snapCanvas,0,0,dw,dh);
      ctxUI.imageSmoothingEnabled=false;
      ctxUI.drawImage(_pixCanvas,0,0,W,H);
    } else {
      ctxUI.imageSmoothingEnabled=true;
      ctxUI.drawImage(_snapCanvas,0,0);
    }
    const fade=Math.max(0,Math.min(1,(t-0.42)/0.58));
    if(fade>0){ctxUI.fillStyle=`rgba(0,0,0,${fade})`;ctxUI.fillRect(0,0,W,H);}
    if(tick<FRAMES){requestAnimationFrame(step);}
    else{
      if(dir==='in'){ctxUI.fillStyle='#000';ctxUI.fillRect(0,0,W,H);}
      else ctxUI.clearRect(0,0,W,H);
      onComplete();
    }
  }
  requestAnimationFrame(step);
}

// ── Enemy pixel-art sprites (S = px per "pixel", drawn facing left) ──────────

function drawEnemySprite(ctx,type,x,y){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  const S=4;
  switch(type){
    case'wolf':        drawBattleWolf(ctx,S);        break;
    case'skeleton':    drawBattleSkeleton(ctx,S);    break;
    case'goblin':      drawBattleGoblin(ctx,S);      break;
    case'darkKnight':  drawBattleDarkKnight(ctx,S);  break;
    case'lich':        drawBattleLich(ctx,S);        break;
    case'iceTroll':    drawBattleIceTroll(ctx,S);    break;
    case'bandit':      drawBattleBandit(ctx,S);      break;
    case'specter':     drawBattleSpecter(ctx,S);     break;
    case'ruinGuardian':drawBattleRuinGuardian(ctx,S);break;
    case'wraith':      drawBattleWraith(ctx,S);      break;
    case'voidMage':    drawBattleVoidMage(ctx,S);    break;
    case'stoneGolem':  drawBattleStoneGolem(ctx,S);  break;
    case'shadowMage':  drawBattleShadowMage(ctx,S);  break;
  }
  ctx.restore();
}

function drawBattleIceTroll(ctx,S){
  // big chunky ice-blue brute
  const body='#3A7AB0',dark='#1A4A70',light='#7ABAEE',ice='#CCEEFF',eye='#FF2200';
  ctx.fillStyle='#00000030';ctx.fillRect(S,S*18,S*20,S*2); // shadow
  // torso
  ctx.fillStyle=body;ctx.fillRect(S*3,S*7,S*14,S*13);
  ctx.fillStyle=light;ctx.fillRect(S*4,S*8,S*4,S*4); // chest highlight
  ctx.fillStyle=dark;ctx.fillRect(S*14,S*8,S*2,S*10); // shadow side
  // arms
  ctx.fillStyle=dark;ctx.fillRect(0,S*8,S*4,S*9);
  ctx.fillStyle=body;ctx.fillRect(S,S*9,S*3,S*8);
  ctx.fillStyle=dark;ctx.fillRect(S*17,S*8,S*4,S*9);
  ctx.fillStyle=body;ctx.fillRect(S*18,S*9,S*3,S*8);
  // claws
  ctx.fillStyle=ice;
  [0,S*2,S*4].forEach(dx=>{ctx.fillRect(dx,S*17,S,S*3);ctx.fillRect(S*18+dx,S*17,S,S*3);});
  // legs
  ctx.fillStyle=dark;ctx.fillRect(S*4,S*19,S*5,S*5);
  ctx.fillStyle=body;ctx.fillRect(S*5,S*19,S*4,S*4);
  ctx.fillStyle=dark;ctx.fillRect(S*11,S*19,S*5,S*5);
  ctx.fillStyle=body;ctx.fillRect(S*12,S*19,S*4,S*4);
  // head
  ctx.fillStyle=body;ctx.fillRect(S*3,S,S*14,S*7);
  ctx.fillStyle=light;ctx.fillRect(S*4,S*2,S*5,S*3);
  // eyes
  ctx.fillStyle=eye;ctx.fillRect(S*5,S*2,S*2,S*2);ctx.fillRect(S*12,S*2,S*2,S*2);
  ctx.fillStyle='#FFF';ctx.fillRect(S*5,S*2,S,S);ctx.fillRect(S*12,S*2,S,S);
  // horns
  ctx.fillStyle=ice;
  ctx.fillRect(S*5,0,S*2,S*2);ctx.fillRect(S*4,0,S,S);
  ctx.fillRect(S*13,0,S*2,S*2);ctx.fillRect(S*15,0,S,S);
  // ice shards on body
  ctx.fillStyle=ice;
  ctx.fillRect(S*8,S*8,S*2,S*4);ctx.fillRect(S*13,S*12,S*2,S*3);
}

function drawBattleBandit(ctx,S){
  const skin='#C8A050',cloth='#4A3020',armor='#606060',mask='#2A1808',blade='#D0D8E0';
  ctx.fillStyle='#00000030';ctx.fillRect(S*2,S*18,S*16,S*2); // shadow
  // legs
  ctx.fillStyle=cloth;ctx.fillRect(S*4,S*14,S*5,S*6);ctx.fillRect(S*11,S*14,S*5,S*6);
  // boots
  ctx.fillStyle='#1A0A00';ctx.fillRect(S*4,S*18,S*5,S*4);ctx.fillRect(S*11,S*18,S*5,S*4);
  // torso / jacket
  ctx.fillStyle=cloth;ctx.fillRect(S*4,S*8,S*12,S*8);
  ctx.fillStyle=armor;ctx.fillRect(S*5,S*9,S*10,S*5); // chest plate
  ctx.fillStyle='#808080';ctx.fillRect(S*6,S*10,S*8,S*3); // plate highlight
  // arms
  ctx.fillStyle=cloth;ctx.fillRect(0,S*8,S*5,S*7);ctx.fillRect(S*15,S*8,S*5,S*7);
  ctx.fillStyle=skin;ctx.fillRect(0,S*13,S*4,S*4);ctx.fillRect(S*16,S*13,S*4,S*4);
  // head + mask
  ctx.fillStyle=skin;ctx.fillRect(S*5,S*2,S*10,S*7);
  ctx.fillStyle=mask;ctx.fillRect(S*5,S*4,S*10,S*3); // bandit mask
  ctx.fillStyle=cloth;ctx.fillRect(S*4,S,S*12,S*3); // hood
  // eyes (gleam over mask)
  ctx.fillStyle='#FF8800';ctx.fillRect(S*6,S*5,S*2,S*2);ctx.fillRect(S*12,S*5,S*2,S*2);
  // knife / blade in one hand
  ctx.fillStyle='#1A0A00';ctx.fillRect(S*17,S*9,S,S*6);
  ctx.fillStyle=blade;ctx.fillRect(S*16,S*7,S,S*7);
}

function drawBattleSpecter(ctx,S){
  const base='#7A60CC',glow='#AA88FF',dark='#3A2060',eye='#FFFFFF',aura='#6040AA';
  // ethereal glow aura
  ctx.fillStyle='#8060CC18';
  ctx.beginPath();ctx.arc(S*10,S*10,S*10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#AA88FF10';
  ctx.beginPath();ctx.arc(S*10,S*10,S*13,0,Math.PI*2);ctx.fill();
  // wispy lower form (tapers)
  ctx.fillStyle=dark;
  ctx.fillRect(S*5,S*14,S*10,S*6);
  ctx.fillRect(S*4,S*15,S*12,S*5);
  ctx.fillRect(S*3,S*16,S*14,S*4);
  ctx.fillRect(S*2,S*18,S*16,S*2);
  // wisp tendrils
  ctx.fillStyle=aura;
  ctx.fillRect(S*2,S*19,S*2,S*3);ctx.fillRect(S*7,S*20,S*2,S*4);
  ctx.fillRect(S*12,S*20,S*2,S*3);ctx.fillRect(S*16,S*19,S*2,S*4);
  // upper body (translucent-look)
  ctx.fillStyle=base;ctx.fillRect(S*4,S*6,S*12,S*10);
  ctx.fillStyle=glow;ctx.fillRect(S*6,S*7,S*8,S*7);
  ctx.fillStyle=dark;ctx.fillRect(S*4,S*6,S*2,S*9);ctx.fillRect(S*14,S*6,S*2,S*9);
  // arms (wispy)
  ctx.fillStyle=aura;
  ctx.fillRect(0,S*8,S*5,S*4);ctx.fillRect(S*15,S*8,S*5,S*4);
  ctx.fillRect(0,S*11,S*3,S*4);ctx.fillRect(S*17,S*11,S*3,S*4);
  // head
  ctx.fillStyle=base;ctx.fillRect(S*4,S,S*12,S*6);
  ctx.fillStyle=glow;ctx.fillRect(S*6,S*2,S*8,S*4);
  ctx.fillStyle=dark;ctx.fillRect(S*4,S,S*2,S*5);ctx.fillRect(S*14,S,S*2,S*5);
  // hollow eyes
  ctx.fillStyle=eye;ctx.fillRect(S*5,S*2,S*3,S*3);ctx.fillRect(S*12,S*2,S*3,S*3);
  ctx.fillStyle='#AA88FF';ctx.fillRect(S*6,S*3,S,S);ctx.fillRect(S*13,S*3,S,S);
  ctx.fillStyle=dark;ctx.fillRect(S*6,S*2,S,S);ctx.fillRect(S*13,S*2,S,S);
}

function drawBattleRuinGuardian(ctx,S){
  const stone='#707060',dark='#404030',light='#9A9A80',rune='#60A0FF',eye='#40FFFF';
  ctx.fillStyle='#00000040';ctx.fillRect(S,S*20,S*24,S*3); // shadow
  // massive legs (pillars)
  ctx.fillStyle=dark;ctx.fillRect(S*3,S*17,S*7,S*8);ctx.fillRect(S*14,S*17,S*7,S*8);
  ctx.fillStyle=stone;ctx.fillRect(S*4,S*18,S*5,S*6);ctx.fillRect(S*15,S*18,S*5,S*6);
  // foot stones
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*23,S*9,S*3);ctx.fillRect(S*13,S*23,S*9,S*3);
  // torso (massive rectangular block)
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*6,S*20,S*13);
  ctx.fillStyle=stone;ctx.fillRect(S*3,S*7,S*18,S*11);
  ctx.fillStyle=light;ctx.fillRect(S*4,S*8,S*6,S*5); // stone face highlight
  ctx.fillStyle=dark;ctx.fillRect(S*16,S*8,S*4,S*9); // shadow side
  // stone arms (slabs)
  ctx.fillStyle=dark;ctx.fillRect(0,S*7,S*4,S*11);ctx.fillRect(S*20,S*7,S*4,S*11);
  ctx.fillStyle=stone;ctx.fillRect(S,S*8,S*3,S*10);ctx.fillRect(S*21,S*8,S*3,S*10);
  // fist stones
  ctx.fillStyle=dark;ctx.fillRect(0,S*16,S*5,S*5);ctx.fillRect(S*19,S*16,S*5,S*5);
  ctx.fillStyle=stone;ctx.fillRect(S,S*17,S*3,S*4);ctx.fillRect(S*20,S*17,S*3,S*4);
  // stone chest rune
  ctx.fillStyle=rune;
  ctx.fillRect(S*9,S*9,S*6,S*2);ctx.fillRect(S*11,S*7,S*2,S*6);
  ctx.fillRect(S*8,S*11,S*8,S*2);
  // head (square stone block)
  ctx.fillStyle=dark;ctx.fillRect(S*4,0,S*16,S*8);
  ctx.fillStyle=stone;ctx.fillRect(S*5,S,S*14,S*6);
  ctx.fillStyle=light;ctx.fillRect(S*6,S*2,S*5,S*3);
  // glowing eye slots
  ctx.fillStyle='#001020';ctx.fillRect(S*6,S*2,S*4,S*3);ctx.fillRect(S*14,S*2,S*4,S*3);
  ctx.fillStyle=eye;ctx.fillRect(S*7,S*3,S*2,S*2);ctx.fillRect(S*15,S*3,S*2,S*2);
  ctx.fillStyle='#AAFFFF';ctx.fillRect(S*7,S*3,S,S);ctx.fillRect(S*15,S*3,S,S);
  // crown of stone spikes
  ctx.fillStyle=dark;
  [S*5,S*8,S*11,S*14,S*17].forEach(cx=>{ctx.fillRect(cx,0,S*2,S*3);});
  ctx.fillStyle=rune;[S*6,S*9,S*12,S*15,S*18].forEach(cx=>{ctx.fillRect(cx,0,S,S*2);});
}

function drawBattleWraith(ctx,S){
  // Ghostly undead — dark violet with skeletal face, wispy trailing form
  const base='#4A2080',dark='#1A0840',glow='#9060E0',bone='#C8C0A0',eye='#FF0060';
  // outer aura
  ctx.fillStyle='#6030A018';
  ctx.beginPath();ctx.arc(S*9,S*11,S*11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#9060E010';
  ctx.beginPath();ctx.arc(S*9,S*11,S*14,0,Math.PI*2);ctx.fill();
  // wispy trailing bottom — ragged tendrils
  ctx.fillStyle=dark;
  [[S*3,S*18,S*3,S*7],[S*6,S*17,S*3,S*8],[S*9,S*18,S*3,S*7],[S*12,S*17,S*3,S*8]].forEach(([x,y,w,h])=>ctx.fillRect(x,y,w,h));
  // tendril tips (glow)
  ctx.fillStyle=glow;
  ctx.fillRect(S*3,S*24,S*2,S*2);ctx.fillRect(S*7,S*25,S*2,S*3);
  ctx.fillRect(S*10,S*24,S*2,S*2);ctx.fillRect(S*13,S*25,S*2,S*3);
  // body mass
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*8,S*14,S*11);
  ctx.fillStyle=base;ctx.fillRect(S*3,S*9,S*12,S*9);
  ctx.fillStyle=glow;ctx.fillRect(S*5,S*10,S*8,S*6);
  // shadow side
  ctx.fillStyle=dark;ctx.fillRect(S*13,S*9,S*2,S*9);
  // wispy arms
  ctx.fillStyle=glow;
  ctx.fillRect(0,S*9,S*3,S*3);ctx.fillRect(0,S*11,S*2,S*4);
  ctx.fillRect(S*15,S*9,S*3,S*3);ctx.fillRect(S*16,S*11,S*2,S*4);
  ctx.fillStyle=base;
  ctx.fillRect(S,S*10,S*2,S*2);ctx.fillRect(S*15,S*10,S*2,S*2);
  // skeletal face (peeking through wisp)
  ctx.fillStyle=bone;ctx.fillRect(S*4,S*2,S*10,S*7);
  ctx.fillStyle=dark;ctx.fillRect(S*4,S*2,S*2,S*7);ctx.fillRect(S*12,S*2,S*2,S*7);// shadow sides
  // hollow eye sockets
  ctx.fillStyle='#0A0018';ctx.fillRect(S*5,S*3,S*3,S*3);ctx.fillRect(S*10,S*3,S*3,S*3);
  ctx.fillStyle=eye;ctx.fillRect(S*5,S*3,S*2,S*2);ctx.fillRect(S*10,S*3,S*2,S*2);
  ctx.fillStyle='#FF80B0';ctx.fillRect(S*5,S*3,S,S);ctx.fillRect(S*10,S*3,S,S);
  // nose cavity
  ctx.fillStyle=dark;ctx.fillRect(S*7,S*5,S*2,S*2);
  // jaw + teeth
  ctx.fillStyle=bone;ctx.fillRect(S*4,S*7,S*10,S*2);
  ctx.fillStyle='#FFF';[S*5,S*7,S*9,S*11].forEach(tx=>ctx.fillRect(tx,S*7,S,S*2));
  ctx.fillStyle=dark;[S*6,S*8,S*10].forEach(tx=>ctx.fillRect(tx,S*7,S,S*2));
  // tattered hood/shroud behind head
  ctx.fillStyle=dark;ctx.fillRect(S*3,0,S*12,S*3);ctx.fillRect(S*2,S*2,S*14,S*2);
  ctx.fillStyle=base;ctx.fillRect(S*4,S,S*10,S*2);
}

function drawBattleVoidMage(ctx,S){
  // Robed caster wreathed in void energy — deep indigo/black, void orb staff
  const robe='#160828',trim='#5020A0',glow='#B060FF',skin='#8878A8',eye='#00FFCC',staff='#2A1040',orb='#C080FF';
  // void aura
  ctx.fillStyle='#8040FF14';
  ctx.beginPath();ctx.arc(S*9,S*12,S*12,0,Math.PI*2);ctx.fill();
  // staff (behind body)
  ctx.fillStyle=staff;ctx.fillRect(S*15,S,S*2,S*22);
  ctx.fillStyle='#4A2070';ctx.fillRect(S*15,S,S,S*22);
  // staff orb
  ctx.fillStyle=orb;ctx.fillRect(S*13,0,S*4,S*4);
  ctx.fillStyle='#E0B0FF';ctx.fillRect(S*14,0,S*2,S*2);
  ctx.fillStyle=glow;ctx.fillRect(S*13,S,S*4,S);
  // robe (wide at base)
  ctx.fillStyle=robe;ctx.fillRect(S*3,S*8,S*12,S*16);
  ctx.fillStyle=trim;ctx.fillRect(S*4,S*9,S*10,S*14);
  // robe highlight stripe
  ctx.fillStyle=glow;ctx.fillRect(S*9,S*9,S,S*13);
  // robe hem (widening)
  ctx.fillStyle=robe;ctx.fillRect(S*2,S*18,S*14,S*6);
  ctx.fillStyle=trim;ctx.fillRect(S*3,S*19,S*12,S*5);
  // robe trim / border glow
  ctx.fillStyle=glow;
  ctx.fillRect(S*3,S*8,S,S*16);ctx.fillRect(S*14,S*8,S,S*16);
  ctx.fillRect(S*2,S*23,S*14,S);
  // arms/sleeves
  ctx.fillStyle=robe;ctx.fillRect(0,S*9,S*4,S*8);ctx.fillRect(S*14,S*9,S*4,S*8);
  ctx.fillStyle=trim;ctx.fillRect(S,S*10,S*3,S*7);ctx.fillRect(S*14,S*10,S*3,S*7);
  ctx.fillStyle=skin;ctx.fillRect(S,S*16,S*3,S*3);ctx.fillRect(S*14,S*16,S*3,S*3);
  // cowl / hood
  ctx.fillStyle=robe;ctx.fillRect(S*3,S*2,S*12,S*8);
  ctx.fillStyle=trim;ctx.fillRect(S*4,S*3,S*10,S*6);
  ctx.fillStyle=robe;ctx.fillRect(S*2,S*4,S*14,S*6); // wider cowl shadow
  // face (shadowed inside hood)
  ctx.fillStyle='#0A0018';ctx.fillRect(S*5,S*4,S*8,S*5);
  ctx.fillStyle=skin;ctx.fillRect(S*6,S*5,S*6,S*3);
  // glowing eyes
  ctx.fillStyle=eye;ctx.fillRect(S*6,S*5,S*2,S*2);ctx.fillRect(S*10,S*5,S*2,S*2);
  ctx.fillStyle='#AAFFEE';ctx.fillRect(S*6,S*5,S,S);ctx.fillRect(S*10,S*5,S,S);
  // void sigil on chest
  ctx.fillStyle=glow;
  ctx.fillRect(S*7,S*11,S*4,S);ctx.fillRect(S*9,S*10,S,S*3);
  ctx.fillRect(S*7,S*13,S*2,S);ctx.fillRect(S*9,S*13,S*2,S);
}

function drawBattleStoneGolem(ctx,S){
  // Hulking rock creature — mossy grey stone, glowing amber core, massive fists
  const stone='#686050',dark='#3A3028',light='#9A9078',moss='#3A5020',core='#FF8800',crack='#201810';
  // shadow
  ctx.fillStyle='#00000050';ctx.fillRect(S,S*22,S*22,S*3);
  // feet/base (massive flat stones)
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*20,S*8,S*5);ctx.fillRect(S*14,S*20,S*8,S*5);
  ctx.fillStyle=stone;ctx.fillRect(S*3,S*21,S*6,S*3);ctx.fillRect(S*15,S*21,S*6,S*3);
  ctx.fillStyle=moss;ctx.fillRect(S*3,S*21,S*6,S);ctx.fillRect(S*15,S*21,S*6,S); // moss top
  // legs (squat stone pillars)
  ctx.fillStyle=dark;ctx.fillRect(S*3,S*14,S*7,S*8);ctx.fillRect(S*14,S*14,S*7,S*8);
  ctx.fillStyle=stone;ctx.fillRect(S*4,S*15,S*5,S*6);ctx.fillRect(S*15,S*15,S*5,S*6);
  ctx.fillStyle=light;ctx.fillRect(S*4,S*15,S*2,S*3);ctx.fillRect(S*15,S*15,S*2,S*3);
  // torso (huge rectangular block)
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*5,S*20,S*11);
  ctx.fillStyle=stone;ctx.fillRect(S*3,S*6,S*18,S*9);
  ctx.fillStyle=light;ctx.fillRect(S*4,S*7,S*7,S*4);
  ctx.fillStyle=dark;ctx.fillRect(S*17,S*7,S*3,S*7); // shadow side
  // moss patches on torso
  ctx.fillStyle=moss;ctx.fillRect(S*3,S*6,S*4,S);ctx.fillRect(S*14,S*6,S*5,S);
  // glowing amber core (chest crack)
  ctx.fillStyle=crack;ctx.fillRect(S*9,S*7,S*6,S*6);
  ctx.fillStyle=core;ctx.fillRect(S*10,S*8,S*4,S*4);
  ctx.fillStyle='#FFCC44';ctx.fillRect(S*11,S*9,S*2,S*2);
  // massive arms (slabs)
  ctx.fillStyle=dark;ctx.fillRect(0,S*6,S*4,S*12);ctx.fillRect(S*20,S*6,S*4,S*12);
  ctx.fillStyle=stone;ctx.fillRect(S,S*7,S*3,S*10);ctx.fillRect(S*21,S*7,S*3,S*10);
  ctx.fillStyle=light;ctx.fillRect(S,S*7,S,S*4);ctx.fillRect(S*21,S*7,S,S*4);
  // giant fists
  ctx.fillStyle=dark;ctx.fillRect(0,S*17,S*5,S*6);ctx.fillRect(S*19,S*17,S*5,S*6);
  ctx.fillStyle=stone;ctx.fillRect(S,S*18,S*3,S*4);ctx.fillRect(S*20,S*18,S*3,S*4);
  ctx.fillStyle=light;ctx.fillRect(S,S*18,S,S*2);ctx.fillRect(S*20,S*18,S,S*2);
  // head (square boulder)
  ctx.fillStyle=dark;ctx.fillRect(S*4,0,S*16,S*7);
  ctx.fillStyle=stone;ctx.fillRect(S*5,S,S*14,S*5);
  ctx.fillStyle=light;ctx.fillRect(S*6,S*2,S*5,S*2);
  ctx.fillStyle=moss;ctx.fillRect(S*5,S,S*8,S); // moss on top
  // craggy brow / eye sockets
  ctx.fillStyle=dark;ctx.fillRect(S*5,S*2,S*5,S*3);ctx.fillRect(S*14,S*2,S*5,S*3);
  ctx.fillStyle=core;ctx.fillRect(S*6,S*3,S*3,S*2);ctx.fillRect(S*15,S*3,S*3,S*2);
  ctx.fillStyle='#FFEE88';ctx.fillRect(S*7,S*3,S,S);ctx.fillRect(S*16,S*3,S,S);
  // cracks on face
  ctx.fillStyle=crack;ctx.fillRect(S*10,S*2,S,S*4);ctx.fillRect(S*7,S*5,S*4,S);
}

function drawBattleShadowMage(ctx,S){
  // Shadow caster — dark robe, shadow tendrils, red/black eyes, sinister silhouette
  const robe='#0E0018',trim='#3A0050',shadow='#200030',glow='#800080',eye='#FF2020',skin='#6A4050',staff='#1A0028',orb='#C000C0';
  // shadow miasma aura
  ctx.fillStyle='#60006020';
  ctx.beginPath();ctx.arc(S*9,S*12,S*13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#40004018';
  ctx.beginPath();ctx.arc(S*9,S*12,S*16,0,Math.PI*2);ctx.fill();
  // shadow tendrils (dark, wispy)
  ctx.fillStyle=shadow;
  [[0,S*12,S*3,S*4],[S*2,S*17,S*2,S*5],[S*16,S*13,S*3,S*3],[S*17,S*18,S*2,S*5]].forEach(([x,y,w,h])=>ctx.fillRect(x,y,w,h));
  ctx.fillStyle=glow;
  ctx.fillRect(0,S*15,S*2,S*3);ctx.fillRect(S*18,S*16,S*2,S*3);// tendril tips
  // staff (left hand, behind body)
  ctx.fillStyle=staff;ctx.fillRect(S,S*2,S*2,S*20);
  ctx.fillStyle='#3A005A';ctx.fillRect(S,S*2,S,S*20);
  // dark orb on staff
  ctx.fillStyle=orb;ctx.fillRect(0,0,S*4,S*4);
  ctx.fillStyle='#FF60FF';ctx.fillRect(S,0,S*2,S*2);
  ctx.fillStyle=glow;ctx.fillRect(0,S*2,S*4,S);
  // robe body
  ctx.fillStyle=robe;ctx.fillRect(S*4,S*8,S*12,S*16);
  ctx.fillStyle=trim;ctx.fillRect(S*5,S*9,S*10,S*14);
  // robe highlight
  ctx.fillStyle=glow;ctx.fillRect(S*4,S*8,S,S*15);ctx.fillRect(S*15,S*8,S,S*15);
  ctx.fillStyle=shadow;ctx.fillRect(S*9,S*9,S*2,S*13);
  // robe bottom (wide)
  ctx.fillStyle=robe;ctx.fillRect(S*3,S*19,S*14,S*6);
  ctx.fillStyle=trim;ctx.fillRect(S*4,S*20,S*12,S*5);
  // shadow wisps at hem
  ctx.fillStyle=shadow;
  ctx.fillRect(S*3,S*23,S*2,S*3);ctx.fillRect(S*8,S*24,S*2,S*4);
  ctx.fillRect(S*13,S*23,S*2,S*3);ctx.fillRect(S*6,S*25,S*2,S*2);
  // arms
  ctx.fillStyle=robe;ctx.fillRect(S*2,S*9,S*3,S*8);ctx.fillRect(S*15,S*9,S*3,S*8);
  ctx.fillStyle=skin;ctx.fillRect(S*3,S*16,S*2,S*2);ctx.fillRect(S*15,S*16,S*2,S*2);
  // head + deep hood
  ctx.fillStyle=robe;ctx.fillRect(S*3,S*2,S*12,S*8);
  ctx.fillStyle=shadow;ctx.fillRect(S*2,S*3,S*14,S*7); // wider hood shadow
  // face deep in shadow
  ctx.fillStyle='#050005';ctx.fillRect(S*5,S*3,S*8,S*5);
  ctx.fillStyle=skin;ctx.fillRect(S*6,S*4,S*6,S*3);
  // glowing red eyes
  ctx.fillStyle=eye;ctx.fillRect(S*6,S*4,S*2,S*2);ctx.fillRect(S*10,S*4,S*2,S*2);
  ctx.fillStyle='#FF9090';ctx.fillRect(S*6,S*4,S,S);ctx.fillRect(S*10,S*4,S,S);
  // shadow sigil on chest (inverted triangle rune)
  ctx.fillStyle=glow;
  ctx.fillRect(S*7,S*11,S*6,S);
  ctx.fillRect(S*7,S*11,S,S*4);ctx.fillRect(S*12,S*11,S,S*4);
  ctx.fillRect(S*8,S*14,S*4,S);
}

function drawBattleLich(ctx,S){
  // Aura glow
  ctx.fillStyle='#6600AA33';
  ctx.beginPath();ctx.arc(10*S,10*S,9*S,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#AA00FF22';
  ctx.beginPath();ctx.arc(10*S,10*S,12*S,0,Math.PI*2);ctx.fill();
  // Robe
  ctx.fillStyle='#2A004A';ctx.fillRect(4*S,8*S,12*S,14*S);
  ctx.fillStyle='#4A007A';ctx.fillRect(5*S,8*S,10*S,13*S);
  // Robe highlights
  ctx.fillStyle='#6A00AA';ctx.fillRect(9*S,8*S,2*S,12*S);
  // Skull
  ctx.fillStyle='#D8D0B0';ctx.fillRect(6*S,2*S,8*S,7*S);
  ctx.fillStyle='#B0A890';ctx.fillRect(6*S,2*S,2*S,7*S); // shadow side
  // Eye glow
  ctx.fillStyle='#00FFAA';ctx.fillRect(7*S,3*S,2*S,2*S);ctx.fillRect(11*S,3*S,2*S,2*S);
  ctx.fillStyle='#AAFFDD';ctx.fillRect(8*S,3*S,1*S,1*S);ctx.fillRect(12*S,3*S,1*S,1*S);
  // Nose cavity
  ctx.fillStyle='#0D0020';ctx.fillRect(9*S,5*S,2*S,2*S);
  // Teeth
  ctx.fillStyle='#D8D0B0';ctx.fillRect(7*S,8*S,1*S,1*S);ctx.fillRect(9*S,8*S,1*S,1*S);ctx.fillRect(11*S,8*S,1*S,1*S);
  ctx.fillStyle='#0D0020';ctx.fillRect(8*S,8*S,1*S,1*S);ctx.fillRect(10*S,8*S,1*S,1*S);ctx.fillRect(12*S,8*S,1*S,1*S);
  // Bone arms
  ctx.fillStyle='#D8D0B0';
  ctx.fillRect(0*S,9*S,5*S,2*S);ctx.fillRect(15*S,9*S,5*S,2*S);
  ctx.fillRect(0*S,11*S,2*S,3*S);ctx.fillRect(3*S,11*S,2*S,2*S);
  ctx.fillRect(15*S,11*S,2*S,2*S);ctx.fillRect(18*S,11*S,2*S,3*S);
  // Staff
  ctx.fillStyle='#3A1A00';ctx.fillRect(16*S,1*S,2*S,20*S);
  ctx.fillStyle='#5A2A00';ctx.fillRect(16*S,1*S,1*S,20*S);
  // Staff orb
  ctx.fillStyle='#AA00FF';ctx.fillRect(14*S,0,4*S,3*S);
  ctx.fillStyle='#DDAAFF';ctx.fillRect(15*S,0,2*S,1*S);
  // Crown
  ctx.fillStyle='#7700AA';
  ctx.fillRect(6*S,1*S,2*S,2*S);ctx.fillRect(9*S,0,2*S,2*S);ctx.fillRect(12*S,1*S,2*S,2*S);
}

function drawBattleWolf(ctx,S){
  const body='#7A6848',dark='#3C2C14',light='#A09060',eye='#FFD700',nose='#180C08';
  // shadow
  ctx.fillStyle='#00000030';ctx.fillRect(S,S*15,S*22,S*2);
  // tail
  ctx.fillStyle=dark;ctx.fillRect(S*19,0,S*3,S*6);
  ctx.fillStyle=body;ctx.fillRect(S*20,S,S*2,S*5);
  ctx.fillStyle='#EEE8D0';ctx.fillRect(S*20,0,S*2,S*2);
  // body
  ctx.fillStyle=dark;ctx.fillRect(S*3,S*6,S*17,S*8);
  ctx.fillStyle=body;ctx.fillRect(S*4,S*7,S*15,S*6);
  ctx.fillStyle=light;ctx.fillRect(S*5,S*7,S*9,S*2);
  // belly
  ctx.fillStyle='#C8B080';ctx.fillRect(S*7,S*11,S*8,S*2);
  // head
  ctx.fillStyle=dark;ctx.fillRect(0,S*3,S*9,S*8);
  ctx.fillStyle=body;ctx.fillRect(S,S*4,S*7,S*6);
  // snout
  ctx.fillStyle=dark;ctx.fillRect(0,S*7,S*4,S*4);
  ctx.fillStyle='#9A8A6A';ctx.fillRect(S,S*8,S*3,S*2);
  ctx.fillStyle=nose;ctx.fillRect(0,S*7,S*2,S*2);
  // ear
  ctx.fillStyle=dark;ctx.fillRect(S*2,S,S*4,S*4);
  ctx.fillStyle=body;ctx.fillRect(S*3,S*2,S*2,S*3);
  ctx.fillStyle='#C06060';ctx.fillRect(S*3,S*2,S,S*2);
  // eye
  ctx.fillStyle=eye;ctx.fillRect(S*4,S*5,S*2,S*2);
  ctx.fillStyle='#000';ctx.fillRect(S*5,S*5,S,S);
  // legs (4)
  [S*5,S*9,S*12,S*16].forEach(lx=>{
    ctx.fillStyle=dark;ctx.fillRect(lx,S*13,S*2,S*5);
    ctx.fillStyle=body;ctx.fillRect(lx,S*14,S*2,S*3);
    ctx.fillStyle='#1E0E06';ctx.fillRect(lx-S,S*17,S*4,S*2);
  });
}

function drawBattleSkeleton(ctx,S){
  const bone='#D8D8B8',dark='#888870',eye='#20C8FF',sw='#9090B0',swH='#C0C0E0';
  // shadow
  ctx.fillStyle='#00000030';ctx.fillRect(S*2,S*27,S*14,S*2);
  // legs
  [[S*3,S*20],[S*8,S*20]].forEach(([lx,ly])=>{
    ctx.fillStyle=dark;ctx.fillRect(lx-1,ly,S*2+2,S*7);
    ctx.fillStyle=bone;ctx.fillRect(lx,ly,S*2,S*7);
    ctx.fillStyle='#905030';ctx.fillRect(lx-1,ly+S*7,S*4,S*2);
  });
  // pelvis
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*18,S*10,S*3);
  ctx.fillStyle=bone;ctx.fillRect(S*3,S*18,S*8,S*2);
  // spine
  ctx.fillStyle=bone;ctx.fillRect(S*6,S*10,S*2,S*9);
  ctx.fillStyle=dark;ctx.fillRect(S*6,S*10,S,S*9);
  // ribs
  [S*10,S*12,S*14,S*16].forEach(ry=>{
    ctx.fillStyle=dark;ctx.fillRect(S*2,ry,S*11,S);
    ctx.fillStyle=bone;ctx.fillRect(S*3,ry,S*10,S);
  });
  // shoulders
  ctx.fillStyle=bone;ctx.fillRect(S*2,S*9,S*11,S*2);
  // left arm
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*11,S*2,S*8);
  ctx.fillStyle=bone;ctx.fillRect(S*2,S*11,S*2,S*7);
  // right arm (sword arm)
  ctx.fillStyle=bone;ctx.fillRect(S*11,S*11,S*2,S*6);
  // sword
  ctx.fillStyle=sw;ctx.fillRect(S*12,S*3,S*2,S*12);
  ctx.fillStyle=swH;ctx.fillRect(S*12,S*3,S,S*11);
  ctx.fillStyle='#C0C040';ctx.fillRect(S*10,S*11,S*4,S);
  ctx.fillStyle='#8B5A28';ctx.fillRect(S*12,S*14,S*2,S*3);
  // skull
  ctx.fillStyle=dark;ctx.fillRect(S*3,S,S*9,S*9);
  ctx.fillStyle=bone;ctx.fillRect(S*4,S*2,S*7,S*7);
  // jaw
  ctx.fillStyle=dark;ctx.fillRect(S*3,S*7,S*9,S*3);
  ctx.fillStyle=bone;ctx.fillRect(S*4,S*7,S*7,S*2);
  // teeth
  ctx.fillStyle='#FFFFFF';
  [S*4,S*6,S*8].forEach(tx=>ctx.fillRect(tx,S*8,S,S*2));
  // eyes
  ctx.fillStyle=eye;ctx.fillRect(S*4,S*3,S*2,S*2);ctx.fillRect(S*8,S*3,S*2,S*2);
  ctx.fillStyle='#80FFFF60';ctx.fillRect(S*4,S*3,S*2,S);ctx.fillRect(S*8,S*3,S*2,S);
}

function drawBattleGoblin(ctx,S){
  const skin='#5A8030',dark='#2A4010',light='#80B050',eye='#FF8000',cloth='#7A3020';
  // shadow
  ctx.fillStyle='#00000030';ctx.fillRect(S*2,S*21,S*12,S*2);
  // legs
  [[S*3,S*14],[S*8,S*14]].forEach(([lx,ly])=>{
    ctx.fillStyle=dark;ctx.fillRect(lx,ly,S*3,S*7);
    ctx.fillStyle=skin;ctx.fillRect(lx,ly,S*2,S*6);
    ctx.fillStyle='#4A1800';ctx.fillRect(lx-1,ly+S*6,S*4,S*2);
  });
  // body
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*8,S*12,S*7);
  ctx.fillStyle=cloth;ctx.fillRect(S*3,S*9,S*10,S*6);
  ctx.fillStyle='#501800';ctx.fillRect(S*3,S*12,S*10,S);
  // arms
  ctx.fillStyle=dark;ctx.fillRect(0,S*9,S*3,S*6);ctx.fillRect(S*13,S*9,S*3,S*6);
  ctx.fillStyle=skin;ctx.fillRect(0,S*10,S*3,S*5);ctx.fillRect(S*13,S*10,S*3,S*5);
  // dagger
  ctx.fillStyle='#A0A0B0';ctx.fillRect(S*14,S*7,S*2,S*5);
  ctx.fillStyle='#E0E0F0';ctx.fillRect(S*14,S*7,S,S*4);
  ctx.fillStyle='#C08030';ctx.fillRect(S*14,S*12,S*2,S);
  // head (oversized)
  ctx.fillStyle=dark;ctx.fillRect(S,0,S*14,S*10);
  ctx.fillStyle=skin;ctx.fillRect(S*2,S,S*12,S*8);
  ctx.fillStyle=light;ctx.fillRect(S*3,S*2,S*6,S*2);
  // ears (big, pointy)
  ctx.fillStyle=dark;ctx.fillRect(0,S*3,S*3,S*5);ctx.fillRect(S*13,S*3,S*3,S*5);
  ctx.fillStyle=skin;ctx.fillRect(0,S*3,S*2,S*4);ctx.fillRect(S*14,S*3,S*2,S*4);
  ctx.fillStyle='#C05050';ctx.fillRect(0,S*4,S,S*2);ctx.fillRect(S*15,S*4,S,S*2);
  // eyes
  ctx.fillStyle='#1C1000';ctx.fillRect(S*2,S*3,S*4,S*3);ctx.fillRect(S*10,S*3,S*4,S*3);
  ctx.fillStyle=eye;ctx.fillRect(S*3,S*3,S*3,S*2);ctx.fillRect(S*11,S*3,S*3,S*2);
  ctx.fillStyle='#000';ctx.fillRect(S*4,S*4,S,S);ctx.fillRect(S*12,S*4,S,S);
  // nose + grin
  ctx.fillStyle=dark;ctx.fillRect(S*6,S*5,S*4,S*3);ctx.fillRect(S*3,S*7,S*10,S*2);
  ctx.fillStyle=skin;ctx.fillRect(S*6,S*5,S*4,S*2);
  ctx.fillStyle='#FF3030';ctx.fillRect(S*4,S*7,S*8,S);
  ctx.fillStyle='#FFF';[S*4,S*6,S*9].forEach(tx=>ctx.fillRect(tx,S*7,S,S));
}

function drawBattleDarkKnight(ctx,S){
  const arm='#221828',dark='#0A080C',lit='#3C2844',eye='#FF1818',hi='#604070';
  // shadow
  ctx.fillStyle='#00000050';ctx.fillRect(0,S*30,S*18,S*2);
  // cape (draw first — behind everything)
  ctx.fillStyle=dark;
  ctx.beginPath();ctx.moveTo(S*2,S*7);ctx.lineTo(0,S*32);ctx.lineTo(S*5,S*32);ctx.lineTo(S*6,S*7);ctx.fill();
  ctx.beginPath();ctx.moveTo(S*14,S*7);ctx.lineTo(S*18,S*32);ctx.lineTo(S*13,S*32);ctx.lineTo(S*12,S*7);ctx.fill();
  // boots
  [[S*3,S*24],[S*9,S*24]].forEach(([bx,by])=>{
    ctx.fillStyle=dark;ctx.fillRect(bx-1,by,S*5,S*7);
    ctx.fillStyle=arm;ctx.fillRect(bx,by,S*4,S*6);
    ctx.fillStyle=lit;ctx.fillRect(bx,by,S*4,S*2);
  });
  // legs
  [[S*3,S*16],[S*9,S*16]].forEach(([lx,ly])=>{
    ctx.fillStyle=dark;ctx.fillRect(lx-1,ly,S*5,S*9);
    ctx.fillStyle=arm;ctx.fillRect(lx,ly,S*4,S*8);
    ctx.fillStyle=lit;ctx.fillRect(lx,ly,S*4,S*3);
  });
  // torso
  ctx.fillStyle=dark;ctx.fillRect(S*2,S*9,S*14,S*8);
  ctx.fillStyle=arm;ctx.fillRect(S*3,S*10,S*12,S*7);
  ctx.fillStyle=lit;ctx.fillRect(S*4,S*10,S*10,S*3);
  // chest gem
  ctx.fillStyle='#700010';ctx.fillRect(S*7,S*12,S*4,S*3);
  ctx.fillStyle='#FF0020';ctx.fillRect(S*8,S*12,S*2,S*2);
  // shoulder plates
  ctx.fillStyle=dark;ctx.fillRect(S,S*8,S*5,S*4);ctx.fillRect(S*12,S*8,S*5,S*4);
  ctx.fillStyle=arm;ctx.fillRect(S,S*8,S*5,S*3);ctx.fillRect(S*12,S*8,S*5,S*3);
  ctx.fillStyle=lit;ctx.fillRect(S,S*8,S*5,S);ctx.fillRect(S*12,S*8,S*5,S);
  // arms
  ctx.fillStyle=dark;ctx.fillRect(0,S*11,S*4,S*8);ctx.fillRect(S*14,S*11,S*4,S*8);
  ctx.fillStyle=arm;ctx.fillRect(S,S*11,S*3,S*7);ctx.fillRect(S*14,S*11,S*3,S*7);
  // sword (right side, angled up)
  ctx.fillStyle='#0C0C10';ctx.fillRect(S*16,0,S*4,S*14);
  ctx.fillStyle='#8888A8';ctx.fillRect(S*17,0,S*2,S*13);
  ctx.fillStyle='#C0C0E0';ctx.fillRect(S*17,0,S,S*12);
  ctx.fillStyle='#C08030';ctx.fillRect(S*15,S*12,S*4,S*2);
  ctx.fillStyle='#8B5020';ctx.fillRect(S*16,S*14,S*2,S*3);
  // helmet
  ctx.fillStyle=dark;ctx.fillRect(S*2,0,S*14,S*9);
  ctx.fillStyle=arm;ctx.fillRect(S*3,S,S*12,S*8);
  ctx.fillStyle=lit;ctx.fillRect(S*3,S,S*12,S*2);
  // visor slit
  ctx.fillStyle=dark;ctx.fillRect(S*3,S*4,S*12,S*3);
  ctx.fillStyle=eye;ctx.fillRect(S*4,S*4,S*5,S*2);ctx.fillRect(S*11,S*4,S*3,S*2);
  ctx.fillStyle='#FF8080';ctx.fillRect(S*4,S*4,S*2,S);ctx.fillRect(S*11,S*4,S,S);
  // horns
  ctx.fillStyle=arm;ctx.fillRect(S*4,-S*2,S*2,S*3);ctx.fillRect(S*12,-S*2,S*2,S*3);
  ctx.fillStyle=lit;ctx.fillRect(S*4,-S,S*2,S*2);ctx.fillRect(S*12,-S,S*2,S*2);
}

// ── Battle screen renderer (drawn to ctxUI each frame) ────────────────────────

export function renderBattleScreen(){
  if(!G.battle)return;
  const bt=G.battle,e=bt.enemy;
  const active=bt.phase==='player_turn'&&!bt.result; // hoisted — used by loadout AND action buttons
  ctxUI.clearRect(0,0,W,H);

  // ── Battle-field background ──
  const bgG=ctxUI.createLinearGradient(0,0,0,H*0.58);
  bgG.addColorStop(0,'#05080F');bgG.addColorStop(1,'#0C1520');
  ctxUI.fillStyle=bgG;ctxUI.fillRect(0,0,W,H*0.58);
  // stars
  ctxUI.fillStyle='#FFFFFF';
  [[0.09,0.07],[0.22,0.14],[0.42,0.05],[0.58,0.11],[0.72,0.04],[0.87,0.17],[0.31,0.19]].forEach(([fx,fy])=>
    ctxUI.fillRect(Math.floor(fx*W),Math.floor(fy*H*0.55),1,1));
  // crescent moon
  ctxUI.fillStyle='#D8CFA0';ctxUI.beginPath();ctxUI.arc(W*0.84,H*0.09,10,0,Math.PI*2);ctxUI.fill();
  ctxUI.fillStyle='#0C1520';ctxUI.beginPath();ctxUI.arc(W*0.87,H*0.08,8,0,Math.PI*2);ctxUI.fill();
  // ground platform
  const gY=Math.floor(H*0.56);
  ctxUI.fillStyle='#1C1208';ctxUI.fillRect(0,gY,W,4);
  // fog
  const fog=ctxUI.createLinearGradient(0,gY-20,0,gY+4);
  fog.addColorStop(0,'rgba(30,20,8,0)');fog.addColorStop(1,'rgba(30,20,8,0.7)');
  ctxUI.fillStyle=fog;ctxUI.fillRect(0,gY-20,W,24);

  // ── Animation queue: prune expired, compute offsets ──────────────────────────
  bt.anims=(bt.anims||[]).filter(a=>{
    const age=G.tick-a.born;
    if(a.type==='player_lunge'||a.type==='enemy_lunge') return age<BT_ANIM.LUNGE;
    if(a.type==='hit_flash')   return age<BT_ANIM.FLASH;
    if(a.type==='float_dmg')   return age<BT_ANIM.FLOAT;
    if(a.type==='particles')   return age<BT_ANIM.PART;
    if(a.type==='screen_flash')return age<BT_ANIM.SFLASH;
    if(a.type==='enemy_dissolve') return age<BT_ANIM.DISSOLVE;
    return false;
  });
  let playerLungeX=0,enemyLungeX=0,dissolveAlpha=1;
  bt.anims.forEach(a=>{
    const age=G.tick-a.born;
    if(a.type==='player_lunge'||a.type==='enemy_lunge'){
      const t=Math.min(1,age/BT_ANIM.LUNGE);
      const peak=t<0.4?t/0.4:1-(t-0.4)/0.6;
      if(a.type==='player_lunge') playerLungeX=-Math.round(peak*80);
      else enemyLungeX=Math.round(peak*80);
    }
    if(a.type==='enemy_dissolve') dissolveAlpha=Math.max(0,1-age/BT_ANIM.DISSOLVE);
  });

  // ── Enemy sprite (shake if hit) ──
  const shX=bt.hitShake>0?(Math.random()*8-4)|0:0;
  if(bt.hitShake>0)bt.hitShake--;
  ctxUI.globalAlpha=dissolveAlpha;
  drawEnemySprite(ctxUI,e.type,shX+70+enemyLungeX,20);
  ctxUI.globalAlpha=1;

  // ── Enemy name + HP bar ──
  ctxUI.fillStyle='#EEE8C0';ctxUI.font='bold 14px monospace';
  ctxUI.fillText(e.name,260,58);
  const ehbX=260,ehbY=65,ehbW=250,ehbH=11;
  ctxUI.fillStyle='#1E0000';ctxUI.fillRect(ehbX,ehbY,ehbW,ehbH);
  const ef=Math.max(0,e.currentHp/e.maxHp);
  ctxUI.fillStyle=ef>0.5?'#20A830':ef>0.25?'#C09000':'#C01020';
  ctxUI.fillRect(ehbX,ehbY,Math.floor(ehbW*ef),ehbH);
  ctxUI.strokeStyle='#604010';ctxUI.lineWidth=1;ctxUI.strokeRect(ehbX,ehbY,ehbW,ehbH);
  ctxUI.fillStyle='#AAAAAA';ctxUI.font='10px monospace';
  ctxUI.fillText(`${Math.max(0,e.currentHp)}/${e.maxHp}`,ehbX+ehbW+4,ehbY+9);

  // ── Battle panel ──
  const pY=Math.floor(H*0.58);
  ctxUI.fillStyle='#0C0A06';ctxUI.fillRect(0,pY,W,H-pY);
  ctxUI.fillStyle='#7A5020';ctxUI.fillRect(0,pY,W,2); // gold divider

  // ── Left column: battle log (top 3 lines) + weapon loadout (below) ──────────
  const lcX=4,lcW=260,lcH=H-pY-8;
  ctxUI.fillStyle='#180E04';ctxUI.fillRect(lcX,pY+4,lcW,lcH);
  ctxUI.strokeStyle='#5A3A10';ctxUI.lineWidth=1;ctxUI.strokeRect(lcX,pY+4,lcW,lcH);
  ctxUI.font='11px monospace';
  bt.log.slice(-3).forEach((line,i,arr)=>{
    ctxUI.fillStyle=i===arr.length-1?'#FFD080':'#907050';
    ctxUI.fillText(line,lcX+6,pY+18+i*20,lcW-8);
  });
  // ── Weapon loadout (left column, below log — all cards visible, no overflow) ─
  {
    const llWeapons=[
      ...(G.inventory[0]?[{item:G.inventory[0],idx:0}]:[]),
      ...G.inventory.slice(2)
        .map((it,i)=>it?.type==='weapon'?{item:it,idx:i+2}:null)
        .filter(Boolean),
    ];
    if(llWeapons.length>0){
      const lwX=lcX+1,lwW=lcW-2;
      ctxUI.fillStyle='#3A2A10';ctxUI.fillRect(lwX,pY+64,lwW,1);
      ctxUI.fillStyle='#7A6040';ctxUI.font='bold 9px monospace';
      ctxUI.fillText('LOADOUT',lwX+1,pY+73);
      if(llWeapons.length>1){
        ctxUI.fillStyle='#443322';ctxUI.font='8px monospace';
        ctxUI.fillText('[W] cycle',lwX+lwW-58,pY+73);
      }
      const wH=18,wGap=2;
      llWeapons.slice(0,4).forEach(({item,idx},i)=>{
        const isEquipped=idx===0;
        const wy=pY+78+i*(wH+wGap);
        ctxUI.fillStyle=isEquipped?'#2A1A08':'#0E0A04';
        ctxUI.fillRect(lwX,wy,lwW,wH);
        ctxUI.strokeStyle=isEquipped?'#FFD080':active?RARITY_COLOR[item.rarity||'common']:'#2A2A2A';
        ctxUI.lineWidth=1;ctxUI.strokeRect(lwX,wy,lwW,wH);
        ctxUI.fillStyle='#FFD080';ctxUI.font='9px monospace';
        ctxUI.fillText(isEquipped?'▶':' ',lwX+2,wy+12);
        ctxUI.fillStyle=isEquipped?'#FFE090':active?'#AA9966':'#555544';
        ctxUI.font=(isEquipped?'bold ':'')+'10px monospace';
        ctxUI.fillText(`${item.icon} ${item.name}`,lwX+11,wy+11,lwW-56);
        const dtCol={physical:'#999',magic:'#B080FF',holy:'#FFE566'}[item.dmgType||'physical']||'#999';
        ctxUI.fillStyle=active?dtCol:'#444';ctxUI.font='9px monospace';
        ctxUI.fillText(`+${itemEffDmg(item)}[${(item.dmgType||'phys').slice(0,4)}]`,lwX+11,wy+19);
        if(item.durability!=null){
          const maxD=item.maxDurability||itemMaxDur(item);
          const pct=item.durability/maxD;
          const barW=30,barH=4,barX=lwX+lwW-barW-3,barY=wy+3;
          ctxUI.fillStyle='#111';ctxUI.fillRect(barX,barY,barW,barH);
          ctxUI.fillStyle=active?(pct>0.6?'#4CAF50':pct>0.25?'#FFD700':'#FF4444'):'#333';
          ctxUI.fillRect(barX,barY,Math.round(barW*pct),barH);
          ctxUI.strokeStyle='#2A2A2A';ctxUI.lineWidth=1;ctxUI.strokeRect(barX,barY,barW,barH);
          ctxUI.fillStyle=active?'#776655':'#333';ctxUI.font='8px monospace';
          ctxUI.fillText(`${Math.round(pct*100)}%`,barX-2,barY+12);
        }
        if(!isEquipped) BATTLE_BTNS[`ws_${idx}`]={x:lwX,y:wy,w:lwW,h:wH};
      });
      if(llWeapons.length>1&&active){
        const hY=pY+78+Math.min(4,llWeapons.length)*(wH+wGap)+1;
        if(hY<H-8){ctxUI.fillStyle='#443322';ctxUI.font='8px monospace';
          ctxUI.fillText('tap to swap (uses turn)',lwX,hY);}
      }
    }
  }

  // ── Action buttons ──
  const cls=G.class_||'warrior';
  const specialLabel={warrior:'⚔  POWER STRIKE',mage:'🔮  ARCANE BOLT',rogue:'🗡  TWIN DAGGERS',paladin:'✨  HOLY LIGHT'}[cls]||'✦  SPECIAL';
  // Flee chance shown on the button so the player can make an informed decision
  const fleeChancePct=Math.round(Math.min(0.88,0.4+G.stats.agi*0.06-(bt.enemy.spd||1)*0.04)*100);
  const actions=[
    {id:'attack', label:'⚔  ATTACK',   bg:'#6B1818',hi:'#A02020'},
    {id:'special',label:specialLabel,  bg:'#183058',hi:'#2050A0'},
    {id:'potion', label:'🧪  POTION',  bg:'#183040',hi:'#204060'},
    {id:'flee',   label:`💨  FLEE (${fleeChancePct}%)`,bg:'#183018',hi:'#286028'},
  ];
  const bX=274,bW=175,bH=28,bGap=7,bStartY=pY+10;
  actions.forEach((a,i)=>{
    const bx=bX,by=bStartY+i*(bH+bGap);
    BATTLE_BTNS[a.id]={x:bx,y:by,w:bW,h:bH};
    ctxUI.fillStyle='#000';ctxUI.fillRect(bx+2,by+2,bW,bH);
    ctxUI.fillStyle=active?a.bg:'#1E1E1E';ctxUI.fillRect(bx,by,bW,bH);
    ctxUI.fillStyle=active?a.hi:'#2E2E2E';ctxUI.fillRect(bx,by,bW,3);
    ctxUI.strokeStyle=active?'#FFD080':'#3A3A3A';ctxUI.lineWidth=1;ctxUI.strokeRect(bx,by,bW,bH);
    ctxUI.fillStyle=active?'#FFFFFF':'#555555';ctxUI.font='bold 11px monospace';
    ctxUI.fillText(a.label,bx+8,by+18);
  });

  // (Weapon loadout strip now rendered in left column above — no overflow)

  // ── Potion picker (shown when player has multiple potion types and tapped POTION) ──
  if(bt._potionPick){
    const potSlots=G.inventory.map((it,i)=>i>=2&&it?.type==='potion'?{pot:it,idx:i}:null).filter(Boolean);
    const ppX=bX-4,ppW=bW+8,ppY=pY-10-potSlots.length*30-24;
    ctxUI.fillStyle='rgba(0,0,0,0.92)';ctxUI.fillRect(ppX,ppY,ppW,potSlots.length*30+24);
    ctxUI.strokeStyle='#44FF88';ctxUI.lineWidth=1;ctxUI.strokeRect(ppX,ppY,ppW,potSlots.length*30+24);
    ctxUI.fillStyle='#44FF88';ctxUI.font='bold 10px monospace';
    ctxUI.fillText('USE WHICH POTION?',ppX+6,ppY+13);
    potSlots.forEach(({pot,idx},i)=>{
      const py=ppY+18+i*30,ph=26;
      BATTLE_BTNS[`pot_use_${idx}`]={x:ppX+2,y:py,w:ppW-4,h:ph};
      ctxUI.fillStyle='#0E1A10';ctxUI.fillRect(ppX+2,py,ppW-4,ph);
      ctxUI.strokeStyle='#44FF88';ctxUI.lineWidth=1;ctxUI.strokeRect(ppX+2,py,ppW-4,ph);
      ctxUI.fillStyle='#fff';ctxUI.font='11px monospace';
      ctxUI.fillText(`${pot.icon} ${pot.name}`,ppX+8,py+13);
      ctxUI.fillStyle='#44FF88';ctxUI.font='9px monospace';
      const healStr=pot.healFull?'Full HP restore':`+${pot.heal} HP`;
      ctxUI.fillText(healStr,ppX+8,py+23);
    });
    const cancelY=ppY+18+potSlots.length*30;
    BATTLE_BTNS['pot_cancel']={x:ppX+2,y:cancelY,w:ppW-4,h:18};
    ctxUI.fillStyle='#200808';ctxUI.fillRect(ppX+2,cancelY,ppW-4,18);
    ctxUI.strokeStyle='#604040';ctxUI.lineWidth=1;ctxUI.strokeRect(ppX+2,cancelY,ppW-4,18);
    ctxUI.fillStyle='#888';ctxUI.font='9px monospace';ctxUI.fillText('✕ Cancel',ppX+8,cancelY+12);
  }

  // ── Player sprite (battle right side, facing left) ──
  {
    const btS=2.8; // battle sprite scale
    const bpX=Math.floor(W*0.72), bpY=Math.floor(H*0.56);
    // shake if player was just hit
    const phX=bt.playerHitShake>0?(Math.random()*6-3)|0:0;
    if(bt.playerHitShake>0)bt.playerHitShake--;
    ctxUI.save();
    ctxUI.translate(bpX+phX+playerLungeX,bpY);
    ctxUI.scale(btS,btS);
    drawPlayerSprite(ctxUI,-12,-44,3,G.color,G.frame,false,G.godMode,G.species,G.hairColor,G.accessory,G.gender,G.skinTone,G.class_);
    ctxUI.restore();
  }

  // ── Player info panel (bottom-right) — all content stays within canvas ──────
  const piX=462,piY=pY+8;
  ctxUI.fillStyle='#C0A050';ctxUI.font='bold 11px monospace';
  ctxUI.fillText(G.nickname,piX,piY+11);
  // HP bar — text embedded inside bar so nothing overflows right edge
  const piBarW=155;
  ctxUI.fillStyle='#1A0000';ctxUI.fillRect(piX,piY+15,piBarW,11);
  const pf=Math.max(0,G.hp/G.maxHp);
  ctxUI.fillStyle=pf>0.5?'#20A830':pf>0.25?'#C09000':'#C01020';
  ctxUI.fillRect(piX,piY+15,Math.floor(piBarW*pf),11);
  ctxUI.strokeStyle='#604010';ctxUI.lineWidth=1;ctxUI.strokeRect(piX,piY+15,piBarW,11);
  ctxUI.fillStyle='rgba(255,255,255,0.85)';ctxUI.font='9px monospace';
  ctxUI.fillText(`♥ ${G.hp}/${G.maxHp}`,piX+3,piY+24);
  // MP bar — same treatment
  ctxUI.fillStyle='#001830';ctxUI.fillRect(piX,piY+29,piBarW,9);
  const mf=Math.max(0,G.mp/G.maxMp);
  ctxUI.fillStyle='#4FC3F7';ctxUI.fillRect(piX,piY+29,Math.floor(piBarW*mf),9);
  ctxUI.strokeStyle='#1A4060';ctxUI.lineWidth=1;ctxUI.strokeRect(piX,piY+29,piBarW,9);
  ctxUI.fillStyle='rgba(200,240,255,0.85)';ctxUI.font='9px monospace';
  ctxUI.fillText(`◆ ${G.mp}/${G.maxMp}`,piX+3,piY+37);
  // Mini stats
  ctxUI.fillStyle='#7A5830';ctxUI.font='10px monospace';
  ctxUI.fillText(`STR${G.stats.str} AGI${G.stats.agi} LCK${G.stats.lck}`,piX,piY+52);
  // Turn indicator (separate line — no overlap)
  if(!bt.result){
    ctxUI.fillStyle=bt.phase==='player_turn'?'#FFD080':'#FF6060';
    ctxUI.font='11px monospace';
    ctxUI.fillText(bt.phase==='player_turn'?'▶ Your turn':`▶ ${e.name}...`,piX,piY+66);
  }

  // ── Anim overlay rendering ────────────────────────────────────────────────────
  bt.anims.forEach(a=>{
    const age=G.tick-a.born;
    // Hit flash — semi-transparent color rect over sprite area
    if(a.type==='hit_flash'){
      ctxUI.globalAlpha=Math.max(0,(1-age/BT_ANIM.FLASH)*0.55);
      ctxUI.fillStyle=a.color;ctxUI.fillRect(a.x,a.y,a.w,a.h);
      ctxUI.globalAlpha=1;
    }
    // Floating damage / text numbers
    if(a.type==='float_dmg'){
      const t=age/BT_ANIM.FLOAT;
      ctxUI.globalAlpha=t>0.55?Math.max(0,1-(t-0.55)/0.45):1;
      ctxUI.font=`bold ${a.big?'17':'13'}px monospace`;
      ctxUI.fillStyle=a.color||'#FFF';
      ctxUI.textAlign='center';
      ctxUI.fillText(String(a.val),a.x,a.y-Math.round(t*42));
      ctxUI.textAlign='left';ctxUI.globalAlpha=1;
    }
    // Particle burst
    if(a.type==='particles'){
      const t=age/BT_ANIM.PART;
      ctxUI.globalAlpha=Math.max(0,1-t);
      ctxUI.fillStyle=a.color||'#FFF';
      (a.vels||[]).forEach(v=>{
        const sz=Math.max(1,3-Math.floor(t*3));
        ctxUI.fillRect(Math.round(a.x+v.vx*age)-sz/2,Math.round(a.y+v.vy*age)-sz/2,sz,sz);
      });
      ctxUI.globalAlpha=1;
    }
    // Screen edge flash
    if(a.type==='screen_flash'){
      ctxUI.globalAlpha=Math.max(0,1-age/BT_ANIM.SFLASH);
      ctxUI.fillStyle=a.color||'rgba(255,255,255,0.2)';
      ctxUI.fillRect(0,0,W,H);
      ctxUI.globalAlpha=1;
    }
  });

  // ── Result overlay ──
  if(bt.result){
    ctxUI.fillStyle='rgba(0,0,0,0.75)';ctxUI.fillRect(0,0,W,H);
    const col=bt.result==='win'?'#FFD700':bt.result==='flee'?'#80FF80':'#FF3030';
    const msg=bt.result==='win'?'VICTORY!':bt.result==='flee'?'ESCAPED!':'DEFEATED!';
    ctxUI.fillStyle=col;ctxUI.font='bold 30px monospace';ctxUI.textAlign='center';
    ctxUI.fillText(msg,W/2,H/2-24);
    if(bt.result==='win'){
      ctxUI.fillStyle='#C8B860';ctxUI.font='16px monospace';
      const winDropStr=bt.spacebucksGained>0?`+${bt.spacebucksGained} 🪙`:bt.schmecklesGained>0?`+${bt.schmecklesGained} 💀`:'';
      const killHealDisp=Math.max(1,Math.round(G.maxHp*0.05));
      ctxUI.fillText(`+${bt.xpGained} XP   ${winDropStr}   +${killHealDisp}♥`,W/2,H/2+6);
      if(bt.potionDrop){
        ctxUI.fillStyle='#80FF80';ctxUI.font='13px monospace';
        ctxUI.fillText('🧪 Minor Potion dropped!',W/2,H/2+26);
      }
    } else if(bt.result==='lose'){
      ctxUI.fillStyle='#FF8080';ctxUI.font='13px monospace';
      ctxUI.fillText('Respawning in town...',W/2,H/2+6);
    }
    ctxUI.fillStyle='#888';ctxUI.font='12px monospace';
    ctxUI.fillText('[ Space / Enter / Click to continue ]',W/2,H/2+40);
    ctxUI.textAlign='left';
  }
}

// ── Magic Points ──────────────────────────────────────────────────────────────
export function spendMp(cost){
  if(G.mp<cost)return false;
  G.mp=Math.max(0,G.mp-cost);
  return true;
}

// ── Combat math ───────────────────────────────────────────────────────────────

// ── Battle animation helpers ──────────────────────────────────────────────────
export const BT_ANIM={LUNGE:22,FLASH:8,FLOAT:55,PART:40,SFLASH:20,DISSOLVE:50};
export function btAnim(type,props){if(G.battle)(G.battle.anims=G.battle.anims||[]).push({type,born:G.tick,...props});}
export function btParticles(x,y,color,n=12){
  const vels=[];
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2,spd=1.5+Math.random()*2;vels.push({vx:Math.cos(a)*spd,vy:Math.sin(a)*spd});}
  btAnim('particles',{x,y,color,vels});
}
// Enemy sprite visual center (sprite drawn at x=70, y=20; ~80×100px body)
export const ENM_CX=150,ENM_CY=85;
// Enemy hit-box rect for flash
export const ENM_FX=52,ENM_FY=8,ENM_FW=186,ENM_FH=198;

export function doBattleAction(action){
  const bt=G.battle;
  if(!bt||bt.phase!=='player_turn'||bt.result)return;

  if(action==='potion'){
    // Find all potions; if more than one kind exists, open picker instead of auto-using
    const potSlots=G.inventory.map((it,i)=>i>=2&&it?.type==='potion'?{pot:it,idx:i}:null).filter(Boolean);
    if(potSlots.length===0){bt.log.push('No potions in inventory!');bt.phase='player_turn';SFX.error();return;}
    if(potSlots.length===1||!bt._potionPick){
      // Auto-use first (or only) potion when there's no ambiguity
      const {pot,idx}=potSlots[0];
      const before=G.hp;
      if(pot.healFull)G.hp=G.maxHp;
      else G.hp=Math.min(G.maxHp,G.hp+(pot.heal||5));
      const gained=G.hp-before;
      G.inventory[idx]=null;
      bt.log.push(`Used ${pot.name}! +${gained} HP.`);
      SFX.potion();
      btAnim('float_dmg',{val:'+'+gained,x:Math.floor(W*0.72),y:Math.floor(H*0.46),color:'#44FF88',big:true});
      btAnim('screen_flash',{color:'rgba(0,200,80,0.12)'});
      bt.phase='enemy_turn';bt.animTimer=75;
    } else {
      // Multiple potion types — open picker (handled in renderBattleUI)
      bt._potionPick=true;
    }
    return;
  }
  if(action.startsWith('pot_use_')){
    const idx=parseInt(action.slice(8));
    const pot=G.inventory[idx];
    if(!pot||pot.type!=='potion'){bt._potionPick=false;bt.phase='player_turn';return;}
    const before=G.hp;
    if(pot.healFull)G.hp=G.maxHp;
    else G.hp=Math.min(G.maxHp,G.hp+(pot.heal||5));
    const gained=G.hp-before;
    G.inventory[idx]=null;
    bt.log.push(`Used ${pot.name}! +${gained} HP.`);
    bt._potionPick=false;
    SFX.potion();
    btAnim('float_dmg',{val:'+'+gained,x:Math.floor(W*0.72),y:Math.floor(H*0.46),color:'#44FF88',big:true});
    btAnim('screen_flash',{color:'rgba(0,200,80,0.12)'});
    bt.phase='enemy_turn';bt.animTimer=75;
    return;
  }
  if(action==='pot_cancel'){bt._potionPick=false;return;}
  if(action==='flee'){
    const chance=Math.min(0.88,0.4+G.stats.agi*0.06-bt.enemy.spd*0.04);
    if(Math.random()<chance){
      bt.log.push('You dashed away!');
      bt.result='flee';
    } else {
      bt.log.push("Couldn't escape!");
      bt.phase='enemy_turn';bt.animTimer=72;
    }
    return;
  }

  // ── Helper: compute weapon damage with type/weakness system ─────────────────
  function calcWeaponDmg(weapon, enemy, strMult=0.9, defMult=0.55, extraCritBonus=0){
    const dt=weapon?.dmgType||'physical';
    const base=itemEffDmg(weapon)+Math.floor(G.stats.str*strMult);
    // Weakness multiplier: physWeakness, magicWeakness, holyWeakness (default 1.0)
    const weak=dt==='magic'?(enemy.magicWeakness||1.0):
                dt==='holy' ?(enemy.holyWeakness ||1.0):
                              (enemy.physWeakness ||1.0);
    // Magic/holy bypasses most armor; physical is fully blocked
    const defReduction=dt==='magic'?enemy.def*0.15:dt==='holy'?enemy.def*0.20:enemy.def*defMult;
    // Crit cap lowered 80%→40%; remaining LCK value shifted to shop discount + potion luck.
    const critChance=Math.min(0.40, G.stats.lck*0.035+(weapon?.critBonus||0)+extraCritBonus);
    const crit=Math.random()<critChance;
    const raw=Math.max(0.5,(base-defReduction)*weak);
    const dmg=Math.max(1,Math.floor(raw*(crit?1.6:1)+(Math.random()*2-1)));
    return{dmg,crit,dt,weak};
  }

  if(action==='attack'){
    const weapon=G.inventory[0];
    const{dmg,crit,dt,weak}=calcWeaponDmg(weapon,bt.enemy);
    bt.enemy.currentHp-=dmg;bt.hitShake=10;
    // Each attack degrades the weapon by 1 durability point
    degradeItem(weapon);
    if(weapon&&weapon.durability===0)chatLog(`⚠ ${weapon.name} is broken! (repair at shop)`,'#FF8800');
    SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
    const weakStr=weak>1.2?'⚡ WEAK! ':weak<0.6?'🛡 RESIST ':'' ;
    bt.log.push(crit?`${weakStr}Critical hit! ${dmg} damage! [${dt}]`:`${weakStr}You attack for ${dmg} damage. [${dt}]`);
    // Animations
    const dmgCol=crit?'#FFD700':dt==='magic'?'#CC88FF':dt==='holy'?'#FFE566':'#FFFFFF';
    btAnim('player_lunge',{});
    btAnim('hit_flash',{x:ENM_FX,y:ENM_FY,w:ENM_FW,h:ENM_FH,color:dmgCol});
    btAnim('float_dmg',{val:String(dmg)+(crit?' CRIT!':''),x:ENM_CX,y:ENM_CY-20,color:dmgCol,big:crit});
    if(weak>1.2||crit) btParticles(ENM_CX,ENM_CY,dmgCol);
  }

  // ── Weapon switch (costs player turn) ──────────────────────────────────────
  // switch_weapon is now handled directly in the click/keyboard handlers

  if(action==='special'){
    let dmg=0,healAmt=0;
    const cls=G.class_||'warrior';
    const mpCost=(cls==='rogue'||cls==='warrior')?1:2;
    if(!spendMp(mpCost)){
      bt.log.push(`Not enough MP! (need ${mpCost} ◆)`);
      SFX.error();bt.phase='player_turn';return;
    }
    if(cls==='mage'){
      // Arcane bolt — treated as magic, benefits from weapon critBonus
      const weapon=G.inventory[0];
      const weak=bt.enemy.magicWeakness||1.0;
      dmg=Math.max(2,Math.floor((G.stats.lck*1.6+G.stats.agi*0.5+Math.random()*4)*weak));
      bt.enemy.currentHp-=dmg;bt.hitShake=10;
      SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
      const weakStr=weak>1.2?'⚡ WEAK! ':weak<0.6?'🛡 RESIST ':'';
      bt.log.push(`${weakStr}Arcane Bolt! ${dmg} magic damage! (−${mpCost} MP)`);
      btAnim('player_lunge',{});
      btAnim('hit_flash',{x:ENM_FX,y:ENM_FY,w:ENM_FW,h:ENM_FH,color:'#CC88FF'});
      btAnim('float_dmg',{val:String(dmg),x:ENM_CX,y:ENM_CY-20,color:'#CC88FF',big:weak>1.2});
      btParticles(ENM_CX,ENM_CY,'#9B59B6');
      btAnim('screen_flash',{color:'rgba(150,0,220,0.10)'});
    } else if(cls==='paladin'){
      healAmt=Math.max(1,Math.floor(G.stats.vit*0.6)+2);
      G.hp=Math.min(G.maxHp,G.hp+healAmt);
      SFX.potion();
      bt.log.push(`Holy Light! Restored ${healAmt} HP. (−${mpCost} MP)`);
      btAnim('float_dmg',{val:'+'+healAmt,x:Math.floor(W*0.72),y:Math.floor(H*0.46),color:'#FFE566',big:true});
      btParticles(ENM_CX,ENM_CY,'#FFE566');
      btAnim('screen_flash',{color:'rgba(255,220,80,0.14)'});
    } else if(cls==='rogue'){
      // Piercing attack — physical, ignores 60% of armor
      const weapon=G.inventory[0];
      const weak=bt.enemy.physWeakness||1.0;
      dmg=Math.max(1,Math.floor((G.stats.agi*1.3+Math.floor(G.stats.str*0.5)-Math.floor(bt.enemy.def*0.2))*weak));
      bt.enemy.currentHp-=dmg;bt.hitShake=10;
      SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
      bt.log.push(`Twin Daggers! ${dmg} piercing damage! (−${mpCost} MP)`);
      btAnim('player_lunge',{});
      btAnim('hit_flash',{x:ENM_FX,y:ENM_FY,w:ENM_FW,h:ENM_FH,color:'#AAAAFF'});
      btAnim('float_dmg',{val:String(dmg),x:ENM_CX,y:ENM_CY-20,color:'#CCDDFF'});
      if(weak>1.2) btParticles(ENM_CX,ENM_CY,'#AAAAFF');
    } else { // warrior — power strike, uses weapon dmgType
      const weapon=G.inventory[0];
      const{dmg:pd,crit:pc,dt:pdt,weak:pw}=calcWeaponDmg(weapon,bt.enemy,1.1,0.45);
      const bonus=Math.floor((weapon?.dmg||2)*0.9);
      const finalDmg=Math.max(1,pd+bonus);
      bt.enemy.currentHp-=finalDmg;bt.hitShake=10;
      SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
      const weakStr=pw>1.2?'⚡ WEAK! ':pw<0.6?'🛡 RESIST ':'';
      bt.log.push(`${weakStr}Power Strike! ${finalDmg} ${pdt} damage! (−${mpCost} MP)`);
      const psCol=pdt==='magic'?'#CC88FF':pdt==='holy'?'#FFE566':'#FF8800';
      btAnim('player_lunge',{});
      btAnim('hit_flash',{x:ENM_FX,y:ENM_FY,w:ENM_FW,h:ENM_FH,color:psCol});
      btAnim('float_dmg',{val:String(finalDmg)+(pc?' CRIT!':''),x:ENM_CX,y:ENM_CY-20,color:psCol,big:true});
      btParticles(ENM_CX,ENM_CY,psCol);
    }
  }

  // Check enemy death
  if(bt.enemy.currentHp<=0){
    bt.enemy.currentHp=0;
    bt.log.push(`${bt.enemy.name} is defeated!`);
    SFX.enemyDeath();
    setTimeout(()=>SFX.victoryFanfare?SFX.victoryFanfare():SFX.victory(),500);
    btAnim('enemy_dissolve',{});
    btAnim('screen_flash',{color:'rgba(255,215,0,0.22)'});
    bt.result='win';
    bt.xpGained=bt.enemy.xp;
    const drops = bt.enemy.drops || {};
    const lootMult=(G.worldEvent?.type==='treasure_surge')?1.5:1;
    const moonMult=(G.worldEvent?.type==='blood_moon')?2:1;
    // Depth bonus: +6.7% per depth unit, capped at 3× at depth 30+.
    // Rewards players who push into dangerous territory over safe-zone farming.
    const depthMult=1+Math.min(2.0,(bt.depth||0)/15);
    bt.spacebucksGained = Math.round((drops.spacebucks || 0)*lootMult*depthMult);
    bt.schmecklesGained = Math.round((drops.schmeckles || 0)*lootMult*moonMult*depthMult);
    G.spacebucks += bt.spacebucksGained;
    G.schmeckles += bt.schmecklesGained;
    G.xp+=bt.xpGained;
    G.kills=(G.kills||0)+1;
    if(bt.snowballId&&socket)socket.emit('snowball_kill',{id:bt.snowballId});
    checkLevelUp();
    if(bt.enemy.type==='lich'){
      G.dungeonBossDefeated=true;
      chatLog('★ THE LICH IS DEFEATED! Ancient evil vanquished!','#AA00FF');
    }
    // Sub-zone boss defeat flags
    {const bossInfo=SUBZONE_BOSSES[G.zone];
    if(bossInfo&&bt.enemy.type===bossInfo.enemy&&!G[bossInfo.flag]){
      G[bossInfo.flag]=true;
      chatLog(`★ The ${bt.enemy.name} falls! The zone is safer now.`,'#AA88FF');
    }}
    updateQuestProgress(bt.enemy.type);

    // ── Kill-heal: 5% of max HP restored on every kill ──────────────────────
    const killHeal=Math.max(1,Math.round(G.maxHp*0.05));
    G.hp=Math.min(G.maxHp,G.hp+killHeal);

    // ── Potion drop: 25% base + 2% per LCK above 1, capped at 45% ──────────
    // Cap reduced so LCK doesn't trivialise HP management; extra value moved to shop discount.
    const potionChance=Math.min(0.45,0.25+(G.stats.lck-1)*0.02);
    bt.potionDrop=false;
    if(Math.random()<potionChance){
      const freeSlot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
      if(freeSlot!==-1){
        G.inventory[freeSlot]={name:'Minor Potion',icon:'🧪',type:'potion',heal:20};
        bt.potionDrop=true;
      }
    }

    SFX.coin();
    const dropStr = bt.spacebucksGained>0?`+${bt.spacebucksGained} 🪙`:bt.schmecklesGained>0?`+${bt.schmecklesGained} 💀`:'';
    const healStr = `+${killHeal}♥`;
    const potStr  = bt.potionDrop?' · 🧪 Potion found!':'';
    chatLog(`Battle won! +${bt.xpGained} XP  ${dropStr}  ${healStr}${potStr}`,'#FFD700');
    saveToServer();
    // Wait for player input — do NOT auto-advance
    return;
  }
  bt.phase='enemy_turn';bt.animTimer=75;
}

export function doEnemyTurn(){
  const bt=G.battle,e=bt.enemy;
  // AGI drives dodge chance (5% per point)
  const dodge=Math.random()<G.stats.agi*0.05;
  const plrFX=Math.floor(W*0.72)-38, plrFY=Math.floor(H*0.56)-100, plrFW=76, plrFH=118;
  if(dodge){
    bt.log.push(`${e.name} attacks — you dodge!`);
    btAnim('float_dmg',{val:'DODGE',x:Math.floor(W*0.72),y:Math.floor(H*0.46),color:'#80FFAA'});
  } else {
    // Total player defense: END stat + equipped shield DEF + equipped armor DEF
    // Use effective DEF (0 if item is broken); degrade shield and armor on each hit.
    const endArmor   = Math.floor(G.stats.end*0.5);
    const shieldDef  = itemEffDef(G.inventory[1]);
    const armorDef   = itemEffDef(G.equippedArmor);
    const totalDef   = endArmor+shieldDef+armorDef;
    if(G.inventory[1])degradeItem(G.inventory[1]);
    if(G.equippedArmor)degradeItem(G.equippedArmor);
    if(G.inventory[1]?.durability===0)chatLog(`⚠ ${G.inventory[1].name} is broken! (repair at shop)`,'#FF8800');
    if(G.equippedArmor?.durability===0)chatLog(`⚠ ${G.equippedArmor.name} is broken! (repair at shop)`,'#FF8800');
    // Deep-zone armor penetration: enemies at depth 30+ ignore an increasing fraction
    // of flat DEF, preventing gear from reaching true invincibility at high levels.
    // Max 55% penetration at depth 60+.
    const armorPen=Math.min(0.55,(bt.depth||0)/110);
    const effectiveDef=Math.floor(totalDef*(1-armorPen));
    const dmg=Math.max(1,e.atk-effectiveDef+(((Math.random()*3)|0)-1));
    G.hp=Math.max(0,G.hp-dmg);
    bt.playerHitShake=8;
    SFX.hitPlayer();
    bt.log.push(`${e.name} hits you for ${dmg}! [DEF:${totalDef}]`);
    btAnim('enemy_lunge',{});
    btAnim('hit_flash',{x:plrFX,y:plrFY,w:plrFW,h:plrFH,color:'#FF4040'});
    btAnim('float_dmg',{val:'-'+dmg,x:Math.floor(W*0.72),y:Math.floor(H*0.46),color:'#FF4040',big:dmg>=10});
    if(G.hp<=0){
      G.hp=0;
      bt.log.push('You have been defeated...');
      SFX.gameOver();
      bt.result='lose';
      btAnim('screen_flash',{color:'rgba(200,0,0,0.30)'});
      return;
    }
    if(dmg>=8) btAnim('screen_flash',{color:'rgba(200,0,0,0.12)'});
  }
  bt.phase='player_turn';
}

export function endBattle(){
  const bt=G.battle;if(!bt)return;
  document.getElementById('cv-ui').style.pointerEvents='';
  // Snapshot the current battle screen for transition-out
  _snapCtx.clearRect(0,0,W,H);
  _snapCtx.fillStyle='#000';_snapCtx.fillRect(0,0,W,H);
  bt.phase='transition_out';
  if(bt.result==='lose'){
    // Only drop non-bound bag items (slots 2+); keep bound items, equipped weapon/shield, armor
    const droppedItems=G.inventory.slice(2).filter(it=>it&&!it.bound);
    const keptBag=G.inventory.slice(2).map(it=>(it&&it.bound)?it:null);
    G.inventory=[G.inventory[0],G.inventory[1],...keptBag,...new Array(Math.max(0,G.maxInvSlots-2-keptBag.length)).fill(null)];
    const sbDrop=Math.floor(G.spacebucks*0.30);
    const smDrop=Math.floor(G.schmeckles*0.30);
    const auDrop=parseFloat((G.alUSD*0.20).toFixed(2));
    G.spacebucks=Math.max(0,G.spacebucks-sbDrop);
    G.schmeckles=Math.max(0,G.schmeckles-smDrop);
    G.alUSD=Math.max(0,parseFloat((G.alUSD-auDrop).toFixed(2)));
    if(socket&&(droppedItems.length||sbDrop||smDrop||auDrop)){
      socket.emit('loot_drop',{
        zone:G.zone,x:Math.round(G.x/TS),y:Math.round(G.y/TS),
        items:droppedItems,
        currencies:{spacebucks:sbDrop,schmeckles:smDrop,alUSD:auDrop},
        killerType:bt.enemy.type,
      });
    }
    G.hp=Math.max(1,Math.floor(G.maxHp*0.3));
    runPixelTransition('out',()=>{
      G.battle=null;G.paused=false;ctxUI.clearRect(0,0,W,H);
      changeZone('world',RESPAWN_TX,RESPAWN_TY);
      musPlay('world');
      const lostStr=[sbDrop&&`${sbDrop}🪙`,smDrop&&`${smDrop}💀`,auDrop&&`${auDrop}$`].filter(Boolean).join(' ');
      chatLog(`Defeated! Dropped: ${lostStr||'nothing'}. Respawned in town.`,'#FF4040');
    });
  } else {
    runPixelTransition('out',()=>{
      const sx=bt.savedX,sy=bt.savedY;
      G.battle=null;G.paused=false;ctxUI.clearRect(0,0,W,H);
      // If the battle started inside the dungeon boss room (tile row >=24),
      // teleport to the dungeon entry safe zone to prevent immediate re-trigger
      if(G.zone==='dungeon'&&Math.floor(sy/TS)>=24){
        G.x=8*TS+TS/2; G.y=6*TS+TS/2;
      } else {
        G.x=sx;G.y=sy;
      }
      musPlay(G.zone);
    });
  }
}
