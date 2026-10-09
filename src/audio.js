// All sound is synthesised live with Web Audio: no asset files.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const PENTA = [0, 2, 4, 7, 9];
const pentaStep = (i) => 12 * Math.floor(i / 5) + PENTA[((i % 5) + 5) % 5];

const CHORDS = [
  [48, 55, 59, 64, 71], // Cmaj9-ish
  [45, 52, 55, 60, 67], // Am9
  [41, 48, 52, 57, 64], // Fmaj7
  [43, 50, 55, 59, 66], // G with a lydian lift
];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.life = 0;
    this.lastTinkle = 0;
    this.biome = 'meadow';
  }

  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);

    this.reverbIn = ctx.createGain();
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(3.2, 2.6);
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    this.reverbIn.connect(verb).connect(verbOut).connect(this.master);

    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    this.startAmbient();
    this.startRoll();
  }

  // sounds requested before the first click (audio not started yet) are just skipped
  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx && !this.adPause) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.now, 0.1);
  }

  // silence the game while a video ad plays, without touching the player's own mute setting
  pauseForAd(on) {
    this.adPause = on;
    if (this.ctx) this.master.gain.setTargetAtTime(on || this.muted ? 0 : 0.9, this.now, 0.05);
  }

  impulse(dur, decay) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * dur;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = buf.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Generic enveloped oscillator
  tone({ type = 'sine', f, f2, t = this.now, dur = 0.3, vol = 0.1, attack = 0.005, verb = 0.3, glide, pan = 0 }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + (glide ?? dur));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = g;
    if (pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      out = p;
    }
    o.connect(g);
    out.connect(this.sfx);
    if (verb) {
      const s = ctx.createGain();
      s.gain.value = verb;
      out.connect(s).connect(this.reverbIn);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noiseBurst({ t = this.now, dur = 0.15, vol = 0.06, f = 800, f2, q = 1.5, type = 'bandpass', verb = 0.1 }) {
    const ctx = this.ctx;
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(f, t);
    if (f2) filt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(this.sfx);
    if (verb) {
      const s = ctx.createGain();
      s.gain.value = verb;
      g.connect(s).connect(this.reverbIn);
    }
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  // FM bell: the backbone of the completion ping
  bell(f, t, vol, decay = 2.8) {
    const ctx = this.ctx;
    if (!ctx) return;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * 3.5;
    modGain.gain.setValueAtTime(f * 1.8, t);
    modGain.gain.exponentialRampToValueAtTime(1, t + 1.2);
    mod.connect(modGain).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    car.connect(g);
    g.connect(this.sfx);
    const s = ctx.createGain();
    s.gain.value = 0.55;
    g.connect(s).connect(this.reverbIn);
    car.start(t); mod.start(t);
    car.stop(t + decay + 0.1); mod.stop(t + decay + 0.1);
    this.tone({ f: f * 2, t, dur: 1.4, vol: vol * 0.3, verb: 0.5 });
    this.tone({ f: f * 3.01, t, dur: 0.6, vol: vol * 0.12, verb: 0.5 });
  }

  // ---- ambience -------------------------------------------------------------

  startAmbient() {
    const ctx = this.ctx;
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 700;
    this.padFilter.Q.value = 0.4;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain).connect(this.padFilter.frequency);
    lfo.start();
    this.padGain = ctx.createGain();
    this.padGain.gain.setValueAtTime(0.0001, this.now);
    this.padGain.gain.exponentialRampToValueAtTime(0.22, this.now + 5);
    this.padFilter.connect(this.padGain).connect(this.master);
    const padVerb = ctx.createGain();
    padVerb.gain.value = 0.7;
    this.padGain.connect(padVerb).connect(this.reverbIn);

    // airy wind
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const wf = ctx.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 420;
    wf.Q.value = 0.6;
    const wg = ctx.createGain();
    wg.gain.value = 0.02;
    const wl = ctx.createOscillator();
    const wlg = ctx.createGain();
    wl.frequency.value = 0.09;
    wlg.gain.value = 0.014;
    wl.connect(wlg).connect(wg.gain);
    wind.connect(wf).connect(wg).connect(this.master);
    wind.start(); wl.start();

    this.chordIndex = 0;
    this.playChord(CHORDS[0]);
    setInterval(() => {
      this.chordIndex = (this.chordIndex + 1) % CHORDS.length;
      this.playChord(CHORDS[this.chordIndex]);
    }, 9000);

    // nature gets busier as the planet comes alive
    setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      if (Math.random() < 0.06 + this.life * 0.3) this.biomeSound();
      if (Math.random() < 0.08 + this.life * 0.2) {
        const n = 84 + pentaStep(Math.floor(Math.random() * 8));
        this.tone({ type: 'triangle', f: midi(n), dur: 1.2, vol: 0.02, verb: 0.9, pan: Math.random() * 1.6 - 0.8 });
      }
    }, 500);
  }

  playChord(notes) {
    const ctx = this.ctx;
    const t = this.now;
    for (const n of notes) {
      for (const [type, detune] of [['sine', 0], ['triangle', 7]]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = midi(n);
        o.detune.value = detune + (Math.random() - 0.5) * 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.06, t + 3.5);
        g.gain.setValueAtTime(0.06, t + 9);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 13);
        o.connect(g).connect(this.padFilter);
        o.start(t);
        o.stop(t + 13.1);
      }
    }
  }

  birdChirp() {
    const base = 2200 + Math.random() * 1800;
    const n = 2 + Math.floor(Math.random() * 3);
    const pan = Math.random() * 1.6 - 0.8;
    for (let i = 0; i < n; i++) {
      const t = this.now + i * 0.11;
      this.tone({ f: base, f2: base * 1.35, t, dur: 0.08, vol: 0.025, verb: 0.6, pan, glide: 0.05 });
    }
  }

  // Each biome has its own little soundscape
  biomeSound() {
    const t = this.now;
    const pan = Math.random() * 1.6 - 0.8;
    switch (this.biome) {
      case 'pond':
        if (Math.random() < 0.5) {
          // ribbit
          for (let i = 0; i < 2; i++) this.tone({ type: 'square', f: 140, f2: 210, t: t + i * 0.16, dur: 0.1, vol: 0.025, verb: 0.3, pan, glide: 0.08 });
        } else {
          this.tone({ f: 500 + Math.random() * 300, f2: 1400, t, dur: 0.12, vol: 0.05, verb: 0.5, pan, glide: 0.05 });
        }
        break;
      case 'desert':
        this.noiseBurst({ t, dur: 2.2, vol: 0.03, f: 300, f2: 900, q: 1.5, verb: 0.4 });
        break;
      case 'snow': {
        const n = 96 + pentaStep(Math.floor(Math.random() * 6));
        this.tone({ f: midi(n), t, dur: 1.6, vol: 0.03, verb: 0.9, pan });
        this.tone({ f: midi(n) * 2.76, t, dur: 0.6, vol: 0.01, verb: 0.9, pan });
        break;
      }
      case 'grove':
        if (Math.random() < 0.4) {
          this.tone({ f: 390, f2: 360, t, dur: 0.45, vol: 0.05, attack: 0.08, verb: 0.8, pan });
          this.tone({ f: 380, f2: 340, t: t + 0.55, dur: 0.6, vol: 0.05, attack: 0.08, verb: 0.8, pan });
        } else {
          for (let i = 0; i < 4; i++) this.tone({ type: 'triangle', f: midi(88 + pentaStep(i * 2)), t: t + i * 0.09, dur: 0.8, vol: 0.015, verb: 0.9, pan });
        }
        break;
      case 'garden':
        if (Math.random() < 0.4) {
          this.tone({ type: 'sawtooth', f: 210, f2: 240, t, dur: 0.7, vol: 0.008, attack: 0.15, verb: 0.2, pan });
        } else this.birdChirp();
        break;
      case 'shore':
        if (Math.random() < 0.6) this.noiseBurst({ t, dur: 2.8, vol: 0.035, f: 400, f2: 1400, q: 0.5, type: 'lowpass', verb: 0.5 });
        else this.tone({ f: 1800, f2: 1100, t, dur: 0.35, vol: 0.03, verb: 0.6, pan, glide: 0.3 });
        break;
      case 'volcano':
        if (Math.random() < 0.5) this.noiseBurst({ t, dur: 1.6, vol: 0.06, f: 90, f2: 60, q: 1, type: 'lowpass', verb: 0.3 });
        else for (let i = 0; i < 5; i++) this.noiseBurst({ t: t + Math.random() * 0.5, dur: 0.04, vol: 0.03, f: 2500, q: 2, verb: 0.2 });
        break;
      case 'candy':
        if (Math.random() < 0.6) {
          for (let i = 0; i < 3; i++) this.tone({ type: 'triangle', f: midi(84 + pentaStep(Math.floor(Math.random() * 8))), t: t + i * 0.18, dur: 0.6, vol: 0.025, verb: 0.8, pan });
        } else this.tone({ f: 400, f2: 1200, t, dur: 0.08, vol: 0.04, verb: 0.3, pan, glide: 0.05 });
        break;
      case 'autumn':
        if (Math.random() < 0.6) this.noiseBurst({ t, dur: 0.6, vol: 0.025, f: 3500, f2: 2000, q: 0.8, type: 'highpass', verb: 0.3 });
        else this.birdChirp();
        break;
      // ---- Citylight
      case 'park':
        if (Math.random() < 0.35) for (let i = 0; i < 4; i++) this.noiseBurst({ t: t + i * 0.07 + Math.random() * 0.05, dur: 0.12, vol: 0.012, f: 2600 + Math.random() * 1500, q: 3, verb: 0.5 }); // fountain trickle
        else this.birdChirp();
        break;
      case 'downtown': {
        const r = Math.random();
        if (r < 0.4) this.noiseBurst({ t, dur: 2.6, vol: 0.03, f: 160, f2: 240, q: 0.7, type: 'lowpass', verb: 0.3 }); // traffic swell
        else if (r < 0.7) for (const [k, f] of [[0, 330], [0.22, 415]]) this.tone({ type: 'square', f, t: t + k, dur: 0.18, vol: 0.008, verb: 0.9, pan }); // distant horn
        else this.tone({ type: 'sawtooth', f: 120, t, dur: 0.9, vol: 0.004, attack: 0.05, verb: 0.2, pan }); // neon buzz
        break;
      }
      case 'suburbs':
        if (Math.random() < 0.3) for (let i = 0; i < 2; i++) this.tone({ type: 'square', f: 330, f2: 210, t: t + i * 0.2, dur: 0.09, vol: 0.02, verb: 0.6, pan, glide: 0.07 }); // woof woof
        else if (Math.random() < 0.5) for (let i = 0; i < 3; i++) this.tone({ type: 'triangle', f: midi(86 + pentaStep(Math.floor(Math.random() * 7))), t: t + i * 0.25, dur: 1.4, vol: 0.012, verb: 0.9, pan }); // wind chimes
        else this.birdChirp();
        break;
      case 'funfair': {
        // a few bars of calliope
        const start = Math.floor(Math.random() * 5);
        for (let i = 0; i < 6; i++) this.tone({ type: 'square', f: midi(72 + pentaStep(start + [0, 2, 4, 2, 5, 4][i])), t: t + i * 0.16, dur: 0.14, vol: 0.006, verb: 0.7, pan });
        break;
      }
      case 'harbour': {
        const r = Math.random();
        if (r < 0.4) this.tone({ f: 1700, f2: 1050, t, dur: 0.4, vol: 0.03, verb: 0.6, pan, glide: 0.35 }); // gull
        else if (r < 0.8) this.noiseBurst({ t, dur: 2.6, vol: 0.03, f: 380, f2: 1200, q: 0.5, type: 'lowpass', verb: 0.5 }); // lapping water
        else this.tone({ type: 'sawtooth', f: 82, t, dur: 2, vol: 0.012, attack: 0.4, verb: 0.9 }); // foghorn far away
        break;
      }
      // ---- Skyhaven
      case 'pastures':
        if (Math.random() < 0.45) for (let i = 0; i < 3; i++) this.tone({ type: 'triangle', f: midi(81 + [0, 4, 2][i]), t: t + i * 0.32 + Math.random() * 0.1, dur: 0.9, vol: 0.012, verb: 0.8, pan }); // sheep bells
        else if (Math.random() < 0.5) this.tone({ type: 'sawtooth', f: 300, f2: 270, t, dur: 0.55, vol: 0.006, attack: 0.04, verb: 0.5, pan }); // a soft baa
        else this.birdChirp();
        break;
      case 'cliffs':
        if (Math.random() < 0.6) this.noiseBurst({ t, dur: 2.4, vol: 0.035, f: 500, f2: 1400, q: 0.6, verb: 0.4 }); // gust of wind
        else for (let i = 0; i < 3; i++) this.tone({ type: 'square', f: 95, f2: 80, t: t + i * 0.45, dur: 0.18, vol: 0.004, verb: 0.5, pan }); // windmill creak
        break;
      case 'rainbow':
        if (Math.random() < 0.5) this.noiseBurst({ t, dur: 2.8, vol: 0.03, f: 1800, f2: 1200, q: 0.5, type: 'highpass', verb: 0.4 }); // falling water
        else for (let i = 0; i < 5; i++) this.tone({ type: 'triangle', f: midi(84 + pentaStep(i)), t: t + i * 0.08, dur: 0.7, vol: 0.012, verb: 0.9, pan }); // shimmer
        break;
      case 'balloons':
        if (Math.random() < 0.35) this.noiseBurst({ t, dur: 0.9, vol: 0.03, f: 260, f2: 180, q: 0.8, type: 'lowpass', verb: 0.3 }); // balloon burner
        else if (Math.random() < 0.5) for (let i = 0; i < 6; i++) this.noiseBurst({ t: t + i * 0.06, dur: 0.05, vol: 0.012, f: 1400, q: 1.5, verb: 0.2 }); // kite flutter
        else this.birdChirp();
        break;
      case 'stargazer':
        if (Math.random() < 0.45) {
          // twit-twoo
          this.tone({ f: 520, f2: 480, t, dur: 0.25, vol: 0.035, attack: 0.04, verb: 0.8, pan });
          this.tone({ f: 470, f2: 400, t: t + 0.4, dur: 0.6, vol: 0.035, attack: 0.08, verb: 0.8, pan });
        } else {
          const n = 93 + pentaStep(Math.floor(Math.random() * 6));
          this.tone({ f: midi(n), t, dur: 1.4, vol: 0.02, verb: 0.95, pan });
        }
        break;
      // ---- Sunroam
      case 'savanna':
        if (Math.random() < 0.4) this.tone({ type: 'sawtooth', f: 110, f2: 80, t, dur: 1.3, vol: 0.012, attack: 0.15, verb: 0.7, pan }); // distant roar
        else if (Math.random() < 0.5) this.noiseBurst({ t, dur: 2, vol: 0.02, f: 900, f2: 1500, q: 0.5, verb: 0.4 }); // dry grass in the breeze
        else this.birdChirp();
        break;
      case 'canopy':
        if (Math.random() < 0.5) for (let i = 0; i < 3; i++) this.tone({ type: 'square', f: 900 - i * 120, f2: 1200 - i * 150, t: t + i * 0.14, dur: 0.12, vol: 0.006, verb: 0.4, pan }); // parrot squawk
        else this.birdChirp();
        break;
      case 'riverbank':
        if (Math.random() < 0.5) this.noiseBurst({ t, dur: 1.2, vol: 0.02, f: 500, f2: 300, q: 0.8, type: 'lowpass', verb: 0.5 }); // a splash
        else this.tone({ type: 'sawtooth', f: 90, f2: 70, t, dur: 0.7, vol: 0.012, attack: 0.1, verb: 0.6, pan }); // hippo grumble
        break;
      case 'bamboo':
        if (Math.random() < 0.5) for (let i = 0; i < 2; i++) this.tone({ type: 'triangle', f: midi(76 + pentaStep(i * 2)), t: t + i * 0.25, dur: 0.5, vol: 0.016, verb: 0.9, pan }); // bamboo chime
        else this.noiseBurst({ t, dur: 2, vol: 0.025, f: 1600, f2: 1000, q: 0.6, type: 'highpass', verb: 0.4 }); // leaves rustle
        break;
      case 'outback':
        if (Math.random() < 0.5) for (let i = 0; i < 4; i++) this.tone({ type: 'square', f: 640 + (i % 2) * 90, f2: 540, t: t + i * 0.16, dur: 0.1, vol: 0.005, verb: 0.5, pan }); // kookaburra laugh
        else this.noiseBurst({ t, dur: 2.4, vol: 0.025, f: 700, f2: 1300, q: 0.5, verb: 0.4 }); // hot wind
        break;
      // ---- Seaglow
      case 'kelp':
        if (Math.random() < 0.5) for (let i = 0; i < 3; i++) this.tone({ type: 'sine', f: 500 + i * 130, f2: 800 + i * 160, t: t + i * 0.09, dur: 0.12, vol: 0.012, verb: 0.6, pan }); // bubbles
        else this.noiseBurst({ t, dur: 2.6, vol: 0.02, f: 300, f2: 500, q: 0.7, type: 'lowpass', verb: 0.7 }); // slow current
        break;
      case 'reef':
        if (Math.random() < 0.6) for (let i = 0; i < 4; i++) this.tone({ type: 'sine', f: 600 + Math.random() * 600, f2: 900 + Math.random() * 500, t: t + i * 0.07, dur: 0.1, vol: 0.01, verb: 0.5, pan }); // bubble pops
        else this.tone({ type: 'triangle', f: midi(79 + pentaStep(Math.floor(Math.random() * 5))), t, dur: 1.2, vol: 0.012, verb: 0.9, pan }); // dolphin-ish chime
        break;
      case 'galleon':
        if (Math.random() < 0.5) this.tone({ type: 'sawtooth', f: 70, f2: 62, t, dur: 1.8, vol: 0.014, attack: 0.4, verb: 0.9, pan }); // timbers groaning
        else this.tone({ type: 'sine', f: midi(60), t, dur: 2.4, vol: 0.014, verb: 0.95, pan }); // distant ship's bell
        break;
      case 'jellyglow':
        if (Math.random() < 0.6) for (let i = 0; i < 4; i++) this.tone({ type: 'sine', f: midi(84 + pentaStep(i + Math.floor(Math.random() * 3))), t: t + i * 0.2, dur: 1.2, vol: 0.011, verb: 0.95, pan }); // glassy shimmer
        else this.noiseBurst({ t, dur: 1.5, vol: 0.012, f: 1500, f2: 900, q: 0.8, type: 'highpass', verb: 0.8 });
        break;
      case 'vents':
        if (Math.random() < 0.5) this.tone({ type: 'sawtooth', f: 48, f2: 42, t, dur: 2.4, vol: 0.02, attack: 0.5, verb: 0.9, pan }); // deep rumble
        else this.noiseBurst({ t, dur: 2, vol: 0.03, f: 200, f2: 120, q: 0.9, type: 'lowpass', verb: 0.6 }); // venting
        break;
      // ---- Feastvale
      case 'bakery':
        if (Math.random() < 0.35) { // cock-a-doodle-doo
          [[560, 0], [700, 0.14], [820, 0.3], [640, 0.5]].forEach(([f, d]) => this.tone({ type: 'sawtooth', f, f2: f * 0.9, t: t + d, dur: 0.18, vol: 0.006, verb: 0.5, pan }));
        } else if (Math.random() < 0.5) this.tone({ type: 'sine', f: midi(88), t, dur: 1.1, vol: 0.016, verb: 0.9, pan }); // oven ding
        else this.birdChirp();
        break;
      case 'orchard':
        if (Math.random() < 0.4) for (let i = 0; i < 4; i++) this.tone({ type: 'square', f: 520 + (i % 2) * 140, f2: 640, t: t + i * 0.1, dur: 0.07, vol: 0.004, verb: 0.4, pan }); // monkey chatter
        else if (Math.random() < 0.5) this.noiseBurst({ t, dur: 1.4, vol: 0.02, f: 1800, f2: 1200, q: 0.6, verb: 0.4 }); // leaves
        else this.birdChirp();
        break;
      case 'market':
        if (Math.random() < 0.5) this.noiseBurst({ t, dur: 1.6, vol: 0.03, f: 2400, f2: 1800, q: 0.5, type: 'highpass', verb: 0.3 }); // sizzle
        else for (let i = 0; i < 2; i++) this.tone({ type: 'triangle', f: midi(96 - i * 3), t: t + i * 0.08, dur: 0.25, vol: 0.012, verb: 0.5, pan }); // clinking bowls
        break;
      case 'veggie':
        if (Math.random() < 0.4) this.tone({ type: 'sawtooth', f: 180, f2: 120, t, dur: 0.35, vol: 0.008, attack: 0.03, verb: 0.4, pan }); // oink
        else if (Math.random() < 0.5) this.noiseBurst({ t, dur: 1.8, vol: 0.02, f: 800, f2: 1300, q: 0.5, verb: 0.4 }); // corn rustle
        else this.birdChirp();
        break;
      case 'bazaar':
        if (Math.random() < 0.5) for (let i = 0; i < 4; i++) this.tone({ type: 'triangle', f: midi(72 + [0, 1, 4, 5][i]), t: t + i * 0.22, dur: 0.6, vol: 0.012, verb: 0.8, pan }); // oud-ish phrase
        else this.noiseBurst({ t, dur: 2.2, vol: 0.02, f: 600, f2: 1100, q: 0.6, verb: 0.4 }); // warm wind
        break;
      default:
        this.birdChirp();
    }
  }

  // stardust: crisp tink climbing a scale while you chain pickups
  pickup(combo) {
    const t = this.now;
    const f = midi(84 + pentaStep(Math.min(combo, 14)));
    this.tone({ f, t, dur: 0.25, vol: 0.07, verb: 0.4 });
    this.tone({ type: 'triangle', f: f * 2, t, dur: 0.12, vol: 0.025, verb: 0.4 });
  }

  // a collectible find; brand-new ones get a bigger jingle by rarity
  discovery(rarity, isNew) {
    const t = this.now + 0.15;
    if (!isNew) {
      this.tone({ type: 'triangle', f: midi(88), t, dur: 0.3, vol: 0.05, verb: 0.5 });
      this.tone({ type: 'triangle', f: midi(95), t: t + 0.06, dur: 0.3, vol: 0.05, verb: 0.5 });
      return;
    }
    // each rarer tier climbs a little longer and rings a little louder
    const notes = {
      c: [79, 84, 88],
      u: [79, 84, 88, 91],
      r: [76, 79, 84, 88, 91],
      e: [74, 79, 83, 86, 91, 95],
      l: [72, 76, 79, 84, 88, 91, 96, 100],
    }[rarity];
    const big = rarity === 'e' || rarity === 'l';
    notes.forEach((n, i) => this.tone({ type: 'triangle', f: midi(n), t: t + i * 0.06, dur: 0.8, vol: 0.08, verb: 0.7 }));
    this.bell(midi(notes[notes.length - 1]), t + notes.length * 0.06, rarity === 'l' ? 0.22 : big ? 0.17 : 0.12, 2.5);
    if (big) this.bell(midi(notes[notes.length - 1] - 5), t + notes.length * 0.06 + 0.12, rarity === 'l' ? 0.2 : 0.13, 3);
  }

  purchase() {
    const t = this.now;
    this.tone({ f: midi(88), t, dur: 0.2, vol: 0.08, verb: 0.4 });
    this.tone({ f: midi(95), t: t + 0.07, dur: 0.35, vol: 0.08, verb: 0.5 });
    this.noiseBurst({ t, dur: 0.15, vol: 0.02, f: 6000, type: 'highpass', verb: 0.3 });
  }

  deny() {
    const t = this.now;
    this.tone({ type: 'triangle', f: 220, f2: 160, t, dur: 0.18, vol: 0.08, verb: 0.1 });
  }

  packShake() {
    const t = this.now;
    for (let i = 0; i < 6; i++) this.noiseBurst({ t: t + i * 0.1, dur: 0.06, vol: 0.04, f: 1500 + i * 300, q: 3, verb: 0.1 });
    this.tone({ f: 300, f2: 900, t, dur: 0.7, vol: 0.04, glide: 0.65, verb: 0.3 });
  }

  packRip() {
    const t = this.now;
    this.noiseBurst({ t, dur: 0.3, vol: 0.09, f: 800, f2: 5000, q: 0.8, verb: 0.3 });
    this.tone({ f: 160, f2: 50, t, dur: 0.4, vol: 0.3, glide: 0.3, verb: 0 });
    [84, 88, 91, 96].forEach((n, i) => this.tone({ type: 'triangle', f: midi(n), t: t + 0.08 + i * 0.04, dur: 0.6, vol: 0.05, verb: 0.7 }));
  }

  cardFlip() {
    this.noiseBurst({ dur: 0.12, vol: 0.05, f: 2500, f2: 900, q: 1.2, verb: 0.1 });
  }

  // whoosh up into space and back down onto a new world
  warp() {
    const t = this.now;
    this.noiseBurst({ t, dur: 0.9, vol: 0.07, f: 300, f2: 6000, q: 0.7, verb: 0.5 });
    this.tone({ f: 200, f2: 1600, t, dur: 0.5, vol: 0.06, glide: 0.45, verb: 0.6 });
    [72, 79, 84, 91].forEach((n, i) => this.tone({ type: 'triangle', f: midi(n), t: t + 0.5 + i * 0.07, dur: 1, vol: 0.06, verb: 0.8 }));
  }

  // a faint sparkling glissando as a shooting star streaks past
  shootingStar() {
    const t = this.now;
    const pan = Math.random() * 1.4 - 0.7;
    for (let i = 0; i < 5; i++) {
      this.tone({ type: 'triangle', f: midi(100 - pentaStep(i) * 1), t: t + i * 0.05, dur: 0.5, vol: 0.012, verb: 0.9, pan });
    }
    this.noiseBurst({ t, dur: 0.6, vol: 0.008, f: 6000, f2: 2500, q: 0.6, type: 'highpass', verb: 0.6 });
  }

  splash() {
    this.noiseBurst({ dur: 0.25, vol: 0.035, f: 1200, f2: 400, q: 0.8, type: 'lowpass', verb: 0.3 });
  }

  // rolling timbre per surface: [filter centre, Q, low thump]
  setBiome(id) {
    this.biome = id;
    this.rollTimbre = { snow: [1700, 0.9, 0.3], desert: [2600, 0.6, 0.2], pond: [320, 1.6, 1.3], grove: [500, 1.2, 1], shore: [2200, 0.6, 0.4], volcano: [700, 1, 1.5], candy: [600, 2.2, 1.2], autumn: [2000, 0.8, 0.5], park: [800, 1.1, 0.8], downtown: [1400, 0.8, 0.6], suburbs: [600, 1.3, 0.9], funfair: [1100, 1, 1.1], harbour: [700, 1.1, 1], pastures: [500, 1.3, 1], cliffs: [800, 1, 0.8], rainbow: [450, 1.5, 1.2], balloons: [500, 1.3, 1], stargazer: [1200, 0.9, 0.6], savanna: [1400, 0.8, 0.7], canopy: [450, 1.5, 1.1], riverbank: [350, 1.5, 1.2], bamboo: [900, 1, 0.8], outback: [2200, 0.7, 0.4], kelp: [350, 1.5, 1.3], reef: [900, 1.1, 0.9], galleon: [450, 1.4, 1.1], jellyglow: [500, 1.3, 1], vents: [250, 1.8, 1.5], bakery: [900, 1, 0.8], orchard: [500, 1.3, 1], market: [1300, 0.9, 0.7], veggie: [450, 1.4, 1], bazaar: [2200, 0.7, 0.4] }[id] || [450, 1.4, 1];
  }

  setLife(x) {
    this.life = x;
    if (this.padFilter) this.padFilter.frequency.setTargetAtTime(650 + x * 1400, this.now, 1.5);
  }

  // ---- rolling ----------------------------------------------------------------

  startRoll() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    this.rollFilter = ctx.createBiquadFilter();
    this.rollFilter.type = 'bandpass';
    this.rollFilter.frequency.value = 400;
    this.rollFilter.Q.value = 1.4;
    this.rollGain = ctx.createGain();
    this.rollGain.gain.value = 0;
    src.connect(this.rollFilter).connect(this.rollGain).connect(this.sfx);
    src.start();

    const low = ctx.createOscillator();
    low.frequency.value = 72;
    this.lowGain = ctx.createGain();
    this.lowGain.gain.value = 0;
    low.connect(this.lowGain).connect(this.sfx);
    low.start();
  }

  // Continuous wet sloshing synced to the blob's roll
  updateRoll(phase, amount) {
    if (!this.ctx) return;
    const [fc, q, low] = this.rollTimbre || [450, 1.4, 1];
    const w = 0.5 + 0.5 * Math.sin(phase * 2);
    const t = this.now;
    this.rollGain.gain.setTargetAtTime((0.012 + 0.03 * w * w) * amount, t, 0.04);
    this.rollFilter.frequency.setTargetAtTime(fc * (0.7 + 0.9 * w), t, 0.04);
    this.rollFilter.Q.setTargetAtTime(q, t, 0.1);
    this.lowGain.gain.setTargetAtTime(0.03 * w * amount * low, t, 0.05);
  }

  // Water-drop "bloop". Climbs a pentatonic ladder while you cover fresh ground.
  blorp(step) {
    const f = midi(62 + pentaStep(step));
    const t = this.now;
    this.tone({ f: f * 0.55, f2: f, t, dur: 0.16, vol: 0.13, glide: 0.06, verb: 0.25 });
    this.tone({ f: f * 1.1, f2: f * 2, t, dur: 0.09, vol: 0.03, glide: 0.05, verb: 0.2 });
  }

  squish() {
    this.noiseBurst({ dur: 0.12, vol: 0.045, f: 380, f2: 160, q: 2 });
  }

  turnSquelch() {
    this.noiseBurst({ dur: 0.2, vol: 0.06, f: 1500, f2: 350, q: 2.5 });
    this.tone({ f: 180, f2: 90, dur: 0.15, vol: 0.05, verb: 0 });
  }

  bloomTinkle() {
    if (!this.ctx || this.now - this.lastTinkle < 0.14) return;
    this.lastTinkle = this.now;
    const n = 79 + pentaStep(Math.floor(Math.random() * 9));
    this.tone({ type: 'triangle', f: midi(n), dur: 0.5, vol: 0.022, verb: 0.8, pan: Math.random() * 1.2 - 0.6 });
  }

  // ---- rewards ----------------------------------------------------------------

  // 25 / 50 / 75 % of a region
  milestone(level) {
    const f = [1568, 1976, 2349][level - 1] ?? 2349;
    this.tone({ f, dur: 0.6, vol: 0.09, verb: 0.6 });
    this.tone({ f: f * 2, dur: 0.3, vol: 0.03, verb: 0.6 });
  }

  // Quick bright "pling!" for finishing a patch: climbs with each patch in the biome
  patchPing(n = 0) {
    const t = this.now + 0.01;
    const base = midi(79 + pentaStep(n));
    this.bell(base, t, 0.16, 1.8);
    [1, 1.5, 2].forEach((m, i) => this.tone({ type: 'triangle', f: base * m, t: t + 0.06 + i * 0.05, dur: 0.6, vol: 0.06, verb: 0.7 }));
    this.tone({ f: 220, f2: 80, t, dur: 0.2, vol: 0.18, verb: 0, glide: 0.15 });
    this.noiseBurst({ t, dur: 0.35, vol: 0.025, f: 4000, f2: 9000, q: 0.7, type: 'highpass', verb: 0.4 });
  }

  // The signature region-complete "ding-DING!" with shimmer and a soft whomp.
  ping(level = 0) {
    const t = this.now + 0.02;
    const base = midi(72 + [0, 2, 4, 5, 7, 9][level % 6]);
    this.tone({ f: 150, f2: 42, t, dur: 0.45, vol: 0.4, verb: 0, glide: 0.35 });
    this.bell(base, t, 0.22);
    this.bell(base * 1.5, t + 0.11, 0.3, 3.4);
    [1, 1.25, 1.5, 2, 2.5, 3, 4].forEach((m, i) => {
      this.tone({ type: 'triangle', f: base * m, t: t + 0.22 + i * 0.045, dur: 0.9, vol: 0.05, verb: 0.8 });
    });
    this.noiseBurst({ t, dur: 0.6, vol: 0.035, f: 3000, f2: 9000, q: 0.7, type: 'highpass', verb: 0.5 });
  }

  wake() {
    const t = this.now;
    this.tone({ type: 'triangle', f: 260, f2: 820, t, dur: 0.16, vol: 0.14, glide: 0.12, verb: 0.3 });
    this.tone({ type: 'triangle', f: 820, f2: 520, t: t + 0.14, dur: 0.2, vol: 0.12, glide: 0.15, verb: 0.3 });
    this.tone({ f: 1300, f2: 1700, t: t + 0.4, dur: 0.1, vol: 0.06, verb: 0.4 });
    this.tone({ f: 1500, f2: 2000, t: t + 0.52, dur: 0.12, vol: 0.06, verb: 0.4 });
  }

  unlock() {
    const t = this.now;
    [84, 88, 91, 96, 100].forEach((n, i) => {
      this.tone({ type: 'triangle', f: midi(n), t: t + i * 0.075, dur: 0.9, vol: 0.09, verb: 0.7 });
    });
    this.bell(midi(96), t + 0.4, 0.1);
  }

  skinSwap() {
    const t = this.now;
    this.tone({ f: 300, f2: 900, t, dur: 0.18, vol: 0.12, glide: 0.1 });
    this.noiseBurst({ t, dur: 0.3, vol: 0.03, f: 4000, f2: 8000, type: 'highpass', verb: 0.4 });
  }

  fanfare() {
    const t = this.now;
    [60, 64, 67, 72].forEach((n) => this.tone({ type: 'triangle', f: midi(n), t, dur: 3, vol: 0.06, attack: 0.4, verb: 0.8 }));
    for (let i = 0; i < 12; i++) {
      this.tone({ type: 'triangle', f: midi(72 + pentaStep(i)), t: t + 0.3 + i * 0.06, dur: 1, vol: 0.07, verb: 0.8 });
    }
    this.bell(midi(84), t + 1.1, 0.22, 4);
    this.bell(midi(91), t + 1.25, 0.25, 4);
    this.tone({ f: 120, f2: 38, t: t + 1.1, dur: 0.6, vol: 0.4, verb: 0 });
  }
}
