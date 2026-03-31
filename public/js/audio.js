// ── SNES SPC700 + S-DSP Audio Emulation ──────────────────────────────────────
// Approximates the Super Nintendo's audio hardware characteristics:
//  • Gaussian interpolation  → master lowpass  ~14 kHz, low-Q (maximally flat)
//  • S-DSP echo / reverb     → 176 ms delay feedback loop, filtered echo tail
//  • SPC700 ADSR envelopes   → proper 4-stage shaping on every note/SFX
//  • Sample-based timbres    → PeriodicWave for melody, bass, and SFX voices
//  • 32 kHz noise buffers    → SNES native sample rate for noise/percussion

let _actx = null;
let _sfxMuted = false;
let _snesOut  = null;   // master output bus — everything feeds here
let _waves    = null;   // cached PeriodicWave instrument timbres

function getAudioCtx(){
  if(!_actx) _actx = new (window.AudioContext||window.webkitAudioContext)();
  if(_actx.state==='suspended') _actx.resume();
  return _actx;
}

// ── SNES Signal Chain ─────────────────────────────────────────────────────────
// All audio (music + SFX) is routed through this chain.
// Architecture:
//   source nodes → _snesOut bus → gauss filter → ctx.destination   (dry path)
//                               → echoSend → echoDelay ──┐
//                                              ↑          echoFilt → echoFb (loop)
//                                              └──────────┘
//                                                        └─ echoReturn → ctx.destination
function _getOut(){
  if(_snesOut) return _snesOut;
  const ctx = getAudioCtx();

  // Master output bus
  const bus = ctx.createGain();
  bus.gain.value = 1.0;

  // Gaussian interpolation approximation: gentle shelf ~14 kHz, very low Q
  const gauss = ctx.createBiquadFilter();
  gauss.type = 'lowpass';
  gauss.frequency.value = 14000;
  gauss.Q.value = 0.35;

  // S-DSP echo: 176 ms delay → lowpass filter → feedback + wet return
  const echoSend   = ctx.createGain();   echoSend.gain.value   = 0.26;  // send level
  const echoDelay  = ctx.createDelay(1); echoDelay.delayTime.value = 0.176; // ~11 SNES echo "clocks"
  const echoFilt   = ctx.createBiquadFilter();
  echoFilt.type = 'lowpass'; echoFilt.frequency.value = 5500; echoFilt.Q.value = 0.5;
  const echoFb     = ctx.createGain();   echoFb.gain.value    = 0.42;  // repeat level
  const echoReturn = ctx.createGain();   echoReturn.gain.value = 0.30;  // wet level

  // Dry path
  bus.connect(gauss);
  gauss.connect(ctx.destination);

  // Echo path (feedback loop is valid: DelayNode is inside the cycle)
  bus.connect(echoSend);
  echoSend.connect(echoDelay);
  echoDelay.connect(echoFilt);
  echoFilt.connect(echoFb);
  echoFb.connect(echoDelay);       // ← feedback loop
  echoFilt.connect(echoReturn);
  echoReturn.connect(ctx.destination);

  _snesOut = bus;
  return bus;
}

// ── Instrument PeriodicWaves ──────────────────────────────────────────────────
// Created once and cached.  Harmonic content approximates BRR-sampled timbres.
function _getWaves(){
  if(_waves) return _waves;
  const ctx = getAudioCtx();

  // Melody: warm mallet / marimba / piano hybrid
  //   Strong fundamental, clear octave (2nd), gentle 3rd-7th harmonics
  const mR = new Float32Array([0, 1.0, 0.38, 0.14, 0.07, 0.03, 0.015, 0.006]);
  const mI = new Float32Array(8);

  // Bass: round finger-bass — dominant fundamental, punchy octave (2nd)
  const bR = new Float32Array([0, 1.0, 0.52, 0.12, 0.05, 0.02]);
  const bI = new Float32Array(6);

  // SFX lead: slightly reedy/buzzy (prominent 2nd & 3rd harmonics)
  const sR = new Float32Array([0, 0.55, 0.90, 0.50, 0.28, 0.14, 0.06, 0.02]);
  const sI = new Float32Array(8);

  // Brass/fanfare: sawtooth-adjacent harmonic stack (for title track melType)
  const brR = new Float32Array([0, 1.0, 0.50, 0.33, 0.25, 0.20, 0.17, 0.14,
                                    0.12, 0.11, 0.10, 0.09, 0.08]);
  const brI = new Float32Array(13);

  _waves = {
    mel:   ctx.createPeriodicWave(mR,  mI,  {disableNormalization:false}),
    bass:  ctx.createPeriodicWave(bR,  bI,  {disableNormalization:false}),
    sfx:   ctx.createPeriodicWave(sR,  sI,  {disableNormalization:false}),
    brass: ctx.createPeriodicWave(brR, brI, {disableNormalization:false}),
  };
  return _waves;
}

// ── SNES ADSR note primitive ──────────────────────────────────────────────────
// wave   : PeriodicWave object OR oscillator type string
// start  : AudioContext time to begin
// dur    : total note duration in seconds
// vol    : peak gain
// atk/dec/sus/rel : ADSR parameters (rel = release duration at note end)
function _snesNote(freq, wave, start, dur, vol, atk=0.008, dec=0.07, sus=0.70, rel=0.05){
  if(!freq) return;
  const ctx = getAudioCtx(), out = _getOut();
  const o = ctx.createOscillator(), g = ctx.createGain();
  if(typeof wave === 'string') o.type = wave;
  else o.setPeriodicWave(wave);
  o.frequency.value = freq;
  // 4-stage SNES ADSR
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol,       start + atk);           // attack
  g.gain.exponentialRampToValueAtTime(vol * sus, start + atk + dec); // decay → sustain
  g.gain.setValueAtTime(vol * sus, start + dur - rel);              // sustain hold
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);         // release
  o.connect(g); g.connect(out);
  o.start(start); o.stop(start + dur + 0.06);
}

// ── SNES noise primitive ──────────────────────────────────────────────────────
// Buffer at 32 kHz (SNES native rate) → BiquadFilter → ADSR gain → output bus
function _snesNoise(start, dur, vol, cutoff=4000){
  if(_sfxMuted) return;
  const ctx = getAudioCtx(), out = _getOut();
  const SR  = 32000;  // SNES native sample rate
  const buf = ctx.createBuffer(1, Math.ceil(SR * dur), SR);
  const d   = buf.getChannelData(0);
  for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff;
  const g   = ctx.createGain();
  src.buffer = buf;
  const t = start || ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt); flt.connect(g); g.connect(out);
  src.start(t); src.stop(t + dur + 0.06);
}

// ── Legacy shim helpers (keep SFX API identical) ──────────────────────────────
function _tone(freq, typeHint, dur, vol, atk=0.008){
  if(_sfxMuted) return;
  const w = _getWaves();
  // Map old oscillator type hints → nearest SNES PeriodicWave
  const wave = typeHint === 'sine' || typeHint === 'triangle' ? w.mel : w.sfx;
  _snesNote(freq, wave, getAudioCtx().currentTime, dur, vol, atk,
            Math.min(dur * 0.25, 0.08), 0.68, Math.min(dur * 0.10, 0.04));
}
function _sweep(f0, f1, typeHint, dur, vol){
  if(_sfxMuted) return;
  const ctx = getAudioCtx(), out = _getOut();
  const w = _getWaves();
  const wave = typeHint === 'triangle' || typeHint === 'sine' ? w.mel : w.sfx;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.setPeriodicWave(wave);
  const t = ctx.currentTime;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol * 0.9, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.06);
}
function _noise(dur, vol, cutoff=3000){
  if(_sfxMuted) return;
  _snesNoise(null, dur, vol, cutoff);
}

// ── Mute controls ─────────────────────────────────────────────────────────────
function toggleMute(){
  _sfxMuted = !_sfxMuted;
  const btn = document.getElementById('hud-mute');
  if(btn) btn.textContent = _sfxMuted ? '🔇' : '🔊';
  if(!_sfxMuted) SFX.select();
}

// ── SFX ───────────────────────────────────────────────────────────────────────
const SFX = {
  step(){
    _sweep(75, 38, 'triangle', 0.07, 0.10);
  },
  swing(){
    _snesNoise(null, 0.11, 0.22, 5500);
    _sweep(850, 280, 'sawtooth', 0.09, 0.11);
  },
  hitEnemy(){
    _snesNoise(null, 0.06, 0.32, 2800);
    _sweep(310, 170, 'square', 0.07, 0.16);
  },
  hitPlayer(){
    _snesNoise(null, 0.14, 0.42, 1100);
    _sweep(155, 75, 'sawtooth', 0.13, 0.22);
  },
  enemyDeath(){
    _sweep(420, 52, 'square', 0.44, 0.26);
    setTimeout(()=>_snesNoise(null, 0.18, 0.18, 650), 100);
  },
  coin(){
    const w = _getWaves();
    _snesNote(880,  w.mel, getAudioCtx().currentTime,       0.20, 0.22, 0.005, 0.05, 0.65, 0.06);
    _snesNote(1320, w.mel, getAudioCtx().currentTime + 0.09, 0.20, 0.20, 0.005, 0.04, 0.60, 0.07);
  },
  ticket(){
    _snesNoise(null, 0.04, 0.30, 4200);
    setTimeout(()=>{ _snesNoise(null, 0.03, 0.22, 6500);
      _tone(700, 'square', 0.07, 0.11); }, 55);
  },
  door(){
    _sweep(215, 105, 'sawtooth', 0.33, 0.08);
    _snesNoise(null, 0.10, 0.09, 450);
  },
  levelUp(){
    const w = _getWaves();
    const ctx = getAudioCtx();
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) =>
      setTimeout(()=> _snesNote(f, w.mel, ctx.currentTime, 0.30, 0.24, 0.01, 0.06, 0.72, 0.05), i * 90));
    setTimeout(()=> _snesNote(1568, w.mel, getAudioCtx().currentTime, 0.45, 0.26, 0.01, 0.08, 0.70, 0.08),
               notes.length * 90);
  },
  potion(){
    const w = _getWaves();
    for(let i = 0; i < 3; i++){
      setTimeout(()=>{
        if(_sfxMuted) return;
        const f = 370 + Math.random() * 190;
        _snesNote(f, w.mel, getAudioCtx().currentTime, 0.13, 0.14, 0.005, 0.04, 0.60, 0.04);
      }, i * 115);
    }
  },
  battleStart(){
    const w = _getWaves();
    const ctx = getAudioCtx();
    [220, 262, 330, 392].forEach(f => _snesNote(f, w.sfx, ctx.currentTime, 0.5, 0.16, 0.01, 0.10, 0.68, 0.06));
    setTimeout(()=> _snesNoise(null, 0.28, 0.13, 900), 50);
  },
  victory(){
    const w = _getWaves();
    const ctx = getAudioCtx();
    const melody = [523, 659, 784, 659, 1047, 1047];
    const times  = [0, 100, 200, 300, 420, 500];
    melody.forEach((f, i) =>
      setTimeout(()=> _snesNote(f, w.mel, ctx.currentTime, 0.30, 0.24, 0.01, 0.06, 0.70, 0.05), times[i]));
  },
  gameOver(){
    const w = _getWaves();
    const ctx = getAudioCtx();
    [392, 330, 277, 220].forEach((f, i) =>
      setTimeout(()=> _snesNote(f, w.sfx, ctx.currentTime, 0.48, 0.20, 0.02, 0.12, 0.65, 0.08), i * 220));
  },
  select(){
    _tone(660, 'square', 0.07, 0.13);
  },
  buy(){
    const w = _getWaves();
    const ctx = getAudioCtx();
    _snesNote(523, w.mel, ctx.currentTime,        0.12, 0.18, 0.005, 0.04, 0.65, 0.04);
    _snesNote(784, w.mel, ctx.currentTime + 0.088, 0.16, 0.20, 0.005, 0.05, 0.68, 0.05);
  },
  error(){
    _tone(175, 'square', 0.17, 0.26);
    setTimeout(()=> _tone(148, 'square', 0.17, 0.26), 130);
  },
  questComplete(){
    const w = _getWaves();
    const ctx = getAudioCtx();
    [523, 784, 1047, 1568].forEach((f, i) =>
      setTimeout(()=> _snesNote(f, w.mel, ctx.currentTime, 0.32, 0.22, 0.01, 0.07, 0.70, 0.06), i * 80));
  },
};

// ── MUSIC ─────────────────────────────────────────────────────────────────────
// Note frequency table
const N={_:0,
  B2:123.47,C3:130.81,D3:146.83,Eb3:155.56,E3:164.81,F3:174.61,G3:196.00,Ab3:207.65,A3:220.00,Bb3:233.08,B3:246.94,
  C4:261.63,D4:293.66,Eb4:311.13,E4:329.63,F4:349.23,G4:392.00,Ab4:415.30,A4:440.00,Bb4:466.16,B4:493.88,
  C5:523.25,D5:587.33,Eb5:622.25,E5:659.25,F5:698.46,G5:783.99,Ab5:830.61,A5:880.00,Bb5:932.33,B5:987.77,
  C6:1046.50,D6:1174.66,E6:1318.51};

// Zone music tracks: {bpm, mel, bass}
// mel/bass: [[freq, beats], ...]  — beats = quarter-note count; freq=0 is rest
// Optional per-track: melWave/bassWave ('mel'|'bass'|'brass'|'sfx') override timbre
//                     melVol/bassVol override note volume
const MUS_TRACKS={
  // ── Title / character-creation screen — heroic C-major fanfare ──
  title:{bpm:108, melWave:'brass', melVol:0.10, bassWave:'bass', bassVol:0.15,
    mel:[
      [N.C5,1],[N.E5,1],[N.G5,1],[N.C6,2],[N._,1],    // fanfare arpeggio
      [N.B5,1],[N.A5,1],[N.G5,2],[N._,2],              // descending answer
      [N.A5,1],[N.C6,1],[N.B5,1],[N.A5,1],[N.G5,2],   // flowing phrase
      [N.F5,1],[N.G5,1],[N.A5,2],                      // transition lift
      [N.G5,1],[N.E5,1],[N.D5,1],[N.C5,1],[N.E5,2],   // second phrase
      [N.G5,1],[N.A5,1],[N.C6,2],[N.B5,1],[N.A5,1],   // climb to peak
      [N.G5,2],[N.F5,2],[N.E5,2],[N._,2],              // breath before finale
      [N.C5,1],[N.E5,1],[N.G5,1],[N.C6,1],[N.E6,2],   // triumphant ascent
      [N.D6,2],[N.C6,4]],                              // grand resolution
    bass:[
      [N.C3,2],[N.G3,2],[N.A3,2],[N.E3,2],
      [N.F3,2],[N.C3,2],[N.G3,4],
      [N.F3,2],[N.C3,2],[N.G3,2],[N.E3,2],
      [N.A3,2],[N.F3,2],[N.G3,2],[N.C3,2],
      [N.G3,4],[N.C3,4]]},

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

let _musGain=null, _musMuted=false, _musZone=null, _musSchedId=null;
let _musMel={idx:0,next:0}, _musBass={idx:0,next:0};

function _musNote(freq, start, dur, waveKey, vol){
  if(!freq || !_musGain) return;
  const w   = _getWaves();
  const wave = w[waveKey] || w.mel;
  const ctx  = getAudioCtx();
  const o    = ctx.createOscillator(), g = ctx.createGain();
  o.setPeriodicWave(wave);
  o.frequency.value = freq;
  // SNES-style ADSR: fast transient, decay, sustain, release at note end
  const atk = 0.010;
  const dec = Math.min(dur * 0.22, 0.085);
  const sus = 0.68;
  const rel = Math.min(dur * 0.10, 0.05);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(vol,       start + atk);
  g.gain.exponentialRampToValueAtTime(vol * sus, start + atk + dec);
  g.gain.setValueAtTime(vol * sus, start + dur - rel);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g); g.connect(_musGain);
  o.start(start); o.stop(start + dur + 0.06);
}

function _musSched(){
  const track = MUS_TRACKS[_musZone]; if(!track) return;
  const c = getAudioCtx();
  const now = c.currentTime, LA = 0.15, spb = 60 / track.bpm;
  const mWave = track.melWave  || 'mel';   const mVol = track.melVol  || 0.09;
  const bWave = track.bassWave || 'bass';  const bVol = track.bassVol || 0.13;
  while(_musMel.next < now + LA){
    const [f, b] = track.mel[_musMel.idx % track.mel.length];
    _musNote(f, _musMel.next, spb * b * 0.88, mWave, mVol);
    _musMel.next += spb * b; _musMel.idx++;
  }
  while(_musBass.next < now + LA){
    const [f, b] = track.bass[_musBass.idx % track.bass.length];
    _musNote(f, _musBass.next, spb * b * 0.72, bWave, bVol);
    _musBass.next += spb * b; _musBass.idx++;
  }
}

function musPlay(zone){
  const key = MUS_TRACKS[zone] ? zone : 'world';
  if(_musZone === key) return;
  if(_musSchedId){ clearInterval(_musSchedId); _musSchedId = null; }
  _musZone = key;
  const c = getAudioCtx(), out = _getOut();
  if(!_musGain){
    _musGain = c.createGain();
    _musGain.gain.value = _musMuted ? 0 : 0.22;
    _musGain.connect(out);   // → SNES chain (not directly to destination)
  }
  _musMel  = {idx:0, next: c.currentTime + 0.08};
  _musBass = {idx:0, next: c.currentTime + 0.08};
  _musSchedId = setInterval(_musSched, 50);
}

function toggleMuteMusic(){
  _musMuted = !_musMuted;
  if(_musGain) _musGain.gain.value = _musMuted ? 0 : 0.22;
  document.getElementById('hud-mute-mus').textContent = _musMuted ? '🎵' : '🎶';
}
