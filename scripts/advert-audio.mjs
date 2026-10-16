// Dev helper: renders the advert's soundtrack to /tmp/ad/advert.wav (20s, stereo). It runs the game's own Sound class
// (src/audio.js) on an OfflineAudioContext, so the bells, blorps and pings are the real ones, and lays a calm-to-bouncy
// pentatonic beat under them. Cue times match scripts/advert.sh and the restore moments in scripts/advert-capture.mjs.
// Needs the dev server. usage: node scripts/advert-audio.mjs
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => console.log('[page]', m.text()));
await page.goto('http://localhost:5173/scripts/advert/overlay.html?s=mark', { waitUntil: 'load' });
const b64 = await page.evaluate(async () => {
  const { Sound } = await import('/src/audio.js');
  const SR = 44100, DUR = 20;
  const off = new OfflineAudioContext(2, SR * DUR, SR);
  window.AudioContext = function () { return off; };
  const s = new Sound();
  s.startAmbient = s.startWeather = s.startRoll = () => {}; // live-only loops
  s.start();
  let T = 0;
  Object.defineProperty(s, 'now', { get: () => T });
  const at = (t, fn) => { T = t; fn(); };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const penta = (i) => 12 * Math.floor(i / 5) + [0, 2, 4, 7, 9][((i % 5) + 5) % 5];

  const DROP = 2.8, BEAT = 0.5, BAR = 2, END = 17.3;
  // Am F C G, twice, then Am; the end card resolves to C
  const BARS = [
    { pad: [57, 60, 64, 67], root: 45, arp: [4, 5, 7, 5, 4, 5, 7, 8] },
    { pad: [53, 57, 60, 64], root: 41, arp: [3, 4, 5, 4, 3, 4, 5, 7] },
    { pad: [55, 60, 64, 67], root: 48, arp: [2, 3, 5, 3, 2, 3, 5, 6] },
    { pad: [55, 59, 62, 66], root: 43, arp: [1, 3, 4, 3, 1, 3, 4, 5] },
    { pad: [57, 60, 64, 67], root: 45, arp: [4, 5, 7, 5, 4, 5, 7, 8] },
    { pad: [53, 57, 60, 64], root: 41, arp: [3, 4, 5, 4, 3, 4, 5, 7] },
    { pad: [55, 60, 64, 67], root: 48, arp: [2, 3, 5, 3, 2, 3, 5, 6] },
    { pad: [55, 59, 62, 66], root: 43, arp: [1, 3, 4, 3, 1, 3, 4, 5] },
    { pad: [57, 60, 64, 67], root: 45, arp: [4, 5, 7, 5, 4, 7, 8, 9] },
  ];

  // dead world: a soft held Am, a few lonely twinkles, and the blob's blorps as it starts to roll
  BARS[0].pad.forEach((n) => at(0, () => s.tone({ type: 'triangle', f: midi(n - 12), dur: 3.4, vol: 0.04, attack: 1.4, verb: 0.9 })));
  [0.5, 1.2, 1.9].forEach((t, i) => at(t, () => s.tone({ type: 'triangle', f: midi(81 + penta(i * 2)), dur: 0.9, vol: 0.022, verb: 0.9, pan: i % 2 ? 0.4 : -0.4 })));
  for (let i = 0; i < 6; i++) at(0.3 + i * 0.4, () => s.blorp(i));
  // riser into the first restore
  at(1.5, () => s.noiseBurst({ dur: 1.3, vol: 0.05, f: 700, f2: 9000, q: 0.7, type: 'highpass', verb: 0.5 }));
  at(1.5, () => s.tone({ f: 260, f2: 1500, dur: 1.3, vol: 0.035, glide: 1.25, verb: 0.6 }));

  // the drop: four-on-the-floor kick, offbeat hats, soft claps, bouncy bass and a pentatonic arp
  BARS.forEach((b, bi) => {
    const t0 = DROP + bi * BAR;
    if (t0 >= END) return;
    b.pad.forEach((n) => at(t0, () => s.tone({ type: 'triangle', f: midi(n), dur: BAR + 0.6, vol: 0.03, attack: 0.25, verb: 0.8 })));
    for (let k = 0; k < 4; k++) {
      const t = t0 + k * BEAT;
      if (t >= END) break;
      at(t, () => s.tone({ f: 165, f2: 45, dur: 0.3, vol: 0.36, glide: 0.13, verb: 0 }));
      at(t + 0.25, () => s.noiseBurst({ dur: 0.06, vol: 0.022, f: 7500, q: 0.7, type: 'highpass', verb: 0.05 }));
      if (k % 2) at(t, () => s.noiseBurst({ dur: 0.14, vol: 0.06, f: 1900, q: 1, verb: 0.3 }));
      at(t, () => { s.tone({ type: 'triangle', f: midi(b.root), dur: 0.38, vol: 0.2, verb: 0 }); s.tone({ f: midi(b.root), dur: 0.38, vol: 0.14, verb: 0 }); });
      if (k % 2 === 0) at(t + 0.375, () => s.tone({ type: 'triangle', f: midi(b.root + 12), dur: 0.16, vol: 0.09, verb: 0 }));
    }
    for (let e = 0; e < 8; e++) {
      const t = t0 + e * 0.25;
      if (t >= END) break;
      const n = 60 + penta(b.arp[e]) + (bi >= 2 ? 12 : 0);
      at(t, () => s.tone({ type: 'triangle', f: midi(n), dur: 0.36, vol: 0.05, verb: 0.5, pan: e % 2 ? 0.3 : -0.3 }));
      if (bi >= 3) at(t, () => s.tone({ f: midi(n + 12), dur: 0.2, vol: 0.016, verb: 0.6, pan: e % 2 ? -0.4 : 0.4 }));
    }
  });
  // last stretch: a rising run into the end card
  for (let i = 0; i < 6; i++) at(END - 0.5 + i * 0.083, () => s.tone({ type: 'triangle', f: midi(72 + penta(5 + i)), dur: 0.5, vol: 0.06, verb: 0.7 }));

  // restore moments (these land on the beat grid)
  [[2.8, 0], [11.3, 1], [16.3, 3]].forEach(([t, l]) => at(t, () => s.ping(l)));
  // shop and pack: buy, shake, rip, then three card flips (common, uncommon, legendary) like the real thing
  at(5.15, () => s.purchase());
  at(6.1, () => s.packShake());
  at(6.8, () => s.packRip());
  [[7.2, 'c'], [7.6, 'u'], [8.0, 'l']].forEach(([t, r]) => { at(t, () => s.cardFlip()); at(t + 0.18, () => s.discovery(r, true)); });
  // the book's last find slots in
  at(9.3, () => s.unlock());
  // the lion wakes (0.5s after the restore), its skin unlocks, then a quick flick through skins
  at(11.8, () => s.wake());
  at(12.7, () => s.unlock());
  for (let i = 0; i < 5; i++) at(12.85 + i * 0.55, () => s.skinSwap());
  // slide transitions
  [4.0, 8.25, 10.65, 15.3].forEach((t) => at(t, () => s.noiseBurst({ dur: 0.4, vol: 0.06, f: 500, f2: 4500, q: 0.8, verb: 0.4 })));
  // end card
  at(END, () => s.fanfare());
  [18.2, 18.7, 19.1].forEach((t, i) => at(t, () => s.tone({ type: 'triangle', f: midi(88 + penta(i * 2)), dur: 1, vol: 0.03, verb: 0.9 })));
  s.master.gain.setValueAtTime(s.level, 19.1);
  s.master.gain.linearRampToValueAtTime(0, 19.95);

  const buf = await off.startRendering();
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const k = 0.89 / peak; // normalise to about -1 dBFS
  const pcm = new Int16Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { pcm[i * 2] = Math.round(L[i] * k * 32767); pcm[i * 2 + 1] = Math.round(R[i] * k * 32767); }
  console.log('peak before normalise', peak.toFixed(3));
  const bytes = new Uint8Array(pcm.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
});
await browser.close();
const pcm = Buffer.from(b64, 'base64');
const hdr = Buffer.alloc(44);
hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(44100, 24); hdr.writeUInt32LE(44100 * 4, 28); hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
fs.writeFileSync('/tmp/ad/advert.wav', Buffer.concat([hdr, pcm]));
console.log('wrote /tmp/ad/advert.wav');
