import { G } from './state.js';
import { T, CFG, TS, TW, TH, WORLD_W, WORLD_H, TOWN_OX, TOWN_OY, SOLID_TILES, WORLD_SOLID, RESPAWN_TX, RESPAWN_TY, QUEST_DEFS, PLAYER_COLORS, HAIR_COLORS, SKIN_TONES, SPECIES, CLASSES, RARITY_COLOR, BATTLE_BTNS } from './data.js';
// Re-export canvas logical dimensions (from CFG) so other modules (ui.js etc.) can import W/H from game.js
import { MAP_W, MAP_H, ZONES, NPCS, ZONE_DOORS, ZONE_MAPS, WORLD_MAP, TOWN_MAP } from './maps.js';
import { SFX, musPlay } from './audio.js';
import { buildTileCache, TILE_CACHE, WATER_FRAMES, drawBackground, renderCeiling, drawPlayerSprite, drawNPCSprite, drawWaterAnimated, buildWaterFrames } from './render.js';
import { socket, others, G_accountId, initSocket, saveToServer, updateOnlineCount, joinGameServer } from './socket.js';
import { KEYS, handleEsc } from './input.js';
import { checkEncounter, checkBossEncounter, checkSubZoneEncounter, checkSubZoneBoss, checkWaterEncounter, checkForestEncounter, renderBattleScreen, doBattleAction, xpForLevel, checkLevelUp, doEnemyTurn, endBattle, triggerSnowballBattle } from './combat.js';
import { renderHUD, renderGovernancePanel, renderInventoryScreen, renderTileLayer, renderFgLayer, renderSpriteLayer, renderMinimap, renderBuildingSigns, openGovernance, openShop, openBank, openTransmuter, openMarket, openExchange, openInvUpgrade, doInvUpgrade, showHallOfFame, distributeTransmuterPool, togglePause, openChangelog, closeChangelog, showHelp, openSimulator } from './ui.js';

// ── Canvas contexts + dimensions (exported so other modules can reference them) ──
export let W = CFG.W, H = CFG.H;
export let ctxBG = null, ctxSprites = null, ctxUI = null, ctxCeiling = null, ctxFg = null;
export let cvTiles = null, ctxTiles = null;
export let _mmCanvas = null;
export function resetMmCanvas(){ _mmCanvas = null; }
export const serverQueues = {};

// ── Global error display (debug overlay) ──────────────────────────────────────
window.addEventListener('error', e => {
  const el = document.getElementById('_debug_err') || (() => {
    const d = document.createElement('div');
    d.id = '_debug_err';
    d.style.cssText = 'position:fixed;top:36px;left:0;right:0;background:rgba(180,0,0,0.95);color:#fff;font:11px monospace;padding:6px 8px;z-index:99999;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow:auto;';
    document.body.appendChild(d);
    return d;
  })();
  el.textContent += `[ERR] ${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}\n`;
});
window.addEventListener('unhandledrejection', e => {
  const el = document.getElementById('_debug_err') || (() => {
    const d = document.createElement('div');
    d.id = '_debug_err';
    d.style.cssText = 'position:fixed;top:36px;left:0;right:0;background:rgba(180,0,0,0.95);color:#fff;font:11px monospace;padding:6px 8px;z-index:99999;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow:auto;';
    document.body.appendChild(d);
    return d;
  })();
  el.textContent += `[PROMISE] ${e.reason}\n`;
});

// ── CAMERA ────────────────────────────────────────────────────────────────────
function updateCamera(){
  const z=ZONES[G.zone];
  if(z&&(z.w*TS>W||z.h*TS>H)){
    // Scrolling zone: camera leads slightly in movement direction
    const CFG_CAM_LEAD=24; // px nudge ahead of player
    G._camVx=G._camVx*0.7+(G.x-G._prevX)*0.3;
    G._camVy=G._camVy*0.7+(G.y-G._prevY)*0.3;
    G._prevX=G.x; G._prevY=G.y;
    const maxCX=Math.max(0,(z.w*TS)-W),maxCY=Math.max(0,(z.h*TS)-H);
    const targetX=Math.max(0,Math.min(maxCX,G.x-W/2+G._camVx*CFG_CAM_LEAD));
    const targetY=Math.max(0,Math.min(maxCY,G.y-H/2+G._camVy*CFG_CAM_LEAD));
    G.camX+=(targetX-G.camX)*0.12;
    G.camY+=(targetY-G.camY)*0.12;
  } else {
    G.camX=0;G.camY=0;
    G._prevX=G.x;G._prevY=G.y;G._camVx=0;G._camVy=0;
  }
}

// ── COLLISION ─────────────────────────────────────────────────────────────────
// ── Exploration ability helpers ───────────────────────────────────────────────
function _playerHasEffect(effect){
  if(G.accessory?.effect===effect||G.accessory?.effect==='raftAndForest')return true;
  return G.inventory.some(it=>it&&(it.effect===effect||it.effect==='raftAndForest'));
}
export function hasRaft(){return _playerHasEffect('raft');}
export function hasForestPass(){return _playerHasEffect('forestPass');}

function isSolid(zone,tx,ty){
  const z=ZONES[zone];if(!z)return true;
  if(tx<0||ty<0||tx>=z.w||ty>=z.h)return true;
  const tile=z.map[ty][tx];
  // Exploration overrides: raft crosses water, forestPass crosses trees (world only)
  if(zone==='world'){
    if(tile===T.WATER&&hasRaft())return false;
    if(tile===T.TREE&&hasForestPass())return false;
  }
  return z.solid.has(tile);
}

function tryMove(dx,dy){
  if(G.paused)return;
  const r=10; // half-width hitbox
  let nx=G.x+dx,ny=G.y+dy;
  // 4-corner collision
  const corners=[[-r,-r],[r,-r],[-r,r],[r,r]];
  let okX=true,okY=true;
  corners.forEach(([cx,cy])=>{
    if(isSolid(G.zone,Math.floor((nx+cx)/TS),Math.floor((G.y+cy)/TS)))okX=false;
    if(isSolid(G.zone,Math.floor((G.x+cx)/TS),Math.floor((ny+cy)/TS)))okY=false;
  });
  if(okX)G.x=nx;
  if(okY)G.y=ny;
  const moved=okX||okY;
  G.moving=moved;
  if(moved){
    G._stepTick=(G._stepTick||0)+1;
    if(G._stepTick%16===0) SFX.step();
  }
  // direction
  if(Math.abs(dx)>Math.abs(dy)){G.dir=dx>0?1:3;}
  else if(dy!==0){G.dir=dy>0?2:0;}
}

// ── QUEST SYSTEM ──────────────────────────────────────────────────────────────
// Returns the appropriate dialog lines for an NPC, resolving quest state.
const QUEST_ABANDON_PENALTY=50; // alUSD penalty for abandoning an active quest

function getQuestDialog(npc){
  const qid=npc.questId;
  if(!qid)return npc.dialog;
  const qdef=QUEST_DEFS[qid];
  if(!qdef)return npc.dialog;
  const qs=G.quests[qid];
  if(!qs){
    // Gate quests with a prerequisite
    if(qdef.prereq&&G.quests[qdef.prereq]?.status!=='completed'){
      return["I'm not sure you're ready for this yet.","Come back after you've proven yourself in the field."];
    }
    // Quest not yet accepted — offer it
    return[...qdef.offerLines,'[ Accept: Space/E  |  Decline: Esc ]'];
  }
  if(qs.status==='active'){
    return[
      `${qdef.inProgressLine} (${qs.progress}/${qdef.required})`,
      `[ Continue: Space/E  |  Abandon: Esc (costs ${QUEST_ABANDON_PENALTY} alUSD) ]`,
    ];
  }
  if(qs.status==='ready'){
    const rp=[qdef.reward.xp&&`+${qdef.reward.xp} XP`,qdef.reward.alUSD&&`+${qdef.reward.alUSD} alUSD`,qdef.reward.alETH&&`+${qdef.reward.alETH} alETH`,qdef.reward.alcx&&`+${qdef.reward.alcx} ALCX`,qdef.reward.item&&`${qdef.reward.item.icon} ${qdef.reward.item.name}`].filter(Boolean).join(', ');
    return[...qdef.readyLines,`[ Claim reward: ${rp} ]`];
  }
  // completed
  return qdef.completedLines;
}

// Called when a quest dialog closes — handles accept and turn-in actions.
function handleQuestDialogClose(npc){
  const qid=npc.questId;
  if(!qid)return;
  const qdef=QUEST_DEFS[qid];
  if(!qdef)return;
  const qs=G.quests[qid];
  if(!qs){
    // Don't accept if prereq not yet completed
    if(qdef.prereq&&G.quests[qdef.prereq]?.status!=='completed')return;
    // Accept the quest
    G.quests[qid]={progress:0,status:'active'};
    chatLog(`★ Quest accepted: "${qdef.title}" — ${qdef.inProgressLine}`,'#FFD700');
  } else if(qs.status==='ready'){
    // Turn in the quest — rewards scale 8% per level above 1 so quests stay worth doing.
    const qScaleMult=1+(G.level-1)*0.08;
    const _qReward={alUSD:0,alETH:0,alcx:0};
    if(qdef.reward.alUSD){
      const scaled=parseFloat((qdef.reward.alUSD*qScaleMult).toFixed(2));
      G.alUSD=parseFloat((G.alUSD+scaled).toFixed(2));
      _qReward.alUSD=scaled;
      chatLog(`Quest reward: +${scaled} alUSD (×${qScaleMult.toFixed(2)} level bonus)`,'#FFD700');
    }
    if(qdef.reward.alETH){
      const scaled=parseFloat((qdef.reward.alETH*qScaleMult).toFixed(4));
      G.alETH=parseFloat((G.alETH+scaled).toFixed(4));
      _qReward.alETH=scaled;
      chatLog(`Quest reward: +${scaled} alETH (×${qScaleMult.toFixed(2)} level bonus)`,'#7B68EE');
    }
    if(qdef.reward.alcx){const scaled=parseFloat((qdef.reward.alcx*qScaleMult).toFixed(4));G.alcx=parseFloat((G.alcx+scaled).toFixed(4));_qReward.alcx=scaled;}
    // Notify server of currency grants BEFORE saveToServer() so anti-cheat accepts them
    socket?.emit('quest_reward',_qReward);
    G.xp+=Math.round(qdef.reward.xp*qScaleMult);
    checkLevelUp();
    // Item reward — place in first free inventory slot (2-7)
    if(qdef.reward.item){
      const iSlot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
      if(iSlot!==-1){
        G.inventory[iSlot]=qdef.reward.item;
        // Apply stat boost (relic type)
        if(qdef.reward.item.statBoost){
          for(const[st,v] of Object.entries(qdef.reward.item.statBoost)){
            G.stats[st]=(G.stats[st]||0)+v;
          }
          chatLog(`Relic bonus: ${Object.entries(qdef.reward.item.statBoost).map(([k,v])=>`+${v} ${k.toUpperCase()}`).join(', ')}!`,'#FFD700');
        }
      } else {
        chatLog(`Inventory full! Item lost: ${qdef.reward.item.icon} ${qdef.reward.item.name}`,'#FF8800');
      }
    }
    qs.status='completed';
    SFX.questComplete();
    SFX.coin();
    const rewardParts=[
      qdef.reward.xp&&`+${qdef.reward.xp} XP`,
      qdef.reward.alUSD&&`+${qdef.reward.alUSD} alUSD`,
      qdef.reward.alETH&&`+${qdef.reward.alETH} alETH`,
      qdef.reward.alcx&&`+${qdef.reward.alcx} ALCX`,
      qdef.reward.item&&`${qdef.reward.item.icon} ${qdef.reward.item.name}`,
    ].filter(Boolean).join(', ');
    chatLog(`★ Quest complete: "${qdef.title}"! ${rewardParts}`,'#4CAF50');
    if(G.paused)renderInventoryScreen();
  }
}

// Called when the player presses Esc during a quest dialog — declines offer or abandons active quest.
export function declineOrAbandonQuest(){
  if(!G.npcDialog)return;
  const npc=G.npcDialog.npc;
  const qid=npc?.questId;
  // Close dialog
  G.npcDialog=null;
  G.paused=false;
  document.getElementById('npc-dialog').style.display='none';
  SFX.select();
  if(!qid)return;
  const qdef=QUEST_DEFS[qid];
  if(!qdef)return;
  const qs=G.quests[qid];
  if(!qs){
    // Declining the quest offer
    chatLog(`Declined quest: "${qdef.title}".`,'#888888');
  } else if(qs.status==='active'){
    // Abandoning an active quest — charge penalty
    if(G.alUSD<QUEST_ABANDON_PENALTY){
      // Can't pay — offer a penalty-free forfeit via in-game confirm dialog
      showGameConfirm(npc.face??2,npc.name,[
        `You can't pay the ${QUEST_ABANDON_PENALTY} alUSD penalty (you have ${G.alUSD.toFixed(2)} alUSD).`,
        `Forfeit the quest for free? You won't be able to restart it, but you won't be stuck.`,
      ],
      ()=>{ // Yes — free forfeit
        delete G.quests[qid];
        chatLog(`Quest forfeited: "${qdef.title}" (no penalty — could not afford ${QUEST_ABANDON_PENALTY} alUSD).`,'#888888');
        SFX.error(); saveToServer();
      },
      ()=>{ // No — reopen quest dialog so player can keep it
        G.npcDialog={npc,lineIdx:0,dialog:getQuestDialog(npc)};
        G.paused=true; showNpcDialog();
      });
      return;
    }
    G.alUSD=Math.max(0,G.alUSD-QUEST_ABANDON_PENALTY);
    delete G.quests[qid];
    chatLog(`Quest abandoned: "${qdef.title}" (−${QUEST_ABANDON_PENALTY} alUSD penalty).`,'#FF8800');
    SFX.error();
    saveToServer();
  }
  // If status is 'ready' or 'completed', Esc just closes — no special action needed.
}

// Called after winning a battle — increments kill-type quest progress.
export function updateQuestProgress(enemyType){
  for(const[qid,qs] of Object.entries(G.quests)){
    if(qs.status!=='active')continue;
    const qdef=QUEST_DEFS[qid];
    if(qdef.type==='kill'&&qdef.target===enemyType){
      qs.progress=Math.min(qdef.required,qs.progress+1);
      if(qs.progress>=qdef.required){
        qs.status='ready';
        chatLog(`★ Quest ready: "${qdef.title}" — return to ${qdef.giver}!`,'#FFD700');
      } else {
        chatLog(`Quest: "${qdef.title}" ${qs.progress}/${qdef.required}`,'#aaa');
      }
    }
  }
}

// ── NPC INTERACTION ────────────────────────────────────────────────────────────
export function tryInteract(){
  if(G.battle||G.npcDialog)return;
  // Check for nearby loot piles
  {const px_=Math.floor(G.x/TS),py_=Math.floor(G.y/TS);
  const nearLoot=G.worldLoot.find(l=>l.zone===G.zone&&Math.abs(l.x-px_)<=1&&Math.abs(l.y-py_)<=1);
  if(nearLoot){socket?.emit('loot_pickup',{lootId:nearLoot.id});return;}}
  // Check for nearby snowball enemies (world zone only)
  if(G.zone==='world'){
    const px_=Math.floor(G.x/TS),py_=Math.floor(G.y/TS);
    const nearSE=G.snowballEnemies.find(se=>se.zone===G.zone&&Math.abs(se.tileX-px_)<=1&&Math.abs(se.tileY-py_)<=1);
    if(nearSE){triggerSnowballBattle(nearSE);return;}
  }
  // Check for nearby graffiti
  {const px_=Math.floor(G.x/TS),py_=Math.floor(G.y/TS);
  const nearG=G.graffiti.find(g=>g.zone===G.zone&&Math.abs(g.tileX-px_)<=1&&Math.abs(g.tileY-py_)<=1);
  if(nearG){
    G.npcDialog={npc:{name:'Wall Graffiti',type:'merchant',face:5},lineIdx:0,
      dialog:[`📝 ${nearG.author} wrote:`,nearG.text,`(type /g <text> to leave your own)`]};
    G.paused=true;showNpcDialog();return;
  }}
  const npcs=NPCS[G.zone];if(!npcs)return;
  const px=Math.floor(G.x/TS),py=Math.floor(G.y/TS);
  // Find the nearest NPC within 1.5 tiles
  let nearest=null,bestDist=2;
  for(const npc of npcs){
    const d=Math.abs(npc.x-px)+Math.abs(npc.y-py);
    if(d<=bestDist){bestDist=d;nearest=npc;}
  }
  if(!nearest)return;
  if(nearest.shop){openShop(nearest.shop);return;}
  if(nearest.bank){ openBank(); return; }
  if(nearest.transmuter){ openTransmuter(); return; }
  if(nearest.market){ openMarket(); return; }
  if(nearest.govBoard){openGovernance();return;}
  if(nearest.invUpgrade){ openInvUpgrade(); return; }
  if(nearest.exchange){ openExchange(); return; }
  if(nearest.hallOfFame){ showHallOfFame(); return; }
  if(nearest.simulator){ openSimulator(); return; }
  G.npcDialog={npc:nearest,lineIdx:0,dialog:getQuestDialog(nearest)};
  G.paused=true;
  showNpcDialog();
}

export function advanceDialog(){
  if(!G.npcDialog)return;
  const nd=G.npcDialog;
  nd.lineIdx++;
  SFX.select();
  if(nd.lineIdx>=nd.dialog.length){
    // Confirm dialog (Y/N): stay on last page — don't close until Y or N pressed
    if(G._pendingConfirm&&!G._pendingConfirm._info){
      nd.lineIdx=nd.dialog.length-1;
      showNpcDialog(); return;
    }
    const npc=nd.npc;
    G.npcDialog=null;
    G.paused=false;
    document.getElementById('npc-dialog').style.display='none';
    document.getElementById('npc-confirm-btns').style.display='none';
    // Info dialog: fire the onClose callback
    if(G._pendingConfirm&&G._pendingConfirm._info){
      const cb=G._pendingConfirm.onYes; G._pendingConfirm=null; if(cb)cb(); return;
    }
    // Inventory upgrade confirmation on last line accept
    if(G._pendingInvUpgrade){doInvUpgrade();return;}
    handleQuestDialogClose(npc);
  } else {
    showNpcDialog();
  }
}

export function showNpcDialog(){
  const nd=G.npcDialog;if(!nd)return;
  const npc=nd.npc;
  // Portrait canvas
  const pcv=document.getElementById('npc-portrait-cv');
  const pctx=pcv.getContext('2d');
  pctx.clearRect(0,0,56,64);
  pctx.save();pctx.scale(2.2,2.2);
  drawNPCSprite(pctx,3,2,npc.type,npc.face??2);
  pctx.restore();
  // Text
  document.getElementById('npc-dialog-name').textContent=npc.name;
  document.getElementById('npc-dialog-text').textContent=nd.dialog[nd.lineIdx];
  const total=nd.dialog.length;
  const idx=nd.lineIdx+1;
  const isConfirmLast=G._pendingConfirm&&!G._pendingConfirm._info&&idx>=total;
  const hint=isConfirmLast?'[ Y ] Yes   [ N / Esc ] No'
    :idx<total?`[ E / Space ] Continue  (${idx}/${total})`:`[ E / Space ] Close  (${idx}/${total})`;
  document.getElementById('npc-dialog-hint').textContent=hint;
  const btns=document.getElementById('npc-confirm-btns');
  if(btns)btns.style.display=isConfirmLast?'flex':'none';
  document.getElementById('npc-dialog').style.display='block';
}

// ── ZONE TRANSITION ───────────────────────────────────────────────────────────
function checkDoorTrigger(){
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  // Clear the decline flag as soon as the player steps off that tile
  if(G._queueDeclinedTile&&(G._queueDeclinedTile.tx!==tx||G._queueDeclinedTile.ty!==ty)){
    G._queueDeclinedTile=null;
  }
  for(const[key,door] of Object.entries(ZONE_DOORS)){
    if(G.zone===door.from&&door.tileRows.includes(ty)&&door.tileCols.includes(tx)){
      if(door.queue){
        // Only prompt if the player hasn't already declined on this exact tile this visit
        if(!G._queueDeclinedTile) handleQueueDoor(key,door);
      } else{
        if(door.msg)chatLog(door.msg,'#B0BEC5');
        changeZone(door.to,door.sx,door.sy);
      }
      return;
    }
  }
}

// ── Queue door handler ────────────────────────────────────────────────────────
function queueInfoFromKey(key){
  return({
    'world_marketplace': {zone:'marketplace',type:'entry'},
    'world_treasury':    {zone:'treasury',   type:'entry'},
    'marketplace_exit':  {zone:'marketplace',type:'exit'},
    'treasury_exit':     {zone:'treasury',   type:'exit'},
  })[key]||null;
}

function handleQueueDoor(key,door){
  const qi=queueInfoFromKey(key);if(!qi)return;
  if(!G.queueState){
    joinQueue(qi.zone,qi.type);
  } else if(G.queueState.zone===qi.zone&&G.queueState.type===qi.type){
    if(G.queueState.served){
      // Served — pass through the gate
      // passingThrough:true tells the server not to refund ALCX yet —
      // it stays locked for the whole district visit; changeZone() returns it on exit.
      socket?.emit('queue_leave',{zone:qi.zone,queueType:qi.type,passingThrough:true});
      clearTimeout(G._queueServTimer);G._queueServExpiry=null;
      // Do NOT refund G.lockedAlcx here — ALCX stays locked until player leaves the district.
      G.queueState=null;
      updateQueuePanel();renderHUD();
      changeZone(door.to,door.sx,door.sy);
    }
    // else: still waiting — panel already visible, do nothing
  }
  // Different queue active: don't interfere
}

// ── In-game dialog helpers (replaces browser alert/confirm) ──────────────────
// Show a multi-page info dialog; onClose fires when the last page is dismissed.
export function showGameInfo(face,name,lines,onClose){
  G._pendingConfirm={_info:true,onYes:onClose||null,onNo:null};
  G.npcDialog={npc:{name,type:'guard',face},lineIdx:0,dialog:lines};
  G.paused=true; showNpcDialog();
}
// Show a Y/N confirm dialog; onYes fires on Y, onNo fires on N/Esc.
export function showGameConfirm(face,name,lines,onYes,onNo){
  G._pendingConfirm={_info:false,onYes:onYes||null,onNo:onNo||null};
  G.npcDialog={npc:{name,type:'guard',face},lineIdx:0,dialog:lines};
  G.paused=true; showNpcDialog();
}
// Dismiss the active confirm dialog (accept=true → onYes, false → onNo).
export function _dismissConfirm(accept){
  const pc=G._pendingConfirm;
  G._pendingConfirm=null; G.npcDialog=null; G.paused=false;
  document.getElementById('npc-dialog').style.display='none';
  const btns=document.getElementById('npc-confirm-btns');
  if(btns)btns.style.display='none';
  const cb=pc?(accept?pc.onYes:pc.onNo):null;
  if(cb)cb();
}

export function joinQueue(zone,type){
  if(G.queueState)return;
  const lockAmt=type==='entry'?Math.min(G.alcx,Math.max(5,Math.floor(G.alcx*0.20))):0;
  const zl=zone[0].toUpperCase()+zone.slice(1);
  // Remember which tile the player is standing on so a "No" answer prevents re-prompting
  const _declineTx=Math.floor(G.x/TS), _declineTy=Math.floor(G.y/TS);

  // Final step: commit the join
  function _doJoin(){
    G.alcx=Math.max(0,G.alcx-lockAmt);
    G.lockedAlcx=lockAmt;
    G.queueState={zone,type,ticket:null,served:false};
    socket?.emit('queue_join',{zone,queueType:type,locked:lockAmt});
    chatLog(`🎫 Joined ${zl} ${type} queue.${lockAmt>0?' ⚗'+lockAmt+' ALCX locked.':''} Roam freely — we'll notify you when your ticket is called!`, '#FFD700');
    updateQueuePanel();
  }

  // Called when player explicitly selects No — suppress re-prompting on same tile
  function _onDecline(){
    G._queueDeclinedTile={tx:_declineTx,ty:_declineTy};
  }

  // Step 2: confirm ALCX lock (or skip if no lock)
  function _confirmLock(){
    if(lockAmt>0){
      showGameConfirm(7,'Queue System',[
        `Join the ${zl} entry queue?`,
        `⚗ ${lockAmt} ALCX (20% of your balance) will be locked as a commitment signal.\nYou get it all back when you enter or leave the zone.`,
      ],_doJoin,_onDecline);
    } else { _doJoin(); }
  }

  // Step 1: show queue tutorial once, then confirm lock
  if(!G._shownQueueTip&&lockAmt>0){
    G._shownQueueTip=true;
    showGameInfo(7,'📖 Queue System',[
      'You take a ticket and wait your turn — just like a real rate-limited protocol. Everyone waits the same number of ticks. Whales can\'t skip ahead for free!',
      '20% of your ALCX is locked as a commitment signal.\nYou get it all back when you enter or leave the zone.',
      '🚶 You can roam freely while you wait! Farm, fight, or explore. You\'ll be notified when your ticket is called — then walk to the gate.',
      '⭐ Seniority builds while you\'re INSIDE the zone. The longer you stay, the more ALCX yield you earn each cycle. Exit resets it.',
      '⚡ Bid ALCX to jump the entry line — your bid splits among all other real waiters as a reward for their patience.',
    ],_confirmLock);
  } else { _confirmLock(); }
}

export function updateQueuePanel(){
  const panel=document.getElementById('queue-panel');if(!panel)return;
  if(!G.queueState){panel.style.display='none';return;}
  panel.style.display='block';
  const{zone,type,ticket,served}=G.queueState;
  const zl=zone[0].toUpperCase()+zone.slice(1);
  const isExit=type==='exit';
  // Helper: safe getElementById — never throws if element is missing
  const qEl=id=>document.getElementById(id);
  qEl('queue-header')&&(qEl('queue-header').textContent=
    `${zl} ${isExit?'EXIT':'ENTRY'} QUEUE${isExit?' (free in this demo)':''}`);
  qEl('queue-ticket-num')&&(qEl('queue-ticket-num').textContent=ticket?`🎫 #${ticket}`:'🎫 …');

  const sq=serverQueues[zone]?.[type];
  if(sq&&ticket){
    const ahead=sq.entries.filter(e=>e.ticket<ticket).length;
    qEl('queue-serving-line')&&(qEl('queue-serving-line').textContent=`Now serving: #${sq.serving||'—'}`);
    const tickMs=serverQueues[zone]?.tickMs||10000;
    const waitSec=ahead*tickMs/1000;
    const waitStr=waitSec>=60?`~${Math.round(waitSec/60)}m wait`:`~${Math.round(waitSec)}s wait`;
    qEl('queue-ahead-line')&&(qEl('queue-ahead-line').textContent=
      served?'✅ YOUR TURN!':(ahead===0?'You\'re next!':`${ahead} ahead of you (${waitStr})`));
    const listEl=qEl('queue-list');
    if(listEl)listEl.innerHTML=sq.entries.map(e=>{
      const isYou=e.ticket===ticket;
      const isDone=sq.serving>=e.ticket;
      const col=isYou?'#FFD700':isDone?'#44AA66':'#444';
      const mark=isYou?'▶ ':isDone?'✓ ':'  ';
      return`<div style="color:${col}">${mark}#${e.ticket} ${e.nickname}</div>`;
    }).join('')||'<div style="color:#333">—</div>';
  } else {
    // Offline / waiting for first server sync — show a non-confusing placeholder
    const offline=!socket||!socket.connected;
    qEl('queue-serving-line')&&(qEl('queue-serving-line').textContent=offline?'(offline mode — no live queue)':'Syncing…');
    qEl('queue-ahead-line')&&(qEl('queue-ahead-line').textContent=offline?'Queue position unavailable':'');
    if(qEl('queue-list'))qEl('queue-list').innerHTML=offline
      ?'<div style="color:#555;font-size:.7rem">Connect to a game server to see live queue data.</div>':'';
  }
  const lockEl=qEl('queue-locked-line');
  if(G.lockedAlcx>0){
    lockEl.textContent=`🔒 ${G.lockedAlcx} ⚗ ALCX locked`;
    lockEl.style.display='block';
  } else {
    lockEl.style.display='none';
  }
  // Seniority badge
  let senEl=document.getElementById('queue-seniority');
  if(!senEl){senEl=document.createElement('div');senEl.id='queue-seniority';senEl.style.cssText='font-size:.7rem;color:#9C27B0;margin-top:2px';panel.insertBefore(senEl,document.getElementById('queue-enter-btn'));}
  senEl.textContent=G.zoneSeniority>0?`⭐ Seniority: ${G.zoneSeniority} (yield ×${1+Math.floor(G.zoneSeniority/3)})`:'⭐ Seniority: 0 (stay inside to build)';
  senEl.title=G.zoneSeniority>0
    ?`Seniority ${G.zoneSeniority}: earned by staying inside the zone. Your ALCX yield multiplier is now ${1+Math.floor(G.zoneSeniority/3)}×. Exiting resets it — longer commitment = more yield.`
    :'Seniority builds while you are INSIDE the marketplace or treasury zone. Exit resets it to 0. Higher seniority = more ALCX yield per cycle.';
  // Auction / Donation bid row
  let aucEl=document.getElementById('queue-auction-row');
  if(!aucEl){
    aucEl=document.createElement('div');aucEl.id='queue-auction-row';
    aucEl.style.cssText='display:flex;gap:4px;align-items:center;margin-top:6px;font-size:.72rem';
    aucEl.innerHTML=`<span style="color:#FFD700">⚡</span><input id="queue-bid-amt" type="number" min="1" step="1" value="5" style="width:50px;background:#111;border:1px solid #5A3A80;color:#eee;padding:2px 4px;font-family:monospace;border-radius:3px"><button onclick="doAuctionBid()" style="padding:2px 8px;background:#1A1A00;border:1px solid #FFD700;color:#FFD700;cursor:pointer;border-radius:3px;font-family:monospace;font-size:.7rem">Bid ALCX to Skip</button>`;
    panel.insertBefore(aucEl,document.getElementById('queue-enter-btn'));
  }
  // Only show auction bid if waiting (not yet served) in entry queue
  aucEl.style.display=(!served&&type==='entry')?'flex':'none';

  // ── Expiry countdown (shows when served — 2 min window to reach the gate) ──
  let expEl=document.getElementById('queue-expiry-line');
  if(!expEl){
    expEl=document.createElement('div');expEl.id='queue-expiry-line';
    expEl.style.cssText='font-size:.72rem;color:#FF5722;margin-top:4px;font-weight:bold;display:none';
    panel.insertBefore(expEl,document.getElementById('queue-enter-btn'));
  }
  if(served&&G._queueServExpiry){
    const secsLeft=Math.max(0,Math.round((G._queueServExpiry-Date.now())/1000));
    expEl.textContent=`⏰ ${secsLeft}s to reach the gate!`;
    expEl.style.display='block';
    expEl.style.color=secsLeft<30?'#FF1744':'#FF5722';
  }else{expEl.style.display='none';}

  // ── Fast-exit button (exit queue only, while waiting) ──────────────────────
  let fastExitEl=document.getElementById('queue-fast-exit');
  if(!fastExitEl){
    fastExitEl=document.createElement('div');fastExitEl.id='queue-fast-exit';
    fastExitEl.style.cssText='margin-top:6px;display:none';
    panel.insertBefore(fastExitEl,document.getElementById('queue-enter-btn'));
  }
  if(type==='exit'&&!served){
    // Fee scales with position in queue: farther back = more to pay (patience premium)
    const sq=serverQueues[zone]?.exit;
    const ahead=sq&&ticket?sq.entries.filter(e=>e.ticket<ticket).length:0;
    const posFee=Math.max(1,Math.ceil(ahead*2.5)); // 2.5 ALCX per position ahead
    const fee=posFee;
    fastExitEl.innerHTML=`<button onclick="doFastExit(${fee})" style="width:100%;padding:3px 0;background:#1A0A00;border:1px solid #FF8C00;color:#FF8C00;cursor:pointer;border-radius:3px;font-family:monospace;font-size:.7rem">⚡ Fast Exit (${fee} ALCX)</button><div style="font-size:.6rem;color:#555;text-align:center;margin-top:2px">Skip ${ahead} position${ahead!==1?'s':''} — fee to treasury</div>`;
    fastExitEl.style.display='block';
  }else{fastExitEl.style.display='none';}

  const enterBtn=document.getElementById('queue-enter-btn');
  enterBtn.style.display=served?'block':'none';
  enterBtn.textContent=type==='entry'?'▶ ENTER NOW':'▶ LEAVE NOW';
}

export function changeZone(zone,sx,sy){
  // Leaving the veQueue district → return queue-locked ALCX client-side
  // (server mirrors this in the zone_change handler)
  const VEQUEUE_DISTRICT=['marketplace','treasury','gov_chamber'];
  if(VEQUEUE_DISTRICT.includes(G.zone)&&!VEQUEUE_DISTRICT.includes(zone)&&G.lockedAlcx>0){
    const _vqRefund=Math.max(0,parseFloat((G.lockedAlcx-G.alcxVoteLock).toFixed(4)));
    if(_vqRefund>0){
      G.alcx=parseFloat((G.alcx+_vqRefund).toFixed(4));
      G.lockedAlcx=G.alcxVoteLock;
      chatLog(`⚗ ${_vqRefund} ALCX returned — you've left the veQueue district.`,'#FFD700');
      renderHUD();
    }
  }
  // alert()/confirm() dialogs swallow keyup events — clear stale key state
  // so the character doesn't walk on its own after zone transitions
  Object.keys(KEYS).forEach(k=>delete KEYS[k]);
  SFX.door();
  G.zone=zone;G.x=(sx+0.5)*TS;G.y=(sy+0.5)*TS;
  // Snap camera to player immediately so there's no jarring pan from (0,0)
  const _zd=ZONES[zone];
  const _maxCX=_zd?Math.max(0,_zd.w*TS-W):0;
  const _maxCY=_zd?Math.max(0,_zd.h*TS-H):0;
  G.camX=Math.max(0,Math.min(_maxCX,G.x-W/2));
  G.camY=Math.max(0,Math.min(_maxCY,G.y-H/2));
  G._prevX=G.x;G._prevY=G.y;G._camVx=0;G._camVy=0;
  // Reset seniority when leaving economic zones (gov_chamber is part of the inner district)
  if(G.zone!=='marketplace'&&G.zone!=='treasury'&&G.zone!=='gov_chamber')G.zoneSeniority=0;
  musPlay(zone);
  _mmCanvas=null;G.showMinimap=false;
  {
    let zoneName=ZONES[G.zone]?.name||G.zone;
    if(G.zone==='world'){
      const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
      zoneName=(tx>=TOWN_OX&&tx<TOWN_OX+MAP_W&&ty>=TOWN_OY&&ty<TOWN_OY+MAP_H)?'Town Square':'Wilderness';
    }
    document.getElementById('hud-zone').textContent=zoneName;
  }
  // emit to server
  socket?.emit('zone_change',{zone,x:G.x,y:G.y});
  renderTileLayer();
}

// ── Transaction confirmation toast ───────────────────────────────────────────
// type: 'buy' (green) | 'sell' (gold) | 'drop' (red) | 'use' (blue)
let _txToastTimer=null;
export function showTxToast(msg,type='buy'){
  const el=document.getElementById('tx-toast');
  if(!el)return;
  if(_txToastTimer){clearTimeout(_txToastTimer);_txToastTimer=null;}
  el.className='';         // clear old type classes
  el.textContent=msg;
  void el.offsetWidth;     // force reflow so animation restarts
  el.classList.add('show');
  if(type==='sell') el.classList.add('tx-sell');
  else if(type==='drop') el.classList.add('tx-drop');
  else if(type==='use')  el.classList.add('tx-use');
  _txToastTimer=setTimeout(()=>{el.classList.remove('show','tx-sell','tx-drop','tx-use');},2200);
}

export function chatLog(msg,color='#ccc'){
  const log=document.getElementById('chat-log');
  const div=document.createElement('div');div.className='msg';
  div.innerHTML=`<span style="color:${color}">${msg}</span>`;
  log.appendChild(div);log.scrollTop=log.scrollHeight;
  while(log.children.length>50)log.removeChild(log.firstChild);
}

document.getElementById('chat-input').addEventListener('keydown',e=>{
  if(e.key==='Enter'){
    const val=e.target.value.trim();
    if(val){
      // /g <text> — leave graffiti at current tile
      if(val.startsWith('/g ')){
        const txt=val.slice(3).trim();
        if(txt&&socket){socket.emit('graffiti_add',{text:txt});chatLog(`📝 Graffiti left at this spot.`,'#B080FF');}
      } else {
        socket?.emit('chat',{text:val});
        chatLog(`[${G.nickname}] ${val}`,'#FFD700');
      }
    }
    e.target.value='';e.target.blur();e.target.style.display='none';
    e.preventDefault();
  }
});

// ── TITLE SCREEN ANIMATION ────────────────────────────────────────────────────
export function animateTitle(){
  const cv=document.getElementById('title-canvas');
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  const ctx=cv.getContext('2d');
  const stars=Array.from({length:200},()=>({
    x:Math.random()*cv.width,y:Math.random()*cv.height,
    r:Math.random()*1.5+0.5,spd:Math.random()*0.4+0.1,br:Math.random()
  }));
  let t=0;
  function frame(){
    ctx.fillStyle='#00000088';ctx.fillRect(0,0,cv.width,cv.height);
    stars.forEach(s=>{
      s.br+=0.02;
      ctx.fillStyle=`rgba(255,255,255,${0.4+Math.sin(s.br)*0.4})`;
      ctx.fillRect(s.x,s.y,s.r*2,s.r*2);
      s.y+=s.spd;if(s.y>cv.height){s.y=0;s.x=Math.random()*cv.width;}
    });
    // shooting stars occasionally
    if(Math.random()<0.003){
      const sx=Math.random()*cv.width,sy=Math.random()*cv.height*0.5;
      ctx.strokeStyle='rgba(255,255,200,0.6)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+80,sy+20);ctx.stroke();
    }
    t++;requestAnimationFrame(frame);
  }
  frame();
}

// ── CHARACTER CREATION ────────────────────────────────────────────────────────
export function buildCreateScreen(){
  const statNames=['str','vit','agi','end','lck'];
  const statLabels={str:'STR  (Attack)',vit:'VIT  (Max HP)',agi:'AGI  (Speed)',end:'END  (Defense)',lck:'LCK  (Drop)'};
  const BASE_PTS=10;
  // floor() returns the class-locked minimums for current class
  function floor(){return CLASSES[G.class_||'warrior'].classFloor||{};}
  // build fresh alloc seeded from class floor
  function freshAlloc(){
    const f=floor();
    return {str:f.str||0,vit:f.vit||0,agi:f.agi||0,end:f.end||0,lck:f.lck||0};
  }
  let alloc=freshAlloc();

  // ── Preview canvas — init FIRST so updatePreview can reference it ──
  const previewCv=document.getElementById('preview-canvas');
  const previewCtx=previewCv.getContext('2d');
  function updatePreview(){
    previewCtx.fillStyle='#0a0a1a';previewCtx.fillRect(0,0,120,160);
    previewCtx.fillStyle='#1a1a2a';previewCtx.fillRect(0,110,120,50);
    previewCtx.fillStyle='#222234';previewCtx.fillRect(0,110,120,3);
    const scale=2.5;
    previewCtx.save();
    previewCtx.scale(scale,scale);
    drawPlayerSprite(previewCtx,60/scale-12,40/scale,2,G.color,0,false,false,G.species,G.hairColor,G.accessory,G.gender,G.skinTone,G.class_);
    previewCtx.restore();
    const sp2=SPECIES[G.species||'human'];const cl=CLASSES[G.class_||'warrior'];
    const finalHp=sp2.baseHp+Math.floor((alloc.vit-2)*0.5);
    document.getElementById('preview-stats').innerHTML=
      `<b style="color:#FFD700">${document.getElementById('inp-name').value||'Hero'}</b><br>`+
      `${sp2.label} ${cl.label}<br>`+
      `♥ ${Math.max(2,finalHp)}  ⚔ ${alloc.str}<br>`+
      `${cl.startWeapon.name}`;
  }

  function ptsUsed(){return Object.values(alloc).reduce((a,b)=>a+b,0);}
  function ptsLeft(){return BASE_PTS-ptsUsed();}
  function caps(){return SPECIES[G.species||'human'].statCaps;}

  // ── Name input ──
  document.getElementById('inp-name').value=G.nickname||'Hero';

  // ── Gender picker ──
  const gp=document.getElementById('gender-picker');
  gp.innerHTML='';
  [{key:'male',icon:'♂',label:'Male'},{key:'female',icon:'♀',label:'Female'}].forEach(({key,icon,label})=>{
    const b=document.createElement('button');
    b.className='species-btn'+(G.gender===key?' selected':'');
    b.style.fontSize='.75rem';b.style.padding='4px 12px';
    b.textContent=`${icon} ${label}`;
    b.addEventListener('click',()=>{
      document.querySelectorAll('#gender-picker button').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');G.gender=key;
      updatePreview();
    });
    gp.appendChild(b);
  });

  // ── Skin tone picker ──
  const skp=document.getElementById('skin-picker');
  skp.innerHTML='';
  const SKIN_HEX=['#F2D2B2','#DAB082','#C08C5F','#9E693E','#743F26','#4A2A14'];
  SKIN_TONES.forEach((st,i)=>{
    const b=document.createElement('div');
    b.className='color-btn'+(i===G.skinTone?' selected':'');
    b.style.background=SKIN_HEX[i];
    b.style.border='2px solid '+(i===G.skinTone?'#FFD700':'#333');
    b.title=`Skin ${st.label}`;
    b.addEventListener('click',()=>{
      document.querySelectorAll('#skin-picker .color-btn').forEach(x=>x.style.border='2px solid #333');
      b.style.border='2px solid #FFD700';G.skinTone=i;updatePreview();
    });
    skp.appendChild(b);
  });

  // ── Species picker ──
  const sp=document.getElementById('species-picker');
  Object.entries(SPECIES).forEach(([key,s])=>{
    const b=document.createElement('button');
    b.className='species-btn'+(key===G.species?' selected':'');
    b.textContent=s.label;
    b.addEventListener('click',()=>{
      document.querySelectorAll('.species-btn').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');G.species=key;
      document.getElementById('species-desc').textContent=`♥×${s.baseHp}  ${s.desc}`;
      // clamp alloc to new caps
      Object.keys(alloc).forEach(k=>{alloc[k]=Math.min(alloc[k],caps()[k]);});
      rebuildStats();updatePreview();
    });
    sp.appendChild(b);
  });
  const curSp=SPECIES[G.species]||SPECIES.human;
  document.getElementById('species-desc').textContent=`♥×${curSp.baseHp}  ${curSp.desc}`;

  // ── Class picker ──
  const cp2=document.getElementById('class-picker');
  Object.entries(CLASSES).forEach(([key,c])=>{
    const b=document.createElement('button');
    b.className='class-btn'+(key===G.class_?' selected':'');
    b.textContent=`${c.icon} ${c.label}`;
    b.addEventListener('click',()=>{
      document.querySelectorAll('.class-btn').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');G.class_=key;
      document.getElementById('class-desc').textContent=c.desc;
      // reset alloc to new class floor, clamp to species caps
      alloc=freshAlloc();
      Object.keys(alloc).forEach(k=>{alloc[k]=Math.min(alloc[k],caps()[k]);});
      rebuildStats();updatePreview();
    });
    cp2.appendChild(b);
  });
  document.getElementById('class-desc').textContent=(CLASSES[G.class_]||CLASSES.warrior).desc;

  // ── Armor color picker ──
  const cp=document.getElementById('color-picker');
  PLAYER_COLORS.forEach((c,i)=>{
    const b=document.createElement('div');
    b.className='color-btn'+(c===G.color?' selected':'');
    b.style.background=c;
    b.addEventListener('click',()=>{
      document.querySelectorAll('.color-btn').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');G.color=c;updatePreview();
    });
    cp.appendChild(b);
  });

  // ── Hair color picker ──
  const hp=document.getElementById('hair-picker');
  HAIR_COLORS.forEach((c,i)=>{
    const b=document.createElement('div');
    b.className='color-btn'+(c===G.hairColor?' selected':'');
    b.style.background=c;b.style.border='2px solid '+(c===G.hairColor?'#FFD700':'#333');
    b.addEventListener('click',()=>{
      document.querySelectorAll('#hair-picker .color-btn').forEach(x=>x.style.border='2px solid #333');
      b.style.border='2px solid #FFD700';G.hairColor=c;updatePreview();
    });
    hp.appendChild(b);
  });

  // ── Accessory picker ──
  const ACCESSORIES=[
    {key:null,   label:'None',    icon:'👤'},
    {key:'cape', label:'Cape',    icon:'🧣'},
    {key:'hat',  label:'Wiz Hat', icon:'🎩'},
    {key:'glasses',label:'Glasses',icon:'🕶️'},
  ];
  const ap=document.getElementById('accessory-picker');
  ap.innerHTML='';
  ACCESSORIES.forEach(({key,label,icon})=>{
    const b=document.createElement('button');
    b.className='species-btn'+(G.accessory===key?' selected':'');
    b.style.fontSize='.75rem';b.style.padding='3px 8px';
    b.textContent=`${icon} ${label}`;
    b.addEventListener('click',()=>{
      document.querySelectorAll('#accessory-picker button').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');G.accessory=key;updatePreview();
    });
    ap.appendChild(b);
  });

  // ── Stat allocation ──
  const sa=document.getElementById('stat-alloc');
  const MAX_PIPS=20; // full growth ceiling — species cap shows creation max, rest earned in-game
  function rebuildStats(){
    sa.innerHTML='';
    const remaining=ptsLeft();
    document.getElementById('pts-left').textContent=`(${remaining} pts left)`;
    const f=floor();
    statNames.forEach(s=>{
      const cap=caps()[s];
      const floorVal=f[s]||0;
      const row=document.createElement('div');row.className='stat-row';
      const lbl=document.createElement('div');lbl.className='stat-name';
      lbl.textContent=statLabels[s];lbl.style.width='110px';lbl.style.fontSize='.72rem';
      const bar=document.createElement('div');bar.className='stat-bar';
      for(let p=1;p<=MAX_PIPS;p++){
        const pip=document.createElement('div');
        const isLocked=p<=floorVal;          // 🟠 class identity — can't remove
        const isFilled=p<=alloc[s];          // 🟡 your free allocation
        const isCapped=p>cap;                // ⬛ beyond species cap (in-game growth)
        if(isLocked){
          pip.className='stat-pip class-lock'+(isCapped?' capped':'');
          pip.title=`${s.toUpperCase()} ${p}: locked by class`;
        } else if(isFilled){
          pip.className='stat-pip filled'+(isCapped?' capped':'');
          pip.title=`${s.toUpperCase()} ${p}: click to set`;
        } else {
          pip.className='stat-pip'+(isCapped?' capped':'');
          pip.title=isCapped?`${s.toUpperCase()} cap ${cap} — unlock more in-game`:`${s.toUpperCase()} ${p}: click to set`;
        }
        if(!isLocked&&!isCapped){
          pip.addEventListener('click',()=>{
            // clicking a pip sets alloc to that value; can't go below floor
            const target=Math.max(floorVal,p);
            const spend=target-alloc[s];
            if(spend>0&&ptsLeft()<spend)return;
            alloc[s]=target;rebuildStats();updatePreview();
          });
        }
        bar.appendChild(pip);
      }
      // ── [−] / [+] stepper buttons ──
      const btnSub=document.createElement('button');
      btnSub.textContent='−';
      const canSub=alloc[s]>floorVal;
      btnSub.style.cssText=`font-size:13px;width:22px;height:22px;line-height:1;border-radius:3px;border:none;margin-left:6px;cursor:${canSub?'pointer':'default'};background:${canSub?'#E53935':'#2a1a1a'};color:${canSub?'#fff':'#444'};`;
      if(canSub)btnSub.addEventListener('click',()=>{alloc[s]--;rebuildStats();updatePreview();});

      const btnAdd=document.createElement('button');
      btnAdd.textContent='+';
      const canAdd=ptsLeft()>0&&alloc[s]<cap;
      btnAdd.style.cssText=`font-size:13px;width:22px;height:22px;line-height:1;border-radius:3px;border:none;margin-left:3px;cursor:${canAdd?'pointer':'default'};background:${canAdd?'#4CAF50':'#1a2a1a'};color:${canAdd?'#fff':'#444'};`;
      if(canAdd)btnAdd.addEventListener('click',()=>{alloc[s]++;rebuildStats();updatePreview();});

      // labels: class floor lock + species cap
      const meta=document.createElement('span');
      meta.style.cssText='font-size:.62rem;margin-left:6px;white-space:nowrap;color:#555';
      meta.textContent=floorVal?`🔒${floorVal} cap${cap}`:`cap${cap}`;
      row.appendChild(lbl);row.appendChild(bar);row.appendChild(btnSub);row.appendChild(btnAdd);row.appendChild(meta);
      sa.appendChild(row);
    });
    updatePreview();
  }
  rebuildStats();

  // wire up name input and do initial render
  document.getElementById('inp-name').addEventListener('input',updatePreview);
  updatePreview();

  // ── Begin Quest ──
  document.getElementById('btn-create').addEventListener('click',()=>{
    G.nickname=document.getElementById('inp-name').value.trim()||'Hero';
    G.stats=Object.fromEntries(statNames.map(s=>[s,alloc[s]]));
    G.persist=document.getElementById('chk-persist').checked;
    const cl=CLASSES[G.class_||'warrior'];
    // apply species HP
    const sp2=SPECIES[G.species||'human'];
    G.maxHp=sp2.baseHp+Math.max(0,Math.floor((G.stats.vit-2)*0.5));
    G.hp=G.maxHp;
    G.maxMp=4+G.stats.lck;
    G.mp=G.maxMp;
    // give starting weapon
    G.inventory[0]=cl.startWeapon;
    if(cl.startShield)G.inventory[1]=cl.startShield;
    if(!G.persist)chatLog('⚠ Progress will not be saved between sessions.','#FF8C00');
    startGame();
    saveToServer();
    // Show the How to Play guide automatically for new characters
    setTimeout(()=>showHelp(0),400);
  });
}

// ── MAIN GAME LOOP ────────────────────────────────────────────────────────────
let lastTime=0;
export function gameLoop(ts){
  try{
  const dt=Math.min(32,ts-lastTime);lastTime=ts;
  if(!G.paused){
    G.tick++;
    // movement
    const spd=CFG.SPEED*(1+G.stats.agi*0.1)*(G.godMode?2:1);
    let dx=0,dy=0;
    if(KEYS['ArrowLeft']||KEYS['a'])dx=-spd;
    if(KEYS['ArrowRight']||KEYS['d'])dx=+spd;
    if(KEYS['ArrowUp']||KEYS['w'])dy=-spd;
    if(KEYS['ArrowDown']||KEYS['s'])dy=+spd;
    if(dx&&dy){dx*=0.707;dy*=0.707;}
    G.moving=dx!==0||dy!==0;
    if(G.moving)tryMove(dx,dy);
    if(G.moving){G.moveTimer++;G.frame=G.moveTimer;}
    else{G.moveTimer=0;}
    // ── Broadcast position to server (max 20Hz, delta-compressed) ────────────
    if(socket?.connected){
      const _now=Date.now();
      const _posChg=G.x!==G._lastEmitX||G.y!==G._lastEmitY||G.dir!==G._lastEmitDir||G.moving!==G._lastEmitMoving;
      if((_posChg&&_now-G._lastEmitTime>=50)||_now-G._lastEmitTime>=500){
        socket.emit('move',{x:G.x,y:G.y,dir:G.dir,frame:G.frame,moving:G.moving,zone:G.zone});
        G._lastEmitX=G.x;G._lastEmitY=G.y;G._lastEmitDir=G.dir;G._lastEmitMoving=G.moving;G._lastEmitTime=_now;
      }
    }
    // ── Interpolate other players toward their server-reported positions ──────
    for(const p of Object.values(others)){
      if(p.targetX!==undefined){
        p.x+=(p.targetX-p.x)*0.25;
        p.y+=(p.targetY-p.y)*0.25;
      }
    }
    checkDoorTrigger();
    checkEncounter();
    checkBossEncounter();
    checkSubZoneEncounter();
    checkSubZoneBoss();
    checkWaterEncounter();
    checkForestEncounter();
    updateCamera();
    // Update music: world zone switches between town/wilderness/forest/water tracks by position
    if(G.zone==='world'){
      const _tx=Math.floor(G.x/TS),_ty=Math.floor(G.y/TS);
      const _tile=WORLD_MAP[_ty]?.[_tx];
      let _track='wilderness';
      if(_tx>=TOWN_OX&&_tx<TOWN_OX+MAP_W&&_ty>=TOWN_OY&&_ty<TOWN_OY+MAP_H) _track='world';
      else if(_tile===T.WATER&&hasRaft()) _track='wilderness'; // water uses wilderness (aquatic feel)
      else if(_tile===T.TREE&&hasForestPass()) _track='forest';
      musPlay(_track);
    }
    // scroll tile layer when camera moves
    renderTileLayer();
    // render BG
    ctxBG.clearRect(0,0,W,H);
    drawBackground(ctxBG,G.zone,G.camX,G.camY,W,H,G.tick);
    // render sprites
    renderSpriteLayer(ctxSprites);
    // building name signs — rendered after sprites so they appear above NPCs
    if(G.zone==='world')renderBuildingSigns(ctxSprites);
    // foreground tile layer (z:4) — tree canopies, column capitals above player
    renderFgLayer(ctxFg);
    // ceiling layer (z:5) — interior zone ceiling art above everything
    renderCeiling(ctxCeiling,G.zone,W,H,G.tick);
    // HUD + minimap
    renderHUD();
    ctxUI.clearRect(0,0,W,H);
    renderMinimap(ctxUI);
    // Governance Hall / Governance Chamber: show treasury + live prices + rate panel
    if(G.zone==='governance'||G.zone==='gov_chamber')renderGovernancePanel(ctxUI);
    // ── ALCX yield: request server authorisation — server pre-updates pdb ──────
    // Seniority tick: every ~5s while physically inside an economic zone
    if((G.zone==='marketplace'||G.zone==='treasury'||G.zone==='gov_chamber')&&G.tick%300===0){
      G.zoneSeniority=(G.zoneSeniority||0)+1;
      socket?.emit('alcx_yield_request',{source:'zone'});
      updateQueuePanel();
    }
    // Queue patience yield: every ~10s while waiting in a queue
    if(G.queueState&&G.queueState.ticket&&!G.queueState.served&&G.tick%600===0){
      socket?.emit('alcx_yield_request',{source:'queue'});
    }
    // Bank debt repayment is handled entirely server-side (transmuter tick every 5 min).
    // The server pushes bank_positions_updated when debt changes; no client-side ticker needed.
    // ── Passive HP regen ────────────────────────────────────────────────────
    // Base: 1 HP per ~25 s at VIT 1 + full HP (≈ 1 500 ticks @ 60 fps).
    // VIT multiplier: +20% per point above 1 (VIT 5 → 1.8×, VIT 10 → 2.8×).
    // HP-ratio multiplier: 0.15 + 0.85*(hp/maxHp) — slows at low HP but
    // never reaches zero, so even a near-dead player slowly recovers.
    if(!G.battle&&G.hp>0&&G.hp<G.maxHp){
      const _vitMult=1+(G.stats.vit-1)*0.2;
      const _hpMult=0.15+0.85*(G.hp/G.maxHp);
      G._regenAcc=(G._regenAcc||0)+(1/1500)*_vitMult*_hpMult;
      if(G._regenAcc>=1){
        const _gained=Math.floor(G._regenAcc);
        G.hp=Math.min(G.maxHp,G.hp+_gained);
        G._regenAcc-=_gained;
      }
    }
    // persist
    if(G.tick%90===0&&G.mp<G.maxMp){G.mp=Math.min(G.maxMp,G.mp+1);}
    if(G.tick%300===0){if(G.persist)saveState(); saveToServer();}
  }
  // Battle screen renders while paused (transition phases handled by their own rAF)
  if(G.battle&&(G.battle.phase==='player_turn'||G.battle.phase==='enemy_turn')){
    if(G.battle.phase==='enemy_turn'){
      G.battle.animTimer--;
      if(G.battle.animTimer<=0)doEnemyTurn();
    }
    renderBattleScreen();
  }
  }catch(_e){
    const el=document.getElementById('_debug_err')||(() => {
      const d=document.createElement('div');
      d.id='_debug_err';
      d.style.cssText='position:fixed;top:36px;left:0;right:0;background:rgba(180,0,0,0.95);color:#fff;font:11px monospace;padding:6px 8px;z-index:99999;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow:auto;';
      document.body.appendChild(d);
      return d;
    })();
    el.textContent+=`[LOOP] ${_e.message}\n${_e.stack||''}\n`;
  }
  requestAnimationFrame(gameLoop);
}

// ── CANVAS SETUP ─────────────────────────────────────────────────────────────
export function setupCanvases(){
  const wrap=document.getElementById('game-wrap');
  const isMobile=document.body.classList.contains('touch');
  // On touch devices the HUD is a fixed overlay, so use full viewport height
  const aw=window.innerWidth,ah=isMobile?window.innerHeight:window.innerHeight-36;
  const scale=Math.min(aw/W,ah/H,2);
  const dw=Math.round(W*scale),dh=Math.round(H*scale);
  wrap.style.width=dw+'px';wrap.style.height=dh+'px';
  ['cv-bg','cv-tiles','cv-sprites','cv-fg','cv-ceiling','cv-ui'].forEach(id=>{
    const cv=document.getElementById(id);
    cv.width=W;cv.height=H;
    cv.style.width=dw+'px';cv.style.height=dh+'px';
  });
  cvTiles=document.getElementById('cv-tiles');
  ctxTiles=cvTiles.getContext('2d');
  ctxBG=document.getElementById('cv-bg').getContext('2d');
  ctxSprites=document.getElementById('cv-sprites').getContext('2d');
  ctxFg=document.getElementById('cv-fg').getContext('2d');
  ctxCeiling=document.getElementById('cv-ceiling').getContext('2d');
  ctxUI=document.getElementById('cv-ui').getContext('2d');
}

window.addEventListener('resize',setupCanvases);

// ── PERSISTENCE ───────────────────────────────────────────────────────────────
export function saveState(){
  if(!G.persist)return;
  const s={
    _accountId:G_accountId||'',  // tag state with account so cross-user bleed is detectable
    nickname:G.nickname,color:G.color,hairColor:G.hairColor,
    gender:G.gender,skinTone:G.skinTone,
    species:G.species,class_:G.class_,
    spacebucks:G.spacebucks,schmeckles:G.schmeckles,alUSD:G.alUSD,alETH:G.alETH,
    alcx:G.alcx,lockedAlcx:G.lockedAlcx,bankPositions:G.bankPositions,
    transmuterDeposits:G.transmuterDeposits,
    stats:G.stats,hp:G.hp,maxHp:G.maxHp,mp:G.mp,maxMp:G.maxMp,
    xp:G.xp,level:G.level,statPoints:G.statPoints,
    inventory:G.inventory,accessory:G.accessory,equippedArmor:G.equippedArmor,maxInvSlots:G.maxInvSlots,
    quests:G.quests,dungeonBossDefeated:G.dungeonBossDefeated,
    cavernBossDefeated:G.cavernBossDefeated,hideoutBossDefeated:G.hideoutBossDefeated,
    ruinsBossDefeated:G.ruinsBossDefeated,villageBossDefeated:G.villageBossDefeated,
    kills:G.kills||0,zoneSeniority:G.zoneSeniority||0,
  };
  localStorage.setItem('vq_state',JSON.stringify(s));
}
export function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem('vq_state'));
    if(!s)return;
    G.nickname=s.nickname||G.nickname;
    G.color=s.color||G.color;
    G.hairColor=s.hairColor||G.hairColor;
    if(s.gender==='male'||s.gender==='female')G.gender=s.gender;
    if(s.skinTone!=null&&s.skinTone>=0&&s.skinTone<=5)G.skinTone=s.skinTone;
    G.species=s.species||G.species;
    G.class_=s.class_||G.class_;
    if(s.spacebucks!=null) G.spacebucks=s.spacebucks;
    if(s.alUSD!=null) G.alUSD=s.alUSD; else if(s.schmeckles!=null) G.alUSD=s.schmeckles; // backward compat
    if(s.schmeckles!=null && s.alUSD!=null) G.schmeckles=s.schmeckles; // new meaning only if alUSD also present
    if(s.alETH!=null) G.alETH=s.alETH;
    if(s.alcx!=null) G.alcx=s.alcx;
    if(s.lockedAlcx!=null) G.lockedAlcx=s.lockedAlcx;
    if(s.bankPositions!=null) G.bankPositions=s.bankPositions;
    if(Array.isArray(s.transmuterDeposits)) G.transmuterDeposits=s.transmuterDeposits;
    G.stats=s.stats||G.stats;
    if(s.maxHp) G.maxHp=s.maxHp;
    G.hp=Math.min(s.hp||G.hp,G.maxHp);
    if(s.maxMp) G.maxMp=s.maxMp;
    if(s.mp!=null) G.mp=Math.min(s.mp,G.maxMp);
    G.xp=s.xp??0;
    G.level=s.level??1;
    G.statPoints=s.statPoints??0;
    if(Array.isArray(s.inventory)) G.inventory=s.inventory;
    if(s.accessory!==undefined) G.accessory=s.accessory;
    if(s.equippedArmor!==undefined) G.equippedArmor=s.equippedArmor;
    if(s.maxInvSlots!=null) G.maxInvSlots=s.maxInvSlots;
    while(G.inventory.length<G.maxInvSlots) G.inventory.push(null);
    if(s.quests) G.quests=s.quests;
    G.dungeonBossDefeated=s.dungeonBossDefeated||false;
    G.cavernBossDefeated=s.cavernBossDefeated||false;
    G.hideoutBossDefeated=s.hideoutBossDefeated||false;
    G.ruinsBossDefeated=s.ruinsBossDefeated||false;
    G.villageBossDefeated=s.villageBossDefeated||false;
    if(s.kills!=null) G.kills=s.kills;
    if(s.zoneSeniority!=null) G.zoneSeniority=s.zoneSeniority;
  }catch(e){}
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
export function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

export function startGame(){
  showScreen('screen-game');
  setupCanvases();
  buildTileCache();
  // Build 3 animated water frames (phase 0,1,2 shift ripples by 0,4,8 px)
  buildWaterFrames();
  musPlay(G.zone);
  renderTileLayer();
  {
    let zoneName=ZONES[G.zone]?.name||G.zone;
    if(G.zone==='world'){
      const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
      zoneName=(tx>=TOWN_OX&&tx<TOWN_OX+MAP_W&&ty>=TOWN_OY&&ty<TOWN_OY+MAP_H)?'Town Square':'Wilderness';
    }
    document.getElementById('hud-zone').textContent=zoneName;
  }
  joinGameServer();
  requestAnimationFrame(gameLoop);
}

document.getElementById('btn-start').addEventListener('click',()=>{
  loadState(); // pre-populate G from saved state before building create screen
  showScreen('screen-create');
  buildCreateScreen();
  musPlay('title'); // keep heroic music going through character creation
});

// ── Queue panel buttons ───────────────────────────────────────────────────────
document.getElementById('queue-enter-btn')?.addEventListener('click',()=>{
  if(!G.queueState?.served)return;
  const{zone,type}=G.queueState;
  // passingThrough:true — ALCX stays locked for district visit; returned on exit
  socket?.emit('queue_leave',{zone,queueType:type,passingThrough:true});
  clearTimeout(G._queueServTimer);G._queueServExpiry=null;
  // Do NOT refund G.lockedAlcx — changeZone() will return it when leaving the district.
  G.queueState=null;updateQueuePanel();renderHUD();
  const key=type==='entry'?`world_${zone}`:`${zone}_exit`;
  const door=ZONE_DOORS[key];
  if(door)changeZone(door.to,door.sx,door.sy);
});
document.getElementById('queue-leave-btn')?.addEventListener('click',()=>{
  if(!G.queueState)return;
  socket?.emit('queue_leave',{zone:G.queueState.zone,queueType:G.queueState.type});
  clearTimeout(G._queueServTimer);G._queueServExpiry=null;
  const _r3=Math.max(0,parseFloat((G.lockedAlcx-G.alcxVoteLock).toFixed(4)));
  G.alcx=parseFloat((G.alcx+_r3).toFixed(4));G.lockedAlcx=G.alcxVoteLock;
  G.queueState=null;updateQueuePanel();renderHUD();
  const _vl=G.alcxVoteLock;
  chatLog(`Left the queue.${_vl>0?` ⚗${_vl.toFixed(1)} ALCX stays locked until your governance vote settles.`:''}`,'#888');
});

// Live countdown ticker for served-ticket window
window._queueCountdownInterval=window._queueCountdownInterval||
  setInterval(()=>{if(G.queueState?.served)updateQueuePanel();},1000);

// ── In-game confirm touch buttons ────────────────────────────────────────────
document.getElementById('npc-btn-yes')?.addEventListener('click',()=>_dismissConfirm(true));
document.getElementById('npc-btn-no')?.addEventListener('click',()=>_dismissConfirm(false));
// Tap the dialog body (outside buttons) to advance info dialogs on mobile
document.getElementById('npc-dialog-inner')?.addEventListener('click',()=>{
  if(G.npcDialog&&!(G._pendingConfirm&&!G._pendingConfirm._info&&G.npcDialog.lineIdx>=G.npcDialog.dialog.length-1))
    advanceDialog();
});

// ── Battle canvas click / key handler ─────────────────────────────────────────
// ── Battle UI hit-testing (shared by click and touchstart) ───────────────────
function _handleBattleUIPoint(clientX,clientY,target){
  const bt=G.battle;if(!bt)return;
  if(bt.result){endBattle();return;}
  if(bt.phase!=='player_turn')return;
  const rect=target.getBoundingClientRect();
  const scale=W/rect.width;
  const mx=(clientX-rect.left)*scale;
  const my=(clientY-rect.top)*scale;
  for(const[action,btn] of Object.entries(BATTLE_BTNS)){
    if(mx>=btn.x&&mx<=btn.x+btn.w&&my>=btn.y&&my<=btn.y+btn.h){
      if(action.startsWith('ws_')){
        if(bt.phase!=='player_turn'||bt.result)return;
        const idx=parseInt(action.slice(3));
        const weapon=G.inventory[idx];
        if(weapon?.type==='weapon'){
          const old=G.inventory[0];
          G.inventory[0]=weapon;G.inventory[idx]=old;
          bt.log.push(`⚔ Swapped to ${G.inventory[0].name}!`);
          SFX.swing();
          bt.phase='enemy_turn';bt.animTimer=75;
        }
        return;
      }
      doBattleAction(action);return;
    }
  }
}

document.getElementById('cv-ui').addEventListener('click',e=>{
  _handleBattleUIPoint(e.clientX,e.clientY,e.target);
});

// Mobile: touchstart fires immediately (no 300 ms click delay) and we stop
// propagation so the game-wrap tap-to-move handler doesn't also fire.
document.getElementById('cv-ui').addEventListener('touchstart',e=>{
  if(!G.battle)return;
  e.preventDefault();    // block tap-to-move from triggering via event bubbling
  e.stopPropagation();   // don't let game-wrap's touchstart handler see this
  const t=e.changedTouches[0];
  _handleBattleUIPoint(t.clientX,t.clientY,e.target);
},{passive:false});

// Keyboard shortcuts during battle
window.addEventListener('keydown',e=>{
  const bt=G.battle;if(!bt)return;
  // If result screen is up: Space / Enter / E dismisses it
  if(bt.result){
    if(e.key===' '||e.key==='Enter'||e.key==='e'||e.key==='E'){
      endBattle();e.preventDefault();
    }
    return;
  }
  if(bt.phase!=='player_turn')return;
  if(e.key==='1')doBattleAction('attack');
  if(e.key==='2')doBattleAction('special');
  if(e.key==='3')doBattleAction('flee');
  // W or Tab cycles through weapons in the loadout (one-click equivalent)
  if(e.key==='w'||e.key==='W'||e.key==='Tab'){
    e.preventDefault();
    // Build ordered list: slot 0 first, then bag weapons in order
    const wpnSlots=[0,...G.inventory.slice(2).map((_,i)=>i+2)]
      .filter(i=>G.inventory[i]?.type==='weapon');
    if(wpnSlots.length<2)return; // nothing to swap to
    // Rotate: move equipped to tail, promote next weapon to slot 0
    const nextIdx=wpnSlots[1];
    const old=G.inventory[0];
    G.inventory[0]=G.inventory[nextIdx];
    G.inventory[nextIdx]=old;
    bt.log.push(`⚔ Swapped to ${G.inventory[0].name}!`);
    SFX.swing();
    bt.phase='enemy_turn';bt.animTimer=75;
  }
},{capture:false});

// ── LOGIN HANDLERS ────────────────────────────────────────────────────────────
const QUEUE_ZONES_CLIENT=['marketplace','treasury'];

function doLogin(){
  const username=document.getElementById('login-username').value.trim();
  const pin=document.getElementById('login-pin').value;
  document.getElementById('login-error').textContent='';
  if(!username||!pin){document.getElementById('login-error').textContent='Enter username and PIN.';return;}
  socket.emit('auth_login',{username,pin});
}
function doRegister(){
  const username=document.getElementById('login-username').value.trim();
  const pin=document.getElementById('login-pin').value;
  document.getElementById('login-error').textContent='';
  if(!username||!pin){document.getElementById('login-error').textContent='Enter username and PIN.';return;}
  socket.emit('auth_register',{username,pin});
}
document.getElementById('btn-login').addEventListener('click',doLogin);
document.getElementById('btn-register').addEventListener('click',doRegister);
document.getElementById('login-pin').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
document.getElementById('login-username').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('login-pin').focus();});
document.getElementById('btn-guest').addEventListener('click',()=>{
  showScreen('screen-title');
  musPlay('title');
});

// Init socket and show login screen on page load
initSocket();
animateTitle();
