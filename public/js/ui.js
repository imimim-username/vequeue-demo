import { G } from './state.js';
import { SHOP_CATALOG, QUEST_DEFS, RARITY_COLOR, RARITY_LABEL, HAIR_COLORS,
  T, TS, TW, TH, TOWN_OX, TOWN_OY } from './data.js';
import { MAP_W, MAP_H, ZONES, NPCS } from './maps.js';
import { SFX } from './audio.js';
import { TILE_CACHE, WATER_FRAMES, drawPlayerSprite, drawNPCSprite } from './render.js';
// Circular imports from game.js — only used inside function bodies, safe for ES modules
import { chatLog, W, H, ctxUI, ctxTiles, showNpcDialog, showTxToast } from './game.js';
// socket.js exports — circular (socket.js also imports from ui.js), safe inside function bodies
import { saveToServer, socket, others, G_accountId } from './socket.js';
// combat.js exports — not circular (combat.js does not import from ui.js)
import { xpForLevel, spendStat, refundStat } from './combat.js';

// ── Market ─────────────────────────────────────────────────────────────────────
let _marketTab='browse';
export function openMarket(){G.paused=true;_marketTab='browse';renderMarketUI();document.getElementById('market-ui').style.display='block';}
export function closeMarket(){G.paused=false;document.getElementById('market-ui').style.display='none';}
export function openGovernance(){G.paused=true;renderGovernanceUI();document.getElementById('governance-ui').style.display='flex';}
export function closeGovernance(){G.paused=false;document.getElementById('governance-ui').style.display='none';}
export function renderGovernanceUI(){
  const el=document.getElementById('gov-content');if(!el)return;
  const redemptionRate=(G.redemptionRate||0.005)*100;
  const sbYieldRate=(G.sbYieldRate||0.002)*100;
  const schYieldRate=(G.schYieldRate||0.001)*100;
  const quorum=G.govQuorum||50;
  const prop=G.govProposals.find(p=>p.passed===null);
  // Voting stake = ALCX locked inside a veQueue zone (queue entry stake)
  const queueStake=G.lockedAlcx||0;
  const voteCommitted=G.alcxVoteLock||0;
  const voteAvailable=Math.max(0,parseFloat((queueStake-voteCommitted).toFixed(4)));

  const sbMin=(G.sbYieldRateMin||0.0005)*100;
  const sbMax=(G.sbYieldRateMax||0.005)*100;
  const sbDrift=(G.sbYieldDrift||0.0002)*100;
  const schMin=(G.schYieldRateMin||0.0003)*100;
  const schMax=(G.schYieldRateMax||0.003)*100;
  const schDrift=(G.schYieldDrift||0.0001)*100;
  const sbNetRate=sbYieldRate-redemptionRate;
  const schNetRate=schYieldRate-redemptionRate;
  const sbNetColor=sbNetRate>=0?'#4CAF50':'#FF8800';
  const schNetColor=schNetRate>=0?'#4CAF50':'#FF8800';
  // Yield rate bars: show position within min–max range
  const sbYieldPct=sbMax>sbMin?Math.round(((sbYieldRate-sbMin)/(sbMax-sbMin))*100):50;
  const schYieldPct=schMax>schMin?Math.round(((schYieldRate-schMin)/(schMax-schMin))*100):50;
  let html=`<div style="background:#0D0020;border:1px solid #3A2060;border-radius:4px;padding:8px;margin-bottom:8px;font-size:.75rem">`;
  html+=`<div style="color:#FFD700;font-weight:bold;margin-bottom:6px">⚗ Bank Rate Parameters</div>`;

  // SB yield row
  html+=`<div style="margin-bottom:6px">`;
  html+=`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">`;
  html+=`<span style="color:#4FC3F7">🪙 SB yield (alUSD) <span style="color:#555;font-size:.68rem">(drifts each tick)</span></span>`;
  html+=`<b style="color:#eee;font-size:.85rem">+${sbYieldRate.toFixed(3)}%<span style="color:#555;font-size:.68rem">/tick</span></b>`;
  html+=`</div>`;
  html+=`<div style="position:relative;background:#111;border-radius:3px;height:5px;margin-bottom:2px">`;
  html+=`<div style="position:absolute;left:${sbYieldPct}%;top:-1px;width:7px;height:7px;background:#4FC3F7;border-radius:50%;transform:translateX(-50%)"></div>`;
  html+=`</div>`;
  html+=`<div style="display:flex;justify-content:space-between;color:#444;font-size:.65rem"><span>${sbMin.toFixed(3)}% min</span><span>±${sbDrift.toFixed(3)}% drift</span><span>${sbMax.toFixed(3)}% max</span></div>`;
  html+=`</div>`;

  // SCH yield row
  html+=`<div style="margin-bottom:6px">`;
  html+=`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">`;
  html+=`<span style="color:#9C27B0">💀 SCH yield (alETH) <span style="color:#555;font-size:.68rem">(drifts each tick)</span></span>`;
  html+=`<b style="color:#eee;font-size:.85rem">+${schYieldRate.toFixed(3)}%<span style="color:#555;font-size:.68rem">/tick</span></b>`;
  html+=`</div>`;
  html+=`<div style="position:relative;background:#111;border-radius:3px;height:5px;margin-bottom:2px">`;
  html+=`<div style="position:absolute;left:${schYieldPct}%;top:-1px;width:7px;height:7px;background:#9C27B0;border-radius:50%;transform:translateX(-50%)"></div>`;
  html+=`</div>`;
  html+=`<div style="display:flex;justify-content:space-between;color:#444;font-size:.65rem"><span>${schMin.toFixed(3)}% min</span><span>±${schDrift.toFixed(3)}% drift</span><span>${schMax.toFixed(3)}% max</span></div>`;
  html+=`</div>`;

  // Redemption rate row
  html+=`<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">`;
  html+=`<span style="color:#EF5350">🔻 Redemption rate <span style="color:#555;font-size:.68rem">(governance-controlled, while debt > 0)</span></span>`;
  html+=`<b style="color:#eee;font-size:.85rem">${redemptionRate.toFixed(3)}%<span style="color:#555;font-size:.68rem">/tick</span></b>`;
  html+=`</div>`;

  // Net rows
  html+=`<div style="border-top:1px solid #1A1030;padding-top:4px;display:flex;justify-content:space-between;font-size:.73rem">`;
  html+=`<span style="color:#aaa">Net SB while repaying</span><b style="color:${sbNetColor}">${sbNetRate>=0?'+':''}${sbNetRate.toFixed(3)}%/tick</b>`;
  html+=`</div>`;
  html+=`<div style="display:flex;justify-content:space-between;font-size:.73rem;margin-top:1px">`;
  html+=`<span style="color:#aaa">Net SCH while repaying</span><b style="color:${schNetColor}">${schNetRate>=0?'+':''}${schNetRate.toFixed(3)}%/tick</b>`;
  html+=`</div>`;
  html+=`<div style="color:#555;font-size:.63rem;margin-top:4px">Yield rates drift independently each tick. If redemption rate > yield, deposit shrinks while debt is outstanding. Visit Actuary Venn in the Governance Hall to simulate your position.</div>`;
  html+=`</div>`;

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
    html+=`<div style="font-size:.8rem;margin:4px 0">Proposed redemption rate: <b style="color:#FFD700">${(prop.value*100).toFixed(2)}%</b>/tick</div>`;
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
    html+=`<div style="color:#888;margin-bottom:8px;font-size:.75rem">No active proposal. Propose a new redemption rate (0.1–2.0%):</div>`;
    html+=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px">`;
    html+=`<span style="color:#aaa;font-size:.8rem">Redemption rate (%):</span>`;
    html+=`<input id="gov-rate-inp" type="number" min="0.1" max="2.0" step="0.1" value="${redemptionRate.toFixed(2)}" style="width:65px;background:#111;border:1px solid #5A3A80;color:#eee;padding:3px;font-family:monospace;border-radius:3px">`;
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

  // ── Governance history ────────────────────────────────────────────────────
  const hist=(G.govHistory||[]).slice().reverse(); // newest first
  if(hist.length>0){
    html+=`<div style="margin-top:12px;border-top:1px solid #222;padding-top:8px">`;
    html+=`<div style="color:#888;font-size:.72rem;margin-bottom:5px">📜 Recent Proposals</div>`;
    hist.slice(0,5).forEach(h=>{
      const icon=h.outcome==='passed'?'✅':h.outcome==='quorum_fail'?'⚠️':'❌';
      const desc=h.outcome==='passed'?`Passed → ${(h.value*100).toFixed(2)}%`
        :h.outcome==='quorum_fail'?'Failed (no quorum)'
        :`Failed (${h.yesWeight?.toFixed(1)} vs ${h.noWeight?.toFixed(1)})`;
      const d=new Date(h.settledAt);
      const dateStr=`${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      html+=`<div style="font-size:.7rem;color:#666;margin-bottom:2px">`;
      html+=`${icon} #${h.id} ${desc} <span style="color:#444">${dateStr} · ${h.proposerName}</span>`;
      html+=`</div>`;
    });
    html+=`</div>`;
  }

  el.innerHTML=html;
}
export function govPropose(){
  const v=parseFloat(document.getElementById('gov-rate-inp')?.value);
  if(isNaN(v)||v<0.1||v>2.0){chatLog('Rate must be 0.1–2.0%.','#FF4444');return;}
  const amt=parseFloat(document.getElementById('gov-propose-amt')?.value||(G.lockedAlcx||0));
  if(isNaN(amt)||amt<=0){chatLog('Enter the ALCX stake amount for your proposal.','#FF4444');return;}
  socket?.emit('governance_propose',{rate:v/100,amount:amt});
}
export function govVote(id,choice){
  const amt=parseFloat(document.getElementById('gov-vote-amt')?.value||(G.lockedAlcx||0));
  if(isNaN(amt)||amt<=0){chatLog('Enter a valid ALCX stake amount to vote.','#FF4444');return;}
  socket?.emit('governance_vote',{proposalId:id,choice,amount:amt});
}
export function doAuctionBid(){
  if(!G.queueState||G.queueState.served)return;
  const amt=parseFloat(document.getElementById('queue-bid-amt')?.value||0);
  if(isNaN(amt)||amt<1){chatLog('Enter a valid ALCX bid (min 1).','#FF4444');return;}
  // G.alcx is already wallet-only; G.alcxVoteLock is inside G.lockedAlcx, not G.alcx
  if(G.alcx<amt){chatLog(`Not enough free ALCX! (have ${G.alcx.toFixed(1)})`,'#FF4444');SFX.error();return;}
  G.alcx=parseFloat((G.alcx-amt).toFixed(4));
  renderHUD();
  socket?.emit('queue_auction_bid',{zone:G.queueState.zone,queueType:G.queueState.type,alcx:amt});
  chatLog(`⚡ Bid ${amt} ALCX to jump the queue!`,'#FFD700');
}

export function doFastExit(fee){
  if(!G.queueState||G.queueState.type!=='exit'||G.queueState.served)return;
  // G.alcx is wallet-only; vote-lock is inside G.lockedAlcx, not G.alcx
  if((G.alcx||0)<fee){chatLog(`Not enough free ALCX for fast exit (have ${(G.alcx||0).toFixed(1)}).`,'#FF5722');SFX.error();return;}
  G.alcx=parseFloat((G.alcx-fee).toFixed(4));
  renderHUD();
  chatLog(`⚡ Fast exit: ${fee} ALCX paid — skipping the exit queue! Fee goes to treasury.`,'#FFD700');
  socket?.emit('queue_fast_exit',{zone:G.queueState.zone,queueType:G.queueState.type});
}

export function showHallOfFame(){
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
export function marketTab(tab){
  _marketTab=tab;
  ['browse','list'].forEach(t=>{
    const btn=document.getElementById('market-tab-'+t);
    if(btn){btn.style.background=tab===t?'#1A1030':'#0A0A14';btn.style.color=tab===t?'#B080FF':'#888';}
  });
  renderMarketUI();
}
export function renderMarketUI(){
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
export function submitListItem(){
  const slot=parseInt(document.getElementById('mkt-item-sel')?.value);
  const price=parseFloat(document.getElementById('mkt-price')?.value);
  const currency=document.getElementById('mkt-currency')?.value;
  if(isNaN(slot)||isNaN(price)||price<=0){chatLog('Enter a valid price.','#FF8800');return;}
  socket?.emit('market_list',{inventorySlot:slot,price,currency});
}
export function buyListing(id){socket?.emit('market_buy',{listingId:id});}
export function cancelListing(id){socket?.emit('market_cancel',{listingId:id});}

// ── BANK ──────────────────────────────────────────────────────────────────────
// ── Inventory Expansion ───────────────────────────────────────────────────────
export const INV_UPGRADE_COSTS=[0,0,0,0,0,0,0,0,20,40,80,200]; // cost to upgrade to slots[i+1]
export function openInvUpgrade(){
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
export function doInvUpgrade(){
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

export function openBank(){
  G.paused=true;
  renderBankUI();
  document.getElementById('bank-ui').style.display='flex';
}
export function closeBank(){
  G.paused=false;
  document.getElementById('bank-ui').style.display='none';
}
export function renderBankUI(){
  let posHTML='';
  G.bankPositions.forEach((pos,i)=>{
    if(pos.claimed)return;
    const pct=pos.borrowed>0?Math.min(100,Math.round((1-pos.debt/pos.borrowed)*100)):100;
    const colLabel=pos.collateral==='spacebucks'?'🪙 Spacebucks':'💀 Schmeckles';
    const syn=pos.collateral==='spacebucks'?'alUSD':'alETH';
    const icon=pos.collateral==='spacebucks'?'🪙':'💀';
    const claimable=pos.debt<=0.001;
    // pos.deposited is a float that grows via yield and shrinks via redemption each tick
    const depositDisplay=pos.deposited.toFixed(2);
    const claimAmt=Math.floor(pos.deposited);
    const yRate=(pos.collateral==='spacebucks'?(G.sbYieldRate||0.002):(G.schYieldRate||0.001))*100;
    const rRate=(G.redemptionRate||0.005)*100;
    const netPctPerTick=claimable?`+${yRate.toFixed(3)}%/tick`:`${(yRate-rRate).toFixed(3)}%/tick net`;
    const netColor=claimable?'#4CAF50':(yRate>=rRate?'#4CAF50':'#FF8800');
    posHTML+=`<div class="bank-pos">
      <b>${colLabel}</b> deposited: <span style="color:#4FC3F7">${depositDisplay}</span> <span style="color:${netColor};font-size:.7rem">(${netPctPerTick})</span> | borrowed: ${pos.borrowed.toFixed(2)} ${syn} | debt: <span style="color:${pos.debt>0.001?'#FF8800':'#4CAF50'}">${pos.debt.toFixed(2)}</span> ${syn}<br>
      <div class="bank-bar"><div class="bank-bar-fill" style="width:${pct}%"></div></div>
      <span style="font-size:.75rem">${pct}% repaid</span>
      ${claimable?`<button onclick="claimBankPosition(${i})" style="background:#4CAF50;color:#000;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:8px">✓ CLAIM ${claimAmt} ${icon}</button>`:''}
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
export function depositBank(collateral){
  const amt=parseInt(document.getElementById('bank-deposit-amt').value)||0;
  if(amt<=0){chatLog('Enter a deposit amount.','#FF8800');return;}
  if(collateral==='spacebucks'&&G.spacebucks<amt){chatLog('Not enough Spacebucks!','#FF4444');return;}
  if(collateral==='schmeckles'&&G.schmeckles<amt){chatLog('Not enough Schmeckles!','#FF4444');return;}
  // Server-authoritative: pdb is updated first so anti-cheat won't block the resulting
  // alETH/alUSD increase when save_character fires.
  G._txPending=true;
  socket?.emit('bank_borrow',{collateral,amount:amt});
}
export function claimBankPosition(idx){
  const pos=G.bankPositions[idx];
  if(!pos||pos.debt>0.001||pos.claimed)return;
  G._txPending=true;
  socket?.emit('bank_claim',{idx});
}

// ── TRANSMUTER ────────────────────────────────────────────────────────────────
export const TRANSMUTER_EXIT_FEE = 0.10; // 10% early-withdrawal penalty (mirrors v3 exitFee)

export function openTransmuter(){
  G.paused=true;
  renderTransmuterUI();
  document.getElementById('transmuter-ui').style.display='flex';
}
export function closeTransmuter(){
  G.paused=false;
  document.getElementById('transmuter-ui').style.display='none';
}
export function renderTransmuterUI(){
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
export function depositTransmuter(type){
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
export function claimTransmuter(idx){
  const dep=G.transmuterDeposits[idx];
  if(!dep||dep.available<=0.001)return;
  // Server-authoritative: pdb.spacebucks/schmeckles updated before save_character fires.
  socket?.emit('transmuter_claim',{idx});
}

// Early withdrawal — returns unconverted synthetic minus exitFee (10% → Treasury)
export function earlyWithdrawTransmuter(idx){
  const dep=G.transmuterDeposits[idx];
  if(!dep||dep.amount<=0.001)return;
  // Server-authoritative: pdb.alETH/alUSD updated and treasury fee credited before save fires.
  socket?.emit('transmuter_withdraw',{idx});
}
export function distributeTransmuterPool(sbAmount,ethAmount){
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
// spacebucks=$1 | alUSD=live (~$1) | schmeckles=spot ETH | alETH=alETH token | alcx=live
// All except spacebucks are updated on price_update from server.
export const EXCHANGE_RATES={spacebucks:1,schmeckles:2000,alUSD:1,alETH:2000,alcx:5};

// ── CHANGELOG ─────────────────────────────────────────────────────────────────
// Add new entries at the TOP. Each entry has: version, date, sections[].
// Each section has a title and items[]. LATEST_VERSION drives the "NEW" badge.
export const CHANGELOG=[
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
export const LATEST_VERSION=CHANGELOG[0].version;
const CL_KEY='vq_changelog_seen'; // localStorage key

export function openChangelog(){
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
export function closeChangelog(){
  const overlay=document.getElementById('changelog-overlay');
  if(overlay)overlay.style.display='none';
}
// ── COLLATERAL SIMULATOR (Actuary Venn) ────────────────────────────────────────
export function openSimulator(){
  G.paused=true;
  const el=document.getElementById('simulator-ui');
  if(!el)return;
  el.style.display='flex';
  // Seed sliders from live server rates
  const collateral=document.getElementById('sim-collateral')?.value||'spacebucks';
  const yr=collateral==='spacebucks'?(G.sbYieldRate||0.002):(G.schYieldRate||0.001);
  const rr=G.redemptionRate||0.005;
  const yrSlider=document.getElementById('sim-yield');
  const rrSlider=document.getElementById('sim-redeem');
  if(yrSlider){yrSlider.value=yr; document.getElementById('sim-yield-val').textContent=`${(yr*100).toFixed(3)}%`;}
  if(rrSlider){rrSlider.value=rr; document.getElementById('sim-redeem-val').textContent=`${(rr*100).toFixed(3)}%`;}
  simUpdate();
}
export function closeSimulator(){
  G.paused=false;
  const el=document.getElementById('simulator-ui');
  if(el)el.style.display='none';
}
function _simRun(collateral,startDeposited,startDebt,yieldRate,redemptionRate,ticks){
  const pts=[];
  let dep=startDeposited, debt=startDebt;
  pts.push({dep,debt});
  for(let t=0;t<ticks;t++){
    dep=dep*(1+yieldRate);
    if(debt>0.001){
      const slice=dep*redemptionRate;
      dep=Math.max(0,dep-slice);
      debt=Math.max(0,debt-slice);
    }
    pts.push({dep,debt});
  }
  return pts;
}
function _simDraw(pts,ticks){
  const canvas=document.getElementById('sim-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  if(!pts.length)return;
  const maxVal=Math.max(...pts.map(p=>Math.max(p.dep,p.debt)),1);
  const px=i=>Math.round(i/ticks*(W-20)+10);
  const py=v=>Math.round(H-10-(v/maxVal)*(H-20));
  // Grid
  ctx.strokeStyle='#1a2a3a'; ctx.lineWidth=1;
  for(let g=0;g<=4;g++){
    const y=py(maxVal*g/4);
    ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(W-10,y);ctx.stroke();
    ctx.fillStyle='#446'; ctx.font='9px monospace'; ctx.textAlign='right';
    ctx.fillText((maxVal*g/4).toFixed(0),42,y+3);
  }
  // Deposited line (blue)
  ctx.strokeStyle='#4FC3F7'; ctx.lineWidth=2; ctx.beginPath();
  pts.forEach((p,i)=>i===0?ctx.moveTo(px(i),py(p.dep)):ctx.lineTo(px(i),py(p.dep)));
  ctx.stroke();
  // Debt line (red)
  ctx.strokeStyle='#EF5350'; ctx.lineWidth=2; ctx.beginPath();
  pts.forEach((p,i)=>i===0?ctx.moveTo(px(i),py(p.debt)):ctx.lineTo(px(i),py(p.debt)));
  ctx.stroke();
  // Legend
  ctx.font='10px monospace'; ctx.textAlign='left';
  ctx.fillStyle='#4FC3F7'; ctx.fillText('── deposited',W-130,18);
  ctx.fillStyle='#EF5350'; ctx.fillText('── debt',W-130,30);
}
// Called from inline HTML event handlers (window scope via main.js)
export function simUpdate(){
  const collateral=document.getElementById('sim-collateral')?.value||'spacebucks';
  const startDep=parseFloat(document.getElementById('sim-collateral-amt')?.value)||1000;
  const startDebt=parseFloat(document.getElementById('sim-debt')?.value)||500;
  const ticks=Math.min(2000,parseInt(document.getElementById('sim-ticks')?.value)||500);
  const yr=parseFloat(document.getElementById('sim-yield')?.value)||(collateral==='spacebucks'?0.002:0.001);
  const rr=parseFloat(document.getElementById('sim-redeem')?.value)||0.005;
  const pts=_simRun(collateral,startDep,startDebt,yr,rr,ticks);
  _simDraw(pts,ticks);
  // Update yield slider label with the collateral-appropriate live rate hint
  const liveYr=(collateral==='spacebucks'?(G.sbYieldRate||0.002):(G.schYieldRate||0.001));
  const liveYrEl=document.getElementById('sim-yield-val');
  if(liveYrEl)liveYrEl.textContent=`${(yr*100).toFixed(3)}%${Math.abs(yr-liveYr)<0.00005?' ✓ (live)':''}`;
  // Summary
  const last=pts[pts.length-1];
  const paidOff=last.debt<=0.001;
  const growth=last.dep-startDep;
  const summaryEl=document.getElementById('sim-summary');
  if(summaryEl){
    const gainLoss=growth>=0?`<span style="color:#4CAF50">+${growth.toFixed(2)} gained</span>`:`<span style="color:#EF5350">${growth.toFixed(2)} lost</span>`;
    const debtMsg=paidOff?`<span style="color:#4CAF50">✓ Debt paid off</span>`:`<span style="color:#FF8800">Debt remaining: ${last.debt.toFixed(2)}</span>`;
    summaryEl.innerHTML=`After ${ticks} ticks: deposited = <b>${last.dep.toFixed(2)}</b> · ${gainLoss} · ${debtMsg}`;
  }
}
export function simYieldChange(){
  const yr=parseFloat(document.getElementById('sim-yield')?.value)||0.002;
  const el=document.getElementById('sim-yield-val');
  if(el)el.textContent=`${(yr*100).toFixed(3)}%`;
  simUpdate();
}
export function simRedeemChange(){
  const rr=parseFloat(document.getElementById('sim-redeem')?.value)||0.005;
  const el=document.getElementById('sim-redeem-val');
  if(el)el.textContent=`${(rr*100).toFixed(3)}%`;
  simUpdate();
}
export function simReset(){
  const collateral=document.getElementById('sim-collateral')?.value||'spacebucks';
  const yr=collateral==='spacebucks'?(G.sbYieldRate||0.002):(G.schYieldRate||0.001);
  const rr=G.redemptionRate||0.005;
  const yrSlider=document.getElementById('sim-yield');
  const rrSlider=document.getElementById('sim-redeem');
  if(yrSlider){yrSlider.value=yr; document.getElementById('sim-yield-val').textContent=`${(yr*100).toFixed(3)}%`;}
  if(rrSlider){rrSlider.value=rr; document.getElementById('sim-redeem-val').textContent=`${(rr*100).toFixed(3)}%`;}
  simUpdate();
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
export function applyLivePrices(prices){
  if(prices.alUSD) EXCHANGE_RATES.alUSD=prices.alUSD;    // stablecoin — can depeg
  if(prices.alETH) EXCHANGE_RATES.alETH=prices.alETH;    // alETH liquid-staking token
  if(prices.ETH)   EXCHANGE_RATES.schmeckles=prices.ETH; // schmeckles track spot ETH
  if(prices.alcx)  EXCHANGE_RATES.alcx=prices.alcx;
  // spacebucks stays hardcoded at 1
  G.livePrices={...prices};
}
export function openExchange(){
  G.paused=true;
  renderExchangeUI();
  document.getElementById('exchange-ui').style.display='flex';
}
export function closeExchange(){
  G.paused=false;
  document.getElementById('exchange-ui').style.display='none';
}
export function doExchange(){
  const from=document.getElementById('ex-from').value;
  const to=document.getElementById('ex-to').value;
  const amt=parseFloat(document.getElementById('ex-amount').value)||0;
  if(from===to){chatLog('Select different tokens to swap.','#FF8800');return;}
  if(amt<=0){chatLog('Enter an amount.','#FF8800');return;}
  const bal={spacebucks:G.spacebucks,schmeckles:G.schmeckles,alUSD:G.alUSD,alETH:G.alETH,alcx:G.alcx}[from];
  if(bal<amt){chatLog('Insufficient balance!','#FF4444');SFX.error();return;}
  // Server-authoritative: server validates, executes exchange, updates pdb, responds with new balances.
  // Block auto-save until result arrives to prevent race-condition currency revert.
  G._txPending = true;
  socket?.emit('currency_exchange',{from,to,amount:amt});
}
export function renderExchangeUI(){
  const smRate=EXCHANGE_RATES.schmeckles||2000;
  document.getElementById('ex-sb').textContent=G.spacebucks;
  // Schmeckles are ETH-pegged — show quantity and approximate USD value
  const smVal=(G.schmeckles*smRate);
  document.getElementById('ex-sm').textContent=
    `${G.schmeckles.toFixed?G.schmeckles.toFixed(4):G.schmeckles} (≈$${smVal.toFixed(0)})`;
  document.getElementById('ex-alusd').textContent=G.alUSD.toFixed(2);
  document.getElementById('ex-aleth').textContent=G.alETH.toFixed(4);
  document.getElementById('ex-alcx').textContent=(G.alcx||0).toFixed(2);
}

// ── SHOP ──────────────────────────────────────────────────────────────────────
// ── Gear durability system ────────────────────────────────────────────────────
// Max durability by rarity; starting (untagged) gear gets 40.
export const MAX_DUR={common:60,rare:80,epic:100};
export function itemMaxDur(item){return MAX_DUR[item?.rarity||'common']||40;}
// Call when an item enters the player's possession (buy or loot) to stamp durability.
export function stampDurability(item){
  if(!item||item.type==='potion'||item.durability!=null)return item;
  item.maxDurability=itemMaxDur(item);
  item.durability=item.maxDurability;
  return item;
}
// Reduce durability by amt, floor at 0.
export function degradeItem(item,amt=1){
  if(!item||item.type==='potion')return;
  if(item.durability==null){stampDurability(item);}
  item.durability=Math.max(0,item.durability-amt);
}
// Effective DEF/DMG from an item — 0 when completely broken.
export function itemEffDef(item){
  if(!item||item.durability==null)return item?.def||0;
  if(item.durability<=0)return 0;
  return item.def||0;
}
export function itemEffDmg(item){
  if(!item||item.durability==null)return item?.dmg||2;
  if(item.durability<=0)return 1; // fists-only when weapon broken
  return item.dmg||2;
}
// Repair all equipped gear; cost is 35% of (base item cost × wear fraction).
export function repairAllGear(){
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

export function openShop(vendorId){
  G.shop={vendorId};
  G.paused=true;
  renderShop();
  document.getElementById('shop-overlay').classList.add('open');
}
export function closeShop(){
  if(!G.shop)return;
  G.shop=null;
  G.paused=false;
  document.getElementById('shop-overlay').classList.remove('open');
}
export function renderShop(){
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
export function buyItem(vendorId,idx){
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
export function usePotion(slotIdx){
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
export function renderTileLayer(){
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
export const FG_TILES=new Set([T.TREE,T.COLUMN,T.STALL]);
// Pixels from tile top to include in the foreground layer
export const FG_HEIGHTS={[T.TREE]:18,[T.COLUMN]:8,[T.STALL]:10};

export function renderFgLayer(ctx){
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
export const MINI_COLORS={
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
export function renderMinimap(ctx){
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
export const SPRITE_SCALE=1.5; // Mega Man X–style: sprites appear large relative to tiles
// Helper: draw a sprite scaled from its foot position
function scaledSprite(ctx,footX,footY,drawFn){
  ctx.save();
  ctx.translate(footX,footY);
  ctx.scale(SPRITE_SCALE,SPRITE_SCALE);
  drawFn(-12,-44); // sprite origin offset (center-x=12, height=44)
  ctx.restore();
}

export function renderSpriteLayer(ctx){
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
export function renderGovernancePanel(ctx){
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
    {label:'', val:'', color:'#333'},
    {label:'── BANK RATES ──', val:'', color:'#FFD700'},
    {label:'SB yield (alUSD)',  val:`+${((G.sbYieldRate||0.002)*100).toFixed(3)}%/tick`,   color:'#4FC3F7'},
    {label:'SCH yield (alETH)', val:`+${((G.schYieldRate||0.001)*100).toFixed(3)}%/tick`,  color:'#9C27B0'},
    {label:'Redemption rate',   val:`-${((G.redemptionRate||0.005)*100).toFixed(3)}%/tick`,color:'#EF5350'},
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
  ['💱 Currency Exchange', TOWN_OX+23, TOWN_OY+12,  '#FF9944'],
];
export function renderBuildingSigns(ctx){
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

export function renderHUD(){
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
  document.getElementById('hud-alusd').textContent = `$${G.alUSD.toFixed(2)}`;
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
export function togglePause(){
  G.paused=!G.paused;
  const overlay=document.getElementById('pause-overlay');
  overlay.className=G.paused?'open':'';
  if(G.paused)renderInventoryScreen();
}

// ── HOW TO PLAY overlay ───────────────────────────────────────────────────────
export const HELP_PAGES=[
  {
    title:'🗺 Getting Around',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 8px">Movement & Controls</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:10px">
  <tr><td style="color:#FFD700;width:40%;padding:3px 0">WASD / Arrow Keys</td><td>Move your character</td></tr>
  <tr><td style="color:#FFD700;padding:3px 0">E / Space / Enter</td><td>Interact with NPCs and doors</td></tr>
  <tr><td style="color:#FFD700;padding:3px 0">Escape</td><td>Open character menu / close panels</td></tr>
  <tr><td style="color:#FFD700;padding:3px 0">T / Enter</td><td>Open chat (talk to other players)</td></tr>
</table>
<p style="color:#4FC3F7;font-weight:bold;margin:8px 0">The World</p>
<p>You start in <b>Town Square</b> — the hub connecting everything. From here you can reach:</p>
<ul style="margin:4px 0;padding-left:18px">
  <li>🍺 <b>The Tavern</b> (north-west) — quests, gear, and rumours</li>
  <li>🏛 <b>Governance Hall</b> (north-east) — vote on protocol policy</li>
  <li>🛒 <b>Marketplace</b> (east gate) — buy/sell items with other players</li>
  <li>🏦 <b>Treasury</b> (south gate) — deposit alUSD/alETH into the transmuter</li>
  <li>🗡 <b>Dungeons & Wilds</b> — combat zones reachable through portals</li>
</ul>
<p style="color:#888;font-size:.78rem;margin-top:6px">💡 Walk up to any glowing NPC and press <b>E</b> to talk. Doors automatically open when you step on them.</p>
`
  },
  {
    title:'💰 Currencies',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 8px">Six currencies power the economy</p>
<table style="width:100%;border-collapse:collapse">
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700;width:38%">🪙 Spacebucks</td>
    <td style="padding:5px 0">Basic currency — earned from quests, loot, zones. Used in most shops.</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">💀 Schmeckles</td>
    <td style="padding:5px 0">Rarer currency — higher-tier shops and collateral for alETH loans.</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#4FC3F7">◈ alUSD</td>
    <td style="padding:5px 0">Synthetic dollar — borrowed from the bank against Spacebucks. Stable-ish.</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#4FC3F7">⬡ alETH</td>
    <td style="padding:5px 0">Synthetic ETH — borrowed from the bank against Schmeckles. Volatile.</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#9C27B0">⚗ ALCX</td>
    <td style="padding:5px 0">Governance token — earned while waiting in veQueues. Used to vote.</td>
  </tr>
</table>
<p style="color:#888;font-size:.78rem;margin-top:8px">💡 Swap any currency for any other at <b>Exchanger Rex</b> (Town Square, near the fountain) for a 0.3% fee.</p>
<p style="color:#888;font-size:.78rem">💡 Live alETH and ALCX prices are pulled from real market data and update every few minutes. Watch the Town Crier for price alerts!</p>
`
  },
  {
    title:'🏦 Bank & Loans',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 6px">Self-Repaying Loans — No Liquidation Risk</p>
<p>Talk to <b>Banker Alyx</b> in the <b>Treasury</b> zone to access the Alchemix Bank.</p>
<div style="background:#0a1520;border:1px solid #1a3a5a;border-radius:6px;padding:10px;margin:8px 0">
  <p style="margin:0 0 6px;color:#FFD700">How it works:</p>
  <ol style="margin:0;padding-left:18px">
    <li>Deposit <b>🪙 Spacebucks</b> as collateral → borrow up to <b>90%</b> as <b>◈ alUSD</b></li>
    <li>Deposit <b>💀 Schmeckles</b> as collateral → borrow up to <b>90%</b> as <b>⬡ alETH</b></li>
    <li>Your deposited collateral <b>grows</b> every tick (yield rate) and <b>shrinks</b> by a redemption slice sent to the transmuter while debt remains</li>
    <li>Once debt is fully paid, only growth applies — your collateral compounds freely</li>
    <li>Once fully repaid, claim your collateral back from Banker Alyx</li>
  </ol>
</div>
<p>These are <b>self-repaying</b> loans. Each tick: your collateral grows by the <b style="color:#4FC3F7">yield rate</b>, then a <b style="color:#FF8800">redemption slice</b> is physically taken from your collateral and sent to the transmuter — reducing both your deposit and your debt by the same amount. Once debt reaches zero, only the yield applies: your collateral grows freely. You can never be liquidated.</p>
<p style="color:#888;font-size:.78rem;margin-top:6px">💡 Use borrowed alUSD/alETH to buy gear in the Marketplace, deposit into the Transmuter for yield, or swap at the Exchange. The collateral stays locked until the loan is repaid.</p>
`
  },
  {
    title:'⚗ Transmuter',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 6px">Convert Synthetics Back to Collateral</p>
<p>Talk to <b>Transmuter Mira</b> in the <b>Treasury</b> zone.</p>
<div style="background:#0a1520;border:1px solid #1a3a5a;border-radius:6px;padding:10px;margin:8px 0">
  <p style="margin:0 0 6px;color:#FFD700">How it works:</p>
  <ol style="margin:0;padding-left:18px">
    <li>Deposit <b>◈ alUSD</b> → when borrowers repay debt, you receive <b>🪙 Spacebucks</b> at 1:1</li>
    <li>Deposit <b>⬡ alETH</b> → when borrowers repay debt, you receive <b>💀 Schmeckles</b> at 1:1</li>
    <li>Claim your earned collateral any time once it appears as "available"</li>
  </ol>
</div>
<p><b>Arbitrage play:</b> If alUSD is trading below $1.00 at the Exchange, you can buy it cheap and deposit into the Transmuter to earn 1:1 Spacebucks — pocketing the spread.</p>
<p style="color:#FF8C00;margin-top:6px">⚠ Early withdrawal costs a <b>10% exit fee</b> on the unconverted amount. Plan accordingly.</p>
<p style="color:#888;font-size:.78rem;margin-top:6px">💡 Global redemption events happen on a server-wide timer — your deposit earns a pro-rata share of each redemption batch.</p>
`
  },
  {
    title:'🎫 veQueue System',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 6px">Patience-Based Access to DeFi Zones</p>
<p>The <b>Marketplace</b> and <b>Treasury</b> are rate-limited — you need a queue ticket to enter.</p>
<div style="background:#0a1520;border:1px solid #1a3a5a;border-radius:6px;padding:10px;margin:8px 0">
  <p style="margin:0 0 6px;color:#FFD700">Joining a queue:</p>
  <ol style="margin:0;padding-left:18px">
    <li>Walk to the entry gate of the zone and press <b>E</b></li>
    <li>Lock a portion of your <b>⚗ ALCX</b> as a commitment deposit</li>
    <li>Receive your ticket number — then roam freely while you wait</li>
    <li>When your number is called, walk to the gate and enter!</li>
  </ol>
</div>
<p style="color:#9C27B0;font-weight:bold;margin:8px 0 4px">While you wait, you earn ALCX:</p>
<ul style="margin:0;padding-left:18px">
  <li>+1 ALCX every few seconds just for being in the queue</li>
  <li>More ALCX per yield tick once inside the zone (seniority bonus)</li>
</ul>
<p style="margin-top:8px"><b>Fast-exit fee:</b> Need to leave before your turn? You pay <b>2.5 ALCX per position</b> you're jumping. That fee goes to the patient waiters ahead of you.</p>
<p style="color:#888;font-size:.78rem;margin-top:6px">💡 ALCX locked for the queue stays locked for your entire veQueue district visit. It's returned when you exit the district. While locked, it counts as your governance vote weight — head to the Governance Chamber to vote!</p>
`
  },
  {
    title:'🗳 Governance',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 6px">Vote on Protocol Policy with Your ALCX</p>
<p>Enter <b>Governance Hall</b> (north-east of Town Square) and talk to the <b>Governance Board</b>.</p>
<div style="background:#0a1520;border:1px solid #1a3a5a;border-radius:6px;padding:10px;margin:8px 0">
  <p style="margin:0 0 6px;color:#FFD700">The redemption rate:</p>
  <p style="margin:0">Each tick, a percentage of a borrower's deposited collateral is physically redirected to the Transmuter, simultaneously reducing their debt. Governance proposals set this rate (0.1%–2.0%). Higher rates = faster loan payoff and more transmuter yield, but raise the risk of deposit erosion if yield dips below the redemption rate.</p>
</div>
<p style="color:#FFD700;font-weight:bold;margin:8px 0 4px">How to vote:</p>
<ol style="margin:0;padding-left:18px">
  <li>You must have ALCX <b>locked in a veQueue</b> (join the Marketplace or Treasury queue first)</li>
  <li>Any queued player can propose a new rate — must stake at least 1 ALCX</li>
  <li>Other queued players vote FOR or AGAINST within a <b>24-hour epoch</b></li>
  <li>If total vote weight ≥ 50 ALCX quorum, the winning side sets the new rate</li>
  <li>Your staked ALCX is returned after the vote settles</li>
</ol>
<p style="color:#888;font-size:.78rem;margin-top:6px">💡 Your vote weight = the amount of queue-locked ALCX you stake on the vote. Locking more = more influence. Staked ALCX is inaccessible for other purposes until the epoch ends.</p>
`
  },
  {
    title:'⚔ Combat & Quests',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 6px">Fighting Enemies & Completing Quests</p>
<p style="color:#FFD700;font-weight:bold;margin:4px 0">Combat</p>
<ul style="margin:0 0 8px;padding-left:18px">
  <li>Walk into an enemy to attack — combat is automatic</li>
  <li>Enemies drop <b>loot piles</b> on death — walk over and press <b>E</b> to claim</li>
  <li>Loot decays 20% if it sits unclaimed too long</li>
  <li>Die in battle? You respawn in Town Square and drop a loot pile for others to find</li>
</ul>
<p style="color:#FFD700;font-weight:bold;margin:4px 0">Stats</p>
<ul style="margin:0 0 8px;padding-left:18px">
  <li><b>STR</b> — physical attack power</li>
  <li><b>DEF</b> — damage reduction</li>
  <li><b>AGI</b> — dodge chance and attack speed</li>
  <li><b>VIT</b> — max HP</li>
  <li><b>LCK</b> — crit chance and max MP</li>
</ul>
<p style="color:#FFD700;font-weight:bold;margin:4px 0">Quests</p>
<p>Talk to NPCs with a <b>🗡</b> quest indicator to pick up quests. Kill targets, then return to collect your reward — XP, Spacebucks, and gear.</p>
<p style="color:#888;font-size:.78rem;margin-top:6px">💡 Level up by earning XP → gain stat points to allocate at the Character menu (Escape). Higher levels unlock harder dungeons with better loot.</p>
`
  },
  {
    title:'🛒 Shops & NPCs',
    html:`
<p style="color:#4FC3F7;font-weight:bold;margin:0 0 8px">Key NPCs to Know</p>
<table style="width:100%;border-collapse:collapse">
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700;width:40%">📣 Town Crier</td>
    <td style="padding:5px 0">Town Square — price alerts, market news, and quests</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">🧙 Exchanger Rex</td>
    <td style="padding:5px 0">Town Square — swap any currency for any other (0.3% fee)</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">🏪 Merchant Ned</td>
    <td style="padding:5px 0">Town Square — potions and basic supplies</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">🛡 Armorer Brix</td>
    <td style="padding:5px 0">Governance Hall area — high-tier armor and weapons</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">🏦 Banker Alyx</td>
    <td style="padding:5px 0">Treasury zone — self-repaying loans (see Bank tab)</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">⚗ Transmuter Mira</td>
    <td style="padding:5px 0">Treasury zone — synthetic-to-collateral conversion</td>
  </tr>
  <tr style="border-bottom:1px solid #1a2a3a">
    <td style="padding:5px 0;color:#FFD700">📦 Market Board</td>
    <td style="padding:5px 0">Marketplace — player-to-player item trading</td>
  </tr>
  <tr>
    <td style="padding:5px 0;color:#FFD700">🗳 Governance Board</td>
    <td style="padding:5px 0">Governance Hall — vote on redemption rate</td>
  </tr>
</table>
<p style="color:#888;font-size:.78rem;margin-top:8px">💡 Press <b>Escape → 📖 HOW TO PLAY</b> any time to re-open this guide.</p>
`
  },
];

let _helpPage=0;
export function showHelp(page){
  _helpPage=page??0;
  const el=document.getElementById('help-overlay');
  el.style.display='flex';
  _renderHelpPage();
}
export function closeHelp(){
  document.getElementById('help-overlay').style.display='none';
}
export function helpNav(dir){
  _helpPage=Math.max(0,Math.min(HELP_PAGES.length-1,_helpPage+dir));
  _renderHelpPage();
}
function _renderHelpPage(){
  // Build tab bar
  const tabs=document.getElementById('help-tabs');
  tabs.innerHTML=HELP_PAGES.map((p,i)=>{
    const active=i===_helpPage;
    return `<button onclick="showHelp(${i})" style="background:${active?'#0a1f33':'none'};border:none;border-bottom:2px solid ${active?'#4FC3F7':'transparent'};color:${active?'#4FC3F7':'#555'};cursor:pointer;padding:8px 12px;font-family:inherit;font-size:.75rem;white-space:nowrap;flex-shrink:0;transition:color .15s">${p.title}</button>`;
  }).join('');
  // Content
  document.getElementById('help-content').innerHTML=HELP_PAGES[_helpPage].html;
  // Page indicator
  document.getElementById('help-page-indicator').textContent=`${_helpPage+1} / ${HELP_PAGES.length}`;
  // Prev/next button state
  document.getElementById('help-prev').style.opacity=_helpPage===0?'0.3':'1';
  document.getElementById('help-next').style.opacity=_helpPage===HELP_PAGES.length-1?'0.3':'1';
  document.getElementById('help-next').textContent=_helpPage===HELP_PAGES.length-1?'DONE ✓':'NEXT ▶';
  if(_helpPage===HELP_PAGES.length-1){
    document.getElementById('help-next').onclick=closeHelp;
    document.getElementById('help-next').style.color='#4CAF50';
    document.getElementById('help-next').style.borderColor='#4CAF50';
  }else{
    document.getElementById('help-next').onclick=()=>helpNav(1);
    document.getElementById('help-next').style.color='#4FC3F7';
    document.getElementById('help-next').style.borderColor='#4FC3F7';
  }
}

// ── Helper: equip an item from a general inventory slot ──────────────────────
export function equipFromBag(slotIdx){
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
export function unequipWeapon(){
  const item=G.inventory[0];
  if(!item||item.bound)return; // can't unequip starting weapon
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){chatLog('No bag space to unequip!','#FF4444');return;}
  G.inventory[slot]=item;
  G.inventory[0]=null;
  chatLog(`Unequipped ${item.name} to bag.`,'#aaa');
  if(G.paused)renderInventoryScreen();
}
export function unequipShield(){
  const item=G.inventory[1];
  if(!item||item.bound)return;
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){chatLog('No bag space to unequip!','#FF4444');return;}
  G.inventory[slot]=item;
  G.inventory[1]=null;
  chatLog(`Unequipped ${item.name} to bag.`,'#aaa');
  if(G.paused)renderInventoryScreen();
}
export function unequipArmor(){
  const item=G.equippedArmor;
  if(!item)return;
  const slot=G.inventory.findIndex((s,i)=>i>=2&&s===null);
  if(slot===-1){chatLog('No bag space to unequip!','#FF4444');return;}
  G.inventory[slot]=item;
  G.equippedArmor=null;
  chatLog(`Unequipped ${item.name} to bag.`,'#aaa');
  if(G.paused)renderInventoryScreen();
}
export function sellFromBag(slotIdx){
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

export function dropFromBag(slotIdx){
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

export function renderInventoryScreen(){
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
