// ── TILE CACHE ───────────────────────────────────────────────────────────────
// Pre-render every tile type into an offscreen canvas for fast stamping
const TILE_CACHE = {};
let WATER_FRAMES = [];  // 3 pre-rendered animation frames for water tiles

function makeTile(fn){
  const c=document.createElement('canvas');c.width=TS;c.height=TS;
  fn(c.getContext('2d'));return c;
}

function buildTileCache(){
  TILE_CACHE[T.VOID]   = makeTile(drawVoid);
  TILE_CACHE[T.GRASS]  = makeTile(drawGrass);
  TILE_CACHE[T.ROAD]   = makeTile(drawRoad);
  TILE_CACHE[T.PATH]   = makeTile(drawPath);
  TILE_CACHE[T.WALL]   = makeTile(drawWall);
  TILE_CACHE[T.TREE]   = makeTile(drawTree);
  TILE_CACHE[T.SIGN]   = makeTile(drawSign);
  TILE_CACHE[T.FENCE]  = makeTile(drawFence);
  TILE_CACHE[T.WATER]  = makeTile(drawWater);
  TILE_CACHE[T.PLANK]  = makeTile(drawPlank);
  TILE_CACHE[T.MARBLE] = makeTile(drawMarble);
  TILE_CACHE[T.STONE]  = makeTile(drawStone);
  TILE_CACHE[T.VELVET] = makeTile(drawVelvet);
  TILE_CACHE[T.WINDOW] = makeTile(drawWindow);
  TILE_CACHE[T.COUNTER]= makeTile(drawCounter);
  TILE_CACHE[T.COLUMN] = makeTile(drawColumn);
  TILE_CACHE[T.DOOR_O] = makeTile(drawDoorOpen);
  TILE_CACHE[T.DOOR_C] = makeTile(drawDoorClosed);
  TILE_CACHE[T.GRATING]= makeTile(drawGrating);
  TILE_CACHE[T.VAULT]  = makeTile(drawVault);
  TILE_CACHE[T.STALL]  = makeTile(drawStall);
  TILE_CACHE[T.FOUNTAIN]= makeTile(drawFountain);
  TILE_CACHE[T.SHRUB]  = makeTile(drawShrub);
  TILE_CACHE[T.QUEUE_IN] = makeTile(drawQueueIn);
  TILE_CACHE[T.QUEUE_OUT]= makeTile(drawQueueOut);
  TILE_CACHE[T.TICKET] = makeTile(drawTicket);
  TILE_CACHE[T.DIRT]   = makeTile(drawDirt);
}

// ─ Tile drawing functions ───────────────────────────────────────────────────
function drawVoid(c){c.fillStyle='#000';c.fillRect(0,0,TS,TS)}

function drawGrass(c){
  // base
  c.fillStyle='#2A7D30';c.fillRect(0,0,TS,TS);
  // mid patches
  c.fillStyle='#236828';
  c.fillRect(0,0,TS,3);c.fillRect(4,8,10,7);c.fillRect(20,18,8,6);
  // highlight blades
  c.fillStyle='#48A855';
  c.fillRect(2,5,2,7);c.fillRect(8,2,2,9);c.fillRect(14,10,2,6);
  c.fillRect(22,4,2,8);c.fillRect(28,15,2,7);c.fillRect(6,20,2,6);
  c.fillRect(18,24,2,5);c.fillRect(26,22,2,6);
  // lighter tips
  c.fillStyle='#60C870';
  c.fillRect(2,3,2,3);c.fillRect(8,0,2,3);c.fillRect(22,2,2,3);c.fillRect(28,13,2,3);
  // shadow at bottom
  c.fillStyle='#1D5C23';c.fillRect(0,29,TS,3);
}

function drawRoad(c){
  // base asphalt
  c.fillStyle='#6A6258';c.fillRect(0,0,TS,TS);
  // texture grains
  c.fillStyle='#5E5750';
  for(let i=0;i<8;i++){c.fillRect(i*4+1,3,2,2);c.fillRect(i*4+2,14,1,3);c.fillRect(i*4,23,3,2);}
  // highlight center stripe
  c.fillStyle='#787060';c.fillRect(12,0,8,TS);
  // edge darken
  c.fillStyle='#4A4540';c.fillRect(0,0,3,TS);c.fillRect(29,0,3,TS);
  // top/bottom edge
  c.fillStyle='#544E48';c.fillRect(0,0,TS,2);c.fillRect(0,30,TS,2);
}

function drawPath(c){
  // cobblestone
  c.fillStyle='#8A7D6A';c.fillRect(0,0,TS,TS);
  const stones=[[1,1,13,13],[15,1,15,13],[1,15,13,13],[15,15,15,13]];
  for(const[x,y,w,h] of stones){
    c.fillStyle='#9A8D7A';c.fillRect(x,y,w,h);
    c.fillStyle='#ADA090';c.fillRect(x+1,y+1,w-4,3);
    c.fillStyle='#6A6058';c.fillRect(x+w-2,y+h-2,2,2);
  }
}

function drawWall(c){
  // stone wall
  c.fillStyle='#3A3A4A';c.fillRect(0,0,TS,TS);
  // brick rows
  const rows=[[0,0],[0,9],[0,18],[0,27]];
  const offsets=[0,8,0,8];
  rows.forEach(([rx,ry],i)=>{
    c.fillStyle='#4A4A5E';
    for(let bx=offsets[i]-16;bx<TS;bx+=16){
      c.fillRect(bx+1,ry+1,14,7);
      // highlight top
      c.fillStyle='#5A5A6E';c.fillRect(bx+1,ry+1,14,2);
      c.fillStyle='#4A4A5E';
    }
    // mortar
    c.fillStyle='#2A2A38';c.fillRect(0,ry+8,TS,1);
  });
  // top highlight
  c.fillStyle='#6A6A7E';c.fillRect(0,0,TS,2);
  // side shadow
  c.fillStyle='#1A1A28';c.fillRect(30,0,2,TS);
}

function drawTree(c){
  // shadow at base
  c.fillStyle='#1A2A1A';c.fillRect(10,26,12,4);
  // trunk
  c.fillStyle='#5C3D1A';c.fillRect(13,20,6,12);
  c.fillStyle='#7A5228';c.fillRect(13,20,3,12);
  // canopy layers (3 shades)
  c.fillStyle='#1B5E20';c.fillRect(4,16,24,10);c.fillRect(6,9,20,10);c.fillRect(10,3,12,8);
  c.fillStyle='#2E7D32';c.fillRect(6,17,20,8);c.fillRect(8,10,16,8);c.fillRect(11,4,10,6);
  c.fillStyle='#43A047';c.fillRect(7,18,8,5);c.fillRect(9,11,7,5);c.fillRect(12,5,5,4);
  // highlight spots
  c.fillStyle='#66BB6A';c.fillRect(7,18,4,2);c.fillRect(9,11,4,2);c.fillRect(12,5,4,2);
}

function drawSign(c){
  // post
  c.fillStyle='#6B4226';c.fillRect(14,14,4,18);
  c.fillStyle='#8B5A36';c.fillRect(14,14,2,18);
  // board
  c.fillStyle='#C8A46A';c.fillRect(4,4,24,12);
  c.fillStyle='#E0C080';c.fillRect(4,4,24,3);
  c.fillStyle='#A07840';c.fillRect(4,14,24,2);
  // text lines
  c.fillStyle='#4A3020';
  c.fillRect(7,8,18,2);c.fillRect(9,11,14,2);
  // border
  c.fillStyle='#6B4226';
  c.fillRect(4,4,24,1);c.fillRect(4,15,24,1);c.fillRect(4,4,1,12);c.fillRect(27,4,1,12);
}

function drawFence(c){
  c.fillStyle='#8B6914';
  // rails
  c.fillRect(0,10,TS,3);c.fillRect(0,20,TS,3);
  // posts
  for(let x=0;x<=28;x+=8){
    c.fillStyle='#8B6914';c.fillRect(x,5,4,22);
    c.fillStyle='#C49A1E';c.fillRect(x,5,2,22);
    c.fillStyle='#5C4A0C';c.fillRect(x+3,5,1,22);
  }
}

function drawWater(c){
  const g=c.createLinearGradient(0,0,0,TS);
  g.addColorStop(0,'#1565C0');g.addColorStop(1,'#0D47A1');
  c.fillStyle=g;c.fillRect(0,0,TS,TS);
  // ripples
  c.fillStyle='#1976D2';
  c.fillRect(2,6,10,2);c.fillRect(18,12,10,2);c.fillRect(6,20,14,2);c.fillRect(16,26,10,2);
  c.fillStyle='#42A5F5';
  c.fillRect(3,6,4,1);c.fillRect(19,12,4,1);c.fillRect(7,20,5,1);
}

function drawWaterAnimated(c,phase){
  // base gradient
  const g=c.createLinearGradient(0,0,0,TS);
  g.addColorStop(0,'#1565C0');g.addColorStop(1,'#0D47A1');
  c.fillStyle=g;c.fillRect(0,0,TS,TS);
  // animated ripple rows — offset shifts by 4px each phase
  const offset=phase*4;
  c.fillStyle='#1976D2';
  for(let y=2+offset%8;y<TS;y+=8){c.fillRect(0,y,TS,2);}
  // crest highlights
  c.fillStyle='#4A8ADB';
  for(let y=4+offset%8;y<TS;y+=8){c.fillRect(2,y,TS-4,1);}
  // surface glints
  c.fillStyle='#AACCFF44';
  c.fillRect(4+phase*3,4,8,2);
  c.fillRect(18+phase*2,14,6,2);
}

function drawPlank(c){
  // wooden floor planks
  const planks=['#7B4F28','#6B4220','#8B5A30','#7B4F28'];
  for(let i=0;i<4;i++){
    c.fillStyle=planks[i];c.fillRect(0,i*8,TS,8);
    c.fillStyle=lighten(planks[i],20);c.fillRect(0,i*8,TS,2);
    c.fillStyle=darken(planks[i],20);c.fillRect(0,i*8+7,TS,1);
    // grain lines
    c.fillStyle=darken(planks[i],10);
    c.fillRect(5,i*8+3,18,1);c.fillRect(12,i*8+5,12,1);
  }
}

function drawMarble(c){
  // checker marble floor
  const light='#D8D0C8',dark='#B8B0A8';
  for(let row=0;row<2;row++)for(let col=0;col<2;col++){
    c.fillStyle=(row+col)%2===0?light:dark;
    c.fillRect(col*16,row*16,16,16);
    // highlight corner
    c.fillStyle=(row+col)%2===0?'#EEE8E0':'#CAC4BC';
    c.fillRect(col*16,row*16,8,2);c.fillRect(col*16,row*16,2,8);
    // shadow corner
    c.fillStyle=(row+col)%2===0?'#C0B8B0':'#A0988E';
    c.fillRect(col*16+14,row*16,2,16);c.fillRect(col*16,row*16+14,16,2);
  }
}

function drawStone(c){
  c.fillStyle='#555060';c.fillRect(0,0,TS,TS);
  // grout
  c.fillStyle='#3A3545';
  c.fillRect(0,15,TS,2);c.fillRect(15,0,2,15);c.fillRect(0,17,15,2);c.fillRect(16,17,TS,2);
  // tile shading
  c.fillStyle='#6A6578';c.fillRect(1,1,13,13);c.fillRect(17,17,13,13);
  c.fillStyle='#605B70';c.fillRect(1,18,13,12);c.fillRect(17,1,13,12);
  // highlights
  c.fillStyle='#7A7588';c.fillRect(1,1,13,2);c.fillRect(17,17,13,2);
}

function drawVelvet(c){
  // deep red carpet
  const g=c.createLinearGradient(0,0,TS,TS);
  g.addColorStop(0,'#8B0A1A');g.addColorStop(1,'#6A0812');
  c.fillStyle=g;c.fillRect(0,0,TS,TS);
  // diamond pattern
  c.fillStyle='#A01020';
  c.fillRect(15,0,2,TS);c.fillRect(0,15,TS,2);
  c.fillRect(7,7,2,2);c.fillRect(23,7,2,2);c.fillRect(7,23,2,2);c.fillRect(23,23,2,2);
  // border trim
  c.fillStyle='#D4AF37';
  c.fillRect(0,0,TS,1);c.fillRect(0,31,TS,1);c.fillRect(0,0,1,TS);c.fillRect(31,0,1,TS);
}

function drawWindow(c){
  // clerk window / counter window
  c.fillStyle='#2A2040';c.fillRect(0,0,TS,TS);
  // frame
  c.fillStyle='#8B7040';
  c.fillRect(2,2,28,6);c.fillRect(2,24,28,6);c.fillRect(2,2,6,28);c.fillRect(24,2,6,28);
  // glass
  c.fillStyle='#80C0FF55';c.fillRect(8,8,16,16);
  c.fillStyle='#A0D8FF33';c.fillRect(8,8,16,6);
  // reflection
  c.fillStyle='#FFFFFF22';c.fillRect(9,9,4,12);
  // golden trim
  c.fillStyle='#D4AF37';
  c.fillRect(2,2,28,2);c.fillRect(2,2,2,28);
}

function drawCounter(c){
  c.fillStyle='#5A3A18';c.fillRect(0,0,TS,TS);
  // surface
  c.fillStyle='#8B6030';c.fillRect(0,0,TS,12);
  c.fillStyle='#A07848';c.fillRect(0,0,TS,4);
  c.fillStyle='#C49060';c.fillRect(0,0,TS,2);
  // front panel
  c.fillStyle='#6A4820';c.fillRect(0,12,TS,TS-12);
  // panel lines
  c.fillStyle='#4A3010';c.fillRect(0,12,TS,2);c.fillRect(8,14,2,TS-14);c.fillRect(22,14,2,TS-14);
}

function drawColumn(c){
  c.fillStyle='#00000000';c.clearRect(0,0,TS,TS);
  // base
  c.fillStyle='#9A9090';c.fillRect(6,26,20,6);
  c.fillStyle='#B0A8A8';c.fillRect(6,26,20,3);
  // shaft
  c.fillStyle='#A8A0A0';c.fillRect(10,4,12,24);
  c.fillStyle='#C0B8B8';c.fillRect(10,4,4,24);
  c.fillStyle='#888080';c.fillRect(20,4,2,24);
  // capital
  c.fillStyle='#9A9090';c.fillRect(6,2,20,4);
  c.fillStyle='#B0A8A8';c.fillRect(6,2,20,2);
}

function drawDoorOpen(c){
  c.fillStyle='#1A1A2A';c.fillRect(0,0,TS,TS);
  // frame
  c.fillStyle='#8B6030';
  c.fillRect(0,0,6,TS);c.fillRect(26,0,6,TS);c.fillRect(0,0,TS,4);
  // door open (pushed to side)
  c.fillStyle='#A07848';c.fillRect(0,4,6,TS-4);
  c.fillStyle='#C09060';c.fillRect(0,4,3,TS-4);
  // threshold
  c.fillStyle='#D4AF37';c.fillRect(0,0,TS,2);c.fillRect(0,0,2,TS);c.fillRect(30,0,2,TS);
}

function drawDoorClosed(c){
  // door frame
  c.fillStyle='#5A3A18';c.fillRect(0,0,TS,TS);
  c.fillStyle='#8B6030';c.fillRect(2,0,28,TS);
  // door panels
  c.fillStyle='#A07848';c.fillRect(4,2,24,TS-2);
  c.fillStyle='#7A5828';c.fillRect(5,4,10,10);c.fillRect(17,4,10,10);
  c.fillStyle='#5A3818';c.fillRect(5,16,10,12);c.fillRect(17,16,10,12);
  c.fillStyle='#C09060';c.fillRect(4,2,5,TS-4);
  // handle
  c.fillStyle='#D4AF37';c.fillRect(14,17,4,3);
  // gold trim
  c.fillStyle='#D4AF37';c.fillRect(2,0,28,2);c.fillRect(2,0,2,TS);c.fillRect(28,0,2,TS);
}

function drawGrating(c){
  c.fillStyle='#1A1A2A';c.fillRect(0,0,TS,TS);
  c.fillStyle='#3A3A4A';
  for(let x=0;x<TS;x+=4)c.fillRect(x,0,2,TS);
  for(let y=0;y<TS;y+=4)c.fillRect(0,y,TS,2);
  c.fillStyle='#4A4A5A';
  for(let x=0;x<TS;x+=4)c.fillRect(x,0,1,TS);
  for(let y=0;y<TS;y+=4)c.fillRect(0,y,TS,1);
}

function drawVault(c){
  c.fillStyle='#1A2A1A';c.fillRect(0,0,TS,TS);
  // bolts
  c.fillStyle='#4A8A4A';
  const bolts=[[3,3],[14,3],[26,3],[3,14],[26,14],[3,26],[14,26],[26,26]];
  for(const[x,y] of bolts){c.fillStyle='#4A8A4A';c.fillRect(x,y,4,4);c.fillStyle='#6AAA6A';c.fillRect(x,y,2,2);}
  // plate
  c.fillStyle='#2A3A2A';c.fillRect(0,0,TS,2);c.fillRect(0,0,2,TS);c.fillRect(30,0,2,TS);c.fillRect(0,30,TS,2);
  c.fillStyle='#3A5A3A';c.fillRect(6,6,20,20);
  c.fillStyle='#2E4A2E';c.fillRect(8,8,16,16);
}

function drawStall(c){
  c.fillStyle='#2A1060';c.fillRect(0,0,TS,TS);
  // awning
  c.fillStyle='#9060D0';c.fillRect(0,0,TS,10);
  c.fillStyle='#C090FF';c.fillRect(0,0,TS,3);
  // stripes
  c.fillStyle='#7040B0';
  for(let x=0;x<TS;x+=8)c.fillRect(x,0,4,10);
  // counter
  c.fillStyle='#4A2880';c.fillRect(0,10,TS,22);
  c.fillStyle='#6A40A0';c.fillRect(0,10,TS,5);
  // items on counter
  c.fillStyle='#FFD700';c.fillRect(5,16,6,5);
  c.fillStyle='#FF6060';c.fillRect(14,15,7,6);
  c.fillStyle='#60FF60';c.fillRect(23,16,5,5);
}

function drawFountain(c){
  c.fillStyle='#2A4060';c.fillRect(0,0,TS,TS);
  // basin
  c.fillStyle='#4A6080';c.fillRect(2,14,28,16);
  c.fillStyle='#3A5070';c.fillRect(2,28,28,4);
  // water
  c.fillStyle='#1565C0';c.fillRect(4,16,24,12);
  c.fillStyle='#42A5F5';c.fillRect(4,16,24,3);
  // spout
  c.fillStyle='#8A9AB0';c.fillRect(14,4,4,12);
  c.fillStyle='#AAB8C8';c.fillRect(14,4,2,12);
  // spray
  c.fillStyle='#90CAF9';c.fillRect(12,2,2,4);c.fillRect(18,2,2,4);c.fillRect(14,0,4,3);
}

function drawShrub(c){
  c.fillStyle='#00000000';c.clearRect(0,0,TS,TS);
  // shadow
  c.fillStyle='#0A1A0A';c.fillRect(4,26,24,4);
  // bush layers
  c.fillStyle='#1B5E20';c.fillRect(2,16,28,14);c.fillRect(6,10,20,10);c.fillRect(10,6,12,8);
  c.fillStyle='#2E7D32';c.fillRect(4,18,24,10);c.fillRect(8,12,16,8);
  c.fillStyle='#43A047';c.fillRect(5,19,10,7);c.fillRect(18,12,8,8);
  c.fillStyle='#66BB6A';c.fillRect(5,19,4,3);c.fillRect(18,12,4,3);
  // berries
  c.fillStyle='#E53935';c.fillRect(14,14,3,3);c.fillRect(8,20,3,3);c.fillRect(22,18,3,3);
}

function drawQueueIn(c){
  // entry queue marker — gold arrows pointing in
  c.fillStyle='#1A1A2A';c.fillRect(0,0,TS,TS);
  c.fillStyle='#FFD700';
  // arrow pointing right (entry)
  c.fillRect(2,14,20,4);
  c.fillRect(18,10,6,6);c.fillRect(22,8,10,10); // arrowhead
  // border
  c.strokeStyle='#FFD700';c.lineWidth=2;c.strokeRect(1,1,30,30);
  // label
  c.fillStyle='#FFD700';c.fillRect(6,24,4,2);c.fillRect(12,24,6,2);
}

function drawQueueOut(c){
  // exit queue marker — red arrows pointing out
  c.fillStyle='#1A1A2A';c.fillRect(0,0,TS,TS);
  c.fillStyle='#FF4444';
  // arrow pointing left (exit)
  c.fillRect(10,14,20,4);
  c.fillRect(6,10,6,6);c.fillRect(0,8,10,10);
  c.strokeStyle='#FF4444';c.lineWidth=2;c.strokeRect(1,1,30,30);
}

function drawTicket(c){
  c.fillStyle='#2A2A3A';c.fillRect(0,0,TS,TS);
  // ticket machine
  c.fillStyle='#5A5A6A';c.fillRect(6,4,20,24);
  c.fillStyle='#7A7A8A';c.fillRect(6,4,20,6);
  c.fillStyle='#3A3A4A';c.fillRect(8,6,16,2);
  // ticket slot
  c.fillStyle='#D4AF37';c.fillRect(10,18,12,6);
  c.fillStyle='#FFF';c.fillRect(11,19,10,4);
  // number display
  c.fillStyle='#FF4444';c.fillRect(10,10,12,6);
  c.fillStyle='#FF8888';c.fillRect(12,11,3,4);c.fillRect(17,11,3,4);
}

function drawDirt(c){
  c.fillStyle='#6B4226';c.fillRect(0,0,TS,TS);
  c.fillStyle='#7B5236';
  c.fillRect(3,3,6,5);c.fillRect(16,8,8,4);c.fillRect(8,18,10,6);c.fillRect(22,20,7,5);
  c.fillStyle='#5B3218';
  c.fillRect(0,0,TS,2);c.fillRect(0,30,TS,2);
}

// ── BACKGROUND / PARALLAX ─────────────────────────────────────────────────────
function drawBackground(ctx,zone,camPx,camPy,W,H,tick){
  if(zone==='world'){
    const tx=Math.floor(G.x/TS),ty=Math.floor(G.y/TS);
    const inTown=tx>=TOWN_OX&&tx<TOWN_OX+MAP_W&&ty>=TOWN_OY&&ty<TOWN_OY+MAP_H;
    if(inTown)drawTownBG(ctx,camPx,camPy,W,H,tick);
    else drawWildernessBG(ctx,camPx,camPy,W,H,tick);
    return;
  }
  if(zone==='town')            drawTownBG(ctx,camPx,camPy,W,H,tick);
  else if(zone==='wilderness') drawWildernessBG(ctx,camPx,camPy,W,H,tick);
  else if(zone==='cavern')     drawCavernBG(ctx,W,H,tick);
  else if(zone==='hideout')    drawHideoutBG(ctx,W,H,tick);
  else if(zone==='ruins')      drawRuinsBG(ctx,W,H,tick);
  else if(zone==='village')    drawVillageBG(ctx,W,H,tick);
  else                         drawInteriorBG(ctx,zone,W,H,tick);
}

function drawTownBG(ctx,cx,cy,W,H,tick){
  // Sky gradient
  const sky=ctx.createLinearGradient(0,0,0,H*0.65);
  sky.addColorStop(0,'#0F1B3D');sky.addColorStop(0.4,'#1B3A6E');
  sky.addColorStop(0.75,'#2E6DB4');sky.addColorStop(1,'#7EB8E8');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.65);

  // Distant mountains (parallax 0.08)
  ctx.fillStyle='#2A3A5A';
  const mx=-(cx*0.08)%W;
  drawMountainRange(ctx,mx,H*0.42,W,H*0.25,'#2A3A5A','#3A4A6A');

  // Mid buildings (parallax 0.2)
  const bx=-(cx*0.2)%(W*2);
  drawCityscape(ctx,bx,H*0.35,W,H*0.35);

  // Clouds (slow drift)
  ctx.fillStyle='#FFFFFF30';
  const cl=-(tick*0.15+cx*0.05)%(W*1.5);
  drawCloud(ctx,cl,H*0.08,60,20);
  drawCloud(ctx,cl+200,H*0.14,80,18);
  drawCloud(ctx,cl+420,H*0.06,50,16);
  drawCloud(ctx,cl+650,H*0.12,70,22);

  // Ground (grass fill below tile area)
  const groundY=Math.max(0,H*0.65-cy*0.5);
  ctx.fillStyle='#1D5C23';ctx.fillRect(0,groundY,W,H-groundY);
}

function drawMountainRange(ctx,ox,baseY,W,H,c1,c2){
  const peaks=[[0.05,0.7],[0.18,0.85],[0.32,0.6],[0.48,0.9],[0.62,0.65],[0.78,0.8],[0.92,0.55]];
  ctx.fillStyle=c1;
  for(let pass=0;pass<2;pass++){
    const offX=pass*W;
    peaks.forEach(([fx,fy])=>{
      const px=ox+offX+fx*W,py=baseY-fy*H;
      ctx.beginPath();ctx.moveTo(px-60,baseY);ctx.lineTo(px,py);ctx.lineTo(px+60,baseY);ctx.fill();
    });
  }
  // snow caps
  ctx.fillStyle='#EEF0FF';
  peaks.forEach(([fx,fy])=>{
    if(fy<0.75)return;
    const px=ox+fx*W,py=baseY-fy*H;
    ctx.beginPath();ctx.moveTo(px-10,py+20);ctx.lineTo(px,py);ctx.lineTo(px+10,py+20);ctx.fill();
    ctx.beginPath();ctx.moveTo(px-10,py+20);ctx.lineTo(px+10,py+20);ctx.fill();
  });
}

function drawCityscape(ctx,ox,baseY,W,H){
  const buildings=[
    [0,H*0.9,50],[80,H*0.7,40],[130,H*0.85,60],[210,H*0.65,45],[270,H*0.8,35],
    [310,H*0.75,55],[380,H*0.6,45],[440,H*0.85,40],[490,H*0.7,60],[560,H*0.8,50],
    [620,H*0.65,40],[670,H*0.9,55],[730,H*0.75,45],[790,H*0.7,60],
  ];
  buildings.forEach(([bx,bh,bw])=>{
    const x=ox+bx;
    ctx.fillStyle='#2A3A5A';ctx.fillRect(x,baseY-bh,bw,bh);
    ctx.fillStyle='#1A2A4A';ctx.fillRect(x+bw-4,baseY-bh,4,bh);
    // windows
    ctx.fillStyle='#FFD70055';
    for(let wy=baseY-bh+6;wy<baseY-6;wy+=12)
      for(let wx=x+4;wx<x+bw-8;wx+=10)
        ctx.fillRect(wx,wy,6,8);
  });
}

function drawCloud(ctx,x,y,w,h){
  ctx.fillStyle='#FFFFFF25';
  ctx.fillRect(x,y+h*0.4,w,h*0.6);
  ctx.fillRect(x+w*0.1,y+h*0.2,w*0.6,h*0.8);
  ctx.fillRect(x+w*0.3,y,w*0.5,h);
  ctx.fillStyle='#FFFFFF15';
  ctx.fillRect(x+w,y+h*0.4,w*0.5,h*0.5);
}

function drawWildernessBG(ctx,cx,cy,W,H,tick){
  // Dark, ominous sky — twilight or perpetual overcast
  const sky=ctx.createLinearGradient(0,0,0,H*0.58);
  sky.addColorStop(0,'#080C14');
  sky.addColorStop(0.45,'#131E2E');
  sky.addColorStop(1,'#1E2E3A');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.58);

  // Stars (static — they don't move with the camera for distance effect)
  ctx.fillStyle='#FFFFFF';
  [[0.08,0.05],[0.19,0.11],[0.34,0.04],[0.51,0.09],[0.63,0.03],
   [0.72,0.13],[0.85,0.07],[0.93,0.15],[0.28,0.16],[0.44,0.14]].forEach(([fx,fy])=>{
    ctx.fillRect(Math.floor(fx*W),Math.floor(fy*H),1,1);
  });
  // Crescent moon (top-right area)
  ctx.fillStyle='#D8CFA0';
  ctx.beginPath();ctx.arc(W*0.82,H*0.1,11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#131E2E';
  ctx.beginPath();ctx.arc(W*0.85,H*0.09,9,0,Math.PI*2);ctx.fill();

  // Far mountains (very dark, slow parallax)
  const mx=-(cx*0.05)%W;
  drawMountainRange(ctx,mx,H*0.40,W,H*0.25,'#0F1820','#182030');

  // Treeline silhouette (mid parallax) — dark pine wall
  const tx2=-(cx*0.18)%(W*2);
  drawWildTreeline(ctx,tx2,H*0.34,W,H*0.28);

  // Slow drifting mist patches
  ctx.fillStyle='#2A3A2A30';
  const mist=(-tick*0.04-cx*0.03)%(W*1.5);
  ctx.fillRect(mist,H*0.50,W*0.4,12);
  ctx.fillRect(mist+W*0.55,H*0.53,W*0.35,8);
  ctx.fillRect(mist+W*1.0,H*0.51,W*0.3,10);

  // Dark ground fill (moss/dirt)
  const groundY=Math.max(0,H*0.58-cy*0.45);
  ctx.fillStyle='#141E10';ctx.fillRect(0,groundY,W,H-groundY);

  // Ground fog
  const fogG=ctx.createLinearGradient(0,groundY,0,groundY+28);
  fogG.addColorStop(0,'#2E4030AA');fogG.addColorStop(1,'#2E403000');
  ctx.fillStyle=fogG;ctx.fillRect(0,groundY,W,28);

  // Foreground foliage strip — fast parallax (0.6×), dark brush/ferns at screen bottom
  const bx=-(cx*0.6)%(W*1.4);
  drawFoliageStrip(ctx,bx,H*0.82,W);
}

function drawWildTreeline(ctx,ox,baseY,W,H){
  // Pine tree silhouettes in two passes for depth
  [['#0A140A',1.0],['#0D1A0D',0.75]].forEach(([col,scale],pass)=>{
    ctx.fillStyle=col;
    const offX=pass*W*0.6;
    const count=22;
    for(let i=0;i<count;i++){
      const x=ox+offX+i*(W/18);
      const treeH=H*(0.45+0.4*((Math.sin(i*1.9+pass*3.7)+1)/2));
      const treeW=treeH*0.38*scale;
      // Pine layers
      ctx.beginPath();
      ctx.moveTo(x-treeW/2,baseY);ctx.lineTo(x,baseY-treeH);ctx.lineTo(x+treeW/2,baseY);
      ctx.fill();
      // Second canopy layer
      ctx.beginPath();
      ctx.moveTo(x-treeW*0.4,baseY-treeH*0.4);
      ctx.lineTo(x,baseY-treeH*0.9);
      ctx.lineTo(x+treeW*0.4,baseY-treeH*0.4);
      ctx.fill();
    }
  });
}

function drawFoliageStrip(ctx,ox,baseY,W){
  // Two layers of dark bush/fern silhouettes — foreground feel
  [['#080F08',1.0],['#0A140A',0.7]].forEach(([col,scale],pass)=>{
    ctx.fillStyle=col;
    const offX=pass*W*0.38;
    for(let i=0;i<32;i++){
      const x=ox+offX+i*(W/13);
      const bh=(14+9*Math.abs(Math.sin(i*2.3+pass*1.7)))*scale;
      const bw=(20+12*Math.abs(Math.sin(i*1.7+pass*2.1)))*scale;
      ctx.beginPath();
      ctx.ellipse(x,baseY,bw/2,bh/2,0,0,Math.PI*2);
      ctx.fill();
      // Add a jagged spike for fern fronds
      ctx.beginPath();
      ctx.moveTo(x-bw*0.3,baseY-bh*0.3);
      ctx.lineTo(x,baseY-bh*0.9);
      ctx.lineTo(x+bw*0.3,baseY-bh*0.3);
      ctx.fill();
    }
  });
}

// ── INTERIOR BACKGROUND HELPERS ───────────────────────────────────────────────
function drawTorch(ctx,x,y,tick,phase){
  // Glow halo
  const glow=ctx.createRadialGradient(x,y-4,0,x,y-4,22);
  glow.addColorStop(0,'#FF770055');glow.addColorStop(0.45,'#FF440022');glow.addColorStop(1,'transparent');
  ctx.fillStyle=glow;ctx.fillRect(x-22,y-26,44,44);
  // Animated flame (3 pixel layers)
  const fh=10+Math.round(Math.sin(tick*0.18+phase)*2);
  ctx.fillStyle='#CC2200';ctx.fillRect(x-3,y-fh,6,fh);
  ctx.fillStyle='#FF6600';ctx.fillRect(x-2,y-fh+1,4,fh-1);
  ctx.fillStyle='#FFAA00';ctx.fillRect(x-1,y-fh+3,2,fh-3);
  ctx.fillStyle='#FFEE88';ctx.fillRect(x,  y-fh+5,1,fh-5);
  // Sconce bracket
  ctx.fillStyle='#2A2010';ctx.fillRect(x-4,y,8,7);ctx.fillRect(x-2,y+5,4,3);
}

// ── CEILING LAYER RENDERERS (cv-ceiling, z:4, always above tiles+sprites) ────
function drawTavernCeiling(ctx,W,tick){
  // Dark ceiling zone
  ctx.fillStyle='#0E0700';ctx.fillRect(0,0,W,64);
  // 3 horizontal timber beams
  [4,20,36].forEach(by=>{
    ctx.fillStyle='#3A1E08';ctx.fillRect(0,by,W,11);
    ctx.fillStyle='#4E2A0E';ctx.fillRect(0,by,W,3);
    ctx.fillStyle='#251205';ctx.fillRect(0,by+9,W,2);
  });
  // 3 hanging lanterns (chain + body + animated glow)
  [W*0.25,W*0.5,W*0.75].forEach((lx,i)=>{
    const ly=58;
    ctx.fillStyle='#3A3020';ctx.fillRect(lx-1,0,2,ly-10); // chain
    ctx.fillStyle='#2A2010';ctx.fillRect(lx-6,ly-10,12,12); // body
    ctx.fillStyle='#3A3020';ctx.fillRect(lx-4,ly-8,8,8);
    const flick=0.7+0.3*Math.sin(tick*0.15+i*1.8);
    const glow=ctx.createRadialGradient(lx,ly,0,lx,ly,28);
    glow.addColorStop(0,`rgba(255,180,60,${0.45*flick})`);
    glow.addColorStop(0.5,`rgba(255,120,20,${0.18*flick})`);
    glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow;ctx.fillRect(lx-28,ly-28,56,56);
    ctx.fillStyle='#FF9900';ctx.fillRect(lx-1,ly-7,2,5);
    ctx.fillStyle='#FFCC00';ctx.fillRect(lx,ly-8,1,4);
  });
  // Bottom trim strip
  ctx.fillStyle='#4A2008';ctx.fillRect(0,60,W,4);
  ctx.fillStyle='#6B3A18';ctx.fillRect(0,60,W,1);
}

function drawGovernanceCeiling(ctx,W,tick){
  ctx.fillStyle='#050A1A';ctx.fillRect(0,0,W,64);
  // Blue marble bands
  ['#070E28','#0A1535','#070E28','#0C1840'].forEach((col,i,a)=>{
    ctx.fillStyle=col;ctx.fillRect(0,i*(48/a.length),W,48/a.length+1);
  });
  // 3 marble pillar stubs from ceiling — capitals at bottom of strip
  [W*0.15,W*0.5,W*0.85].forEach(px=>{
    const pw=22;
    ctx.fillStyle='#1A2A4A';ctx.fillRect(px-pw/2,0,pw,52);
    ctx.fillStyle='#243660';ctx.fillRect(px-pw/2,0,pw*0.35,52);
    ctx.fillStyle='#101E38';ctx.fillRect(px+pw/2-5,0,5,52);
    // Capital ornaments at y≈48
    ctx.fillStyle='#D4AF37';ctx.fillRect(px-pw/2-4,48,pw+8,4);
    ctx.fillStyle='#B8930A';ctx.fillRect(px-pw/2-2,44,pw+4,4);
    ctx.fillStyle='#D4AF37';ctx.fillRect(px-pw/2-6,40,pw+12,4);
    ctx.fillStyle='#F0D060';ctx.fillRect(px-pw/2-6,40,pw+12,1);
  });
  // Heraldic banners between pillars
  [[W*0.28,6,12,36],[W*0.68,6,12,36]].forEach(([bx,by,bw,bh])=>{
    ctx.fillStyle='#0D1E44';ctx.fillRect(bx-bw/2,by,bw,bh);
    ctx.fillStyle='#D4AF3730';
    ctx.fillRect(bx-bw/2,by,bw,2);ctx.fillRect(bx-bw/2,by,2,bh);ctx.fillRect(bx+bw/2-2,by,2,bh);
    ctx.fillStyle='#D4AF3720';ctx.fillRect(bx-3,by+bh*0.35,6,5);ctx.fillRect(bx-1,by+bh*0.2,2,bh*0.2);
  });
  // Gold trim at top and bottom
  ctx.fillStyle='#D4AF3740';ctx.fillRect(0,0,W,2);
  ctx.fillStyle='#D4AF37';ctx.fillRect(0,60,W,2);ctx.fillStyle='#F0D060';ctx.fillRect(0,60,W,1);
}

function drawMarketplaceCeiling(ctx,W,tick){
  ctx.fillStyle='#0D0020';ctx.fillRect(0,0,W,64);
  // Arch curve at top
  ctx.fillStyle='#1E0840';
  for(let xi=0;xi<W;xi+=2){const c=Math.sin((xi/W)*Math.PI)*14;ctx.fillRect(xi,c,2,16);}
  ctx.fillStyle='#2A1055';
  for(let xi=0;xi<W;xi+=2){const c=Math.sin((xi/W)*Math.PI)*14;ctx.fillRect(xi,c,2,4);}
  // 3 awning canopies
  [W*0.15,W*0.5,W*0.82].forEach((ax,i)=>{
    const aw=W*0.2;
    for(let xi=ax-aw/2;xi<ax+aw/2;xi+=6){
      ctx.fillStyle=(Math.floor((xi-(ax-aw/2))/6)%2===0)?'#5A2888':'#3A1460';
      ctx.fillRect(xi,26+i*2,6,16);
    }
    ctx.fillStyle='#9050CC';ctx.fillRect(ax-aw/2,26+i*2,aw,2);
    // String lights with flicker
    ctx.fillStyle='#FFFF44';
    for(let xi=ax-aw/2+6;xi<ax+aw/2;xi+=10){
      ctx.fillRect(xi,24+i*2,2,2);
      ctx.fillStyle='#FFFF0020';ctx.fillRect(xi-2,22+i*2,6,6);ctx.fillStyle='#FFFF44';
    }
  });
  // Purple trim
  ctx.fillStyle='#4A1880';ctx.fillRect(0,60,W,4);ctx.fillStyle='#6A28A0';ctx.fillRect(0,60,W,1);
}

function drawTreasuryCeiling(ctx,W,tick){
  ctx.fillStyle='#000D00';ctx.fillRect(0,0,W,64);
  // Wall panel lines
  [16,32].forEach(py=>{
    ctx.fillStyle='#002200';ctx.fillRect(0,py,W,3);ctx.fillStyle='#003300';ctx.fillRect(0,py,W,1);
  });
  // Vault door (compact: center at y=26, radius=20)
  const vx=W/2,vy=26,vr=20;
  ctx.fillStyle='#0A1F0A';ctx.beginPath();ctx.arc(vx,vy,vr+4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#163A16';ctx.beginPath();ctx.arc(vx,vy,vr,0,Math.PI*2);ctx.fill();
  [[vr*0.78,'#0E2E0E'],[vr*0.56,'#1A3E1A'],[vr*0.34,'#0E2E0E'],[vr*0.14,'#0A1A0A']].forEach(([r,col])=>{
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(vx,vy,r,0,Math.PI*2);ctx.fill();
  });
  ctx.strokeStyle='#2A5A2A';ctx.lineWidth=1.5;
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){
    ctx.beginPath();ctx.moveTo(vx,vy);ctx.lineTo(vx+Math.cos(a)*vr*0.78,vy+Math.sin(a)*vr*0.78);ctx.stroke();
  }
  ctx.strokeStyle='#1E4A1E';ctx.lineWidth=2;ctx.beginPath();ctx.arc(vx,vy,vr+4,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#2A6A2A';ctx.fillRect(vx-2,vy-2,4,4);ctx.fillStyle='#3A8A3A';ctx.fillRect(vx-1,vy-1,2,2);
  // Green trim
  ctx.fillStyle='#004400';ctx.fillRect(0,60,W,4);ctx.fillStyle='#00AA00';ctx.fillRect(0,60,W,1);
}

function drawDungeonCeiling(ctx,W,tick){
  ctx.fillStyle='#050008';ctx.fillRect(0,0,W,64);
  // Stone arch columns
  [[0,28],[W-28,28]].forEach(([ax,aw])=>{
    ctx.fillStyle='#0E001C';ctx.fillRect(ax,0,aw,64);
    ctx.fillStyle='#150028';ctx.fillRect(ax,0,3,64);
    ctx.fillStyle='#060010';ctx.fillRect(ax+aw-3,0,3,64);
    [16,32,48].forEach(by=>{ctx.fillStyle='#080014';ctx.fillRect(ax+2,by,aw-4,1);});
  });
  // Arch keystone at center top
  ctx.fillStyle='#160030';ctx.fillRect(W/2-14,0,28,22);
  ctx.fillStyle='#1E0040';ctx.fillRect(W/2-8,0,16,16);
  // Skull on keystone
  ctx.fillStyle='#CCBBDD';ctx.fillRect(W/2-4,2,8,7);
  ctx.fillStyle='#080008';
  ctx.fillRect(W/2-3,4,2,2);ctx.fillRect(W/2+1,4,2,2);
  ctx.fillRect(W/2-2,8,1,2);ctx.fillRect(W/2,8,1,2);ctx.fillRect(W/2+2,8,1,2);
  // Animated torches on columns
  drawTorch(ctx,36,50,tick,0);
  drawTorch(ctx,W-36,50,tick,2.4);
  // Water drip tracks
  [W*0.3,W*0.52,W*0.72].forEach((dx,di)=>{
    ctx.fillStyle='#10001A';ctx.fillRect(dx,0,2,56);
    const dropY=((tick+di*30)%60)*(56/60);
    ctx.fillStyle='#2A0A40';ctx.fillRect(dx-1,dropY,4,5);
    ctx.fillStyle='#3A1060';ctx.fillRect(dx,dropY,2,4);
  });
  // Purple ambient glow
  const aura=ctx.createRadialGradient(W/2,0,0,W/2,0,W*0.4);
  aura.addColorStop(0,'#33006620');aura.addColorStop(1,'transparent');
  ctx.fillStyle=aura;ctx.fillRect(0,0,W,64);
  // Trim
  ctx.fillStyle='#160030';ctx.fillRect(0,60,W,4);ctx.fillStyle='#220044';ctx.fillRect(0,60,W,1);
}

// ── CRYSTAL CAVERN CEILING ────────────────────────────────────────────────────
function drawCavernCeiling(ctx,W,tick){
  // Dark icy rock ceiling
  ctx.fillStyle='#020818';ctx.fillRect(0,0,W,64);
  // Stone texture bands
  ['#030C1E','#040E22','#020A18','#050F24'].forEach((col,i,a)=>{
    ctx.fillStyle=col;ctx.fillRect(0,i*(48/a.length),W,48/a.length+1);
  });
  // Stalactite formations hanging down
  const stalPos=[W*0.08,W*0.18,W*0.30,W*0.42,W*0.55,W*0.65,W*0.76,W*0.88,W*0.95];
  stalPos.forEach((sx,i)=>{
    const sh=18+Math.round(Math.sin(i*1.9)*10); // varied heights
    const sw=5+Math.round(Math.abs(Math.sin(i*2.3))*4);
    ctx.fillStyle='#0A1828';ctx.fillRect(sx-sw/2,0,sw+2,sh+3);
    ctx.fillStyle='#1A3450';ctx.fillRect(sx-sw/2,0,sw,sh);
    ctx.fillStyle='#2A5080';ctx.fillRect(sx-sw/2,0,Math.ceil(sw*0.4),sh-4);
    // Ice crystal tip
    ctx.fillStyle='#80C0FF';ctx.fillRect(sx-1,sh-2,3,5);
    ctx.fillStyle='#CCEEFF';ctx.fillRect(sx,sh,1,3);
  });
  // Glowing ice seams
  [W*0.2,W*0.5,W*0.8].forEach((gx,i)=>{
    const g=ctx.createRadialGradient(gx,0,0,gx,0,30);
    g.addColorStop(0,`rgba(100,180,255,${0.12+0.06*Math.sin(tick*0.07+i)})`);
    g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(gx-30,0,60,40);
  });
  // Bottom trim / transition to tiles
  ctx.fillStyle='#061020';ctx.fillRect(0,58,W,6);
  ctx.fillStyle='#0A1E38';ctx.fillRect(0,58,W,2);
}

// ── BANDIT HIDEOUT CEILING ────────────────────────────────────────────────────
function drawHideoutCeiling(ctx,W,tick){
  // Rough stone + wood plank ceiling
  ctx.fillStyle='#100800';ctx.fillRect(0,0,W,64);
  // Stone base
  ctx.fillStyle='#1A1000';ctx.fillRect(0,0,W,36);
  // Rough horizontal cracks
  [8,18,28].forEach(by=>{
    ctx.fillStyle='#0A0600';ctx.fillRect(0,by,W,2);
    ctx.fillStyle='#241800';ctx.fillRect(0,by-1,W,1);
  });
  // Wooden plank strips over lower part
  [36,46,56].forEach(by=>{
    ctx.fillStyle='#2E1A08';ctx.fillRect(0,by,W,9);
    ctx.fillStyle='#3A2210';ctx.fillRect(0,by,W,3);
    ctx.fillStyle='#1E0E04';ctx.fillRect(0,by+7,W,2);
  });
  // Plank seam lines (vertical)
  for(let x=40;x<W;x+=48){
    ctx.fillStyle='#140A02';ctx.fillRect(x,36,2,28);
  }
  // 2 hanging torches on rough brackets
  [W*0.28,W*0.72].forEach((tx2,i)=>{
    ctx.fillStyle='#2A1800';ctx.fillRect(tx2-2,34,4,10); // bracket
    ctx.fillStyle='#3A2200';ctx.fillRect(tx2-4,42,8,5);  // torch body
    // Flame
    const flick=0.65+0.35*Math.sin(tick*0.18+i*2.1);
    const fglow=ctx.createRadialGradient(tx2,42,0,tx2,42,22);
    fglow.addColorStop(0,`rgba(255,140,0,${0.4*flick})`);fglow.addColorStop(1,'transparent');
    ctx.fillStyle=fglow;ctx.fillRect(tx2-22,22,44,44);
    ctx.fillStyle=`rgba(255,80,0,${0.5*flick})`;ctx.fillRect(tx2-2,36,4,7);
    ctx.fillStyle=`rgba(255,160,40,${0.7*flick})`;ctx.fillRect(tx2-1,38,2,4);
    ctx.fillStyle=`rgba(255,220,80,${0.8*flick})`;ctx.fillRect(tx2,39,1,3);
  });
  // Bottom trim
  ctx.fillStyle='#201208';ctx.fillRect(0,60,W,4);ctx.fillStyle='#301C0C';ctx.fillRect(0,60,W,1);
}

function renderCeiling(ctx,zone,W,H,tick){
  ctx.clearRect(0,0,W,H);
  if(zone==='world')return;
  if(zone==='tavern')          drawTavernCeiling(ctx,W,tick);
  else if(zone==='governance') drawGovernanceCeiling(ctx,W,tick);
  else if(zone==='marketplace')drawMarketplaceCeiling(ctx,W,tick);
  else if(zone==='treasury')   drawTreasuryCeiling(ctx,W,tick);
  else if(zone==='dungeon')    drawDungeonCeiling(ctx,W,tick);
  else if(zone==='cavern')     drawCavernCeiling(ctx,W,tick);
  else if(zone==='hideout')    drawHideoutCeiling(ctx,W,tick);
  else if(zone==='ruins')      { /* ruins are open-air — no ceiling */ }
  else if(zone==='village')    { /* village is open-air — no ceiling */ }
}

// ── INTERIOR BG ROUTER (cv-bg — solid zone color, behind tiles) ───────────────
function drawInteriorBG(ctx,zone,W,H,tick){
  const colors={tavern:'#1A0D00',governance:'#050A1A',marketplace:'#0D0020',treasury:'#000D00',dungeon:'#050008',
    cavern:'#020818',hideout:'#100800',ruins:'#090620',village:'#060A04'};
  ctx.fillStyle=colors[zone]||'#050A1A';ctx.fillRect(0,0,W,H);
}

// ── TAVERN ────────────────────────────────────────────────────────────────────
function drawTavernBG(ctx,W,H,tick){
  // Floor
  ctx.fillStyle='#1A0D00';ctx.fillRect(0,0,W,H);
  // Ceiling zone (dark between beams)
  ctx.fillStyle='#0E0700';ctx.fillRect(0,0,W,H*0.38);
  // 4 horizontal timber ceiling beams
  [8,20,32,44].forEach(by=>{
    ctx.fillStyle='#3A1E08';ctx.fillRect(0,by,W,10);
    ctx.fillStyle='#4E2A0E';ctx.fillRect(0,by,W,3);   // top highlight
    ctx.fillStyle='#251205';ctx.fillRect(0,by+8,W,2); // bottom shadow
  });
  // Upper warm wall with vertical plank lines
  ctx.fillStyle='#3D1F00';ctx.fillRect(0,H*0.38,W,H*0.12);
  ctx.fillStyle='#2A1500';
  for(let x=20;x<W;x+=22){ctx.fillRect(x,H*0.38,2,H*0.12);}
  // Trim strip at wall/floor join
  ctx.fillStyle='#6B3A18';ctx.fillRect(0,H*0.49,W,5);
  ctx.fillStyle='#8B5A28';ctx.fillRect(0,H*0.49,W,2);
  // Lower floor with plank lines
  ctx.fillStyle='#221000';ctx.fillRect(0,H*0.5,W,H*0.5);
  ctx.fillStyle='#1A0C00';
  for(let y=Math.floor(H*0.5)+12;y<H;y+=16){ctx.fillRect(0,y,W,2);}
  // Stone fireplace (left side)
  const fy=Math.floor(H*0.38),fh2=Math.floor(H*0.22),fw=38;
  ctx.fillStyle='#2E2018';ctx.fillRect(4,fy,fw,fh2);
  ctx.fillStyle='#0A0600';ctx.fillRect(8,fy+6,fw-8,fh2-8); // arch opening
  // Fire glow inside fireplace
  const fireFlick=0.6+0.4*Math.abs(Math.sin(tick*0.12));
  const fglow=ctx.createRadialGradient(4+fw/2,fy+fh2-2,0,4+fw/2,fy+fh2,18);
  fglow.addColorStop(0,`rgba(255,140,0,${0.5*fireFlick})`);fglow.addColorStop(1,'transparent');
  ctx.fillStyle=fglow;ctx.fillRect(4,fy,fw,fh2);
  ctx.fillStyle=`rgba(255,80,0,${0.3*fireFlick})`;ctx.fillRect(10,fy+fh2-10,fw-14,8);
  // 3 hanging lanterns
  [W*0.25,W*0.5,W*0.75].forEach((lx,i)=>{
    const ly=56;
    ctx.fillStyle='#3A3020';ctx.fillRect(lx-1,0,2,ly-8); // chain
    ctx.fillStyle='#2A2010';ctx.fillRect(lx-6,ly-8,12,12); // lantern body
    ctx.fillStyle='#3A3020';ctx.fillRect(lx-4,ly-6,8,8);
    const flick2=0.7+0.3*Math.sin(tick*0.15+i*1.8);
    const lglow=ctx.createRadialGradient(lx,ly,0,lx,ly,28);
    lglow.addColorStop(0,`rgba(255,180,60,${0.35*flick2})`);
    lglow.addColorStop(0.5,`rgba(255,120,20,${0.15*flick2})`);
    lglow.addColorStop(1,'transparent');
    ctx.fillStyle=lglow;ctx.fillRect(lx-28,ly-28,56,56);
    ctx.fillStyle='#FF9900';ctx.fillRect(lx-1,ly-5,2,4); // flame
    ctx.fillStyle='#FFCC00';ctx.fillRect(lx,ly-6,1,3);
  });
  // Vignette
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#000000AA');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── GOVERNANCE HALL ───────────────────────────────────────────────────────────
function drawGovernanceBG(ctx,W,H,tick){
  ctx.fillStyle='#050A1A';ctx.fillRect(0,0,W,H);
  // Lower floor with subtle marble lines
  ctx.fillStyle='#070D20';ctx.fillRect(0,H*0.5,W,H*0.5);
  ctx.fillStyle='#0A1228';
  for(let i=0;i<5;i++){ctx.fillRect(0,H*0.55+i*H*0.08,W,1);}
  // Upper wall — blue marble bands
  ['#0A1535','#0C1840','#0A1535','#0D1A42','#0A1535'].forEach((col,i,a)=>{
    ctx.fillStyle=col;ctx.fillRect(0,i*(H*0.42/a.length),W,H*0.42/a.length+1);
  });
  // 3 marble pillar tops descending from ceiling
  [W*0.15,W*0.5,W*0.85].forEach(px=>{
    const pw=22,ph=Math.floor(H*0.44);
    ctx.fillStyle='#020610';ctx.fillRect(px-pw/2+3,0,pw,ph);   // shadow
    ctx.fillStyle='#1A2A4A';ctx.fillRect(px-pw/2,0,pw,ph);     // body
    ctx.fillStyle='#243660';ctx.fillRect(px-pw/2,0,pw*0.35,ph);// highlight side
    ctx.fillStyle='#101E38';ctx.fillRect(px+pw/2-5,0,5,ph);    // shadow side
    // Capital (ornate top)
    ctx.fillStyle='#D4AF37';ctx.fillRect(px-pw/2-4,H*0.38,pw+8,4);
    ctx.fillStyle='#B8930A';ctx.fillRect(px-pw/2-2,H*0.36,pw+4,4);
    ctx.fillStyle='#D4AF37';ctx.fillRect(px-pw/2-6,H*0.34,pw+12,4);
    ctx.fillStyle='#F0D060';ctx.fillRect(px-pw/2-6,H*0.34,pw+12,1);
  });
  // Gold trim strip
  ctx.fillStyle='#B8930A';ctx.fillRect(0,H*0.42,W,5);
  ctx.fillStyle='#D4AF37';ctx.fillRect(0,H*0.42,W,2);
  ctx.fillStyle='#F0D060';ctx.fillRect(0,H*0.42,W,1);
  // Heraldic banner silhouettes between pillars
  [[W*0.28,14,14,H*0.3],[W*0.68,14,14,H*0.3]].forEach(([bx,by,bw,bh])=>{
    ctx.fillStyle='#0D1E44';ctx.fillRect(bx-bw/2,by,bw,bh);
    ctx.fillStyle='#D4AF3730';
    ctx.fillRect(bx-bw/2,by,bw,3);  // top
    ctx.fillRect(bx-bw/2,by,2,bh);  // left
    ctx.fillRect(bx+bw/2-2,by,2,bh);// right
    ctx.fillStyle='#D4AF3720';
    ctx.fillRect(bx-3,by+bh*0.3,6,6);        // emblem body
    ctx.fillRect(bx-1,by+bh*0.22,2,bh*0.2);  // emblem stem
  });
  ctx.fillStyle='#D4AF3740';ctx.fillRect(0,0,W,3); // top border
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#00000099');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── MARKETPLACE ───────────────────────────────────────────────────────────────
function drawMarketplaceBG(ctx,W,H,tick){
  ctx.fillStyle='#0D0020';ctx.fillRect(0,0,W,H);
  // Lower floor — stone tiles
  ctx.fillStyle='#100028';ctx.fillRect(0,H*0.5,W,H*0.5);
  ctx.fillStyle='#0A001C';
  for(let x=0;x<W;x+=32){ctx.fillRect(x,H*0.5,1,H*0.5);}
  for(let y=Math.floor(H*0.5);y<H;y+=24){ctx.fillRect(0,y,W,1);}
  // Upper wall
  ctx.fillStyle='#130030';ctx.fillRect(0,0,W,H*0.45);
  // Brick arch framing top of scene
  ctx.fillStyle='#1E0840';
  for(let xi=0;xi<W;xi+=2){
    const curve=Math.sin((xi/W)*Math.PI)*H*0.06;
    ctx.fillRect(xi,H*0.02+curve,2,16);
  }
  ctx.fillStyle='#2A1055';
  for(let xi=0;xi<W;xi+=2){
    const curve=Math.sin((xi/W)*Math.PI)*H*0.06;
    ctx.fillRect(xi,H*0.02+curve,2,4);
  }
  // 3 striped awning canopies
  [W*0.15,W*0.5,W*0.82].forEach((ax,i)=>{
    const aw=W*0.22;
    for(let xi=ax-aw/2;xi<ax+aw/2;xi+=6){
      ctx.fillStyle=(Math.floor((xi-(ax-aw/2))/6)%2===0)?'#5A2888':'#3A1460';
      ctx.fillRect(xi,H*0.1+i*2,6,18);
    }
    ctx.fillStyle='#7030AA';
    for(let xi=ax-aw/2;xi<ax+aw/2;xi+=4){
      ctx.fillRect(xi,H*0.1+i*2+16,2,6+Math.round(Math.sin(xi*0.4)*3));
    }
    ctx.fillStyle='#9050CC';ctx.fillRect(ax-aw/2,H*0.1+i*2,aw,3);
    // String lights with subtle flicker
    ctx.fillStyle='#FFFF44';
    for(let xi=ax-aw/2+6;xi<ax+aw/2;xi+=12){
      ctx.fillRect(xi,H*0.08+i*2,2,2);
      ctx.fillStyle='#FFFF0018';ctx.fillRect(xi-2,H*0.06+i*2,6,6);ctx.fillStyle='#FFFF44';
    }
  });
  // Hanging goods silhouettes (swords + pots alternating)
  ctx.fillStyle='#1A0838';
  [W*0.08,W*0.3,W*0.38,W*0.6,W*0.68,W*0.9].forEach((gx,i)=>{
    if(i%2===0){ctx.fillRect(gx-1,H*0.36,2,16);ctx.fillRect(gx-4,H*0.38,8,2);}
    else{ctx.fillRect(gx-4,H*0.36,8,10);ctx.fillRect(gx-2,H*0.34,4,4);}
  });
  // Trim strip
  ctx.fillStyle='#4A1880';ctx.fillRect(0,H*0.46,W,5);
  ctx.fillStyle='#6A28A0';ctx.fillRect(0,H*0.46,W,2);
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#000000AA');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── TREASURY ──────────────────────────────────────────────────────────────────
function drawTreasuryBG(ctx,W,H,tick){
  ctx.fillStyle='#000D00';ctx.fillRect(0,0,W,H);
  // Lower floor — steel/grating
  ctx.fillStyle='#040F04';ctx.fillRect(0,H*0.5,W,H*0.5);
  ctx.fillStyle='#020A02';
  for(let x=0;x<W;x+=16){ctx.fillRect(x,H*0.5,1,H*0.5);}
  for(let y=Math.floor(H*0.5);y<H;y+=16){ctx.fillRect(0,y,W,1);}
  // Rivet dots at grating intersections
  ctx.fillStyle='#0A1A0A';
  for(let x=0;x<W;x+=16){for(let y=Math.floor(H*0.5);y<H;y+=16){ctx.fillRect(x-1,y-1,3,3);}}
  // Upper wall — stone panels
  ctx.fillStyle='#001500';ctx.fillRect(0,0,W,H*0.46);
  [H*0.14,H*0.28,H*0.42].forEach(py=>{
    ctx.fillStyle='#002200';ctx.fillRect(0,py,W,4);
    ctx.fillStyle='#003300';ctx.fillRect(0,py,W,1);
  });
  // Security grating bars (decorative, left/right edges)
  for(let x=0;x<W*0.18;x+=10){ctx.fillStyle='#002A0028';ctx.fillRect(x,0,3,H*0.46);}
  for(let x=W*0.82;x<W;x+=10){ctx.fillStyle='#002A0028';ctx.fillRect(x,0,3,H*0.46);}
  // Vault door (centered)
  const vx=W/2,vy=H*0.38/2,vr=H*0.19;
  ctx.fillStyle='#0A1F0A';
  ctx.beginPath();ctx.arc(vx,vy,vr+6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#163A16';
  ctx.beginPath();ctx.arc(vx,vy,vr,0,Math.PI*2);ctx.fill();
  [[vr*0.85,'#0E2E0E'],[vr*0.7,'#1A3E1A'],[vr*0.55,'#0E2E0E'],[vr*0.4,'#112811'],[vr*0.25,'#0A1A0A']].forEach(([r,col])=>{
    ctx.fillStyle=col;ctx.beginPath();ctx.arc(vx,vy,r,0,Math.PI*2);ctx.fill();
  });
  // Spoke lines
  ctx.strokeStyle='#2A5A2A';ctx.lineWidth=2;
  for(let a=0;a<Math.PI*2;a+=Math.PI/4){
    ctx.beginPath();ctx.moveTo(vx,vy);ctx.lineTo(vx+Math.cos(a)*vr*0.82,vy+Math.sin(a)*vr*0.82);ctx.stroke();
  }
  ctx.strokeStyle='#1E4A1E';ctx.lineWidth=3;
  ctx.beginPath();ctx.arc(vx,vy,vr+6,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#2A6A2A';ctx.fillRect(vx-3,vy-3,6,6); // handle
  ctx.fillStyle='#3A8A3A';ctx.fillRect(vx-1,vy-1,2,2);
  // Gold coin pile corners
  [[W*0.08,H*0.44],[W*0.92,H*0.44]].forEach(([cx2,cy2])=>{
    for(let ci=0;ci<6;ci++){
      const cx3=cx2+(ci%3)*8-8,cy3=cy2-Math.floor(ci/3)*5;
      ctx.fillStyle='#5C4000';ctx.beginPath();ctx.ellipse(cx3,cy3,8,4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#8B6914';ctx.beginPath();ctx.ellipse(cx3,cy3-1,8,4,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#C8A020';ctx.beginPath();ctx.ellipse(cx3,cy3-1,5,2,0,0,Math.PI*2);ctx.fill();
    }
  });
  // Trim strip
  ctx.fillStyle='#004400';ctx.fillRect(0,H*0.46,W,5);
  ctx.fillStyle='#006600';ctx.fillRect(0,H*0.46,W,2);
  ctx.fillStyle='#1A9A1A';ctx.fillRect(0,H*0.46,W,1);
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.12,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#000000AA');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── DUNGEON ───────────────────────────────────────────────────────────────────
function drawDungeonBG(ctx,W,H,tick){
  ctx.fillStyle='#050008';ctx.fillRect(0,0,W,H);
  // Lower floor — worn stone slabs
  ctx.fillStyle='#080010';ctx.fillRect(0,H*0.5,W,H*0.5);
  [[0,H*0.5,48,24],[50,H*0.5,52,20],[104,H*0.5,44,24],[150,H*0.5,56,20],
   [208,H*0.5,48,24],[258,H*0.5,52,20],[312,H*0.5,44,24],[358,H*0.5,50,20],
   [410,H*0.5,46,24],[458,H*0.5,22,20]].forEach(([sx,sy,sw,sh])=>{
    ctx.fillStyle='#0C0018';ctx.fillRect(sx,sy,sw,sh);
    ctx.fillStyle='#100020';ctx.fillRect(sx,sy,sw,2);
    ctx.fillStyle='#060010';ctx.fillRect(sx,sy+sh-2,sw,2);
  });
  // Upper wall — stone courses
  ctx.fillStyle='#0A0018';ctx.fillRect(0,0,W,H*0.46);
  [H*0.1,H*0.2,H*0.3,H*0.38].forEach(my=>{ctx.fillStyle='#030008';ctx.fillRect(0,my,W,2);});
  // Staggered vertical mortar
  [[0,H*0.1],[H*0.1,H*0.2],[H*0.2,H*0.3],[H*0.3,H*0.38]].forEach(([y1,y2],ri)=>{
    const off=ri%2===0?0:28;
    for(let x=off;x<W;x+=56){ctx.fillStyle='#030008';ctx.fillRect(x,y1,1,y2-y1);}
  });
  // Arch column pillars (left & right)
  [[0,32],[W-32,32]].forEach(([ax,aw])=>{
    ctx.fillStyle='#0E001C';ctx.fillRect(ax,0,aw,H*0.48);
    ctx.fillStyle='#150028';ctx.fillRect(ax,0,4,H*0.48);
    ctx.fillStyle='#060010';ctx.fillRect(ax+aw-4,0,4,H*0.48);
    [H*0.08,H*0.18,H*0.28,H*0.38].forEach(by=>{ctx.fillStyle='#080014';ctx.fillRect(ax+2,by,aw-4,2);});
  });
  // Arch keystone at top-center
  ctx.fillStyle='#160030';ctx.fillRect(W/2-16,0,32,H*0.08);
  ctx.fillStyle='#1E0040';ctx.fillRect(W/2-10,0,20,H*0.06);
  // Skull on keystone
  ctx.fillStyle='#CCBBDD';ctx.fillRect(W/2-5,H*0.01,10,8);
  ctx.fillStyle='#080008';
  ctx.fillRect(W/2-3,H*0.025,2,3);ctx.fillRect(W/2+1,H*0.025,2,3); // eye sockets
  ctx.fillRect(W/2-2,H*0.06,1,2);ctx.fillRect(W/2,H*0.06,1,2);ctx.fillRect(W/2+2,H*0.06,1,2); // teeth
  // Animated torch sconces
  drawTorch(ctx,38,H*0.35,tick,0);
  drawTorch(ctx,W-38,H*0.35,tick,2.4);
  // Water drips (3 tracks)
  [W*0.3,W*0.52,W*0.72].forEach((dx,di)=>{
    ctx.fillStyle='#10001A';ctx.fillRect(dx,H*0.08,2,H*0.38); // drip streak
    const dropY=H*0.08+((tick+di*30)%90)*(H*0.38/90);
    ctx.fillStyle='#2A0A40';ctx.fillRect(dx-1,dropY,4,6);
    ctx.fillStyle='#3A1060';ctx.fillRect(dx,dropY,2,4);
  });
  // Trim strip
  ctx.fillStyle='#160030';ctx.fillRect(0,H*0.47,W,5);
  ctx.fillStyle='#220044';ctx.fillRect(0,H*0.47,W,2);
  // Purple ambient glow
  const aura=ctx.createRadialGradient(W/2,H*0.4,0,W/2,H*0.4,W*0.5);
  aura.addColorStop(0,'#33006618');aura.addColorStop(1,'transparent');
  ctx.fillStyle=aura;ctx.fillRect(0,0,W,H);
  // Heavy vignette
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.1,W/2,H/2,H*0.85);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#000000BB');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── CRYSTAL CAVERN BG ────────────────────────────────────────────────────────
function drawCavernBG(ctx,W,H,tick){
  ctx.fillStyle='#020818';ctx.fillRect(0,0,W,H);
  // Deep icy wall — lower half
  ctx.fillStyle='#040C20';ctx.fillRect(0,H*0.5,W,H*0.5);
  // Horizontal ice strata bands
  ['#030D22','#051228','#03101F','#061428'].forEach((col,i,a)=>{
    ctx.fillStyle=col;ctx.fillRect(0,H*0.5+i*(H*0.5/a.length),W,H*0.5/a.length+1);
  });
  // Crystal cluster suggestions on lower wall
  [[W*0.07,H*0.55],[W*0.2,H*0.62],[W*0.42,H*0.58],[W*0.65,H*0.6],[W*0.8,H*0.55],[W*0.93,H*0.63]].forEach(([cx,cy],i)=>{
    ctx.fillStyle='#1A3050';ctx.fillRect(cx-5,cy,10,20);
    ctx.fillStyle='#2A5080';ctx.fillRect(cx-3,cy,6,18);
    ctx.fillStyle='#4A80C0';ctx.fillRect(cx-1,cy,2,12);
    ctx.fillStyle='#80C0FF';ctx.fillRect(cx,cy,1,8);
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,20);
    g.addColorStop(0,`rgba(80,160,255,${0.08+0.04*Math.sin(tick*0.06+i)})`);
    g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.fillRect(cx-20,cy-10,40,35);
  });
  // Upper wall — dark rock face with ice veins
  ctx.fillStyle='#040B1A';ctx.fillRect(0,0,W,H*0.46);
  // Vertical ice crack veins
  [W*0.15,W*0.38,W*0.6,W*0.82].forEach((vx,i)=>{
    ctx.fillStyle='#102040';ctx.fillRect(vx,0,2,H*0.46);
    ctx.fillStyle='#204060';ctx.fillRect(vx,0,1,H*0.46);
    ctx.fillStyle='#4080B0';ctx.fillRect(vx,H*0.1+i*20,1,40);
    // glow
    const gv=ctx.createRadialGradient(vx,H*0.23,0,vx,H*0.23,25);
    gv.addColorStop(0,'rgba(64,128,255,0.08)');gv.addColorStop(1,'transparent');
    ctx.fillStyle=gv;ctx.fillRect(vx-25,0,50,H*0.46);
  });
  // Floor/wall divider strip
  ctx.fillStyle='#0A1828';ctx.fillRect(0,H*0.47,W,6);
  ctx.fillStyle='#204060';ctx.fillRect(0,H*0.47,W,2);
  // Ambient cold glow from ice
  const coldGlow=ctx.createRadialGradient(W/2,H*0.3,0,W/2,H*0.3,W*0.5);
  coldGlow.addColorStop(0,'rgba(50,100,200,0.06)');coldGlow.addColorStop(1,'transparent');
  ctx.fillStyle=coldGlow;ctx.fillRect(0,0,W,H);
  // Vignette
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#000000AA');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── BANDIT HIDEOUT BG ────────────────────────────────────────────────────────
function drawHideoutBG(ctx,W,H,tick){
  ctx.fillStyle='#100800';ctx.fillRect(0,0,W,H);
  // Rough stone lower walls
  ctx.fillStyle='#180C04';ctx.fillRect(0,H*0.5,W,H*0.5);
  // Stone block texture
  for(let bx=0;bx<W;bx+=36){
    for(let by=Math.floor(H*0.5);by<H;by+=22){
      ctx.fillStyle=((bx+by)%72===0)?'#1E1006':'#160A03';
      ctx.fillRect(bx,by,35,21);
      ctx.fillStyle='#0A0400';ctx.fillRect(bx+35,by,1,21);ctx.fillRect(bx,by+21,35,1);
    }
  }
  // Stacked crates/barrels (silhouette) at side walls
  [[W*0.04,H*0.48],[W*0.88,H*0.46]].forEach(([bx2,by2])=>{
    ctx.fillStyle='#281408';ctx.fillRect(bx2-14,by2,28,H*0.54);
    ctx.fillStyle='#3A1E0C';ctx.fillRect(bx2-12,by2+2,24,14);
    ctx.fillStyle='#1C0C04';ctx.fillRect(bx2-12,by2+16,24,14);
    ctx.fillStyle='#3A1E0C';ctx.fillRect(bx2-12,by2+30,24,16);
  });
  // Upper wall with rough stone and smoke stains
  ctx.fillStyle='#160C04';ctx.fillRect(0,0,W,H*0.46);
  // Horizontal mortar lines
  [H*0.1,H*0.2,H*0.32,H*0.42].forEach(hy=>{
    ctx.fillStyle='#0C0804';ctx.fillRect(0,hy,W,2);
  });
  // Smoke stains above torch positions
  [W*0.3,W*0.7].forEach((sx,i)=>{
    const sG=ctx.createRadialGradient(sx,H*0.46,0,sx,H*0.46,40);
    sG.addColorStop(0,'rgba(10,5,0,0.3)');sG.addColorStop(1,'transparent');
    ctx.fillStyle=sG;ctx.fillRect(sx-40,H*0.2,80,H*0.26);
    // Warm torch glow on wall
    const tG=ctx.createRadialGradient(sx,H*0.44,0,sx,H*0.44,50);
    const flick=0.6+0.4*Math.sin(tick*0.17+i*2);
    tG.addColorStop(0,`rgba(255,140,30,${0.12*flick})`);tG.addColorStop(1,'transparent');
    ctx.fillStyle=tG;ctx.fillRect(sx-50,H*0.2,100,H*0.26);
  });
  // Wall/floor divider
  ctx.fillStyle='#201008';ctx.fillRect(0,H*0.47,W,6);
  ctx.fillStyle='#3A1C0A';ctx.fillRect(0,H*0.47,W,2);
  // Vignette
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#000000A0');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── ANCIENT RUINS BG ─────────────────────────────────────────────────────────
function drawRuinsBG(ctx,W,H,tick){
  // Open-air night sky — ancient atmosphere
  const sky=ctx.createLinearGradient(0,0,0,H*0.55);
  sky.addColorStop(0,'#0A0520');sky.addColorStop(0.5,'#150A30');sky.addColorStop(1,'#1E1040');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.55);
  // Stars (static)
  ctx.fillStyle='#FFFFFF';
  [[W*0.08,H*0.05],[W*0.2,H*0.12],[W*0.33,H*0.04],[W*0.48,H*0.08],[W*0.6,H*0.03],
   [W*0.73,H*0.10],[W*0.85,H*0.06],[W*0.94,H*0.13],[W*0.15,H*0.18],[W*0.55,H*0.16],
  ].forEach(([sx,sy])=>{ctx.fillRect(sx,sy,1,1);ctx.fillStyle='#FFFFFF';});
  // Ruined colonnade silhouette on distant wall
  [W*0.08,W*0.24,W*0.4,W*0.58,W*0.74,W*0.9].forEach((px,i)=>{
    const ph=H*0.25+(i%2)*H*0.08;
    ctx.fillStyle='#0E0828';ctx.fillRect(px-10,H*0.32-ph,20,ph);
    ctx.fillStyle='#14103A';ctx.fillRect(px-8,H*0.32-ph,16,ph);
    // broken tops on alternate columns
    if(i%3===1){
      ctx.fillStyle='#0E0828';ctx.fillRect(px-14,H*0.32-ph-8,28,10);
    }
  });
  // Stone floor — ancient mossy slabs
  ctx.fillStyle='#0C0A1E';ctx.fillRect(0,H*0.55,W,H*0.45);
  for(let bx=0;bx<W;bx+=42){
    for(let by=Math.floor(H*0.55);by<H;by+=28){
      ctx.fillStyle=((bx+by)%84===0)?'#100E26':'#0E0C22';
      ctx.fillRect(bx,by,41,27);
      ctx.fillStyle='#08061A';ctx.fillRect(bx+41,by,1,27);ctx.fillRect(bx,by+27,41,1);
    }
  }
  // Moss patches on floor
  ctx.fillStyle='#0A1408';
  [[W*0.15,H*0.6],[W*0.35,H*0.7],[W*0.6,H*0.65],[W*0.8,H*0.72]].forEach(([mx,my])=>{
    ctx.fillRect(mx-10,my,20,8);ctx.fillRect(mx-7,my-3,14,5);
  });
  // Divider strip
  ctx.fillStyle='#100E28';ctx.fillRect(0,H*0.55,W,5);
  ctx.fillStyle='#1E1A40';ctx.fillRect(0,H*0.55,W,2);
  // Mystic ambient glow
  const mg=ctx.createRadialGradient(W/2,H*0.4,0,W/2,H*0.4,W*0.45);
  mg.addColorStop(0,'rgba(80,40,160,0.08)');mg.addColorStop(1,'transparent');
  ctx.fillStyle=mg;ctx.fillRect(0,0,W,H);
  // Vignette
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#00000099');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// ── ABANDONED VILLAGE BG ─────────────────────────────────────────────────────
function drawVillageBG(ctx,W,H,tick){
  // Overcast dim sky — abandoned outdoor feel
  const sky=ctx.createLinearGradient(0,0,0,H*0.5);
  sky.addColorStop(0,'#151008');sky.addColorStop(0.5,'#201808');sky.addColorStop(1,'#2A2010');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.5);
  // Distant tree line silhouette
  ctx.fillStyle='#0C0A06';
  for(let i=0;i<20;i++){
    const tx=i*(W/18);
    const th=H*0.14+H*0.08*Math.abs(Math.sin(i*1.7));
    ctx.fillRect(tx-8,H*0.38-th,16,th+H*0.15);
    // tree crown
    ctx.fillRect(tx-14,H*0.36-th,28,th*0.4);
  }
  // Ruined roof silhouettes mid-distance
  [[W*0.1,H*0.35],[W*0.4,H*0.32],[W*0.65,H*0.34],[W*0.88,H*0.36]].forEach(([rx,ry],i)=>{
    ctx.fillStyle='#0E0A06';
    ctx.fillRect(rx-20,ry,40,H*0.18); // wall
    // broken roof angle
    ctx.fillRect(rx-24,ry,4,18);
    ctx.fillRect(rx+20,ry,4,18);
    if(i%2===0){ctx.fillRect(rx-24,ry-10,26,12);} // left roof half
    else{ctx.fillRect(rx+0,ry-10,24,12);}          // right roof half
  });
  // Dirt ground
  ctx.fillStyle='#1A1208';ctx.fillRect(0,H*0.5,W,H*0.5);
  // Dirt path texture
  ctx.fillStyle='#221808';
  for(let gx=0;gx<W;gx+=18){ctx.fillRect(gx,H*0.5,1,H*0.5);}
  for(let gy=Math.floor(H*0.5);gy<H;gy+=14){ctx.fillRect(0,gy,W,1);}
  // Overgrown weeds/grass patches
  ctx.fillStyle='#0E1208';
  [[W*0.12,H*0.55],[W*0.3,H*0.62],[W*0.5,H*0.58],[W*0.7,H*0.65],[W*0.88,H*0.6]].forEach(([gx2,gy2])=>{
    ctx.fillRect(gx2-8,gy2,16,6);ctx.fillRect(gx2-5,gy2-4,10,6);ctx.fillRect(gx2-3,gy2-7,6,5);
  });
  // Wall/ground divider
  ctx.fillStyle='#201408';ctx.fillRect(0,H*0.5,W,5);
  ctx.fillStyle='#301E0C';ctx.fillRect(0,H*0.5,W,2);
  // Vignette (warm, desaturated)
  const vig=ctx.createRadialGradient(W/2,H/2,H*0.15,W/2,H/2,H*0.9);
  vig.addColorStop(0,'transparent');vig.addColorStop(1,'#00000098');
  ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
}

// (drawInteriorBG is defined above, near ceiling helpers)

// ── PLAYER SPRITE ─────────────────────────────────────────────────────────────
// species-aware, hair-color-aware, direction+animation aware.
// gender + skinToneIdx + class_ route human characters to the correct procedural sprite.
function drawPlayerSprite(ctx,ox,oy,dir,color,frame,moving,godMode,species,hairColor,accessory,gender,skinToneIdx,class_){
  const sp=species||'human';
  const _g=gender||'male', _st=skinToneIdx??2, _hr=hairColor||HAIR_COLORS[1];

  // ── Human characters: class determines sprite archetype ──────────────────
  if(sp==='human'){
    const cls=class_||'warrior';
    if     (cls==='mage')    drawHumanMageSprite   (ctx,ox,oy,dir,frame,moving,_g,_st,_hr);
    else if(cls==='rogue')   drawHumanRogueSprite  (ctx,ox,oy,dir,frame,moving,_g,_st,_hr);
    else if(cls==='paladin') drawHumanPaladinSprite(ctx,ox,oy,dir,frame,moving,_g,_st,_hr);
    else                     drawHumanWarriorSprite(ctx,ox,oy,dir,frame,moving,_g,_st,_hr);
    return;
  }

  // ── Non-human species: dedicated procedural sprites ───────────────────────
  if(sp==='elf')   { drawElfSprite   (ctx,ox,oy,dir,frame,moving,_g,_st,_hr); return; }
  if(sp==='dwarf') { drawDwarfSprite (ctx,ox,oy,dir,frame,moving,_g,_st,_hr); return; }
  if(sp==='goblin'){ drawGoblinSprite(ctx,ox,oy,dir,frame,moving,_g,_st,_hr); return; }
  if(sp==='orc')   { drawOrcSprite   (ctx,ox,oy,dir,frame,moving,_g,_st,_hr); return; }
  if(sp==='robot') { drawRobotSprite (ctx,ox,oy,dir,frame,moving,_g,_st,_hr); return; }

  // ── Legacy generic fallback (safety net for unknown species) ──────────────
  const f=moving?(Math.floor(frame/4)%6):0;
  const c=color||'#2255DD';

  // 5-shade armor palette
  const aOut=darken(c,100); // very dark outline
  const aSh =darken(c,60);  // shadow
  const aMid=c;              // base
  const aHi =lighten(c,50); // highlight
  const aBrt=lighten(c,85); // bright accent / chest gem center

  const hair=hairColor||HAIR_COLORS[1];
  const hairHL=lighten(hair,35);
  const hairSh=darken(hair,25);

  // skin tones
  const skins={
    human: {skin:'#FFCC99',sk2:'#D99A66',sk3:'#FFE8CC',eye:'#3A2A1A'},
    elf:   {skin:'#F5D8B8',sk2:'#D0A878',sk3:'#FFF0E0',eye:'#1A401A'},
    dwarf: {skin:'#CC8844',sk2:'#A06030',sk3:'#E0A060',eye:'#3A1A00'},
    goblin:{skin:'#88AA40',sk2:'#5A7820',sk3:'#AACF60',eye:'#3A2000'},
    orc:   {skin:'#6A9030',sk2:'#446020',sk3:'#8AB050',eye:'#200000'},
    robot: {skin:'#A0A0A0',sk2:'#606060',sk3:'#C8C8C8',eye:'#00C0FF'},
  };
  const sk=skins[sp]||skins.human;
  const boot='#201008',bootHL='#382010',bootSh='#100800';

  // species body dimensions: helmet(hx,hy,hw,hh), body(bx,by,bw,bh), legs(lw), shoulder-pad width(sw)
  const SD={
    human: {hx:4,hy:0, hw:16,hh:12,bx:4,by:14,bw:16,bh:13,lw:6,sw:4,legGap:10},
    elf:   {hx:5,hy:-2,hw:14,hh:11,bx:5,by:13,bw:14,bh:15,lw:5,sw:3,legGap:9},
    dwarf: {hx:3,hy:1, hw:18,hh:11,bx:3,by:14,bw:18,bh:11,lw:7,sw:5,legGap:11},
    goblin:{hx:4,hy:2, hw:15,hh:10,bx:5,by:14,bw:14,bh:10,lw:5,sw:3,legGap:9},
    orc:   {hx:2,hy:0, hw:20,hh:12,bx:2,by:14,bw:20,bh:13,lw:8,sw:6,legGap:12},
    robot: {hx:3,hy:0, hw:18,hh:12,bx:3,by:14,bw:18,bh:13,lw:7,sw:5,legGap:11},
  }[sp]||{hx:4,hy:0,hw:16,hh:12,bx:4,by:14,bw:16,bh:13,lw:6,sw:4,legGap:10};
  const {hx,hy,hw,hh,bx,by,bw,bh,lw,sw,legGap}=SD;
  const cx2=12; // sprite horizontal center

  // 6-frame walk-cycle: Y swing for legs/arms + body bob for upper torso
  const WALK_SWING=[0,-4,-6, 0, 4, 6]; // left-leg Y offset per frame (right is mirrored)
  const WALK_BOB  =[0, 0, 1, 0, 0, 1]; // body dips 1px on foot-plant frames
  const swing  =moving?WALK_SWING[f]:0;
  const bob    =moving?WALK_BOB[f]:0;
  const lLegOff=moving? swing:0;
  const rLegOff=moving?-swing:0;
  const lArmOff=moving?-swing:0;
  const rArmOff=moving? swing:0;

  // ── Shadow ──
  ctx.fillStyle='#00000040';
  ctx.fillRect(ox+cx2-10,oy+41,20,3);

  // ── Helper: rect with 1px dark outline ──
  // (used throughout: draws outline color 1px larger, then fill on top)
  const OR=(x,y,w,h,fill,out)=>{
    ctx.fillStyle=out||aOut;ctx.fillRect(ox+x-1,oy+y-1,w+2,h+2);
    ctx.fillStyle=fill;ctx.fillRect(ox+x,oy+y,w,h);
  };

  // ─ Cape (drawn behind body/legs) ─
  if(accessory==='cape'){
    const capeColor=darken(color,70); const capeHi=darken(color,45);
    // left flap
    ctx.fillStyle=darken(capeColor,20);
    ctx.beginPath();ctx.moveTo(ox+bx,oy+by+2);ctx.lineTo(ox+bx-6,oy+44);ctx.lineTo(ox+bx+4,oy+44);ctx.lineTo(ox+bx+2,oy+by+2);ctx.fill();
    ctx.fillStyle=capeColor;
    ctx.beginPath();ctx.moveTo(ox+bx,oy+by+2);ctx.lineTo(ox+bx-5,oy+44);ctx.lineTo(ox+bx+3,oy+44);ctx.lineTo(ox+bx+2,oy+by+2);ctx.fill();
    // right flap
    ctx.fillStyle=darken(capeColor,20);
    ctx.beginPath();ctx.moveTo(ox+bx+bw-2,oy+by+2);ctx.lineTo(ox+bx+bw+6,oy+44);ctx.lineTo(ox+bx+bw-4,oy+44);ctx.lineTo(ox+bx+bw,oy+by+2);ctx.fill();
    ctx.fillStyle=capeColor;
    ctx.beginPath();ctx.moveTo(ox+bx+bw-2,oy+by+2);ctx.lineTo(ox+bx+bw+5,oy+44);ctx.lineTo(ox+bx+bw-3,oy+44);ctx.lineTo(ox+bx+bw,oy+by+2);ctx.fill();
    // collar (overtop of shoulders, drawn again after body save)
    ctx.fillStyle=capeHi;ctx.fillRect(ox+bx,oy+by-1,bw,3);
  }

  // ─ Boots ─
  const bootY=by+bh+9;
  const ll=cx2-legGap/2-lw, lr=cx2+legGap/2; // left-leg x, right-leg x
  [ll,lr].forEach(lx=>{
    ctx.fillStyle=bootSh;ctx.fillRect(ox+lx-1,oy+bootY-1,lw+2,8);
    ctx.fillStyle=boot;  ctx.fillRect(ox+lx,  oy+bootY,  lw,  7);
    ctx.fillStyle=bootHL;ctx.fillRect(ox+lx,  oy+bootY,  lw,  2);
  });

  // ─ Legs ─
  const legY=by+bh;
  // left leg
  ctx.fillStyle=aOut;ctx.fillRect(ox+ll-1,oy+legY+lLegOff-1,lw+2,11);
  ctx.fillStyle=aSh; ctx.fillRect(ox+ll,  oy+legY+lLegOff,  lw,  11);
  ctx.fillStyle=aMid;ctx.fillRect(ox+ll,  oy+legY+lLegOff,  lw-2,11);
  ctx.fillStyle=aHi; ctx.fillRect(ox+ll,  oy+legY+lLegOff,  2,   11);
  // left knee pad
  OR(ll,legY+4+lLegOff,lw,4,aBrt);
  ctx.fillStyle=aHi;ctx.fillRect(ox+ll,oy+legY+4+lLegOff,lw,2);

  // right leg
  ctx.fillStyle=aOut;ctx.fillRect(ox+lr-1,oy+legY+rLegOff-1,lw+2,11);
  ctx.fillStyle=aSh; ctx.fillRect(ox+lr,  oy+legY+rLegOff,  lw,  11);
  ctx.fillStyle=aMid;ctx.fillRect(ox+lr,  oy+legY+rLegOff,  lw-2,11);
  ctx.fillStyle=aHi; ctx.fillRect(ox+lr,  oy+legY+rLegOff,  2,   11);
  // right knee pad
  OR(lr,legY+4+rLegOff,lw,4,aBrt);
  ctx.fillStyle=aHi;ctx.fillRect(ox+lr,oy+legY+4+rLegOff,lw,2);

  // ─ Body / Chest plate ─ (upper body shifts with bob — save canvas state)
  ctx.save(); ctx.translate(0, bob);
  ctx.fillStyle=aOut;ctx.fillRect(ox+bx-1,oy+by-1,bw+2,bh+2);
  ctx.fillStyle=aSh; ctx.fillRect(ox+bx,  oy+by,  bw,  bh);
  ctx.fillStyle=aMid;ctx.fillRect(ox+bx,  oy+by,  bw-3,bh);
  ctx.fillStyle=aHi; ctx.fillRect(ox+bx,  oy+by,  4,   bh);
  ctx.fillStyle=aBrt;ctx.fillRect(ox+bx,  oy+by,  bw,  2);

  // ─ Chest Gem ─
  const gx=cx2-4,gy=by+3;
  ctx.fillStyle=aOut;   ctx.fillRect(ox+gx-1,oy+gy-1,10,8);
  ctx.fillStyle=darken(c,40);ctx.fillRect(ox+gx,oy+gy,8,6);
  ctx.fillStyle=aBrt;   ctx.fillRect(ox+gx+1,oy+gy+1,4,2);
  ctx.fillStyle='#fff'; ctx.fillRect(ox+gx+1,oy+gy+1,2,1);

  // ─ Belt ─
  const beltY=by+bh-3;
  ctx.fillStyle='#1A1008';ctx.fillRect(ox+bx,oy+beltY,bw,4);
  ctx.fillStyle='#D4AF37';ctx.fillRect(ox+cx2-3,oy+beltY,6,4);
  ctx.fillStyle='#FFE060';ctx.fillRect(ox+cx2-2,oy+beltY+1,4,2);

  // ─ Shoulder pads ─
  OR(bx-sw-1,by-1,sw+1,7,aSh);
  ctx.fillStyle=aMid;ctx.fillRect(ox+bx-sw,oy+by,sw-1,6);
  ctx.fillStyle=aHi; ctx.fillRect(ox+bx-sw,oy+by,sw-1,2);
  OR(bx+bw,by-1,sw+1,7,aSh);
  ctx.fillStyle=aMid;ctx.fillRect(ox+bx+bw+1,oy+by,sw-1,6);
  ctx.fillStyle=aHi; ctx.fillRect(ox+bx+bw+1,oy+by,sw-1,2);

  // ─ Left arm ─
  const lax=bx-4, lay=by+4;
  ctx.fillStyle=aOut;ctx.fillRect(ox+lax-1,oy+lay+lArmOff-1,5,13);
  ctx.fillStyle=aSh; ctx.fillRect(ox+lax,  oy+lay+lArmOff,  4,  13);
  ctx.fillStyle=aMid;ctx.fillRect(ox+lax,  oy+lay+lArmOff,  3,  13);
  ctx.fillStyle=aHi; ctx.fillRect(ox+lax,  oy+lay+lArmOff,  2,  13);
  ctx.fillStyle=darken(c,35);ctx.fillRect(ox+lax,oy+lay+11+lArmOff,5,4);

  // ─ Right arm ─
  const rax=bx+bw;
  ctx.fillStyle=aOut;ctx.fillRect(ox+rax,  oy+lay+rArmOff-1,5,13);
  ctx.fillStyle=aSh; ctx.fillRect(ox+rax,  oy+lay+rArmOff,  4,  13);
  ctx.fillStyle=aMid;ctx.fillRect(ox+rax+1,oy+lay+rArmOff,  3,  13);
  ctx.fillStyle=aHi; ctx.fillRect(ox+rax+1,oy+lay+rArmOff,  1,  13);
  ctx.fillStyle=darken(c,35);ctx.fillRect(ox+rax,oy+lay+11+rArmOff,5,4);

  // ─ Neck ─
  ctx.fillStyle=sk.skin;ctx.fillRect(ox+cx2-2,oy+hy+hh,4,3);

  // ─ Helmet (Mega Man X–style: covers full head, only visor slit shows face) ─
  // Outline
  ctx.fillStyle=aOut;ctx.fillRect(ox+hx-1,oy+hy-1,hw+2,hh+2);
  // Shadow side
  ctx.fillStyle=aSh; ctx.fillRect(ox+hx,  oy+hy,  hw,  hh);
  // Mid tone
  ctx.fillStyle=aMid;ctx.fillRect(ox+hx,  oy+hy,  hw-3,hh);
  // Highlight strip (left face of helmet)
  ctx.fillStyle=aHi; ctx.fillRect(ox+hx,  oy+hy,  4,   hh);
  // Bright top edge
  ctx.fillStyle=aBrt;ctx.fillRect(ox+hx,  oy+hy,  hw,  2);

  // ─ Visor slit (narrow horizontal window — the ONLY skin visible) ─
  const vx=hx+2, vy=hy+5, vw=hw-4, vh=3;
  ctx.fillStyle='#0A0A18';ctx.fillRect(ox+vx-1,oy+vy-1,vw+2,vh+2); // visor frame
  ctx.fillStyle=sk.skin;  ctx.fillRect(ox+vx,  oy+vy,  vw,  vh);   // skin strip
  ctx.fillStyle=sk.sk3;   ctx.fillRect(ox+vx,  oy+vy,  vw,  1);    // highlight row

  // Eyes inside visor
  if(sp==='robot'){
    ctx.fillStyle=sk.eye;ctx.fillRect(ox+vx,oy+vy,vw,vh);
    ctx.fillStyle='#fff';
    ctx.fillRect(ox+vx+1,oy+vy+1,2,1);ctx.fillRect(ox+vx+vw-3,oy+vy+1,2,1);
  } else {
    if(dir===2||dir===0){
      ctx.fillStyle=sk.eye;ctx.fillRect(ox+vx+2,oy+vy+1,2,2);ctx.fillRect(ox+vx+vw-4,oy+vy+1,2,2);
      ctx.fillStyle='#fff';ctx.fillRect(ox+vx+2,oy+vy+1,1,1);ctx.fillRect(ox+vx+vw-4,oy+vy+1,1,1);
    } else if(dir===1){
      ctx.fillStyle=sk.eye;ctx.fillRect(ox+vx+vw-4,oy+vy+1,2,2);
      ctx.fillStyle='#fff';ctx.fillRect(ox+vx+vw-4,oy+vy+1,1,1);
    } else {
      ctx.fillStyle=sk.eye;ctx.fillRect(ox+vx+2,oy+vy+1,2,2);
      ctx.fillStyle='#fff';ctx.fillRect(ox+vx+2,oy+vy+1,1,1);
    }
  }

  // ─ Species extras ─
  if(sp==='elf'){
    // long pointed ears (outside helmet)
    ctx.fillStyle=sk.skin;ctx.fillRect(ox+hx-3,oy+hy+3,3,6);
    ctx.fillStyle=sk.sk2; ctx.fillRect(ox+hx-2,oy+hy+2,1,2); // ear tip
    ctx.fillStyle=sk.skin;ctx.fillRect(ox+hx+hw,oy+hy+3,3,6);
    ctx.fillStyle=sk.sk2; ctx.fillRect(ox+hx+hw+1,oy+hy+2,1,2);
    // elven hair: long flowing locks below helmet
    ctx.fillStyle=hairSh;ctx.fillRect(ox+hx-1,  oy+hy+hh,4,10);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,    oy+hy+hh+1,3,8);
    ctx.fillStyle=hairSh;ctx.fillRect(ox+hx+hw-3,oy+hy+hh,4,10);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx+hw-3,oy+hy+hh+1,3,8);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx+1,  oy+hy+hh,hw-2,5);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,    oy+hy,hw,3); // top fringe
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+1,  oy+hy,hw-2,1);
  } else if(sp==='dwarf'){
    // bushy beard below helmet
    ctx.fillStyle=hairSh;ctx.fillRect(ox+hx,  oy+hy+hh,  hw,  8);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx+1,oy+hy+hh+1,hw-2,6);
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+2,oy+hy+hh+1,5,   2);
    // hair tuft at top
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,  oy+hy,     hw,  3);
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+1,oy+hy,     hw-2,1);
  } else if(sp==='goblin'){
    // big round ears with inner detail
    ctx.fillStyle=sk.sk2; ctx.fillRect(ox+hx-5,oy+hy+2,5,8);
    ctx.fillStyle=sk.skin;ctx.fillRect(ox+hx-4,oy+hy+3,3,6);
    ctx.fillStyle=sk.sk2; ctx.fillRect(ox+hx+hw,oy+hy+2,5,8);
    ctx.fillStyle=sk.skin;ctx.fillRect(ox+hx+hw+1,oy+hy+3,3,6);
    // goblin mohawk on helmet top
    ctx.fillStyle=hair;  ctx.fillRect(ox+cx2-2,oy+hy-4,4,5);
    ctx.fillStyle=hairHL;ctx.fillRect(ox+cx2-1,oy+hy-4,2,2);
  } else if(sp==='orc'){
    // tusks below visor
    ctx.fillStyle='#EEE0A0';
    ctx.fillRect(ox+vx+1,     oy+vy+vh, 3,6);
    ctx.fillRect(ox+vx+vw-4,  oy+vy+vh, 3,6);
    ctx.fillStyle='#C8C090';
    ctx.fillRect(ox+vx+1,     oy+vy+vh+4,2,2);
    ctx.fillRect(ox+vx+vw-3,  oy+vy+vh+4,2,2);
    // heavy armor brow ridge over visor
    ctx.fillStyle=aSh; ctx.fillRect(ox+hx,oy+vy-2,hw,3);
    ctx.fillStyle=aOut;ctx.fillRect(ox+hx,oy+vy-2,hw,1);
  } else if(sp==='robot'){
    // antenna
    ctx.fillStyle='#808080';ctx.fillRect(ox+cx2-1,oy+hy-6,2,6);
    ctx.fillStyle='#FF2020';ctx.fillRect(ox+cx2-2,oy+hy-9,4,4);
    ctx.fillStyle='#FF9090';ctx.fillRect(ox+cx2-1,oy+hy-8,2,2);
    // ear vents instead of round ears
    ctx.fillStyle='#404040';ctx.fillRect(ox+hx-2,oy+hy+3,2,hh-4);
    ctx.fillStyle='#404040';ctx.fillRect(ox+hx+hw,oy+hy+3,2,hh-4);
    ctx.fillStyle='#606060';ctx.fillRect(ox+hx-2,oy+hy+3,1,2);
    ctx.fillStyle='#606060';ctx.fillRect(ox+hx+hw,oy+hy+3,1,2);
  } else {
    // human / mage / rogue etc — hair at helmet top + flowing from under helmet sides/back
    // top fringe (peeking above visor)
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,  oy+hy,hw,3);
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+1,oy+hy,hw-2,1);
    // hair flowing out below helmet on the sides and back
    const hBot=hy+hh; // y of helmet bottom
    ctx.fillStyle=hairSh;ctx.fillRect(ox+hx-1,  oy+hBot,  4, 7); // left side
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,    oy+hBot+1,3, 5);
    ctx.fillStyle=hairSh;ctx.fillRect(ox+hx+hw-3,oy+hBot, 4, 7); // right side
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx+hw-3,oy+hBot+1,3,5);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx+1,  oy+hBot,  hw-2,4); // back centre
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+2,  oy+hBot,  4,   2); // highlight
  }

  // ─ Hat (wizard hat — above helmet) ─
  if(accessory==='hat'){
    const hatCol='#2A0A4A',hatHi='#4A1A7A',hatBrim='#3A1060';
    // brim
    ctx.fillStyle=darken(hatCol,20);ctx.fillRect(ox+hx-5,oy+hy-1,hw+10,4);
    ctx.fillStyle=hatBrim;ctx.fillRect(ox+hx-4,oy+hy,hw+8,3);
    ctx.fillStyle=hatHi;ctx.fillRect(ox+hx-4,oy+hy,hw+8,1);
    // cone
    const htop=hy-16;
    ctx.fillStyle=darken(hatCol,20);
    ctx.beginPath();ctx.moveTo(ox+cx2-1,oy+htop-1);ctx.lineTo(ox+hx-3,oy+hy);ctx.lineTo(ox+hx+hw+3,oy+hy);ctx.fill();
    ctx.fillStyle=hatCol;
    ctx.beginPath();ctx.moveTo(ox+cx2,oy+htop);ctx.lineTo(ox+hx-2,oy+hy);ctx.lineTo(ox+hx+hw+2,oy+hy);ctx.fill();
    ctx.fillStyle=hatHi;
    ctx.beginPath();ctx.moveTo(ox+cx2,oy+htop);ctx.lineTo(ox+cx2-1,oy+htop+4);ctx.lineTo(ox+hx+2,oy+hy);ctx.lineTo(ox+hx+4,oy+hy);ctx.fill();
    // star on hat
    ctx.fillStyle='#FFD700';ctx.fillRect(ox+cx2-1,oy+htop+5,2,2);
  }

  // ─ Glasses (over visor) ─
  if(accessory==='glasses'){
    const gf='#C0A000',gl='rgba(100,200,255,0.35)';
    const vx2=hx+2,vy2=hy+5,vw2=hw-4; // match visor dims
    const lensW=Math.floor(vw2/2)-1, lensH=3;
    // left lens frame + tint
    ctx.fillStyle=gf;ctx.fillRect(ox+vx2,oy+vy2-1,lensW,lensH+2);
    ctx.fillStyle=gl;ctx.fillRect(ox+vx2+1,oy+vy2,lensW-2,lensH);
    ctx.fillStyle='#80CFFF';ctx.fillRect(ox+vx2+1,oy+vy2,lensW-2,1);
    // right lens frame + tint
    ctx.fillStyle=gf;ctx.fillRect(ox+vx2+lensW+2,oy+vy2-1,lensW,lensH+2);
    ctx.fillStyle=gl;ctx.fillRect(ox+vx2+lensW+3,oy+vy2,lensW-2,lensH);
    ctx.fillStyle='#80CFFF';ctx.fillRect(ox+vx2+lensW+3,oy+vy2,lensW-2,1);
    // bridge
    ctx.fillStyle=gf;ctx.fillRect(ox+vx2+lensW,oy+vy2+1,2,1);
  }

  // ─ God mode halo ─
  if(godMode){
    ctx.strokeStyle='#FFD700';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(ox+cx2,oy+hy-3,11,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#FFD70055';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(ox+cx2,oy+hy-3,14,0,Math.PI*2);ctx.stroke();
  }
  ctx.restore(); // end upper-body bob translate
}

// ── NPC SPRITE ────────────────────────────────────────────────────────────────
// face: 0=up 1=right 2=down 3=left (affects eye/hair rendering for portrait clarity)
function drawNPCSprite(ctx,ox,oy,type,face=2){
  // type: 'clerk'|'barkeep'|'guard'|'merchant'
  const palettes={
    clerk:  {body:'#1A3A5E',hi:'#2A5A8E',skin:'#FFCC99',hair:'#222'},
    barkeep:{body:'#5E3A1A',hi:'#8E5A2A',skin:'#DDA070',hair:'#3A1A00'},
    guard:  {body:'#2A4A2A',hi:'#3A6A3A',skin:'#FFCC99',hair:'#1A1A1A'},
    merchant:{body:'#4A2A6A',hi:'#6A4A9A',skin:'#E8AA77',hair:'#8B4513'},
  };
  const p=palettes[type]||palettes.clerk;
  const px=ox,py=oy;
  // shadow
  ctx.fillStyle='#00000033';ctx.fillRect(px+4,py+38,16,3);
  // legs
  ctx.fillStyle=darken(p.body,20);ctx.fillRect(px+6,py+28,5,12);ctx.fillRect(px+13,py+28,5,12);
  ctx.fillStyle='#1A1A2A';ctx.fillRect(px+5,py+38,6,4);ctx.fillRect(px+13,py+38,6,4);
  // body
  ctx.fillStyle=p.body;ctx.fillRect(px+4,py+12,16,18);
  ctx.fillStyle=p.hi;ctx.fillRect(px+4,py+12,6,18);
  // arms
  ctx.fillStyle=p.body;ctx.fillRect(px+1,py+13,4,12);ctx.fillRect(px+19,py+13,4,12);
  ctx.fillStyle=p.skin;ctx.fillRect(px+1,py+23,4,4);ctx.fillRect(px+19,py+23,4,4);
  // neck + head
  ctx.fillStyle=p.skin;ctx.fillRect(px+10,py+10,4,4);
  ctx.fillStyle=p.skin;ctx.fillRect(px+6,py+0,12,12);
  ctx.fillStyle=lighten(p.skin,20);ctx.fillRect(px+6,py+0,12,4);
  // hair (visible when facing down or sides)
  ctx.fillStyle=p.hair;ctx.fillRect(px+6,py+0,12,3);ctx.fillRect(px+6,py+0,3,6);
  // eyes — only when facing down or sideways
  if(face!==0){
    ctx.fillStyle='#1A1A2A';ctx.fillRect(px+8,py+5,3,2);ctx.fillRect(px+14,py+5,3,2);
    ctx.fillStyle='#FFFFFF';ctx.fillRect(px+8,py+5,1,1);ctx.fillRect(px+14,py+5,1,1);
  }
  // type-specific details
  if(type==='clerk'){// tie
    ctx.fillStyle='#CC2222';ctx.fillRect(px+11,py+14,3,10);ctx.fillRect(px+10,py+21,5,4);
  } else if(type==='guard'){// badge + helmet brim
    ctx.fillStyle='#D4AF37';ctx.fillRect(px+13,py+16,4,4);
    ctx.fillStyle=darken(p.body,40);ctx.fillRect(px+5,py-1,14,4);
  } else if(type==='merchant'){// wide-brim hat
    ctx.fillStyle=p.body;ctx.fillRect(px+5,py-5,14,6);ctx.fillRect(px+3,py+0,18,3);
    ctx.fillStyle=p.hi;ctx.fillRect(px+5,py-5,14,2);
  } else if(type==='barkeep'){// apron
    ctx.fillStyle='#EEE8CC';ctx.fillRect(px+7,py+16,10,14);
    ctx.fillStyle='#CCC4AA';ctx.fillRect(px+7,py+16,10,2);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN WARRIOR SPRITES — fully procedural, drawn from scratch with canvas
//
// Male:   stocky barbarian — wild hair, bare arms, leather chest, gold pauldron,
//         sword at right hip, heavy boots
// Female: slender dark rogue — long flowing hair, charcoal plate, split skirt,
//         longsword, knee-high laced boots
//
// Both support: 6-frame walk cycle, left/right direction flip, skin tone index,
//               hair colour hex, accessories
// ─────────────────────────────────────────────────────────────────────────────

// Shared walk-cycle tables (6 frames)
const _WK_SWING = [0,-3,-5, 0, 3, 5]; // leg/arm Y offset
const _WK_BOB   = [0, 0, 1, 0, 0, 1]; // torso dip on foot-plant

// Derive skin palette from SKIN_TONES[idx].base
function _skinPal(idx){
  const b=(SKIN_TONES[idx]||SKIN_TONES[2]).base;
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const rgb=(r,g,bb)=>`rgb(${r},${g},${bb})`;
  return {
    mid : rgb(b[0],b[1],b[2]),
    hi  : rgb(clamp(b[0]+28,0,255),clamp(b[1]+22,0,255),clamp(b[2]+18,0,255)),
    lo  : rgb(clamp(b[0]-32,0,255),clamp(b[1]-28,0,255),clamp(b[2]-24,0,255)),
    dk  : rgb(clamp(b[0]-55,0,255),clamp(b[1]-50,0,255),clamp(b[2]-44,0,255)),
  };
}

// Derive hair palette from hex string
function _hairPal(hex){
  const hr=parseInt(hex.slice(1,3),16),hg=parseInt(hex.slice(3,5),16),hb=parseInt(hex.slice(5,7),16);
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const rgb=(r,g,b)=>`rgb(${r},${g},${b})`;
  return {
    mid : hex,
    hi  : rgb(clamp(hr+40,0,255),clamp(hg+32,0,255),clamp(hb+24,0,255)),
    lo  : rgb(clamp(hr-28,0,255),clamp(hg-24,0,255),clamp(hb-20,0,255)),
    dk  : rgb(clamp(hr-50,0,255),clamp(hg-44,0,255),clamp(hb-38,0,255)),
  };
}

// ── MALE BARBARIAN WARRIOR ────────────────────────────────────────────────────
// Inspiration: stocky build, wild brown hair with spiky top, gold left pauldron,
// partial leather chest showing V-neck skin, thick leather legs, heavy dark boots,
// sword at right hip, shield-arm muscles visible.
function _drawMaleWarrior(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#100800', LEATH='#7A5028', LEATH2='#4E3010', GOLD='#C8A030',
        GOLHI='#E8C048', BOOT='#1E0C04', BOOTHI='#3C1C08', SIL='#C0C4CC',
        SILHI='#E0E4F0', BELT='#3A2010';

  // ── Shadow ──
  ctx.fillStyle='#00000030';ctx.fillRect(ox+2,oy+43,20,3);

  // ── Sword (right hip, behind body when facing right) ──
  if(dir!==1){
    ctx.fillStyle=OUT;  ctx.fillRect(ox+20,oy+18+bob,3,20);
    ctx.fillStyle=SIL;  ctx.fillRect(ox+21,oy+20+bob,2,18);
    ctx.fillStyle=SILHI;ctx.fillRect(ox+21,oy+20+bob,1,10);
    ctx.fillStyle=GOLD; ctx.fillRect(ox+18,oy+22+bob,7,2); // crossguard
    ctx.fillStyle=GOLHI;ctx.fillRect(ox+18,oy+22+bob,7,1);
    ctx.fillStyle=LEATH;ctx.fillRect(ox+19,oy+18+bob,3,4); // hilt
  }

  // ── Boots ──
  const bY=36;
  [4,13].forEach((bx,i)=>{
    ctx.fillStyle=OUT;  ctx.fillRect(ox+bx-1,oy+bY-1,9,9);
    ctx.fillStyle=BOOT; ctx.fillRect(ox+bx,  oy+bY,  8,8);
    ctx.fillStyle=BOOTHI;ctx.fillRect(ox+bx, oy+bY,  8,2);
    // toe cap
    ctx.fillStyle=BOOTHI;ctx.fillRect(ox+bx+(i?0:0),oy+bY+6,8,1);
  });

  // ── Legs (leather) ──
  const lY=27;
  // left leg (swings forward on walk)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+3, oy+lY+swing-1,9,11);
  ctx.fillStyle=LEATH;ctx.fillRect(ox+4, oy+lY+swing,  8,10);
  ctx.fillStyle=GOLHI;ctx.fillRect(ox+4, oy+lY+swing,  8,2);  // knee pad highlight
  ctx.fillStyle=LEATH2;ctx.fillRect(ox+9,oy+lY+swing,  3,10); // shadow side
  // right leg (swings back)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+12,oy+lY-swing-1,9,11);
  ctx.fillStyle=LEATH;ctx.fillRect(ox+13,oy+lY-swing,  8,10);
  ctx.fillStyle=GOLHI;ctx.fillRect(ox+13,oy+lY-swing,  8,2);
  ctx.fillStyle=LEATH2;ctx.fillRect(ox+18,oy+lY-swing, 3,10);

  // ── Torso (with body bob) ──
  ctx.save();ctx.translate(0,bob);

  // left arm (skin, bare)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+0,oy+14,5,14);
  ctx.fillStyle=sk.lo;ctx.fillRect(ox+1,oy+15,4,13);
  ctx.fillStyle=sk.mid;ctx.fillRect(ox+1,oy+15,3,13);
  ctx.fillStyle=sk.hi;ctx.fillRect(ox+1,oy+15,2,5);

  // right arm (skin, bare)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+19,oy+14,5,14);
  ctx.fillStyle=sk.lo;ctx.fillRect(ox+20,oy+15,4,13);
  ctx.fillStyle=sk.mid;ctx.fillRect(ox+20,oy+15,3,13);
  ctx.fillStyle=sk.hi;ctx.fillRect(ox+20,oy+15,2,5);

  // chest leather base
  ctx.fillStyle=OUT;  ctx.fillRect(ox+4, oy+13,16,15);
  ctx.fillStyle=LEATH;ctx.fillRect(ox+5, oy+14,14,14);
  ctx.fillStyle=LEATH2;ctx.fillRect(ox+16,oy+14, 3,14); // shadow side

  // V-neck skin opening
  ctx.fillStyle=sk.mid;ctx.fillRect(ox+9,oy+14,6,7);
  ctx.fillStyle=sk.lo; ctx.fillRect(ox+12,oy+14,3,7);
  ctx.fillStyle=sk.hi; ctx.fillRect(ox+9,oy+14,3,3);

  // chest cross-strap
  ctx.fillStyle=BELT;ctx.fillRect(ox+5,oy+20,14,2);
  ctx.fillStyle=BELT;
  ctx.fillRect(ox+5,oy+14,2,14);   // left diagonal strap
  ctx.fillRect(ox+17,oy+14,2,14);  // right

  // gold left shoulder pauldron (always left even when flipped — mirrored by ctx.scale)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+0, oy+11,9, 6);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+1, oy+12,8, 5);
  ctx.fillStyle=GOLHI;ctx.fillRect(ox+1, oy+12,8, 2);
  ctx.fillStyle=LEATH;ctx.fillRect(ox+1, oy+16,8, 1); // lower trim

  // sword hilt (left-facing: show sword on other side)
  if(dir===1){
    ctx.fillStyle=OUT;  ctx.fillRect(ox-1,oy+18,3,20);
    ctx.fillStyle=SIL;  ctx.fillRect(ox+0, oy+20,2,18);
    ctx.fillStyle=SILHI;ctx.fillRect(ox+0, oy+20,1,10);
    ctx.fillStyle=GOLD; ctx.fillRect(ox-3,oy+22,7,2);
    ctx.fillStyle=GOLHI;ctx.fillRect(ox-3,oy+22,7,1);
    ctx.fillStyle=LEATH;ctx.fillRect(ox+0, oy+18,2,4);
  }

  ctx.restore(); // end bob

  // ── Head ──
  // Hair back layer (wider than head, wild)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+2, oy-3,20,15);
  ctx.fillStyle=hr.lo;ctx.fillRect(ox+3, oy-2,18,13);
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+4,oy-1,16,11);
  ctx.fillStyle=hr.hi;ctx.fillRect(ox+4,oy-1,12, 4);
  ctx.fillStyle=hr.dk;ctx.fillRect(ox+17,oy-2, 4,13); // shadow side

  // Hair top spikes
  ctx.fillStyle=hr.mid;
  ctx.fillRect(ox+5, oy-5,3,5);
  ctx.fillRect(ox+9, oy-6,4,6);
  ctx.fillRect(ox+14,oy-5,3,5);
  ctx.fillRect(ox+18,oy-4,3,4);
  ctx.fillStyle=hr.hi;
  ctx.fillRect(ox+9,oy-6,2,3);
  ctx.fillRect(ox+5,oy-5,1,2);

  // Face
  ctx.fillStyle=OUT;  ctx.fillRect(ox+5, oy+2,14,12);
  ctx.fillStyle=sk.mid;ctx.fillRect(ox+6,oy+3,12,11);
  ctx.fillStyle=sk.hi;ctx.fillRect(ox+6, oy+3,10, 4);
  ctx.fillStyle=sk.lo;ctx.fillRect(ox+6, oy+11,12, 3);
  ctx.fillStyle=sk.dk;ctx.fillRect(ox+6, oy+12,12, 2); // chin shadow

  // Brow ridge
  ctx.fillStyle=sk.lo;ctx.fillRect(ox+6,oy+5,12,1);

  // Eyes
  ctx.fillStyle=OUT; ctx.fillRect(ox+7, oy+6,3,2);ctx.fillRect(ox+14,oy+6,3,2);
  ctx.fillStyle='#4A2A0A';ctx.fillRect(ox+8,oy+6,2,2);ctx.fillRect(ox+15,oy+6,2,2);
  ctx.fillStyle='#FFF';ctx.fillRect(ox+8,oy+6,1,1);ctx.fillRect(ox+15,oy+6,1,1);

  // Nose
  ctx.fillStyle=sk.lo;ctx.fillRect(ox+11,oy+9,2,2);

  // Hair framing face (side locks)
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+4, oy+3,2,9);  // left lock
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+18,oy+3,2,9);  // right lock
  ctx.fillStyle=hr.lo;ctx.fillRect(ox+4,oy+9,2,3);
  ctx.fillStyle=hr.lo;ctx.fillRect(ox+18,oy+9,2,3);
}

// ── FEMALE DARK ROGUE WARRIOR ─────────────────────────────────────────────────
// Inspiration: slender build, long flowing auburn hair (the signature feature),
// dark charcoal plate armour, split skirt, knee-high laced boots, longsword.
function _drawFemaleWarrior(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#0C0814', PLATE='#28263A', PLATE2='#1A182A', PLHI='#3E3C54',
        PLAC='#5A4880', BOOT='#160E20', BOOTHI='#2C1E38', BOOTLC='#3A2A4A',
        SIL='#C0C4CC', SILHI='#E0E4F0', BELT='#3A2848';

  // ── Shadow ──
  ctx.fillStyle='#00000028';ctx.fillRect(ox+4,oy+43,16,3);

  // ── Sword (right hip) ──
  if(dir!==1){
    ctx.fillStyle=OUT;  ctx.fillRect(ox+19,oy+16+bob,3,22);
    ctx.fillStyle=SIL;  ctx.fillRect(ox+20,oy+18+bob,2,20);
    ctx.fillStyle=SILHI;ctx.fillRect(ox+20,oy+18+bob,1,12);
    ctx.fillStyle=PLAC; ctx.fillRect(ox+17,oy+20+bob,7,2); // crossguard
    ctx.fillStyle=PLHI; ctx.fillRect(ox+17,oy+20+bob,7,1);
    ctx.fillStyle=PLATE;ctx.fillRect(ox+18,oy+16+bob,3,4); // hilt wrap
  }

  // ── Knee-high boots (tall, laced) ──
  // Boots start higher than male (y=30) for knee-high look
  [5,14].forEach((bx,i)=>{
    ctx.fillStyle=OUT;  ctx.fillRect(ox+bx-1,oy+28,7,16);
    ctx.fillStyle=BOOT; ctx.fillRect(ox+bx,  oy+29,6,15);
    ctx.fillStyle=BOOTHI;ctx.fillRect(ox+bx, oy+29,6,3);
    // lacing detail
    ctx.fillStyle=BOOTLC;
    ctx.fillRect(ox+bx+2,oy+32,2,1);
    ctx.fillRect(ox+bx+2,oy+35,2,1);
    ctx.fillRect(ox+bx+2,oy+38,2,1);
    ctx.fillRect(ox+bx+2,oy+41,2,1);
  });

  // ── Legs / dark leggings (above boots, under skirt) ──
  const lY=24;
  ctx.fillStyle=OUT;  ctx.fillRect(ox+4, oy+lY+swing-1,7,7);
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+5,oy+lY+swing,  6,6);
  ctx.fillStyle=OUT;  ctx.fillRect(ox+13,oy+lY-swing-1,7,7);
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+14,oy+lY-swing, 6,6);

  // ── Torso bob ──
  ctx.save();ctx.translate(0,bob);

  // Flowing hair behind body (left side)
  ctx.fillStyle=hr.lo; ctx.fillRect(ox+1, oy+14,4,18);
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+2, oy+14,3,16);
  ctx.fillStyle=hr.dk; ctx.fillRect(ox+1, oy+26,4,6);

  // Slim dark arms with plate gauntlets
  // left arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+2, oy+14,4,14);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+3, oy+15,3,10);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+3, oy+15,3,3);
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+4, oy+23,3,4); // gauntlet cuff
  // right arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+18,oy+14,4,14);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+19,oy+15,3,10);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+19,oy+15,3,3);
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+18,oy+23,3,4);

  // Armoured split skirt
  ctx.fillStyle=OUT;   ctx.fillRect(ox+4, oy+22,16,10);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+5, oy+23,14,9);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+5, oy+23,14,2);
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+5, oy+29,14,3); // lower shadow
  // centre split
  ctx.fillStyle=OUT;   ctx.fillRect(ox+11,oy+24,2,8);
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+11,oy+25,2,6);

  // Chest plate
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+13,14,12);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+6, oy+14,12,11);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+6, oy+14,12,3);
  ctx.fillStyle=PLAC;  ctx.fillRect(ox+6, oy+14,12,1); // accent stripe
  ctx.fillStyle=PLATE2;ctx.fillRect(ox+15,oy+14,3,11); // shadow side

  // Collar / gorget
  ctx.fillStyle=OUT;   ctx.fillRect(ox+7, oy+11,10,4);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+8, oy+12,8, 3);
  ctx.fillStyle=PLAC;  ctx.fillRect(ox+8, oy+12,8, 1);

  // Shoulder pauldrons (smaller than male)
  [4,16].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px-1,oy+12,6,5);
    ctx.fillStyle=PLATE; ctx.fillRect(ox+px,  oy+13,5,4);
    ctx.fillStyle=PLHI;  ctx.fillRect(ox+px,  oy+13,5,2);
  });

  // Sword (left-facing: opposite side)
  if(dir===1){
    ctx.fillStyle=OUT;  ctx.fillRect(ox+2, oy+16+bob,3,22);
    ctx.fillStyle=SIL;  ctx.fillRect(ox+3, oy+18+bob,2,20);
    ctx.fillStyle=SILHI;ctx.fillRect(ox+3, oy+18+bob,1,12);
    ctx.fillStyle=PLAC; ctx.fillRect(ox+0, oy+20+bob,7,2);
    ctx.fillStyle=PLHI; ctx.fillRect(ox+0, oy+20+bob,7,1);
    ctx.fillStyle=PLATE;ctx.fillRect(ox+3, oy+16+bob,3,4);
  }

  ctx.restore(); // end bob

  // ── Head ──
  // Long flowing hair — cascades past shoulders, extends to y≈30
  // Back layer (widest)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+2, oy-1,20,34);
  ctx.fillStyle=hr.dk;ctx.fillRect(ox+3, oy+0, 18,32);
  // Main hair body
  ctx.fillStyle=hr.lo;ctx.fillRect(ox+4, oy+0, 16,28);
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+5,oy+0, 14,22);
  // Highlights on top and left flow
  ctx.fillStyle=hr.hi;ctx.fillRect(ox+6, oy+0, 10,5);
  ctx.fillStyle=hr.hi;ctx.fillRect(ox+5, oy+5, 3, 8);
  // Inner shadow (away from light)
  ctx.fillStyle=hr.dk;ctx.fillRect(ox+16,oy+0, 3,22);
  ctx.fillStyle=hr.dk;ctx.fillRect(ox+4, oy+24,16,6);

  // Face (narrower and taller than male)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+7, oy+2,10,11);
  ctx.fillStyle=sk.mid;ctx.fillRect(ox+8, oy+3,8, 10);
  ctx.fillStyle=sk.hi; ctx.fillRect(ox+8, oy+3,7, 3);
  ctx.fillStyle=sk.lo; ctx.fillRect(ox+8, oy+10,8, 3);
  ctx.fillStyle=sk.dk; ctx.fillRect(ox+8, oy+12,8, 1); // chin shadow

  // Eyes (slightly larger, more prominent)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+8, oy+5,3,3);ctx.fillRect(ox+13,oy+5,3,3);
  ctx.fillStyle='#3A2060';ctx.fillRect(ox+9,oy+5,2,2);ctx.fillRect(ox+14,oy+5,2,2);
  ctx.fillStyle='#6A40A0';ctx.fillRect(ox+9,oy+5,1,1);ctx.fillRect(ox+14,oy+5,1,1);
  ctx.fillStyle='#FFF';ctx.fillRect(ox+9,oy+5,1,1);ctx.fillRect(ox+14,oy+5,1,1);

  // Nose (delicate)
  ctx.fillStyle=sk.lo;ctx.fillRect(ox+11,oy+8,2,1);

  // Lips
  ctx.fillStyle='#C06070';ctx.fillRect(ox+9,oy+10,6,2);
  ctx.fillStyle='#E08090';ctx.fillRect(ox+9,oy+10,6,1);

  // Hair over forehead (bangs)
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+7,oy+2,2,3);   // left bang
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+15,oy+2,2,3);  // right bang
  ctx.fillStyle=hr.hi; ctx.fillRect(ox+7,oy+2,2,1);
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+10,oy+1,4,3);  // centre fringe
  ctx.fillStyle=hr.hi; ctx.fillRect(ox+10,oy+1,4,1);
}

// ── Dispatcher: pick male or female, handle direction flip ────────────────────
function drawHumanWarriorSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f    = moving ? (Math.floor(frame/4)%6) : 0;
  const swing= moving ? _WK_SWING[f] : 0;
  const bob  = moving ? _WK_BOB[f]   : 0;
  const sk   = _skinPal(skinToneIdx??2);
  const hr   = _hairPal(hairHex||HAIR_COLORS[1]);

  if(dir===1){ // facing left → mirror entire sprite
    ctx.save();
    ctx.translate(ox+24,oy);
    ctx.scale(-1,1);
    const fn = (gender==='female') ? _drawFemaleWarrior : _drawMaleWarrior;
    fn(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    const fn = (gender==='female') ? _drawFemaleWarrior : _drawMaleWarrior;
    fn(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HUMAN MAGE SPRITES — fully procedural canvas drawing
// ─────────────────────────────────────────────────────────────────────────────
// Male:   stocky sage — deep teal robe+hood, large orange pauldrons, white
//         beard, red forehead gem, gold rune buckle, orange cape, arcane artifact
// Female: elegant spellcaster — pointed purple hat, long flowing hair, wide
//         purple cape, warm rose inner robe, wooden staff with cross topper
//
// Both share the same walk tables, skin palette, and hair palette as warriors.
// ─────────────────────────────────────────────────────────────────────────────

// ── MALE MAGE ────────────────────────────────────────────────────────────────
// Inspiration: elderly stocky mage, teal/cyan robe, huge orange pauldrons,
// silver beard, red third-eye gem, gold rune belt, artifact held in right hand.
function _drawMaleMage(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#080818';
  const TEAL='#1E7272',TEAHI='#2E9898',TEASH='#124646',TEADK='#0A2E2E',TEALI='#36A8A8';
  const CAPE='#A83C10',CAPEHI='#C85020',CAPESH='#6E2408';
  const PAUL='#C04818',PAULHI='#DC6828',PAULSH='#7C2E10';
  const GOLD='#C4A028',GOLHI='#E0BC40',GOLSH='#8A7018';
  const BEARD='#DCDCDC',BEAHI='#F4F4F4',BEASH='#ABABAB',BEADK='#707070';
  const GEM='#EE1010',GEMHI='#FF7060';
  const BOOT='#4A2808',BOOTHI='#6A3C14';
  const ART='#8040C8',ARTHI='#A868E8';

  // ── Shadow ──
  ctx.fillStyle='#00000028';
  ctx.fillRect(ox+2,oy+42,22,3);

  // ── Cape (orange-rust, visible on both sides behind body) ──
  ctx.fillStyle=CAPESH; ctx.fillRect(ox-3,oy+1,5,38);
  ctx.fillStyle=CAPE;   ctx.fillRect(ox-2,oy+1,4,36);
  ctx.fillStyle=CAPEHI; ctx.fillRect(ox-2,oy+3,2,20);
  ctx.fillStyle=CAPESH; ctx.fillRect(ox+22,oy+1,5,38);
  ctx.fillStyle=CAPE;   ctx.fillRect(ox+22,oy+1,4,36);
  ctx.fillStyle=CAPEHI; ctx.fillRect(ox+24,oy+3,1,20);

  // ── Boots (just toe tips below robe) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3,oy+38,8,5);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+4,oy+39,7,4);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+4,oy+39,6,1);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+13,oy+38,8,5);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+14,oy+39,7,4);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+14,oy+39,6,1);

  // ── Robe lower (teal, A-line flare toward hem) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+1,oy+25,22,14);
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+2,oy+26,20,13);
  ctx.fillStyle=TEAL;   ctx.fillRect(ox+3,oy+26,16,13);
  ctx.fillStyle=TEALI;  ctx.fillRect(ox+3,oy+26,9,5);
  ctx.fillStyle=TEADK;  ctx.fillRect(ox+18,oy+26,4,13);

  // ── Belt (gold, ornate) + rune buckle ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+24,16,3);
  ctx.fillStyle=GOLD;   ctx.fillRect(ox+5,oy+25,14,2);
  ctx.fillStyle=GOLHI;  ctx.fillRect(ox+5,oy+25,14,1);
  // Buckle plate
  ctx.fillStyle=GOLSH;  ctx.fillRect(ox+9,oy+23,6,5);
  ctx.fillStyle=GOLD;   ctx.fillRect(ox+10,oy+24,4,3);
  ctx.fillStyle=GOLHI;  ctx.fillRect(ox+10,oy+24,3,1);
  // Rune symbol (arrow / sigil)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+11,oy+24,2,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+10,oy+25,4,1);

  // ── Torso group (bob animation) ──
  ctx.save();
  ctx.translate(0,bob);

  // Left sleeve (wide teal)
  ctx.fillStyle=OUT;    ctx.fillRect(ox-1,oy+13,7,13);
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+0,oy+14,6,12);
  ctx.fillStyle=TEAL;   ctx.fillRect(ox+1,oy+14,5,11);
  ctx.fillStyle=TEALI;  ctx.fillRect(ox+1,oy+14,3,5);
  ctx.fillStyle=TEADK;  ctx.fillRect(ox+4,oy+20,2,5);

  // Right sleeve (artifact hand)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+18,oy+13,7,13);
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+18,oy+14,6,12);
  ctx.fillStyle=TEAL;   ctx.fillRect(ox+19,oy+14,5,11);
  ctx.fillStyle=TEALI;  ctx.fillRect(ox+21,oy+14,3,5);
  ctx.fillStyle=TEADK;  ctx.fillRect(ox+20,oy+20,3,5);

  // Chest robe body
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+13,16,13);
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+5,oy+14,14,12);
  ctx.fillStyle=TEAL;   ctx.fillRect(ox+6,oy+14,11,12);
  ctx.fillStyle=TEALI;  ctx.fillRect(ox+6,oy+14,8,5);
  ctx.fillStyle=TEADK;  ctx.fillRect(ox+16,oy+14,3,12);

  // Left pauldron (large, round, orange)
  ctx.fillStyle=OUT;    ctx.fillRect(ox-2,oy+10,12,9);
  ctx.fillStyle=PAULSH; ctx.fillRect(ox-1,oy+11,11,8);
  ctx.fillStyle=PAUL;   ctx.fillRect(ox+0,oy+12,10,7);
  ctx.fillStyle=PAULHI; ctx.fillRect(ox+0,oy+12,8,3);
  ctx.fillStyle=PAULSH; ctx.fillRect(ox+7,oy+16,3,3);

  // Right pauldron
  ctx.fillStyle=OUT;    ctx.fillRect(ox+14,oy+10,12,9);
  ctx.fillStyle=PAULSH; ctx.fillRect(ox+14,oy+11,11,8);
  ctx.fillStyle=PAUL;   ctx.fillRect(ox+14,oy+12,10,7);
  ctx.fillStyle=PAULHI; ctx.fillRect(ox+14,oy+12,8,3);
  ctx.fillStyle=PAULSH; ctx.fillRect(ox+14,oy+16,3,3);

  // Glowing arcane artifact (right hand)
  ctx.fillStyle='rgba(128,64,200,0.22)';
  ctx.fillRect(ox+22,oy+19,10,10);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+24,oy+21,7,7);
  ctx.fillStyle='#5A30A0';ctx.fillRect(ox+25,oy+22,6,6);
  ctx.fillStyle=ART;    ctx.fillRect(ox+25,oy+22,5,5);
  ctx.fillStyle=ARTHI;  ctx.fillRect(ox+25,oy+22,4,3);
  ctx.fillStyle=ART;    ctx.fillRect(ox+27,oy+25,2,2);
  ctx.fillStyle=ARTHI;  ctx.fillRect(ox+27,oy+25,1,1);

  ctx.restore(); // end bob

  // ── Hood (large, deep teal, drooping forward) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+1,oy-5,22,20);
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+2,oy-4,20,19);
  ctx.fillStyle=TEAL;   ctx.fillRect(ox+3,oy-4,17,18);
  ctx.fillStyle=TEALI;  ctx.fillRect(ox+3,oy-4,12,4); // top highlight
  // Hood droop (inner shadow)
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+6,oy+1,12,11);
  ctx.fillStyle=TEADK;  ctx.fillRect(ox+8,oy+2,8,10);
  // Side flaps
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+2,oy+5,3,8);
  ctx.fillStyle=TEASH;  ctx.fillRect(ox+19,oy+5,3,8);

  // ── Face (partially visible below hood) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6,oy+3,12,12);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+7,oy+4,10,11);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+7,oy+4,8,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+7,oy+11,10,4);
  ctx.fillStyle=sk.dk;  ctx.fillRect(ox+7,oy+13,10,2);

  // Eyes (dark-rimmed, reddish — wise/ancient look)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+7,oy+6,3,2); ctx.fillRect(ox+14,oy+6,3,2);
  ctx.fillStyle='#501010'; ctx.fillRect(ox+8,oy+6,2,2); ctx.fillRect(ox+15,oy+6,2,2);
  ctx.fillStyle='#C04040'; ctx.fillRect(ox+8,oy+6,1,1); ctx.fillRect(ox+15,oy+6,1,1);

  // Nose (aged, prominent)
  ctx.fillStyle=sk.lo; ctx.fillRect(ox+11,oy+8,2,3);
  ctx.fillStyle=sk.dk; ctx.fillRect(ox+12,oy+9,2,2);

  // ── Forehead gem (red arcane mark, peeking at hood edge) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+10,oy+3,5,4);
  ctx.fillStyle=GEM;    ctx.fillRect(ox+11,oy+4,3,2);
  ctx.fillStyle=GEMHI;  ctx.fillRect(ox+11,oy+4,2,1);

  // ── Beard (silver-white, wide, hangs over chest) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5,oy+12,14,17);
  ctx.fillStyle=BEADK;  ctx.fillRect(ox+6,oy+13,12,16);
  ctx.fillStyle=BEASH;  ctx.fillRect(ox+7,oy+13,10,15);
  ctx.fillStyle=BEARD;  ctx.fillRect(ox+8,oy+13,8,14);
  ctx.fillStyle=BEAHI;  ctx.fillRect(ox+9,oy+13,5,8);
  // Strand detail lines
  ctx.fillStyle=BEASH;  ctx.fillRect(ox+8,oy+16,8,1);
  ctx.fillStyle=BEASH;  ctx.fillRect(ox+9,oy+19,6,1);
  ctx.fillStyle=BEASH;  ctx.fillRect(ox+8,oy+22,8,1);
  ctx.fillStyle=BEADK;  ctx.fillRect(ox+8,oy+25,8,1);
}

// ── FEMALE MAGE ───────────────────────────────────────────────────────────────
// Inspiration: tall elegant spellcaster, pointed dusty-purple hat, long flowing
// hair (from hr param), large dramatic purple cape, warm rose inner robe,
// tall wooden staff with cross topper, dark burgundy boots.
function _drawFemaleMage(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#080C18';
  const PURP='#44287A',PURPHI='#6644A8',PURPSH='#2A1850',PURPDK='#160E30';
  const CAPE='#38206A',CAPEHI='#502E90',CAPESH='#1E1040';
  const HAT='#5A4088',HATHI='#7A58B0',HATSH='#3A286A';
  const ROSE='#AA6848',ROSEHI='#C87A58',ROSESH='#784830';
  const STAFF='#7A4820',STAFFHI='#A06030',STAFFSH='#4A2C10';
  const STAFFCAP='#C09040',STAFFCAP2='#E0C060';
  const BOOT='#5A2424',BOOTHI='#7A3434';
  const BELT='#8A6820',BELTHI='#B08C30';

  // ── Shadow ──
  ctx.fillStyle='#00000025';
  ctx.fillRect(ox+4,oy+42,16,3);

  // ── Staff (wooden, tall — always right-side in local coords; flip handles left-facing) ──
  // Shaft (behind body)
  ctx.fillStyle=OUT;      ctx.fillRect(ox+21,oy-12,4,56);
  ctx.fillStyle=STAFFSH;  ctx.fillRect(ox+22,oy-11,3,54);
  ctx.fillStyle=STAFF;    ctx.fillRect(ox+22,oy-11,2,54);
  ctx.fillStyle=STAFFHI;  ctx.fillRect(ox+22,oy-8,1,44);
  // Topper (cross / fleur-de-lis shape)
  ctx.fillStyle=OUT;      ctx.fillRect(ox+19,oy-14,8,5);
  ctx.fillStyle=STAFFCAP; ctx.fillRect(ox+20,oy-13,6,4);
  ctx.fillStyle=STAFFCAP2;ctx.fillRect(ox+20,oy-13,5,2);
  // Cross arm
  ctx.fillStyle=OUT;      ctx.fillRect(ox+18,oy-11,10,3);
  ctx.fillStyle=STAFFCAP; ctx.fillRect(ox+19,oy-10,8,2);
  ctx.fillStyle=STAFFCAP2;ctx.fillRect(ox+19,oy-10,6,1);

  // ── Cape (large, wide, deep purple — dominant silhouette element) ──
  // Left wing
  ctx.fillStyle=CAPESH; ctx.fillRect(ox-5,oy+8,8,34);
  ctx.fillStyle=CAPE;   ctx.fillRect(ox-4,oy+8,7,32);
  ctx.fillStyle=CAPEHI; ctx.fillRect(ox-4,oy+10,4,22);
  // Right wing
  ctx.fillStyle=CAPESH; ctx.fillRect(ox+21,oy+8,8,34);
  ctx.fillStyle=CAPE;   ctx.fillRect(ox+21,oy+8,7,32);
  ctx.fillStyle=CAPEHI; ctx.fillRect(ox+25,oy+10,1,22);
  // Cape center back
  ctx.fillStyle=PURPSH; ctx.fillRect(ox+1,oy+10,22,30);
  ctx.fillStyle=PURP;   ctx.fillRect(ox+2,oy+10,20,29);

  // ── Boots (dark burgundy, barely visible at hem) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+38,7,5);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+5,oy+39,6,4);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+5,oy+39,5,1);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+13,oy+38,7,5);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+14,oy+39,6,4);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+14,oy+39,5,1);

  // ── Inner robe (rose/salmon, visible in torso centre) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+24,16,14);
  ctx.fillStyle=ROSESH; ctx.fillRect(ox+5,oy+25,14,13);
  ctx.fillStyle=ROSE;   ctx.fillRect(ox+6,oy+25,11,13);
  ctx.fillStyle=ROSEHI; ctx.fillRect(ox+6,oy+25,7,5);
  // Diamond pattern on skirt
  ctx.fillStyle=ROSESH;
  [[7,29],[11,31],[15,29],[9,33],[13,33]].forEach(([rx,ry])=>ctx.fillRect(ox+rx,oy+ry,2,2));

  // ── Torso group (bob animation) ──
  ctx.save();
  ctx.translate(0,bob);

  // Long hair behind back (blue, parametric)
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+2,oy+14,4,18);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+3,oy+14,3,16);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+17,oy+14,3,18);

  // Left arm (slender, purple sleeve)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3,oy+14,4,14);
  ctx.fillStyle=PURPSH; ctx.fillRect(ox+4,oy+15,3,13);
  ctx.fillStyle=PURP;   ctx.fillRect(ox+4,oy+15,2,12);
  ctx.fillStyle=PURPHI; ctx.fillRect(ox+4,oy+15,2,4);

  // Right arm (gesturing / spellcasting)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+17,oy+14,4,11);
  ctx.fillStyle=PURPSH; ctx.fillRect(ox+17,oy+15,3,10);
  ctx.fillStyle=PURP;   ctx.fillRect(ox+18,oy+15,2,9);
  ctx.fillStyle=PURPHI; ctx.fillRect(ox+18,oy+15,2,4);
  // Open hand (skin, extended forward)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+16,oy+23,6,5);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+17,oy+24,5,4);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+17,oy+24,4,2);

  // Chest / torso (cape interior visible)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5,oy+13,14,12);
  ctx.fillStyle=PURPSH; ctx.fillRect(ox+6,oy+14,12,11);
  ctx.fillStyle=PURP;   ctx.fillRect(ox+7,oy+14,9,11);
  ctx.fillStyle=PURPHI; ctx.fillRect(ox+7,oy+14,6,4);
  ctx.fillStyle=PURPDK; ctx.fillRect(ox+15,oy+14,3,11);

  // Collar clasp (gold detail)
  ctx.fillStyle=OUT;     ctx.fillRect(ox+8,oy+11,8,5);
  ctx.fillStyle=PURPHI;  ctx.fillRect(ox+9,oy+12,6,4);
  ctx.fillStyle='#B09040';ctx.fillRect(ox+10,oy+12,4,3);
  ctx.fillStyle='#D8B050';ctx.fillRect(ox+11,oy+12,2,2);

  // Waist belt / chain ornament
  ctx.fillStyle=PURPDK;  ctx.fillRect(ox+5,oy+23,14,3);
  ctx.fillStyle=BELT;    ctx.fillRect(ox+6,oy+24,12,2);
  ctx.fillStyle=BELTHI;  ctx.fillRect(ox+6,oy+24,12,1);
  // Hanging chain links
  for(let i=0;i<5;i++){
    ctx.fillStyle=OUT;   ctx.fillRect(ox+7+i*2,oy+26,2,3);
    ctx.fillStyle=BELT;  ctx.fillRect(ox+7+i*2,oy+27,1,2);
  }

  ctx.restore(); // end bob

  // ── Head: hair back layer (long, flowing, parametric colour) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3,oy+0,18,26);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+4,oy+1,16,24);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5,oy+1,14,22);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+6,oy+1,11,18);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+7,oy+1,8,6);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+15,oy+1,4,22); // shadow side

  // ── Pointed mage hat (dusty purple, tall cone + wide brim) ──
  // Cone sections (pixel-step taper from 1px tip to full brim width)
  const hatData=[
    [oy-12,11,2],[oy-10,10,4],[oy-8,9,6],[oy-6,8,8],[oy-4,7,10],[oy-2,6,12],
  ];
  hatData.forEach(([hy,hx,hw])=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+hx-1,hy,hw+2,2);
    ctx.fillStyle=HAT;   ctx.fillRect(ox+hx,  hy,hw,  2);
  });
  ctx.fillStyle=HATHI; ctx.fillRect(ox+10,oy-12,3,1); // tip highlight
  ctx.fillStyle=HATHI; ctx.fillRect(ox+8,oy-8, 5,1);  // mid highlight
  ctx.fillStyle=HATHI; ctx.fillRect(ox+7,oy-4, 7,1);  // lower highlight
  // Hat brim (wide flat)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+2,oy+0, 20,3);
  ctx.fillStyle=HATSH;  ctx.fillRect(ox+3,oy+1, 18,2);
  ctx.fillStyle=HAT;    ctx.fillRect(ox+4,oy+1, 14,2);
  ctx.fillStyle=HATHI;  ctx.fillRect(ox+4,oy+1, 10,1);
  // Hat band (gold trim)
  ctx.fillStyle='#C0A040'; ctx.fillRect(ox+5,oy+0,14,2);
  ctx.fillStyle='#E0C050'; ctx.fillRect(ox+5,oy+0,14,1);

  // ── Face (soft, young adult female) ──
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7,oy+2,10,12);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+8,oy+3,8,11);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+8,oy+3,7,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+8,oy+11,8,4);
  ctx.fillStyle=sk.dk;  ctx.fillRect(ox+8,oy+13,8,1);

  // Eyes
  ctx.fillStyle=OUT;       ctx.fillRect(ox+8,oy+5,3,3);  ctx.fillRect(ox+13,oy+5,3,3);
  ctx.fillStyle='#2A3065'; ctx.fillRect(ox+9,oy+5,2,2);  ctx.fillRect(ox+14,oy+5,2,2);
  ctx.fillStyle='#4A60A8'; ctx.fillRect(ox+9,oy+5,1,1);  ctx.fillRect(ox+14,oy+5,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+9,oy+5,1,1);  ctx.fillRect(ox+14,oy+5,1,1);

  // Nose (delicate)
  ctx.fillStyle=sk.lo; ctx.fillRect(ox+11,oy+8,2,1);

  // Lips
  ctx.fillStyle='#B05868'; ctx.fillRect(ox+9,oy+10,6,2);
  ctx.fillStyle='#D07888'; ctx.fillRect(ox+9,oy+10,6,1);

  // ── Hair bangs / fringe over forehead ──
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+7,oy+3,2,4);   // left bang
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+15,oy+3,2,4);  // right bang
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+7,oy+3,1,2);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+10,oy+2,4,4);  // centre fringe
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+10,oy+2,4,1);
}

// ── Dispatcher: pick male or female mage, handle direction flip ───────────────
function drawHumanMageSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f    = moving ? (Math.floor(frame/4)%6) : 0;
  const swing= moving ? _WK_SWING[f] : 0;
  const bob  = moving ? _WK_BOB[f]   : 0;
  const sk   = _skinPal(skinToneIdx??2);
  const hr   = _hairPal(hairHex||HAIR_COLORS[1]);

  if(dir===1){ // facing left → mirror entire sprite
    ctx.save();
    ctx.translate(ox+24,oy);
    ctx.scale(-1,1);
    const fn = (gender==='female') ? _drawFemaleMage : _drawMaleMage;
    fn(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    const fn = (gender==='female') ? _drawFemaleMage : _drawMaleMage;
    fn(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HUMAN ROGUE SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Lean hooded assassin. Dark leather vest with diagonal bandolier strap,
// face wrap concealing everything below the eyes, twin daggers, close boots.
// Male: slight swagger, belt pouch, amber eyes.
// Female: narrower silhouette, midriff skin strip, single visible hip dagger.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMaleRogue(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#050508';
  const HOOD='#181620',HOODHI='#282440',HOODSH='#0E0C14';
  const LEATH='#2A1E0E',LEATHI='#3E2E18',LEASH='#1A1008';
  const STRAP='#4A3820',STRAPH='#6A5438';
  const BOOT='#181012',BOOTHI='#2C1E28',BOOTST='#302840';
  const BLD='#B8C0CA',BLDHI='#D8E0EA';
  const BELT='#3A2810',BELTH='#5A4020';
  const WRAP='#1C1A24';

  // Shadow
  ctx.fillStyle='#00000028';
  ctx.fillRect(ox+4,oy+42,16,3);

  // Right dagger behind body (facing right)
  if(dir!==1){
    ctx.fillStyle=LEASH; ctx.fillRect(ox+19,oy+20+bob,3,15);
    ctx.fillStyle=BLD;   ctx.fillRect(ox+20,oy+22+bob,2,13);
    ctx.fillStyle=BLDHI; ctx.fillRect(ox+20,oy+22+bob,1,7);
    ctx.fillStyle=BELT;  ctx.fillRect(ox+18,oy+24+bob,5,2);
    ctx.fillStyle=BELTH; ctx.fillRect(ox+18,oy+24+bob,4,1);
  }

  // Boots (dark close-fit, straps)
  [4,13].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx-1,oy+34,8,10);
    ctx.fillStyle=BOOT;   ctx.fillRect(ox+bx,  oy+35,7,9);
    ctx.fillStyle=BOOTHI; ctx.fillRect(ox+bx,  oy+35,7,2);
    ctx.fillStyle=BOOTST; ctx.fillRect(ox+bx+1,oy+38,5,1);
    ctx.fillStyle=BOOTST; ctx.fillRect(ox+bx+1,oy+41,5,1);
  });

  // Legs (tight leather, walk swing)
  const lY=26;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+4, oy+lY+swing-1,8,10);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+5, oy+lY+swing,  7,9);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+9, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+12,oy+lY-swing-1,8,10);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+13,oy+lY-swing,  7,9);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+17,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Left arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+1, oy+14,5,13);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+2, oy+15,4,12);
  ctx.fillStyle=LEATHI;ctx.fillRect(ox+2, oy+15,3,5);

  // Right arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+18,oy+14,5,13);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+19,oy+15,4,12);
  ctx.fillStyle=LEATHI;ctx.fillRect(ox+19,oy+15,3,5);

  // Chest vest
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+13,14,14);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+6, oy+14,12,13);
  ctx.fillStyle=LEATHI;ctx.fillRect(ox+6, oy+14,8,5);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+15,oy+14,3,13);

  // Diagonal bandolier strap
  for(let i=0;i<8;i++){
    ctx.fillStyle=i<4?STRAPH:STRAP;
    ctx.fillRect(ox+6+i,oy+14+i,2,1);
  }
  // Chest strap
  ctx.fillStyle=STRAP;  ctx.fillRect(ox+6,oy+20,12,2);
  ctx.fillStyle=STRAPH; ctx.fillRect(ox+6,oy+20,12,1);

  // Belt + pouch
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+24,16,3);
  ctx.fillStyle=BELT;   ctx.fillRect(ox+5,oy+25,14,2);
  ctx.fillStyle=BELTH;  ctx.fillRect(ox+5,oy+25,14,1);
  ctx.fillStyle=LEASH;  ctx.fillRect(ox+5,oy+25,4,5);
  ctx.fillStyle=LEATH;  ctx.fillRect(ox+6,oy+26,3,4);

  // Left dagger (facing left)
  if(dir===1){
    ctx.fillStyle=LEASH; ctx.fillRect(ox+2,oy+20,3,15);
    ctx.fillStyle=BLD;   ctx.fillRect(ox+3,oy+22,2,13);
    ctx.fillStyle=BLDHI; ctx.fillRect(ox+3,oy+22,1,7);
    ctx.fillStyle=BELT;  ctx.fillRect(ox+1,oy+24,5,2);
    ctx.fillStyle=BELTH; ctx.fillRect(ox+1,oy+24,4,1);
  }

  ctx.restore();

  // Hood (dark, pulled very low)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3,oy+0,18,14);
  ctx.fillStyle=HOODSH; ctx.fillRect(ox+4,oy+1,16,13);
  ctx.fillStyle=HOOD;   ctx.fillRect(ox+5,oy+1,14,12);
  ctx.fillStyle=HOODHI; ctx.fillRect(ox+5,oy+1,10,3);
  // Low brim shadow
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+9,16,3);
  ctx.fillStyle=HOODSH; ctx.fillRect(ox+5,oy+9,14,2);

  // Face — skin above the wrap
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6,oy+5,12,9);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+7,oy+6,10,4);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+7,oy+6,8,2);

  // Eyes (sharp amber)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+7,oy+7,3,2);ctx.fillRect(ox+14,oy+7,3,2);
  ctx.fillStyle='#4A2808'; ctx.fillRect(ox+8,oy+7,2,2);ctx.fillRect(ox+15,oy+7,2,2);
  ctx.fillStyle='#D08020'; ctx.fillRect(ox+8,oy+7,1,1);ctx.fillRect(ox+15,oy+7,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+9,oy+7,1,1);ctx.fillRect(ox+16,oy+7,1,1);

  // Face wrap (nose/mouth concealed)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5,oy+9,14,6);
  ctx.fillStyle=WRAP;   ctx.fillRect(ox+6,oy+10,12,5);
  ctx.fillStyle=HOODSH; ctx.fillRect(ox+6,oy+12,12,3);
}

function _drawFemaleRogue(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#050508';
  const HOOD='#181620',HOODHI='#282440',HOODSH='#0E0C14';
  const LEATH='#2A1E0E',LEATHI='#3E2E18',LEASH='#1A1008';
  const STRAP='#4A3820',STRAPH='#6A5438';
  const BOOT='#181012',BOOTHI='#2C1E28',BOOTST='#302840';
  const BLD='#B8C0CA',BLDHI='#D8E0EA';
  const BELT='#3A2810',BELTH='#5A4020';
  const WRAP='#1C1A24';

  // Shadow
  ctx.fillStyle='#00000025';
  ctx.fillRect(ox+5,oy+42,14,3);

  // Hip dagger (facing right)
  if(dir!==1){
    ctx.fillStyle=LEASH; ctx.fillRect(ox+18,oy+20+bob,3,14);
    ctx.fillStyle=BLD;   ctx.fillRect(ox+19,oy+22+bob,2,12);
    ctx.fillStyle=BLDHI; ctx.fillRect(ox+19,oy+22+bob,1,6);
    ctx.fillStyle=BELT;  ctx.fillRect(ox+17,oy+24+bob,5,2);
    ctx.fillStyle=BELTH; ctx.fillRect(ox+17,oy+24+bob,4,1);
  }

  // Boots (knee-high, straps)
  [5,13].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx-1,oy+32,7,12);
    ctx.fillStyle=BOOT;   ctx.fillRect(ox+bx,  oy+33,6,11);
    ctx.fillStyle=BOOTHI; ctx.fillRect(ox+bx,  oy+33,6,3);
    ctx.fillStyle=BOOTST; ctx.fillRect(ox+bx+1,oy+36,4,1);
    ctx.fillStyle=BOOTST; ctx.fillRect(ox+bx+1,oy+39,4,1);
    ctx.fillStyle=BOOTST; ctx.fillRect(ox+bx+1,oy+42,4,1);
  });

  // Legs (tight, walk swing)
  const lY=24;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+lY+swing-1,7,10);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+6, oy+lY+swing,  6,9);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+9, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+12,oy+lY-swing-1,7,10);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+13,oy+lY-swing,  6,9);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+16,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Hair behind back (flowing)
  ctx.fillStyle=hr.lo; ctx.fillRect(ox+2, oy+14,3,16);
  ctx.fillStyle=hr.dk; ctx.fillRect(ox+2, oy+26,3,6);
  ctx.fillStyle=hr.lo; ctx.fillRect(ox+18,oy+14,3,14);
  ctx.fillStyle=hr.dk; ctx.fillRect(ox+18,oy+25,3,5);

  // Left arm (slim)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+2, oy+14,5,12);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+3, oy+15,4,11);
  ctx.fillStyle=LEATHI;ctx.fillRect(ox+3, oy+15,3,5);

  // Right arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+17,oy+14,5,12);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+18,oy+15,4,11);
  ctx.fillStyle=LEATHI;ctx.fillRect(ox+18,oy+15,3,5);

  // Corset/vest (shorter, narrower)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+6, oy+13,12,12);
  ctx.fillStyle=LEATH; ctx.fillRect(ox+7, oy+14,10,11);
  ctx.fillStyle=LEATHI;ctx.fillRect(ox+7, oy+14,7,5);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+14,oy+14,3,11);

  // Lace-up front detail
  ctx.fillStyle=STRAPH;
  for(let i=0;i<4;i++) ctx.fillRect(ox+11,oy+15+i*2,2,1);

  // Midriff (skin visible below corset)
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+7,oy+22,10,3);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+7,oy+22,8,1);

  // Belt
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5,oy+23,14,3);
  ctx.fillStyle=BELT;   ctx.fillRect(ox+6,oy+24,12,2);
  ctx.fillStyle=BELTH;  ctx.fillRect(ox+6,oy+24,12,1);
  ctx.fillStyle=BELTH;  ctx.fillRect(ox+10,oy+23,4,4); // buckle

  // Left dagger (facing left)
  if(dir===1){
    ctx.fillStyle=LEASH; ctx.fillRect(ox+3,oy+20,3,14);
    ctx.fillStyle=BLD;   ctx.fillRect(ox+4,oy+22,2,12);
    ctx.fillStyle=BLDHI; ctx.fillRect(ox+4,oy+22,1,6);
    ctx.fillStyle=BELT;  ctx.fillRect(ox+2,oy+24,5,2);
    ctx.fillStyle=BELTH; ctx.fillRect(ox+2,oy+24,4,1);
  }

  ctx.restore();

  // Head — hair back (visible below hood sides)
  ctx.fillStyle=hr.dk; ctx.fillRect(ox+3, oy+2,18,20);
  ctx.fillStyle=hr.lo; ctx.fillRect(ox+4, oy+3,16,18);
  ctx.fillStyle=hr.mid;ctx.fillRect(ox+5, oy+3,13,14);
  ctx.fillStyle=hr.hi; ctx.fillRect(ox+6, oy+3,10,4);
  ctx.fillStyle=hr.dk; ctx.fillRect(ox+15,oy+3,4,14);

  // Hood (form-fitting, dark)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4,oy+0,16,12);
  ctx.fillStyle=HOODSH; ctx.fillRect(ox+5,oy+1,14,11);
  ctx.fillStyle=HOOD;   ctx.fillRect(ox+6,oy+1,12,10);
  ctx.fillStyle=HOODHI; ctx.fillRect(ox+6,oy+1, 9,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5,oy+8,14,3);

  // Face above wrap
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7,oy+5,10,8);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+8,oy+6, 8,4);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+8,oy+6, 6,2);

  // Eyes (green, sharp)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+8,oy+7,3,2);ctx.fillRect(ox+13,oy+7,3,2);
  ctx.fillStyle='#1A3010'; ctx.fillRect(ox+9,oy+7,2,2);ctx.fillRect(ox+14,oy+7,2,2);
  ctx.fillStyle='#40A020'; ctx.fillRect(ox+9,oy+7,1,1);ctx.fillRect(ox+14,oy+7,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+9,oy+7,1,1);ctx.fillRect(ox+14,oy+7,1,1);

  // Face wrap
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6,oy+9,12,5);
  ctx.fillStyle=WRAP;   ctx.fillRect(ox+7,oy+10,10,4);
  ctx.fillStyle=HOODSH; ctx.fillRect(ox+7,oy+11,10,3);
}

function drawHumanRogueSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk=_skinPal(skinToneIdx??2);
  const hr=_hairPal(hairHex||HAIR_COLORS[1]);
  if(dir===1){
    ctx.save();ctx.translate(ox+24,oy);ctx.scale(-1,1);
    (gender==='female'?_drawFemaleRogue:_drawMaleRogue)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemaleRogue:_drawMaleRogue)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// HUMAN PALADIN SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Holy warrior clad in bright silver plate with gold trim. White tabard bearing
// a 4-point holy star, subtle divine-glow aura, noble bearing.
// Male: broad shoulders, glowing mace at hip, short cropped hair.
// Female: elegant plate, flowing white cape-mantle, holy light on sword hand.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMalePaladin(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#10101C';
  const PL='#C4C8D4',PLHI='#E4E8F4',PLSH='#8088A0',PLDK='#505870';
  const GOLD='#D4A820',GOLHI='#F0CC40',GOLSH='#8A7010';
  const TAB='#F0F0E8',TABSH='#C8C8C0';
  const BOOT='#3A3C4C',BOOTHI='#5A5C70';
  const HOLY='#FFE860';
  const SIL='#C0C8D0',SILHI='#E0E8F0';
  const GLOW='rgba(255,220,80,0.15)';

  // Shadow
  ctx.fillStyle='#00000028';
  ctx.fillRect(ox+2,oy+42,20,3);

  // Divine aura glow (behind everything)
  ctx.fillStyle=GLOW; ctx.fillRect(ox-4,oy-4,32,50);

  // Sword at right hip (behind body, facing right)
  if(dir!==1){
    ctx.fillStyle=OUT;   ctx.fillRect(ox+19,oy+16+bob,3,22);
    ctx.fillStyle=SIL;   ctx.fillRect(ox+20,oy+18+bob,2,20);
    ctx.fillStyle=SILHI; ctx.fillRect(ox+20,oy+18+bob,1,12);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox+17,oy+20+bob,8,2);
    ctx.fillStyle=GOLHI; ctx.fillRect(ox+17,oy+20+bob,8,1);
    ctx.fillStyle=PL;    ctx.fillRect(ox+18,oy+16+bob,3,5);
  }

  // Boots (polished plate sabatons)
  [3,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx-1,oy+34,9,10);
    ctx.fillStyle=PLSH;   ctx.fillRect(ox+bx,  oy+35,8,9);
    ctx.fillStyle=PL;     ctx.fillRect(ox+bx,  oy+35,8,9);
    ctx.fillStyle=PLHI;   ctx.fillRect(ox+bx,  oy+35,8,3);
    ctx.fillStyle=GOLD;   ctx.fillRect(ox+bx,  oy+36,8,1); // gold trim
    ctx.fillStyle=PLDK;   ctx.fillRect(ox+bx+5,oy+36,3,8); // shadow side
  });

  // Legs (armored greaves)
  const lY=26;
  ctx.fillStyle=OUT;  ctx.fillRect(ox+3, oy+lY+swing-1,9,10);
  ctx.fillStyle=PLSH; ctx.fillRect(ox+4, oy+lY+swing,  8,9);
  ctx.fillStyle=PL;   ctx.fillRect(ox+4, oy+lY+swing,  7,9);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+4, oy+lY+swing,  7,3);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+9, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;  ctx.fillRect(ox+12,oy+lY-swing-1,9,10);
  ctx.fillStyle=PL;   ctx.fillRect(ox+13,oy+lY-swing,  7,9);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+13,oy+lY-swing,  7,3);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+18,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Left arm (vambrace)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+0, oy+13,6,14);
  ctx.fillStyle=PLSH; ctx.fillRect(ox+1, oy+14,5,13);
  ctx.fillStyle=PL;   ctx.fillRect(ox+1, oy+14,5,13);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+1, oy+14,4,5);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+4, oy+14,2,13);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+1, oy+20,5,1); // gold arm band

  // Right arm
  ctx.fillStyle=OUT;  ctx.fillRect(ox+18,oy+13,6,14);
  ctx.fillStyle=PL;   ctx.fillRect(ox+19,oy+14,5,13);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+19,oy+14,4,5);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+22,oy+14,2,13);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+19,oy+20,5,1);

  // White tabard (over chest armor)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+13,14,14);
  ctx.fillStyle=TABSH; ctx.fillRect(ox+6, oy+14,12,13);
  ctx.fillStyle=TAB;   ctx.fillRect(ox+7, oy+14,10,13);
  ctx.fillStyle=TABSH; ctx.fillRect(ox+15,oy+14,2,13);
  // Tabard border (gold trim)
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+6, oy+14,1,13);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+17,oy+14,1,13);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+6, oy+26,12,1);

  // Holy 4-point star symbol on chest
  ctx.fillStyle=HOLY;  ctx.fillRect(ox+11,oy+16,2,8); // vertical
  ctx.fillStyle=HOLY;  ctx.fillRect(ox+9, oy+18,6,4); // horizontal
  ctx.fillStyle='#FFF';ctx.fillRect(ox+11,oy+18,2,4); // bright center

  // Plate shoulders (broad pauldrons)
  [2,16].forEach(px=>{
    ctx.fillStyle=OUT;  ctx.fillRect(ox+px-1,oy+11,9,7);
    ctx.fillStyle=PLSH; ctx.fillRect(ox+px,  oy+12,8,6);
    ctx.fillStyle=PL;   ctx.fillRect(ox+px,  oy+12,8,6);
    ctx.fillStyle=PLHI; ctx.fillRect(ox+px,  oy+12,7,3);
    ctx.fillStyle=GOLD; ctx.fillRect(ox+px,  oy+12,8,1); // gold trim
    ctx.fillStyle=PLDK; ctx.fillRect(ox+px+5,oy+13,3,5);
  });

  // Sword (facing left)
  if(dir===1){
    ctx.fillStyle=OUT;   ctx.fillRect(ox+2, oy+16,3,22);
    ctx.fillStyle=SIL;   ctx.fillRect(ox+3, oy+18,2,20);
    ctx.fillStyle=SILHI; ctx.fillRect(ox+3, oy+18,1,12);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox-1, oy+20,8,2);
    ctx.fillStyle=GOLHI; ctx.fillRect(ox-1, oy+20,8,1);
    ctx.fillStyle=PL;    ctx.fillRect(ox+3, oy+16,2,5);
  }

  ctx.restore();

  // Head — noble short hair
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy-2,16,16);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5, oy-1,14,14);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+6, oy-1,12,12);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+6, oy-1,10,4);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+15,oy-1,4,12);

  // Face (noble, clean-shaven)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6, oy+2,12,11);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+7, oy+3,10,10);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+7, oy+3,8,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+7, oy+10,10,3);
  ctx.fillStyle=sk.dk;  ctx.fillRect(ox+7, oy+11,10,2);

  // Eyes (clear blue)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+7,oy+5,3,2);ctx.fillRect(ox+14,oy+5,3,2);
  ctx.fillStyle='#1A3060'; ctx.fillRect(ox+8,oy+5,2,2);ctx.fillRect(ox+15,oy+5,2,2);
  ctx.fillStyle='#4070CC'; ctx.fillRect(ox+8,oy+5,1,1);ctx.fillRect(ox+15,oy+5,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+8,oy+5,1,1);ctx.fillRect(ox+15,oy+5,1,1);

  // Nose
  ctx.fillStyle=sk.lo; ctx.fillRect(ox+11,oy+7,2,2);

  // Mouth (determined set)
  ctx.fillStyle=sk.dk; ctx.fillRect(ox+9,oy+10,6,1);

  // Hair framing face
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+5,oy+3,2,8);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+17,oy+3,2,8);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5,oy+8,2,3);

  // Holy crown glow (golden halo above head)
  ctx.fillStyle='rgba(255,220,60,0.4)'; ctx.fillRect(ox+4,oy-4,16,5);
  ctx.fillStyle=GOLHI; ctx.fillRect(ox+6,oy-3,12,1);
}

function _drawFemalePaladin(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#10101C';
  const PL='#C4C8D4',PLHI='#E4E8F4',PLSH='#8088A0',PLDK='#505870';
  const GOLD='#D4A820',GOLHI='#F0CC40',GOLSH='#8A7010';
  const TAB='#F0F0E8',TABSH='#C8C8C0';
  const BOOT='#3A3C4C',BOOTHI='#5A5C70';
  const HOLY='#FFE860';
  const SIL='#C0C8D0',SILHI='#E0E8F0';
  const GLOW='rgba(255,220,80,0.15)';
  const MANTLE='#E8E8E0',MANTSH='#C0C0B8';

  // Shadow
  ctx.fillStyle='#00000025';
  ctx.fillRect(ox+4,oy+42,16,3);

  // Divine aura
  ctx.fillStyle=GLOW; ctx.fillRect(ox-4,oy-4,32,50);

  // Sword at right hip (facing right)
  if(dir!==1){
    ctx.fillStyle=OUT;   ctx.fillRect(ox+18,oy+16+bob,3,22);
    ctx.fillStyle=SIL;   ctx.fillRect(ox+19,oy+18+bob,2,20);
    ctx.fillStyle=SILHI; ctx.fillRect(ox+19,oy+18+bob,1,12);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox+16,oy+20+bob,7,2);
    ctx.fillStyle=GOLHI; ctx.fillRect(ox+16,oy+20+bob,7,1);
    ctx.fillStyle=PL;    ctx.fillRect(ox+17,oy+16+bob,3,5);
  }

  // Plate boots (elegant, pointed)
  [5,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx-1,oy+32,7,12);
    ctx.fillStyle=PL;     ctx.fillRect(ox+bx,  oy+33,6,11);
    ctx.fillStyle=PLHI;   ctx.fillRect(ox+bx,  oy+33,6,4);
    ctx.fillStyle=GOLD;   ctx.fillRect(ox+bx,  oy+34,6,1);
    ctx.fillStyle=PLDK;   ctx.fillRect(ox+bx+4,oy+34,2,10);
  });

  // Greave legs
  const lY=24;
  ctx.fillStyle=OUT;  ctx.fillRect(ox+4, oy+lY+swing-1,8,10);
  ctx.fillStyle=PL;   ctx.fillRect(ox+5, oy+lY+swing,  7,9);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+5, oy+lY+swing,  6,3);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+9, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;  ctx.fillRect(ox+12,oy+lY-swing-1,8,10);
  ctx.fillStyle=PL;   ctx.fillRect(ox+13,oy+lY-swing,  7,9);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+13,oy+lY-swing,  6,3);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+17,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // White mantle/cape behind (elegant flowing)
  ctx.fillStyle=MANTSH; ctx.fillRect(ox-2,oy+10,5,30);
  ctx.fillStyle=MANTLE; ctx.fillRect(ox-1,oy+10,4,28);
  ctx.fillStyle=MANTSH; ctx.fillRect(ox+21,oy+10,5,30);
  ctx.fillStyle=MANTLE; ctx.fillRect(ox+21,oy+10,4,28);

  // Slim plate arms
  ctx.fillStyle=OUT;  ctx.fillRect(ox+3, oy+13,5,13);
  ctx.fillStyle=PL;   ctx.fillRect(ox+4, oy+14,4,12);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+4, oy+14,3,5);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+6, oy+14,2,12);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+4, oy+20,4,1);

  ctx.fillStyle=OUT;  ctx.fillRect(ox+16,oy+13,5,13);
  ctx.fillStyle=PL;   ctx.fillRect(ox+17,oy+14,4,12);
  ctx.fillStyle=PLHI; ctx.fillRect(ox+17,oy+14,3,5);
  ctx.fillStyle=PLDK; ctx.fillRect(ox+19,oy+14,2,12);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+17,oy+20,4,1);

  // Breastplate + tabard
  ctx.fillStyle=OUT;   ctx.fillRect(ox+6, oy+12,12,14);
  ctx.fillStyle=PL;    ctx.fillRect(ox+7, oy+13,10,6);  // upper plate
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+7, oy+13,9,3);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+14,oy+13,3,6);
  // Tabard lower
  ctx.fillStyle=TABSH; ctx.fillRect(ox+7, oy+18,10,8);
  ctx.fillStyle=TAB;   ctx.fillRect(ox+8, oy+18,8,8);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+7, oy+18,1,8);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+16,oy+18,1,8);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+7, oy+25,10,1);

  // Holy symbol (compact, on breastplate)
  ctx.fillStyle=HOLY;  ctx.fillRect(ox+11,oy+14,2,6);
  ctx.fillStyle=HOLY;  ctx.fillRect(ox+9, oy+16,6,2);
  ctx.fillStyle='#FFF';ctx.fillRect(ox+11,oy+15,2,2);

  // Shoulders (elegant pauldrons)
  [5,14].forEach(px=>{
    ctx.fillStyle=OUT;  ctx.fillRect(ox+px-1,oy+11,7,6);
    ctx.fillStyle=PL;   ctx.fillRect(ox+px,  oy+12,6,5);
    ctx.fillStyle=PLHI; ctx.fillRect(ox+px,  oy+12,5,2);
    ctx.fillStyle=GOLD; ctx.fillRect(ox+px,  oy+12,6,1);
    ctx.fillStyle=PLDK; ctx.fillRect(ox+px+4,oy+13,2,4);
  });

  // Sword (left-facing)
  if(dir===1){
    ctx.fillStyle=OUT;   ctx.fillRect(ox+3, oy+16,3,22);
    ctx.fillStyle=SIL;   ctx.fillRect(ox+4, oy+18,2,20);
    ctx.fillStyle=SILHI; ctx.fillRect(ox+4, oy+18,1,12);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox+1, oy+20,7,2);
    ctx.fillStyle=GOLHI; ctx.fillRect(ox+1, oy+20,7,1);
    ctx.fillStyle=PL;    ctx.fillRect(ox+4, oy+16,2,5);
  }

  ctx.restore();

  // Head — long elegant hair
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3, oy-1,18,28);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+4, oy+0, 16,26);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5, oy+0, 14,22);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+6, oy+0, 11,18);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+7, oy+0, 9,5);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+15,oy+0, 3,18);

  // Face (noble, feminine)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7, oy+2,10,12);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+8, oy+3,8,11);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+8, oy+3,7,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+8, oy+11,8,4);
  ctx.fillStyle=sk.dk;  ctx.fillRect(ox+8, oy+13,8,1);

  // Eyes (warm brown)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+8,oy+5,3,3);ctx.fillRect(ox+13,oy+5,3,3);
  ctx.fillStyle='#3A1808'; ctx.fillRect(ox+9,oy+5,2,2);ctx.fillRect(ox+14,oy+5,2,2);
  ctx.fillStyle='#8A4018'; ctx.fillRect(ox+9,oy+5,1,1);ctx.fillRect(ox+14,oy+5,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+9,oy+5,1,1);ctx.fillRect(ox+14,oy+5,1,1);

  // Nose + lips
  ctx.fillStyle=sk.lo;     ctx.fillRect(ox+11,oy+8,2,1);
  ctx.fillStyle='#C06870'; ctx.fillRect(ox+9,oy+11,6,2);
  ctx.fillStyle='#E08898'; ctx.fillRect(ox+9,oy+11,6,1);

  // Bangs
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+7,oy+3,2,3);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+15,oy+3,2,3);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+10,oy+2,4,3);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+10,oy+2,4,1);

  // Holy crown halo
  ctx.fillStyle='rgba(255,220,60,0.4)'; ctx.fillRect(ox+5,oy-3,14,4);
  ctx.fillStyle=GOLHI; ctx.fillRect(ox+7,oy-2,10,1);
}

function drawHumanPaladinSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk=_skinPal(skinToneIdx??2);
  const hr=_hairPal(hairHex||HAIR_COLORS[1]);
  if(dir===1){
    ctx.save();ctx.translate(ox+24,oy);ctx.scale(-1,1);
    (gender==='female'?_drawFemalePaladin:_drawMalePaladin)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemalePaladin:_drawMalePaladin)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ELF SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Tall and angular with very prominent pointed ears. Nature/arcane aesthetic:
// forest-green tunic, silver-grey armour elements, elven agility implied.
// Male: tall lean build, pointed ears, silver circlet, longbow on back.
// Female: even more slender, longer ears, flowing silver-green robes, tiara.
// Skin is parametric (can be pale, dusky, etc). Hair fully parametric.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMaleElf(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#080C0A';
  const LEAF='#286030',LEAHI='#3E9048',LEASH='#184020',LEADK='#0E2818';
  const SIL='#9AAAB8',SILHI='#C0D0DC',SILSH='#607080';
  const WOOD='#6A4420',WOODHI='#9A6830';
  const BOOT='#1A2810',BOOTHI='#304820';
  const BOW='#7A5020',BOWHI='#A07030';
  const SING='#C0C080'; // bowstring color

  // Shadow
  ctx.fillStyle='#00000025';
  ctx.fillRect(ox+4,oy+42,16,3);

  // Longbow on back (vertical, behind body)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+1,oy-8,3,50);
  ctx.fillStyle=WOOD;   ctx.fillRect(ox+2,oy-7,2,48);
  ctx.fillStyle=WOODHI; ctx.fillRect(ox+2,oy-4,1,36);
  // Bow curve (top)
  ctx.fillStyle=WOOD;   ctx.fillRect(ox-1,oy-8,4,4);
  ctx.fillStyle=WOODHI; ctx.fillRect(ox-1,oy-8,3,2);
  // Bow curve (bottom)
  ctx.fillStyle=WOOD;   ctx.fillRect(ox-1,oy+40,4,4);
  ctx.fillStyle=WOODHI; ctx.fillRect(ox-1,oy+40,3,2);
  // Bowstring
  ctx.fillStyle=SING;   ctx.fillRect(ox+0,oy-8,1,52);

  // Boots (forest dark, pointed slightly)
  [4,13].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx-1,oy+34,8,10);
    ctx.fillStyle=BOOT;   ctx.fillRect(ox+bx,  oy+35,7,9);
    ctx.fillStyle=BOOTHI; ctx.fillRect(ox+bx,  oy+35,7,2);
    ctx.fillStyle=LEASH;  ctx.fillRect(ox+bx,  oy+37,7,1); // leaf trim
  });

  // Legs (tight forest-green)
  const lY=26;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+4, oy+lY+swing-1,8,10);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+5, oy+lY+swing,  7,9);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+5, oy+lY+swing,  6,9);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+5, oy+lY+swing,  5,3);
  ctx.fillStyle=LEADK; ctx.fillRect(ox+9, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+12,oy+lY-swing-1,8,10);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+13,oy+lY-swing,  6,9);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+13,oy+lY-swing,  5,3);
  ctx.fillStyle=LEADK; ctx.fillRect(ox+17,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Left arm (lean, vambrace)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+1, oy+13,5,14);
  ctx.fillStyle=LEAF; ctx.fillRect(ox+2, oy+14,4,13);
  ctx.fillStyle=LEAHI;ctx.fillRect(ox+2, oy+14,3,5);
  ctx.fillStyle=LEADK;ctx.fillRect(ox+4, oy+20,2,6);
  ctx.fillStyle=SIL;  ctx.fillRect(ox+2, oy+24,4,2); // silver vambrace cuff

  // Right arm
  ctx.fillStyle=OUT;  ctx.fillRect(ox+18,oy+13,5,14);
  ctx.fillStyle=LEAF; ctx.fillRect(ox+19,oy+14,4,13);
  ctx.fillStyle=LEAHI;ctx.fillRect(ox+19,oy+14,3,5);
  ctx.fillStyle=LEADK;ctx.fillRect(ox+21,oy+20,2,6);
  ctx.fillStyle=SIL;  ctx.fillRect(ox+19,oy+24,4,2);

  // Tunic (forest green, fitted)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+12,14,15);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+6, oy+13,12,14);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+7, oy+13,10,14);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+7, oy+13,8,5);
  ctx.fillStyle=LEADK; ctx.fillRect(ox+15,oy+13,3,14);

  // Silver chest armour panel
  ctx.fillStyle=SILSH; ctx.fillRect(ox+7, oy+13,10,8);
  ctx.fillStyle=SIL;   ctx.fillRect(ox+8, oy+14,8,7);
  ctx.fillStyle=SILHI; ctx.fillRect(ox+8, oy+14,7,3);
  // Leaf motif on chest (decorative)
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+10,oy+16,4,4);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+11,oy+15,2,5);
  ctx.fillStyle=LEADK; ctx.fillRect(ox+13,oy+16,1,3);

  // Belt (silver + leaf buckle)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+24,14,3);
  ctx.fillStyle=SILSH;  ctx.fillRect(ox+6, oy+25,12,2);
  ctx.fillStyle=SIL;    ctx.fillRect(ox+6, oy+25,12,2);
  ctx.fillStyle=SILHI;  ctx.fillRect(ox+6, oy+25,12,1);
  ctx.fillStyle=LEAF;   ctx.fillRect(ox+10,oy+24,4,4); // leaf buckle

  ctx.restore();

  // Head — pointed ears first (behind head)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+0, oy+4,4,8);   // left ear
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+1, oy+5,3,7);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+1, oy+5,2,3);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+2, oy+10,2,2); // ear tip shadow
  ctx.fillStyle=OUT;    ctx.fillRect(ox+20,oy+4,4,8);   // right ear
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+20,oy+5,3,7);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+21,oy+5,2,3);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+20,oy+10,2,2);

  // Hair
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy-2,16,14);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5, oy-1,14,12);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+6, oy-1,12,11);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+6, oy-1,10,4);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+15,oy-1,4,11);

  // Face (angular, high cheekbones)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+2,14,12);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+6, oy+3,12,11);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+6, oy+3,10,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+6, oy+11,12,4);
  ctx.fillStyle=sk.dk;  ctx.fillRect(ox+6, oy+13,12,2);
  // High cheekbone shadow
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+6, oy+7,2,3); ctx.fillRect(ox+16,oy+7,2,3);

  // Eyes (vivid green, slightly angular)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+7,oy+5,3,2);ctx.fillRect(ox+14,oy+5,3,2);
  ctx.fillStyle='#103010'; ctx.fillRect(ox+8,oy+5,2,2);ctx.fillRect(ox+15,oy+5,2,2);
  ctx.fillStyle='#30A840'; ctx.fillRect(ox+8,oy+5,1,1);ctx.fillRect(ox+15,oy+5,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+8,oy+5,1,1);ctx.fillRect(ox+15,oy+5,1,1);

  // Nose (straight, elvish)
  ctx.fillStyle=sk.lo; ctx.fillRect(ox+11,oy+8,2,3);

  // Silver circlet
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+1,14,2);
  ctx.fillStyle=SILSH;  ctx.fillRect(ox+6, oy+2,12,1);
  ctx.fillStyle=SIL;    ctx.fillRect(ox+6, oy+2,12,1);
  ctx.fillStyle=SILHI;  ctx.fillRect(ox+8, oy+1,8,2); // gemstone center
  ctx.fillStyle=LEAHI;  ctx.fillRect(ox+10,oy+1,4,2); // emerald gem
}

function _drawFemaleElf(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#080C0A';
  const LEAF='#286030',LEAHI='#3E9048',LEASH='#184020',LEADK='#0E2818';
  const SIL='#9AAAB8',SILHI='#C0D0DC',SILSH='#607080';
  const BOOT='#1A2810',BOOTHI='#304820';

  // Shadow
  ctx.fillStyle='#00000025';
  ctx.fillRect(ox+5,oy+42,14,3);

  // Boots (slender, forest)
  [5,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx-1,oy+32,7,12);
    ctx.fillStyle=BOOT;   ctx.fillRect(ox+bx,  oy+33,6,11);
    ctx.fillStyle=BOOTHI; ctx.fillRect(ox+bx,  oy+33,5,3);
    ctx.fillStyle=LEASH;  ctx.fillRect(ox+bx,  oy+35,5,1);
  });

  // Legs (under robe, barely visible)
  const lY=28;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+lY+swing-1,7,6);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+6, oy+lY+swing,  6,5);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+6, oy+lY+swing,  4,2);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+12,oy+lY-swing-1,7,6);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+13,oy+lY-swing,  6,5);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+13,oy+lY-swing,  4,2);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Hair flowing behind (long, to waist)
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+2, oy+14,3,18);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+3, oy+14,2,16);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+18,oy+14,3,18);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+18,oy+14,2,16);

  // Slim arms (elven grace)
  ctx.fillStyle=OUT;  ctx.fillRect(ox+3, oy+13,4,14);
  ctx.fillStyle=LEAF; ctx.fillRect(ox+4, oy+14,3,13);
  ctx.fillStyle=LEAHI;ctx.fillRect(ox+4, oy+14,2,5);
  ctx.fillStyle=SIL;  ctx.fillRect(ox+4, oy+24,3,2); // vambrace

  ctx.fillStyle=OUT;  ctx.fillRect(ox+17,oy+13,4,14);
  ctx.fillStyle=LEAF; ctx.fillRect(ox+17,oy+14,3,13);
  ctx.fillStyle=LEAHI;ctx.fillRect(ox+18,oy+14,2,5);
  ctx.fillStyle=SIL;  ctx.fillRect(ox+17,oy+24,3,2);

  // Flowing robe (A-line, green with silver trim)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+12,14,18);
  ctx.fillStyle=LEASH; ctx.fillRect(ox+6, oy+13,12,17);
  ctx.fillStyle=LEAF;  ctx.fillRect(ox+7, oy+13,10,17);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+7, oy+13,8,5);
  ctx.fillStyle=LEADK; ctx.fillRect(ox+15,oy+13,3,17);
  // Silver neckline and front trim
  ctx.fillStyle=SILSH; ctx.fillRect(ox+9, oy+13,6,2);
  ctx.fillStyle=SIL;   ctx.fillRect(ox+10,oy+13,4,2);
  // Leaf emblem
  ctx.fillStyle=SILHI; ctx.fillRect(ox+11,oy+16,2,4);
  ctx.fillStyle=LEAHI; ctx.fillRect(ox+10,oy+17,4,2);

  // Belt (silver, delicate)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5,oy+28,14,3);
  ctx.fillStyle=SILSH;  ctx.fillRect(ox+6,oy+29,12,2);
  ctx.fillStyle=SIL;    ctx.fillRect(ox+7,oy+29,10,1);
  ctx.fillStyle=LEAHI;  ctx.fillRect(ox+10,oy+28,4,3); // gem clasp

  ctx.restore();

  // Head — long hair (cascading, back layer)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+2, oy-1,20,30);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+3, oy+0, 18,28);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+4, oy+0, 16,24);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+5, oy+0, 13,20);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+6, oy+0, 10,5);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+15,oy+0, 4,20);

  // Very prominent pointed ears
  ctx.fillStyle=OUT;    ctx.fillRect(ox-1,oy+5,5,10);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+0, oy+6,4,9);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+0, oy+6,3,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+1, oy+12,3,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+20,oy+5,5,10);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+20,oy+6,4,9);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+21,oy+6,3,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+20,oy+12,3,3);

  // Face (narrow, angular)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7, oy+2,10,13);
  ctx.fillStyle=sk.mid; ctx.fillRect(ox+8, oy+3,8,12);
  ctx.fillStyle=sk.hi;  ctx.fillRect(ox+8, oy+3,7,4);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+8, oy+12,8,3);
  ctx.fillStyle=sk.lo;  ctx.fillRect(ox+8, oy+7,2,3);ctx.fillRect(ox+14,oy+7,2,3); // cheekbones

  // Eyes (vivid green, almond-shaped)
  ctx.fillStyle=OUT;       ctx.fillRect(ox+8,oy+5,3,3);ctx.fillRect(ox+13,oy+5,3,3);
  ctx.fillStyle='#103010'; ctx.fillRect(ox+9,oy+5,2,2);ctx.fillRect(ox+14,oy+5,2,2);
  ctx.fillStyle='#30A840'; ctx.fillRect(ox+9,oy+5,1,1);ctx.fillRect(ox+14,oy+5,1,1);
  ctx.fillStyle='#FFF';    ctx.fillRect(ox+9,oy+5,1,1);ctx.fillRect(ox+14,oy+5,1,1);

  // Nose + lips
  ctx.fillStyle=sk.lo;     ctx.fillRect(ox+11,oy+8,2,2);
  ctx.fillStyle='#A05060'; ctx.fillRect(ox+9,oy+11,6,2);
  ctx.fillStyle='#C07080'; ctx.fillRect(ox+9,oy+11,6,1);

  // Hair bangs
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+7,oy+3,2,4);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+15,oy+3,2,4);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+7,oy+3,1,2);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+10,oy+2,4,4);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+10,oy+2,4,1);

  // Silver tiara
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6, oy+2,12,2);
  ctx.fillStyle=SIL;    ctx.fillRect(ox+7, oy+2,10,1);
  ctx.fillStyle=SILHI;  ctx.fillRect(ox+8, oy+1, 8,2);
  ctx.fillStyle='#60D870';ctx.fillRect(ox+10,oy+1,4,2); // emerald center gem
  ctx.fillStyle='#90F890';ctx.fillRect(ox+11,oy+1,2,1);
}

function drawElfSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk=_skinPal(skinToneIdx??2);
  const hr=_hairPal(hairHex||HAIR_COLORS[1]);
  if(dir===1){
    ctx.save();ctx.translate(ox+24,oy);ctx.scale(-1,1);
    (gender==='female'?_drawFemaleElf:_drawMaleElf)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemaleElf:_drawMaleElf)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// DWARF SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Very wide and stocky (same height, noticeably wider proportions). Heavy
// plate/chainmail in earth tones. The beard is the defining feature.
// Male: enormous braided beard (parametric hair colour), battle axe at hip,
//        full helm with horns, very thick limbs.
// Female: twin long braids, smaller visor helm, same heavy armour, war axe.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMaleDwarf(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#0A0808';
  const PLATE='#545264',PLHI='#747288',PLSH='#343048',PLDK='#201E30';
  const GOLD='#C8A028',GOLHI='#E8C040',GOLSH='#887018';
  const BOOT='#2A1808',BOOTHI='#4A2C18';
  const AXE='#6A6870',AXEHI='#9A98A8',AXSH='#3A3848';
  const AXHND='#5A3010',AXHHI='#8A5020';

  // Shadow (wide)
  ctx.fillStyle='#00000030';
  ctx.fillRect(ox+0,oy+42,26,3);

  // Axe at right hip (behind body)
  if(dir!==1){
    ctx.fillStyle=AXHND;  ctx.fillRect(ox+21,oy+14+bob,4,24);
    ctx.fillStyle=AXHHI;  ctx.fillRect(ox+22,oy+14+bob,2,22);
    // Axe head
    ctx.fillStyle=AXSH;   ctx.fillRect(ox+20,oy+14+bob,8,10);
    ctx.fillStyle=AXE;    ctx.fillRect(ox+21,oy+15+bob,7,9);
    ctx.fillStyle=AXEHI;  ctx.fillRect(ox+21,oy+15+bob,5,4);
    ctx.fillStyle=GOLSH;  ctx.fillRect(ox+21,oy+14+bob,7,2); // gold trim on axe
    ctx.fillStyle=GOLD;   ctx.fillRect(ox+22,oy+14+bob,5,1);
  }

  // Boots (massive, iron-shod)
  [-1,13].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx,  oy+34,11,10);
    ctx.fillStyle=PLSH;   ctx.fillRect(ox+bx+1,oy+35,10,9);
    ctx.fillStyle=PLATE;  ctx.fillRect(ox+bx+1,oy+35,10,9);
    ctx.fillStyle=PLHI;   ctx.fillRect(ox+bx+1,oy+35,9,3);
    ctx.fillStyle=GOLD;   ctx.fillRect(ox+bx+1,oy+36,9,1);
    ctx.fillStyle=PLDK;   ctx.fillRect(ox+bx+8,oy+36,3,8);
  });

  // Legs (wide, armored greaves)
  const lY=26;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+0, oy+lY+swing-1,11,10);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+1, oy+lY+swing,  10,9);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+1, oy+lY+swing,  9,4);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+8, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+13,oy+lY-swing-1,11,10);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+14,oy+lY-swing,  10,9);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+14,oy+lY-swing,  9,4);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+21,oy+lY-swing,  3,9);

  // Torso (bob) — very wide
  ctx.save(); ctx.translate(0,bob);

  // Thick left arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox-2, oy+12,8,15);
  ctx.fillStyle=PLSH;  ctx.fillRect(ox-1, oy+13,7,14);
  ctx.fillStyle=PLATE; ctx.fillRect(ox-1, oy+13,7,14);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox-1, oy+13,6,5);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+4, oy+13,3,14);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox-1, oy+20,7,1);

  // Thick right arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+18,oy+12,8,15);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+19,oy+13,7,14);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+19,oy+13,6,5);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+24,oy+13,3,14);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+19,oy+20,7,1);

  // Broad chest (very wide)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+4, oy+11,18,16);
  ctx.fillStyle=PLSH;  ctx.fillRect(ox+5, oy+12,16,15);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+6, oy+12,14,15);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+6, oy+12,12,6);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+17,oy+12,3,15);
  // Gold chest emblem (clan rune)
  ctx.fillStyle=GOLSH; ctx.fillRect(ox+9, oy+15,8,7);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+10,oy+16,6,5);
  ctx.fillStyle=GOLHI; ctx.fillRect(ox+11,oy+16,4,2);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+12,oy+16,2,5); ctx.fillRect(ox+10,oy+18,6,2); // rune cross

  // Massive pauldrons
  [-3,17].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px,  oy+9,12,10);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox+px+1,oy+10,11,9);
    ctx.fillStyle=PLATE; ctx.fillRect(ox+px+1,oy+10,11,9);
    ctx.fillStyle=PLHI;  ctx.fillRect(ox+px+1,oy+10,10,4);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox+px+1,oy+10,10,1);
    ctx.fillStyle=PLDK;  ctx.fillRect(ox+px+8,oy+11,4,8);
  });

  // Axe (left-facing)
  if(dir===1){
    ctx.fillStyle=AXHND;  ctx.fillRect(ox-1, oy+14,4,24);
    ctx.fillStyle=AXHHI;  ctx.fillRect(ox+0, oy+14,2,22);
    ctx.fillStyle=AXSH;   ctx.fillRect(ox-4, oy+14,8,10);
    ctx.fillStyle=AXE;    ctx.fillRect(ox-3, oy+15,7,9);
    ctx.fillStyle=AXEHI;  ctx.fillRect(ox-3, oy+15,5,4);
    ctx.fillStyle=GOLSH;  ctx.fillRect(ox-3, oy+14,7,2);
    ctx.fillStyle=GOLD;   ctx.fillRect(ox-2, oy+14,5,1);
  }

  ctx.restore();

  // Helm (full, with horns)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+2, oy-2,22,16);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+3, oy-1,20,15);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+4, oy-1,18,15);
  ctx.fillStyle=PLHI;   ctx.fillRect(ox+4, oy-1,16,5);
  ctx.fillStyle=GOLD;   ctx.fillRect(ox+4, oy+0, 16,1); // gold helm band
  // Helm horns
  ctx.fillStyle=OUT;    ctx.fillRect(ox+2, oy-5,4,6);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+3, oy-4,3,5);
  ctx.fillStyle=PLHI;   ctx.fillRect(ox+3, oy-4,2,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+18,oy-5,4,6);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+19,oy-4,3,5);
  ctx.fillStyle=PLHI;   ctx.fillRect(ox+19,oy-4,2,3);
  // Visor slit
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6, oy+5,13,3);
  ctx.fillStyle=PLDK;   ctx.fillRect(ox+7, oy+6,11,2);

  // Eyes (visible through visor)
  ctx.fillStyle='#FF6600'; ctx.fillRect(ox+8, oy+6,3,2);ctx.fillRect(ox+14,oy+6,3,2); // fiery
  ctx.fillStyle='#FF9900'; ctx.fillRect(ox+9, oy+6,2,2);ctx.fillRect(ox+15,oy+6,2,2);

  // Beard (massive, iconic — hangs below helm, wide)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3, oy+11,20,20);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+4, oy+12,18,19);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5, oy+12,16,18);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+6, oy+12,14,17);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+8, oy+12,10,8);
  // Beard braid strands
  for(let i=0;i<4;i++){
    ctx.fillStyle=hr.dk; ctx.fillRect(ox+8+i*3,oy+14,2,14);
    ctx.fillStyle=hr.hi; ctx.fillRect(ox+8+i*3,oy+14,1,8);
  }
  // Beard gold rings
  ctx.fillStyle=GOLD; ctx.fillRect(ox+8,oy+20,14,2);
  ctx.fillStyle=GOLHI;ctx.fillRect(ox+8,oy+20,14,1);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+9,oy+26,12,2);
  ctx.fillStyle=GOLHI;ctx.fillRect(ox+9,oy+26,12,1);
}

function _drawFemaleDwarf(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#0A0808';
  const PLATE='#545264',PLHI='#747288',PLSH='#343048',PLDK='#201E30';
  const GOLD='#C8A028',GOLHI='#E8C040',GOLSH='#887018';
  const BOOT='#2A1808',BOOTHI='#4A2C18';
  const AXE='#6A6870',AXEHI='#9A98A8',AXSH='#3A3848';
  const AXHND='#5A3010',AXHHI='#8A5020';

  // Shadow
  ctx.fillStyle='#00000028';
  ctx.fillRect(ox+1,oy+42,22,3);

  // Axe (right side)
  if(dir!==1){
    ctx.fillStyle=AXHND;  ctx.fillRect(ox+19,oy+14+bob,3,22);
    ctx.fillStyle=AXHHI;  ctx.fillRect(ox+20,oy+14+bob,2,20);
    ctx.fillStyle=AXSH;   ctx.fillRect(ox+18,oy+14+bob,7,8);
    ctx.fillStyle=AXE;    ctx.fillRect(ox+19,oy+15+bob,6,7);
    ctx.fillStyle=AXEHI;  ctx.fillRect(ox+19,oy+15+bob,4,3);
    ctx.fillStyle=GOLD;   ctx.fillRect(ox+19,oy+14+bob,6,1);
  }

  // Boots
  [1,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx,  oy+34,9,10);
    ctx.fillStyle=PLATE;  ctx.fillRect(ox+bx+1,oy+35,8,9);
    ctx.fillStyle=PLHI;   ctx.fillRect(ox+bx+1,oy+35,7,3);
    ctx.fillStyle=GOLD;   ctx.fillRect(ox+bx+1,oy+36,7,1);
    ctx.fillStyle=PLDK;   ctx.fillRect(ox+bx+6,oy+36,3,8);
  });

  // Legs
  const lY=26;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+2, oy+lY+swing-1,9,10);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+3, oy+lY+swing,  8,9);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+3, oy+lY+swing,  7,3);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+8, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+13,oy+lY-swing-1,9,10);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+14,oy+lY-swing,  8,9);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+14,oy+lY-swing,  7,3);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+19,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Hair braids behind (twin long braids, parametric color)
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+1, oy+13,4,22);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+2, oy+13,3,20);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+2, oy+13,2,18);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+17,oy+13,4,22);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+17,oy+13,3,20);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+18,oy+13,2,18);
  // Braid knots
  ctx.fillStyle=GOLD;   ctx.fillRect(ox+1,oy+20,4,2); ctx.fillRect(ox+17,oy+20,4,2);
  ctx.fillStyle=GOLD;   ctx.fillRect(ox+1,oy+28,4,2); ctx.fillRect(ox+17,oy+28,4,2);

  // Arms (somewhat wide but less than male)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+1, oy+12,7,14);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+2, oy+13,6,13);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+2, oy+13,5,5);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+6, oy+13,2,13);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+2, oy+19,6,1);

  ctx.fillStyle=OUT;   ctx.fillRect(ox+16,oy+12,7,14);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+16,oy+13,6,13);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+17,oy+13,5,5);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+20,oy+13,2,13);
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+16,oy+19,6,1);

  // Chest (wide, armored)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+6, oy+11,13,15);
  ctx.fillStyle=PLSH;  ctx.fillRect(ox+7, oy+12,11,14);
  ctx.fillStyle=PLATE; ctx.fillRect(ox+8, oy+12,9,14);
  ctx.fillStyle=PLHI;  ctx.fillRect(ox+8, oy+12,8,5);
  ctx.fillStyle=PLDK;  ctx.fillRect(ox+14,oy+12,3,14);
  // Clan emblem
  ctx.fillStyle=GOLD;  ctx.fillRect(ox+10,oy+16,5,4);
  ctx.fillStyle=GOLHI; ctx.fillRect(ox+11,oy+16,3,2);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+12,oy+16,1,4);ctx.fillRect(ox+10,oy+18,5,1);

  // Pauldrons (substantial)
  [4,14].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px-1,oy+10,9,8);
    ctx.fillStyle=PLATE; ctx.fillRect(ox+px,  oy+11,8,7);
    ctx.fillStyle=PLHI;  ctx.fillRect(ox+px,  oy+11,7,3);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox+px,  oy+11,7,1);
    ctx.fillStyle=PLDK;  ctx.fillRect(ox+px+5,oy+12,3,6);
  });

  // Axe (left-facing)
  if(dir===1){
    ctx.fillStyle=AXHND; ctx.fillRect(ox+2, oy+14,3,22);
    ctx.fillStyle=AXHHI; ctx.fillRect(ox+2, oy+14,2,20);
    ctx.fillStyle=AXSH;  ctx.fillRect(ox-1, oy+14,7,8);
    ctx.fillStyle=AXE;   ctx.fillRect(ox+0, oy+15,6,7);
    ctx.fillStyle=AXEHI; ctx.fillRect(ox+0, oy+15,4,3);
    ctx.fillStyle=GOLD;  ctx.fillRect(ox+0, oy+14,6,1);
  }

  ctx.restore();

  // Helm (with visor, smaller than male)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3, oy-1,19,14);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+4, oy+0, 17,13);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+5, oy+0, 15,13);
  ctx.fillStyle=PLHI;   ctx.fillRect(ox+5, oy+0, 14,4);
  ctx.fillStyle=GOLD;   ctx.fillRect(ox+5, oy+1, 14,1);
  // Twin decorative horns (smaller, ornate)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy-4,4,5);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+5, oy-3,3,4);
  ctx.fillStyle=GOLHI;  ctx.fillRect(ox+5, oy-3,2,2); // gold-tipped
  ctx.fillStyle=OUT;    ctx.fillRect(ox+17,oy-4,4,5);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+17,oy-3,3,4);
  ctx.fillStyle=GOLHI;  ctx.fillRect(ox+18,oy-3,2,2);
  // Visor
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6, oy+5,13,3);
  ctx.fillStyle=PLDK;   ctx.fillRect(ox+7, oy+6,11,2);
  // Eyes
  ctx.fillStyle='#FF6600'; ctx.fillRect(ox+8,oy+6,3,2);ctx.fillRect(ox+13,oy+6,3,2);
  ctx.fillStyle='#FF9900'; ctx.fillRect(ox+9,oy+6,2,1);ctx.fillRect(ox+14,oy+6,2,1);

  // Twin braids hanging in front (shorter than male beard)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+12,4,18);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+5, oy+13,3,17);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+5, oy+13,2,15);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+5, oy+13,1,8);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+16,oy+12,4,18);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+16,oy+13,3,17);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+17,oy+13,2,15);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+17,oy+13,1,8);
  // Braid rings
  ctx.fillStyle=GOLD; ctx.fillRect(ox+4,oy+18,4,2); ctx.fillRect(ox+16,oy+18,4,2);
  ctx.fillStyle=GOLD; ctx.fillRect(ox+4,oy+25,4,2); ctx.fillRect(ox+16,oy+25,4,2);
}

function drawDwarfSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk=_skinPal(skinToneIdx??2);
  const hr=_hairPal(hairHex||HAIR_COLORS[1]);
  if(dir===1){
    ctx.save();ctx.translate(ox+26,oy);ctx.scale(-1,1); // wider flip for dwarf
    (gender==='female'?_drawFemaleDwarf:_drawMaleDwarf)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemaleDwarf:_drawMaleDwarf)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GOBLIN SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Small, hunched, mischievous. Disproportionately large head, enormous pointed
// ears, bulbous yellow eyes, big hooked nose. Patchwork mismatched armor bits.
// Skin: species-fixed bright green. Hair parametric (scraggly).
// Male: slightly hunched, crude patchwork vest, club + small dagger.
// Female: slightly different ear/face, simpler rag outfit, staff or club.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMaleGoblin(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  // Species-fixed green skin
  const SKNG='#7AAA30',SKNHI='#9ACC44',SKNSH='#507820',SKNDK='#345010';
  const OUT='#080C04';
  const LEATH='#3A2818',LEATHI='#5A4028',LEASH='#201408';
  const PATCH='#5A4830',PATHI='#7A6848',PATSH='#3A2A18'; // patchwork cloth
  const IRON='#5A585E',IRONHI='#7A7880',IRONSH='#3A3840'; // crude iron bits
  const BOOT='#2A2010',BOOTHI='#3E3018';
  const CLUB='#6A4420',CLUBHI='#8A6030';
  const YEL='#CCCC00',YELHI='#FFFF40'; // yellow eyes

  // Shadow (small)
  ctx.fillStyle='#00000025';
  ctx.fillRect(ox+5,oy+42,14,3);

  // Club (right hip, crude weapon)
  if(dir!==1){
    ctx.fillStyle=LEASH; ctx.fillRect(ox+18,oy+20+bob,4,18);
    ctx.fillStyle=CLUB;  ctx.fillRect(ox+19,oy+21+bob,3,17);
    ctx.fillStyle=CLUBHI;ctx.fillRect(ox+19,oy+21+bob,2,10);
    // Club head (knobbly)
    ctx.fillStyle=LEASH; ctx.fillRect(ox+17,oy+20+bob,6,5);
    ctx.fillStyle=CLUB;  ctx.fillRect(ox+18,oy+21+bob,5,4);
    ctx.fillStyle=CLUBHI;ctx.fillRect(ox+18,oy+21+bob,4,2);
  }

  // Boots (ragged, mismatched)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+36,7,8);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+6, oy+37,6,7);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+6, oy+37,5,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+12,oy+36,7,8);
  ctx.fillStyle=LEATH;  ctx.fillRect(ox+13,oy+37,6,7); // mismatched boot
  ctx.fillStyle=LEATHI; ctx.fillRect(ox+13,oy+37,5,2);

  // Legs (scrawny)
  const lY=28;
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+lY+swing-1,7,10);
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+6, oy+lY+swing,  6,9);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+6, oy+lY+swing,  5,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+6, oy+lY+swing,  4,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+12,oy+lY-swing-1,7,10);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+13,oy+lY-swing,  5,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+13,oy+lY-swing,  4,3);
  // Crude knee pad (one side only — mismatched)
  ctx.fillStyle=IRON;   ctx.fillRect(ox+6, oy+lY+swing,  5,2);

  // Torso (hunched, bob)
  ctx.save(); ctx.translate(0,bob);

  // Long scrawny left arm (hangs low)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+2, oy+16,5,16);
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+3, oy+17,4,15);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+3, oy+17,3,15);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+3, oy+17,2,6);
  // Fingerclaws on hand
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+3, oy+30,4,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+3, oy+32,1,2);ctx.fillRect(ox+5,oy+32,1,2);

  // Right arm
  ctx.fillStyle=OUT;    ctx.fillRect(ox+17,oy+16,5,16);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+18,oy+17,4,15);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+18,oy+17,3,6);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+18,oy+30,4,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+18,oy+32,1,2);ctx.fillRect(ox+20,oy+32,1,2);

  // Patchwork vest (crude, mismatched fabrics)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+15,14,14);
  ctx.fillStyle=PATSH;  ctx.fillRect(ox+6, oy+16,12,13);
  ctx.fillStyle=PATCH;  ctx.fillRect(ox+7, oy+16,10,13);
  ctx.fillStyle=PATHI;  ctx.fillRect(ox+7, oy+16,7,4);
  ctx.fillStyle=PATSH;  ctx.fillRect(ox+14,oy+16,3,13);
  // Patch seams (mismatched pieces)
  ctx.fillStyle=LEASH;  ctx.fillRect(ox+10,oy+16,2,13); // centre seam
  ctx.fillStyle=LEASH;  ctx.fillRect(ox+7, oy+21,10,2); // horizontal seam
  // Crude iron shoulder scrap (one side)
  ctx.fillStyle=IRONSH; ctx.fillRect(ox+5, oy+14,5,5);
  ctx.fillStyle=IRON;   ctx.fillRect(ox+6, oy+15,4,4);
  ctx.fillStyle=IRONHI; ctx.fillRect(ox+6, oy+15,3,2);

  // Belt (rope + scraps)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+26,14,3);
  ctx.fillStyle=CLUB;   ctx.fillRect(ox+6, oy+27,12,2);
  ctx.fillStyle=CLUBHI; ctx.fillRect(ox+6, oy+27,12,1);

  // Club (facing left)
  if(dir===1){
    ctx.fillStyle=LEASH; ctx.fillRect(ox+2, oy+20,4,18);
    ctx.fillStyle=CLUB;  ctx.fillRect(ox+2, oy+21,3,17);
    ctx.fillStyle=CLUBHI;ctx.fillRect(ox+2, oy+21,2,10);
    ctx.fillStyle=LEASH; ctx.fillRect(ox+1, oy+20,6,5);
    ctx.fillStyle=CLUB;  ctx.fillRect(ox+1, oy+21,5,4);
    ctx.fillStyle=CLUBHI;ctx.fillRect(ox+1, oy+21,4,2);
  }

  ctx.restore();

  // Big disproportionate head (large for a small body)
  // Huge ears (sideways-pointing)
  ctx.fillStyle=OUT;    ctx.fillRect(ox-2,oy+3,6,10);
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox-1,oy+4,5,9);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+0, oy+4,4,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+0, oy+4,3,4);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+0, oy+10,4,3); // inner ear
  ctx.fillStyle=OUT;    ctx.fillRect(ox+20,oy+3,6,10);
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+19,oy+4,5,9);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+20,oy+4,4,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+22,oy+4,2,4);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+20,oy+10,4,3);

  // Scraggly hair (parametric)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+0,16,8);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+5, oy+1,14,7);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+6, oy+1,12,6);
  // Scraggly spikes
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5, oy-1,3,3);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+10,oy-2,3,4);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+15,oy-1,3,3);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+11,oy-2,1,2);

  // Head (big, round)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+2,16,16);
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+5, oy+3,14,15);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+6, oy+3,12,14);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+6, oy+3,10,5);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+15,oy+3,3,14); // shadow

  // Big round yellow eyes (bulbous)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+5,5,5);ctx.fillRect(ox+14,oy+5,5,5);
  ctx.fillStyle=YEL;    ctx.fillRect(ox+6, oy+6,4,4);ctx.fillRect(ox+15,oy+6,4,4);
  ctx.fillStyle=YELHI;  ctx.fillRect(ox+6, oy+6,3,2);ctx.fillRect(ox+15,oy+6,3,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7, oy+7,2,2);ctx.fillRect(ox+16,oy+7,2,2); // pupil
  ctx.fillStyle='#FFF'; ctx.fillRect(ox+7, oy+7,1,1);ctx.fillRect(ox+16,oy+7,1,1); // glint

  // Big hooked nose
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+10,oy+10,4,5);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+11,oy+10,3,5);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+11,oy+10,2,3);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+11,oy+13,4,2); // hook tip

  // Toothy grin (jagged)
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+7, oy+14,10,3);
  ctx.fillStyle='#EEE'; ctx.fillRect(ox+8, oy+14,2,2); // teeth
  ctx.fillStyle='#EEE'; ctx.fillRect(ox+11,oy+14,2,2);
  ctx.fillStyle='#EEE'; ctx.fillRect(ox+14,oy+14,2,2);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+9, oy+14,2,1); ctx.fillRect(ox+12,oy+14,2,1); // gaps
}

function _drawFemaleGoblin(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const SKNG='#7AAA30',SKNHI='#9ACC44',SKNSH='#507820',SKNDK='#345010';
  const OUT='#080C04';
  const LEATH='#3A2818',LEATHI='#5A4028',LEASH='#201408';
  const PATCH='#6A4860',PATHI='#8A6880',PATSH='#4A2840'; // different color cloth (purple-ish)
  const BOOT='#2A2010',BOOTHI='#3E3018';
  const STAFF='#6A4420',STAFFHI='#8A6030';
  const YEL='#CCCC00',YELHI='#FFFF40';

  // Shadow
  ctx.fillStyle='#00000022';
  ctx.fillRect(ox+5,oy+42,14,3);

  // Staff (behind body)
  ctx.fillStyle=OUT;     ctx.fillRect(ox+0,oy-4,3,48);
  ctx.fillStyle=LEASH;   ctx.fillRect(ox+1,oy-3,2,46);
  ctx.fillStyle=STAFFHI; ctx.fillRect(ox+1,oy+0,1,36);
  // Skull/orb on top
  ctx.fillStyle=OUT;     ctx.fillRect(ox-1,oy-6,5,4);
  ctx.fillStyle='#B8B0A0';ctx.fillRect(ox+0, oy-5,4,3);
  ctx.fillStyle='#D0C8B8';ctx.fillRect(ox+0, oy-5,3,2);

  // Ragged boots
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+36,7,8);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+6, oy+37,6,7);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+6, oy+37,5,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+12,oy+36,7,8);
  ctx.fillStyle=BOOT;   ctx.fillRect(ox+13,oy+37,6,7);
  ctx.fillStyle=BOOTHI; ctx.fillRect(ox+13,oy+37,5,2);

  // Legs (scrawny)
  const lY=28;
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+lY+swing-1,7,10);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+6, oy+lY+swing,  6,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+6, oy+lY+swing,  4,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+12,oy+lY-swing-1,7,10);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+13,oy+lY-swing,  6,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+13,oy+lY-swing,  4,3);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Arms (scrawny)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+2, oy+16,4,14);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+3, oy+17,3,13);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+3, oy+17,2,5);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+3, oy+28,3,3); // hand

  ctx.fillStyle=OUT;    ctx.fillRect(ox+18,oy+16,4,14);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+18,oy+17,3,13);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+19,oy+17,2,5);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+18,oy+28,3,3);

  // Ragged robe/dress
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+15,14,15);
  ctx.fillStyle=PATSH;  ctx.fillRect(ox+6, oy+16,12,14);
  ctx.fillStyle=PATCH;  ctx.fillRect(ox+7, oy+16,10,14);
  ctx.fillStyle=PATHI;  ctx.fillRect(ox+7, oy+16,7,5);
  ctx.fillStyle=PATSH;  ctx.fillRect(ox+14,oy+16,3,14);
  // Ragged hem
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7, oy+27,2,3); ctx.fillRect(ox+11,oy+28,2,2);ctx.fillRect(ox+15,oy+27,2,3);
  // Bone/trinket necklace
  ctx.fillStyle='#C0B890';
  for(let i=0;i<5;i++) ctx.fillRect(ox+7+i*2,oy+16,2,2);
  ctx.fillStyle='#D0C8A0'; ctx.fillRect(ox+11,oy+15,2,2); // pendant

  ctx.restore();

  // Big head + huge ears
  ctx.fillStyle=OUT;    ctx.fillRect(ox-2,oy+3,6,10);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox-1,oy+4,5,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+0, oy+4,3,4);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+0, oy+10,4,3);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+20,oy+3,6,10);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+19,oy+4,5,9);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+21,oy+4,2,4);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+20,oy+10,4,3);

  // Hair (scraggly, tied)
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+4, oy+0,16,7);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+5, oy+1,14,6);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+5, oy-1,4,3); ctx.fillRect(ox+15,oy-1,3,3); // wisps

  // Head
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+2,16,15);
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+5, oy+3,14,14);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+6, oy+3,12,13);
  ctx.fillStyle=SKNHI;  ctx.fillRect(ox+6, oy+3,10,4);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+15,oy+3,3,13);

  // Eyes (yellow, large)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+5,5,5);ctx.fillRect(ox+14,oy+5,5,5);
  ctx.fillStyle=YEL;    ctx.fillRect(ox+6, oy+6,4,4);ctx.fillRect(ox+15,oy+6,4,4);
  ctx.fillStyle=YELHI;  ctx.fillRect(ox+6, oy+6,3,2);ctx.fillRect(ox+15,oy+6,3,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7, oy+7,2,2);ctx.fillRect(ox+16,oy+7,2,2);
  ctx.fillStyle='#FFF'; ctx.fillRect(ox+7, oy+7,1,1);ctx.fillRect(ox+16,oy+7,1,1);

  // Nose (hooked but slightly smaller)
  ctx.fillStyle=SKNSH;  ctx.fillRect(ox+10,oy+10,4,4);
  ctx.fillStyle=SKNG;   ctx.fillRect(ox+11,oy+10,3,4);
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+11,oy+12,3,2);

  // Sly grin
  ctx.fillStyle=SKNDK;  ctx.fillRect(ox+8, oy+14,8,2);
  ctx.fillStyle='#EEE'; ctx.fillRect(ox+9, oy+14,2,2);ctx.fillRect(ox+13,oy+14,2,2);
  // Little fang
  ctx.fillStyle='#EEE'; ctx.fillRect(ox+11,oy+14,2,3);
}

function drawGoblinSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk={}; // not used — goblins have fixed green skin
  const hr=_hairPal(hairHex||HAIR_COLORS[1]);
  if(dir===1){
    ctx.save();ctx.translate(ox+24,oy);ctx.scale(-1,1);
    (gender==='female'?_drawFemaleGoblin:_drawMaleGoblin)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemaleGoblin:_drawMaleGoblin)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ORC SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Largest, widest silhouette. Grey-green skin, lower jaw tusks, tribal war
// markings. Heavy fur-trimmed leather and crude metal plate, great axe.
// Male: battle-scarred, war-painted face, massive frame, topknot hair.
// Female: war-painted, battle-braids, armoured but showing more muscle.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMaleOrc(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const SKIN='#5A7840',SKINHI='#748C50',SKINSH='#3C5428',SKINDK='#283C1C';
  const OUT='#080C04';
  const FUR='#4A3020',FURHI='#6A5030',FURSH='#2A1808';
  const PLATE='#4A4858',PLHI='#6A6878',PLSH='#2A2838';
  const BONE='#C8B890',BONEHI='#E0D0A8';
  const BOOT='#2A1808',BOOTHI='#4A3018';
  const AXE='#6A6870',AXEHI='#9A98A8';
  const AXHND='#4A3010',AXHHI='#7A5020';
  const MARK='#CC3018'; // war-paint red
  const TUSK='#E8D898',TUSKHI='#FFF0C0'; // tusk color

  // Shadow (very wide)
  ctx.fillStyle='#00000030';
  ctx.fillRect(ox-2,oy+42,30,3);

  // Great axe (behind, right side)
  if(dir!==1){
    ctx.fillStyle=AXHND;  ctx.fillRect(ox+22,oy+10+bob,4,28);
    ctx.fillStyle=AXHHI;  ctx.fillRect(ox+23,oy+10+bob,2,26);
    // Axe head (large)
    ctx.fillStyle=PLSH;   ctx.fillRect(ox+18,oy+8+bob,12,14);
    ctx.fillStyle=AXE;    ctx.fillRect(ox+19,oy+9+bob,11,13);
    ctx.fillStyle=AXEHI;  ctx.fillRect(ox+19,oy+9+bob,8,6);
    ctx.fillStyle=BONE;   ctx.fillRect(ox+19,oy+8+bob,11,2); // bone inlay
    ctx.fillStyle=BONEHI; ctx.fillRect(ox+19,oy+8+bob,9,1);
  }

  // Boots (heavy, fur-lined)
  [-2,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx,  oy+32,12,12);
    ctx.fillStyle=BOOT;   ctx.fillRect(ox+bx+1,oy+33,11,11);
    ctx.fillStyle=BOOTHI; ctx.fillRect(ox+bx+1,oy+33,10,3);
    // Fur trim
    ctx.fillStyle=FURSH;  ctx.fillRect(ox+bx+1,oy+33,10,2);
    ctx.fillStyle=FUR;    ctx.fillRect(ox+bx+2,oy+33,8,2);
    ctx.fillStyle=FURHI;  ctx.fillRect(ox+bx+2,oy+33,6,1);
    ctx.fillStyle=PLSH;   ctx.fillRect(ox+bx+8,oy+35,4,10); // shadow
  });

  // Legs (massive, fur-wrapped)
  const lY=24;
  ctx.fillStyle=OUT;   ctx.fillRect(ox-1, oy+lY+swing-1,12,10);
  ctx.fillStyle=FURSH; ctx.fillRect(ox+0, oy+lY+swing,  11,9);
  ctx.fillStyle=FUR;   ctx.fillRect(ox+1, oy+lY+swing,  9,9);
  ctx.fillStyle=FURHI; ctx.fillRect(ox+1, oy+lY+swing,  8,3);
  ctx.fillStyle=FURSH; ctx.fillRect(ox+8, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+14,oy+lY-swing-1,12,10);
  ctx.fillStyle=FUR;   ctx.fillRect(ox+15,oy+lY-swing,  9,9);
  ctx.fillStyle=FURHI; ctx.fillRect(ox+15,oy+lY-swing,  8,3);
  ctx.fillStyle=FURSH; ctx.fillRect(ox+22,oy+lY-swing,  3,9);

  // Torso (bob) — very wide
  ctx.save(); ctx.translate(0,bob);

  // Massive left arm
  ctx.fillStyle=OUT;    ctx.fillRect(ox-3, oy+10,9,18);
  ctx.fillStyle=SKINSH; ctx.fillRect(ox-2, oy+11,8,17);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox-2, oy+11,7,17);
  ctx.fillStyle=SKINHI; ctx.fillRect(ox-2, oy+11,6,6);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+4, oy+11,3,17);
  // Crude metal arm brace
  ctx.fillStyle=PLSH;   ctx.fillRect(ox-2, oy+20,7,4);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox-1, oy+21,6,3);
  ctx.fillStyle=BONE;   ctx.fillRect(ox-1, oy+21,6,1);

  // Massive right arm
  ctx.fillStyle=OUT;    ctx.fillRect(ox+18,oy+10,9,18);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+19,oy+11,7,17);
  ctx.fillStyle=SKINHI; ctx.fillRect(ox+19,oy+11,6,6);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+24,oy+11,3,17);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+19,oy+20,7,4);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+20,oy+21,6,3);
  ctx.fillStyle=BONE;   ctx.fillRect(ox+20,oy+21,6,1);

  // Broad chest (fur-trimmed plate)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+9,18,17);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+5, oy+10,16,16);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+6, oy+10,14,16);
  ctx.fillStyle=PLHI;   ctx.fillRect(ox+6, oy+10,12,6);
  ctx.fillStyle=FURSH;  ctx.fillRect(ox+6, oy+10,14,3); // fur collar
  ctx.fillStyle=FUR;    ctx.fillRect(ox+7, oy+10,12,3);
  ctx.fillStyle=FURHI;  ctx.fillRect(ox+8, oy+10,10,2);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+17,oy+10,3,16);
  // Bone trophy on chest
  ctx.fillStyle=BONE;   ctx.fillRect(ox+10,oy+16,6,5);
  ctx.fillStyle=BONEHI; ctx.fillRect(ox+11,oy+16,4,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+12,oy+16,2,5);ctx.fillRect(ox+10,oy+18,6,2);

  // Massive pauldrons (crude)
  [-4,18].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px,  oy+8,12,10);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox+px+1,oy+9,11,9);
    ctx.fillStyle=PLATE; ctx.fillRect(ox+px+1,oy+9,11,9);
    ctx.fillStyle=PLHI;  ctx.fillRect(ox+px+1,oy+9,10,4);
    ctx.fillStyle=FURSH; ctx.fillRect(ox+px+1,oy+9,10,3);
    ctx.fillStyle=FUR;   ctx.fillRect(ox+px+2,oy+9,8,3);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox+px+8,oy+10,4,8);
  });

  // Axe (facing left)
  if(dir===1){
    ctx.fillStyle=AXHND; ctx.fillRect(ox-2, oy+10,4,28);
    ctx.fillStyle=AXHHI; ctx.fillRect(ox-1, oy+10,2,26);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox-6, oy+8, 12,14);
    ctx.fillStyle=AXE;   ctx.fillRect(ox-6, oy+9, 11,13);
    ctx.fillStyle=AXEHI; ctx.fillRect(ox-6, oy+9, 8,6);
    ctx.fillStyle=BONE;  ctx.fillRect(ox-6, oy+8, 11,2);
    ctx.fillStyle=BONEHI;ctx.fillRect(ox-6, oy+8, 9,1);
  }

  ctx.restore();

  // Head — topknot hair (parametric)
  // Topknot
  ctx.fillStyle=OUT;    ctx.fillRect(ox+8, oy-6,8,8);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+9, oy-5,6,7);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+10,oy-5,4,6);
  ctx.fillStyle=hr.hi;  ctx.fillRect(ox+10,oy-5,3,3);

  // Face (scarred, heavy-browed)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+2,18,16);
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+5, oy+3,16,15);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+6, oy+3,14,14);
  ctx.fillStyle=SKINHI; ctx.fillRect(ox+6, oy+3,12,5);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+17,oy+3,3,14);
  // Heavy brow ridge
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+6, oy+6,14,2);

  // Eyes (red, burning)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7, oy+7,4,2);ctx.fillRect(ox+15,oy+7,4,2);
  ctx.fillStyle='#CC2010';ctx.fillRect(ox+8,oy+7,3,2);ctx.fillRect(ox+16,oy+7,3,2);
  ctx.fillStyle='#FF4020';ctx.fillRect(ox+8,oy+7,2,1);ctx.fillRect(ox+16,oy+7,2,1);

  // War paint (red diagonal slashes)
  ctx.fillStyle=MARK;
  ctx.fillRect(ox+6, oy+4,3,6); // left slash
  ctx.fillRect(ox+8, oy+4,2,4);
  ctx.fillRect(ox+17,oy+4,3,6); // right slash
  ctx.fillRect(ox+15,oy+4,2,4);
  // Nose (broad, flat)
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+10,oy+10,6,4);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+11,oy+10,4,4);

  // Tusks (lower jaw)
  ctx.fillStyle=TUSK;   ctx.fillRect(ox+8, oy+14,3,5);
  ctx.fillStyle=TUSKHI; ctx.fillRect(ox+9, oy+14,2,4);
  ctx.fillStyle=TUSK;   ctx.fillRect(ox+15,oy+14,3,5);
  ctx.fillStyle=TUSKHI; ctx.fillRect(ox+16,oy+14,2,4);

  // Mouth (grimace)
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+9, oy+13,8,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+10,oy+13,6,1);
}

function _drawFemaleOrc(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const SKIN='#5A7840',SKINHI='#748C50',SKINSH='#3C5428',SKINDK='#283C1C';
  const OUT='#080C04';
  const FUR='#4A3020',FURHI='#6A5030',FURSH='#2A1808';
  const PLATE='#4A4858',PLHI='#6A6878',PLSH='#2A2838';
  const BONE='#C8B890',BONEHI='#E0D0A8';
  const BOOT='#2A1808',BOOTHI='#4A3018';
  const AXE='#6A6870',AXEHI='#9A98A8';
  const AXHND='#4A3010',AXHHI='#7A5020';
  const MARK='#CC3018';
  const TUSK='#E8D898',TUSKHI='#FFF0C0';

  // Shadow
  ctx.fillStyle='#00000030';
  ctx.fillRect(ox+0,oy+42,26,3);

  // Axe
  if(dir!==1){
    ctx.fillStyle=AXHND; ctx.fillRect(ox+20,oy+12+bob,3,24);
    ctx.fillStyle=AXHHI; ctx.fillRect(ox+21,oy+12+bob,2,22);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox+17,oy+10+bob,9,12);
    ctx.fillStyle=AXE;   ctx.fillRect(ox+18,oy+11+bob,8,11);
    ctx.fillStyle=AXEHI; ctx.fillRect(ox+18,oy+11+bob,6,5);
    ctx.fillStyle=BONE;  ctx.fillRect(ox+18,oy+10+bob,8,2);
  }

  // Boots
  [0,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx,  oy+32,11,12);
    ctx.fillStyle=BOOT;   ctx.fillRect(ox+bx+1,oy+33,10,11);
    ctx.fillStyle=BOOTHI; ctx.fillRect(ox+bx+1,oy+33,9,3);
    ctx.fillStyle=FURSH;  ctx.fillRect(ox+bx+1,oy+33,9,2);
    ctx.fillStyle=FUR;    ctx.fillRect(ox+bx+2,oy+33,7,2);
    ctx.fillStyle=PLSH;   ctx.fillRect(ox+bx+7,oy+35,4,10);
  });

  // Legs
  const lY=25;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+1, oy+lY+swing-1,10,10);
  ctx.fillStyle=SKIN;  ctx.fillRect(ox+2, oy+lY+swing,  9,9); // bare muscle
  ctx.fillStyle=SKINHI;ctx.fillRect(ox+2, oy+lY+swing,  7,3);
  ctx.fillStyle=SKINDK;ctx.fillRect(ox+9, oy+lY+swing,  3,9);
  // Leg wrap (fur)
  ctx.fillStyle=FURSH; ctx.fillRect(ox+2, oy+lY+swing+3,9,3);
  ctx.fillStyle=FUR;   ctx.fillRect(ox+3, oy+lY+swing+3,7,2);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+14,oy+lY-swing-1,10,10);
  ctx.fillStyle=SKIN;  ctx.fillRect(ox+15,oy+lY-swing,  9,9);
  ctx.fillStyle=SKINHI;ctx.fillRect(ox+15,oy+lY-swing,  7,3);
  ctx.fillStyle=SKINDK;ctx.fillRect(ox+22,oy+lY-swing,  2,9);
  ctx.fillStyle=FURSH; ctx.fillRect(ox+15,oy+lY-swing+3,9,3);
  ctx.fillStyle=FUR;   ctx.fillRect(ox+16,oy+lY-swing+3,7,2);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Arms (bare muscular skin)
  ctx.fillStyle=OUT;    ctx.fillRect(ox-1, oy+11,8,16);
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+0, oy+12,7,15);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+0, oy+12,6,15);
  ctx.fillStyle=SKINHI; ctx.fillRect(ox+0, oy+12,5,6);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+5, oy+12,2,15);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+0, oy+21,6,3); // arm brace
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+1, oy+22,5,2);

  ctx.fillStyle=OUT;    ctx.fillRect(ox+17,oy+11,8,16);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+18,oy+12,6,15);
  ctx.fillStyle=SKINHI; ctx.fillRect(ox+18,oy+12,5,6);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+22,oy+12,3,15);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+18,oy+21,6,3);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+18,oy+22,5,2);

  // Chest armour (slightly narrower than male)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+10,16,17);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+6, oy+11,14,16);
  ctx.fillStyle=PLATE;  ctx.fillRect(ox+7, oy+11,12,16);
  ctx.fillStyle=PLHI;   ctx.fillRect(ox+7, oy+11,10,5);
  ctx.fillStyle=FURSH;  ctx.fillRect(ox+7, oy+11,12,3);
  ctx.fillStyle=FUR;    ctx.fillRect(ox+8, oy+11,10,2);
  ctx.fillStyle=FURHI;  ctx.fillRect(ox+9, oy+11,8,1);
  ctx.fillStyle=PLSH;   ctx.fillRect(ox+16,oy+11,3,16);
  // War trophy
  ctx.fillStyle=BONE;   ctx.fillRect(ox+10,oy+16,6,4);
  ctx.fillStyle=BONEHI; ctx.fillRect(ox+11,oy+16,4,2);
  ctx.fillStyle=OUT;    ctx.fillRect(ox+12,oy+17,2,3);

  // Pauldrons
  [-2,17].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px,  oy+9,10,9);
    ctx.fillStyle=PLATE; ctx.fillRect(ox+px+1,oy+10,9,8);
    ctx.fillStyle=PLHI;  ctx.fillRect(ox+px+1,oy+10,8,3);
    ctx.fillStyle=FURSH; ctx.fillRect(ox+px+1,oy+10,8,2);
    ctx.fillStyle=FUR;   ctx.fillRect(ox+px+2,oy+10,6,2);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox+px+6,oy+11,4,7);
  });

  // Axe (facing left)
  if(dir===1){
    ctx.fillStyle=AXHND; ctx.fillRect(ox+1, oy+12,3,24);
    ctx.fillStyle=AXHHI; ctx.fillRect(ox+1, oy+12,2,22);
    ctx.fillStyle=PLSH;  ctx.fillRect(ox-4, oy+10,9,12);
    ctx.fillStyle=AXE;   ctx.fillRect(ox-4, oy+11,8,11);
    ctx.fillStyle=AXEHI; ctx.fillRect(ox-4, oy+11,6,5);
    ctx.fillStyle=BONE;  ctx.fillRect(ox-4, oy+10,8,2);
  }

  ctx.restore();

  // Head — battle braids (parametric hair)
  // Braids
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+2, oy+0,4,18);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+3, oy+0,3,16);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+3, oy+0,2,14);
  ctx.fillStyle=hr.dk;  ctx.fillRect(ox+19,oy+0,4,18);
  ctx.fillStyle=hr.lo;  ctx.fillRect(ox+19,oy+0,3,16);
  ctx.fillStyle=hr.mid; ctx.fillRect(ox+20,oy+0,2,14);
  // Braid rings
  ctx.fillStyle=BONE;   ctx.fillRect(ox+2,oy+6,4,2);ctx.fillRect(ox+18,oy+6,4,2);
  ctx.fillStyle=BONE;   ctx.fillRect(ox+2,oy+12,4,2);ctx.fillRect(ox+18,oy+12,4,2);

  // Face
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+2,16,14);
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+6, oy+3,14,13);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+7, oy+3,12,12);
  ctx.fillStyle=SKINHI; ctx.fillRect(ox+7, oy+3,10,4);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+16,oy+3,3,12);
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+7, oy+5,12,2); // brow

  // Eyes
  ctx.fillStyle=OUT;    ctx.fillRect(ox+8, oy+6,3,2);ctx.fillRect(ox+15,oy+6,3,2);
  ctx.fillStyle='#CC2010';ctx.fillRect(ox+9,oy+6,2,2);ctx.fillRect(ox+16,oy+6,2,2);
  ctx.fillStyle='#FF4020';ctx.fillRect(ox+9,oy+6,1,1);ctx.fillRect(ox+16,oy+6,1,1);

  // War paint (different pattern — more elaborate markings)
  ctx.fillStyle=MARK;
  ctx.fillRect(ox+7, oy+3,2,8);  // left stripe
  ctx.fillRect(ox+17,oy+3,2,8);  // right stripe
  ctx.fillRect(ox+9, oy+3,8,2);  // forehead stripe

  // Nose + tusks (slightly smaller than male)
  ctx.fillStyle=SKINSH; ctx.fillRect(ox+11,oy+9,5,3);
  ctx.fillStyle=SKIN;   ctx.fillRect(ox+11,oy+9,4,3);
  ctx.fillStyle=TUSK;   ctx.fillRect(ox+9, oy+13,2,4);
  ctx.fillStyle=TUSKHI; ctx.fillRect(ox+9, oy+13,1,3);
  ctx.fillStyle=TUSK;   ctx.fillRect(ox+15,oy+13,2,4);
  ctx.fillStyle=TUSKHI; ctx.fillRect(ox+16,oy+13,1,3);
  ctx.fillStyle=SKINDK; ctx.fillRect(ox+9, oy+12,8,2); // mouth
}

function drawOrcSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk={};
  const hr=_hairPal(hairHex||HAIR_COLORS[1]);
  if(dir===1){
    ctx.save();ctx.translate(ox+28,oy);ctx.scale(-1,1); // widest flip for orc
    (gender==='female'?_drawFemaleOrc:_drawMaleOrc)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemaleOrc:_drawMaleOrc)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// ROBOT SPRITES
// ─────────────────────────────────────────────────────────────────────────────
// Fully mechanical — no skin or hair palette. Angular plate segments,
// articulated joints (circles at shoulders, elbows, hips), glowing visor.
// Color scheme: dark gunmetal chassis with cyan energy accents.
// Male: broader rectangular chassis, single antenna, laser pistol.
// Female: tapered chassis, twin antennae, more curved panel shaping.
// ═════════════════════════════════════════════════════════════════════════════

function _drawMaleRobot(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#080810';
  const MTAL='#3A4050',MTHI='#5A6070',MTSH='#222830',MTDK='#161C22';
  const CYAN='#20CCDD',CYANHI='#60F0FF',CYSH='#108899';
  const LITE='rgba(32,204,221,0.20)'; // energy glow
  const JOINT='#2A3038',JOIHI='#4A5060';
  const GUN='#2A2C34',GUNHI='#4A4C58';

  // Glow pulse (faint energy field)
  ctx.fillStyle=LITE; ctx.fillRect(ox+2,oy+0,20,44);

  // Shadow
  ctx.fillStyle='#00000030';
  ctx.fillRect(ox+3,oy+42,18,3);

  // Laser pistol / arm cannon (right side)
  if(dir!==1){
    ctx.fillStyle=OUT;   ctx.fillRect(ox+19,oy+22+bob,8,5);
    ctx.fillStyle=GUN;   ctx.fillRect(ox+20,oy+23+bob,7,4);
    ctx.fillStyle=GUNHI; ctx.fillRect(ox+20,oy+23+bob,6,2);
    ctx.fillStyle=CYAN;  ctx.fillRect(ox+25,oy+24+bob,3,2); // energy cell
    ctx.fillStyle=CYANHI;ctx.fillRect(ox+25,oy+24+bob,2,1);
    // barrel
    ctx.fillStyle=GUN;   ctx.fillRect(ox+26,oy+23+bob,4,4);
    ctx.fillStyle=CYAN;  ctx.fillRect(ox+28,oy+24+bob,2,2);
  }

  // Feet / boots (blocky robot feet)
  [-1,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx,  oy+36,10,8);
    ctx.fillStyle=MTSH;   ctx.fillRect(ox+bx+1,oy+37,9,7);
    ctx.fillStyle=MTAL;   ctx.fillRect(ox+bx+1,oy+37,9,7);
    ctx.fillStyle=MTHI;   ctx.fillRect(ox+bx+1,oy+37,8,3);
    ctx.fillStyle=CYAN;   ctx.fillRect(ox+bx+1,oy+38,8,1); // energy strip
    ctx.fillStyle=MTDK;   ctx.fillRect(ox+bx+7,oy+38,3,6);
  });

  // Leg segments (mechanical, walk swing)
  const lY=28;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+2, oy+lY+swing-1,9,10);
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+3, oy+lY+swing,  8,9);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+3, oy+lY+swing,  8,9);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+3, oy+lY+swing,  7,4);
  ctx.fillStyle=CYAN;  ctx.fillRect(ox+3, oy+lY+swing+4,7,1);
  ctx.fillStyle=MTDK;  ctx.fillRect(ox+8, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+13,oy+lY-swing-1,9,10);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+14,oy+lY-swing,  8,9);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+14,oy+lY-swing,  7,4);
  ctx.fillStyle=CYAN;  ctx.fillRect(ox+14,oy+lY-swing+4,7,1);
  ctx.fillStyle=MTDK;  ctx.fillRect(ox+19,oy+lY-swing,  3,9);
  // Hip joint circles
  ctx.fillStyle=JOINT; ctx.fillRect(ox+4, oy+lY+swing+7,5,3);
  ctx.fillStyle=JOIHI; ctx.fillRect(ox+5, oy+lY+swing+7,3,2);
  ctx.fillStyle=JOINT; ctx.fillRect(ox+15,oy+lY-swing+7,5,3);
  ctx.fillStyle=JOIHI; ctx.fillRect(ox+16,oy+lY-swing+7,3,2);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Left arm (mechanical segments)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+0, oy+14,5,14);
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+1, oy+15,4,13);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+1, oy+15,4,13);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+1, oy+15,3,5);
  // Elbow joint
  ctx.fillStyle=JOINT; ctx.fillRect(ox+1, oy+20,4,4);
  ctx.fillStyle=CYAN;  ctx.fillRect(ox+2, oy+21,2,2);
  ctx.fillStyle=CYANHI;ctx.fillRect(ox+2, oy+21,1,1);

  // Right arm
  ctx.fillStyle=OUT;   ctx.fillRect(ox+19,oy+14,5,14);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+19,oy+15,4,13);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+20,oy+15,3,5);
  ctx.fillStyle=JOINT; ctx.fillRect(ox+19,oy+20,4,4);
  ctx.fillStyle=CYAN;  ctx.fillRect(ox+20,oy+21,2,2);
  ctx.fillStyle=CYANHI;ctx.fillRect(ox+20,oy+21,1,1);

  // Chassis (rectangular, broad)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+4, oy+12,16,18);
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+5, oy+13,14,17);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+6, oy+13,12,17);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+6, oy+13,10,5);
  ctx.fillStyle=MTDK;  ctx.fillRect(ox+15,oy+13,3,17);
  // Panel lines
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+6, oy+20,12,1);
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+11,oy+13,1,17);
  // Cyan energy core (chest)
  ctx.fillStyle=CYSH;  ctx.fillRect(ox+8, oy+15,8,6);
  ctx.fillStyle=CYAN;  ctx.fillRect(ox+9, oy+16,6,4);
  ctx.fillStyle=CYANHI;ctx.fillRect(ox+9, oy+16,5,2);
  ctx.fillStyle='rgba(32,204,221,0.4)'; ctx.fillRect(ox+7,oy+14,10,8);

  // Shoulder joints (large circles)
  [-1,18].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px,  oy+12,7,7);
    ctx.fillStyle=JOINT; ctx.fillRect(ox+px+1,oy+13,5,5);
    ctx.fillStyle=JOIHI; ctx.fillRect(ox+px+1,oy+13,4,3);
    ctx.fillStyle=CYAN;  ctx.fillRect(ox+px+2,oy+14,2,2);
    ctx.fillStyle=CYANHI;ctx.fillRect(ox+px+2,oy+14,1,1);
  });

  // Arm cannon (facing left)
  if(dir===1){
    ctx.fillStyle=OUT;   ctx.fillRect(ox-3, oy+22,8,5);
    ctx.fillStyle=GUN;   ctx.fillRect(ox-3, oy+23,7,4);
    ctx.fillStyle=GUNHI; ctx.fillRect(ox-2, oy+23,6,2);
    ctx.fillStyle=CYAN;  ctx.fillRect(ox-3, oy+24,3,2);
    ctx.fillStyle=GUN;   ctx.fillRect(ox-7, oy+23,4,4);
    ctx.fillStyle=CYAN;  ctx.fillRect(ox-7, oy+24,2,2);
  }

  ctx.restore();

  // Head (angular, rectangular)
  // Antenna
  ctx.fillStyle=OUT;    ctx.fillRect(ox+11,oy-8,2,10);
  ctx.fillStyle=MTAL;   ctx.fillRect(ox+12,oy-7,1,8);
  ctx.fillStyle=CYAN;   ctx.fillRect(ox+11,oy-9,3,3);
  ctx.fillStyle=CYANHI; ctx.fillRect(ox+11,oy-9,2,2);

  // Head chassis
  ctx.fillStyle=OUT;    ctx.fillRect(ox+4, oy+0,16,14);
  ctx.fillStyle=MTSH;   ctx.fillRect(ox+5, oy+1,14,13);
  ctx.fillStyle=MTAL;   ctx.fillRect(ox+6, oy+1,12,12);
  ctx.fillStyle=MTHI;   ctx.fillRect(ox+6, oy+1,10,4);
  ctx.fillStyle=MTDK;   ctx.fillRect(ox+15,oy+1,3,12);
  // Panel seam
  ctx.fillStyle=MTSH;   ctx.fillRect(ox+6, oy+6,12,1);

  // Visor (wide cyan glow)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+4,14,5);
  ctx.fillStyle=CYSH;   ctx.fillRect(ox+6, oy+5,12,4);
  ctx.fillStyle=CYAN;   ctx.fillRect(ox+6, oy+5,12,3);
  ctx.fillStyle=CYANHI; ctx.fillRect(ox+6, oy+5,12,1);
  ctx.fillStyle='rgba(32,204,221,0.5)'; ctx.fillRect(ox+5,oy+4,14,5);

  // Mouth grille
  ctx.fillStyle=MTDK;   ctx.fillRect(ox+7, oy+9,10,3);
  ctx.fillStyle=MTSH;   ctx.fillRect(ox+8, oy+10,8,1);
  for(let i=0;i<4;i++) ctx.fillRect(ox+8+i*2,oy+9,1,3); // grille slits in MTSH
}

function _drawFemaleRobot(ctx,ox,oy,dir,f,swing,bob,sk,hr){
  const OUT='#080810';
  const MTAL='#3A3850',MTHI='#5A5878',MTSH='#222030',MTDK='#161428'; // slightly purple tint
  const CYAN='#20CCDD',CYANHI='#60F0FF',CYSH='#108899';
  const LITE='rgba(32,204,221,0.18)';
  const JOINT='#2A2838',JOIHI='#4A4860';
  const PURP='#8040C8',PURPHI='#A868E8'; // accent color (purple instead of gunmetal)

  // Glow
  ctx.fillStyle=LITE; ctx.fillRect(ox+3,oy+0,18,44);

  // Shadow
  ctx.fillStyle='#00000028';
  ctx.fillRect(ox+4,oy+42,16,3);

  // Feet (slightly narrower, pointed)
  [1,14].forEach(bx=>{
    ctx.fillStyle=OUT;    ctx.fillRect(ox+bx,  oy+36,9,8);
    ctx.fillStyle=MTSH;   ctx.fillRect(ox+bx+1,oy+37,8,7);
    ctx.fillStyle=MTAL;   ctx.fillRect(ox+bx+1,oy+37,8,7);
    ctx.fillStyle=MTHI;   ctx.fillRect(ox+bx+1,oy+37,7,3);
    ctx.fillStyle=PURP;   ctx.fillRect(ox+bx+1,oy+38,7,1);
    ctx.fillStyle=MTDK;   ctx.fillRect(ox+bx+6,oy+38,3,6);
  });

  // Leg segments
  const lY=28;
  ctx.fillStyle=OUT;   ctx.fillRect(ox+3, oy+lY+swing-1,8,10);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+4, oy+lY+swing,  7,9);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+4, oy+lY+swing,  6,4);
  ctx.fillStyle=PURP;  ctx.fillRect(ox+4, oy+lY+swing+4,6,1);
  ctx.fillStyle=MTDK;  ctx.fillRect(ox+8, oy+lY+swing,  3,9);
  ctx.fillStyle=OUT;   ctx.fillRect(ox+13,oy+lY-swing-1,8,10);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+13,oy+lY-swing,  7,9);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+14,oy+lY-swing,  6,4);
  ctx.fillStyle=PURP;  ctx.fillRect(ox+14,oy+lY-swing+4,6,1);
  ctx.fillStyle=MTDK;  ctx.fillRect(ox+18,oy+lY-swing,  3,9);

  // Torso (bob)
  ctx.save(); ctx.translate(0,bob);

  // Slender arms
  ctx.fillStyle=OUT;   ctx.fillRect(ox+2, oy+14,4,14);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+3, oy+15,3,13);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+3, oy+15,2,5);
  ctx.fillStyle=JOINT; ctx.fillRect(ox+3, oy+21,3,4);
  ctx.fillStyle=PURP;  ctx.fillRect(ox+3, oy+22,2,2);
  ctx.fillStyle=PURPHI;ctx.fillRect(ox+3, oy+22,1,1);

  ctx.fillStyle=OUT;   ctx.fillRect(ox+18,oy+14,4,14);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+18,oy+15,3,13);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+19,oy+15,2,5);
  ctx.fillStyle=JOINT; ctx.fillRect(ox+18,oy+21,3,4);
  ctx.fillStyle=PURP;  ctx.fillRect(ox+18,oy+22,2,2);
  ctx.fillStyle=PURPHI;ctx.fillRect(ox+18,oy+22,1,1);

  // Chassis (tapered, more curved panel styling)
  ctx.fillStyle=OUT;   ctx.fillRect(ox+5, oy+12,14,18);
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+6, oy+13,12,17);
  ctx.fillStyle=MTAL;  ctx.fillRect(ox+7, oy+13,10,17);
  ctx.fillStyle=MTHI;  ctx.fillRect(ox+7, oy+13,8,5);
  ctx.fillStyle=MTDK;  ctx.fillRect(ox+14,oy+13,3,17);
  // Curved panel lines
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+7, oy+19,10,1);
  ctx.fillStyle=MTSH;  ctx.fillRect(ox+11,oy+13,1,17);
  // Energy core (purple)
  ctx.fillStyle='#4010A0'; ctx.fillRect(ox+9, oy+15,6,5);
  ctx.fillStyle=PURP;  ctx.fillRect(ox+9, oy+15,5,4);
  ctx.fillStyle=PURPHI;ctx.fillRect(ox+10,oy+15,4,2);
  ctx.fillStyle='rgba(128,64,200,0.35)'; ctx.fillRect(ox+8,oy+14,8,7);

  // Shoulder joints (more rounded/organic shape)
  [4,15].forEach(px=>{
    ctx.fillStyle=OUT;   ctx.fillRect(ox+px,  oy+12,6,6);
    ctx.fillStyle=JOINT; ctx.fillRect(ox+px+1,oy+13,4,4);
    ctx.fillStyle=JOIHI; ctx.fillRect(ox+px+1,oy+13,3,2);
    ctx.fillStyle=PURP;  ctx.fillRect(ox+px+2,oy+14,1,2);
  });

  ctx.restore();

  // Head (slightly rounder, more tapered)
  // Twin antennae
  ctx.fillStyle=OUT;    ctx.fillRect(ox+7,oy-7,2,9); ctx.fillRect(ox+15,oy-7,2,9);
  ctx.fillStyle=MTAL;   ctx.fillRect(ox+8,oy-6,1,7); ctx.fillRect(ox+16,oy-6,1,7);
  ctx.fillStyle=PURP;   ctx.fillRect(ox+7,oy-8,2,2); ctx.fillRect(ox+15,oy-8,2,2);
  ctx.fillStyle=PURPHI; ctx.fillRect(ox+7,oy-8,1,1); ctx.fillRect(ox+15,oy-8,1,1);

  // Head chassis (slightly tapered)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+5, oy+0,14,13);
  ctx.fillStyle=MTSH;   ctx.fillRect(ox+6, oy+1,12,12);
  ctx.fillStyle=MTAL;   ctx.fillRect(ox+7, oy+1,10,11);
  ctx.fillStyle=MTHI;   ctx.fillRect(ox+7, oy+1,8,4);
  ctx.fillStyle=MTDK;   ctx.fillRect(ox+14,oy+1,3,11);

  // Visor (slightly narrower, more refined)
  ctx.fillStyle=OUT;    ctx.fillRect(ox+6, oy+4,12,4);
  ctx.fillStyle=CYSH;   ctx.fillRect(ox+7, oy+5,10,3);
  ctx.fillStyle=CYAN;   ctx.fillRect(ox+7, oy+5,10,2);
  ctx.fillStyle=CYANHI; ctx.fillRect(ox+7, oy+5,10,1);
  ctx.fillStyle='rgba(32,204,221,0.45)'; ctx.fillRect(ox+6,oy+4,12,4);

  // Mouth detail (more refined grille)
  ctx.fillStyle=MTDK;   ctx.fillRect(ox+8, oy+9,8,3);
  for(let i=0;i<3;i++) ctx.fillRect(ox+9+i*2,oy+9,1,3); // MTSH grille

  // Cheek panels (subtle detail marking)
  ctx.fillStyle=MTSH;   ctx.fillRect(ox+6, oy+5,2,4); ctx.fillRect(ox+16,oy+5,2,4);
  ctx.fillStyle=PURP;   ctx.fillRect(ox+6, oy+6,2,1); ctx.fillRect(ox+16,oy+6,2,1);
}

function drawRobotSprite(ctx,ox,oy,dir,frame,moving,gender,skinToneIdx,hairHex){
  const f=moving?(Math.floor(frame/4)%6):0;
  const swing=moving?_WK_SWING[f]:0;
  const bob=moving?_WK_BOB[f]:0;
  const sk={}; // unused for robot
  const hr={}; // unused for robot
  if(dir===1){
    ctx.save();ctx.translate(ox+24,oy);ctx.scale(-1,1);
    (gender==='female'?_drawFemaleRobot:_drawMaleRobot)(ctx,0,0,dir,f,swing,bob,sk,hr);
    ctx.restore();
  } else {
    (gender==='female'?_drawFemaleRobot:_drawMaleRobot)(ctx,ox,oy,dir,f,swing,bob,sk,hr);
  }
}

