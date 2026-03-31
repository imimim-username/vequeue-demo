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

function renderCeiling(ctx,zone,W,H,tick){
  ctx.clearRect(0,0,W,H);
  if(zone==='world')return;
  if(zone==='tavern')          drawTavernCeiling(ctx,W,tick);
  else if(zone==='governance') drawGovernanceCeiling(ctx,W,tick);
  else if(zone==='marketplace')drawMarketplaceCeiling(ctx,W,tick);
  else if(zone==='treasury')   drawTreasuryCeiling(ctx,W,tick);
  else if(zone==='dungeon')    drawDungeonCeiling(ctx,W,tick);
}

// ── INTERIOR BG ROUTER (cv-bg — solid zone color, behind tiles) ───────────────
function drawInteriorBG(ctx,zone,W,H,tick){
  const colors={tavern:'#1A0D00',governance:'#050A1A',marketplace:'#0D0020',treasury:'#000D00',dungeon:'#050008'};
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

// (drawInteriorBG is defined above, near ceiling helpers)

// ── PLAYER SPRITE ─────────────────────────────────────────────────────────────
// species-aware, hair-color-aware, direction+animation aware
function drawPlayerSprite(ctx,ox,oy,dir,color,frame,moving,godMode,species,hairColor,accessory){
  // ── Mega Man X–style armored hero sprite ─────────────────────────────────
  const sp=species||'human';
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
  } else if(sp==='dwarf'){
    // bushy beard below helmet
    ctx.fillStyle=hairSh;ctx.fillRect(ox+hx,  oy+hy+hh,  hw,  8);
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx+1,oy+hy+hh+1,hw-2,6);
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+2,oy+hy+hh+1,5,   2);
    // hair tuft at top
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,  oy+hy,     hw,  2);
  } else if(sp==='goblin'){
    // big round ears with inner detail
    ctx.fillStyle=sk.sk2; ctx.fillRect(ox+hx-5,oy+hy+2,5,8);
    ctx.fillStyle=sk.skin;ctx.fillRect(ox+hx-4,oy+hy+3,3,6);
    ctx.fillStyle=sk.sk2; ctx.fillRect(ox+hx+hw,oy+hy+2,5,8);
    ctx.fillStyle=sk.skin;ctx.fillRect(ox+hx+hw+1,oy+hy+3,3,6);
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
    // human / mage / rogue etc — hair visible above visor at helmet top
    ctx.fillStyle=hair;  ctx.fillRect(ox+hx,  oy+hy,hw,2);
    ctx.fillStyle=hairHL;ctx.fillRect(ox+hx+1,oy+hy,hw-2,1);
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

