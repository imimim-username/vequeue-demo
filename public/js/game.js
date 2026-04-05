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
  earmarkRate:0.005,    // current earmark rate (from server)
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

// ── FULLSCREEN (mobile) ────────────────────────────────────────────────────────
(function(){
  const btn=document.getElementById('btn-fullscreen');
  if(!btn)return;

  // Detect iOS Safari (Fullscreen API not supported in-browser on iOS)
  const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)&&!window.MSStream;
  // Check if running as installed PWA (standalone) — already fullscreen on iOS
  const isStandalone=window.navigator.standalone===true||
    window.matchMedia('(display-mode: standalone)').matches;

  function isFullscreen(){
    return !!(document.fullscreenElement||document.webkitFullscreenElement);
  }

  function showToast(msg,ms=3500){
    const t=document.getElementById('fs-toast');
    if(!t)return;
    t.textContent=msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'),ms);
  }

  function updateBtn(){
    btn.textContent=isFullscreen()?'✕':'⛶';
    document.body.classList.toggle('fullscreen',isFullscreen());
  }

  function enterFullscreen(){
    const el=document.documentElement;
    const req=el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen;
    if(req){
      req.call(el).then(()=>{
        // Try landscape lock — gracefully ignore if API unsupported
        try{screen.orientation?.lock('landscape').catch(()=>{});}catch(_){}
      }).catch(()=>showToast('Fullscreen blocked by browser.'));
    } else if(isIOS&&!isStandalone){
      showToast('Tap the share button ⬆ then "Add to Home Screen" for fullscreen mode on iOS.');
    } else {
      showToast('Fullscreen not supported in this browser.');
    }
  }

  function exitFullscreen(){
    const exit=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen;
    if(exit)exit.call(document).catch(()=>{});
    try{screen.orientation?.unlock();}catch(_){}
  }

  btn.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(isFullscreen()) exitFullscreen(); else enterFullscreen();
  },{passive:false});
  // Fallback for non-touch (desktop testing)
  btn.addEventListener('click',()=>{
    if(isFullscreen()) exitFullscreen(); else enterFullscreen();
  });

  // Keep button in sync when fullscreen state changes externally (e.g. Esc key)
  document.addEventListener('fullscreenchange',updateBtn);
  document.addEventListener('webkitfullscreenchange',updateBtn);

  // If already in standalone/PWA fullscreen, hide the button (not needed)
  if(isStandalone)btn.style.display='none';
})();

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
    // During battle the cv-ui touchstart handler owns the event — don't interfere
    if(G.battle) return;
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
// ── Exploration ability helpers ───────────────────────────────────────────────
function _playerHasEffect(effect){
  if(G.accessory?.effect===effect||G.accessory?.effect==='raftAndForest')return true;
  return G.inventory.some(it=>it&&(it.effect===effect||it.effect==='raftAndForest'));
}
function hasRaft(){return _playerHasEffect('raft');}
function hasForestPass(){return _playerHasEffect('forestPass');}

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
      clearTimeout(G._queueServTimer);G._queueServExpiry=null;
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
    const fee=Math.max(1,Math.floor((G.alcx||0)*0.05));
    fastExitEl.innerHTML=`<button onclick="doFastExit(${fee})" style="width:100%;padding:3px 0;background:#1A0A00;border:1px solid #FF8C00;color:#FF8C00;cursor:pointer;border-radius:3px;font-family:monospace;font-size:.7rem">⚡ Fast Exit (${fee} ALCX)</button><div style="font-size:.6rem;color:#555;text-align:center;margin-top:2px">Skip the exit queue — fee goes to treasury</div>`;
    fastExitEl.style.display='block';
  }else{fastExitEl.style.display='none';}

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
  // Weight weapon damage at 0.85 (was 0.5) so buying better gear properly pushes
  // enemy scaling to match the real attack increase, closing the gear-power gap.
  return avg+wdmg*0.85;
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
function spendStat(st){
  if(G.statPoints<=0)return;
  G.stats[st]++;
  if(!G.pendingStats)G.pendingStats={str:0,vit:0,agi:0,end:0,lck:0};
  G.pendingStats[st]=(G.pendingStats[st]||0)+1;
  G.statPoints--;
  if(st==='vit'){G.maxHp++;G.hp=Math.min(G.maxHp,G.hp+1);}
  renderInventoryScreen();
}

// Refund one spent-this-session stat point back to the pool.
function refundStat(st){
  if(!G.pendingStats||(G.pendingStats[st]||0)<=0)return;
  G.stats[st]--;
  G.pendingStats[st]--;
  G.statPoints++;
  if(st==='vit'){G.maxHp--;G.hp=Math.min(G.maxHp,G.hp);}
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

// Outpost safe zones — quest-giver buildings in the wilderness. No encounters near them.
// Format: {tx, ty, r} — tile centre + Manhattan radius
const OUTPOST_SAFE_ZONES=[
  {tx:70,  ty:10,  r:9},  // Crystal Cavern outpost (NW)
  {tx:40,  ty:120, r:9},  // Bandit Hideout outpost (SW)
  {tx:186, ty:9,   r:9},  // Ancient Ruins outpost (NE)
  {tx:96,  ty:106, r:9},  // Abandoned Village outpost (S)
];
function isNearOutpost(){
  const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
  return OUTPOST_SAFE_ZONES.some(o=>Math.abs(tx-o.tx)+Math.abs(ty-o.ty)<=o.r);
}

function checkEncounter(){
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
  cavern:  {pool:['iceTroll','iceTroll','wolf','stoneGolem'],          rate:0.20, depth:25},
  hideout: {pool:['bandit','bandit','voidMage','wolf'],                rate:0.22, depth:20},
  ruins:   {pool:['specter','wraith','skeleton','shadowMage'],         rate:0.20, depth:28},
  village: {pool:['ruinGuardian','stoneGolem','shadowMage','skeleton'],rate:0.18, depth:30},
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

// Water encounter — triggered when rafting across rivers or lakes
function checkWaterEncounter(){
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
function checkForestEncounter(){
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

function triggerBattle(key,depth=0){
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
    anims:[],
  };
  G.paused=true;
  document.getElementById('cv-ui').style.pointerEvents='auto';
  SFX.battleStart();
  musPlay('battle');
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

function renderBattleScreen(){
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
function spendMp(cost){
  if(G.mp<cost)return false;
  G.mp=Math.max(0,G.mp-cost);
  return true;
}

// ── Combat math ───────────────────────────────────────────────────────────────

// ── Battle animation helpers ──────────────────────────────────────────────────
const BT_ANIM={LUNGE:22,FLASH:8,FLOAT:55,PART:40,SFLASH:20,DISSOLVE:50};
function btAnim(type,props){if(G.battle)(G.battle.anims=G.battle.anims||[]).push({type,born:G.tick,...props});}
function btParticles(x,y,color,n=12){
  const vels=[];
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2,spd=1.5+Math.random()*2;vels.push({vx:Math.cos(a)*spd,vy:Math.sin(a)*spd});}
  btAnim('particles',{x,y,color,vels});
}
// Enemy sprite visual center (sprite drawn at x=70, y=20; ~80×100px body)
const ENM_CX=150,ENM_CY=85;
// Enemy hit-box rect for flash
const ENM_FX=52,ENM_FY=8,ENM_FW=186,ENM_FH=198;

function doBattleAction(action){
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

function doEnemyTurn(){
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

function endBattle(){
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

// ── Market ─────────────────────────────────────────────────────────────────────
let _marketTab='browse';
function openMarket(){G.paused=true;_marketTab='browse';renderMarketUI();document.getElementById('market-ui').style.display='block';}
function closeMarket(){G.paused=false;document.getElementById('market-ui').style.display='none';}
function openGovernance(){G.paused=true;renderGovernanceUI();document.getElementById('governance-ui').style.display='flex';}
function closeGovernance(){G.paused=false;document.getElementById('governance-ui').style.display='none';}
function renderGovernanceUI(){
  const el=document.getElementById('gov-content');if(!el)return;
  const rate=(G.earmarkRate||0.005)*100;
  const quorum=G.govQuorum||50;
  const prop=G.govProposals.find(p=>p.passed===null);
  // Voting stake = ALCX locked inside a veQueue zone (queue entry stake)
  const queueStake=G.lockedAlcx||0;
  const voteCommitted=G.alcxVoteLock||0;
  const voteAvailable=Math.max(0,parseFloat((queueStake-voteCommitted).toFixed(4)));

  let html=`<div style="color:#FFD700;margin-bottom:6px">Current Earmark Rate: <b>${rate.toFixed(2)}%</b></div>`;
  html+=`<div style="color:#888;font-size:.72rem;margin-bottom:8px">% of debt redeemed per 5-min tick. Higher = faster repayment & more transmuter yield.</div>`;

  // Voting stake status panel
  html+=`<div style="background:#0D0020;border:1px solid #3A2060;border-radius:4px;padding:7px;margin-bottom:10px;font-size:.73rem">`;
  html+=`<div style="color:#B080FF;margin-bottom:3px">⚗ Your Governance Stake (queue-locked ALCX)</div>`;
  if(queueStake>0){
    html+=`<div style="color:#eee">Total queue stake: <b>${queueStake.toFixed(1)} ALCX</b></div>`;
    if(voteCommitted>0)html+=`<div style="color:#9C27B0">🗳 Committed to active vote: ${voteCommitted.toFixed(1)} ALCX</div>`;
    html+=`<div style="color:#4CAF50">Available to vote: ${voteAvailable.toFixed(1)} ALCX</div>`;
  }else{
    html+=`<div style="color:#FF5722">⚠ No queue stake found.</div>`;
    html+=`<div style="color:#888;margin-top:2px">Join the Marketplace or Treasury entry queue to lock ALCX as your governance stake. Only locked participants can vote.</div>`;
  }
  html+=`</div>`;

  if(prop){
    const msLeft=Math.max(0,prop.endsAt-Date.now());
    const hLeft=Math.floor(msLeft/3600000);
    const mLeft=Math.floor((msLeft%3600000)/60000);
    const timeStr=hLeft>0?`${hLeft}h ${mLeft}m`:`${mLeft}m`;
    const total=prop.yesWeight+prop.noWeight;
    const yesPct=total>0?Math.round(prop.yesWeight/total*100):0;
    const quorumPct=Math.min(100,Math.round(total/quorum*100));
    const alreadyVoted=!!(prop.votes&&prop.votes[G_accountId]);
    html+=`<div style="border:1px solid #5A3A80;border-radius:6px;padding:10px;margin-bottom:10px">`;
    html+=`<div style="color:#B080FF;font-weight:bold;margin-bottom:4px">📜 Active Proposal #${prop.id}</div>`;
    html+=`<div style="font-size:.75rem;color:#ccc">Proposer: ${prop.proposerName}</div>`;
    html+=`<div style="font-size:.8rem;margin:4px 0">New earmark rate: <b style="color:#FFD700">${(prop.value*100).toFixed(2)}%</b></div>`;
    html+=`<div style="color:#aaa;font-size:.72rem;margin-bottom:6px">⏱ ${timeStr} remaining</div>`;
    // Vote bars
    html+=`<div style="font-size:.72rem;margin-bottom:3px">`;
    html+=`<span style="color:#4CAF50">✅ YES ${prop.yesWeight.toFixed(1)} (${yesPct}%)</span>&nbsp;&nbsp;`;
    html+=`<span style="color:#FF4444">❌ NO ${prop.noWeight.toFixed(1)} (${100-yesPct}%)</span>`;
    html+=`</div>`;
    html+=`<div style="background:#222;border-radius:3px;height:8px;margin-bottom:5px;overflow:hidden">`;
    html+=`<div style="background:#4CAF50;height:100%;width:${yesPct}%;float:left"></div>`;
    html+=`<div style="background:#FF4444;height:100%;width:${100-yesPct}%;float:left"></div></div>`;
    html+=`<div style="font-size:.7rem;color:#888;margin-bottom:2px">Quorum: ${total.toFixed(1)} / ${quorum} ALCX (${quorumPct}%)</div>`;
    html+=`<div style="background:#222;border-radius:3px;height:5px;margin-bottom:8px;overflow:hidden">`;
    html+=`<div style="background:${quorumPct>=100?'#FFD700':'#555'};height:100%;width:${quorumPct}%"></div></div>`;
    if(alreadyVoted){
      html+=`<div style="color:#888;font-size:.75rem;text-align:center;padding:6px 0">✔ Voted — ${voteCommitted.toFixed(1)} ALCX stake committed until proposal settles.</div>`;
    }else if(voteAvailable>0){
      // Amount selector
      html+=`<div style="margin-bottom:6px">`;
      html+=`<div style="font-size:.72rem;color:#aaa;margin-bottom:3px">Stake amount to commit (1 – ${voteAvailable.toFixed(1)} ALCX):</div>`;
      html+=`<input id="gov-vote-amt" type="number" min="1" max="${voteAvailable.toFixed(4)}" step="1" value="${voteAvailable.toFixed(1)}" style="width:90px;background:#111;border:1px solid #5A3A80;color:#eee;padding:3px;font-family:monospace;border-radius:3px;font-size:.8rem">`;
      html+=`<span style="color:#666;font-size:.68rem;margin-left:6px">of your ${queueStake.toFixed(1)} queue stake</span>`;
      html+=`</div>`;
      html+=`<div style="display:flex;gap:6px">`;
      html+=`<button onclick="govVote(${prop.id},'yes')" style="flex:1;padding:5px;background:#1A3A1A;border:1px solid #4CAF50;color:#4CAF50;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.75rem">✅ Vote YES</button>`;
      html+=`<button onclick="govVote(${prop.id},'no')" style="flex:1;padding:5px;background:#3A1A1A;border:1px solid #FF4444;color:#FF4444;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.75rem">❌ Vote NO</button>`;
      html+=`</div>`;
      html+=`<div style="color:#666;font-size:.68rem;margin-top:4px">Committed stake is locked until the proposal settles (24h max).</div>`;
    }else{
      html+=`<div style="color:#888;font-size:.75rem;padding:6px 0">No uncommitted queue stake available to vote with.</div>`;
    }
    html+=`</div>`;
  }else{
    // Propose panel
    html+=`<div style="color:#888;margin-bottom:8px;font-size:.75rem">No active proposal. Propose a new earmark rate:</div>`;
    html+=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px">`;
    html+=`<span style="color:#aaa;font-size:.8rem">Rate (%):</span>`;
    html+=`<input id="gov-rate-inp" type="number" min="0.1" max="2.0" step="0.1" value="${rate.toFixed(2)}" style="width:65px;background:#111;border:1px solid #5A3A80;color:#eee;padding:3px;font-family:monospace;border-radius:3px">`;
    if(queueStake>0){
      html+=`<span style="color:#aaa;font-size:.8rem">Stake:</span>`;
      html+=`<input id="gov-propose-amt" type="number" min="1" max="${voteAvailable.toFixed(4)}" step="1" value="${voteAvailable.toFixed(1)}" style="width:65px;background:#111;border:1px solid #5A3A80;color:#eee;padding:3px;font-family:monospace;border-radius:3px">`;
      html+=`<button onclick="govPropose()" style="padding:4px 10px;background:#1A1030;border:1px solid #9C27B0;color:#B080FF;cursor:pointer;border-radius:4px;font-family:monospace;font-size:.75rem">📜 Propose</button>`;
    }else{
      html+=`<button disabled style="padding:4px 10px;background:#111;border:1px solid #333;color:#555;border-radius:4px;font-family:monospace;font-size:.75rem;cursor:not-allowed">📜 Propose</button>`;
    }
    html+=`</div>`;
    html+=`<div style="color:#666;font-size:.7rem">Requires queue-locked ALCX · Auto-votes YES · Stake locked 24h · Needs ${quorum} ALCX quorum</div>`;
  }
  el.innerHTML=html;
}
function govPropose(){
  const v=parseFloat(document.getElementById('gov-rate-inp')?.value);
  if(isNaN(v)||v<0.1||v>2.0){chatLog('Rate must be 0.1–2.0%.','#FF4444');return;}
  const amt=parseFloat(document.getElementById('gov-propose-amt')?.value||(G.lockedAlcx||0));
  if(isNaN(amt)||amt<=0){chatLog('Enter the ALCX stake amount for your proposal.','#FF4444');return;}
  socket?.emit('governance_propose',{rate:v/100,amount:amt});
}
function govVote(id,choice){
  const amt=parseFloat(document.getElementById('gov-vote-amt')?.value||(G.lockedAlcx||0));
  if(isNaN(amt)||amt<=0){chatLog('Enter a valid ALCX stake amount to vote.','#FF4444');return;}
  socket?.emit('governance_vote',{proposalId:id,choice,amount:amt});
}
function doAuctionBid(){
  if(!G.queueState||G.queueState.served)return;
  const amt=parseFloat(document.getElementById('queue-bid-amt')?.value||0);
  if(isNaN(amt)||amt<1){chatLog('Enter a valid ALCX bid (min 1).','#FF4444');return;}
  const freeAlcx=parseFloat((G.alcx-G.alcxVoteLock).toFixed(4));
  if(freeAlcx<amt){chatLog(`Not enough free ALCX! (${freeAlcx.toFixed(1)} available, ${G.alcxVoteLock.toFixed(1)} locked in vote)`,'#FF4444');SFX.error();return;}
  G.alcx=parseFloat((G.alcx-amt).toFixed(4));
  renderHUD();
  socket?.emit('queue_auction_bid',{zone:G.queueState.zone,queueType:G.queueState.type,alcx:amt});
  chatLog(`⚡ Bid ${amt} ALCX to jump the queue!`,'#FFD700');
}

function doFastExit(fee){
  if(!G.queueState||G.queueState.type!=='exit'||G.queueState.served)return;
  const freeAlcx=parseFloat((G.alcx-G.alcxVoteLock).toFixed(4));
  if(freeAlcx<fee){chatLog(`Not enough free ALCX for fast exit (${freeAlcx.toFixed(1)} available, ${G.alcxVoteLock.toFixed(1)} locked in vote).`,'#FF5722');SFX.error();return;}
  G.alcx=parseFloat((G.alcx-fee).toFixed(4));
  renderHUD();
  chatLog(`⚡ Fast exit: ${fee} ALCX paid — skipping the exit queue! Fee goes to treasury.`,'#FFD700');
  socket?.emit('queue_fast_exit',{zone:G.queueState.zone,queueType:G.queueState.type});
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

// ── CHANGELOG ─────────────────────────────────────────────────────────────────
// Add new entries at the TOP. Each entry has: version, date, sections[].
// Each section has a title and items[]. LATEST_VERSION drives the "NEW" badge.
const CHANGELOG=[
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
const LATEST_VERSION=CHANGELOG[0].version;
const CL_KEY='vq_changelog_seen'; // localStorage key

function openChangelog(){
  localStorage.setItem(CL_KEY,LATEST_VERSION);
  const badge=document.getElementById('hud-changelog-badge');
  if(badge)badge.style.display='none';
  const content=document.getElementById('changelog-content');
  if(content){
    content.innerHTML=CHANGELOG.map(entry=>`
      <div class="cl-entry">
        <div class="cl-version">v${entry.version}<span class="cl-date">${entry.date}</span></div>
        ${entry.sections.map(sec=>`
          <div class="cl-section">${sec.title}</div>
          ${sec.items.map(it=>`<div class="cl-item">${it}</div>`).join('')}
        `).join('')}
      </div>
    `).join('');
  }
  const overlay=document.getElementById('changelog-overlay');
  if(overlay){overlay.style.display='flex';}
}
function closeChangelog(){
  const overlay=document.getElementById('changelog-overlay');
  if(overlay)overlay.style.display='none';
}
// Show NEW badge if player hasn't seen the latest version
(function initChangelogBadge(){
  const seen=localStorage.getItem(CL_KEY);
  if(seen!==LATEST_VERSION){
    const badge=document.getElementById('hud-changelog-badge');
    if(badge){badge.style.display='inline';badge.textContent='NEW';}
  }
})();
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
// ── Gear durability system ────────────────────────────────────────────────────
// Max durability by rarity; starting (untagged) gear gets 40.
const MAX_DUR={common:60,rare:80,epic:100};
function itemMaxDur(item){return MAX_DUR[item?.rarity||'common']||40;}
// Call when an item enters the player's possession (buy or loot) to stamp durability.
function stampDurability(item){
  if(!item||item.type==='potion'||item.durability!=null)return item;
  item.maxDurability=itemMaxDur(item);
  item.durability=item.maxDurability;
  return item;
}
// Reduce durability by amt, floor at 0.
function degradeItem(item,amt=1){
  if(!item||item.type==='potion')return;
  if(item.durability==null){stampDurability(item);}
  item.durability=Math.max(0,item.durability-amt);
}
// Effective DEF/DMG from an item — 0 when completely broken.
function itemEffDef(item){
  if(!item||item.durability==null)return item?.def||0;
  if(item.durability<=0)return 0;
  return item.def||0;
}
function itemEffDmg(item){
  if(!item||item.durability==null)return item?.dmg||2;
  if(item.durability<=0)return 1; // fists-only when weapon broken
  return item.dmg||2;
}
// Repair all equipped gear; cost is 35% of (base item cost × wear fraction).
function repairAllGear(){
  const pieces=[G.inventory[0],G.inventory[1],G.equippedArmor].filter(Boolean);
  let totalCost=0;
  pieces.forEach(it=>{
    if(it.durability==null)stampDurability(it);
    const maxD=it.maxDurability||itemMaxDur(it);
    const wear=1-(it.durability/maxD);
    totalCost+=Math.ceil((it.cost||0)*wear*0.35);
  });
  if(totalCost<=0){chatLog('All gear is in perfect condition!','#80FFAA');return;}
  if(G.alUSD<totalCost){SFX.error();chatLog(`Need ${totalCost} alUSD to repair all gear.`,'#FF4444');return;}
  G.alUSD=parseFloat((G.alUSD-totalCost).toFixed(2));
  pieces.forEach(it=>{it.durability=it.maxDurability||itemMaxDur(it);});
  SFX.buy();
  chatLog(`Gear repaired for ${totalCost} alUSD. Everything restored!`,'#4CAF50');
  renderShop();renderInventoryScreen();
}

// ── Dynamic shop pricing helpers ──────────────────────────────────────────────
// Prices rise 12% per level above 1 (inflation), creating arbitrage: low-level
// players buy cheap and can sell to higher-level players via P2P market.
// LCK gives a 1% discount per point (up to 10% off), rewarding stat investment.
function shopInflationMult(){
  return Math.max(1, 1+(G.level-1)*0.12);
}
function shopLckDiscount(){
  return Math.max(0.90, 1-(G.stats.lck||1)*0.01);
}
// Final price for an item: base × inflation × LCK-discount × convoy-event
function shopEffectiveCost(item){
  const convoyDisc=G.worldEvent?.type==='merchant_convoy'?0.80:1.0;
  const raw=item.cost*shopInflationMult()*shopLckDiscount()*convoyDisc;
  return item.currency==='alETH'?parseFloat(raw.toFixed(4)):parseFloat(raw.toFixed(2));
}

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
  // ── Repair section ──
  const repairEl=document.getElementById('shop-repair-section');
  if(repairEl){
    const gearPieces=[G.inventory[0],G.inventory[1],G.equippedArmor].filter(Boolean);
    let repairLines='';let repairCost=0;
    gearPieces.forEach(it=>{
      if(it.durability==null)stampDurability(it);
      const maxD=it.maxDurability||itemMaxDur(it);
      const pct=Math.round(it.durability/maxD*100);
      const col=pct>60?'#4CAF50':pct>25?'#FFD700':'#FF4444';
      const wear=1-(it.durability/maxD);
      const cost=Math.ceil((it.cost||0)*wear*0.35);
      repairCost+=cost;
      repairLines+=`<span style="color:${col}">${it.icon||'🗡'} ${it.name}: ${pct}% dur</span>  `;
    });
    if(repairCost>0){
      repairEl.innerHTML=`<div style="margin-top:8px;padding:6px;background:#1a1020;border:1px solid #5A3A80;border-radius:4px;font-size:.72rem">`+
        `🔧 <b style="color:#FFD700">Gear Condition</b>: ${repairLines||'nothing equipped'}<br>`+
        `<button onclick="repairAllGear()" style="margin-top:4px;padding:3px 10px;background:#4CAF50;color:#fff;border:none;border-radius:3px;cursor:pointer;font-family:monospace;font-size:.72rem">Repair All — ${repairCost} alUSD</button></div>`;
    } else {
      repairEl.innerHTML='';
    }
  }
  const list=document.getElementById('shop-items-list');
  list.innerHTML='';
  const inflMult=shopInflationMult();
  const lckDisc=shopLckDiscount();
  items.forEach((item,i)=>{
    const itemCurrency=item.currency||'alUSD';
    const effCost=shopEffectiveCost(item);
    const balance=itemCurrency==='alETH'?G.alETH:G.alUSD;
    const canAfford=balance>=effCost;
    const altCurrency2=itemCurrency==='alETH'?'alUSD':'alETH';
    const altRate2=(EXCHANGE_RATES[itemCurrency]||1)/(EXCHANGE_RATES[altCurrency2]||1);
    const altCost2=altCurrency2==='alETH'?parseFloat((effCost*altRate2*1.003).toFixed(4)):parseFloat((effCost*altRate2*1.003).toFixed(2));
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
    const priceStr=itemCurrency==='alETH'?`${effCost} alETH`:`${effCost} alUSD`;
    // Show base price as reference if inflation is active
    const baseNote=inflMult>1.01?`<span style="color:#555;font-size:.65rem;text-decoration:line-through">${item.cost}</span> `:'' ;
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
        <div class="shop-row-price">${baseNote}${currencySymbol}${priceStr}</div>
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
  // Use effective (inflated) cost — already includes convoy disc and LCK discount
  const effCost=shopEffectiveCost(item);
  let currency=item.currency||'alUSD';
  const balance=currency==='alETH'?G.alETH:G.alUSD;
  if(balance<effCost){
    const altCur=currency==='alETH'?'alUSD':'alETH';
    const altRate=(EXCHANGE_RATES[currency]||1)/(EXCHANGE_RATES[altCur]||1);
    const altCost=altCur==='alETH'?parseFloat((effCost*altRate*1.003).toFixed(4)):parseFloat((effCost*altRate*1.003).toFixed(2));
    const altBal=altCur==='alETH'?G.alETH:G.alUSD;
    if(altBal>=altCost){
      if(altCur==='alETH')G.alETH=parseFloat((G.alETH-altCost).toFixed(4));
      else G.alUSD=parseFloat((G.alUSD-altCost).toFixed(2));
      chatLog(`Paid ${altCost} ${altCur} for ${item.name} (auto-converted, 0.3% fee)`,'#8090FF');
      currency='_converted';
    }else{SFX.error();chatLog(`Not enough ${currency} (or ${altCur} to convert).`,'#FF4444');return;}
  }
  if(G.level<item.lvl){SFX.error();chatLog(`Requires level ${item.lvl}!`,'#FF8800');return;}
  if(currency==='alETH')G.alETH=parseFloat((G.alETH-effCost).toFixed(4));
  else if(currency==='alUSD')G.alUSD=parseFloat((G.alUSD-effCost).toFixed(2));
  // if currency==='_converted', already deducted above
  // Gear (weapons/shields/armor) goes to general inventory — player equips manually
  // Potions and consumables also go to general slots
  const isGear=item.type==='weapon'||item.type==='shield'||item.type==='armor';
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){
    // Refund on full inventory
    if(currency==='alETH')G.alETH=parseFloat((G.alETH+(currency==='_converted'?0:effCost)).toFixed(4));
    else if(currency==='alUSD')G.alUSD=parseFloat((G.alUSD+(currency==='_converted'?0:effCost)).toFixed(2));
    SFX.error();chatLog('Inventory full! Make room before buying.','#FF4444');return;
  }
  G.inventory[slot]=stampDurability({...item});
  SFX.buy();
  if(isGear){
    const statStr=item.type==='weapon'?`+${item.dmg} DMG [${(item.dmgType||'physical')}]`:
                  `+${item.def} DEF`;
    // Auto-equip if the relevant slot is empty; otherwise prompt via confirm
    const slotEmpty=(item.type==='weapon'&&!G.inventory[0])||
                    (item.type==='shield'&&!G.inventory[1])||
                    (item.type==='armor' &&!G.equippedArmor);
    if(slotEmpty){
      equipFromBag(slot);
      chatLog(`Bought & equipped ${item.name}! (${statStr})`,'#4CAF50');
      showTxToast(`✅ Bought & equipped ${item.icon} ${item.name}  ${statStr}`,'buy');
    } else {
      chatLog(`Bought ${item.name}! (${statStr}) — press P → click item to equip`,'#4CAF50');
      showTxToast(`✅ Bought ${item.icon} ${item.name}  ${statStr}`,'buy');
    }
  } else {
    chatLog(`Bought ${item.name}!`,'#4CAF50');
    showTxToast(`✅ Bought ${item.icon} ${item.name}`,'buy');
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
  showTxToast(`${item.icon} Used ${item.name}  +${gained} HP`,'use');
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

  // ── NPC / shop markers ──
  const mmNpcs=NPCS[G.zone]||[];
  ctx.save();ctx.font='8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  mmNpcs.forEach(npc=>{
    const mx=ox+Math.round(npc.x*scale);
    const my=oy+Math.round(npc.y*scale);
    // Icon: 🛒 for shops, ★ for quest givers with active/ready quest, ◈ for other NPCs
    let icon='·';let col='#AAA';
    if(npc.shop){icon='🛒';col='#FFD700';}
    else if(npc.questId){
      const qs=G.quests[npc.questId];
      if(qs?.status==='ready'){icon='★';col='#FFD700';}
      else if(!qs||qs.status==='active'){icon='!';col='#FF8C00';}
      else{icon='✓';col='#4CAF50';}
    } else {icon='●';col='#88BBFF';}
    // Draw dot
    ctx.fillStyle=col;
    if(icon==='🛒'){ctx.font='7px sans-serif';ctx.fillText(icon,mx,my);}
    else{
      ctx.fillStyle=col;ctx.fillRect(mx-2,my-2,5,5);
      if(icon!=='●'){ctx.fillStyle='#000';ctx.font='bold 6px monospace';ctx.fillText(icon,mx,my);}
    }
  });
  ctx.restore();

  // Player dot (drawn last so always on top)
  const px=Math.floor(G.x/TS),py=Math.floor(G.y/TS);
  const dx=ox+Math.round(px*scale),dy=oy+Math.round(py*scale);
  ctx.fillStyle='#FF4444';ctx.fillRect(dx-2,dy-2,5,5);
  ctx.fillStyle='#FFAAAA';ctx.fillRect(dx-1,dy-1,3,3);

  // Legend
  ctx.font='7px monospace';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(ox,oy+dh+2,dw,13);
  ctx.fillStyle='#FFD700';ctx.fillText('🛒 shop',ox+4,oy+dh+11);
  ctx.fillStyle='#FF8C00';ctx.fillText('! quest',ox+56,oy+dh+11);
  ctx.fillStyle='#FF4444';ctx.fillText('♥ you',ox+110,oy+dh+11);
  ctx.fillStyle='#4CAF50';ctx.fillText('✓ done',ox+152,oy+dh+11);
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
      drawPlayerSprite(ctx,ox,oy,p.dir||2,p.color,p.frame||0,p.moving||false,false,p.species||'human',p.hairColor||HAIR_COLORS[1],p.accessory||null,p.gender||'male',p.skinTone??2,p.class_||'warrior'));
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
    drawPlayerSprite(ctx,ox,oy,G.dir,G.color,G.frame,G.moving,G.godMode,G.species,G.hairColor,G.accessory,G.gender,G.skinTone,G.class_));

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

// ── Building name signs ───────────────────────────────────────────────────────
// Floating banner labels rendered above each main building entrance in the world
// zone — always visible so players immediately know what each building is.
const _BUILDING_SIGNS=[
  // [label, centreWorldTileX, centreWorldTileY, nameColour]
  // Tavern (NW building)
  ['🍺 The Tavern',      TOWN_OX+9.5,  TOWN_OY+5,   '#FFD700'],
  // Governance Hall (NE building) — voting & proposals inside
  ['🏛 Governance Hall', TOWN_OX+30,   TOWN_OY+5,   '#88BBFF'],
  // Marketplace (SW building)
  ['🏪 Marketplace',     TOWN_OX+9.5,  TOWN_OY+21,  '#FFD700'],
  // Treasury (SE building)
  ['💰 Treasury',        TOWN_OX+30,   TOWN_OY+21,  '#AAFFAA'],
  // Currency exchange NPC (town square, between buildings)
  ['💱 Currency Exchange', TOWN_OX+24, TOWN_OY+6.5, '#FF9944'],
];
function renderBuildingSigns(ctx){
  ctx.save();
  ctx.textAlign='center';
  for(const[label,tx,ty,col] of _BUILDING_SIGNS){
    const sx=tx*TS-G.camX;
    const sy=ty*TS-G.camY;
    // Skip if entirely off screen
    if(sx<-80||sx>W+80||sy<-24||sy>H+24)continue;
    const tw=ctx.measureText(label).width+14;
    const bx=sx-tw/2, by=sy-9;
    // Dark background pill
    ctx.fillStyle='rgba(0,0,0,0.72)';
    ctx.beginPath();ctx.roundRect(bx,by,tw,15,4);ctx.fill();
    // Coloured border
    ctx.strokeStyle=col;ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,tw,15,4);ctx.stroke();
    // Text
    ctx.fillStyle=col;ctx.font='bold 10px monospace';
    ctx.fillText(label,sx,by+10.5);
  }
  ctx.textAlign='left';
  ctx.restore();
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
  // lockedAlcx = queue stake; alcxVoteLock = subset of that committed to active vote
  const alcxTxt = G.lockedAlcx>0
    ? `⚗${G.alcx} 🔒${G.lockedAlcx}${G.alcxVoteLock>0?`(🗳${G.alcxVoteLock.toFixed(1)})`:''}`
    : `⚗${G.alcx}`;
  document.getElementById('hud-alcx').textContent = alcxTxt;
  // Level display — badge for unspent stat points or ready quests
  const hasReady=Object.values(G.quests).some(q=>q.status==='ready');
  const hasStatPts=(G.statPoints||0)>0;
  const lvlEl=document.getElementById('hud-level');
  lvlEl.textContent=`Lv.${G.level}`+(hasStatPts?` ✦${G.statPoints}`:'');
  lvlEl.style.color=hasReady?'#FFD700':hasStatPts?'#FF8C00':'#8BC34A';
  lvlEl.title=hasReady?'Quest ready to turn in!':hasStatPts?`${G.statPoints} unspent stat point${G.statPoints>1?'s':''} — press P`:'';
  lvlEl.style.animation=hasStatPts&&!hasReady?'questPulse 1.2s infinite':'';
  // ── Persistent quest tracker strip ──
  const questEl=document.getElementById('hud-quest');
  if(questEl){
    const activeQuests=Object.entries(G.quests)
      .filter(([,qs])=>qs.status==='active'||qs.status==='ready')
      .map(([qid,qs])=>({qid,qs,def:QUEST_DEFS[qid]}))
      .filter(x=>x.def);
    if(activeQuests.length===0){
      questEl.innerHTML='';
    } else {
      // Show at most 2 quests to keep the strip compact
      questEl.innerHTML=activeQuests.slice(0,2).map(({qs,def})=>{
        if(qs.status==='ready'){
          return `<span class="q-ready">★ ${def.title}: READY TO TURN IN</span>`;
        }
        const goal=def.goal?.count||1;
        const prog=Math.min(qs.progress||0,goal);
        return `<span class="q-label">◈ ${def.title}:</span><span class="q-progress">${prog}/${goal}</span>`;
      }).join('&nbsp;&nbsp;·&nbsp;&nbsp;');
    }
  }
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

// ── Helper: equip an item from a general inventory slot ──────────────────────
function equipFromBag(slotIdx){
  const item=G.inventory[slotIdx];
  if(!item)return;
  if(item.type==='weapon'){
    const old=G.inventory[0];
    G.inventory[0]=item;
    G.inventory[slotIdx]=old; // swap old weapon back to bag (unless it's also the starting slot)
    chatLog(`Equipped ${item.name}! (+${item.dmg} DMG [${item.dmgType||'physical'}])`,'#4CAF50');
    showTxToast(`⚔ Equipped ${item.icon} ${item.name}  +${item.dmg} DMG`,'buy');
    SFX.buy();
  } else if(item.type==='shield'){
    const old=G.inventory[1];
    G.inventory[1]=item;
    G.inventory[slotIdx]=old;
    chatLog(`Equipped ${item.name}! (+${item.def} DEF)`,'#4CAF50');
    showTxToast(`🛡 Equipped ${item.icon} ${item.name}  +${item.def} DEF`,'buy');
    SFX.buy();
  } else if(item.type==='armor'){
    const old=G.equippedArmor;
    G.equippedArmor=item;
    G.inventory[slotIdx]=old; // old armor goes back to bag slot
    chatLog(`Equipped ${item.name}! (+${item.def} DEF)`,'#4CAF50');
    showTxToast(`🥋 Equipped ${item.icon} ${item.name}  +${item.def} DEF`,'buy');
    SFX.buy();
  }
  if(G.paused)renderInventoryScreen();
  saveToServer();
}
function unequipWeapon(){
  const item=G.inventory[0];
  if(!item||item.bound)return; // can't unequip starting weapon
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){chatLog('No bag space to unequip!','#FF4444');return;}
  G.inventory[slot]=item;
  G.inventory[0]=null;
  chatLog(`Unequipped ${item.name} to bag.`,'#aaa');
  if(G.paused)renderInventoryScreen();
}
function unequipShield(){
  const item=G.inventory[1];
  if(!item||item.bound)return;
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){chatLog('No bag space to unequip!','#FF4444');return;}
  G.inventory[slot]=item;
  G.inventory[1]=null;
  chatLog(`Unequipped ${item.name} to bag.`,'#aaa');
  if(G.paused)renderInventoryScreen();
}
function unequipArmor(){
  const item=G.equippedArmor;
  if(!item)return;
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){chatLog('No bag space to unequip!','#FF4444');return;}
  G.inventory[slot]=item;
  G.equippedArmor=null;
  chatLog(`Unequipped ${item.name} to bag.`,'#aaa');
  if(G.paused)renderInventoryScreen();
}
function sellFromBag(slotIdx){
  const item=G.inventory[slotIdx];
  if(!item||item.bound){chatLog('This item cannot be sold.','#888');return;}
  // Determine sell price: ~40% of cost, minimum 1 alUSD worth
  const base=item.cost||0;
  const sellPrice=item.currency==='alETH'
    ?parseFloat((base*0.4).toFixed(4))
    :Math.max(1,Math.round(base*0.4));
  const cur=item.currency==='alETH'?'alETH':'alUSD';
  G.inventory[slotIdx]=null;
  if(cur==='alETH') G.alETH=parseFloat((G.alETH+sellPrice).toFixed(4));
  else              G.alUSD=parseFloat((G.alUSD+sellPrice).toFixed(2));
  chatLog(`Sold ${item.name} for ${sellPrice} ${cur}.`,'#FDD835');
  showTxToast(`💰 Sold ${item.icon} ${item.name}  +${sellPrice} ${cur}`,'sell');
  SFX.coin();
  if(G.paused)renderInventoryScreen();
  saveToServer();
}

function dropFromBag(slotIdx){
  const item=G.inventory[slotIdx];
  if(!item){return;}
  // Apply 30% durability loss on drop (item thrown carelessly)
  const dropped=Object.assign({},item);
  if(dropped.durability==null) stampDurability(dropped);
  const lossAmt=Math.max(1,Math.floor((dropped.maxDurability||itemMaxDur(dropped))*0.30));
  degradeItem(dropped,lossAmt);
  if(typeof socket!=='undefined'&&socket?.connected&&G.zone&&G.zone!=='battle'){
    socket.emit('loot_drop',{
      zone:G.zone,
      x:Math.round(G.x/TS),
      y:Math.round(G.y/TS),
      items:[dropped],
      currencies:{spacebucks:0,schmeckles:0,alUSD:0},
      killerType:'drop',
    });
    chatLog(`🗑 Dropped ${item.icon} ${item.name} (30% durability lost on impact).`,'#888');
    showTxToast(`🗑 Dropped ${item.icon} ${item.name}  (−30% dur)`,'drop');
  } else {
    chatLog(`🗑 Discarded ${item.icon} ${item.name}.`,'#888');
    showTxToast(`🗑 Discarded ${item.icon} ${item.name}`,'drop');
  }
  G.inventory[slotIdx]=null;
  if(G.paused)renderInventoryScreen();
  saveToServer();
}

function renderInventoryScreen(){
  // ── Equipped gear section ──────────────────────────────────────────────────
  const grid=document.getElementById('inv-grid');
  grid.innerHTML='';

  function rarBorder(item){return item?`2px solid ${RARITY_COLOR[item.rarity||'common']}`:'2px solid #333';}
  function dmgTypeTag(w){
    const col={physical:'#aaa',magic:'#9B59B6',holy:'#F1C40F'}[w?.dmgType||'physical']||'#aaa';
    return w?`<span style="color:${col};font-size:.6rem">[${w.dmgType||'phys'}]</span>`:'';
  }

  // Equipped slots row
  const eqRow=document.createElement('div');
  eqRow.style.cssText='display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;width:100%;';

  const makeEquipSlot=(label,item,onUnequip)=>{
    const d=document.createElement('div');
    d.style.cssText=`background:#111;border:${rarBorder(item)};border-radius:4px;padding:4px 6px;flex:1;min-width:80px;max-width:130px;font-size:.65rem;color:#ccc;position:relative;box-sizing:border-box;overflow:hidden;`;
    const icon=item?item.icon:'—';
    const name=item?item.name:'(empty)';
    const stat=item?(item.type==='weapon'?`+${item.dmg} dmg`:item.type==='armor'||item.type==='shield'?`+${item.def} def`:''):'';
    const boundMark=item?.bound?'🔒 ':'';
    const rarLabel=item?`<span style="color:${RARITY_COLOR[item.rarity||'common']};font-size:.55rem">${RARITY_LABEL[item.rarity||'common']}</span>`:'';
    const typeTag=item?.type==='weapon'?dmgTypeTag(item):'';
    d.innerHTML=`<div style="font-size:.55rem;color:#555;margin-bottom:2px">${label}</div>
      <div style="font-size:1rem">${icon}</div>
      <div style="font-weight:bold;font-size:.62rem">${boundMark}${name}</div>
      <div style="color:#8BC34A;font-size:.6rem">${stat} ${typeTag}</div>
      ${rarLabel}
      ${item&&!item.bound?`<button onclick="(${onUnequip.toString()})()" style="margin-top:3px;font-size:.55rem;background:#1a1a1a;color:#888;border:1px solid #333;border-radius:2px;padding:1px 4px;cursor:pointer;width:100%">UNEQUIP</button>`:''}`;
    return d;
  };

  eqRow.appendChild(makeEquipSlot('⚔ WEAPON',G.inventory[0],unequipWeapon));
  eqRow.appendChild(makeEquipSlot('🛡 SHIELD',G.inventory[1],unequipShield));
  eqRow.appendChild(makeEquipSlot('🥋 ARMOR', G.equippedArmor,unequipArmor));
  grid.appendChild(eqRow);

  // Separator
  const sep=document.createElement('div');
  sep.style.cssText='font-size:.6rem;color:#444;border-top:1px solid #222;padding-top:4px;margin-bottom:4px';
  sep.textContent='BAG';
  grid.appendChild(sep);

  // ── General bag slots (idx 2+) ────────────────────────────────────────────
  while(G.inventory.length<G.maxInvSlots)G.inventory.push(null);
  const bagGrid=document.createElement('div');
  bagGrid.style.cssText='display:flex;flex-wrap:wrap;gap:4px;width:100%;';
  const selIdx=G._bagMenuIdx??null; // currently selected slot index
  for(let i=2;i<G.maxInvSlots;i++){
    const item=G.inventory[i];
    const isSelected=selIdx===i;
    const s=document.createElement('div');
    s.style.cssText=`width:44px;height:54px;background:${isSelected?'#1A1A2E':'#0d0d1a'};
      border:${isSelected?'2px solid #FFD700':rarBorder(item)};border-radius:4px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:.7rem;
      color:#ccc;cursor:${item?'pointer':'default'};position:relative;overflow:hidden;padding:2px;
      box-shadow:${isSelected?'0 0 6px #FFD70066':'none'};`;
    if(item){
      s.innerHTML=`<div style="font-size:.9rem">${item.icon||'?'}</div>
        <div style="font-size:.5rem;text-align:center;color:#ccc;line-height:1.1">${item.name}</div>
        <div style="font-size:.5rem;color:${item.type==='potion'?'#4CAF50':'#8BC34A'}">${
          item.type==='weapon'?`+${item.dmg}⚔`:
          item.type==='armor'||item.type==='shield'?`+${item.def}🛡`:
          item.healFull?'Full HP':`+${item.heal||0}♥`}</div>`;
      s.title=`${item.name}${item.rarity?' ('+RARITY_LABEL[item.rarity||'common']+')':''}`;
      s.addEventListener('click',()=>{
        G._bagMenuIdx=(G._bagMenuIdx===i)?null:i; // toggle selection
        renderInventoryScreen();
      });
      s.addEventListener('contextmenu',e=>{e.preventDefault();sellFromBag(i);});
    } else {
      s.innerHTML='<div style="color:#222;font-size:1rem">·</div>';
      s.addEventListener('click',()=>{G._bagMenuIdx=null;renderInventoryScreen();});
    }
    bagGrid.appendChild(s);
  }
  grid.appendChild(bagGrid);

  // ── Bag item action sheet (appears when a slot is selected) ───────────────
  const actionSheetEl=document.createElement('div');
  actionSheetEl.id='bag-action-sheet';
  const selItem=selIdx!=null?G.inventory[selIdx]:null;
  if(selItem&&!G.battle){
    const isGear=selItem.type==='weapon'||selItem.type==='shield'||selItem.type==='armor';
    const isPotion=selItem.type==='potion';
    const sellVal=Math.max(1,Math.floor((selItem.cost||10)*0.40));
    const canAfford=true;
    actionSheetEl.style.cssText='display:flex;gap:6px;margin:6px 0 2px;flex-wrap:wrap;align-items:center;';
    const mkBtn=(label,color,border,fn)=>{
      const b=document.createElement('button');
      b.textContent=label;
      b.style.cssText=`flex:1;min-width:60px;padding:5px 4px;background:${color};color:#fff;border:1px solid ${border};
        border-radius:4px;font-family:monospace;font-size:.72rem;cursor:pointer;`;
      b.addEventListener('click',fn);
      return b;
    };
    if(isGear) actionSheetEl.appendChild(mkBtn('⚔ EQUIP','#1A3020','#4CAF50',()=>{G._bagMenuIdx=null;equipFromBag(selIdx);}));
    if(isPotion) actionSheetEl.appendChild(mkBtn('🧪 USE','#1A2030','#4FC3F7',()=>{G._bagMenuIdx=null;usePotion(selIdx);}));
    actionSheetEl.appendChild(mkBtn(`💰 SELL ${sellVal}${'sb'}`, '#302010','#C09000',()=>{G._bagMenuIdx=null;sellFromBag(selIdx);}));
    actionSheetEl.appendChild(mkBtn('🗑 DROP','#2A0808','#C04040',()=>{G._bagMenuIdx=null;dropFromBag(selIdx);}));
    actionSheetEl.appendChild(mkBtn('✕','#181818','#444',()=>{G._bagMenuIdx=null;renderInventoryScreen();}));
  } else {
    actionSheetEl.style.display='none';
  }
  grid.appendChild(actionSheetEl);

  // Capacity line
  const capEl=document.getElementById('inv-capacity');
  if(capEl){
    const maxPossible=12;
    capEl.innerHTML=`Bag: ${G.maxInvSlots-2} slots (${G.inventory.slice(2).filter(Boolean).length} used)`
      +` &nbsp;·&nbsp; Tap item to select → Equip / Sell / Drop`
      +(G.maxInvSlots<maxPossible?' — <span style="color:#B080FF">upgrade at Expansion Vendor</span>':'');
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats=document.getElementById('stats-box');
  const s=G.stats;
  const xpNeeded=xpForLevel(G.level);
  const shieldDef=G.inventory[1]?.def||0;
  const armorDef=G.equippedArmor?.def||0;
  const endDef=Math.floor(s.end*0.5);
  const totalDef=endDef+shieldDef+armorDef;
  const btnAdd=G.statPoints>0
    ?'cursor:pointer;background:#4CAF50;color:#fff;border:none;border-radius:3px;padding:0 5px;font-size:11px;margin-left:4px;'
    :'display:none';
  const pd=G.pendingStats||{};
  const statRows=[
    ['str','STR (Attack)'],['vit','VIT (HP / Regen)'],['agi','AGI (Speed / Dodge)'],
    ['end','END (Defense)'],['lck','LCK (Crit / Drop)'],
  ].map(([k,label])=>{
    const canRefund=(pd[k]||0)>0;
    const btnSub=canRefund
      ?'cursor:pointer;background:#E53935;color:#fff;border:none;border-radius:3px;padding:0 5px;font-size:11px;margin-left:4px;'
      :'display:none';
    return `<div class="stat-line"><span>${label}</span><span>${s[k]}
      <button style="${btnSub}"  onclick="refundStat('${k}')">−</button>
      <button style="${btnAdd}"  onclick="spendStat('${k}')">+</button>
    </span></div>`;
  }).join('');
  const wpn=G.inventory[0];
  const wpnStr=wpn?`${wpn.icon} ${wpn.name} +${wpn.dmg}⚔ [${wpn.dmgType||'phys'}]`:'None';
  stats.innerHTML=`
    <div class="stat-line" style="color:#8BC34A;font-weight:bold"><span>Level ${G.level}</span><span>${G.xp}/${xpNeeded} XP</span></div>
    ${G.statPoints>0?`<div class="stat-line" style="color:#FFD700"><span>Unspent Points</span><span>${G.statPoints} ★</span></div>`:''}
    ${statRows}
    <div class="stat-line" style="margin-top:4px;color:#7CC"><span>⚔ Weapon</span><span style="font-size:.7rem">${wpnStr}</span></div>
    <div class="stat-line" style="color:#7CC"><span>🛡 DEF</span><span>${totalDef} (${endDef}end+${shieldDef}sh+${armorDef}arm)</span></div>
    <div class="stat-line" style="margin-top:4px"><span>HP</span><span>${G.hp}/${G.maxHp}</span></div>
    <div class="stat-line" style="margin-top:4px;color:#FDD835"><span>🪙 Spacebucks</span><span>${G.spacebucks}</span></div>
    <div class="stat-line" style="color:#888"><span>💀 Schmeckles</span><span>${G.schmeckles}</span></div>
    <div class="stat-line" style="color:#4CAF50"><span>$ alUSD</span><span>${G.alUSD.toFixed(2)}</span></div>
    <div class="stat-line" style="color:#7B68EE"><span>⟠ alETH</span><span>${G.alETH.toFixed(4)}</span></div>
    <div class="stat-line" style="color:#9C27B0"><span>⚗ ALCX${G.lockedAlcx>0?' (🔒'+G.lockedAlcx+' staked'+(G.alcxVoteLock>0?', 🗳'+G.alcxVoteLock.toFixed(1)+' in vote':'')+')':''}</span><span>${G.alcx}</span></div>
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
// ── Transaction confirmation toast ───────────────────────────────────────────
// type: 'buy' (green) | 'sell' (gold) | 'drop' (red) | 'use' (blue)
let _txToastTimer=null;
function showTxToast(msg,type='buy'){
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
    // Governance Hall: treasury + live prices panel
    if(G.zone==='governance')renderGovernancePanel(ctxUI);
    // ── ALCX yield: seniority builds INSIDE the zone, drip while waiting ──────
    // Seniority accumulates while physically inside an economic zone.
    // This correctly models the protocol: longer commitment inside = more yield.
    if((G.zone==='marketplace'||G.zone==='treasury')&&G.tick%300===0){
      G.zoneSeniority=(G.zoneSeniority||0)+1;
      const drip=1+Math.floor(G.zoneSeniority/3);
      G.alcx+=drip;
      const bonusStr=drip>1?` (seniority ×${drip})`:'';
      chatLog(`⚗ Zone Yield: +${drip} ALCX${bonusStr}`,'#9C27B0');
      updateQueuePanel();
    }
    // Small base drip while waiting in queue (commitment signal earns too)
    if(G.queueState&&G.queueState.ticket&&!G.queueState.served&&G.tick%600===0){
      G.alcx+=1;
      chatLog('⚗ Queue Yield: +1 ALCX (patience pays)','#9C27B0');
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
function loadState(){
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
        const zoneName=data.zone[0].toUpperCase()+data.zone.slice(1);
        chatLog(`🎫 YOUR TICKET IS CALLED! Walk to the ${zoneName} gate to enter. You have 2 minutes!`,'#00FF88');
        chatLog('🎫 🎫 🎫 YOUR TURN — HEAD TO THE GATE! 🎫 🎫 🎫','#00FF88');
        document.getElementById('queue-enter-btn').style.display='block';
        SFX.levelUp&&SFX.levelUp();
        // Start 2-minute window: if they don't enter in time, ticket expires
        clearTimeout(G._queueServTimer);
        G._queueServExpiry=Date.now()+120000;
        G._queueServTimer=setTimeout(()=>{
          if(G.queueState&&G.queueState.served&&G.queueState.zone===data.zone){
            chatLog('⏰ Queue ticket expired — you took too long to reach the gate! Rejoining...','#FF5722');
            socket?.emit('queue_leave',{zone:G.queueState.zone,queueType:G.queueState.type});
            G.alcx+=G.lockedAlcx;G.lockedAlcx=0;
            // Auto-rejoin at back of queue
            const z=G.queueState.zone,t=G.queueState.type;
            G.queueState=null;G._queueServExpiry=null;
            updateQueuePanel();
            joinQueue(z,t);
          }
        },120000);
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
      if(data.quorum!=null)G.govQuorum=data.quorum;
      // Sync vote-committed amount from server on join/reconnect
      if(data.myVoteLocked!=null){G.alcxVoteLock=data.myVoteLocked;renderHUD();}
      if(document.getElementById('governance-ui')?.style.display!=='none')renderGovernanceUI();
    });
    socket.on('gov_result',data=>{
      if(data.ok){
        // lockedAlcx here = the amount of queue-stake committed to the vote
        if(data.lockedAlcx!=null){G.alcxVoteLock=parseFloat((G.alcxVoteLock+(data.lockedAlcx||0)).toFixed(4));renderHUD();}
        if(data.choice){
          const hLeft=data.hoursLeft||0;
          chatLog(`🗳 Voted ${data.choice.toUpperCase()}: ${data.weight?.toFixed(1)} ALCX queue-stake committed (~${hLeft}h remaining)`,'#9C27B0');
        }else if(data.proposed){
          chatLog(`📜 Proposal submitted! ${data.lockedAlcx?.toFixed(1)} ALCX queue-stake committed for 24h vote.`,'#9C27B0');
        }
      }else chatLog('Gov: '+data.error,'#FF4444');
      if(document.getElementById('governance-ui')?.style.display!=='none')renderGovernanceUI();
    });
    socket.on('gov_vote_released',data=>{
      // Proposal settled — release the committed stake back to uncommitted queue-lock
      G.alcxVoteLock=0;
      renderHUD();
      chatLog('🔓 Governance vote settled — your queue stake is fully uncommitted again.','#9C27B0');
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
      gender:G.gender,skinTone:G.skinTone,
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
  if(s.equippedArmor!==undefined)G.equippedArmor=s.equippedArmor;
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
    gender:G.gender,skinTone:G.skinTone,
    species:G.species,class_:G.class_,
    spacebucks:G.spacebucks,schmeckles:G.schmeckles,alUSD:G.alUSD,alETH:G.alETH,
    alcx:G.alcx,lockedAlcx:G.lockedAlcx,bankPositions:G.bankPositions,
    stats:G.stats,hp:G.hp,maxHp:G.maxHp,mp:G.mp,maxMp:G.maxMp,
    transmuterDeposits:G.transmuterDeposits,
    xp:G.xp,level:G.level,statPoints:G.statPoints,
    inventory:G.inventory,accessory:G.accessory,equippedArmor:G.equippedArmor,maxInvSlots:G.maxInvSlots,
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
  clearTimeout(G._queueServTimer);G._queueServExpiry=null;
  G.alcx+=G.lockedAlcx;G.lockedAlcx=0;G.queueState=null;
  updateQueuePanel();
  const key=type==='entry'?`world_${zone}`:`${zone}_exit`;
  const door=ZONE_DOORS[key];
  if(door)changeZone(door.to,door.sx,door.sy);
});
document.getElementById('queue-leave-btn')?.addEventListener('click',()=>{
  if(!G.queueState)return;
  socket?.emit('queue_leave',{zone:G.queueState.zone,queueType:G.queueState.type});
  clearTimeout(G._queueServTimer);G._queueServExpiry=null;
  G.alcx+=G.lockedAlcx;G.lockedAlcx=0;G.queueState=null;
  updateQueuePanel();
  chatLog('Left the queue.','#888');
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
