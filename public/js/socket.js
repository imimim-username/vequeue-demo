import { io } from 'socket.io-client';
import { G } from './state.js';
import { SFX, musPlay } from './audio.js';
// These circular imports are safe — used inside function bodies only
import { chatLog, showScreen, startGame, updateQueuePanel, joinQueue, serverQueues } from './game.js';
import { renderHUD, renderBankUI, renderTransmuterUI, renderGovernanceUI, renderMarketUI, renderExchangeUI, applyLivePrices } from './ui.js';

// ── SOCKET.IO ─────────────────────────────────────────────────────────────────
export let socket = null;
export let others={};
export let G_accountId=null;

export function initSocket(){
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
            // Return only non-vote-committed portion; vote-lock stays until proposal settles
            const _r=Math.max(0,parseFloat((G.lockedAlcx-G.alcxVoteLock).toFixed(4)));
            G.alcx=parseFloat((G.alcx+_r).toFixed(4));G.lockedAlcx=G.alcxVoteLock;
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

    // ── Bank / Transmuter / Exchange server-authoritative results ─────────────
    socket.on('bank_borrow_result',data=>{
      G._txPending=false;
      if(!data.ok){chatLog('🏦 Bank error: '+data.error,'#FF4444');SFX.error();return;}
      if(data.spacebucks!=null)G.spacebucks=data.spacebucks;
      if(data.schmeckles!=null)G.schmeckles=data.schmeckles;
      if(data.alUSD!=null)G.alUSD=data.alUSD;
      if(data.alETH!=null)G.alETH=data.alETH;
      if(data.bankPositions)G.bankPositions=data.bankPositions;
      const pos=data.bankPositions?.[data.bankPositions.length-1];
      if(pos)chatLog(`🏦 Deposited ${pos.deposited} ${pos.collateral==='spacebucks'?'Spacebucks':'Schmeckles'} → borrowed ${pos.borrowed} ${pos.collateral==='spacebucks'?'alUSD':'alETH'} (90% LTV)`,'#4CAF50');
      SFX.buy();renderHUD();renderBankUI();saveToServer();
    });
    socket.on('bank_claim_result',data=>{
      G._txPending=false;
      if(!data.ok){chatLog('🏦 Claim error: '+data.error,'#FF4444');return;}
      G.spacebucks=data.spacebucks;G.schmeckles=data.schmeckles;G.bankPositions=data.bankPositions;
      const icon=data.collateral==='spacebucks'?'🪙':'💀';
      chatLog(`✅ Claimed ${data.total} ${data.collateral==='spacebucks'?'Spacebucks':'Schmeckles'} ${icon}!`,'#FFD700');
      SFX.coin();renderHUD();renderBankUI();saveToServer();
    });
    socket.on('transmuter_claim_result',data=>{
      if(!data.ok){chatLog('⚗ Transmuter error: '+data.error,'#FF4444');return;}
      G.spacebucks=data.spacebucks;G.schmeckles=data.schmeckles;G.transmuterDeposits=data.transmuterDeposits;
      chatLog(`✅ Transmuter: claimed ${data.claimed} ${data.type==='alUSD'?'🪙 Spacebucks':'💀 Schmeckles'}!`,'#FFD700');
      SFX.coin();renderHUD();renderTransmuterUI();saveToServer();
    });
    socket.on('transmuter_withdraw_result',data=>{
      if(!data.ok){chatLog('⚗ Transmuter error: '+data.error,'#FF4444');return;}
      if(data.alUSD!=null)G.alUSD=data.alUSD;
      if(data.alETH!=null)G.alETH=data.alETH;
      G.transmuterDeposits=data.transmuterDeposits;
      chatLog(`⚠ Transmuter early exit: returned ${data.returned} ${data.type} (${data.fee} fee → Treasury).`,'#FF8C00');
      SFX.error();renderHUD();renderTransmuterUI();saveToServer();
    });
    socket.on('currency_exchange_result',data=>{
      G._txPending=false; // unblock auto-save (set in doExchange)
      if(!data.ok){chatLog('⚗ Exchange error: '+data.error,'#FF4444');SFX.error();return;}
      G.spacebucks=data.spacebucks;G.schmeckles=data.schmeckles;
      G.alUSD=data.alUSD;G.alETH=data.alETH;G.alcx=data.alcx;
      chatLog(`⚗ Swapped ${data.amount} ${data.from} → ${data.received.toFixed(4)} ${data.to} (fee: ${data.fee.toFixed(4)})`,'#4CAF50');
      SFX.buy();renderHUD();renderExchangeUI();saveToServer();
    });

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
      if(data.history!=null)G.govHistory=data.history;
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
    socket.on('alcx_yield',data=>{
      // Server pre-updated pdb.alcx; mirror it on client
      G.alcx=parseFloat((G.alcx+(data.amount||0)).toFixed(4));
      renderHUD();
      if(data.source==='zone'){
        const bonusStr=data.amount>1?` (seniority ×${data.amount})`:'';
        chatLog(`⚗ Zone Yield: +${data.amount} ALCX${bonusStr}`,'#9C27B0');
      }else if(data.source==='queue'){
        chatLog('⚗ Queue Yield: +1 ALCX (patience pays)','#9C27B0');
      }
    });

    socket.on('gov_vote_released',data=>{
      // Server has already added refundAmt back to pdb.alcx and reduced pdb.lockedAlcx.
      // Mirror that on the client: move the vote-committed amount back to wallet.
      const refund=parseFloat(data.refundAmt||G.alcxVoteLock||0);
      G.alcx=parseFloat((G.alcx+refund).toFixed(4));
      G.lockedAlcx=Math.max(0,parseFloat((G.lockedAlcx-refund).toFixed(4)));
      G.alcxVoteLock=0;
      renderHUD();
      chatLog(`🔓 Governance vote settled — +${refund.toFixed(1)} ALCX returned to your wallet.`,'#9C27B0');
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

export function joinGameServer(){
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

export function applyServerState(s){
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

export function saveToServer(){
  if(!socket||!G_accountId)return;
  // Economy fields (currencies, bank, transmuter) are server-authoritative and
  // managed exclusively by server-side handlers — never sent from the client.
  socket.emit('save_character',{
    nickname:G.nickname,color:G.color,hairColor:G.hairColor,
    gender:G.gender,skinTone:G.skinTone,
    species:G.species,class_:G.class_,
    stats:G.stats,hp:G.hp,maxHp:G.maxHp,mp:G.mp,maxMp:G.maxMp,
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
export function updateOnlineCount(){
  document.getElementById('hud-players').textContent=`${1+Object.keys(others).length} online`;
}
