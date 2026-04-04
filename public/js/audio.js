// ── SNES SPC700 + S-DSP Audio Emulation ──────────────────────────────────────
// Target quality: Mega Man X / Super Metroid OST
// Voices per track: lead melody, harmony, bass (8th-note drive), arp, pad, percussion
// Signal chain: sources → gain bus → gaussian LPF → destination (dry path)
//                                  → echo send → 125 ms delay → LPF → feedback loop
//                                                              → wet return → destination

'use strict';

let _actx      = null;
let _sfxMuted  = false;
let _snesOut   = null;   // master bus — all audio routes here
let _waves     = null;   // PeriodicWave timbres (cached)
let _noiseBuf  = null;   // shared noise buffer for percussion (cached)

// ── Audio context ─────────────────────────────────────────────────────────────
function getAudioCtx(){
  if(!_actx) _actx = new (window.AudioContext||window.webkitAudioContext)();
  if(_actx.state==='suspended') _actx.resume();
  return _actx;
}

// ── SNES signal chain ─────────────────────────────────────────────────────────
// Gaussian interpolation (SNES SPC700 runs at 32 kHz → gentle anti-alias brick)
// S-DSP echo: 125 ms delay, lowpass feedback, wet return
function _getOut(){
  if(_snesOut) return _snesOut;
  const ctx = getAudioCtx();
  const bus = ctx.createGain();
  bus.gain.value = 0.92;

  // Gaussian interpolation approximation — gentle lowpass ≈ 14 kHz
  const gauss = ctx.createBiquadFilter();
  gauss.type='lowpass'; gauss.frequency.value=14000; gauss.Q.value=0.35;

  // S-DSP echo chain
  const echoSend  = ctx.createGain();  echoSend.gain.value  = 0.32;
  const echoDelay = ctx.createDelay(1);echoDelay.delayTime.value = 0.125;
  const echoFilt  = ctx.createBiquadFilter();
  echoFilt.type='lowpass'; echoFilt.frequency.value=5200; echoFilt.Q.value=0.5;
  const echoFb    = ctx.createGain();  echoFb.gain.value    = 0.36;
  const echoWet   = ctx.createGain();  echoWet.gain.value   = 0.28;

  bus.connect(gauss);
  gauss.connect(ctx.destination);

  bus.connect(echoSend);
  echoSend.connect(echoDelay);
  echoDelay.connect(echoFilt);
  echoFilt.connect(echoFb);
  echoFb.connect(echoDelay);       // feedback loop
  echoFilt.connect(echoWet);
  echoWet.connect(ctx.destination);

  _snesOut = bus;
  return bus;
}

// ── Instrument PeriodicWaves ──────────────────────────────────────────────────
// 'lead'  — MMX guitar/synth lead: dominant odd harmonics (1,3,5,7,9)
// 'pad'   — lush string pad: smooth even+odd blend
// 'arp'   — bright harp/bell pluck: clean overtones, fast decay in ADSR
// 'bass'  — round finger bass: heavy fundamental + octave
// 'mel'   — warm mallet (SFX use)
// 'brass' — fanfare brass (title use)
function _getWaves(){
  if(_waves) return _waves;
  const ctx = getAudioCtx();
  const pw  = (r,i) => ctx.createPeriodicWave(new Float32Array(r), new Float32Array(r.length), {disableNormalization:false});

  // Lead — warm mellow synth: strong fundamental, gentle 2nd, fast rolloff
  // (was harsh/buzzy with 3rd=0.78, 5th=0.52 — now pleasant and round)
  const leadR=[0, 1.0, 0.28, 0.10, 0.038, 0.012, 0.004];

  // Pad — warm string pad: moderate harmonics, smooth rolloff
  // (was nearly sawtooth with 2nd=0.80 — now genuinely lush and warm)
  const padR =[0, 1.0, 0.44, 0.18, 0.07, 0.024, 0.007];

  // Arp — bright pluck: clean, fast-decaying bell/harp quality
  const arpR =[0, 1.0, 0.45, 0.16, 0.06, 0.02];

  // Bass — round, deep, punchy
  const bassR=[0, 1.0, 0.58, 0.14, 0.06, 0.02];

  // Mel — warm mallet (unchanged from original, used for SFX)
  const melR =[0, 1.0, 0.38, 0.14, 0.07, 0.03, 0.015, 0.006];

  // Brass — sawtooth-adjacent for fanfares
  const brR  =[0, 1.0, 0.50, 0.33, 0.25, 0.20, 0.17, 0.14, 0.12, 0.11, 0.10, 0.09, 0.08];

  // SFX reedy wave
  const sfxR =[0, 0.55, 0.90, 0.50, 0.28, 0.14, 0.06, 0.02];

  // Glass — crystal wine-glass shimmer: strong 3rd & 5th harmonics, fast rolloff
  const glassR=[0, 1.0, 0.06, 0.58, 0.02, 0.24, 0.01, 0.10, 0.01, 0.04];
  // Flute — open-pipe breath: fundamental dominant, strong 2nd, smooth rolloff
  const fluteR=[0, 1.0, 0.56, 0.08, 0.02, 0.005];

  const mk = r => ctx.createPeriodicWave(new Float32Array(r), new Float32Array(r.length), {disableNormalization:false});
  _waves = { lead:mk(leadR), pad:mk(padR), arp:mk(arpR), bass:mk(bassR),
             mel:mk(melR), brass:mk(brR), sfx:mk(sfxR),
             glass:mk(glassR), flute:mk(fluteR) };
  return _waves;
}

// ── Cached noise buffer for percussion (avoids re-allocation every hit) ───────
function _getNoiseBuf(){
  if(_noiseBuf) return _noiseBuf;
  const ctx=getAudioCtx(), SR=32000;
  _noiseBuf = ctx.createBuffer(1, SR, SR); // 1 second of noise
  const d = _noiseBuf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  return _noiseBuf;
}

// ── SNES ADSR note primitive ──────────────────────────────────────────────────
function _snesNote(freq, wave, start, dur, vol, atk=0.008, dec=0.07, sus=0.70, rel=0.05){
  if(!freq) return;
  const ctx=getAudioCtx(), out=_getOut();
  const o=ctx.createOscillator(), g=ctx.createGain();
  if(typeof wave==='string') o.type=wave;
  else o.setPeriodicWave(wave);
  o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol,        start+atk);
  g.gain.exponentialRampToValueAtTime(vol*sus, start+atk+dec);
  g.gain.setValueAtTime(vol*sus, start+dur-rel);
  g.gain.exponentialRampToValueAtTime(0.0001, start+dur);
  o.connect(g); g.connect(out);
  o.start(start); o.stop(start+dur+0.06);
}

// ── Noise primitive ───────────────────────────────────────────────────────────
function _snesNoise(start, dur, vol, cutoff=4000){
  if(_sfxMuted) return;
  const ctx=getAudioCtx(), out=_getOut(), SR=32000;
  const buf=ctx.createBuffer(1, Math.ceil(SR*dur), SR);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const src=ctx.createBufferSource(), flt=ctx.createBiquadFilter(), g=ctx.createGain();
  src.buffer=buf; flt.type='lowpass'; flt.frequency.value=cutoff;
  const t=start||ctx.currentTime;
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  src.connect(flt); flt.connect(g); g.connect(out);
  src.start(t); src.stop(t+dur+0.06);
}

// ── Percussion hit ────────────────────────────────────────────────────────────
// p = { k: kickVol, s: snareVol, h: hatVol }  (0 = skip that component)
function _percHit(p, t){
  if(!p) return;
  const ctx=getAudioCtx();
  // Route percussion through _musGain so mute/unmute applies to drums too
  const dest=_musGain||_getOut();

  // Kick: pitched sine sweep 110→35 Hz + low noise thump
  if(p.k){
    const ko=ctx.createOscillator(), kg=ctx.createGain();
    ko.frequency.setValueAtTime(110,t);
    ko.frequency.exponentialRampToValueAtTime(35, t+0.10);
    kg.gain.setValueAtTime(p.k*0.55,t);
    kg.gain.exponentialRampToValueAtTime(0.0001, t+0.14);
    ko.connect(kg); kg.connect(dest);
    ko.start(t); ko.stop(t+0.15);
    // Noise click attack
    const ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ng=ctx.createGain();
    ns.buffer=_getNoiseBuf(); nf.type='lowpass'; nf.frequency.value=200;
    ng.gain.setValueAtTime(p.k*0.18,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.05);
    ns.connect(nf); nf.connect(ng); ng.connect(dest);
    ns.start(t); ns.stop(t+0.06);
  }

  // Snare: noise band (2–5 kHz) + short pitched body
  if(p.s){
    const ns=ctx.createBufferSource(), nf=ctx.createBiquadFilter(), ng=ctx.createGain();
    ns.buffer=_getNoiseBuf(); nf.type='bandpass'; nf.frequency.value=3500; nf.Q.value=0.8;
    ng.gain.setValueAtTime(p.s*0.62,t); ng.gain.exponentialRampToValueAtTime(0.0001,t+0.11);
    ns.connect(nf); nf.connect(ng); ng.connect(dest);
    ns.start(t); ns.stop(t+0.12);
    // Snare body (180 Hz ping)
    const so=ctx.createOscillator(), sg=ctx.createGain();
    so.frequency.value=180;
    sg.gain.setValueAtTime(p.s*0.14,t); sg.gain.exponentialRampToValueAtTime(0.0001,t+0.06);
    so.connect(sg); sg.connect(dest);
    so.start(t); so.stop(t+0.07);
  }

  // Hi-hat: bright noise burst filtered at 9–12 kHz
  if(p.h){
    const hs=ctx.createBufferSource(), hf=ctx.createBiquadFilter(), hg=ctx.createGain();
    hs.buffer=_getNoiseBuf(); hf.type='highpass'; hf.frequency.value=8500;
    hg.gain.setValueAtTime(p.h*0.22,t); hg.gain.exponentialRampToValueAtTime(0.0001,t+0.045);
    hs.connect(hf); hf.connect(hg); hg.connect(dest);
    hs.start(t); hs.stop(t+0.05);
  }
}

// ── Legacy SFX shims ──────────────────────────────────────────────────────────
function _tone(freq, typeHint, dur, vol, atk=0.008){
  if(_sfxMuted) return;
  const w=_getWaves();
  const wave=typeHint==='sine'||typeHint==='triangle'?w.mel:w.sfx;
  _snesNote(freq, wave, getAudioCtx().currentTime, dur, vol, atk,
            Math.min(dur*0.25,0.08), 0.68, Math.min(dur*0.10,0.04));
}
function _sweep(f0, f1, typeHint, dur, vol){
  if(_sfxMuted) return;
  const ctx=getAudioCtx(), out=_getOut(), w=_getWaves();
  const wave=typeHint==='triangle'||typeHint==='sine'?w.mel:w.sfx;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.setPeriodicWave(wave);
  const t=ctx.currentTime;
  o.frequency.setValueAtTime(f0,t); o.frequency.exponentialRampToValueAtTime(f1,t+dur);
  g.gain.setValueAtTime(vol*0.9,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t+dur+0.06);
}
function _noise(dur, vol, cutoff=3000){
  if(_sfxMuted) return;
  _snesNoise(null, dur, vol, cutoff);
}

// ── Mute controls ─────────────────────────────────────────────────────────────
function toggleMute(){
  _sfxMuted=!_sfxMuted;
  const btn=document.getElementById('hud-mute');
  if(btn) btn.textContent=_sfxMuted?'🔇':'🔊';
  if(!_sfxMuted) SFX.select();
}

// ── SFX ───────────────────────────────────────────────────────────────────────
const SFX={
  step(){ _sweep(75,38,'triangle',0.07,0.10); },
  swing(){
    _snesNoise(null,0.11,0.22,5500);
    _sweep(850,280,'sawtooth',0.09,0.11);
  },
  hitEnemy(){
    _snesNoise(null,0.06,0.32,2800);
    _sweep(310,170,'square',0.07,0.16);
  },
  hitPlayer(){
    _snesNoise(null,0.14,0.42,1100);
    _sweep(155,75,'sawtooth',0.13,0.22);
  },
  enemyDeath(){
    _sweep(420,52,'square',0.44,0.26);
    setTimeout(()=>_snesNoise(null,0.18,0.18,650),100);
  },
  coin(){
    const w=_getWaves();
    _snesNote(880,w.mel,getAudioCtx().currentTime,0.20,0.22,0.005,0.05,0.65,0.06);
    _snesNote(1320,w.mel,getAudioCtx().currentTime+0.09,0.20,0.20,0.005,0.04,0.60,0.07);
  },
  ticket(){
    _snesNoise(null,0.04,0.30,4200);
    setTimeout(()=>{ _snesNoise(null,0.03,0.22,6500); _tone(700,'square',0.07,0.11); },55);
  },
  door(){
    _sweep(215,105,'sawtooth',0.33,0.08);
    _snesNoise(null,0.10,0.09,450);
  },
  levelUp(){
    const w=_getWaves(), ctx=getAudioCtx();
    [523,659,784,1047].forEach((f,i)=>
      setTimeout(()=>_snesNote(f,w.mel,ctx.currentTime,0.30,0.24,0.01,0.06,0.72,0.05),i*90));
    setTimeout(()=>_snesNote(1568,w.mel,getAudioCtx().currentTime,0.45,0.26,0.01,0.08,0.70,0.08),
               4*90);
  },
  potion(){
    const w=_getWaves();
    for(let i=0;i<3;i++) setTimeout(()=>{
      if(_sfxMuted) return;
      _snesNote(370+Math.random()*190,w.mel,getAudioCtx().currentTime,0.13,0.14,0.005,0.04,0.60,0.04);
    },i*115);
  },
  battleStart(){
    const w=_getWaves(), ctx=getAudioCtx();
    [220,262,330,392].forEach(f=>_snesNote(f,w.sfx,ctx.currentTime,0.5,0.16,0.01,0.10,0.68,0.06));
    setTimeout(()=>_snesNoise(null,0.28,0.13,900),50);
  },
  victory(){
    const w=_getWaves(), ctx=getAudioCtx();
    const mel=[523,659,784,659,1047,1047], times=[0,100,200,300,420,500];
    mel.forEach((f,i)=>setTimeout(()=>_snesNote(f,w.mel,ctx.currentTime,0.30,0.24,0.01,0.06,0.70,0.05),times[i]));
  },
  gameOver(){
    const w=_getWaves(), ctx=getAudioCtx();
    [392,330,277,220].forEach((f,i)=>
      setTimeout(()=>_snesNote(f,w.sfx,ctx.currentTime,0.48,0.20,0.02,0.12,0.65,0.08),i*220));
  },
  select(){ _tone(660,'square',0.07,0.13); },
  buy(){
    const w=_getWaves(), ctx=getAudioCtx();
    _snesNote(523,w.mel,ctx.currentTime,0.12,0.18,0.005,0.04,0.65,0.04);
    _snesNote(784,w.mel,ctx.currentTime+0.088,0.16,0.20,0.005,0.05,0.68,0.05);
  },
  error(){
    _tone(175,'square',0.17,0.26);
    setTimeout(()=>_tone(148,'square',0.17,0.26),130);
  },
  questComplete(){
    const w=_getWaves(), ctx=getAudioCtx();
    [523,784,1047,1568].forEach((f,i)=>
      setTimeout(()=>_snesNote(f,w.mel,ctx.currentTime,0.32,0.22,0.01,0.07,0.70,0.06),i*80));
  },
};

// ── Note frequency table (all semitones, 3 usable octaves) ───────────────────
const N={_:0,
  C2:65.41, D2:73.42, Eb2:77.78, E2:82.41, F2:87.31, G2:98.00, Ab2:103.83, A2:110.00, Bb2:116.54, B2:123.47,
  C3:130.81, Db3:138.59, D3:146.83, Eb3:155.56, E3:164.81, F3:174.61, Gb3:185.00, G3:196.00, Ab3:207.65, A3:220.00, Bb3:233.08, B3:246.94,
  C4:261.63, Db4:277.18, D4:293.66, Eb4:311.13, E4:329.63, F4:349.23, Gb4:369.99, G4:392.00, Ab4:415.30, A4:440.00, Bb4:466.16, B4:493.88,
  C5:523.25, Db5:554.37, D5:587.33, Eb5:622.25, E5:659.25, F5:698.46, Gb5:739.99, G5:783.99, Ab5:830.61, A5:880.00, Bb5:932.33, B5:987.77,
  C6:1046.50, Db6:1108.73, D6:1174.66, Eb6:1244.51, E6:1318.51, F6:1396.91, G6:1567.98, A6:1760.00,
};

// ── Percussion patterns (8 slots = 1 bar of 4/4, each slot = 1 eighth note) ──
// k=kick, s=snare, h=hi-hat (values are volume, 0=silent)
const PERC={
  // Standard MMX rock drive
  rock:[
    {k:.85,h:.45},{h:.28},{s:.72,h:.38},{h:.28},
    {k:.62,h:.45},{h:.28},{s:.72,h:.38},{h:.28},
  ],
  // Double kick on beat 3-and (action stages)
  drive:[
    {k:.88,h:.48},{h:.28},{s:.75,h:.40},{h:.28},
    {k:.65,h:.45},{k:.55,h:.28},{s:.75,h:.40},{h:.28},
  ],
  // Syncopated kick (funky marketplace feel)
  funk:[
    {k:.80,h:.45},{h:.28},{s:.68,h:.38},{k:.40,h:.28},
    {h:.45},{k:.58,h:.28},{s:.70,h:.38},{h:.28},
  ],
  // Half-time feel (slower, more spacious — tavern)
  half:[
    {k:.80,h:.40},{h:.25},{h:.35},{h:.25},
    {s:.70,h:.40},{h:.25},{k:.55,h:.35},{h:.25},
  ],
  // Slow atmospheric (dungeon/ruins)
  atmo:[
    {k:.60},{},{s:.45},{},
    {k:.40},{},{s:.42},{},
  ],
  // No drums (cavern, village ambience)
  none:[],
};

// ── Zone music tracks ─────────────────────────────────────────────────────────
// mel/harm/bass/arp/pad : [[freq, quarterBeats], ...]   N._=0 for rests
// *Wave : 'lead'|'pad'|'arp'|'bass'|'mel'|'brass'|'glass'|'flute'
// *Vol  : peak gain for that voice
// melAtk/melSus : optional per-track melody ADSR overrides
const MUS_TRACKS={

  // ── Title / character creation ── C major, 104 BPM, sweeping heroic fanfare
  title:{bpm:104, melWave:'brass', melVol:0.10, harmWave:'pad', harmVol:0.07,
         bassWave:'bass', bassVol:0.13, arpWave:'arp', arpVol:0.06,
         padWave:'pad', padVol:0.05, perc:'rock',
    mel:[
      [N.C5,.5],[N.E5,.5],[N.G5,.5],[N.C6,.5],[N.B5,1],[N.A5,1],
      [N.G5,.5],[N.A5,.5],[N.B5,.5],[N.C6,.5],[N.D6,1],[N.C6,1],
      [N.E6,.5],[N.D6,.5],[N.C6,1],[N.B5,1],[N.G5,1],
      [N.F5,.5],[N.G5,.5],[N.A5,.5],[N.B5,.5],[N.C6,2],
      [N.G5,.5],[N.C6,.5],[N.B5,.5],[N.A5,.5],[N.G5,1],[N.E5,1],
      [N.F5,1],[N.A5,1],[N.G5,1],[N.E5,1],
      [N.D5,.5],[N.F5,.5],[N.G5,.5],[N.A5,.5],[N.G5,1],[N.F5,1],
      [N.C5,2],[N._,2],
    ],
    harm:[
      [N.E5,1],[N.G5,1],[N.E5,1],[N.C5,1],
      [N.G5,2],[N.F5,2],
      [N.C6,2],[N.G5,2],
      [N.D5,2],[N.G5,2],
      [N.E5,2],[N.C5,2],
      [N.D5,1],[N.F5,1],[N.E5,1],[N.C5,1],
      [N.B4,2],[N.D5,2],
      [N.E5,2],[N._,2],
    ],
    bass:[
      [N.C3,.5],[N.G3,.5],[N.C4,.5],[N.G3,.5],[N.E3,.5],[N.G3,.5],[N.C3,.5],[N.G3,.5],
      [N.G2,.5],[N.D3,.5],[N.G3,.5],[N.D3,.5],[N.B3,.5],[N.D3,.5],[N.G2,.5],[N.D3,.5],
      [N.A2,.5],[N.E3,.5],[N.A3,.5],[N.E3,.5],[N.C3,.5],[N.G3,.5],[N.E3,.5],[N.G3,.5],
      [N.F2,.5],[N.C3,.5],[N.F3,.5],[N.C3,.5],[N.E3,.5],[N.G3,.5],[N.C4,.5],[N.G3,.5],
      [N.C3,.5],[N.G3,.5],[N.E3,.5],[N.G3,.5],[N.A2,.5],[N.E3,.5],[N.C3,.5],[N.E3,.5],
      [N.F2,.5],[N.C3,.5],[N.F3,.5],[N.A3,.5],[N.G2,.5],[N.D3,.5],[N.G3,.5],[N.D3,.5],
      [N.G2,.5],[N.D3,.5],[N.F3,.5],[N.D3,.5],[N.G2,.5],[N.D3,.5],[N.F3,.5],[N.D3,.5],
      [N.C3,2],[N.G3,2],
    ],
    arp:[
      // Quarter-note arp — sweeping chord tones without machine-gun density
      [N.C5,1],[N.E5,1],[N.G5,1],[N.C6,1],
      [N.G4,1],[N.D5,1],[N.G5,1],[N.B5,1],
      [N.A4,1],[N.E5,1],[N.A5,1],[N.C6,1],
      [N.F4,1],[N.C5,1],[N.F5,1],[N.A5,1],
      [N.C5,1],[N.E5,1],[N.G5,1],[N.C6,1],
      [N.F4,1],[N.A4,1],[N.C5,1],[N.F5,1],
      [N.G4,1],[N.B4,1],[N.D5,1],[N.G5,1],
      [N.C5,2],[N.G5,2],
    ],
    pad:[
      [N.C4,4],[N.G3,4],[N.A3,4],[N.F3,4],
      [N.C4,4],[N.G3,4],[N.G3,4],[N.C4,4],
    ],
  },

  // ── Town Square ── C major, 100 BPM, warm and singable (8-bar loop)
  world:{bpm:100, melWave:'lead', melVol:0.12, harmWave:'pad', harmVol:0.06,
         bassWave:'bass', bassVol:0.12, arpWave:'arp', arpVol:0.06,
         padWave:'pad', padVol:0.06, perc:'rock',
    mel:[
      // A phrase (bars 1-4): ascending motif — simple, memorable, singable
      [N.C5,1],[N.E5,1],[N.G5,1],[N.A5,1],
      [N.G5,2],[N.E5,1],[N.C5,1],
      [N.F5,1],[N.G5,1],[N.A5,1],[N.B5,1],
      [N.C6,2],[N._,2],
      // B phrase (bars 5-8): development — rises, breathes, resolves
      [N.B5,1],[N.A5,.5],[N.G5,.5],[N.E5,1],[N.G5,1],
      [N.F5,2],[N.D5,1],[N.E5,1],
      [N.G5,.5],[N.A5,.5],[N.G5,.5],[N.F5,.5],[N.E5,1],[N.D5,1],
      [N.C5,2],[N.G4,2],
    ],
    harm:[
      // Half-note harmony — chords breathe underneath melody
      [N.E5,2],[N.C5,2],
      [N.C5,2],[N.G4,2],
      [N.D5,2],[N.F5,2],
      [N.E5,2],[N.G5,2],
    ],
    bass:[
      // Quarter-note walking bass — one note per beat, much more musical
      [N.C3,1],[N.G3,1],[N.C3,1],[N.E3,1],
      [N.G2,1],[N.D3,1],[N.G3,1],[N.E3,1],
      [N.F2,1],[N.C3,1],[N.F3,1],[N.A3,1],
      [N.G2,1],[N.D3,1],[N.G3,1],[N.B3,1],
      [N.C3,1],[N.G3,1],[N.E3,1],[N.A3,1],
      [N.G2,1],[N.D3,1],[N.G3,1],[N.F3,1],
      [N.A2,1],[N.E3,1],[N.F2,1],[N.C3,1],
      [N.G2,1],[N.D3,1],[N.G2,1],[N.C3,1],
    ],
    arp:[
      // Quarter-note arp with rests — harp plucks, not a machine gun
      [N.C5,1],[N._,1],[N.G5,1],[N._,1],
      [N.E5,1],[N._,1],[N.A4,1],[N._,1],
      [N.F4,1],[N._,1],[N.C5,1],[N._,1],
      [N.G4,1],[N._,1],[N.D5,1],[N._,1],
    ],
    pad:[
      [N.C4,4],[N.A3,4],[N.F3,4],[N.G3,4],
    ],
  },

  // ── Wilderness ── A minor, 132 BPM, dark and driving with Phrygian inflection
  wilderness:{bpm:132, melWave:'lead', melVol:0.12, harmWave:'lead', harmVol:0.06,
               bassWave:'bass', bassVol:0.15, arpWave:'arp', arpVol:0.07,
               padWave:'pad', padVol:0.05, perc:'drive',
    mel:[
      [N.A5,.5],[N.G5,.5],[N.A5,.5],[N.C6,.5],[N.B5,1],[N.A5,1],
      [N.G5,.5],[N.F5,.5],[N.G5,.5],[N.A5,.5],[N.G5,1],[N.E5,1],
      [N.F5,.5],[N.G5,.5],[N.A5,.5],[N.Bb5,.5],[N.A5,.5],[N.G5,.5],[N.E5,.5],[N.F5,.5],
      [N.E5,2],[N.A4,2],
    ],
    harm:[
      [N.C5,1],[N.E5,1],[N.D5,2],
      [N.B4,1],[N.C5,1],[N.B4,2],
      [N.D5,2],[N.C5,2],
      [N.C5,2],[N.A4,2],
    ],
    bass:[
      [N.A2,.5],[N.E3,.5],[N.A2,.5],[N.C3,.5],[N.E3,.5],[N.A2,.5],[N.E3,.5],[N.C3,.5],
      [N.G2,.5],[N.D3,.5],[N.G3,.5],[N.D3,.5],[N.G2,.5],[N.D3,.5],[N.B2,.5],[N.D3,.5],
      [N.F2,.5],[N.C3,.5],[N.F3,.5],[N.C3,.5],[N.F2,.5],[N.C3,.5],[N.A2,.5],[N.C3,.5],
      [N.E2,.5],[N.B2,.5],[N.E3,.5],[N.B2,.5],[N.E2,.5],[N.B2,.5],[N.A2,.5],[N.E3,.5],
    ],
    arp:[
      // Quarter-note arp — one per beat, rest on beat 4 for breathing room
      [N.A4,1],[N.C5,1],[N.E5,1],[N._,1],
      [N.G4,1],[N.B4,1],[N.D5,1],[N._,1],
      [N.F4,1],[N.A4,1],[N.C5,1],[N._,1],
      [N.E4,1],[N.Ab4,1],[N.B4,1],[N._,1],
    ],
    pad:[
      [N.A3,4],[N.G3,4],[N.F3,4],[N.E3,4],
    ],
  },

  // ── Tavern ── G major, 138 BPM, singable folk melody (8-bar loop)
  tavern:{bpm:138, melWave:'lead', melVol:0.12, harmWave:'pad', harmVol:0.06,
          bassWave:'bass', bassVol:0.12, arpWave:'arp', arpVol:0.06,
          padWave:'pad', padVol:0.05, perc:'half',
    mel:[
      // A phrase (bars 1-4): joyful opening — stepping up in G major
      [N.G5,1],[N.A5,.5],[N.G5,.5],[N.E5,1],[N.D5,1],
      [N.G5,2],[N.D5,2],
      [N.E5,.5],[N.Gb5,.5],[N.G5,.5],[N.A5,.5],[N.B5,1],[N.A5,1],
      [N.G5,2],[N._,2],
      // B phrase (bars 5-8): reach up then resolve home
      [N.D6,1],[N.C6,.5],[N.B5,.5],[N.A5,1],[N.G5,1],
      [N.A5,1],[N.B5,1],[N.A5,1],[N.Gb5,1],
      [N.G5,.5],[N.A5,.5],[N.B5,.5],[N.G5,.5],[N.D5,1],[N.E5,1],
      [N.G5,2],[N.D5,2],
    ],
    harm:[
      // Half-note harmony — chords breathe underneath
      [N.B4,2],[N.D5,2],
      [N.G4,2],[N.C5,2],
      [N.A4,2],[N.D5,2],
      [N.G4,2],[N.D5,2],
    ],
    bass:[
      // Quarter-note walking bass — gives dance energy without bustle
      [N.G2,1],[N.D3,1],[N.G3,1],[N.B3,1],
      [N.C3,1],[N.G3,1],[N.E3,1],[N.C3,1],
      [N.D3,1],[N.A3,1],[N.Gb3,1],[N.D3,1],
      [N.G2,1],[N.D3,1],[N.G3,1],[N.B3,1],
    ],
    arp:[
      // Quarter-note plucks with rests — sparkle without clutter
      [N.G4,1],[N._,1],[N.D5,1],[N.B4,1],
      [N.C4,1],[N._,1],[N.G4,1],[N.E4,1],
      [N.D4,1],[N._,1],[N.A4,1],[N.Gb4,1],
      [N.G4,1],[N._,1],[N.B4,1],[N.D5,1],
    ],
    pad:[
      [N.G3,4],[N.C4,4],[N.D3,4],[N.G3,4],
    ],
  },

  // ── Governance Hall ── D minor, 88 BPM, stately and authoritative
  governance:{bpm:88, melWave:'lead', melVol:0.11, harmWave:'pad', harmVol:0.07,
               bassWave:'bass', bassVol:0.13, arpWave:'arp', arpVol:0.05,
               padWave:'pad', padVol:0.06, perc:'atmo',
    mel:[
      [N.D5,.5],[N.F5,.5],[N.A5,.5],[N.F5,.5],[N.D5,1],[N.E5,1],
      [N.F5,1],[N.E5,.5],[N.D5,.5],[N.C5,1],[N.A4,1],
      [N.Bb4,.5],[N.D5,.5],[N.F5,.5],[N.G5,.5],[N.A5,1],[N.Bb5,1],
      [N.A5,2],[N.D5,2],
    ],
    harm:[
      [N.A4,2],[N.F4,2],
      [N.D5,2],[N.F4,2],
      [N.G4,2],[N.D5,2],
      [N.F5,2],[N.A4,2],
    ],
    bass:[
      // Quarter-note walking bass — stately, not rushed (D minor)
      [N.D3,1],[N.A3,1],[N.D3,1],[N.F3,1],
      [N.Bb2,1],[N.F3,1],[N.Bb2,1],[N.D3,1],
      [N.G2,1],[N.D3,1],[N.G2,1],[N.Bb3,1],
      [N.A2,1],[N.E3,1],[N.A2,1],[N.C3,1],
    ],
    arp:[
      // Half-note arp with rests — sparse and dignified
      [N.D4,2],[N._,2],
      [N.Bb3,2],[N._,2],
      [N.G3,2],[N._,2],
      [N.A3,2],[N._,2],
    ],
    pad:[
      [N.D4,4],[N.Bb3,4],[N.G3,4],[N.A3,4],
    ],
  },

  // ── Marketplace ── F major, 132 BPM, bustling merchant energy
  marketplace:{bpm:132, melWave:'lead', melVol:0.11, harmWave:'pad', harmVol:0.06,
                bassWave:'bass', bassVol:0.14, arpWave:'arp', arpVol:0.07,
                padWave:'pad', padVol:0.04, perc:'funk',
    mel:[
      [N.F5,.5],[N.A5,.5],[N.C6,.5],[N.A5,.5],[N.F5,1],[N.G5,1],
      [N.A5,.5],[N.Bb5,.5],[N.A5,.5],[N.G5,.5],[N.F5,1],[N.E5,1],
      [N.F5,.5],[N.G5,.5],[N.A5,.5],[N.C6,.5],[N.Bb5,1],[N.A5,1],
      [N.G5,2],[N.F5,2],
    ],
    harm:[
      [N.C5,2],[N.E5,2],
      [N.F5,2],[N.C5,2],
      [N.D5,2],[N.F5,2],
      [N.E5,2],[N.C5,2],
    ],
    bass:[
      [N.F2,.5],[N.C3,.5],[N.F3,.5],[N.A3,.5],[N.F2,.5],[N.C3,.5],[N.A3,.5],[N.C3,.5],
      [N.C3,.5],[N.G3,.5],[N.C3,.5],[N.E3,.5],[N.C3,.5],[N.G3,.5],[N.E3,.5],[N.G3,.5],
      [N.Bb2,.5],[N.F3,.5],[N.Bb2,.5],[N.D3,.5],[N.Bb2,.5],[N.F3,.5],[N.D3,.5],[N.F3,.5],
      [N.C3,.5],[N.G3,.5],[N.C3,.5],[N.E3,.5],[N.C3,.5],[N.G3,.5],[N.C4,.5],[N.G3,.5],
    ],
    arp:[
      // Syncopated quarter-note arp — rest on beat 3 for funky marketplace feel
      [N.F4,1],[N.A4,1],[N._,1],[N.C5,1],
      [N.C4,1],[N.E4,1],[N._,1],[N.G4,1],
      [N.Bb3,1],[N.D4,1],[N._,1],[N.F4,1],
      [N.C4,1],[N.G4,1],[N._,1],[N.E4,1],
    ],
    pad:[
      [N.F3,4],[N.C3,4],[N.Bb3,4],[N.C3,4],
    ],
  },

  // ── Treasury ── C minor, 80 BPM, heavy vault authority (darker than Eb major)
  treasury:{bpm:80, melWave:'lead', melVol:0.11, harmWave:'pad', harmVol:0.07,
             bassWave:'bass', bassVol:0.15, arpWave:'arp', arpVol:0.05,
             padWave:'pad', padVol:0.07, perc:'atmo',
    mel:[
      [N.C5,.5],[N.Eb5,.5],[N.G5,.5],[N.Eb5,.5],[N.C5,1],[N.D5,1],
      [N.Eb5,1],[N.D5,.5],[N.C5,.5],[N.Bb4,1],[N.G4,1],
      [N.Ab4,.5],[N.C5,.5],[N.Eb5,.5],[N.F5,.5],[N.G5,1],[N.Ab5,1],
      [N.G5,2],[N.C5,2],
    ],
    harm:[
      [N.G4,2],[N.Bb4,2],
      [N.Eb5,2],[N.G4,2],
      [N.Eb4,2],[N.G4,2],
      [N.Bb4,2],[N.G4,2],
    ],
    bass:[
      // Powerful — mix of sustained and walking
      [N.C3,1],[N.G3,1],[N.C3,1],[N.Eb3,1],
      [N.Ab2,1],[N.Eb3,1],[N.Ab2,1],[N.Bb2,1],
      [N.Eb2,.5],[N.Bb2,.5],[N.Eb3,.5],[N.G3,.5],[N.Eb2,.5],[N.Bb2,.5],[N.G2,.5],[N.Bb2,.5],
      [N.C3,1],[N.G2,1],[N.Eb3,1],[N.C3,1],
    ],
    arp:[
      // Sparse half-note arp — the vault has weight, not chatter
      [N.C4,2],[N._,2],
      [N.Ab3,2],[N._,2],
      [N.Eb3,2],[N._,2],
      [N.G3,2],[N._,2],
    ],
    pad:[
      [N.C3,4],[N.Ab3,4],[N.Eb3,4],[N.G3,4],
    ],
  },

  // ── Ancient Dungeon ── E Phrygian, 70 BPM, sparse and ominous
  // E Phrygian: E-F-G-A-B-C-D. The bII (F) gives a distinctly dark, ancient flavor.
  dungeon:{bpm:70, melWave:'lead', melVol:0.09, harmWave:'pad', harmVol:0.06,
            bassWave:'bass', bassVol:0.13, arpWave:'glass', arpVol:0.05,
            padWave:'pad', padVol:0.08, perc:'atmo',
    mel:[
      // Very sparse — long rests let the room breathe
      [N.E5,.5],[N.D5,.5],[N.B4,.5],[N.D5,.5],[N.E5,1],[N._,1],
      [N.G5,.5],[N.F5,.5],[N.E5,1],[N.D5,1],[N.B4,1],
      [N.C5,.5],[N.B4,.5],[N.A4,1],[N.G4,1],[N._,1],
      [N.B4,2],[N.E4,2],
    ],
    harm:[
      [N.B4,2],[N.G4,2],
      [N.C5,2],[N.G4,2],
      [N.A4,2],[N.E4,2],
      [N.G4,2],[N.E4,2],
    ],
    bass:[
      // Pedal E with slow, deliberate movement
      [N.E3,1],[N.B3,1],[N.E3,1],[N.G3,1],
      [N.C3,1],[N.G3,1],[N.F3,1],[N.G3,1],
      [N.A2,1],[N.E3,1],[N.A2,1],[N.C3,1],
      [N.E3,2],[N.B2,2],
    ],
    arp:[
      // Crystal glass arp — sparse shimmers in the silence
      [N.E5,2],[N._,2],
      [N.B5,2],[N._,2],
      [N.G4,2],[N._,2],
      [N.D5,2],[N._,2],
    ],
    pad:[
      // Heavy, slow-attack pad — the dungeon breathes
      [N.E3,4],[N.C3,4],[N.A2,4],[N.B2,4],
    ],
  },

  // ── Crystal Cavern ── D minor, 58 BPM, near-ambient and mysterious
  // Almost no melody — just a drone, glass drops, and ghost flute notes
  cavern:{bpm:58, melWave:'flute', melVol:0.08, harmWave:'pad', harmVol:0.06,
           bassWave:'bass', bassVol:0.11, arpWave:'glass', arpVol:0.07,
           padWave:'pad', padVol:0.08, perc:'none',
           melAtk:0.025, melSus:0.82,
    mel:[
      // Ghost flute — sparse, floating
      [N.D5,2],[N._,2],
      [N.A4,2],[N._,2],
      [N.Bb4,2],[N._,2],
      [N.A4,4],
    ],
    harm:[
      [N.F4,4],[N.D4,4],
      [N.Eb4,4],[N.F4,4],
    ],
    bass:[
      [N.D3,2],[N.A3,2],
      [N.G2,2],[N.D3,2],
      [N.F2,2],[N.C3,2],
      [N.A2,2],[N.E3,2],
    ],
    arp:[
      // Crystal drops — occasional glints
      [N.D5,.5],[N._,1.5],[N.F5,.5],[N._,1.5],
      [N.A5,.5],[N._,1.5],[N.D5,.5],[N._,1.5],
      [N.Bb4,.5],[N._,1.5],[N.F5,.5],[N._,1.5],
      [N.A4,.5],[N._,3.5],
    ],
    pad:[
      // Long sustained drone — 8-beat notes
      [N.D3,8],[N.G2,8],
    ],
  },

  // ── Bandit Hideout ── A minor, 116 BPM, tense and urgent
  hideout:{bpm:116, melWave:'lead', melVol:0.12, harmWave:'lead', harmVol:0.06,
            bassWave:'bass', bassVol:0.15, arpWave:'arp', arpVol:0.07,
            padWave:'pad', padVol:0.05, perc:'drive',
    mel:[
      [N.A5,.5],[N.G5,.5],[N.A5,.5],[N.C6,.5],[N.B5,1],[N.A5,1],
      [N.G5,.5],[N.E5,.5],[N.G5,1],[N.A5,.5],[N.G5,.5],[N.E5,1],
      [N.F5,.5],[N.G5,.5],[N.A5,.5],[N.Bb5,.5],[N.A5,.5],[N.G5,.5],[N.F5,.5],[N.E5,.5],
      [N.A5,2],[N.E5,2],
    ],
    harm:[
      [N.E5,1],[N.C5,1],[N.D5,2],
      [N.B4,1],[N.C5,1],[N.B4,2],
      [N.D5,2],[N.E5,2],
      [N.E5,2],[N.C5,2],
    ],
    bass:[
      [N.A2,.5],[N.E3,.5],[N.A2,.5],[N.C3,.5],[N.E3,.5],[N.A2,.5],[N.E3,.5],[N.G3,.5],
      [N.C3,.5],[N.G3,.5],[N.C3,.5],[N.E3,.5],[N.G3,.5],[N.C3,.5],[N.G3,.5],[N.E3,.5],
      [N.F2,.5],[N.C3,.5],[N.F2,.5],[N.A3,.5],[N.C3,.5],[N.F2,.5],[N.C3,.5],[N.A3,.5],
      [N.E3,.5],[N.B3,.5],[N.E3,.5],[N.G3,.5],[N.B3,.5],[N.E3,.5],[N.B2,.5],[N.E3,.5],
    ],
    arp:[
      // Quarter-note arp — urgent but not machine-gun
      [N.A4,1],[N.C5,1],[N.E5,1],[N._,1],
      [N.G4,1],[N.C5,1],[N.E5,1],[N._,1],
      [N.F4,1],[N.A4,1],[N.C5,1],[N._,1],
      [N.E4,1],[N.Ab4,1],[N.B4,1],[N._,1],
    ],
    pad:[
      [N.A3,4],[N.G3,4],[N.F3,4],[N.E3,4],
    ],
  },

  // ── Ancient Ruins ── G minor, 70 BPM, haunted and modal (Dorian flavor)
  ruins:{bpm:70, melWave:'flute', melVol:0.09, harmWave:'pad', harmVol:0.05,
          bassWave:'bass', bassVol:0.12, arpWave:'glass', arpVol:0.05,
          padWave:'pad', padVol:0.06, perc:'atmo',
          melAtk:0.020, melSus:0.78,
    mel:[
      [N.G5,1],[N.F5,.5],[N.Eb5,.5],[N.D5,1],[N.G4,1],
      [N.Bb4,.5],[N.C5,.5],[N.D5,1],[N.Eb5,.5],[N.D5,.5],[N.C5,1],
      [N.D5,1],[N.Eb5,.5],[N.F5,.5],[N.G5,.5],[N.F5,.5],[N.Eb5,.5],[N.D5,.5],
      [N.C5,2],[N.G4,2],
    ],
    harm:[
      [N.D5,2],[N.Bb4,2],
      [N.G4,2],[N.Eb4,2],
      [N.Bb4,2],[N.G4,2],
      [N.Eb4,2],[N.D4,2],
    ],
    bass:[
      [N.G2,1],[N.D3,1],[N.G2,1],[N.Bb3,1],
      [N.C3,1],[N.G3,1],[N.Eb3,1],[N.G3,1],
      [N.D3,.5],[N.A3,.5],[N.D3,.5],[N.F3,.5],[N.D3,.5],[N.A2,.5],[N.D3,.5],[N.A3,.5],
      [N.Eb3,2],[N.G2,2],
    ],
    arp:[
      // Sparse glass shimmer — haunted echoes
      [N.G4,2],[N._,2],
      [N.Bb4,2],[N._,2],
      [N.D5,2],[N._,2],
      [N.C5,2],[N._,2],
    ],
    pad:[
      [N.G3,4],[N.C3,4],[N.D3,4],[N.Eb3,4],
    ],
  },

  // ── Abandoned Village ── C minor, 66 BPM, melancholic and heartbreaking
  village:{bpm:66, melWave:'flute', melVol:0.09, harmWave:'pad', harmVol:0.06,
            bassWave:'bass', bassVol:0.11, padWave:'pad', padVol:0.07, perc:'none',
            melAtk:0.025, melSus:0.82,
    mel:[
      [N.G5,1],[N.Eb5,1],[N.F5,.5],[N.G5,.5],[N.Ab5,1],
      [N.G5,1],[N.F5,1],[N.Eb5,2],
      [N.F5,1],[N.D5,1],[N.Eb5,.5],[N.F5,.5],[N.G5,1],
      [N.Eb5,2],[N.C5,2],
    ],
    harm:[
      [N.Eb5,2],[N.C5,2],
      [N.Eb5,2],[N.Bb4,2],
      [N.D5,2],[N.C5,2],
      [N.G4,2],[N.Ab4,2],
    ],
    bass:[
      [N.C3,1],[N.G3,1],[N.C3,1],[N.Ab3,1],
      [N.Eb3,1],[N.Bb3,1],[N.Eb3,2],
      [N.Bb2,1],[N.F3,1],[N.Bb2,1],[N.D3,1],
      [N.Ab2,2],[N.Eb3,2],
    ],
    pad:[
      [N.C3,4],[N.Eb3,4],[N.Bb2,4],[N.Ab2,4],
    ],
  },
};

// ── Music engine state ────────────────────────────────────────────────────────
let _musGain=null, _musMuted=false, _musZone=null, _musSchedId=null;
let _musMel ={idx:0,next:0};
let _musHarm={idx:0,next:0};
let _musBass={idx:0,next:0};
let _musArp ={idx:0,next:0};
let _musPad ={idx:0,next:0};
let _musPerc={idx:0,next:0};

// ── Per-voice note scheduler ──────────────────────────────────────────────────
// waveKey : one of 'lead','pad','arp','bass','mel','brass'
// vib     : whether to apply LFO vibrato (only on lead, only long notes)
// atk/sus : override ADSR per timbre
function _musNoteV(freq, start, dur, waveKey, vol, vib=false, atk=0.010, sus=0.72){
  if(!freq||!_musGain) return;
  const w=_getWaves(), ctx=getAudioCtx();
  const wave=w[waveKey]||w.lead;
  const o=ctx.createOscillator(), g=ctx.createGain();
  o.setPeriodicWave(wave);
  o.frequency.value=freq;
  const dec=Math.min(dur*0.20, 0.09);
  const rel=Math.min(dur*0.08, 0.05);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol,      start+atk);
  g.gain.exponentialRampToValueAtTime(vol*sus, start+atk+dec);
  g.gain.setValueAtTime(vol*sus, start+dur-rel);
  g.gain.exponentialRampToValueAtTime(0.0001, start+dur);

  // LFO vibrato — kicks in after 0.25 s on notes longer than 0.35 s
  if(vib && dur>0.35){
    const lfo=ctx.createOscillator(), lfoG=ctx.createGain();
    lfo.frequency.value=5.5;
    lfoG.gain.setValueAtTime(0, start);
    lfoG.gain.linearRampToValueAtTime(freq*0.013, start+Math.min(0.28, dur*0.45));
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    lfo.start(start); lfo.stop(start+dur+0.05);
  }

  o.connect(g); g.connect(_musGain);
  o.start(start); o.stop(start+dur+0.05);
}

// ── Main scheduling loop (runs every 50 ms, look-ahead 220 ms) ───────────────
function _musSched(){
  const track=MUS_TRACKS[_musZone]; if(!track) return;
  const c=getAudioCtx(), now=c.currentTime, LA=0.22, spb=60/track.bpm, spe=spb/2;

  const mWave=track.melWave  ||'lead'; const mVol=track.melVol  ||0.11;
  const hWave=track.harmWave ||'pad';  const hVol=track.harmVol ||0.06;
  const bWave=track.bassWave ||'bass'; const bVol=track.bassVol ||0.14;
  const aWave=track.arpWave  ||'arp';  const aVol=track.arpVol  ||0.07;
  const pWave=track.padWave  ||'pad';  const pVol=track.padVol  ||0.05;
  // Per-track melody ADSR — atmospheric tracks use slower attack/higher sustain
  const mAtk=track.melAtk||0.010; const mSus=track.melSus||0.72;

  // Lead melody — with vibrato on long notes
  while(_musMel.next<now+LA){
    const [f,b]=track.mel[_musMel.idx%track.mel.length];
    const dur=spb*b*0.90;
    _musNoteV(f,_musMel.next,dur,mWave,mVol, b>=1.5, mAtk, mSus);
    _musMel.next+=spb*b; _musMel.idx++;
  }

  // Harmony
  if(track.harm){
    while(_musHarm.next<now+LA){
      const [f,b]=track.harm[_musHarm.idx%track.harm.length];
      _musNoteV(f,_musHarm.next,spb*b*0.85,hWave,hVol, false, 0.012, 0.70);
      _musHarm.next+=spb*b; _musHarm.idx++;
    }
  }

  // Bass — driving 8ths, short gate
  while(_musBass.next<now+LA){
    const [f,b]=track.bass[_musBass.idx%track.bass.length];
    _musNoteV(f,_musBass.next,spb*b*0.75,bWave,bVol, false, 0.006, 0.68);
    _musBass.next+=spb*b; _musBass.idx++;
  }

  // Arpeggio
  if(track.arp){
    while(_musArp.next<now+LA){
      const [f,b]=track.arp[_musArp.idx%track.arp.length];
      _musNoteV(f,_musArp.next,spb*b*0.55,aWave,aVol, false, 0.005, 0.60);
      _musArp.next+=spb*b; _musArp.idx++;
    }
  }

  // Pad (slow attack, high sustain — string background)
  if(track.pad){
    while(_musPad.next<now+LA){
      const [f,b]=track.pad[_musPad.idx%track.pad.length];
      _musNoteV(f,_musPad.next,spb*b*0.95,pWave,pVol, false, 0.18, 0.88);
      _musPad.next+=spb*b; _musPad.idx++;
    }
  }

  // Percussion
  if(track.perc && PERC[track.perc] && PERC[track.perc].length>0){
    while(_musPerc.next<now+LA){
      const pat=PERC[track.perc];
      _percHit(pat[_musPerc.idx%pat.length], _musPerc.next);
      _musPerc.next+=spe; _musPerc.idx++;
    }
  }
}

// ── Public music controls ─────────────────────────────────────────────────────
function musPlay(zone){
  const key=MUS_TRACKS[zone]?zone:'world';
  if(_musZone===key) return;
  if(_musSchedId){ clearInterval(_musSchedId); _musSchedId=null; }
  _musZone=key;
  const c=getAudioCtx(), out=_getOut();
  if(!_musGain){
    _musGain=c.createGain();
    _musGain.gain.value=_musMuted?0:0.22;
    _musGain.connect(out);
  }
  const t=c.currentTime+0.08;
  _musMel ={idx:0,next:t};
  _musHarm={idx:0,next:t};
  _musBass={idx:0,next:t};
  _musArp ={idx:0,next:t};
  _musPad ={idx:0,next:t};
  _musPerc={idx:0,next:t};
  _musSchedId=setInterval(_musSched,50);
}

function toggleMuteMusic(){
  _musMuted=!_musMuted;
  if(_musGain) _musGain.gain.linearRampToValueAtTime(
    _musMuted?0:0.22, getAudioCtx().currentTime+0.05);
  const btn=document.getElementById('hud-mute-mus');
  if(btn) btn.textContent=_musMuted?'🎵':'🎶';
}
