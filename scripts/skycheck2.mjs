// Dev helper: Skyhaven unlock (4 of 5 Citylight friends), travel there and back, title/tabs with 3 galaxies.
// usage: node scripts/skycheck2.mjs [mobile]
import puppeteer from 'puppeteer-core';
const mobile = process.argv.includes('mobile');
const tag = mobile ? 'mobile' : 'desktop';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
page.on('console', (m) => m.type() === 'warn' && !m.text().includes('GL Driver') && console.log('[warn]', m.text()));
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f, ...a) => page.evaluate(f, ...a);
const shot = (n) => page.screenshot({ path: `/tmp/sky-${tag}-${n}.png` });
const WILD = ['bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog'];

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// all of Wildbloom + 3 of 5 Citylight friends: Skyhaven is one friend away
await ev((w) => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', ...w, 'squirrel', 'cat', 'dog'], v: 3, seenGalaxies: ['wild', 'city'] })); Storage.prototype.setItem = () => {}; }, WILD);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
await wait(600);
console.log('title:', await ev(() => [...document.querySelectorAll('#title-galaxies .galaxy-card')].map((c) => `${c.dataset.g}:${c.classList.contains('locked') ? 'locked ' + c.querySelector('.lock').textContent.trim() : 'open'}`)));
await shot('1-title');

// go to Citylight, wake a 4th city friend there -> Skyhaven unlocks
await page.click('#title-galaxies .galaxy-card[data-g="city"]');
await wait(4000);
await ev(() => {
  const b = window.blorbit, p = b.planet();
  const r = p.creatureOrder.findIndex((c) => !b.save.unlocked.includes(c));
  b.completeRegion(r);
});
await wait(5500);
console.log('toast:', await ev(() => document.getElementById('toast').textContent.trim()));
await page.click('#shop-btn'); await wait(500);
console.log('shop tabs:', await ev(() => [...document.querySelectorAll('#shop .galaxy-tabs button')].map((b) => `${b.textContent.trim()}${b.disabled ? ' [disabled]' : ''}${b.classList.contains('active') ? '*' : ''}`)));
await page.click('#shop .galaxy-tabs button[data-id="sky"]'); await wait(300);
console.log('sky shop rows:', await ev(() => [...document.querySelectorAll('#shop .pack-row b')].map((b) => b.textContent)));
await shot('2-shop-sky');
await page.click('#shop-close'); await wait(300);

// travel to Skyhaven
await page.click('#galaxy-btn'); await wait(500);
await shot('3-travel');
await page.click('#galaxy-list .galaxy-card[data-g="sky"]');
await wait(4500);
const sky = await ev(() => ({ galaxy: window.blorbit.planet().galaxy, biomes: window.blorbit.planet().biomes, keys: [...document.querySelectorAll('.skin')].slice(0, 6).map((s) => s.dataset.id + (s.querySelector('.key')?.textContent ?? '')), book: document.getElementById('book-count').textContent }));
console.log('in Skyhaven:', JSON.stringify(sky));
await shot('4-sky');
const skySeed = await ev(() => window.blorbit.planet().seed);
await page.click('#menu-btn'); await wait(700);
console.log('menu cards:', await ev(() => [...document.querySelectorAll('#title-galaxies .galaxy-card')].map((c) => `${c.dataset.g}:${c.querySelector('.go')?.textContent ?? 'locked'}`)));
await shot('5-menu');
await page.click('#title-galaxies .galaxy-card[data-g="sky"]'); await wait(1500);
console.log('Skyhaven planet resumed from menu:', (await ev(() => window.blorbit.planet().seed)) === skySeed);
await page.click('#book-btn'); await wait(500);
await shot('6-book');
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
