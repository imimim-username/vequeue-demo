import { G } from './state.js';
import { CFG, T } from './data.js';
import { toggleMute } from './audio.js';
// Circular imports — safe, used inside function bodies
import { chatLog, _dismissConfirm, advanceDialog, tryInteract, declineOrAbandonQuest, resetMmCanvas } from './game.js';
import { closeHelp, closeChangelog, closeExchange, closeMarket, closeGovernance, closeShop, closeBank, closeTransmuter, closeSimulator, togglePause } from './ui.js';

// ── INPUT ─────────────────────────────────────────────────────────────────────
export const KEYS={};
const konamiSeq=[];
window.addEventListener('keydown',e=>{
  KEYS[e.key]=true;KEYS[e.keyCode]=true;
  // Don't intercept game hotkeys when user is typing in any input field
  const _tag=document.activeElement?.tagName;
  if(_tag==='INPUT'||_tag==='TEXTAREA'||_tag==='SELECT'||document.activeElement?.isContentEditable) return;
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
    if(document.getElementById('help-overlay')?.style.display==='flex'){closeHelp();e.preventDefault();return;}
    if(G._pendingConfirm&&!G._pendingConfirm._info){ _dismissConfirm(false); e.preventDefault(); return; }
    if(document.getElementById('bank-ui').style.display!=='none'){ closeBank(); return; }
    handleEsc(); e.preventDefault();
  }
  if(e.key==='p'||e.key==='P') togglePause();
  if(e.key==='m'||e.key==='M'){G.showMinimap=!G.showMinimap;resetMmCanvas();}
  if(e.key==='`'||e.key==='~') toggleMute();
});
window.addEventListener('keyup',e=>{delete KEYS[e.key];delete KEYS[e.keyCode];});

// Mobile
if(window.matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');

// ── handleEsc: shared logic for keyboard ESC and mobile ESC button ────────────
export function handleEsc(){
  if(document.getElementById('simulator-ui')?.style.display!=='none'){closeSimulator();return;}
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
  G.showMinimap=!G.showMinimap;resetMmCanvas();e.preventDefault();
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
