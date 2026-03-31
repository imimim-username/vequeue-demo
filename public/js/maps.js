// ── TOWN MAP ─────────────────────────────────────────────────────────────────
// 40 wide × 28 tall. Player spawns at col 20, row 14 (centre road).
// All roads are 2 tiles wide; buildings have 3-tile-wide entrances; no dead ends.
const MAP_W=40,MAP_H=28;
const TOWN_MAP=(()=>{
  const m=Array.from({length:MAP_H},()=>new Array(MAP_W).fill(T.GRASS));
  const set=(r,c,t)=>{if(r>=0&&r<MAP_H&&c>=0&&c<MAP_W)m[r][c]=t;};
  const fill=(r1,c1,r2,c2,t)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)set(r,c,t);};
  const box=(r1,c1,r2,c2)=>{
    for(let c=c1;c<=c2;c++){set(r1,c,T.WALL);set(r2,c,T.WALL);}
    for(let r=r1;r<=r2;r++){set(r,c1,T.WALL);set(r,c2,T.WALL);}
  };

  // Perimeter wall
  box(0,0,MAP_H-1,MAP_W-1);

  // Main roads (2 tiles wide)
  fill(13,1,14,MAP_W-2,T.ROAD); // horizontal
  fill(1,19,MAP_H-2,20,T.ROAD); // vertical

  // Dirt paths branching off
  fill(1,8,12,9,T.PATH);   // path to tavern
  fill(15,8,MAP_H-2,9,T.PATH); // path to marketplace
  fill(1,29,12,30,T.PATH);  // path to governance
  fill(15,29,MAP_H-2,30,T.PATH); // path to treasury

  // ── TAVERN (top-left) ──
  fill(2,2,11,17,T.GRASS); // clear area
  box(2,2,11,17);
  fill(3,3,10,16,T.PLANK); // interior hint
  // entrance: 3 tiles wide at row 11, cols 7-9
  set(11,7,T.DOOR_O);set(11,8,T.DOOR_O);set(11,9,T.DOOR_O);
  // sign
  set(2,9,T.SIGN);
  // trees nearby
  set(1,18,T.TREE);set(1,1,T.SHRUB);set(12,1,T.SHRUB);

  // ── GOVERNANCE HALL (top-right) ──
  fill(2,22,11,38,T.GRASS);
  box(2,22,11,38);
  fill(3,23,10,37,T.MARBLE);
  // entrance: cols 28-30, row 11
  set(11,28,T.DOOR_O);set(11,29,T.DOOR_O);set(11,30,T.DOOR_O);
  // columns flanking entrance
  set(10,27,T.COLUMN);set(10,31,T.COLUMN);
  set(2,30,T.SIGN);

  // ── MARKETPLACE (bottom-left, veQueue gated) ──
  fill(15,2,25,17,T.GRASS);
  box(15,2,25,17);
  fill(16,3,24,16,T.STONE);
  // entrance: cols 7-9, row 15 — queue markers
  set(15,7,T.QUEUE_IN);set(15,8,T.QUEUE_IN);set(15,9,T.QUEUE_IN);
  // ticket dispenser near entrance
  set(14,10,T.TICKET);
  // stalls inside hint
  set(17,5,T.STALL);set(17,11,T.STALL);set(20,5,T.STALL);set(20,11,T.STALL);
  set(15,2,T.SIGN);

  // ── TREASURY (bottom-right, veQueue gated) ──
  fill(15,22,25,38,T.GRASS);
  box(15,22,25,38);
  fill(16,23,24,37,T.GRATING);
  // entrance: cols 28-30, row 15
  set(15,28,T.QUEUE_IN);set(15,29,T.QUEUE_IN);set(15,30,T.QUEUE_IN);
  set(14,31,T.TICKET);
  // vault tiles inside
  fill(18,25,22,35,T.VAULT);
  set(25,30,T.SIGN);

  // ── FOUNTAIN (centre of map) ──
  set(13,19,T.FOUNTAIN);set(13,20,T.FOUNTAIN);
  set(14,19,T.FOUNTAIN);set(14,20,T.FOUNTAIN);

  // ── DECORATIVE TREES & SHRUBS ──
  const trees=[[1,5],[1,13],[1,1],[12,18],[1,21],[1,27],[1,38],[12,21],[12,38],[26,5],[26,13],[26,21],[26,27],[26,38]];
  trees.forEach(([r,c])=>set(r,c,T.TREE));
  const shrubs=[[3,1],[9,1],[3,18],[9,18],[3,21],[9,21],[3,38],[9,38],[16,1],[24,1],[16,18],[24,18],[16,21],[24,21],[16,38],[24,38]];
  shrubs.forEach(([r,c])=>set(r,c,T.SHRUB));

  // ── FENCE sections ──
  for(let c=10;c<=16;c++)set(12,c,T.FENCE);
  for(let c=23;c<=27;c++)set(12,c,T.FENCE);
  for(let c=10;c<=16;c++)set(15,c,T.FENCE);
  for(let c=23;c<=27;c++)set(15,c,T.FENCE);

  // queue exit markers (south side of marketplace/treasury)
  set(25,7,T.QUEUE_OUT);set(25,8,T.QUEUE_OUT);set(25,9,T.QUEUE_OUT);
  set(25,28,T.QUEUE_OUT);set(25,29,T.QUEUE_OUT);set(25,30,T.QUEUE_OUT);

  // ── SOUTH WILDERNESS GATE ──
  set(MAP_H-1,19,T.ROAD);set(MAP_H-1,20,T.ROAD);
  set(MAP_H-1,18,T.COLUMN);set(MAP_H-1,21,T.COLUMN);

  // ── NORTH WILDERNESS GATE (mirror of south, top of vertical road) ──
  set(0,19,T.ROAD);set(0,20,T.ROAD);
  set(0,18,T.COLUMN);set(0,21,T.COLUMN);

  // ── EAST WILDERNESS GATE (right end of horizontal road, rows 13-14) ──
  set(13,MAP_W-1,T.ROAD);set(14,MAP_W-1,T.ROAD);
  set(12,MAP_W-1,T.COLUMN);set(15,MAP_W-1,T.COLUMN);

  // ── WEST WILDERNESS GATE (left end of horizontal road, rows 13-14) ──
  set(13,0,T.ROAD);set(14,0,T.ROAD);
  set(12,0,T.COLUMN);set(15,0,T.COLUMN);

  return m;
})();

// ── WORLD MAP ─────────────────────────────────────────────────────────────────
// 220×150 unified world. The town is embedded at (TOWN_OX,TOWN_OY).
// Four river barriers form a protective ring around town:
//   N river: rows 22-24   S river: rows 100-102
//   W river: cols 50-52   E river: cols 165-167
// Main N-S road: cols 109-110   Main E-W road: rows 68-69
const WORLD_MAP=(()=>{
  const m=Array.from({length:WORLD_H},()=>new Array(WORLD_W).fill(T.GRASS));
  const s=(r,c,t)=>{if(r>=0&&r<WORLD_H&&c>=0&&c<WORLD_W)m[r][c]=t;};
  const f=(r1,c1,r2,c2,t)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)s(r,c,t);};
  const box=(r1,c1,r2,c2)=>{
    for(let c=c1;c<=c2;c++){s(r1,c,T.WALL);s(r2,c,T.WALL);}
    for(let r=r1;r<=r2;r++){s(r,c1,T.WALL);s(r,c2,T.WALL);}
  };

  // World perimeter
  box(0,0,WORLD_H-1,WORLD_W-1);

  // Fill entire interior with trees (roads/clearings carved below)
  f(1,1,WORLD_H-2,WORLD_W-2,T.TREE);

  // ── Road corridors (6-tile-wide grass strips, roads set later) ────────────
  f(1,NS_L-2,WORLD_H-2,NS_R+2,T.GRASS);   // N-S corridor
  f(EW_T-2,1,EW_B+2,WORLD_W-2,T.GRASS);   // E-W corridor

  // ── Clear area immediately around the town walls ───────────────────────────
  f(TOWN_OY-4,TOWN_OX-4,TOWN_OY+MAP_H+3,TOWN_OX+MAP_W+3,T.GRASS);

  // ── Embed TOWN_MAP tiles ──────────────────────────────────────────────────
  for(let r=0;r<MAP_H;r++)
    for(let c=0;c<MAP_W;c++)
      m[TOWN_OY+r][TOWN_OX+c]=TOWN_MAP[r][c];

  // ── Main roads (skip town interior to avoid overwriting it) ───────────────
  f(1,NS_L,TOWN_OY-1,NS_R,T.ROAD);
  f(TOWN_OY+MAP_H,NS_L,WORLD_H-2,NS_R,T.ROAD);
  f(EW_T,1,EW_B,TOWN_OX-1,T.ROAD);
  f(EW_T,TOWN_OX+MAP_W,EW_B,WORLD_W-2,T.ROAD);

  // ── NORTH RIVER (rows 22-24) + 3 bridges ─────────────────────────────────
  f(22,1,24,WORLD_W-2,T.WATER);
  f(22,NS_L,24,NS_R,T.ROAD);  f(22,44,24,46,T.ROAD);  f(22,171,24,173,T.ROAD);
  s(21,NS_L-1,T.SIGN);s(21,NS_R+1,T.SIGN);s(21,43,T.SIGN);s(21,172,T.SIGN);

  // ── SOUTH RIVER (rows 100-102) + 3 bridges ───────────────────────────────
  f(100,1,102,WORLD_W-2,T.WATER);
  f(100,NS_L,102,NS_R,T.ROAD); f(100,44,102,46,T.ROAD); f(100,171,102,173,T.ROAD);
  s(99,NS_L-1,T.SIGN);s(99,NS_R+1,T.SIGN);

  // ── WEST RIVER (cols 50-52) + bridges at E-W road and at N/S rivers ───────
  f(1,50,WORLD_H-2,52,T.WATER);
  f(EW_T,50,EW_B,52,T.ROAD);  // E-W road bridge
  f(22,50,24,52,T.ROAD);       // N river bridge (already water, overwrite with road)
  f(100,50,102,52,T.ROAD);     // S river bridge
  s(EW_T-1,49,T.SIGN);s(EW_T-1,53,T.SIGN);

  // ── EAST RIVER (cols 165-167) + bridges ──────────────────────────────────
  f(1,165,WORLD_H-2,167,T.WATER);
  f(EW_T,165,EW_B,167,T.ROAD); // E-W road bridge
  f(22,165,24,167,T.ROAD);
  f(100,165,102,167,T.ROAD);
  s(EW_T-1,164,T.SIGN);s(EW_T-1,168,T.SIGN);

  // ── NORTH SAFE ZONE glades (rows 25-54, inside the ring) ─────────────────
  f(25,NS_L-10,54,NS_R+10,T.GRASS);
  f(27,6,48,42,T.GRASS);
  for(let c=6;c<=42;c++){s(27,c,T.SHRUB);s(48,c,T.SHRUB);}
  for(let r=27;r<=48;r++){s(r,6,T.SHRUB);s(r,42,T.SHRUB);}
  f(36,43,38,NS_L-3,T.DIRT);
  f(27,175,48,213,T.GRASS);
  for(let c=175;c<=213;c++){s(27,c,T.SHRUB);s(48,c,T.SHRUB);}
  for(let r=27;r<=48;r++){s(r,175,T.SHRUB);s(r,213,T.SHRUB);}
  f(36,NS_R+3,38,175,T.DIRT);

  // ── NW Safe-zone ruins ────────────────────────────────────────────────────
  box(30,10,42,28); f(31,11,41,27,T.STONE);
  s(30,17,T.STONE);s(30,18,T.STONE);s(30,19,T.STONE);
  s(42,17,T.STONE);s(42,18,T.STONE);s(42,19,T.STONE);
  f(33,12,39,15,T.VAULT);f(33,23,39,26,T.VAULT);
  s(36,18,T.COLUMN);s(36,19,T.COLUMN);s(35,12,T.SHRUB);s(41,26,T.SHRUB);

  // ── NE Safe-zone ruins ────────────────────────────────────────────────────
  box(30,188,42,208); f(31,189,41,207,T.STONE);
  s(30,196,T.STONE);s(30,197,T.STONE);s(30,198,T.STONE);
  s(42,196,T.STONE);s(42,197,T.STONE);s(42,198,T.STONE);
  f(33,190,39,193,T.VAULT);f(33,203,39,206,T.VAULT);
  s(36,197,T.COLUMN);s(36,198,T.COLUMN);s(35,190,T.SHRUB);s(41,206,T.SHRUB);

  // ── Waymarker signs outside town gates ────────────────────────────────────
  s(TOWN_OY-2,NS_L-1,T.SIGN);s(TOWN_OY+MAP_H+1,NS_L-1,T.SIGN);
  s(EW_T,TOWN_OX-3,T.SIGN);s(EW_T,TOWN_OX+MAP_W+2,T.SIGN);

  // ── SOUTH SAFE ZONE (rows 83-99) ─────────────────────────────────────────
  f(TOWN_OY+MAP_H,NS_L-10,99,NS_R+10,T.GRASS);
  f(TOWN_OY+MAP_H,TOWN_OX-4,99,TOWN_OX-1,T.GRASS);
  f(TOWN_OY+MAP_H,TOWN_OX+MAP_W,99,TOWN_OX+MAP_W+3,T.GRASS);

  // ── SOUTH DANGER ZONE (rows 103-148) ─────────────────────────────────────
  f(103,NS_L-15,WORLD_H-2,NS_R+15,T.GRASS); // centre corridor
  f(103,35,WORLD_H-2,47,T.GRASS);             // SW clearing (near W bridge)
  f(103,170,WORLD_H-2,181,T.GRASS);           // SE clearing (near E bridge)
  // Scattered trees in clearings
  [[105,38],[108,43],[112,36],[116,41],[120,39],[105,173],[108,177],[112,171],[116,175],
  ].forEach(([r,c])=>s(r,c,T.TREE));
  // South ruins (danger centre)
  box(108,NS_L-7,122,NS_R+7); f(109,NS_L-6,121,NS_R+6,T.STONE);
  s(108,NS_L,T.STONE);s(108,NS_R,T.STONE);s(122,NS_L,T.STONE);s(122,NS_R,T.STONE);
  f(111,NS_L-4,119,NS_L-1,T.VAULT);f(111,NS_R+1,119,NS_R+4,T.VAULT);
  s(115,NS_L,T.COLUMN);s(115,NS_R,T.COLUMN);
  // SW danger ruins
  box(113,37,125,47); f(114,38,124,46,T.STONE);
  s(113,41,T.STONE);s(113,42,T.STONE);s(125,41,T.STONE);s(125,42,T.STONE);
  f(116,39,122,41,T.VAULT);f(116,44,122,46,T.VAULT); s(120,42,T.COLUMN);
  // SE danger ruins
  box(113,170,125,181); f(114,171,124,180,T.STONE);
  s(113,174,T.STONE);s(113,175,T.STONE);s(125,174,T.STONE);s(125,175,T.STONE);
  f(116,172,122,174,T.VAULT);f(116,177,122,179,T.VAULT); s(120,175,T.COLUMN);
  // Dungeon entrance (deep south)
  f(136,NS_L-4,147,NS_R+4,T.GRASS);
  f(137,NS_L-2,146,NS_R+2,T.VAULT);f(139,NS_L-1,144,NS_R+1,T.GRATING);
  s(135,NS_L-2,T.SIGN);s(135,NS_L-1,T.SIGN);s(135,NS_R+1,T.SIGN);s(135,NS_R+2,T.SIGN);

  // ── NORTH DANGER (rows 1-21) clearings + ruins ───────────────────────────
  f(2,55,20,88,T.GRASS); // NW danger clearing (between W river and N-S road)
  f(2,130,20,163,T.GRASS); // NE danger clearing
  // NW danger ruins
  box(4,58,16,82); f(5,59,15,81,T.STONE);
  s(4,67,T.STONE);s(4,68,T.STONE);s(4,69,T.STONE);s(16,67,T.STONE);s(16,68,T.STONE);s(16,69,T.STONE);
  f(7,60,13,63,T.VAULT);f(7,76,13,80,T.VAULT); s(10,68,T.COLUMN);s(10,69,T.COLUMN);
  // NE danger ruins
  box(4,135,16,160); f(5,136,15,159,T.STONE);
  s(4,145,T.STONE);s(4,146,T.STONE);s(4,147,T.STONE);s(16,145,T.STONE);s(16,146,T.STONE);s(16,147,T.STONE);
  f(7,137,13,141,T.VAULT);f(7,155,13,159,T.VAULT); s(10,146,T.COLUMN);s(10,147,T.COLUMN);

  // ── FAR WEST danger clearings (cols 1-49) ────────────────────────────────
  f(EW_T-3,1,EW_B+3,49,T.GRASS); // E-W road corridor west of W river
  f(25,1,99,49,T.GRASS); // inside ring area west
  f(1,1,21,44,T.GRASS);  // N danger west
  f(103,1,148,44,T.GRASS); // S danger west

  // ── FAR EAST danger clearings (cols 168-218) ─────────────────────────────
  f(EW_T-3,168,EW_B+3,WORLD_W-2,T.GRASS); // E-W road corridor east of E river
  f(25,168,99,WORLD_W-2,T.GRASS); // inside ring area east
  f(1,168,21,WORLD_W-2,T.GRASS);  // N danger east
  f(103,168,148,WORLD_W-2,T.GRASS); // S danger east
  // Add some trees back in far east/west as obstacles
  [[5,8],[8,22],[12,15],[16,35],[18,8],[60,5],[65,22],[70,12],[75,30],[80,18],
   [5,180],[8,195],[12,188],[16,210],[18,175],[60,172],[65,195],[70,183],[75,205],
  ].forEach(([r,c])=>s(r,c,T.TREE));

  return m;
})();

// ── BUILDING INTERIORS ────────────────────────────────────────────────────────
const ZONE_MAPS = {
  tavern: makeTavern(),
  governance: makeGovernance(),
  marketplace: makeMarketplace(),
  treasury: makeTreasury(),
};

function makeInterior(w,h,fill_tile){
  const m=Array.from({length:h},()=>new Array(w).fill(fill_tile));
  const wall=(r,c)=>{m[r][c]=T.WALL;};
  const fill=(r1,c1,r2,c2,t)=>{for(let r=r1;r<=r2;r++)for(let c=c1;c<=c2;c++)m[r][c]=t;};
  // perimeter walls
  for(let c=0;c<w;c++){m[0][c]=T.WALL;m[h-1][c]=T.WALL;}
  for(let r=0;r<h;r++){m[r][0]=T.WALL;m[r][w-1]=T.WALL;}
  return{m,fill,wall};
}

function makeTavern(){
  const{m,fill,wall}=makeInterior(20,13,T.PLANK);
  // tables
  fill(3,3,4,5,T.COUNTER);fill(3,9,4,11,T.COUNTER);fill(3,15,4,17,T.COUNTER);
  fill(8,3,9,5,T.COUNTER);fill(8,9,9,11,T.COUNTER);fill(8,15,9,17,T.COUNTER);
  // bar
  fill(1,1,2,18,T.COUNTER);
  // columns
  m[2][6]=T.COLUMN;m[2][13]=T.COLUMN;m[7][6]=T.COLUMN;m[7][13]=T.COLUMN;
  // door (south centre)
  m[12][9]=T.DOOR_O;m[12][10]=T.DOOR_O;m[12][11]=T.DOOR_O;
  // velvet rug near bar
  fill(3,1,5,2,T.VELVET);fill(3,18,5,18,T.VELVET);
  return m;
}

function makeGovernance(){
  const{m,fill,wall}=makeInterior(20,13,T.MARBLE);
  // queue area
  fill(2,1,4,18,T.VELVET);
  // clerk windows
  fill(1,4,1,6,T.WINDOW);fill(1,9,1,11,T.WINDOW);fill(1,14,1,16,T.WINDOW);
  // queue line markers
  fill(5,4,8,4,T.QUEUE_IN);fill(5,9,8,9,T.QUEUE_IN);fill(5,14,8,14,T.QUEUE_IN);
  // ticket dispensers
  m[9][4]=T.TICKET;m[9][9]=T.TICKET;m[9][14]=T.TICKET;
  // columns
  m[2][2]=T.COLUMN;m[2][18]=T.COLUMN;m[10][2]=T.COLUMN;m[10][18]=T.COLUMN;
  // door
  m[12][9]=T.DOOR_O;m[12][10]=T.DOOR_O;m[12][11]=T.DOOR_O;
  // exit queue at back
  fill(11,7,11,12,T.QUEUE_OUT);
  return m;
}

function makeMarketplace(){
  const{m,fill}=makeInterior(20,13,T.STONE);
  // stalls
  fill(2,1,4,4,T.STALL);fill(2,7,4,10,T.STALL);fill(2,13,4,16,T.STALL);
  fill(7,1,9,4,T.STALL);fill(7,7,9,10,T.STALL);fill(7,13,9,16,T.STALL);
  // aisles (walkable)
  fill(5,1,6,18,T.STONE);fill(2,5,9,6,T.STONE);fill(2,11,9,12,T.STONE);
  // doors: north entry and south exit (both DOOR_O so players can see them clearly)
  m[0][9]=T.DOOR_O;m[0][10]=T.DOOR_O;
  m[12][9]=T.DOOR_O;m[12][10]=T.DOOR_O;
  // columns
  m[2][18]=T.COLUMN;m[10][18]=T.COLUMN;
  return m;
}

function makeTreasury(){
  const{m,fill}=makeInterior(20,13,T.STONE);
  // open stone floor throughout — player can walk everywhere
  fill(1,1,11,18,T.STONE);
  // decorative vault panels (walkable — not solid)
  fill(2,2,4,8,T.VAULT);fill(2,11,4,17,T.VAULT);
  fill(7,2,9,8,T.VAULT);fill(7,11,9,17,T.VAULT);
  // central aisle always clear
  fill(1,9,11,10,T.STONE);fill(5,1,6,18,T.STONE);
  // entry door (north) and exit queue (south)
  m[0][9]=T.DOOR_O;m[0][10]=T.DOOR_O;
  m[12][9]=T.DOOR_O;m[12][10]=T.DOOR_O;
  // corner columns (decorative)
  m[2][1]=T.COLUMN;m[2][18]=T.COLUMN;m[9][1]=T.COLUMN;m[9][18]=T.COLUMN;
  // centrepiece fountain (walkable)
  m[5][9]=T.FOUNTAIN;m[5][10]=T.FOUNTAIN;m[6][9]=T.FOUNTAIN;m[6][10]=T.FOUNTAIN;
  return m;
}

// Zone metadata
const ZONES = {
  world:      {map:WORLD_MAP,              w:WORLD_W,h:WORLD_H,spawnX:TOWN_OX+20,spawnY:TOWN_OY+14,
               solid:WORLD_SOLID,          name:'Town Square',bg:'world'},
  tavern:     {map:ZONE_MAPS.tavern,      w:20,h:13,spawnX:10,spawnY:10,solid:SOLID_TILES,
               name:'The Tavern',bg:'tavern'},
  governance: {map:ZONE_MAPS.governance,  w:20,h:13,spawnX:10,spawnY:10,solid:SOLID_TILES,
               name:'Governance Hall',bg:'governance'},
  marketplace:{map:ZONE_MAPS.marketplace, w:20,h:13,spawnX:10,spawnY:2, solid:SOLID_TILES,
               name:'Marketplace',bg:'marketplace'},
  treasury:   {map:ZONE_MAPS.treasury,    w:20,h:13,spawnX:10,spawnY:2, solid:SOLID_TILES,
               name:'Treasury',bg:'treasury'},
  dungeon:    {map:DUNGEON_MAP,            w:DGN_W,h:DGN_H,spawnX:8,spawnY:6, solid:SOLID_TILES, name:'Ancient Dungeon',bg:'dungeon'},
};

// Zone entrance/exit connections
// ── NPC DEFINITIONS ───────────────────────────────────────────────────────────
// Each NPC: {id, x, y (tile coords), type (sprite), name, face (direction 0-3), dialog[]}
const NPCS = {
  world:[
    { id:'town_crier', x:TOWN_OX+20, y:TOWN_OY+10, type:'guard', face:2, name:'Town Crier', questId:'wolf_hunt', priceCrier:true,
      dialog:[
        "Hear ye, hear ye! Welcome to Victory Quest, brave adventurer!",
        "Our town is a safe haven — no monsters dare enter these gates.",
        "To the south lies the Wilderness. The deeper you go, the deadlier it gets.",
        "The Marketplace and Treasury use the veQueue system — you need ALCX to join the queue! Lock tokens to earn your place.",
        "Tip: Earn alETH by slaying Dark Knights — ask the Armorer in the eastern district for a bounty.",
        "Live token prices — alUSD, alETH, and ALCX — are tracked in real time from the markets!",
        "When alUSD dips below $0.98, I'll shout it from the rooftops. The Transmuter arbitrage window opens!",
        "Check the Governance Hall for the Protocol Treasury balance and live price feed.",
        "Build up your stats before venturing too far south. Dark Knights don't play nice.",
      ]
    },
    { id:'merchant_ned', x:TOWN_OX+13, y:TOWN_OY+14, type:'merchant', face:0, name:'Merchant Ned',
      dialog:[
        "Psst! Looking to make a deal, friend?",
        "The Marketplace has the finest wares this side of the Wilderness.",
        "Join the entry queue and wait to be called — it's fair for everyone.",
        "The more you adventure, the better gear I'll have waiting for you.",
      ]
    },
    { id:'guard_west', x:TOWN_OX+6, y:TOWN_OY+12, type:'guard', face:1, name:'Town Guard',
      dialog:[
        "The Tavern's open for business. Mind your manners inside.",
        "We keep the peace in this town. Monsters stay out — that's the deal.",
      ]
    },
    { id:'armorer_brix', x:TOWN_OX+31, y:TOWN_OY+11, type:'merchant', face:3, name:'Armorer Brix', questId:'dark_knight_elite',
      dialog:[
        "Looking to earn alETH? The premium currency of the on-chain realm?",
        "Dark Knights drop it — and I pay bounties in alETH for every three you slay.",
        "Bring it to the Marketplace: alETH unlocks the finest weapons — Flame Blade, Shadow Blade.",
        "The queue is your gateway. Lock your ALCX, wait your turn, and trade in style.",
      ]
    },
    { id:'guard_east', x:TOWN_OX+33, y:TOWN_OY+12, type:'guard', face:3, name:'Town Guard',
      dialog:[
        "The Governance Hall handles all official matters of state.",
        "If you have a complaint, file it through proper channels.",
        "...No, I don't know what 'proper channels' means exactly. Ask the clerk.",
      ]
    },
    {type:'wizard', face:0, name:'Exchanger Rex', x:TOWN_OX+24, y:TOWN_OY+8,
     dialog:['Welcome to the Currency Exchange.','Swap any token for any other at a 0.30% fee.'],
     exchange:true},
    {type:'guard', face:3, name:'Hall of Fame', x:TOWN_OX+27, y:TOWN_OY+10,
     dialog:['The mightiest heroes of Victory Quest are inscribed here.'],
     hallOfFame:true},
  ],
  tavern:[
    { id:'barkeep', x:10, y:2, type:'barkeep', face:2, name:'Barkeep Moe', questId:'dark_knight_hunt',
      dialog:[
        "Welcome to The Rusty Flagon! Pull up a stool, traveller.",
        "You look like you've seen some wilderness action. Eyes of a survivor.",
        "The wilderness south of the river gets nastier the deeper you go.",
        "I've seen adventurers stumble in here shaking after a Dark Knight encounter.",
        "My advice: invest in Endurance. It's quiet insurance until you really need it.",
        "Another round? ...Oh, we don't actually serve drinks yet. Sorry.",
      ]
    },
    { id:'tavern_regular', x:4, y:8, type:'merchant', face:1, name:'Grizzled Regular', questId:'goblin_hunt',
      dialog:[
        "I've been coming here thirty years. The ale's still terrible.",
        "You're heading south? Respect. Most folks don't come back from the deep zone.",
        "Tip: Goblins have low defense but hit fast. Take them out first.",
      ]
    },
  ],
  governance:[
    { id:'clerk', x:10, y:3, type:'clerk', face:2, name:'Senior Clerk Praxis', questId:'lich_quest',
      dialog:[
        "Welcome to the Governance Hall. All records and civic matters are kept here.",
        "The veQueue protocol was established to ensure fair access to shared resources.",
        "No cutting in line. No back-door dealings. Every citizen waits their turn.",
        "It sounds simple, but you'd be amazed how revolutionary that idea actually is.",
      ]
    },
    {type:'wizard',face:2,name:'Governance Board',x:14,y:6,
     dialog:['Cast your ALCX-weighted vote on protocol parameters.','Current vote: earmark rate controls how fast bank loans repay.'],
     govBoard:true},
  ],
  marketplace:[
    { id:'vendor', x:5, y:5, type:'merchant', face:1, name:'Vendor Zelda', shop:'zelda',
      dialog:[
        "You made it through the queue! Welcome to my stall.",
        "I stock weapons, potions, and curiosities sourced from across the realm.",
        "Come back when you've leveled up — the good stuff is reserved for veterans.",
        "Hint: high STR means harder hits. High AGI means you dodge more often.",
      ]
    },
    { id:'vendor2', x:15, y:8, type:'barkeep', face:3, name:'Armorer Flint', shop:'flint',
      dialog:[
        "Armor's my trade. Defense is underrated by the young adventurers.",
        "Endurance stat? That's your armor stat. Don't neglect it.",
        "A dead hero can't spend their gold. Just saying.",
      ]
    },
    {type:'merchant',face:5,name:'Market Board',x:8,y:6,
     dialog:['Browse listings or sell your items here.','Consignment fee: 5% of sale price. Listings expire after 24h.'],
     market:true},
    {type:'wizard',face:1,name:'Expansion Vendor',x:12,y:4,
     dialog:['Need more bag space? I can help — for a price.','Inventory can be expanded up to 12 slots total.'],
     invUpgrade:true},
  ],
  dungeon:[
    { id:'dungeon_ghost', x:33, y:7, type:'guard', face:2, name:'Restless Spirit',
      dialog:[
        "You... you can see me? After all these years...",
        "I came here for glory. The Lich took everything. Do not make my mistake.",
        "The boss chamber lies to the south through the long corridor.",
        "The Lich is ancient — older than the town, older than the rivers.",
        "Stock up on potions before you face it. You'll need every one.",
        "If you defeat it... my soul can finally rest. Please.",
      ]
    },
  ],
  treasury:[
    { id:'treasurer', x:10, y:3, type:'clerk', face:2, name:'Treasurer Vox',
      dialog:[
        "The Treasury manages all token deposits and fiscal records.",
        "ALCX locked while in queue are held in escrow — completely safe.",
        "No funds leave the Treasury without proper queue clearance. It's protocol.",
        "The 20% lock is a skin-in-the-game mechanism. Keeps queue-hoppers out.",
      ]
    },
    {type:'clerk', face:1, name:'Banker Alyx', x:6, y:6,
     dialog:['Welcome to the Alchemix Bank.','Deposit Spacebucks to borrow alUSD, or Schmeckles to borrow alETH.','Self-repaying loans. No interest. No liquidation risk. Ever.'],
     bank:true},
    {type:'merchant', face:3, name:'Transmuter Mira', x:14, y:6,
     dialog:['Welcome to the Transmuter.','Deposit alUSD or alETH here.','As borrowers repay their earmarked debt, you receive the underlying collateral at 1:1.','Arbitrage opportunity: buy cheap alUSD at the exchange, deposit here, earn the spread.'],
     transmuter:true},
  ],
};

const ZONE_DOORS = {
  // From world → building interiors (tileRows/Cols in WORLD coordinates)
  world_tavern:     {from:'world',tileRows:[TOWN_OY+11],tileCols:[TOWN_OX+7,TOWN_OX+8,TOWN_OX+9], to:'tavern',    sx:10,sy:11},
  world_governance: {from:'world',tileRows:[TOWN_OY+11],tileCols:[TOWN_OX+28,TOWN_OX+29,TOWN_OX+30],to:'governance',sx:10,sy:11},
  world_marketplace:{from:'world',tileRows:[TOWN_OY+15],tileCols:[TOWN_OX+7,TOWN_OX+8,TOWN_OX+9], to:'marketplace',sx:10,sy:1, queue:true},
  world_treasury:   {from:'world',tileRows:[TOWN_OY+15],tileCols:[TOWN_OX+28,TOWN_OX+29,TOWN_OX+30],to:'treasury',  sx:10,sy:1, queue:true},
  // From building interiors → world
  tavern_exit:           {from:'tavern',      tileRows:[12],  tileCols:[9,10,11],   to:'world', sx:TOWN_OX+8,  sy:TOWN_OY+12},
  governance_exit:       {from:'governance',  tileRows:[12],  tileCols:[9,10,11],   to:'world', sx:TOWN_OX+29, sy:TOWN_OY+12},
  // Marketplace: south exit (far from entry) + north exit (back through entry door)
  marketplace_exit:      {from:'marketplace', tileRows:[12],  tileCols:[8,9,10,11], to:'world', sx:TOWN_OX+8,  sy:TOWN_OY+12},
  marketplace_north_exit:{from:'marketplace', tileRows:[0],   tileCols:[9,10],      to:'world', sx:TOWN_OX+8,  sy:TOWN_OY+14},
  // Treasury: south exit (far from entry) + north exit (back through entry door)
  treasury_exit:         {from:'treasury',    tileRows:[12],  tileCols:[8,9,10,11], to:'world', sx:TOWN_OX+29, sy:TOWN_OY+12},
  treasury_north_exit:   {from:'treasury',    tileRows:[0],   tileCols:[9,10],      to:'world', sx:TOWN_OX+29, sy:TOWN_OY+14},
  world_dungeon:   {from:'world', tileRows:[139,140,141,142,143,144], tileCols:[108,109,110,111], to:'dungeon', sx:8, sy:6},
  // Dungeon exit: spawn NORTH of the grating (row 134) so player doesn't immediately re-trigger dungeon entry when walking back to town
  dungeon_exit:    {from:'dungeon', tileRows:[2,3], tileCols:[7,8], to:'world', sx:NS_L, sy:134},
};

