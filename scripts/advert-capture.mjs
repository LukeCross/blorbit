// Dev helper: renders the vertical social advert's gameplay clips as PNG frame sequences in /tmp/ad/<clip>/.
// The page clock is virtual (performance.now + requestAnimationFrame are driven by us), so frames are
// deterministic and SwiftShader's slowness doesn't matter. Needs the dev server. scripts/advert.sh stitches it all.
// usage: node scripts/advert-capture.mjs [clip ...]   (no args = every clip)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const W = 540, H = 960, SCALE = 2, FPS = 30;
const ALL_UNLOCKED = ['classic', 'bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog', 'squirrel', 'cat', 'dog', 'raccoon', 'seagull', 'sheep', 'goat', 'unicorn', 'eagle', 'owl', 'lion', 'parrot', 'hippo', 'panda', 'koala', 'otter', 'pufferfish', 'shark', 'jellyfish', 'squid', 'rooster', 'monkey', 'rat', 'pig', 'camel', 'ghost', 'bat', 'witch', 'zombie', 'spider'];

// each clip: galaxy, a biome to play in, seconds, and a script of timed actions (t in seconds)
const CLIPS = {
  // dead world, blob rolls up and the whole biome blooms
  a: { galaxy: 'wild', biome: 'meadow', secs: 5.5, back: 0.34, hold: [[0.3, 5.5]], region: 2.8 },
  // a quick Seaglow bloom for the "8 galaxies" beat
  b: { galaxy: 'sea', biome: 'reef', secs: 2.4, back: 0.3, hold: [[0, 2.4]], region: 0.9 },
  // shop, then tap the pack and flip three cards (the draw is hand-picked so the clip always ends on a legendary)
  pack: {
    galaxy: 'sea', biome: 'reef', secs: 4.6, back: 0.3, hold: [], setup: "blorbit.save.stardust = 180; document.head.insertAdjacentHTML('beforeend', '<style>#pack-stage { zoom: 1.12 }</style>')",
    actions: [
      [0.0, 'blorbit.shop.open()'],
      [1.1, "__cards('reef', ['c', 'u', 'l']).then((c) => blorbit.shop.showPack('reef', 'premium', c))"],
      [2.05, "document.querySelector('.pack-box').click()"],
      [3.15, "document.querySelectorAll('#pack-stage .card')[0].click()"],
      [3.55, "document.querySelectorAll('#pack-stage .card')[1].click()"],
      [3.95, "document.querySelectorAll('#pack-stage .card')[2].click()"],
    ],
    cleanup: "document.getElementById('pack').classList.add('hidden'); blorbit.shop.close()",
  },
  // wake a sleeping creature (its skin unlocks), then flick through skins on a closer camera
  skins: {
    galaxy: 'safari', biome: 'savanna', secs: 5.0, back: 0.1, hold: [], region: 0.55, show: ['skins', 'toast'],
    setup: "Object.assign(blorbit.CAM, { up: 5, back: 2 }); blorbit.save.unlocked = blorbit.save.unlocked.filter((x) => x !== 'lion'); blorbit.buildSkinBar()",
    actions: ['parrot', 'hippo', 'panda', 'koala', 'lion'].map((id, i) => [2.1 + i * 0.55, `document.querySelector('#skins .skin[data-id=${id}]').click()`]),
    cleanup: "Object.assign(blorbit.CAM, { up: 11, back: 4 })",
  },
  // the collection book nearly full, then the last find slots in
  book: {
    galaxy: 'sea', biome: 'reef', secs: 2.8, back: 0.3, hold: [],
    setup: "__fillSea().then(() => blorbit.toggleBook('sea'))",
    actions: [
      [1.0, "document.querySelector('#book-grid [data-action=tab][data-id=sea]').click(); __lastFind().then((k) => { blorbit.save.finds[k] = 1; document.querySelector('#book-grid [data-action=tab][data-id=sea]').click(); document.querySelector(`.slot[data-key=\"${k}\"]`).click(); })"],
    ],
    cleanup: "blorbit.toggleBook()",
  },
};

const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE, isMobile: false });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.setDefaultTimeout(300000);
await page.evaluateOnNewDocument(() => {
  let now = 1000, q = [], timers = [], tid = 1e6;
  const born = new WeakMap();
  let virtual = false;
  const realST = window.setTimeout.bind(window), realCT = window.clearTimeout.bind(window);
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => (q.push(cb), q.length);
  // once virtual, timers and CSS animations only move when we step (pack/book UI relies on both)
  window.setTimeout = (fn, ms = 0, ...a) => {
    if (!virtual) return realST(fn, ms, ...a);
    timers.push({ id: ++tid, at: now + ms, fn: () => fn(...a) });
    return tid;
  };
  window.clearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); realCT(id); };
  window.__virtual = () => { virtual = true; };
  window.__step = (ms) => {
    now += ms;
    for (let guard = 0; guard < 1000; guard++) {
      const due = timers.filter((t) => t.at <= now).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers = timers.filter((t) => t !== due);
      due.fn();
    }
    const run = q; q = []; run.forEach((cb) => cb(now));
    if (virtual) {
      for (const a of document.getAnimations()) {
        if (!born.has(a)) born.set(a, now);
        a.pause();
        a.currentTime = now - born.get(a);
      }
    }
  };
});
const step = (ms) => page.evaluate((ms) => window.__step(ms), ms);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.evaluate((u) => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: u, guideSeen: true, spotsDone: 5, xp: 900, v: 3 })); }, ALL_UNLOCKED);
await page.reload({ waitUntil: 'load' });
// the loader waits on drawn frames, so keep stepping until the title is up
for (let i = 0; i < 600; i++) {
  if (await page.evaluate(() => document.body.classList.contains('on-title') && !document.getElementById('loader')?.offsetParent)) break;
  await step(33);
  await new Promise((r) => setTimeout(r, 30));
}

await page.evaluate(() => {
  window.__virtual();
  document.head.insertAdjacentHTML('beforeend', '<style>.buy.free { display: none !important }</style>'); // no video-ad buttons in an advert
  // pick finds of the wanted rarities from a biome, as pack cards
  window.__cards = async (biome, rarities) => {
    const { BIOMES } = await import('/src/biomes.js');
    return rarities.map((r) => {
      const [emoji, name, rarity] = BIOMES[biome].finds.find(([, , t]) => t === r);
      return { emoji, name, rarity, isNew: true, count: 1, rankUp: false, mastered: false };
    });
  };
  // nearly-full Seaglow: every find but the last biome's legendary, with a spread of duplicate counts
  window.__lastFind = async () => {
    const { BIOMES } = await import('/src/biomes.js');
    const b = BIOMES.kelp;
    return `kelp:${b.finds.find(([, , t]) => t === 'l')[1]}`;
  };
  window.__fillSea = async () => {
    const { BIOMES } = await import('/src/biomes.js');
    const last = await window.__lastFind();
    let i = 0;
    for (const id of ['kelp', 'reef', 'galleon', 'jellyglow', 'vents']) {
      for (const [, name, t] of BIOMES[id].finds) {
        const k = `${id}:${name}`;
        if (k === last) continue;
        const counts = { c: [3, 6, 11, 2, 25], u: [2, 5, 9, 14], r: [1, 3, 6], e: [1, 2, 5], l: [1, 2] }[t];
        window.blorbit.save.finds[k] = counts[i++ % counts.length];
      }
    }
  };
});
const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
for (const name of names) {
  const c = CLIPS[name];
  const dir = `/tmp/ad/${name}`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  await page.evaluate((c) => {
    const b = window.blorbit;
    const g = c.galaxy;
    b.save.galaxy = g;
    for (let s = 3; s < 300 && !(b.newPlanet(s, g), b.planet().biomes.includes(c.biome)); s++);
    b.enterGalaxy(g);
    const p = b.planet(), r = p.biomes.indexOf(c.biome), ctr = p.centers[r];
    const side = ctr.clone().cross({ x: 0.3, y: 1, z: 0.2 }).normalize();
    const start = ctr.clone().applyAxisAngle(side, c.back).normalize();
    b.blob.placeAt(start, ctr.clone().sub(start));
    ['goal-hint', 'steer-sides', 'autoroll', 'skins', 'hud-left', 'hud-right', 'xp-gain', 'hud-top', 'toast', 'popups', 'finds', 'biome-label'].forEach((id) => { const el = document.getElementById(id); if (el) el.style.display = (c.show ?? []).includes(id) ? '' : 'none'; });
  }, c);
  if (c.setup) await page.evaluate(c.setup);
  // settle: a couple of seconds so the title fade, planet intro and camera ease are done
  for (let i = 0; i < 60; i++) await step(1000 / FPS);
  const n = Math.round(c.secs * FPS);
  let region = false;
  const todo = [...(c.actions ?? [])];
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    while (todo.length && t >= todo[0][0]) await page.evaluate(todo.shift()[1]);
    await page.evaluate((hold, t, doRegion) => {
      window.blorbit.keys.up = hold.some(([a, b]) => t >= a && t < b);
    }, c.hold, t, false);
    if (!region && c.region !== undefined && t >= c.region) {
      region = true;
      await page.evaluate((biome) => { const b = window.blorbit; b.completeRegion(b.planet().biomes.indexOf(biome)); }, c.biome);
    }
    if (!region && c.restore !== undefined && t >= c.restore) {
      region = true;
      await page.evaluate((biome) => { const b = window.blorbit, p = b.planet(), r = p.biomes.indexOf(biome); const k = p.patches.findIndex((q) => q.region === r && q.done < 0); b.completePatch(k); }, c.biome);
    }
    await step(1000 / FPS);
    await page.screenshot({ path: `${dir}/${String(f).padStart(4, '0')}.png`, type: 'png' });
  }
  if (c.cleanup) await page.evaluate(c.cleanup);
  console.log('clip', name, n, 'frames');
}
await browser.close();
