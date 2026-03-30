'use strict';
const express=require('express');
const http=require('http');
const{Server}=require('socket.io');
const path=require('path');

const app=express();
const srv=http.createServer(app);
const io=new Server(srv,{cors:{origin:'*'}});

app.use(express.static(path.join(__dirname,'public')));

const players={};
const publicP=id=>{const p=players[id];if(!p)return null;
  return{id:p.id,nickname:p.nickname,color:p.color,zone:p.zone,x:p.x,y:p.y,dir:p.dir,frame:p.frame,moving:p.moving};};
const zonePlayers=(zone,excl)=>Object.values(players).filter(p=>p.zone===zone&&p.id!==excl).map(p=>publicP(p.id));

io.on('connection',socket=>{
  console.log('connect',socket.id);

  socket.on('join',data=>{
    players[socket.id]={
      id:socket.id,nickname:data.nickname||'Hero',color:data.color||'#2255DD',
      zone:data.zone||'town',x:data.x||660,y:data.y||460,
      dir:2,frame:0,moving:false,schmeckles:100,
    };
    const p=players[socket.id];
    socket.join(p.zone);
    socket.emit('welcome',{id:socket.id,count:Object.keys(players).length});
    socket.emit('zone_players',zonePlayers(p.zone,socket.id));
    socket.to(p.zone).emit('player_joined',publicP(socket.id));
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

  socket.on('disconnect',()=>{
    const p=players[socket.id];
    if(p){socket.to(p.zone).emit('player_left',socket.id);}
    delete players[socket.id];
    console.log('disconnect',socket.id);
  });
});

const PORT=3001;
srv.listen(PORT,'127.0.0.1',()=>console.log(`Victory Quest running on 127.0.0.1:${PORT}`));
