'use strict';
const express=require('express');
const http=require('http');
const{Server}=require('socket.io');
const path=require('path');
const crypto=require('crypto');
const fs=require('fs');

// ── Player Account DB (JSON file, in-memory with sync writes) ─────────────────
const DB_FILE=path.join(__dirname,'players.json');
let pdb={};
try{pdb=JSON.parse(fs.readFileSync(DB_FILE,'utf8'));}catch(e){pdb={};}
function saveDb(){try{fs.writeFileSync(DB_FILE,JSON.stringify(pdb),'utf8');}catch(e){console.error('DB save error',e);}}
function hashPin(pin){return crypto.createHash('sha256').update('vq2026:'+pin).digest('hex');}

const app=express();
const srv=http.createServer(app);
const io=new Server(srv,{cors:{origin:'*'}});
app.use(express.static(path.join(__dirname,'public')));

const players={};
const socketsByAccount={}; // accountId -> socket.id (for targeted emits)

// ── World Loot ────────────────────────────────────────────────────────────────
let worldLoot=[];
const LOOT_TTL_MS=10*60*1000;
let _lootIdSeq=1;
setInterval(()=>{
  const now=Date.now();
  const expired=worldLoot.filter(l=>now-l.spawnedAt>LOOT_TTL_MS);
  expired.forEach(l=>{
    worldLoot=worldLoot.filter(x=>x.id!==l.id);
    io.to(l.zone).emit('world_loot_removed',{id:l.id});
    io.to('world').emit('world_loot_removed',{id:l.id});
  });
},60000);

// ── Marketplace ────────────────────────────────────────────────────────────────
const MARKET_FILE=path.join(__dirname,'marketplace.json');
let marketplace=[];
try{marketplace=JSON.parse(fs.readFileSync(MARKET_FILE,'utf8'));}catch(e){marketplace=[];}
function saveMarket(){try{fs.writeFileSync(MARKET_FILE,JSON.stringify(marketplace),'utf8');}catch(e){console.error('Market save error',e);}}
let _marketIdSeq=marketplace.reduce((m,l)=>Math.max(m,l.id||0),0)+1;
setInterval(()=>{
  const now=Date.now();
  const before=marketplace.length;
  marketplace=marketplace.filter(l=>now-l.listedAt<24*60*60*1000);
  if(marketplace.length!==before){saveMarket();io.emit('market_state',{listings:marketplace});}
},5*60*1000);

// ── Queue state ───────────────────────────────────────────────────────────────
// Each economic zone has an entry queue and an exit queue.
// entries: [{id, nickname, ticket, locked}]
const QUEUE_ZONES=['marketplace','treasury'];
const QUEUE_TICK_MS=10000; // ms between serving next player

const queues={};
QUEUE_ZONES.forEach(z=>{
  queues[z]={
    entry:{serving:0,nextTicket:1,entries:[]},
    exit: {serving:0,nextTicket:1,entries:[]},
  };
});

function queueStateFor(zoneName){
  const q=queues[zoneName];
  return{
    zone:zoneName,
    entry:{serving:q.entry.serving,entries:q.entry.entries.map(e=>({nickname:e.nickname,ticket:e.ticket}))},
    exit: {serving:q.exit.serving, entries:q.exit.entries.map(e=>({nickname:e.nickname,ticket:e.ticket}))},
  };
}

function broadcastQueueState(zoneName){
  const state=queueStateFor(zoneName);
  // Everyone in town or inside the zone can see the queue
  io.to('world').emit('queue_state',state);
  io.to(zoneName).emit('queue_state',state);
}

function serveNext(zoneName,qt){
  const side=queues[zoneName][qt];
  if(side.entries.length===0)return;
  const next=side.entries.find(e=>e.ticket>side.serving);
  if(!next)return;
  side.serving=next.ticket;
  io.to(next.id).emit('queue_served',{zone:zoneName,queueType:qt,ticket:next.ticket});
  broadcastQueueState(zoneName);
}

// Auto-advance: serve the next waiting player on every tick (only if >1 in queue)
setInterval(()=>{
  QUEUE_ZONES.forEach(zoneName=>{
    ['entry','exit'].forEach(qt=>{
      const side=queues[zoneName][qt];
      // Only advance if there's at least one person waiting beyond the current served
      if(side.entries.some(e=>e.ticket>side.serving)){
        serveNext(zoneName,qt);
      }
    });
  });
},QUEUE_TICK_MS);

// ── Player helpers ────────────────────────────────────────────────────────────
const publicP=id=>{
  const p=players[id];if(!p)return null;
  return{
    id:p.id,nickname:p.nickname,color:p.color,
    hairColor:p.hairColor,species:p.species,class_:p.class_,
    zone:p.zone,x:p.x,y:p.y,dir:p.dir,frame:p.frame,moving:p.moving,
  };
};
const zonePlayers=(zone,excl)=>
  Object.values(players).filter(p=>p.zone===zone&&p.id!==excl).map(p=>publicP(p.id));

// ── Socket events ─────────────────────────────────────────────────────────────
io.on('connection',socket=>{
  console.log('connect',socket.id);

  socket.accountId=null;

  socket.on('auth_register',({username,pin})=>{
    if(!username||!pin||username.length<2||String(pin).length<4)
      return socket.emit('auth_result',{ok:false,error:'Username (min 2 chars) and PIN (min 4 digits) required.'});
    if(username.length>20)
      return socket.emit('auth_result',{ok:false,error:'Username max 20 characters.'});
    const key=username.toLowerCase();
    if(pdb[key])
      return socket.emit('auth_result',{ok:false,error:'Username already taken.'});
    pdb[key]={username,pin_hash:hashPin(String(pin)),data:null,created:Date.now()};
    saveDb();
    socket.accountId=key;
    socketsByAccount[key]=socket.id;
    socket.emit('auth_result',{ok:true,isNew:true,username});
  });

  socket.on('auth_login',({username,pin})=>{
    const key=username.toLowerCase();
    const row=pdb[key];
    if(!row||row.pin_hash!==hashPin(String(pin)))
      return socket.emit('auth_result',{ok:false,error:'Invalid username or PIN.'});
    socket.accountId=key;
    socketsByAccount[key]=socket.id;
    socket.emit('auth_result',{ok:true,isNew:false,username:row.username,data:row.data||null});
  });

  // Sync bank positions after any bank transaction (deposit/claim)
  socket.on('bank_sync',data=>{
    if(!socket.accountId||!pdb[socket.accountId])return;
    pdb[socket.accountId].data=pdb[socket.accountId].data||{};
    pdb[socket.accountId].data.bankPositions=data.bankPositions;
    saveDb();
  });

  // Sync transmuter deposits after any transmuter transaction
  socket.on('transmuter_sync',data=>{
    if(!socket.accountId||!pdb[socket.accountId])return;
    pdb[socket.accountId].data=pdb[socket.accountId].data||{};
    pdb[socket.accountId].data.transmuterDeposits=data.transmuterDeposits;
    saveDb();
  });

  socket.on('save_character',data=>{
    if(!socket.accountId)return;
    pdb[socket.accountId].data=data;
    pdb[socket.accountId].updated=Date.now();
    saveDb();
  });

  socket.on('join',data=>{
    players[socket.id]={
      id:socket.id,
      nickname:data.nickname||'Hero',
      color:data.color||'#2255DD',
      hairColor:data.hairColor||'#3A2010',
      species:data.species||'human',
      class_:data.class_||'warrior',
      zone:data.zone||'world',
      x:data.x||660, y:data.y||460,
      dir:2,frame:0,moving:false,
      schmeckles:data.schmeckles||100,
    };
    const p=players[socket.id];
    socket.join(p.zone);
    socket.emit('welcome',{id:socket.id,count:Object.keys(players).length});
    socket.emit('zone_players',zonePlayers(p.zone,socket.id));
    socket.to(p.zone).emit('player_joined',publicP(socket.id));
    // Send current queue state for all economic zones
    QUEUE_ZONES.forEach(z=>socket.emit('queue_state',queueStateFor(z)));
    socket.emit('world_loot_init',{piles:worldLoot.filter(l=>l.zone===p.zone)});
    socket.emit('market_state',{listings:marketplace});
  });

  socket.on('move',data=>{
    const p=players[socket.id];if(!p)return;
    p.x=data.x;p.y=data.y;p.dir=data.dir;p.frame=data.frame;p.moving=data.moving;
    if(data.zone!==p.zone){
      socket.leave(p.zone);socket.to(p.zone).emit('player_left',socket.id);
      p.zone=data.zone;socket.join(p.zone);
      socket.emit('zone_players',zonePlayers(p.zone,socket.id));
      socket.to(p.zone).emit('player_joined',publicP(socket.id));
    } else {
      socket.to(p.zone).emit('player_moved',publicP(socket.id));
    }
  });

  socket.on('zone_change',data=>{
    const p=players[socket.id];if(!p)return;
    socket.leave(p.zone);socket.to(p.zone).emit('player_left',socket.id);
    p.zone=data.zone;p.x=data.x;p.y=data.y;
    socket.join(p.zone);
    socket.emit('zone_players',zonePlayers(p.zone,socket.id));
    socket.to(p.zone).emit('player_joined',publicP(socket.id));
    socket.emit('world_loot_init',{piles:worldLoot.filter(l=>l.zone===p.zone)});
  });

  socket.on('chat',data=>{
    const p=players[socket.id];if(!p)return;
    io.to(p.zone).emit('chat',{nickname:p.nickname,text:String(data.text).slice(0,200)});
  });

  // ── Queue events ──
  socket.on('queue_join',data=>{
    const p=players[socket.id];if(!p)return;
    const{zone,queueType,locked}=data;
    if(!QUEUE_ZONES.includes(zone)||!['entry','exit'].includes(queueType))return;
    const side=queues[zone][queueType];
    // Prevent double-join
    if(side.entries.find(e=>e.id===socket.id))return;
    const ticket=side.nextTicket++;
    side.entries.push({id:socket.id,nickname:p.nickname,ticket,locked:locked||0});
    socket.emit('queue_joined',{zone,queueType,ticket,serving:side.serving});
    // If this player is first (or the only one unserved), serve immediately
    if(side.entries.length===1||(side.entries.length>0&&side.serving===0)){
      side.serving=ticket;
      socket.emit('queue_served',{zone,queueType,ticket});
    }
    broadcastQueueState(zone);
  });

  socket.on('queue_leave',data=>{
    const{zone,queueType}=data;
    if(!QUEUE_ZONES.includes(zone)||!['entry','exit'].includes(queueType))return;
    const side=queues[zone][queueType];
    const idx=side.entries.findIndex(e=>e.id===socket.id);
    if(idx<0)return;
    side.entries.splice(idx,1);
    // Immediately serve the next person
    serveNext(zone,queueType);
    broadcastQueueState(zone);
  });

  socket.on('loot_drop',data=>{
    const p=players[socket.id];if(!p)return;
    const{zone,x,y,items,currencies,killerType}=data;
    const pile={
      id:_lootIdSeq++,zone,x,y,
      items:(items||[]).slice(0,6),
      currencies:{
        spacebucks:Math.max(0,Math.floor(currencies?.spacebucks||0)),
        schmeckles:Math.max(0,Math.floor(currencies?.schmeckles||0)),
        alUSD:Math.max(0,parseFloat((currencies?.alUSD||0).toFixed(2))),
      },
      ownerName:p.nickname,killerType:killerType||'unknown',spawnedAt:Date.now(),
    };
    worldLoot.push(pile);
    io.to(zone).emit('world_loot_added',{pile});
    io.to('world').emit('world_loot_added',{pile});
  });

  socket.on('loot_pickup',data=>{
    const{lootId}=data;
    const idx=worldLoot.findIndex(l=>l.id===lootId);
    if(idx<0)return socket.emit('loot_claimed',{ok:false,error:'Already taken.'});
    const pile=worldLoot.splice(idx,1)[0];
    const DECAY=0.20;
    const decayedItems=pile.items.map(item=>{
      const d={...item};
      if(d.dmg)d.dmg=Math.max(1,Math.floor(d.dmg*(1-DECAY)));
      if(d.def)d.def=Math.max(0,Math.floor(d.def*(1-DECAY)));
      if(d.heal)d.heal=Math.max(1,Math.floor(d.heal*(1-DECAY)));
      return d;
    });
    socket.emit('loot_claimed',{ok:true,lootId,items:decayedItems,currencies:pile.currencies,decayPct:DECAY,fromPlayer:pile.ownerName});
    io.to(pile.zone).emit('world_loot_removed',{id:pile.id});
    io.to('world').emit('world_loot_removed',{id:pile.id});
  });

  socket.on('market_list',data=>{
    if(!socket.accountId||!pdb[socket.accountId])return;
    const{inventorySlot,price,currency}=data;
    if(typeof inventorySlot!=='number'||inventorySlot<2||inventorySlot>7)return;
    if(!['alUSD','alETH'].includes(currency))return;
    const p=parseFloat(price);
    if(!p||p<=0||p>999999)return;
    const inv=pdb[socket.accountId].data?.inventory;
    if(!inv||!inv[inventorySlot])return socket.emit('market_error',{error:'No item in that slot.'});
    const item={...inv[inventorySlot]};
    inv[inventorySlot]=null;
    saveDb();
    const listing={id:_marketIdSeq++,sellerId:socket.accountId,sellerName:pdb[socket.accountId].username||socket.accountId,item,price:p,currency,listedAt:Date.now()};
    marketplace.push(listing);
    saveMarket();
    io.emit('market_state',{listings:marketplace});
    socket.emit('market_list_ok',{listing});
  });

  socket.on('market_buy',data=>{
    if(!socket.accountId||!pdb[socket.accountId])return;
    const{listingId}=data;
    const idx=marketplace.findIndex(l=>l.id===listingId);
    if(idx<0)return socket.emit('market_buy_result',{ok:false,error:'Listing not found.'});
    const listing=marketplace[idx];
    if(listing.sellerId===socket.accountId)return socket.emit('market_buy_result',{ok:false,error:"Can't buy your own listing."});
    const buyerData=pdb[socket.accountId].data;
    if(!buyerData)return socket.emit('market_buy_result',{ok:false,error:'No character data.'});
    const bal=listing.currency==='alETH'?(buyerData.alETH||0):(buyerData.alUSD||0);
    if(bal<listing.price)return socket.emit('market_buy_result',{ok:false,error:`Not enough ${listing.currency}.`});
    if(listing.currency==='alETH')buyerData.alETH=parseFloat(((buyerData.alETH||0)-listing.price).toFixed(4));
    else buyerData.alUSD=parseFloat(((buyerData.alUSD||0)-listing.price).toFixed(2));
    const buyerInv=buyerData.inventory=buyerData.inventory||new Array(8).fill(null);
    const freeSlot=buyerInv.findIndex((s,i)=>i>=2&&s===null);
    if(freeSlot!==-1)buyerInv[freeSlot]=listing.item;
    saveDb();
    const fee=parseFloat((listing.price*0.05).toFixed(listing.currency==='alETH'?4:2));
    const payout=parseFloat((listing.price-fee).toFixed(listing.currency==='alETH'?4:2));
    const sellerData=pdb[listing.sellerId]?.data;
    if(sellerData){
      if(listing.currency==='alETH')sellerData.alETH=parseFloat(((sellerData.alETH||0)+payout).toFixed(4));
      else sellerData.alUSD=parseFloat(((sellerData.alUSD||0)+payout).toFixed(2));
      saveDb();
    }
    const sellerSid=socketsByAccount[listing.sellerId];
    if(sellerSid)io.to(sellerSid).emit('market_sale_notify',{item:listing.item,price:listing.price,payout,currency:listing.currency});
    marketplace.splice(idx,1);
    saveMarket();
    io.emit('market_state',{listings:marketplace});
    socket.emit('market_buy_result',{ok:true,item:listing.item,price:listing.price,currency:listing.currency,sellerName:listing.sellerName});
  });

  socket.on('market_cancel',data=>{
    if(!socket.accountId)return;
    const{listingId}=data;
    const idx=marketplace.findIndex(l=>l.id===listingId&&l.sellerId===socket.accountId);
    if(idx<0)return;
    const listing=marketplace.splice(idx,1)[0];
    const sellerData=pdb[socket.accountId].data;
    if(sellerData){
      const inv=sellerData.inventory=sellerData.inventory||new Array(8).fill(null);
      const slot=inv.findIndex((s,i)=>i>=2&&s===null);
      if(slot!==-1)inv[slot]=listing.item;
      saveDb();
    }
    saveMarket();
    io.emit('market_state',{listings:marketplace});
    socket.emit('market_cancel_ok',{item:listing.item});
  });

  socket.on('disconnect',()=>{
    if(socket.accountId&&socketsByAccount[socket.accountId]===socket.id)
      delete socketsByAccount[socket.accountId];
    const p=players[socket.id];
    if(p){
      socket.to(p.zone).emit('player_left',socket.id);
      // Remove from any queues and serve next
      QUEUE_ZONES.forEach(z=>{
        ['entry','exit'].forEach(qt=>{
          const side=queues[z][qt];
          const idx=side.entries.findIndex(e=>e.id===socket.id);
          if(idx>=0){
            side.entries.splice(idx,1);
            serveNext(z,qt);
            broadcastQueueState(z);
          }
        });
      });
    }
    delete players[socket.id];
    console.log('disconnect',socket.id);
  });
});

// ── Global Transmuter Redemption (every 60s) ──────────────────────────────────
const EARMARK_RATE=0.005; // 0.5% of each position's debt earmarked+redeemed per cycle
setInterval(()=>{
  // 1. Compute total system debt across all accounts
  let totalDebt=0;
  Object.values(pdb).forEach(acct=>{
    (acct.data?.bankPositions||[]).forEach(p=>{if(!p.claimed&&p.debt>0.001)totalDebt+=p.debt;});
  });
  if(totalDebt<=0)return;

  // 2. Earmark + redeem per position, collect collateral
  let sbRedeemed=0,ethRedeemed=0;
  Object.entries(pdb).forEach(([id,acct])=>{
    if(!acct.data?.bankPositions)return;
    acct.data.bankPositions.forEach(pos=>{
      if(pos.claimed||pos.debt<=0.001)return;
      const redeem=EARMARK_RATE*pos.debt; // proportional to own debt (=debt/totalDebt * totalDebt * rate)
      pos.debt=Math.max(0,pos.debt-redeem);
      pos.earmarked=0;
      const net=redeem*(1-0.005); // 0.5% borrower redemption fee
      if(pos.collateral==='spacebucks')sbRedeemed+=net;
      else ethRedeemed+=net;
      if(pos.debt<=0.001)pos.debt=0;
    });
    // Push updated positions to connected player
    const sid=socketsByAccount[id];
    if(sid)io.to(sid).emit('bank_positions_updated',{bankPositions:acct.data.bankPositions});
  });

  if(sbRedeemed<=0&&ethRedeemed<=0){saveDb();return;}

  // 3. Distribute pro-rata to transmuter depositors
  let totalTrAlUSD=0,totalTrAlETH=0;
  Object.values(pdb).forEach(acct=>{
    (acct.data?.transmuterDeposits||[]).forEach(d=>{
      if(d.type==='alUSD'&&d.amount>0.001)totalTrAlUSD+=d.amount;
      if(d.type==='alETH'&&d.amount>0.001)totalTrAlETH+=d.amount;
    });
  });
  Object.entries(pdb).forEach(([id,acct])=>{
    if(!acct.data?.transmuterDeposits)return;
    let sbPayout=0,schmPayout=0;
    acct.data.transmuterDeposits.forEach(dep=>{
      if(dep.type==='alUSD'&&dep.amount>0.001&&totalTrAlUSD>0){
        const recv=Math.min(dep.amount,sbRedeemed*(dep.amount/totalTrAlUSD));
        dep.available=(dep.available||0)+recv; dep.amount=Math.max(0,dep.amount-recv); sbPayout+=recv;
      }
      if(dep.type==='alETH'&&dep.amount>0.001&&totalTrAlETH>0){
        const recv=Math.min(dep.amount,ethRedeemed*(dep.amount/totalTrAlETH));
        dep.available=(dep.available||0)+recv; dep.amount=Math.max(0,dep.amount-recv); schmPayout+=recv;
      }
    });
    if(sbPayout>0||schmPayout>0){
      const sid=socketsByAccount[id];
      if(sid)io.to(sid).emit('transmuter_payout',{transmuterDeposits:acct.data.transmuterDeposits,sbPayout,schmPayout});
    }
  });

  saveDb();
  console.log(`[Transmuter] Redeemed ${sbRedeemed.toFixed(2)} SB + ${ethRedeemed.toFixed(4)} ETH from ${totalDebt.toFixed(2)} total system debt`);
},60000);

const PORT=3001;
srv.listen(PORT,'127.0.0.1',()=>console.log(`Victory Quest running on 127.0.0.1:${PORT}`));
