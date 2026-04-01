// ── GAME STATE ────────────────────────────────────────────────────────────────
const G = {
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
  earmarkRate:0.005,    // current earmark rate (from server)
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
  maxInvSlots:8,        // 8–12; upgradeable at Expansion Vendor in marketplace
  quests:{},            // {questId: {progress, status:'active'|'ready'|'completed'}}
  kills:0,              // total enemy kills (tracked for Hall of Fame)
  graffiti:[],          // [{id, zone, tileX, tileY, author, text, ts}]
  hallOfFame:{topXP:[],topKills:[],topGold:[]},
  snowballEnemies:[],   // [{id, zone, tileX, tileY, baseType, name, killCount, loot}]
};

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

// Cache of server-broadcast queue states
const serverQueues={};

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

// ── INPUT ─────────────────────────────────────────────────────────────────────
const KEYS={};
const konamiSeq=[];
window.addEventListener('keydown',e=>{
  KEYS[e.key]=true;KEYS[e.keyCode]=true;
  // Konami
  konamiSeq.push(e.keyCode);
  if(konamiSeq.length>CFG.KONAMI.length)konamiSeq.shift();
  if(konamiSeq.join(',')==CFG.KONAMI.join(',')){
    G.godMode=!G.godMode;
    document.getElementById('godmode-badge').className=G.godMode?'on':'';
    chatLog('★ GOD MODE '+(G.godMode?'ON':'OFF'),'#FFD700');
  }
  // In-game confirm dialog: Y = accept, N = cancel
  if((e.key==='y'||e.key==='Y')&&G._pendingConfirm&&!G._pendingConfirm._info){
    _dismissConfirm(true); e.preventDefault(); return;
  }
  if((e.key==='n'||e.key==='N')&&G._pendingConfirm&&!G._pendingConfirm._info){
    _dismissConfirm(false); e.preventDefault(); return;
  }
  // NPC interaction
  if(e.key==='e'||e.key==='E'){
    if(G.npcDialog){ advanceDialog(); e.preventDefault(); }
    else if(!G.battle&&!G.paused){ tryInteract(); e.preventDefault(); }
  }
  // Space advances dialog when it's open
  if(e.key===' '&&G.npcDialog){ advanceDialog(); e.preventDefault(); }
  // chat
  if(e.key==='t'||e.key==='T'){
    if(!G.npcDialog){
      const ci=document.getElementById('chat-input');
      if(document.activeElement!==ci){ci.style.display='block';ci.focus();e.preventDefault();}
    }
  }
  if(e.key==='Escape'){
    if(G._pendingConfirm&&!G._pendingConfirm._info){ _dismissConfirm(false); e.preventDefault(); return; }
    if(document.getElementById('bank-ui').style.display!=='none'){ closeBank(); return; }
    handleEsc(); e.preventDefault();
  }
  if(e.key==='p'||e.key==='P') togglePause();
  if(e.key==='m'||e.key==='M'){G.showMinimap=!G.showMinimap;_mmCanvas=null;}
  if(e.key==='`'||e.key==='~') toggleMute();
});
window.addEventListener('keyup',e=>{delete KEYS[e.key];delete KEYS[e.keyCode];});

// Mobile
if(window.matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');

// ── handleEsc: shared logic for keyboard ESC and mobile ESC button ────────────
function handleEsc(){
  if(document.getElementById('bank-ui').style.display!=='none'){closeBank();return;}
  if(document.getElementById('transmuter-ui').style.display!=='none'){closeTransmuter();return;}
  if(document.getElementById('market-ui').style.display!=='none'){closeMarket();return;}
  if(document.getElementById('exchange-ui').style.display!=='none'){closeExchange();return;}
  if(document.getElementById('governance-ui')?.style.display!=='none'){closeGovernance();return;}
  if(G.shop){closeShop();return;}
  if(G.npcDialog){
    if(G._pendingInvUpgrade){G._pendingInvUpgrade=null;G.npcDialog=null;G.paused=false;document.getElementById('npc-dialog').style.display='none';chatLog('Upgrade declined.','#888');return;}
    const _qid=G.npcDialog.npc?.questId;
    if(_qid){const _qs=G.quests[_qid];if(!_qs||_qs.status==='active'){declineOrAbandonQuest();return;}}
    advanceDialog();return;
  }
  const ci=document.getElementById('chat-input');
  if(document.activeElement===ci){ci.blur();ci.style.display='none';}
  else togglePause();
}

// ACT button
document.getElementById('btn-act')?.addEventListener('touchstart',e=>{KEYS[' ']=true;e.preventDefault();},{passive:false});
document.getElementById('btn-act')?.addEventListener('touchend',e=>{delete KEYS[' '];e.preventDefault();},{passive:false});
// ESC button — full ESC logic
document.getElementById('btn-esc')?.addEventListener('touchstart',e=>{handleEsc();e.preventDefault();},{passive:false});
// MAP button
document.getElementById('btn-map')?.addEventListener('touchstart',e=>{
  G.showMinimap=!G.showMinimap;_mmCanvas=null;e.preventDefault();
},{passive:false});
// MUTE button
document.getElementById('btn-mute-touch')?.addEventListener('touchstart',e=>{
  toggleMute();
  const el=document.getElementById('btn-mute-touch');
  if(el)el.textContent=document.getElementById('hud-mute')?.textContent||'🔊';
  e.preventDefault();
},{passive:false});

// ── TAP-TO-MOVE: touch the game canvas to move toward that direction ───────────
// Character's position on-screen: (G.x - G.camX, G.y - G.camY)
// Touch direction relative to character → sets movement keys
const _MOVE_DEAD_ZONE = 28; // px, ignore touches this close to character center
const _moveKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
function _clearMoveKeys(){ _moveKeys.forEach(k=>delete KEYS[k]); }

function _applyTouchMove(clientX, clientY){
  // Only move if game is running and no UI is blocking
  if(G.paused||G.battle||G.npcDialog||G.shop) return;
  if(document.getElementById('bank-ui').style.display!=='none') return;
  if(document.getElementById('transmuter-ui').style.display!=='none') return;
  if(document.getElementById('market-ui').style.display!=='none') return;
  if(document.getElementById('exchange-ui').style.display!=='none') return;
  if(document.getElementById('governance-ui')?.style.display!=='none') return;
  // Character center on screen
  const wrap = document.getElementById('game-wrap');
  if(!wrap) return;
  const rect = wrap.getBoundingClientRect();
  const charSX = (G.x - G.camX) + rect.left;
  const charSY = (G.y - G.camY) + rect.top;
  const dx = clientX - charSX;
  const dy = clientY - charSY;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if(dist < _MOVE_DEAD_ZONE){ _clearMoveKeys(); return; }
  _clearMoveKeys();
  // Dominant axis determines direction (4-directional)
  if(Math.abs(dx) >= Math.abs(dy)){
    KEYS[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
  } else {
    KEYS[dy > 0 ? 'ArrowDown' : 'ArrowUp'] = true;
  }
}

(function setupTapMove(){
  const wrap = document.getElementById('game-wrap');
  if(!wrap) return;
  let _touching = false;
  wrap.addEventListener('touchstart', e=>{
    // Only handle touches directly on the canvas layers (not overlay buttons)
    const tgt = e.target;
    if(tgt.tagName !== 'CANVAS') return;
    _touching = true;
    _applyTouchMove(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, {passive:false});
  wrap.addEventListener('touchmove', e=>{
    if(!_touching) return;
    _applyTouchMove(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
  }, {passive:false});
  wrap.addEventListener('touchend', e=>{
    _touching = false;
    _clearMoveKeys();
    e.preventDefault();
  }, {passive:false});
  wrap.addEventListener('touchcancel', e=>{
    _touching = false;
    _clearMoveKeys();
  }, {passive:false});
})();

// ── COLLISION ─────────────────────────────────────────────────────────────────
function isSolid(zone,tx,ty){
  const z=ZONES[zone];if(!z)return true;
  if(tx<0||ty<0||tx>=z.w||ty>=z.h)return true;
  const tile=z.map[ty][tx];
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
    // Turn in the quest
    if(qdef.reward.alUSD)G.alUSD=parseFloat((G.alUSD+qdef.reward.alUSD).toFixed(2));
    if(qdef.reward.alETH)G.alETH=parseFloat((G.alETH+qdef.reward.alETH).toFixed(4));
    if(qdef.reward.alcx)G.alcx=parseFloat((G.alcx+qdef.reward.alcx).toFixed(4));
    G.xp+=qdef.reward.xp;
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
function declineOrAbandonQuest(){
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
function updateQuestProgress(enemyType){
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
function tryInteract(){
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
  G.npcDialog={npc:nearest,lineIdx:0,dialog:getQuestDialog(nearest)};
  G.paused=true;
  showNpcDialog();
}

function advanceDialog(){
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

function showNpcDialog(){
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
      } else{changeZone(door.to,door.sx,door.sy);}
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
      // Served — pass through
      socket?.emit('queue_leave',{zone:qi.zone,queueType:qi.type});
      G.alcx+=G.lockedAlcx;G.lockedAlcx=0;G.queueState=null;
      updateQueuePanel();
      changeZone(door.to,door.sx,door.sy);
    }
    // else: still waiting — panel already visible, do nothing
  }
  // Different queue active: don't interfere
}

// ── In-game dialog helpers (replaces browser alert/confirm) ──────────────────
// Show a multi-page info dialog; onClose fires when the last page is dismissed.
function showGameInfo(face,name,lines,onClose){
  G._pendingConfirm={_info:true,onYes:onClose||null,onNo:null};
  G.npcDialog={npc:{name,type:'guard',face},lineIdx:0,dialog:lines};
  G.paused=true; showNpcDialog();
}
// Show a Y/N confirm dialog; onYes fires on Y, onNo fires on N/Esc.
function showGameConfirm(face,name,lines,onYes,onNo){
  G._pendingConfirm={_info:false,onYes:onYes||null,onNo:onNo||null};
  G.npcDialog={npc:{name,type:'guard',face},lineIdx:0,dialog:lines};
  G.paused=true; showNpcDialog();
}
// Dismiss the active confirm dialog (accept=true → onYes, false → onNo).
function _dismissConfirm(accept){
  const pc=G._pendingConfirm;
  G._pendingConfirm=null; G.npcDialog=null; G.paused=false;
  document.getElementById('npc-dialog').style.display='none';
  const btns=document.getElementById('npc-confirm-btns');
  if(btns)btns.style.display='none';
  const cb=pc?(accept?pc.onYes:pc.onNo):null;
  if(cb)cb();
}

function joinQueue(zone,type){
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
    chatLog(`🎫 Joined ${zl} ${type} queue.${lockAmt>0?' ⚗'+lockAmt+' ALCX locked.':''}`, '#FFD700');
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
      'You take a ticket and wait your turn — just like a real rate-limited protocol.',
      '20% of your ALCX is locked as a commitment signal.\nYou get it all back when you enter or leave.',
      'Build Seniority (⭐) by staying in the zone to earn bonus ALCX drip each cycle.',
      'Bid ALCX to jump the line — your bid amount splits among the other waiters.',
    ],_confirmLock);
  } else { _confirmLock(); }
}

function updateQueuePanel(){
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
  senEl.textContent=G.zoneSeniority>0?`⭐ Seniority: ${G.zoneSeniority} (drip ×${1+Math.floor(G.zoneSeniority/3)})`:'';
  senEl.title=G.zoneSeniority>0
    ?`Seniority ${G.zoneSeniority}: +1 every 5 min inside this zone. Your ALCX drip multiplier is now ${1+Math.floor(G.zoneSeniority/3)}×. Longer commitment = more yield.`
    :'Stay in this zone to build seniority and earn a bonus ALCX drip multiplier.';
  // Auction / Donation bid row
  let aucEl=document.getElementById('queue-auction-row');
  if(!aucEl){
    aucEl=document.createElement('div');aucEl.id='queue-auction-row';
    aucEl.style.cssText='display:flex;gap:4px;align-items:center;margin-top:6px;font-size:.72rem';
    aucEl.innerHTML=`<span style="color:#FFD700">⚡</span><input id="queue-bid-amt" type="number" min="1" step="1" value="5" style="width:50px;background:#111;border:1px solid #5A3A80;color:#eee;padding:2px 4px;font-family:monospace;border-radius:3px"><button onclick="doAuctionBid()" style="padding:2px 8px;background:#1A1A00;border:1px solid #FFD700;color:#FFD700;cursor:pointer;border-radius:3px;font-family:monospace;font-size:.7rem">Bid ALCX to Skip</button>`;
    panel.insertBefore(aucEl,document.getElementById('queue-enter-btn'));
  }
  // Only show if waiting (not yet served)
  aucEl.style.display=(!served)?'flex':'none';
  const enterBtn=document.getElementById('queue-enter-btn');
  enterBtn.style.display=served?'block':'none';
  enterBtn.textContent=type==='entry'?'▶ ENTER NOW':'▶ LEAVE NOW';
}

function changeZone(zone,sx,sy){
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
  // Reset seniority when leaving economic zones
  if(G.zone!=='marketplace'&&G.zone!=='treasury')G.zoneSeniority=0;
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

// ── BATTLE SYSTEM ─────────────────────────────────────────────────────────────

// ── Combat scaling ─────────────────────────────────────────────────────────────
// Player "power level" = average stat value + half weapon damage.
// Enemies scale to this so fights are always proportionate to your build.
function playerPowerLevel(){
  const s=G.stats;
  const avg=(s.str+s.vit+s.agi+s.end+s.lck)/5; // 2.0 at start; rises as you invest points
  const wdmg=G.inventory[0]?.dmg||2;
  return avg+wdmg*0.5; // ~4.0 for a fresh warrior with Iron Sword
}

// Build a scaled enemy: HP / ATK / DEF are calculated from player power.
// Each enemy type has a difficulty multiplier (<1 = easier, >1 = harder).
// Depth below the river adds a small bonus (deeper = slightly tougher).
function makeScaledEnemy(key,depth){
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
function xpForLevel(l){ return Math.floor(100*Math.pow(1.5,l-1)); }

// Call after adding XP — handles multi-level-ups in one call.
function checkLevelUp(){
  while(G.xp>=xpForLevel(G.level)){
    G.xp-=xpForLevel(G.level);
    G.level++;
    G.statPoints+=3;
    G.maxHp++;
    G.hp=Math.min(G.maxHp,G.hp+2); // partial HP restore on level-up
    SFX.levelUp();
    chatLog(`★ LEVEL UP! You are now level ${G.level}! +3 stat points, +1 max HP`,'#FFD700');
    if(G.paused)renderInventoryScreen(); // refresh stat panel if open
  }
}

// Spend one stat point into the given stat key.
function spendStat(st){
  if(G.statPoints<=0)return;
  G.stats[st]++;
  G.statPoints--;
  if(st==='vit'){G.maxHp++;G.hp=Math.min(G.maxHp,G.hp+1);}
  renderInventoryScreen();
}

// Safe ring defined by four rivers. Depth = tiles outside the ring.
function worldDangerDepth(){
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  // Inside the ring (between all 4 rivers) → depth 0
  if(tx>52&&tx<165&&ty>24&&ty<100)return 0;
  const dx=Math.max(0,52-tx,tx-164);
  const dy=Math.max(0,24-ty,ty-99);
  return dx+dy;
}

function checkEncounter(){
  if(G.battle)return;
  if(G.zone!=='world')return;
  if(!G.moving)return;
  if(G.tick%50!==0)return;
  const depth=worldDangerDepth();
  if(depth<8)return;             // safe zone
  let encounterRate=0.22;
  if(G.worldEvent?.type==='dark_storm')encounterRate=0.44;
  if(G.worldEvent?.type==='monster_swarm')encounterRate=0.66;
  if(Math.random()>encounterRate)return;
  let key;
  if(depth<20)      key=Math.random()<0.55?'wolf':'goblin';
  else if(depth<40) key=['wolf','skeleton','goblin'][Math.floor(Math.random()*3)];
  else              key=Math.random()<0.35?'darkKnight':'skeleton';
  triggerBattle(key,depth);
}

function checkBossEncounter(){
  if(G.battle||G.zone!=='dungeon'||G.dungeonBossDefeated)return;
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  if(ty>=26&&tx>=23&&tx<=47){
    chatLog('★ The air grows cold... something ancient stirs!','#AA00FF');
    triggerBattle('lich',999);
  }
}

// Sub-zone random encounters — each zone has its own encounter table
const SUBZONE_ENCOUNTERS = {
  cavern:  {pool:['iceTroll','iceTroll','wolf'],    rate:0.20, depth:25},
  hideout: {pool:['bandit','bandit','bandit','wolf'],rate:0.22, depth:20},
  ruins:   {pool:['specter','specter','skeleton'],  rate:0.20, depth:28},
  village: {pool:['ruinGuardian','skeleton','wolf'],rate:0.18, depth:30},
};
// Boss-like zone bosses (one per zone, flagged on G)
const SUBZONE_BOSSES = {
  cavern:  {flag:'cavernBossDefeated',  enemy:'iceTroll',  area:{tx0:3,ty0:1,tx1:19,ty1:4}},
  hideout: {flag:'hideoutBossDefeated', enemy:'bandit',    area:{tx0:3,ty0:1,tx1:19,ty1:4}},
  ruins:   {flag:'ruinsBossDefeated',   enemy:'ruinGuardian',area:{tx0:7,ty0:5,tx1:16,ty1:11}},
  village: {flag:'villageBossDefeated', enemy:'ruinGuardian',area:{tx0:6,ty0:7,tx1:15,ty1:12}},
};

function checkSubZoneEncounter(){
  if(G.battle)return;
  if(!G.moving)return;
  if(G.tick%55!==0)return;
  const enc=SUBZONE_ENCOUNTERS[G.zone];
  if(!enc)return;
  if(Math.random()>enc.rate)return;
  const key=enc.pool[Math.floor(Math.random()*enc.pool.length)];
  triggerBattle(key,enc.depth);
}

function checkSubZoneBoss(){
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

function triggerBattle(key,depth=0){
  const tmpl=ENEMIES[key];if(!tmpl)return;
  // Snapshot all rendered layers into _snapCanvas
  _snapCtx.clearRect(0,0,W,H);
  ['cv-bg','cv-tiles','cv-sprites'].forEach(id=>{
    const cv=document.getElementById(id);if(cv)_snapCtx.drawImage(cv,0,0);
  });
  G.battle={
    enemy:makeScaledEnemy(key,depth),
    phase:'transition_in',
    animTimer:0,
    hitShake:0,
    playerHitShake:0,
    log:[tmpl.msg,'What will you do?'],
    result:null,
    xpGained:0,spacebucksGained:0,schmecklesGained:0,
    savedX:G.x,savedY:G.y,
  };
  G.paused=true;
  document.getElementById('cv-ui').style.pointerEvents='auto';
  SFX.battleStart();
  runPixelTransition('in',()=>{G.battle.phase='player_turn';});
}

function triggerSnowballBattle(se){
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
  };
  G.paused=true;
  document.getElementById('cv-ui').style.pointerEvents='auto';
  SFX.battleStart();
  runPixelTransition('in',()=>{G.battle.phase='player_turn';});
}

function runPixelTransition(dir,onComplete){
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

function renderBattleScreen(){
  if(!G.battle)return;
  const bt=G.battle,e=bt.enemy;
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

  // ── Enemy sprite (shake if hit) ──
  const shX=bt.hitShake>0?(Math.random()*8-4)|0:0;
  if(bt.hitShake>0)bt.hitShake--;
  drawEnemySprite(ctxUI,e.type,shX+70,20);

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

  // ── Battle log ──
  ctxUI.fillStyle='#180E04';ctxUI.fillRect(4,pY+4,260,H-pY-8);
  ctxUI.strokeStyle='#5A3A10';ctxUI.lineWidth=1;ctxUI.strokeRect(4,pY+4,260,H-pY-8);
  ctxUI.font='11px monospace';
  bt.log.slice(-4).forEach((line,i,arr)=>{
    ctxUI.fillStyle=i===arr.length-1?'#FFD080':'#907050';
    ctxUI.fillText(line,10,pY+20+i*22,250);
  });

  // ── Action buttons ──
  const cls=G.class_||'warrior';
  const specialLabel={warrior:'⚔  POWER STRIKE',mage:'🔮  ARCANE BOLT',rogue:'🗡  TWIN DAGGERS',paladin:'✨  HOLY LIGHT'}[cls]||'✦  SPECIAL';
  const actions=[
    {id:'attack', label:'⚔  ATTACK',   bg:'#6B1818',hi:'#A02020'},
    {id:'special',label:specialLabel,  bg:'#183058',hi:'#2050A0'},
    {id:'potion', label:'🧪  POTION',  bg:'#183040',hi:'#204060'},
    {id:'flee',   label:'💨  FLEE',    bg:'#183018',hi:'#286028'},
  ];
  const active=bt.phase==='player_turn'&&!bt.result;
  const bX=274,bW=175,bH=30,bGap=9,bStartY=pY+14;
  actions.forEach((a,i)=>{
    const bx=bX,by=bStartY+i*(bH+bGap);
    BATTLE_BTNS[a.id]={x:bx,y:by,w:bW,h:bH};
    ctxUI.fillStyle='#000';ctxUI.fillRect(bx+2,by+2,bW,bH); // shadow
    ctxUI.fillStyle=active?a.bg:'#1E1E1E';ctxUI.fillRect(bx,by,bW,bH);
    ctxUI.fillStyle=active?a.hi:'#2E2E2E';ctxUI.fillRect(bx,by,bW,3);
    ctxUI.strokeStyle=active?'#FFD080':'#3A3A3A';ctxUI.lineWidth=1;ctxUI.strokeRect(bx,by,bW,bH);
    ctxUI.fillStyle=active?'#FFFFFF':'#555555';ctxUI.font='bold 12px monospace';
    ctxUI.fillText(a.label,bx+8,by+19);
  });

  // ── Player sprite (battle right side, facing left) ──
  {
    const btS=2.8; // battle sprite scale
    const bpX=Math.floor(W*0.72), bpY=Math.floor(H*0.56);
    // shake if player was just hit
    const phX=bt.playerHitShake>0?(Math.random()*6-3)|0:0;
    if(bt.playerHitShake>0)bt.playerHitShake--;
    ctxUI.save();
    ctxUI.translate(bpX+phX,bpY);
    ctxUI.scale(btS,btS);
    drawPlayerSprite(ctxUI,-12,-44,3,G.color,G.frame,false,G.godMode,G.species,G.hairColor,G.accessory);
    ctxUI.restore();
  }

  // ── Player info panel (bottom-right) ──
  const piX=460,piY=pY+10;
  ctxUI.fillStyle='#C0A050';ctxUI.font='bold 12px monospace';
  ctxUI.fillText(G.nickname,piX,piY+12);
  // HP bar
  ctxUI.fillStyle='#1A0000';ctxUI.fillRect(piX,piY+16,155,10);
  const pf=Math.max(0,G.hp/G.maxHp);
  ctxUI.fillStyle=pf>0.5?'#20A830':pf>0.25?'#C09000':'#C01020';
  ctxUI.fillRect(piX,piY+16,Math.floor(155*pf),10);
  ctxUI.strokeStyle='#604010';ctxUI.lineWidth=1;ctxUI.strokeRect(piX,piY+16,155,10);
  ctxUI.fillStyle='#AAAAAA';ctxUI.font='10px monospace';
  ctxUI.fillText(`HP ${G.hp}/${G.maxHp}`,piX+158,piY+25);
  // MP bar
  ctxUI.fillStyle='#001830';ctxUI.fillRect(piX,piY+29,155,8);
  const mf=Math.max(0,G.mp/G.maxMp);
  ctxUI.fillStyle='#4FC3F7';ctxUI.fillRect(piX,piY+29,Math.floor(155*mf),8);
  ctxUI.strokeStyle='#1A4060';ctxUI.lineWidth=1;ctxUI.strokeRect(piX,piY+29,155,8);
  ctxUI.fillStyle='#AAAAAA';ctxUI.font='10px monospace';
  ctxUI.fillText(`MP ${G.mp}/${G.maxMp}`,piX+158,piY+37);
  // Mini stats
  ctxUI.fillStyle='#7A5830';
  ctxUI.fillText(`STR${G.stats.str} AGI${G.stats.agi} LCK${G.stats.lck}`,piX,piY+50);
  // Turn indicator
  if(!bt.result){
    ctxUI.fillStyle=bt.phase==='player_turn'?'#FFD080':'#FF6060';
    ctxUI.font='11px monospace';
    ctxUI.fillText(bt.phase==='player_turn'?'▶ Your turn':`▶ ${e.name}...`,piX,piY+52);
  }

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
function spendMp(cost){
  if(G.mp<cost)return false;
  G.mp=Math.max(0,G.mp-cost);
  return true;
}

// ── Combat math ───────────────────────────────────────────────────────────────

function doBattleAction(action){
  const bt=G.battle;
  if(!bt||bt.phase!=='player_turn'||bt.result)return;

  if(action==='potion'){
    const slot=G.inventory.findIndex((s,i)=>i>=2&&s&&s.type==='potion');
    if(slot===-1){bt.log.push('No potions in inventory!');bt.phase='player_turn';SFX.error();return;}
    const pot=G.inventory[slot];
    const before=G.hp;
    if(pot.healFull)G.hp=G.maxHp;
    else G.hp=Math.min(G.maxHp,G.hp+(pot.heal||5));
    const gained=G.hp-before;
    G.inventory[slot]=null;
    bt.log.push(`Used ${pot.name}! +${gained} HP.`);
    SFX.potion();
    bt.phase='enemy_turn';bt.animTimer=75;
    return;
  }
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

  if(action==='attack'){
    const weapon=G.inventory[0];
    const baseDmg=(weapon?.dmg||2)+Math.floor(G.stats.str*0.9);
    const crit=Math.random()<G.stats.lck*0.045;
    const dmg=Math.max(1,Math.floor((baseDmg-bt.enemy.def*0.55)*(crit?1.6:1)+(Math.random()*2-1)));
    bt.enemy.currentHp-=dmg;bt.hitShake=10;
    SFX.swing();
    setTimeout(()=>SFX.hitEnemy(),120);
    bt.log.push(crit?`Critical hit! ${dmg} damage!`:`You attack for ${dmg} damage.`);
  }

  if(action==='special'){
    let dmg=0,healAmt=0;
    const cls=G.class_||'warrior';
    const mpCost=(cls==='rogue'||cls==='warrior')?1:2;
    if(!spendMp(mpCost)){
      bt.log.push(`Not enough MP! (need ${mpCost} ◆)`);
      SFX.error();
      bt.phase='player_turn';
      return;
    }
    if(cls==='mage'){
      dmg=Math.max(2,Math.floor(G.stats.lck*1.6+G.stats.agi*0.5+Math.random()*4));
      bt.enemy.currentHp-=dmg;bt.hitShake=10;
      SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
      bt.log.push(`Arcane Bolt! ${dmg} magic damage! (−${mpCost} MP)`);
    } else if(cls==='paladin'){
      healAmt=Math.max(1,Math.floor(G.stats.vit*0.6)+2);
      G.hp=Math.min(G.maxHp,G.hp+healAmt);
      SFX.potion();
      bt.log.push(`Holy Light! Restored ${healAmt} HP. (−${mpCost} MP)`);
    } else if(cls==='rogue'){
      dmg=Math.max(1,Math.floor(G.stats.agi*1.3)-Math.floor(bt.enemy.def*0.3));
      bt.enemy.currentHp-=dmg;bt.hitShake=10;
      SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
      bt.log.push(`Twin Daggers! ${dmg} piercing damage! (−${mpCost} MP)`);
    } else { // warrior
      const weapon=G.inventory[0];
      dmg=Math.max(1,Math.floor((weapon?.dmg||2)*1.9+G.stats.str*1.1-bt.enemy.def));
      bt.enemy.currentHp-=dmg;bt.hitShake=10;
      SFX.swing();setTimeout(()=>SFX.hitEnemy(),120);
      bt.log.push(`Power Strike! ${dmg} massive damage! (−${mpCost} MP)`);
    }
  }

  // Check enemy death
  if(bt.enemy.currentHp<=0){
    bt.enemy.currentHp=0;
    bt.log.push(`${bt.enemy.name} is defeated!`);
    SFX.enemyDeath();
    setTimeout(()=>SFX.victory(),500);
    bt.result='win';
    bt.xpGained=bt.enemy.xp;
    const drops = bt.enemy.drops || {};
    const lootMult=(G.worldEvent?.type==='treasure_surge')?1.5:1;
    const moonMult=(G.worldEvent?.type==='blood_moon')?2:1;
    bt.spacebucksGained = Math.round((drops.spacebucks || 0)*lootMult);
    bt.schmecklesGained = Math.round((drops.schmeckles || 0)*lootMult*moonMult);
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

    // ── Potion drop: 30% base + 3% per LCK above 1, capped at 60% ──────────
    const potionChance=Math.min(0.60,0.30+(G.stats.lck-1)*0.03);
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

function doEnemyTurn(){
  const bt=G.battle,e=bt.enemy;
  // AGI drives dodge chance (5% per point → 10% at agi=2, 25% at agi=5)
  const dodge=Math.random()<G.stats.agi*0.05;
  if(dodge){
    bt.log.push(`${e.name} attacks — you dodge!`);
  } else {
    // END provides natural armor (0.5 per point → 1 at end=2, 2.5 at end=5)
    const endArmor=Math.floor(G.stats.end*0.5);
    const dmg=Math.max(1,e.atk-endArmor+(((Math.random()*3)|0)-1));
    G.hp=Math.max(0,G.hp-dmg);
    bt.playerHitShake=8;
    SFX.hitPlayer();
    bt.log.push(`${e.name} hits you for ${dmg}!`);
    if(G.hp<=0){
      G.hp=0;
      bt.log.push('You have been defeated...');
      SFX.gameOver();
      bt.result='lose';
      // Wait for player input — do NOT auto-advance
      return;
    }
  }
  bt.phase='player_turn';
}

function endBattle(){
  const bt=G.battle;if(!bt)return;
  document.getElementById('cv-ui').style.pointerEvents='';
  // Snapshot the current battle screen for transition-out
  _snapCtx.clearRect(0,0,W,H);
  _snapCtx.fillStyle='#000';_snapCtx.fillRect(0,0,W,H);
  bt.phase='transition_out';
  if(bt.result==='lose'){
    const droppedItems=G.inventory.slice(2).filter(Boolean);
    G.inventory=[G.inventory[0],G.inventory[1],...new Array(6).fill(null)];
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
    });
  }
}

// ── Market ─────────────────────────────────────────────────────────────────────
let _marketTab='browse';
function openMarket(){G.paused=true;_marketTab='browse';renderMarketUI();document.getElementById('market-ui').style.display='block';}
function closeMarket(){G.paused=false;document.getElementById('market-ui').style.display='none';}
function openGovernance(){G.paused=true;renderGovernanceUI();document.getElementById('governance-ui').style.display='flex';}
function closeGovernance(){G.paused=false;document.getElementById('governance-ui').style.display='none';}
function renderGovernanceUI(){
  const el=document.getElementById('gov-content');if(!el)return;
  const rate=(G.earmarkRate||0.005)*100;
  const prop=G.govProposals.find(p=>p.passed===null);
  let html=`<div style="color:#FFD700;margin-bottom:8px">Current Earmark Rate: <b>${rate.toFixed(2)}%</b></div>`;
  html+=`<div style="color:#888;font-size:.72rem;margin-bottom:12px">% of debt redeemed every 5 min. Higher = faster repayment & more transmuter yield.</div>`;
  if(prop){
    const msLeft=Math.max(0,prop.endsAt-Date.now());
    const mLeft=Math.ceil(msLeft/60000);
    const total=prop.yesWeight+prop.noWeight||1;
    const yesPct=Math.round(prop.yesWeight/total*100);
    html+=`<div style="border:1px solid #5A3A80;border-radius:6px;padding:10px;margin-bottom:10px">`;
    html+=`<div style="color:#B080FF;font-weight:bold">📜 Active Proposal #${prop.id}</div>`;
    html+=`<div style="margin:4px 0">Proposer: ${prop.proposerName}</div>`;
    html+=`<div>New rate: <b>${(prop.value*100).toFixed(2)}%</b></div>`;
    html+=`<div style="color:#aaa;font-size:.72rem">${mLeft}m remaining</div>`;
    html+=`<div style="margin:6px 0;font-size:.75rem">`;
    html+=`<span style="color:#4CAF50">✅ YES ${prop.yesWeight.toFixed(1)} ALCX (${yesPct}%)</span> `;
    html+=`<span style="color:#FF4444">❌ NO ${prop.noWeight.toFixed(1)} ALCX (${100-yesPct}%)</span>`;
    html+=`</div>`;
    html+=`<div style="display:flex;gap:6px;margin-top:8px">`;
    html+=`<button onclick="govVote(${prop.id},'yes')" style="flex:1;padding:5px;background:#1A3A1A;border:1px solid #4CAF50;color:#4CAF50;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.75rem">✅ Vote YES</button>`;
    html+=`<button onclick="govVote(${prop.id},'no')" style="flex:1;padding:5px;background:#3A1A1A;border:1px solid #FF4444;color:#FF4444;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.75rem">❌ Vote NO</button>`;
    html+=`</div></div>`;
  }else{
    html+=`<div style="color:#888;margin-bottom:8px">No active proposal. Propose a new earmark rate:</div>`;
    html+=`<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">`;
    html+=`<span style="color:#aaa;font-size:.8rem">Rate (%):</span>`;
    html+=`<input id="gov-rate-inp" type="number" min="0.1" max="2.0" step="0.1" value="${rate.toFixed(2)}" style="width:70px;background:#111;border:1px solid #5A3A80;color:#eee;padding:3px;font-family:monospace;border-radius:3px">`;
    html+=`<button onclick="govPropose()" style="padding:4px 10px;background:#1A1030;border:1px solid #9C27B0;color:#B080FF;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.75rem">📜 Propose</button>`;
    html+=`</div>`;
    html+=`<div style="color:#666;font-size:.7rem">Requires ≥10 ALCX · You auto-vote YES · 5-minute voting window</div>`;
  }
  el.innerHTML=html;
}
function govPropose(){
  const v=parseFloat(document.getElementById('gov-rate-inp')?.value);
  if(isNaN(v)||v<0.1||v>2.0){chatLog('Rate must be 0.1–2.0%.','#FF4444');return;}
  socket?.emit('governance_propose',{rate:v/100});
}
function govVote(id,choice){socket?.emit('governance_vote',{proposalId:id,choice});}
function doAuctionBid(){
  if(!G.queueState||G.queueState.served)return;
  const amt=parseFloat(document.getElementById('queue-bid-amt')?.value||0);
  if(isNaN(amt)||amt<1){chatLog('Enter a valid ALCX bid (min 1).','#FF4444');return;}
  if(G.alcx<amt){chatLog(`Not enough ALCX! (have ${G.alcx})`, '#FF4444');SFX.error();return;}
  G.alcx=parseFloat((G.alcx-amt).toFixed(4));
  renderHUD();
  socket?.emit('queue_auction_bid',{zone:G.queueState.zone,queueType:G.queueState.type,alcx:amt});
  chatLog(`⚡ Bid ${amt} ALCX to jump the queue!`,'#FFD700');
}

function showHallOfFame(){
  const hof=G.hallOfFame||{};
  function fmtBoard(title,arr,unit){
    if(!arr||arr.length===0)return `${title}: (no entries yet)`;
    return title+'  '+arr.map((e,i)=>`#${i+1} ${e.name} ${e.value}${unit}`).join(' · ');
  }
  const dialog=[
    '🏆 HALL OF FAME — Victory Quest Champions 🏆',
    fmtBoard('⚔ Most XP',hof.topXP,' xp'),
    fmtBoard('💀 Top Killers',hof.topKills,' kills'),
    fmtBoard('🪙 Wealthiest',hof.topGold,' 🪙'),
    `Your stats — Level ${G.level} · ${G.xp} XP · ${G.kills} kills · ${G.spacebucks} 🪙`,
  ];
  G.npcDialog={npc:{name:'Hall of Fame',type:'guard',face:3},lineIdx:0,dialog};
  G.paused=true;showNpcDialog();
}
function marketTab(tab){
  _marketTab=tab;
  ['browse','list'].forEach(t=>{
    const btn=document.getElementById('market-tab-'+t);
    if(btn){btn.style.background=tab===t?'#1A1030':'#0A0A14';btn.style.color=tab===t?'#B080FF':'#888';}
  });
  renderMarketUI();
}
function renderMarketUI(){
  const el=document.getElementById('market-content');if(!el)return;
  if(_marketTab==='browse'){
    const listings=G.marketListings||[];
    if(!listings.length){el.innerHTML='<div style="color:#555;text-align:center;padding:16px">No listings yet. Be the first to sell something!</div>';return;}
    el.innerHTML=listings.map(l=>{
      const statStr=l.item.dmg?`+${l.item.dmg} DMG`:l.item.def?`+${l.item.def} DEF`:l.item.healFull?'Full HP':l.item.heal?`+${l.item.heal} HP`:'';
      const priceCol=l.currency==='alETH'?'#7B68EE':'#4CAF50';
      const canAfford=l.currency==='alETH'?G.alETH>=l.price:G.alUSD>=l.price;
      const isOwn=l.sellerId===G_accountId;
      const btn=isOwn
        ?`<button onclick="cancelListing(${l.id})" style="font-size:.65rem;padding:2px 6px;background:#3A1020;border:1px solid #7A2040;color:#FF8080;cursor:pointer;border-radius:3px;font-family:monospace">CANCEL</button>`
        :canAfford
          ?`<button onclick="buyListing(${l.id})" style="font-size:.65rem;padding:2px 6px;background:#1A3020;border:1px solid #2A7040;color:#80FF80;cursor:pointer;border-radius:3px;font-family:monospace">BUY</button>`
          :`<button disabled style="font-size:.65rem;padding:2px 6px;background:#1A1A1A;border:1px solid #333;color:#444;border-radius:3px;font-family:monospace">BUY</button>`;
      return`<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #1A1030">
        <span style="font-size:1.2rem">${l.item.icon||'?'}</span>
        <div style="flex:1"><div style="color:#EEE">${l.item.name}<span style="color:#666;font-size:.7rem;margin-left:4px">${statStr}</span></div>
        <div style="color:#555;font-size:.7rem">by ${l.sellerName}</div></div>
        <div style="text-align:right"><div style="color:${priceCol}">${l.currency==='alETH'?'⟠':'$'}${l.price}</div>${btn}</div>
      </div>`;
    }).join('');
  }else{
    const listable=G.inventory.map((item,i)=>({item,i})).filter(({item,i})=>i>=2&&item!==null);
    if(!listable.length){el.innerHTML='<div style="color:#555;text-align:center;padding:16px">No consumables in inventory to list.</div>';return;}
    const opts=listable.map(({item,i})=>`<option value="${i}">${item.icon||'?'} ${item.name}</option>`).join('');
    el.innerHTML=`<div style="display:flex;flex-direction:column;gap:8px">
      <div><label style="color:#888;font-size:.75rem">Item</label><br>
        <select id="mkt-item-sel" style="width:100%;background:#0D0D1A;border:1px solid #3A2050;color:#DDD;padding:4px;font-family:monospace;font-size:.75rem;border-radius:3px">${opts}</select></div>
      <div style="display:flex;gap:8px">
        <div style="flex:2"><label style="color:#888;font-size:.75rem">Price</label><br>
          <input id="mkt-price" type="number" min="0.01" step="0.01" placeholder="0.00"
            style="width:100%;background:#0D0D1A;border:1px solid #3A2050;color:#DDD;padding:4px;font-family:monospace;font-size:.75rem;border-radius:3px;box-sizing:border-box"></div>
        <div style="flex:1"><label style="color:#888;font-size:.75rem">Currency</label><br>
          <select id="mkt-currency" style="width:100%;background:#0D0D1A;border:1px solid #3A2050;color:#DDD;padding:4px;font-family:monospace;font-size:.75rem;border-radius:3px">
            <option value="alUSD">$ alUSD</option><option value="alETH">⟠ alETH</option>
          </select></div>
      </div>
      <div style="color:#9C7ABF;font-size:.72rem;padding:4px 0">⚠ 5% consignment fee — you receive 95% of sale price. Listings expire in 24h.</div>
      <button onclick="submitListItem()" style="padding:6px;background:#2A1040;border:1px solid #5A3A80;color:#B080FF;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.8rem">📋 LIST ITEM</button>
    </div>`;
  }
}
function submitListItem(){
  const slot=parseInt(document.getElementById('mkt-item-sel')?.value);
  const price=parseFloat(document.getElementById('mkt-price')?.value);
  const currency=document.getElementById('mkt-currency')?.value;
  if(isNaN(slot)||isNaN(price)||price<=0){chatLog('Enter a valid price.','#FF8800');return;}
  socket?.emit('market_list',{inventorySlot:slot,price,currency});
}
function buyListing(id){socket?.emit('market_buy',{listingId:id});}
function cancelListing(id){socket?.emit('market_cancel',{listingId:id});}

// ── BANK ──────────────────────────────────────────────────────────────────────
// ── Inventory Expansion ───────────────────────────────────────────────────────
const INV_UPGRADE_COSTS=[0,0,0,0,0,0,0,0,20,40,80,200]; // cost to upgrade to slots[i+1]
function openInvUpgrade(){
  G.paused=true;
  const cur=G.maxInvSlots;
  const maxPossible=12;
  if(cur>=maxPossible){
    chatLog('Your inventory is already at maximum capacity (12 slots)!','#FFD700');
    G.paused=false;return;
  }
  const cost=INV_UPGRADE_COSTS[cur]||999;
  const nd={npc:{name:'Expansion Vendor'},lineIdx:0,dialog:[
    `Current capacity: ${cur} slots.`,
    `Upgrade to ${cur+1} slots for ${cost} alUSD?`,
    `[ Accept: E/Space — costs ${cost} alUSD ]  [ Decline: Esc ]`,
  ]};
  // hijack NPC dialog for the upgrade prompt, but handle it ourselves
  G._pendingInvUpgrade={cost};
  G.npcDialog=nd;
  showNpcDialog();
}
function doInvUpgrade(){
  const upg=G._pendingInvUpgrade;
  if(!upg)return;
  const cost=upg.cost;
  if(G.alUSD<cost){chatLog(`Need ${cost} alUSD to upgrade inventory.`,'#FF4444');SFX.error();return;}
  G.alUSD=parseFloat((G.alUSD-cost).toFixed(2));
  G.maxInvSlots=Math.min(12,G.maxInvSlots+1);
  while(G.inventory.length<G.maxInvSlots)G.inventory.push(null);
  G._pendingInvUpgrade=null;
  chatLog(`✅ Inventory expanded to ${G.maxInvSlots} slots! (−${cost} alUSD)`,'#B080FF');
  SFX.buy();saveToServer();
}

function openBank(){
  G.paused=true;
  renderBankUI();
  document.getElementById('bank-ui').style.display='flex';
}
function closeBank(){
  G.paused=false;
  document.getElementById('bank-ui').style.display='none';
}
function renderBankUI(){
  let posHTML='';
  G.bankPositions.forEach((pos,i)=>{
    if(pos.claimed)return;
    const pct=pos.borrowed>0?Math.min(100,Math.round((1-pos.debt/pos.borrowed)*100)):100;
    const colLabel=pos.collateral==='spacebucks'?'🪙 Spacebucks':'💀 Schmeckles';
    const syn=pos.collateral==='spacebucks'?'alUSD':'alETH';
    const icon=pos.collateral==='spacebucks'?'🪙':'💀';
    const claimable=pos.debt<=0.001;
    const interest=pos.interestAccrued||0;
    const totalClaim=pos.deposited+interest;
    const interestStr=interest>0?`<span style="color:#FFD700;font-size:.72rem"> + ${interest} ${icon} interest</span>`:'';
    posHTML+=`<div class="bank-pos">
      <b>${colLabel}</b> deposited: ${pos.deposited} | borrowed: ${pos.borrowed.toFixed(2)} ${syn} | debt: ${pos.debt.toFixed(2)} ${syn}<br>
      <div class="bank-bar"><div class="bank-bar-fill" style="width:${pct}%"></div></div>
      <span style="font-size:.75rem">${pct}% repaid</span>
      ${claimable?`${interestStr}<button onclick="claimBankPosition(${i})" style="background:#4CAF50;color:#000;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:8px">✓ CLAIM ${totalClaim} ${icon}</button>`:''}
    </div>`;
  });
  const active=G.bankPositions.filter(p=>!p.claimed);
  if(!active.length) posHTML='<p style="color:#aaa;font-size:.85rem">No active positions. Deposit tokens below to borrow synthetics.</p>';
  document.getElementById('bank-positions').innerHTML=posHTML;
  document.getElementById('bank-sb-bal').textContent=G.spacebucks;
  document.getElementById('bank-sm-bal').textContent=G.schmeckles;
  document.getElementById('bank-alusd-bal').textContent=G.alUSD.toFixed(2);
  document.getElementById('bank-aleth-bal').textContent=G.alETH.toFixed(4);
}
function depositBank(collateral){
  const amt=parseInt(document.getElementById('bank-deposit-amt').value)||0;
  if(amt<=0){chatLog('Enter a deposit amount.','#FF8800');return;}
  if(collateral==='spacebucks'&&G.spacebucks<amt){chatLog('Not enough Spacebucks!','#FF4444');return;}
  if(collateral==='schmeckles'&&G.schmeckles<amt){chatLog('Not enough Schmeckles!','#FF4444');return;}
  const borrow=Math.floor(amt*0.9*100)/100;
  if(collateral==='spacebucks'){G.spacebucks-=amt;G.alUSD=Math.round((G.alUSD+borrow)*100)/100;}
  else{G.schmeckles-=amt;G.alETH=Math.round((G.alETH+borrow)*10000)/10000;}
  G.bankPositions.push({collateral,deposited:amt,borrowed:borrow,debt:borrow,earmarked:0,claimed:false});
  chatLog(`🏦 Deposited ${amt} ${collateral==='spacebucks'?'Spacebucks':'Schmeckles'} → borrowed ${borrow} ${collateral==='spacebucks'?'alUSD':'alETH'} (90% LTV)`,'#4CAF50');
  SFX.buy();
  socket?.emit('bank_sync',{bankPositions:G.bankPositions});
  renderBankUI();
}
function claimBankPosition(idx){
  const pos=G.bankPositions[idx];
  if(!pos||pos.debt>0.001||pos.claimed)return;
  const interest=pos.interestAccrued||0;
  const total=pos.deposited+interest;
  pos.claimed=true;
  pos.interestAccrued=0;
  if(pos.collateral==='spacebucks')G.spacebucks+=total;
  else G.schmeckles+=total;
  const icon=pos.collateral==='spacebucks'?'🪙':'💀';
  const interestNote=interest>0?` (+${interest} ${icon} interest earned)`:'';
  chatLog(`✅ Claimed ${total} ${pos.collateral==='spacebucks'?'Spacebucks':'Schmeckles'} ${icon}${interestNote}!`,'#FFD700');
  SFX.coin();
  socket?.emit('bank_sync',{bankPositions:G.bankPositions});
  renderBankUI();
  saveToServer();
}

// ── TRANSMUTER ────────────────────────────────────────────────────────────────
const TRANSMUTER_EXIT_FEE = 0.10; // 10% early-withdrawal penalty (mirrors v3 exitFee)

function openTransmuter(){
  G.paused=true;
  renderTransmuterUI();
  document.getElementById('transmuter-ui').style.display='flex';
}
function closeTransmuter(){
  G.paused=false;
  document.getElementById('transmuter-ui').style.display='none';
}
function renderTransmuterUI(){
  document.getElementById('tr-alusd-bal').textContent=G.alUSD.toFixed(2);
  document.getElementById('tr-aleth-bal').textContent=G.alETH.toFixed(4);
  let html='';
  G.transmuterDeposits.forEach((dep,i)=>{
    if(dep.amount<=0.001&&dep.available<=0.001)return;
    const syn=dep.type==='alUSD'?'$ alUSD':'⟠ alETH';
    const col=dep.type==='alUSD'?'🪙 Spacebucks':'💀 Schmeckles';
    const total=dep.amount+dep.available;
    const pct=total>0?Math.min(100,Math.round(dep.available/total*100)):100;
    const canClaim=dep.available>0.001;
    const canExit=dep.amount>0.001; // unconverted portion still pending
    const exitReturn=parseFloat((dep.amount*(1-TRANSMUTER_EXIT_FEE)).toFixed(dep.type==='alUSD'?2:4));
    const exitFeeAmt=parseFloat((dep.amount*TRANSMUTER_EXIT_FEE).toFixed(dep.type==='alUSD'?2:4));
    html+=`<div class="bank-pos">
      <b>${syn}</b> deposited: ${total.toFixed(2)} → ${col}<br>
      <div class="bank-bar"><div class="bank-bar-fill" style="width:${pct}%;background:#4FC3F7"></div></div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">
        <span style="font-size:.75rem;color:#4FC3F7">${dep.available.toFixed(2)} ready</span>
        ${canClaim?`<button onclick="claimTransmuter(${i})" style="background:#4FC3F7;color:#000;border:none;padding:3px 9px;border-radius:4px;cursor:pointer;font-size:.78rem">✓ CLAIM ${dep.available.toFixed(2)} ${dep.type==='alUSD'?'🪙':'💀'}</button>`:''}
        ${canExit?`<button onclick="earlyWithdrawTransmuter(${i})" title="Early exit — ${(TRANSMUTER_EXIT_FEE*100).toFixed(0)}% exitFee applies to unconverted balance"
          style="background:#5A2020;color:#FF8888;border:1px solid #FF4444;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:.78rem">
          ⚠ EXIT EARLY (${exitReturn.toFixed(dep.type==='alUSD'?2:4)} back, ${exitFeeAmt.toFixed(dep.type==='alUSD'?2:4)} fee)</button>`:''}
      </div>
    </div>`;
  });
  if(!html)html='<p style="color:#aaa;font-size:.85rem">No active deposits. Deposit alUSD or alETH above to participate in redemptions.</p>';
  document.getElementById('transmuter-positions').innerHTML=html;
}
function depositTransmuter(type){
  const amt=parseFloat(document.getElementById('tr-deposit-amt').value)||0;
  if(amt<=0){chatLog('Enter a deposit amount.','#FF8800');return;}
  if(type==='alUSD'&&G.alUSD<amt){chatLog('Not enough alUSD!','#FF4444');return;}
  if(type==='alETH'&&G.alETH<amt){chatLog('Not enough alETH!','#FF4444');return;}
  if(type==='alUSD')G.alUSD=Math.round((G.alUSD-amt)*100)/100;
  else G.alETH=Math.round((G.alETH-amt)*10000)/10000;
  // Merge with existing deposit of same type or create new
  const existing=G.transmuterDeposits.find(d=>d.type===type&&d.amount>0.001);
  if(existing)existing.amount+=amt;
  else G.transmuterDeposits.push({type,amount:amt,available:0});
  chatLog(`⚗ Transmuter: deposited ${amt.toFixed(2)} ${type}. Waiting for next global redemption event.`,'#4FC3F7');
  SFX.buy();
  socket?.emit('transmuter_sync',{transmuterDeposits:G.transmuterDeposits});
  renderTransmuterUI();
}
function claimTransmuter(idx){
  const dep=G.transmuterDeposits[idx];
  if(!dep||dep.available<=0.001)return;
  const amt=dep.available;
  dep.available=0;
  if(dep.type==='alUSD')G.spacebucks+=Math.floor(amt);
  else G.schmeckles+=Math.floor(amt);
  chatLog(`✅ Transmuter: claimed ${Math.floor(amt)} ${dep.type==='alUSD'?'🪙 Spacebucks':'💀 Schmeckles'}!`,'#FFD700');
  SFX.coin();
  socket?.emit('transmuter_sync',{transmuterDeposits:G.transmuterDeposits});
  renderTransmuterUI();
  saveToServer();
}

// Early withdrawal — returns unconverted synthetic minus exitFee (10% → Treasury)
function earlyWithdrawTransmuter(idx){
  const dep=G.transmuterDeposits[idx];
  if(!dep||dep.amount<=0.001)return;
  const gross=dep.amount;
  const isUSD=dep.type==='alUSD';
  const dp=isUSD?2:4;
  const fee=parseFloat((gross*TRANSMUTER_EXIT_FEE).toFixed(dp));
  const returned=parseFloat((gross-fee).toFixed(dp));
  dep.amount=0;
  if(isUSD) G.alUSD=parseFloat((G.alUSD+returned).toFixed(2));
  else      G.alETH=parseFloat((G.alETH+returned).toFixed(4));
  chatLog(`⚠ Transmuter early exit: returned ${returned} ${dep.type} (${fee} exitFee → Treasury).`,'#FF8C00');
  SFX.error();
  // Fee credited to the shared protocol Treasury on the server
  socket?.emit('transmuter_exit_fee',{
    feeAlUSD: isUSD?fee:0,
    feeAlETH: isUSD?0:fee,
  });
  socket?.emit('transmuter_sync',{transmuterDeposits:G.transmuterDeposits});
  renderTransmuterUI();
  saveToServer();
}
function distributeTransmuterPool(sbAmount,ethAmount){
  // alUSD depositors get Spacebucks, alETH depositors get Schmeckles
  ['alUSD','alETH'].forEach(type=>{
    const poolAmt=type==='alUSD'?sbAmount:ethAmount;
    if(poolAmt<=0)return;
    const deps=G.transmuterDeposits.filter(d=>d.type===type&&d.amount>0.001);
    const total=deps.reduce((s,d)=>s+d.amount,0);
    if(total<=0)return;
    deps.forEach(d=>{
      const share=d.amount/total;
      const recv=Math.min(d.amount,poolAmt*share);
      d.available=(d.available||0)+recv;
      d.amount=Math.max(0,d.amount-recv);
    });
  });
}

// ── EXCHANGE ──────────────────────────────────────────────────────────────────
// Exchange rates (relative to alUSD)
const EXCHANGE_RATES={spacebucks:1,schmeckles:1,alUSD:1,alETH:1800,alcx:5};
// Updated from server on price_update events
function applyLivePrices(prices){
  if(prices.alETH)EXCHANGE_RATES.alETH=prices.alETH;
  if(prices.alcx) EXCHANGE_RATES.alcx=prices.alcx;
  // alUSD stays at 1 (peg), spacebucks/schmeckles are in-game tokens
  G.livePrices={...prices};
}
function openExchange(){
  G.paused=true;
  renderExchangeUI();
  document.getElementById('exchange-ui').style.display='flex';
}
function closeExchange(){
  G.paused=false;
  document.getElementById('exchange-ui').style.display='none';
}
function doExchange(){
  const from=document.getElementById('ex-from').value;
  const to=document.getElementById('ex-to').value;
  const amt=parseFloat(document.getElementById('ex-amount').value)||0;
  if(from===to){chatLog('Select different tokens to swap.','#FF8800');return;}
  if(amt<=0){chatLog('Enter an amount.','#FF8800');return;}
  const bal={spacebucks:G.spacebucks,schmeckles:G.schmeckles,alUSD:G.alUSD,alETH:G.alETH,alcx:G.alcx}[from];
  if(bal<amt){chatLog('Insufficient balance!','#FF4444');SFX.error();return;}
  const gross=amt*(EXCHANGE_RATES[from]/EXCHANGE_RATES[to]);
  const fee=gross*0.003;
  const received=gross-fee;
  if(from==='spacebucks')G.spacebucks-=amt;
  else if(from==='schmeckles')G.schmeckles-=amt;
  else if(from==='alUSD')G.alUSD-=amt;
  else if(from==='alETH')G.alETH-=amt;
  else if(from==='alcx')G.alcx-=amt;
  if(to==='spacebucks')G.spacebucks=Math.round((G.spacebucks+received)*100)/100;
  else if(to==='schmeckles')G.schmeckles=Math.round((G.schmeckles+received)*100)/100;
  else if(to==='alUSD')G.alUSD=Math.round((G.alUSD+received)*100)/100;
  else if(to==='alETH')G.alETH=Math.round((G.alETH+received)*10000)/10000;
  else if(to==='alcx')G.alcx=Math.round((G.alcx+received)*100)/100;
  chatLog(`⚗ Swapped ${amt} ${from} → ${received.toFixed(4)} ${to} (fee: ${fee.toFixed(4)})`, '#4CAF50');
  // Report fee to server for treasury tracking
  if(socket){
    const feeAlUSD=to==='alUSD'||from==='alUSD'?parseFloat(fee.toFixed(2)):0;
    const feeAlETH=to==='alETH'||from==='alETH'?parseFloat(fee.toFixed(4)):0;
    socket.emit('exchange_fee',{feeAlUSD,feeAlETH});
  }
  SFX.buy();
  saveToServer();
  renderExchangeUI();
}
function renderExchangeUI(){
  document.getElementById('ex-sb').textContent=G.spacebucks;
  document.getElementById('ex-sm').textContent=G.schmeckles.toFixed?G.schmeckles.toFixed(2):G.schmeckles;
  document.getElementById('ex-alusd').textContent=G.alUSD.toFixed(2);
  document.getElementById('ex-aleth').textContent=G.alETH.toFixed(4);
  document.getElementById('ex-alcx').textContent=(G.alcx||0).toFixed(2);
}

// ── SHOP ──────────────────────────────────────────────────────────────────────
function openShop(vendorId){
  G.shop={vendorId};
  G.paused=true;
  renderShop();
  document.getElementById('shop-overlay').classList.add('open');
}
function closeShop(){
  if(!G.shop)return;
  G.shop=null;
  G.paused=false;
  document.getElementById('shop-overlay').classList.remove('open');
}
function renderShop(){
  const v=G.shop?.vendorId;
  if(!v)return;
  const items=SHOP_CATALOG[v]||[];
  const title=v==='zelda'?'VENDOR ZELDA — Weapons & Potions':'ARMORER FLINT — Shields';
  document.getElementById('shop-title').textContent=title;
  document.getElementById('shop-gold-display').textContent=`💵 ${G.alUSD.toFixed(0)} alUSD  ·  ⟠ ${G.alETH.toFixed(3)} alETH`;
  const list=document.getElementById('shop-items-list');
  list.innerHTML='';
  items.forEach((item,i)=>{
    const itemCurrency=item.currency||'alUSD';
    const balance=itemCurrency==='alETH'?G.alETH:G.alUSD;
    const canAfford=balance>=item.cost;
    const altCurrency2=itemCurrency==='alETH'?'alUSD':'alETH';
    const altRate2=(EXCHANGE_RATES[itemCurrency]||1)/(EXCHANGE_RATES[altCurrency2]||1);
    const altCost2=altCurrency2==='alETH'?parseFloat((item.cost*altRate2*1.003).toFixed(4)):parseFloat((item.cost*altRate2*1.003).toFixed(2));
    const altBalance2=altCurrency2==='alETH'?G.alETH:G.alUSD;
    const canAffordAlt=!canAfford&&altBalance2>=altCost2;
    const meetsLvl=G.level>=item.lvl;
    const canBuy=canAfford&&meetsLvl;
    let statStr='';
    if(item.type==='weapon')statStr=`+${item.dmg} DMG`;
    else if(item.type==='shield')statStr=`+${item.def} DEF`;
    else if(item.healFull)statStr='Full HP restore';
    else statStr=`+${item.heal} HP`;
    const currencySymbol=itemCurrency==='alETH'?'⟠':'$';
    const priceStr=itemCurrency==='alETH'?`${item.cost} alETH`:`${item.cost} alUSD`;
    const row=document.createElement('div');
    row.className='shop-row';
    row.innerHTML=`
      <div class="shop-row-icon">${item.icon}</div>
      <div class="shop-row-info">
        <div class="shop-row-name">${item.name} <span style="color:#aaa;font-weight:normal">(${statStr})</span></div>
        <div class="shop-row-desc">${item.desc}</div>
        <div class="shop-row-req" style="color:${meetsLvl?'#556':'#FF6600'}">Requires Lv.${item.lvl}</div>
      </div>
      <div class="shop-row-right">
        <div class="shop-row-price">${currencySymbol}${priceStr}</div>
        <button class="shop-buy-btn" onclick="buyItem('${v}',${i})" ${canBuy||canAffordAlt?'':'disabled'} style="${canAffordAlt?'background:#1A2A50;color:#8090FF;border-color:#4060C0':''}">
          ${canBuy?'BUY':canAffordAlt?`~${altCost2} ${altCurrency2}`:'BUY'}
        </button>
      </div>
    `;
    list.appendChild(row);
  });
}
function buyItem(vendorId,idx){
  const item=SHOP_CATALOG[vendorId]?.[idx];
  if(!item)return;
  const convoyDisc=G.worldEvent?.type==='merchant_convoy'?0.80:1.0;
  let currency=item.currency||'alUSD';
  const balance=currency==='alETH'?G.alETH:G.alUSD;
  if(balance<item.cost){
    const altCur=currency==='alETH'?'alUSD':'alETH';
    const altRate=(EXCHANGE_RATES[currency]||1)/(EXCHANGE_RATES[altCur]||1);
    const altCost=altCur==='alETH'?parseFloat((item.cost*altRate*1.003).toFixed(4)):parseFloat((item.cost*altRate*1.003).toFixed(2));
    const altBal=altCur==='alETH'?G.alETH:G.alUSD;
    if(altBal>=altCost){
      if(altCur==='alETH')G.alETH=parseFloat((G.alETH-altCost).toFixed(4));
      else G.alUSD=parseFloat((G.alUSD-altCost).toFixed(2));
      chatLog(`Paid ${altCost} ${altCur} for ${item.name} (auto-converted, 0.3% fee)`,'#8090FF');
      currency='_converted';
    }else{SFX.error();chatLog(`Not enough ${currency} (or ${altCur} to convert).`,'#FF4444');return;}
  }
  if(G.level<item.lvl){SFX.error();chatLog(`Requires level ${item.lvl}!`,'#FF8800');return;}
  if(currency==='alETH')G.alETH=parseFloat((G.alETH-item.cost*convoyDisc).toFixed(4));
  else if(currency==='alUSD')G.alUSD=parseFloat((G.alUSD-item.cost*convoyDisc).toFixed(2));
  // if currency==='_converted', already deducted above
  if(item.type==='weapon'){
    G.inventory[0]={...item};
    SFX.buy();
    chatLog(`Equipped ${item.name}! (+${item.dmg} DMG)`,'#4CAF50');
  } else if(item.type==='shield'){
    G.inventory[1]={...item};
    SFX.buy();
    chatLog(`Equipped ${item.name}! (+${item.def} DEF)`,'#4CAF50');
  } else if(item.type==='potion'){
    const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
    if(slot===-1){
      if(currency==='alETH')G.alETH+=item.cost;
      else G.alUSD+=item.cost;
      SFX.error();chatLog('Inventory full! No room for potions.','#FF4444');return;
    }
    G.inventory[slot]={...item};
    SFX.buy();
    chatLog(`Bought ${item.name}!`,'#4CAF50');
  }
  renderShop();
}
function usePotion(slotIdx){
  const item=G.inventory[slotIdx];
  if(!item||item.type!=='potion')return;
  if(G.hp>=G.maxHp){chatLog('HP is already full!','#888');return;}
  const before=G.hp;
  if(item.healFull)G.hp=G.maxHp;
  else G.hp=Math.min(G.maxHp,G.hp+(item.heal||5));
  const gained=G.hp-before;
  G.inventory[slotIdx]=null;
  chatLog(`Used ${item.name}! Restored ${gained} HP.`,'#4CAF50');
  if(G.paused)renderInventoryScreen();
}

// ── TILE LAYER RENDERER ───────────────────────────────────────────────────────
let cvTiles,ctxTiles;
function renderTileLayer(){
  const z=ZONES[G.zone];if(!z)return;
  const m=z.map;
  ctxTiles.clearRect(0,0,W,H);
  const startC=Math.floor(G.camX/TS),startR=Math.floor(G.camY/TS);
  for(let row=startR;row<=startR+TH+1;row++){
    for(let col=startC;col<=startC+TW+1;col++){
      if(row<0||row>=z.h||col<0||col>=z.w)continue;
      const tile=m[row][col];
      if(tile===T.WATER&&WATER_FRAMES.length){
        ctxTiles.drawImage(WATER_FRAMES[Math.floor(G.tick/20)%3],col*TS-G.camX,row*TS-G.camY);
      }else{
        const cached=TILE_CACHE[tile];
        if(cached){ctxTiles.drawImage(cached,col*TS-G.camX,row*TS-G.camY);}
      }
    }
  }
}

// ── FOREGROUND TILE LAYER (cv-fg, z:4) ───────────────────────────────────────
// Tiles whose upper portion renders ABOVE sprites, creating depth/occlusion.
// The tile layer draws the full tile; this layer redraws just the top N pixels
// on a higher z-canvas so the player appears to walk behind tree canopies, etc.
const FG_TILES=new Set([T.TREE,T.COLUMN,T.STALL]);
// Pixels from tile top to include in the foreground layer
const FG_HEIGHTS={[T.TREE]:18,[T.COLUMN]:8,[T.STALL]:10};

function renderFgLayer(ctx){
  ctx.clearRect(0,0,W,H);
  const z=ZONES[G.zone];if(!z)return;
  const m=z.map;
  const startC=Math.floor(G.camX/TS),startR=Math.floor(G.camY/TS);
  for(let row=startR;row<=startR+TH+1;row++){
    for(let col=startC;col<=startC+TW+1;col++){
      if(row<0||row>=z.h||col<0||col>=z.w)continue;
      const tile=m[row][col];
      if(!FG_TILES.has(tile))continue;
      const fgH=FG_HEIGHTS[tile];
      const cached=TILE_CACHE[tile];
      if(!cached)continue;
      // Draw only the top fgH pixels of this tile, in screen space
      ctx.drawImage(cached,0,0,TS,fgH,col*TS-G.camX,row*TS-G.camY,TS,fgH);
    }
  }
}

// ── MINIMAP ────────────────────────────────────────────────────────────────────
const MINI_COLORS={
  0:'#111',1:'#3a5a2a',2:'#8a8070',3:'#3a3a3a',4:'#1a3a0a',5:'#8a6040',
  6:'#7a6050',7:'#2a5a8a',8:'#8a6040',9:'#aaa090',10:'#5a5a5a',11:'#5a3070',
  12:'#556677',13:'#8a6040',14:'#6a6a6a',15:'#a07040',16:'#5a4a3a',17:'#505060',
  18:'#404060',19:'#8a5020',20:'#4080c0',21:'#7a6050',22:'#2a5a1a',
  23:'#80a040',24:'#60a060',25:'#c0a000',26:'#6b4226',
};
let _mmCanvas=null;
function buildMinimap(){
  const z=ZONES[G.zone];if(!z)return;
  _mmCanvas=document.createElement('canvas');
  _mmCanvas.width=z.w;_mmCanvas.height=z.h;
  const ctx=_mmCanvas.getContext('2d');
  const img=ctx.createImageData(z.w,z.h);
  for(let r=0;r<z.h;r++){
    for(let c=0;c<z.w;c++){
      const t=z.map[r][c];
      const hex=MINI_COLORS[t]||'#222';
      const ri=parseInt(hex.slice(1,3),16)||34;
      const gi=parseInt(hex.slice(3,5),16)||34;
      const bi=parseInt(hex.slice(5,7),16)||34;
      const idx=(r*z.w+c)*4;
      img.data[idx]=ri;img.data[idx+1]=gi;img.data[idx+2]=bi;img.data[idx+3]=255;
    }
  }
  ctx.putImageData(img,0,0);
}
function renderMinimap(ctx){
  if(!G.showMinimap)return;
  if(!_mmCanvas)buildMinimap();
  const z=ZONES[G.zone];if(!z)return;
  // Scale minimap to fit in 280×180 display area
  const scale=Math.min(280/z.w,180/z.h);
  const dw=Math.round(z.w*scale),dh=Math.round(z.h*scale);
  const ox=Math.round((W-dw)/2),oy=Math.round((H-dh)/2);
  // Backdrop
  ctx.fillStyle='rgba(0,0,0,0.88)';ctx.fillRect(ox-8,oy-22,dw+16,dh+30);
  ctx.fillStyle='#888';ctx.font='10px monospace';ctx.textAlign='center';
  ctx.fillText('MAP  [ M ] close',W/2,oy-9);ctx.textAlign='left';
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(_mmCanvas,ox,oy,dw,dh);
  ctx.imageSmoothingEnabled=true;
  // Border
  ctx.strokeStyle='#4a90d9';ctx.lineWidth=2;ctx.strokeRect(ox,oy,dw,dh);
  // Player dot
  const px=Math.floor(G.x/TS),py=Math.floor(G.y/TS);
  const dx=ox+Math.round(px*scale),dy=oy+Math.round(py*scale);
  ctx.fillStyle='#FF4444';ctx.fillRect(dx-2,dy-2,5,5);
  ctx.fillStyle='#FFAAAA';ctx.fillRect(dx-1,dy-1,3,3);
}

// ── SPRITE LAYER ──────────────────────────────────────────────────────────────
const SPRITE_SCALE=1.5; // Mega Man X–style: sprites appear large relative to tiles
// Helper: draw a sprite scaled from its foot position
function scaledSprite(ctx,footX,footY,drawFn){
  ctx.save();
  ctx.translate(footX,footY);
  ctx.scale(SPRITE_SCALE,SPRITE_SCALE);
  drawFn(-12,-44); // sprite origin offset (center-x=12, height=44)
  ctx.restore();
}

function renderSpriteLayer(ctx){
  ctx.clearRect(0,0,W,H);

  // Sprite visual dimensions at SPRITE_SCALE
  const SH=Math.round(44*SPRITE_SCALE); // scaled sprite height
  const SW=Math.round(24*SPRITE_SCALE); // scaled sprite width

  // ── NPCs ──
  const zoneNpcs=NPCS[G.zone]||[];
  const px=Math.floor(G.x/TS),py=Math.floor(G.y/TS);
  for(const npc of zoneNpcs){
    // foot is at tile center
    const footX=npc.x*TS-G.camX+TS/2-12;
    const footY=npc.y*TS-G.camY+TS/2+4;
    // Skip if off-screen
    if(footX<-SW||footX>W+SW||footY<-SH||footY>H+40)continue;
    scaledSprite(ctx,footX,footY,(ox,oy)=>drawNPCSprite(ctx,ox,oy,npc.type,npc.face??2));
    // Name bubble + E hint — above scaled sprite
    const dist=Math.abs(npc.x-px)+Math.abs(npc.y-py);
    if(dist<=2){
      const label=npc.name;
      const lw=label.length*6+6;
      const topY=footY-SH;
      ctx.fillStyle='#000000BB';ctx.fillRect(footX-lw/2,topY-16,lw,11);
      ctx.fillStyle='#FFD700';ctx.font='8px monospace';ctx.textAlign='center';
      ctx.fillText(label,footX,topY-7);
      ctx.textAlign='left';
      ctx.fillStyle='#00000099';ctx.fillRect(footX-22,topY-28,44,10);
      ctx.fillStyle='#88BBFF';ctx.font='7px monospace';ctx.textAlign='center';
      ctx.fillText('[E] Talk',footX,topY-20);
      ctx.textAlign='left';
    }
  }

  // ── Other players ──
  for(const[id,p] of Object.entries(others)){
    const footX=p.x-G.camX;
    const footY=p.y-G.camY+4;
    if(footX<-SW||footX>W+SW||footY<-SH||footY>H+40)continue;
    scaledSprite(ctx,footX,footY,(ox,oy)=>
      drawPlayerSprite(ctx,ox,oy,p.dir||2,p.color,p.frame||0,p.moving||false,false,p.species||'human',p.hairColor||HAIR_COLORS[1],p.accessory||null));
    // name label above
    const topY=footY-SH;
    const nl=p.nickname||'';
    ctx.fillStyle='#00000088';ctx.fillRect(footX-nl.length*3,topY-14,nl.length*6+4,12);
    ctx.fillStyle='#fff';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText(nl,footX,topY-4);ctx.textAlign='left';
  }

  // ── Local player ──
  const footX=G.x-G.camX,footY=G.y-G.camY+4;
  scaledSprite(ctx,footX,footY,(ox,oy)=>
    drawPlayerSprite(ctx,ox,oy,G.dir,G.color,G.frame,G.moving,G.godMode,G.species,G.hairColor,G.accessory));

  // Draw world loot piles
  if(G.worldLoot){
    G.worldLoot.filter(l=>l.zone===G.zone).forEach(l=>{
      const sx=l.x*TS-G.camX+TS/2,sy=l.y*TS-G.camY+TS/2;
      const grd=ctx.createRadialGradient(sx,sy,0,sx,sy,14);
      grd.addColorStop(0,'rgba(255,200,0,0.35)');grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,14,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.font='20px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('💰',sx,sy);
      ctx.restore();
    });
  }
  // Draw snowball enemies
  if(G.snowballEnemies){
    G.snowballEnemies.filter(se=>se.zone===G.zone).forEach(se=>{
      const sx=se.tileX*TS-G.camX+TS/2,sy=se.tileY*TS-G.camY+TS/2;
      if(sx<-TS||sx>W+TS||sy<-TS||sy>H+TS)return;
      const kc=Math.min(se.killCount||1,10);
      const glowR=14+kc*3;
      const pulse=0.18+0.08*Math.sin(G.tick*0.08); // subtle pulse
      const grd=ctx.createRadialGradient(sx,sy,0,sx,sy,glowR);
      grd.addColorStop(0,`rgba(255,30,0,${pulse})`);
      grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,glowR,0,Math.PI*2);ctx.fill();
      ctx.save();
      ctx.font=`${14+Math.min(kc,6)*1.5}px serif`;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('👹',sx,sy);
      ctx.font='bold 8px monospace';ctx.fillStyle='#FF6030';
      ctx.fillText(se.name,sx,sy-Math.round(14+kc));
      if(se.killCount>1){ctx.fillStyle='#FFD700';ctx.fillText(`☠${se.killCount}`,sx,sy+16);}
      ctx.restore();
    });
  }
  // Draw graffiti markers
  if(G.graffiti){
    G.graffiti.filter(g=>g.zone===G.zone).forEach(g=>{
      const sx=g.tileX*TS-G.camX+TS/2,sy=g.tileY*TS-G.camY+TS/2;
      if(sx<-TS||sx>W+TS||sy<-TS||sy>H+TS)return;
      const grd=ctx.createRadialGradient(sx,sy,0,sx,sy,12);
      grd.addColorStop(0,'rgba(180,80,255,0.22)');grd.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,12,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.font='16px serif';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('📝',sx,sy-4);
      ctx.restore();
    });
  }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
// ── Governance Hall Treasury + Price Panel ────────────────────────────────────
function renderGovernancePanel(ctx){
  const pad=12, w=220, lh=16;
  const lines=[
    {label:'── PROTOCOL TREASURY ──', val:'', color:'#FFD700'},
    {label:'alUSD collected',  val:`$${(G.treasury.alUSD||0).toFixed(2)}`,  color:'#4CAF50'},
    {label:'alETH collected',  val:`⟠${(G.treasury.alETH||0).toFixed(4)}`, color:'#7B68EE'},
    {label:'', val:'', color:'#333'},
    {label:'── LIVE PRICES ──', val:'', color:'#FFD700'},
    {label:'alUSD', val:`$${(G.livePrices.alUSD||1).toFixed(4)}`,           color:G.livePrices.alUSD<0.98?'#FF4444':'#4CAF50'},
    {label:'alETH (ETH)',val:`$${(G.livePrices.alETH||0).toLocaleString()}`,color:'#7B68EE'},
    {label:'ALCX',  val:`$${(G.livePrices.alcx||0).toFixed(2)}`,            color:'#FF9800'},
  ];
  const h=pad*2+lines.length*lh+4;
  const x=W-w-pad, y=80;
  // Panel bg
  ctx.fillStyle='rgba(5,5,15,0.82)';
  ctx.strokeStyle='#5A3A80';
  ctx.lineWidth=1;
  roundRect(ctx,x,y,w,h,6);
  ctx.fill(); ctx.stroke();
  ctx.font='10px monospace';
  ctx.textBaseline='top';
  lines.forEach((l,i)=>{
    const ly=y+pad+i*lh;
    if(!l.label&&!l.val)return; // divider gap
    ctx.fillStyle=l.color||'#CCC';
    ctx.textAlign='left';
    ctx.fillText(l.label,x+10,ly);
    if(l.val){
      ctx.textAlign='right';
      ctx.fillStyle='#EEE';
      ctx.fillText(l.val,x+w-10,ly);
    }
  });
  ctx.textAlign='left';
  ctx.textBaseline='alphabetic';
}
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

function renderHUD(){
  const hearts=document.getElementById('hud-hearts');
  hearts.innerHTML='';
  for(let i=0;i<G.maxHp;i++){
    const full=i<G.hp;
    const span=document.createElement('span');
    span.textContent=full?'♥':'♡';
    span.style.color=full?'#E53935':'#555';
    span.style.fontSize='1rem';
    hearts.appendChild(span);
  }
  const mpEl=document.getElementById('hud-mp');
  mpEl.innerHTML='';
  for(let i=0;i<G.maxMp;i++){
    const full=i<G.mp;
    const s=document.createElement('span');
    s.textContent=full?'◆':'◇';
    s.style.color=full?'#4FC3F7':'#334';
    s.style.fontSize='.7rem';
    mpEl.appendChild(s);
  }
  document.getElementById('hud-spacebucks').textContent = `🪙${G.spacebucks}`;
  document.getElementById('hud-alusd').textContent = `$${G.alUSD.toFixed(0)}`;
  const alcxTxt = G.lockedAlcx>0 ? `⚗${G.alcx} 🔒${G.lockedAlcx}` : `⚗${G.alcx}`;
  document.getElementById('hud-alcx').textContent = alcxTxt;
  document.getElementById('hud-level').textContent=`Lv.${G.level}`;
  // Quest-ready badge
  const hasReady=Object.values(G.quests).some(q=>q.status==='ready');
  document.getElementById('hud-level').style.color=hasReady?'#FFD700':'#8BC34A';
  document.getElementById('hud-level').title=hasReady?'Quest ready to turn in!':'';
  const xpPct=Math.min(1,G.xp/xpForLevel(G.level))*100;
  document.getElementById('hud-xp-fill').style.width=xpPct+'%';
  {
    let zoneName=ZONES[G.zone]?.name||G.zone;
    if(G.zone==='world'){
      const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
      zoneName=(tx>=TOWN_OX&&tx<TOWN_OX+MAP_W&&ty>=TOWN_OY&&ty<TOWN_OY+MAP_H)?'Town Square':'Wilderness';
    }
    document.getElementById('hud-zone').textContent=zoneName;
  }
  // World event banner
  if(G.worldEvent&&Date.now()<G.worldEvent.endsAt){
    const secsLeft=Math.max(0,Math.ceil((G.worldEvent.endsAt-Date.now())/1000));
    const mins=Math.floor(secsLeft/60),secs=secsLeft%60;
    const timeStr=`${mins}:${secs.toString().padStart(2,'0')}`;
    const bw=220,bh=20,bx=W/2-bw/2,by=6;
    ctxUI.fillStyle='rgba(0,0,0,0.65)';ctxUI.fillRect(bx,by,bw,bh);
    ctxUI.strokeStyle='#FF8C00';ctxUI.lineWidth=1;ctxUI.strokeRect(bx,by,bw,bh);
    ctxUI.fillStyle='#FF8C00';ctxUI.font='bold 10px monospace';ctxUI.textAlign='center';
    ctxUI.fillText(`${G.worldEvent.icon} ${G.worldEvent.name}  ${timeStr}`,W/2,by+13);
    ctxUI.textAlign='left';
  }
}

// ── PAUSE / INVENTORY ─────────────────────────────────────────────────────────
function togglePause(){
  G.paused=!G.paused;
  const overlay=document.getElementById('pause-overlay');
  overlay.className=G.paused?'open':'';
  if(G.paused)renderInventoryScreen();
}

function renderInventoryScreen(){
  const grid=document.getElementById('inv-grid');
  grid.innerHTML='';
  // Show only up to maxInvSlots; grow array if needed
  while(G.inventory.length<G.maxInvSlots)G.inventory.push(null);
  for(let i=0;i<G.maxInvSlots;i++){
    const item=G.inventory[i];
    const slot=document.createElement('div');
    slot.className='inv-slot'+(item?' has-item':'');
    slot.textContent=item?item.icon||'?':(i===0?'⚔':(i===1?'🛡':''));
    slot.title=i===0?`Weapon: ${item?.name||'—'}`:i===1?`Shield: ${item?.name||'—'}`:item?item.name:'Empty';
    if(item&&item.type==='potion'&&!G.battle){
      slot.title=`${item.name} — Click to use`;
      slot.style.cursor='pointer';
      slot.addEventListener('click',()=>usePotion(i));
    }
    grid.appendChild(slot);
  }
  // Capacity line
  const capEl=document.getElementById('inv-capacity');
  if(capEl){
    const maxPossible=12;
    capEl.innerHTML=`Slots: ${G.maxInvSlots}/${maxPossible}`
      +(G.maxInvSlots<maxPossible?' — <span style="color:#B080FF">upgrade at Expansion Vendor in Marketplace</span>':'');
  }
  const stats=document.getElementById('stats-box');
  const s=G.stats;
  const xpNeeded=xpForLevel(G.level);
  const btnStyle=G.statPoints>0
    ?'cursor:pointer;background:#4CAF50;color:#fff;border:none;border-radius:3px;padding:0 5px;font-size:11px;margin-left:4px;'
    :'display:none';
  const statRows=[
    ['str','STR (Attack)'],['vit','VIT (HP)'],['agi','AGI (Speed)'],
    ['end','END (Defense)'],['lck','LCK (Crit/Drop)'],
  ].map(([k,label])=>`
    <div class="stat-line"><span>${label}</span><span>${s[k]}
      <button style="${btnStyle}" onclick="spendStat('${k}')">+</button>
    </span></div>`).join('');
  stats.innerHTML=`
    <div class="stat-line" style="color:#8BC34A;font-weight:bold"><span>Level ${G.level}</span><span>${G.xp} / ${xpNeeded} XP</span></div>
    ${G.statPoints>0?`<div class="stat-line" style="color:#FFD700"><span>Unspent Points</span><span>${G.statPoints} ★</span></div>`:''}
    ${statRows}
    <div class="stat-line" style="margin-top:6px"><span>HP</span><span>${G.hp} / ${G.maxHp}</span></div>
    <div class="stat-line" style="margin-top:6px;color:#FDD835"><span>🪙 Spacebucks</span><span>${G.spacebucks}</span></div>
    <div class="stat-line" style="color:#888"><span>💀 Schmeckles</span><span>${G.schmeckles}</span></div>
    <div class="stat-line" style="color:#4CAF50"><span>$ alUSD</span><span>${G.alUSD.toFixed(2)}</span></div>
    <div class="stat-line" style="color:#7B68EE"><span>⟠ alETH</span><span>${G.alETH.toFixed(4)}</span></div>
    <div class="stat-line" style="color:#9C27B0"><span>⚗ ALCX${G.lockedAlcx>0?' (🔒'+G.lockedAlcx+' locked)':''}</span><span>${G.alcx}</span></div>
  `;
  // Quest log
  const qBox=document.getElementById('quest-log-box');
  if(qBox){
    const qids=Object.keys(G.quests);
    let qHtml='';
    if(qids.length===0){
      qHtml='<div style="color:#444;font-size:.7rem;margin-top:4px">No active quests. Talk to NPCs in town!</div>';
    } else {
      qids.forEach(qid=>{
        const qs=G.quests[qid];
        const qdef=QUEST_DEFS[qid];
        const col=qs.status==='completed'?'#444':qs.status==='ready'?'#4CAF50':'#aaa';
        const badge=qs.status==='completed'?'✓ Done':qs.status==='ready'?'★ READY!':qs.progress+'/'+qdef.required;
        qHtml+=`<div class="stat-line" style="color:${col}"><span>${qdef.title}</span><span>${badge}</span></div>`;
      });
    }
    qBox.innerHTML=qHtml;
  }
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function chatLog(msg,color='#ccc'){
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
function animateTitle(){
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
function buildCreateScreen(){
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
    drawPlayerSprite(previewCtx,60/scale-12,40/scale,2,G.color,0,false,false,G.species,G.hairColor,G.accessory);
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
      // labels: class floor lock + species cap
      const meta=document.createElement('span');
      meta.style.cssText='font-size:.62rem;margin-left:5px;white-space:nowrap;color:#555';
      meta.textContent=floorVal?`🔒${floorVal} cap${cap}`:`cap${cap}`;
      row.appendChild(lbl);row.appendChild(bar);row.appendChild(meta);
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
  });
}

// ── MAIN GAME LOOP ────────────────────────────────────────────────────────────
let lastTime=0;
function gameLoop(ts){
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
    updateCamera();
    // Update music: world zone switches between town/wilderness tracks by position
    if(G.zone==='world'){const _tx=Math.floor(G.x/TS),_ty=Math.floor(G.y/TS);musPlay((_tx>=TOWN_OX&&_tx<TOWN_OX+MAP_W&&_ty>=TOWN_OY&&_ty<TOWN_OY+MAP_H)?'world':'wilderness');}
    // scroll tile layer when camera moves
    renderTileLayer();
    // render BG
    ctxBG.clearRect(0,0,W,H);
    drawBackground(ctxBG,G.zone,G.camX,G.camY,W,H,G.tick);
    // render sprites
    renderSpriteLayer(ctxSprites);
    // foreground tile layer (z:4) — tree canopies, column capitals above player
    renderFgLayer(ctxFg);
    // ceiling layer (z:5) — interior zone ceiling art above everything
    renderCeiling(ctxCeiling,G.zone,W,H,G.tick);
    // HUD + minimap
    renderHUD();
    ctxUI.clearRect(0,0,W,H);
    renderMinimap(ctxUI);
    // Governance Hall: treasury + live prices panel
    if(G.zone==='governance')renderGovernancePanel(ctxUI);
    // ALCX queue drip
    if(G.queueState&&G.queueState.ticket&&!G.queueState.served&&G.tick%300===0){
      // Seniority accumulates while actively in the queue (not yet served)
      if(!G.queueState.served)(G.zoneSeniority=(G.zoneSeniority||0)+1);
      // ALCX drip scales with seniority (1 base + 1 per 3 seniority points)
      const drip=1+Math.floor((G.zoneSeniority||0)/3);
      G.alcx+=drip;
      const bonusStr=drip>1?` (seniority bonus ×${drip})`:'';
      chatLog(`⚗ Queue: +${drip} ALCX earned${bonusStr}`,'#9C27B0');
    }
    // Bank: local yield repayment (server handles earmarking/transmuter globally every 60s)
    if(G.bankPositions&&G.bankPositions.length>0&&G.tick%180===0){
      let anyRepaid=false;
      G.bankPositions.forEach(pos=>{
        if(pos.claimed||pos.debt<=0.001)return;
        const payment=Math.min(pos.debt,pos.borrowed*0.005);
        pos.debt=Math.max(0,pos.debt-payment);
        if(pos.debt<=0.001&&!pos.claimed){
          pos.debt=0;
          chatLog(`✨ Bank position fully repaid! Visit Banker Alyx to claim your ${pos.collateral==='spacebucks'?'Spacebucks':'Schmeckles'}.`,'#FFD700');
          SFX.coin();
        }
        anyRepaid=true;
      });
      if(anyRepaid)socket?.emit('bank_sync',{bankPositions:G.bankPositions});
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
let ctxBG,ctxSprites,ctxUI,ctxCeiling,ctxFg;
function setupCanvases(){
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
function saveState(){
  if(!G.persist)return;
  const s={
    _accountId:G_accountId||'',  // tag state with account so cross-user bleed is detectable
    nickname:G.nickname,color:G.color,hairColor:G.hairColor,
    species:G.species,class_:G.class_,
    spacebucks:G.spacebucks,schmeckles:G.schmeckles,alUSD:G.alUSD,alETH:G.alETH,
    alcx:G.alcx,lockedAlcx:G.lockedAlcx,bankPositions:G.bankPositions,
    transmuterDeposits:G.transmuterDeposits,
    stats:G.stats,hp:G.hp,maxHp:G.maxHp,mp:G.mp,maxMp:G.maxMp,
    xp:G.xp,level:G.level,statPoints:G.statPoints,
    inventory:G.inventory,accessory:G.accessory,maxInvSlots:G.maxInvSlots,
    quests:G.quests,dungeonBossDefeated:G.dungeonBossDefeated,
    cavernBossDefeated:G.cavernBossDefeated,hideoutBossDefeated:G.hideoutBossDefeated,
    ruinsBossDefeated:G.ruinsBossDefeated,villageBossDefeated:G.villageBossDefeated,
    kills:G.kills||0,zoneSeniority:G.zoneSeniority||0,
  };
  localStorage.setItem('vq_state',JSON.stringify(s));
}
function loadState(){
  try{
    const s=JSON.parse(localStorage.getItem('vq_state'));
    if(!s)return;
    G.nickname=s.nickname||G.nickname;
    G.color=s.color||G.color;
    G.hairColor=s.hairColor||G.hairColor;
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

// ── SOCKET.IO ─────────────────────────────────────────────────────────────────
let socket,others={};
let G_accountId=null;

function initSocket(){
  if(socket)return; // already initialized
  socket=io();

  // ── Auth ──
  socket.on('connect',()=>{
    document.getElementById('login-connecting').textContent='';
  });
  socket.on('auth_result',result=>{
    const errEl=document.getElementById('login-error');
    if(!result.ok){errEl.textContent=result.error;return;}
    G_accountId=result.username;
    errEl.textContent='';
    if(result._tampered){
      chatLog('⚠ Save data integrity check failed. Starting fresh.','#FF4444');
    }
    if(result.data){
      // Returning player — load server state; clear any stale localStorage from a different account
      try{
        const ls=JSON.parse(localStorage.getItem('vq_state')||'null');
        if(ls&&ls._accountId&&ls._accountId.toLowerCase()!==(result.username||'').toLowerCase())
          localStorage.removeItem('vq_state');
      }catch(e){}
      applyServerState(result.data);
      startGame();
    } else {
      // New account (or deleted account re-registered) — wipe any localStorage that belongs to
      // a different user so their stats don't bleed into the new character creation flow.
      try{
        const ls=JSON.parse(localStorage.getItem('vq_state')||'null');
        if(ls&&ls._accountId&&ls._accountId.toLowerCase()!==(result.username||'').toLowerCase())
          localStorage.removeItem('vq_state');
      }catch(e){}
      showScreen('screen-title');
      musPlay('title');
    }
  });

  // ── Game events ──
  socket.on('welcome',data=>{
    document.getElementById('hud-players').textContent=`${data.count} online`;
  });
  socket.on('player_joined',data=>{
    // Seed interpolation targets so player appears at correct spot immediately
    data.targetX=data.x; data.targetY=data.y;
    others[data.id]=data;
    document.getElementById('hud-players').textContent=`${1+Object.keys(others).length} online`;
  });
  socket.on('player_left',id=>{
    delete others[id];
    document.getElementById('hud-players').textContent=`${1+Object.keys(others).length} online`;
  });
  // Legacy per-event fallback (server no longer sends this for movement, only kept for compatibility)
  socket.on('player_moved',data=>{
    if(!others[data.id])return;
    const o=others[data.id];
    if(Math.abs(data.x-o.x)>300||Math.abs(data.y-o.y)>300){o.x=data.x;o.y=data.y;}
    o.targetX=data.x;o.targetY=data.y;
    o.dir=data.dir;o.frame=data.frame;o.moving=data.moving;
  });
  // 20Hz server position tick — primary sync mechanism with dead reckoning
  socket.on('zone_pos_tick',data=>{
    const now=Date.now();
    // Clamp estimated one-way lag between 0 and 250ms
    const lag=Math.min(250,Math.max(0,now-data.t));
    const BASE_PX_S=132; // 2.2px/frame * 60fps — baseline player speed
    data.players.forEach(pd=>{
      if(pd.id===socket.id)return; // skip self
      const o=others[pd.id];
      if(!o)return; // player_joined handles initialization
      // Snap if teleported (zone entry etc.)
      if(Math.abs(pd.x-o.x)>300||Math.abs(pd.y-o.y)>300){o.x=pd.x;o.y=pd.y;}
      // Dead reckoning: extrapolate position forward by network lag
      let ex=pd.x,ey=pd.y;
      if(pd.moving&&lag>5){
        const dt=lag/1000;
        if(pd.dir==='right')ex+=BASE_PX_S*dt;
        else if(pd.dir==='left')ex-=BASE_PX_S*dt;
        if(pd.dir==='down')ey+=BASE_PX_S*dt;
        else if(pd.dir==='up')ey-=BASE_PX_S*dt;
      }
      o.targetX=ex;o.targetY=ey;
      o.dir=pd.dir;o.frame=pd.frame;o.moving=pd.moving;
    });
  });
  socket.on('zone_players',list=>{
    others={};
    list.forEach(p=>{
      p.targetX=p.x; p.targetY=p.y; // seed interpolation targets
      others[p.id]=p;
    });
    document.getElementById('hud-players').textContent=`${1+Object.keys(others).length} online`;
  });
  socket.on('chat',data=>{
    chatLog(`[${data.nickname}] ${data.text}`,'#aef');
  });
  socket.on('queue_state',state=>{
    serverQueues[state.zone]=state;
    updateQueuePanel();
  });
  socket.on('queue_served',data=>{
    const qs=G.queueState;
    if(qs&&qs.zone===data.zone&&qs.type===data.queueType){
      qs.served=data.ticket;
      if(qs.ticket===data.ticket){
        chatLog(`🎫 You're up! Enter ${data.zone} now.`,'#00FF88');
        document.getElementById('queue-enter-btn').style.display='block';
      }
      updateQueuePanel();
    }
  });
  socket.on('queue_joined',data=>{
    if(G.queueState){
      G.queueState.ticket=data.ticket;
      // Do NOT copy data.serving into served — served is only set by queue_served event
      SFX.ticket();
      updateQueuePanel();
    }
  });

  // Global bank redemption: server updated our positions
  socket.on('bank_positions_updated',data=>{
    G.bankPositions=data.bankPositions;
    G.bankPositions.forEach(pos=>{
      if(pos.debt<=0.001&&!pos.claimed){
        chatLog(`✨ Bank position fully repaid! Visit Banker Alyx to claim your ${pos.collateral==='spacebucks'?'Spacebucks':'Schmeckles'}.`,'#FFD700');
        SFX.coin();
      }
    });
    if(document.getElementById('bank-ui').style.display!=='none')renderBankUI();
  });

  // Global transmuter payout: server distributed redeemed collateral
  socket.on('transmuter_payout',data=>{
    G.transmuterDeposits=data.transmuterDeposits;
    if(data.sbPayout>0||data.schmPayout>0){
      chatLog(`⚗ Transmuter: global redemption — ${data.sbPayout>0?data.sbPayout.toFixed(2)+' 🪙 ':''}`+
              `${data.schmPayout>0?data.schmPayout.toFixed(4)+' 💀 ':''}ready to claim!`,'#4FC3F7');
      SFX.coin();
    }
    if(document.getElementById('transmuter-ui').style.display!=='none')renderTransmuterUI();
  });
  socket.on('world_event_start',d=>{
    G.worldEvent=d;
    chatLog(`${d.icon} WORLD EVENT: ${d.name} — ${d.desc}`,'#FF8C00');
    SFX.levelUp();
  });
  socket.on('world_event_end',d=>{
    if(G.worldEvent?.type===d.type)G.worldEvent=null;
    chatLog('The world event has ended.','#888');
  });
  socket.on('world_loot_init',data=>{G.worldLoot=data.piles||[];});
    socket.on('world_loot_added',data=>{if(!G.worldLoot.find(l=>l.id===data.pile.id))G.worldLoot.push(data.pile);});
    socket.on('world_loot_removed',data=>{G.worldLoot=G.worldLoot.filter(l=>l.id!==data.id);});
    socket.on('loot_claimed',data=>{
      if(!data.ok){chatLog(data.error||'Loot gone.','#FF4444');return;}
      G.spacebucks+=data.currencies.spacebucks;
      G.schmeckles+=data.currencies.schmeckles;
      G.alUSD=parseFloat((G.alUSD+data.currencies.alUSD).toFixed(2));
      let itemsFit=0, itemsLost=0;
      data.items.forEach(item=>{
        const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
        if(slot!==-1){G.inventory[slot]=item;itemsFit++;}
        else itemsLost++;
      });
      G.worldLoot=G.worldLoot.filter(l=>l.id!==data.lootId);
      const c=data.currencies;
      const got=[c.spacebucks&&`+${c.spacebucks}🪙`,c.schmeckles&&`+${c.schmeckles}💀`,c.alUSD&&`+${c.alUSD}$`].filter(Boolean).join(' ');
      chatLog(`💰 Found ${data.fromPlayer}'s loot! ${got||'coins'} + ${itemsFit} item(s) (${Math.round(data.decayPct*100)}% decayed)`,'#FFD700');
      if(itemsLost>0)chatLog(`⚠ ${itemsLost} item(s) lost — inventory full! Free a slot before looting.`,'#FF8800');
      SFX.coin();saveToServer();
    });
    socket.on('market_state',data=>{
      G.marketListings=data.listings||[];
      if(document.getElementById('market-ui').style.display!=='none')renderMarketUI();
    });
    socket.on('market_buy_result',data=>{
      if(data.ok){
        if(data.currency==='alETH')G.alETH=parseFloat((G.alETH-data.price).toFixed(4));
        else G.alUSD=parseFloat((G.alUSD-data.price).toFixed(2));
        const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
        if(slot!==-1)G.inventory[slot]=data.item;
        chatLog(`Bought ${data.item.name} from ${data.sellerName}!`,'#4CAF50');
        SFX.buy();saveToServer();
        if(document.getElementById('market-ui').style.display!=='none')renderMarketUI();
      }else{chatLog('Purchase failed: '+data.error,'#FF4444');SFX.error();}
    });
    socket.on('market_sale_notify',data=>{
      if(data.currency==='alETH')G.alETH=parseFloat((G.alETH+data.payout).toFixed(4));
      else G.alUSD=parseFloat((G.alUSD+data.payout).toFixed(2));
      chatLog(`★ Your ${data.item.name} sold for ${data.payout.toFixed(2)} ${data.currency}! (5% fee taken)`,'#FFD700');
      saveToServer();
    });
    socket.on('market_list_ok',data=>{
      // Remove from local inventory by matching name (server already removed from pdb)
      const sl=G.inventory.findIndex((item,i)=>i>=2&&item&&item.name===data.listing.item.name);
      if(sl!==-1)G.inventory[sl]=null;
      chatLog(`Listed ${data.listing.item.name} for ${data.listing.price} ${data.listing.currency}.`,'#B080FF');
      SFX.buy();saveToServer();
      if(document.getElementById('market-ui').style.display!=='none')renderMarketUI();
    });
    socket.on('market_cancel_ok',data=>{
      const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
      if(slot!==-1)G.inventory[slot]=data.item;
      chatLog(`Listing cancelled. ${data.item.name} returned to inventory.`,'#888888');
      saveToServer();
      if(document.getElementById('market-ui').style.display!=='none')renderMarketUI();
    });
    socket.on('market_error',data=>{chatLog(data.error,'#FF4444');SFX.error();});

    // ── Live Prices ──────────────────────────────────────────────────────────
    socket.on('price_update',data=>{
      if(data.prices)applyLivePrices(data.prices);
      // Refresh exchange UI if open
      if(document.getElementById('exchange-ui').style.display!=='none')renderExchangeUI();
    });
    socket.on('price_event',data=>{
      if(!data.msg)return;
      chatLog(`📣 Town Crier: ${data.msg}`,'#FFD54F');
      SFX.select();
    });

    // ── Treasury ─────────────────────────────────────────────────────────────
    socket.on('treasury_update',data=>{
      if(data.treasury)G.treasury={...data.treasury};
    });

    // ── Admin kick ───────────────────────────────────────────────────────────
    socket.on('kicked',data=>{
      const msg=data?.reason||'You have been removed from the server.';
      socket.disconnect();
      document.body.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#050810;color:#FF4444;font-family:monospace;text-align:center;gap:16px"><div style="font-size:1.2rem">⚠ ${msg}</div><a href="/" style="color:#B080FF;font-size:.9rem">← Return to login</a></div>`;
    });

    // ── Snowball Enemies ──────────────────────────────────────────────────────
    socket.on('snowball_init',data=>{G.snowballEnemies=data.enemies||[];});
    socket.on('snowball_spawned',data=>{
      if(!G.snowballEnemies.find(e=>e.id===data.enemy.id))G.snowballEnemies.push(data.enemy);
      chatLog(`⚔ ${data.enemy.name} has appeared in the wilderness — seek it for bonus loot!`,'#FF6030');
    });
    socket.on('snowball_updated',data=>{
      const idx=G.snowballEnemies.findIndex(e=>e.id===data.enemy.id);
      if(idx>=0)G.snowballEnemies[idx]=data.enemy;else G.snowballEnemies.push(data.enemy);
    });
    socket.on('snowball_removed',data=>{
      G.snowballEnemies=G.snowballEnemies.filter(e=>e.id!==data.id);
    });
    socket.on('snowball_kill_result',data=>{
      if(!data.ok)return;
      const loot=data.loot||{};
      G.spacebucks+=(loot.spacebucks||0);
      G.schmeckles+=(loot.schmeckles||0);
      G.alUSD=parseFloat((G.alUSD+(loot.alUSD||0)).toFixed(2));
      (loot.items||[]).forEach(item=>{const sl=G.inventory.findIndex((s,i)=>i>=2&&s===null);if(sl!==-1)G.inventory[sl]=item;});
      const parts=[loot.spacebucks&&`+${loot.spacebucks}🪙`,loot.schmeckles&&`+${loot.schmeckles}💀`,loot.alUSD&&`+${loot.alUSD}$`,loot.items?.length&&`+${loot.items.length} items`].filter(Boolean).join(' ');
      const decayNote=data.decayPct?` (${Math.round(data.decayPct*100)}% item decay)`:'';
      chatLog(`★ Vanquished ${data.name} (${data.kills}-kill streak)! Bonus loot: ${parts||'none'}${decayNote}`,'#FF8C00');
      SFX.coin();saveToServer();
    });

    // ── Graffiti ─────────────────────────────────────────────────────────────
    socket.on('graffiti_state',data=>{G.graffiti=data.graffiti||[];});

    // ── Hall of Fame ──────────────────────────────────────────────────────────
    socket.on('hall_of_fame',data=>{
      G.hallOfFame=data||{topXP:[],topKills:[],topGold:[]};
    });

    // ── Governance ────────────────────────────────────────────────────────────
    socket.on('gov_state',data=>{
      G.govProposals=data.proposals||[];
      G.earmarkRate=data.earmarkRate||0.005;
      if(document.getElementById('governance-ui')?.style.display!=='none')renderGovernanceUI();
    });
    socket.on('gov_result',data=>{
      if(data.ok){
        if(data.choice)chatLog(`✅ Vote cast: ${data.choice.toUpperCase()} (${data.weight?.toFixed(1)} ALCX weight, ${data.timeLeft}m left)`,'#9C27B0');
        else chatLog('📜 Governance proposal submitted!','#9C27B0');
      }else chatLog('Gov: '+data.error,'#FF4444');
      if(document.getElementById('governance-ui')?.style.display!=='none')renderGovernanceUI();
    });

    // ── Auction ───────────────────────────────────────────────────────────────
    socket.on('auction_result',data=>{
      if(data.ok){
        chatLog(`⚡ Queue skip confirmed! Bid ${data.alcx} ALCX. ${data.others} others each earned ${data.share} ALCX.`,'#FFD700');
        SFX.buy();
        updateQueuePanel();
        // Flash the queue panel header gold to give visible "jumped" feedback
        const hdr=document.getElementById('queue-header');
        const tkn=document.getElementById('queue-ticket-num');
        if(hdr){
          const orig=hdr.style.color;
          hdr.style.color='#FFD700';hdr.style.textShadow='0 0 8px #FFD700';
          setTimeout(()=>{hdr.style.color=orig;hdr.style.textShadow='';},1500);
        }
        if(tkn){
          const orig=tkn.style.color;
          tkn.textContent='⚡ FRONT!';tkn.style.color='#FFD700';
          setTimeout(()=>{tkn.style.color=orig;updateQueuePanel();},1500);
        }
      }else{chatLog('Auction: '+data.error,'#FF4444');SFX.error();}
    });
    socket.on('auction_payout',data=>{
      G.alcx=parseFloat((G.alcx+(data.amount||0)).toFixed(4));
      chatLog(`⚡ ${data.bidderName} skipped the queue — you earned +${data.amount} ALCX!`,'#9C27B0');
      renderHUD();
    });
}

function joinGameServer(){
  if(!socket)return;
  const doJoin=()=>{
    socket.emit('join',{
      nickname:G.nickname,color:G.color,hairColor:G.hairColor,
      species:G.species,class_:G.class_,zone:G.zone,x:G.x,y:G.y,
      accessory:G.accessory,maxInvSlots:G.maxInvSlots,
    });
  };
  if(socket.connected)doJoin();
  else socket.once('connect',doJoin);
}

function applyServerState(s){
  if(!s)return;
  G.nickname=s.nickname||G.nickname;
  G.color=s.color||G.color;
  G.hairColor=s.hairColor||G.hairColor;
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
  G.maxHp=s.maxHp||G.maxHp;
  G.hp=Math.min(s.hp||G.hp,G.maxHp);
  if(s.maxMp) G.maxMp=s.maxMp;
  if(s.mp!=null) G.mp=Math.min(s.mp,G.maxMp);
  G.xp=s.xp??0;
  G.level=s.level??1;
  G.statPoints=s.statPoints??0;
  if(Array.isArray(s.inventory))G.inventory=s.inventory;
  if(s.accessory!==undefined)G.accessory=s.accessory;
  if(s.maxInvSlots!=null)G.maxInvSlots=s.maxInvSlots;
  while(G.inventory.length<G.maxInvSlots)G.inventory.push(null);
  G.quests=s.quests||{};
  G.dungeonBossDefeated=s.dungeonBossDefeated||false;
  G.cavernBossDefeated=s.cavernBossDefeated||false;
  G.hideoutBossDefeated=s.hideoutBossDefeated||false;
  G.ruinsBossDefeated=s.ruinsBossDefeated||false;
  G.villageBossDefeated=s.villageBossDefeated||false;
  if(s.kills!=null)G.kills=s.kills;
  if(s.zoneSeniority!=null)G.zoneSeniority=s.zoneSeniority;
  if(s._shownQueueTip!=null)G._shownQueueTip=s._shownQueueTip;
}

function saveToServer(){
  if(!socket||!G_accountId)return;
  socket.emit('save_character',{
    nickname:G.nickname,color:G.color,hairColor:G.hairColor,
    species:G.species,class_:G.class_,
    spacebucks:G.spacebucks,schmeckles:G.schmeckles,alUSD:G.alUSD,alETH:G.alETH,
    alcx:G.alcx,lockedAlcx:G.lockedAlcx,bankPositions:G.bankPositions,
    stats:G.stats,hp:G.hp,maxHp:G.maxHp,mp:G.mp,maxMp:G.maxMp,
    transmuterDeposits:G.transmuterDeposits,
    xp:G.xp,level:G.level,statPoints:G.statPoints,
    inventory:G.inventory,accessory:G.accessory,maxInvSlots:G.maxInvSlots,
    quests:G.quests,dungeonBossDefeated:G.dungeonBossDefeated,
    cavernBossDefeated:G.cavernBossDefeated,hideoutBossDefeated:G.hideoutBossDefeated,
    ruinsBossDefeated:G.ruinsBossDefeated,villageBossDefeated:G.villageBossDefeated,
    kills:G.kills||0,
    zoneSeniority:G.zoneSeniority||0,
    _shownQueueTip:G._shownQueueTip||false,
  });
}
function updateOnlineCount(){
  document.getElementById('hud-players').textContent=`${1+Object.keys(others).length} online`;
}

// ── BOOT ─────────────────────────────────────────────────────────────────────
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startGame(){
  showScreen('screen-game');
  setupCanvases();
  buildTileCache();
  // Build 3 animated water frames (phase 0,1,2 shift ripples by 0,4,8 px)
  WATER_FRAMES=[0,1,2].map(phase=>{const c=document.createElement('canvas');c.width=c.height=TS;drawWaterAnimated(c.getContext('2d'),phase);return c;});
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
  socket?.emit('queue_leave',{zone,queueType:type});
  G.alcx+=G.lockedAlcx;G.lockedAlcx=0;G.queueState=null;
  updateQueuePanel();
  const key=type==='entry'?`world_${zone}`:`${zone}_exit`;
  const door=ZONE_DOORS[key];
  if(door)changeZone(door.to,door.sx,door.sy);
});
document.getElementById('queue-leave-btn')?.addEventListener('click',()=>{
  if(!G.queueState)return;
  socket?.emit('queue_leave',{zone:G.queueState.zone,queueType:G.queueState.type});
  G.alcx+=G.lockedAlcx;G.lockedAlcx=0;G.queueState=null;
  updateQueuePanel();
  chatLog('Left the queue.','#888');
});

// ── In-game confirm touch buttons ────────────────────────────────────────────
document.getElementById('npc-btn-yes')?.addEventListener('click',()=>_dismissConfirm(true));
document.getElementById('npc-btn-no')?.addEventListener('click',()=>_dismissConfirm(false));
// Tap the dialog body (outside buttons) to advance info dialogs on mobile
document.getElementById('npc-dialog-inner')?.addEventListener('click',()=>{
  if(G.npcDialog&&!(G._pendingConfirm&&!G._pendingConfirm._info&&G.npcDialog.lineIdx>=G.npcDialog.dialog.length-1))
    advanceDialog();
});

// ── Battle canvas click / key handler ─────────────────────────────────────────
document.getElementById('cv-ui').addEventListener('click',e=>{
  const bt=G.battle;if(!bt)return;
  // Result overlay: click anywhere to dismiss and continue
  if(bt.result){endBattle();return;}
  if(bt.phase!=='player_turn')return;
  const rect=e.target.getBoundingClientRect();
  const scale=W/rect.width;
  const mx=(e.clientX-rect.left)*scale;
  const my=(e.clientY-rect.top)*scale;
  for(const[action,btn] of Object.entries(BATTLE_BTNS)){
    if(mx>=btn.x&&mx<=btn.x+btn.w&&my>=btn.y&&my<=btn.y+btn.h){
      doBattleAction(action);return;
    }
  }
});

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
