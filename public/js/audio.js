// ── AUDIO SYSTEM ──────────────────────────────────────────────────────────────
let _actx = null;
let _sfxMuted = false;
function getAudioCtx(){
  if(!_actx) _actx = new (window.AudioContext||window.webkitAudioContext)();
  if(_actx.state==='suspended') _actx.resume();
  return _actx;
}
function _tone(freq, type, dur, vol, atk=0.005){
  if(_sfxMuted) return;
  const ctx=getAudioCtx(), o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type=type; o.frequency.value=freq;
  const t=ctx.currentTime;
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(vol,t+atk);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.start(t); o.stop(t+dur+0.05);
  return {o,g,t};
}
function _sweep(f0,f1,type,dur,vol){
  if(_sfxMuted) return;
  const ctx=getAudioCtx(), o=ctx.createOscillator(), g=ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type=type;
  const t=ctx.currentTime;
  o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.start(t); o.stop(t+dur+0.05);
}
function _noise(dur,vol,cutoff=3000){
  if(_sfxMuted) return;
  const ctx=getAudioCtx();
  const buf=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*dur),ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const src=ctx.createBufferSource(), flt=ctx.createBiquadFilter(), g=ctx.createGain();
  src.buffer=buf; flt.type='lowpass'; flt.frequency.value=cutoff;
  src.connect(flt); flt.connect(g); g.connect(ctx.destination);
  const t=ctx.currentTime;
  g.gain.setValueAtTime(vol,t);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.start(t); src.stop(t+dur+0.05);
}
function toggleMute(){
  _sfxMuted=!_sfxMuted;
  const btn=document.getElementById('hud-mute');
  if(btn) btn.textContent=_sfxMuted?'🔇':'🔊';
  if(!_sfxMuted) SFX.select(); // confirmation beep on unmute
}
const SFX = {
  step(){
    // Soft low thump
    _sweep(80,40,'sine',0.08,0.12);
  },
  swing(){
    // Sword whoosh: noise burst + high sweep
    _noise(0.12,0.25,5000);
    _sweep(900,300,'sawtooth',0.1,0.12);
  },
  hitEnemy(){
    _noise(0.07,0.35,2500);
    _sweep(320,180,'square',0.08,0.18);
  },
  hitPlayer(){
    _noise(0.15,0.45,1000);
    _sweep(160,80,'sawtooth',0.15,0.25);
  },
  enemyDeath(){
    _sweep(440,55,'square',0.45,0.28);
    setTimeout(()=>_noise(0.2,0.2,600),100);
  },
  coin(){
    _tone(880,'sine',0.18,0.2);
    setTimeout(()=>_tone(1320,'sine',0.18,0.18),90);
  },
  ticket(){
    _noise(0.04,0.35,4000);
    setTimeout(()=>{ _noise(0.03,0.25,6000); _tone(700,'square',0.07,0.12); },55);
  },
  door(){
    _sweep(220,110,'sawtooth',0.35,0.09);
    _noise(0.12,0.1,400);
  },
  levelUp(){
    const notes=[523,659,784,1047]; // C5 E5 G5 C6
    notes.forEach((f,i)=>setTimeout(()=>_tone(f,'square',0.28,0.22,0.01),i*90));
    setTimeout(()=>_tone(1568,'sine',0.4,0.25,0.01),notes.length*90);
  },
  potion(){
    for(let i=0;i<3;i++){
      setTimeout(()=>{
        const ctx=getAudioCtx();
        if(_sfxMuted) return;
        const f=380+Math.random()*180;
        _sweep(f,f*0.55,'sine',0.11,0.13);
      },i*110);
    }
  },
  battleStart(){
    // Dramatic minor chord stab
    [220,262,330,392].forEach(f=>{ _tone(f,'sawtooth',0.5,0.18,0.01); });
    setTimeout(()=>_noise(0.3,0.15,800),50);
  },
  victory(){
    const melody=[523,659,784,659,1047,1047];
    const times=[0,100,200,300,420,500];
    melody.forEach((f,i)=>setTimeout(()=>_tone(f,'square',0.28,0.22,0.01),times[i]));
  },
  gameOver(){
    const notes=[392,330,277,220];
    notes.forEach((f,i)=>setTimeout(()=>_tone(f,'sawtooth',0.45,0.2,0.02),i*220));
  },
  select(){
    _tone(660,'square',0.07,0.14);
  },
  buy(){
    _tone(523,'sine',0.1,0.18);
    setTimeout(()=>_tone(784,'sine',0.15,0.2),85);
  },
  error(){
    _tone(180,'square',0.18,0.28);
    setTimeout(()=>_tone(150,'square',0.18,0.28),130);
  },
  questComplete(){
    const notes=[523,784,1047,1568];
    notes.forEach((f,i)=>setTimeout(()=>_tone(f,'square',0.3,0.2,0.01),i*80));
  }
};

// ── MUSIC ─────────────────────────────────────────────────────────────────────
// Note frequency table
const N={_:0,
  B2:123.47,C3:130.81,D3:146.83,Eb3:155.56,E3:164.81,F3:174.61,G3:196.00,Ab3:207.65,A3:220.00,Bb3:233.08,B3:246.94,
  C4:261.63,D4:293.66,Eb4:311.13,E4:329.63,F4:349.23,G4:392.00,Ab4:415.30,A4:440.00,Bb4:466.16,B4:493.88,
  C5:523.25,D5:587.33,Eb5:622.25,E5:659.25,F5:698.46,G5:783.99,Ab5:830.61,A5:880.00,Bb5:932.33,B5:987.77,
  C6:1046.50,D6:1174.66,E6:1318.51};

// Zone music tracks: {bpm, mel:[[freq,beats],...], bass:[[freq,beats],...]}
// beats = quarter-note count; freq=0 is a rest
const MUS_TRACKS={
  world:{bpm:126,
    mel:[[N.E5,1],[N.G5,1],[N.A5,2],[N.G5,1],[N.E5,1],[N.D5,2],
         [N.C5,1],[N.E5,1],[N.G5,2],[N.A5,1],[N.G5,1],[N.E5,2],
         [N.D5,1],[N.F5,1],[N.G5,1],[N.A5,1],[N.G5,2],[N._,2],
         [N.C5,1],[N.D5,1],[N.E5,2],[N.G5,2],[N.C5,4]],
    bass:[[N.C3,2],[N.G3,2],[N.A3,2],[N.E3,2],
          [N.F3,2],[N.C3,2],[N.G3,2],[N.G3,2]]},
  wilderness:{bpm:88,
    mel:[[N.A4,2],[N.C5,1],[N._,1],[N.B4,2],[N.G4,2],
         [N.A4,1],[N.E4,1],[N.G4,2],[N.A4,4],
         [N.F4,2],[N.G4,2],[N.Eb4,2],[N.F4,2],
         [N.E4,2],[N._,2],[N.A4,4]],
    bass:[[N.A3,2],[N.E3,2],[N.A3,2],[N.C3,2],
          [N.D3,2],[N.A3,2],[N.E3,4]]},
  tavern:{bpm:160,
    mel:[[N.G5,1],[N.A5,1],[N.B5,1],[N.G5,1],[N.E5,2],[N._,2],
         [N.D5,1],[N.E5,1],[N.G5,2],[N.B5,1],[N.A5,1],[N.G5,2],
         [N.C5,1],[N.D5,1],[N.E5,1],[N.G5,1],[N.D5,2],[N._,2],
         [N.G4,1],[N.A4,1],[N.B4,2],[N.D5,2],[N.G5,4]],
    bass:[[N.G3,1],[N.D3,1],[N.G3,1],[N.D3,1],[N.E3,2],[N.C3,2],
          [N.D3,2],[N.G3,2],[N.C3,2],[N.G3,2]]},
  governance:{bpm:96,
    mel:[[N.D5,2],[N.F5,2],[N.A5,2],[N.G5,2],
         [N.F5,2],[N.Eb5,2],[N.D5,4],
         [N.C5,2],[N.Eb5,2],[N.G5,2],[N.Bb5,2],
         [N.A5,2],[N.G5,2],[N.F5,4]],
    bass:[[N.D3,4],[N.A3,4],[N.Bb3,4],[N.F3,4],
          [N.G3,4],[N.D3,4],[N.A3,4],[N.D3,4]]},
  marketplace:{bpm:144,
    mel:[[N.F5,1],[N.G5,1],[N.A5,1],[N.C6,1],[N.A5,2],[N._,2],
         [N.G5,1],[N.A5,1],[N.Bb5,1],[N.A5,1],[N.G5,2],[N.F5,2],
         [N.E5,1],[N.F5,1],[N.G5,2],[N.A5,2],[N.G5,2],
         [N.F5,2],[N.C5,2],[N.F5,4]],
    bass:[[N.F3,2],[N.C3,2],[N.D3,2],[N.Bb3,2],
          [N.C3,2],[N.F3,2],[N.G3,4]]},
  treasury:{bpm:92,
    mel:[[N.Eb5,2],[N.G5,2],[N.Bb5,2],[N.Ab5,2],
         [N.G5,2],[N.F5,2],[N.Eb5,4],
         [N.F5,2],[N.Ab5,2],[N.C6,2],[N.Bb5,2],
         [N.Ab5,2],[N.G5,2],[N.Eb5,4]],
    bass:[[N.Eb3,4],[N.Bb3,4],[N.Ab3,4],[N.F3,4],
          [N.G3,2],[N.Eb3,2],[N.Bb3,4],[N.Eb3,4]]},
  dungeon:{bpm:80,
    mel:[[N.E4,3],[N._,1],[N.D4,2],[N.B3,2],
         [N.G4,3],[N.F4,1],[N.E4,4],
         [N._,2],[N.A4,2],[N.G4,2],[N.F4,2],
         [N.E4,2],[N.D4,2],[N.E4,4]],
    bass:[[N.E3,4],[N.B3,4],[N.A3,4],[N.E3,4],
          [N.D3,2],[N.A3,2],[N.E3,8]]},
};

let _musGain=null,_musMuted=false,_musZone=null,_musSchedId=null;
let _musMel={idx:0,next:0},_musBass={idx:0,next:0};

function _musNote(freq,start,dur,type,vol){
  if(!freq||!_musGain)return;
  const c=getAudioCtx();
  const o=c.createOscillator(),g=c.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.001,start);
  g.gain.linearRampToValueAtTime(vol,start+0.015);
  g.gain.setValueAtTime(vol,start+dur*0.78);
  g.gain.linearRampToValueAtTime(0.001,start+dur*0.95);
  o.connect(g); g.connect(_musGain);
  o.start(start); o.stop(start+dur+0.05);
}
function _musSched(){
  const track=MUS_TRACKS[_musZone]; if(!track)return;
  const c=getAudioCtx();
  const now=c.currentTime,LA=0.15,spb=60/track.bpm;
  while(_musMel.next<now+LA){
    const[f,b]=track.mel[_musMel.idx%track.mel.length];
    _musNote(f,_musMel.next,spb*b*0.88,'square',0.09);
    _musMel.next+=spb*b; _musMel.idx++;
  }
  while(_musBass.next<now+LA){
    const[f,b]=track.bass[_musBass.idx%track.bass.length];
    _musNote(f,_musBass.next,spb*b*0.72,'triangle',0.13);
    _musBass.next+=spb*b; _musBass.idx++;
  }
}
function musPlay(zone){
  // Map 'world' tile zone → music track based on position (town vs wilderness)
  const key=MUS_TRACKS[zone]?zone:'world';
  if(_musZone===key)return;
  if(_musSchedId){clearInterval(_musSchedId);_musSchedId=null;}
  _musZone=key;
  const c=getAudioCtx();
  if(!_musGain){_musGain=c.createGain();_musGain.gain.value=_musMuted?0:0.22;_musGain.connect(c.destination);}
  _musMel={idx:0,next:c.currentTime+0.08};
  _musBass={idx:0,next:c.currentTime+0.08};
  _musSchedId=setInterval(_musSched,50);
}
function toggleMuteMusic(){
  _musMuted=!_musMuted;
  if(_musGain)_musGain.gain.value=_musMuted?0:0.22;
  document.getElementById('hud-mute-mus').textContent=_musMuted?'🎵':'🎶';
}

