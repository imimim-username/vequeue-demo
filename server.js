'use strict';
const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const path    = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// ── Player registry ──────────────────────────────────────
// { socketId: { id, nickname, color, zone, x, y, dir, tokens, quests, chatBubble } }
const players = {};

function zoneOf(id)    { return players[id]?.zone; }
function publicP(id)   {
  const p = players[id];
  if (!p) return null;
  return { id: p.id, nickname: p.nickname, color: p.color,
           zone: p.zone, x: p.x, y: p.y, dir: p.dir,
           tokens: p.tokens, quests: p.quests };
}
function zonePlayers(zone, excludeId) {
  return Object.values(players)
    .filter(p => p.zone === zone && p.id !== excludeId)
    .map(p => publicP(p.id));
}

// ── Connection handler ────────────────────────────────────
io.on('connection', socket => {

  // ── join ─────────────────────────────────────────────
  socket.on('join', data => {
    const saved = data.saved || {};
    players[socket.id] = {
      id:       socket.id,
      nickname: (data.nickname || 'Anon').substring(0, 16),
      color:    data.color || '#2244cc',
      zone:     'town',
      x:        20, y: 14,   // town square spawn
      dir:      'down',
      tokens:   saved.tokens !== undefined ? saved.tokens : 1000,
      quests:   saved.quests || {},
    };
    const p = players[socket.id];
    socket.join('town');

    // Send welcome: your id + everyone already in the zone
    socket.emit('welcome', {
      id:      socket.id,
      players: zonePlayers('town', socket.id),
      tokens:  p.tokens,
      quests:  p.quests,
    });

    // Tell zone about new arrival
    socket.to('town').emit('player_joined', publicP(socket.id));
    console.log(`[+] ${p.nickname} (${socket.id.slice(0,6)}) joined zone:town`);
  });

  // ── move ─────────────────────────────────────────────
  socket.on('move', data => {
    const p = players[socket.id];
    if (!p) return;
    p.x = data.x; p.y = data.y; p.dir = data.dir;
    socket.to(p.zone).emit('player_moved', {
      id: socket.id, x: data.x, y: data.y, dir: data.dir
    });
  });

  // ── zone_change ───────────────────────────────────────
  socket.on('zone_change', data => {
    const p = players[socket.id];
    if (!p) return;
    const oldZone = p.zone;
    socket.leave(oldZone);
    socket.to(oldZone).emit('player_left', socket.id);

    p.zone = data.zone; p.x = data.x; p.y = data.y; p.dir = 'down';
    socket.join(p.zone);
    socket.to(p.zone).emit('player_joined', publicP(socket.id));
    socket.emit('zone_players', zonePlayers(p.zone, socket.id));
    console.log(`[~] ${p.nickname} -> zone:${p.zone}`);
  });

  // ── chat ─────────────────────────────────────────────
  socket.on('chat', data => {
    const p = players[socket.id];
    if (!p) return;
    const text = String(data.text || '').trim().substring(0, 120);
    if (!text) return;
    const msg = { id: socket.id, nickname: p.nickname, color: p.color, text, ts: Date.now() };
    io.to(p.zone).emit('chat', msg);   // local — same zone only
  });

  // ── quest_update ──────────────────────────────────────
  socket.on('quest_update', data => {
    const p = players[socket.id];
    if (!p) return;
    if (data.questId) p.quests[data.questId] = data.status;
    if (data.tokens !== undefined) p.tokens = data.tokens;
    socket.to(p.zone).emit('player_updated', {
      id: socket.id, tokens: p.tokens, quests: p.quests
    });
    socket.emit('state_ack', { tokens: p.tokens, quests: p.quests });
  });

  // ── scoreboard request ────────────────────────────────
  socket.on('get_scoreboard', () => {
    socket.emit('scoreboard', Object.values(players).map(p => ({
      nickname: p.nickname, color: p.color,
      tokens: p.tokens,
      questsDone: Object.values(p.quests).filter(v => v === 'done').length,
    })).sort((a, b) => b.questsDone - a.questsDone || b.tokens - a.tokens));
  });

  // ── disconnect ────────────────────────────────────────
  socket.on('disconnect', () => {
    const p = players[socket.id];
    if (!p) return;
    io.to(p.zone).emit('player_left', socket.id);
    console.log(`[-] ${p.nickname} disconnected`);
    delete players[socket.id];
  });
});

// ── Start ─────────────────────────────────────────────────
const PORT = 3001;
server.listen(PORT, '127.0.0.1', () =>
  console.log(`Governance Town listening on 127.0.0.1:${PORT}`)
);
