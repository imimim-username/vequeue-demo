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
    socket.emit('auth_result',{ok:true,isNew:true,username});
  });

  socket.on('auth_login',({username,pin})=>{
    const key=username.toLowerCase();
    const row=pdb[key];
    if(!row||row.pin_hash!==hashPin(String(pin)))
      return socket.emit('auth_result',{ok:false,error:'Invalid username or PIN.'});
    socket.accountId=key;
    socket.emit('auth_result',{ok:true,isNew:false,username:row.username,data:row.data||null});
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

  socket.on('disconnect',()=>{
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

const PORT=3001;
srv.listen(PORT,'127.0.0.1',()=>console.log(`Victory Quest running on 127.0.0.1:${PORT}`));
