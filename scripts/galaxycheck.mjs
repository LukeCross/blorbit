// Dev helper: galaxy picker, per-galaxy planet saves, migration, unlocking, shop/book tabs, travel.
// usage: node scripts/galaxycheck.mjs [mobile] [travel]
import puppeteer from 'puppeteer-core';

const mobile = process.argv.includes('mobile');
const doTravel = process.argv.includes('travel');
const tag = mobile ? 'mobile' : 'desktop';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
page.on('console', (m) => m.type() === 'warn' && !m.text().includes('GL Driver') && console.log('[warn]', m.text()));
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (n) => page.screenshot({ path: `/tmp/gal-${tag}-${n}.png` });
const ev = (f, ...a) => page.evaluate(f, ...a);
const load = async () => { await page.goto('http://localhost:5173/', { waitUntil: 'load' }); await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true }); await wait(800); };

// ---- 1. migration: an old single-planet save becomes Wildbloom's
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await ev(() => {
  localStorage.clear();
  localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', 'bunny'], equipped: 'classic', restored: 2, autoRoll: false, stardust: 300, finds: { 'meadow:Daisy': 1 }, v: 3 }));
  localStorage.setItem('blorbit-planet-v1', JSON.stringify({ seed: 424242, painted: '', regions: [false, false, false, false], patches: [], patchesDone: [0, 0, 0, 0], dust: '', blob: [0, 1, 0, 0, 0, 1], finished: false }));
  // this throwaway page must not save its own planet over ours as we navigate away
  Storage.prototype.setItem = () => {};
});
await load();
console.log('migrated: old key gone', await ev(() => localStorage.getItem('blorbit-planet-v1') === null), '| resumed seed', await ev(() => window.blorbit.planet().seed), '| galaxy', await ev(() => window.blorbit.planet().galaxy), '| restoredIn', JSON.stringify(await ev(() => window.blorbit.save.restoredIn)));
const cards = await ev(() => [...document.querySelectorAll('#title-galaxies .galaxy-card')].map((c) => `${c.dataset.g}:${c.disabled ? 'locked' : 'open'}:${c.querySelector('.go, .lock')?.textContent.trim().replace(/\s+/g, ' ')}`));
console.log('title cards:', cards);
await shot('1-title');

// ---- 2. pick Wildbloom
await page.click('#title-galaxies .galaxy-card[data-g="wild"]');
await wait(1200);
console.log('playing:', await ev(() => !document.getElementById('title').classList.contains('hidden') ? 'still title' : 'in game'), '| hotkey for frog:', await ev(() => document.querySelector('.skin[data-id="bunny"] .key')?.textContent));

// ---- 2b. while Citylight is locked its tab still shows, disabled, in the shop and the book
const tabsNow = (sel) => ev((sel) => [...document.querySelectorAll(`${sel} .galaxy-tabs button`)].map((b) => `${b.textContent.trim()}${b.disabled ? ' [disabled]' : ''}${b.classList.contains('active') ? '*' : ''}`), sel);
await page.click('#shop-btn'); await wait(500);
console.log('locked - shop tabs:', await tabsNow('#shop'));
await page.click('#shop .galaxy-tabs button.locked').catch(() => {}); await wait(300);
console.log('locked - after tapping locked tab, rows still Wildbloom:', await ev(() => document.querySelector('#shop .pack-row b')?.textContent));
await shot('1b-shop-locked');
await page.click('#shop-close'); await wait(300);
await page.click('#book-btn'); await wait(400);
console.log('locked - book tabs:', await tabsNow('#book'));
await shot('1c-book-locked');
await page.click('#book-close'); await wait(300);

// ---- 3. waking the 8th of 10 Wildbloom creatures (80%) unlocks Citylight
await ev(() => {
  const b = window.blorbit, p = b.planet();
  const last = p.creatureOrder[0];
  b.save.unlocked = ['classic', ...['bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog'].filter((c) => c !== last).slice(0, 7)];
  b.completeRegion(0);
});
await wait(5200);
console.log('toast:', await ev(() => document.getElementById('toast').textContent.trim()), '| galaxy dot:', await ev(() => document.getElementById('galaxy-btn').classList.contains('new')));
await shot('2-unlocked-toast');
console.log('planet saved under wild key with galaxy field:', await ev(() => JSON.parse(localStorage.getItem(window.blorbit.planetKey('wild')) || '{}').galaxy));

// ---- 4. galaxy travel panel, shop tabs, book tabs
await page.click('#galaxy-btn'); await wait(500);
console.log('travel cards:', await ev(() => [...document.querySelectorAll('#galaxy-list .galaxy-card')].map((c) => `${c.dataset.g}:${c.disabled ? 'locked' : 'open'}:${c.querySelector('.go')?.textContent}`)));
await shot('3-travel');
await page.click('#galaxies-close'); await wait(300);
await page.click('#shop-btn'); await wait(500);
console.log('shop tabs:', await ev(() => [...document.querySelectorAll('#shop .galaxy-tabs button')].map((b) => `${b.textContent.trim()}${b.classList.contains('active') ? '*' : ''}`)), '| rows:', await ev(() => document.querySelectorAll('#shop .pack-row').length));
await page.click('#shop .galaxy-tabs button[data-id="city"]'); await wait(300);
console.log('city tab rows:', await ev(() => [...document.querySelectorAll('#shop .pack-row b')].map((b) => b.textContent)));
await shot('4-shop-city');
await page.click('#shop-close'); await wait(300);
await page.click('#book-btn'); await wait(400);
await page.click('#book .galaxy-tabs button[data-id="city"]'); await wait(300);
console.log('book city:', await ev(() => document.getElementById('book-total').textContent));
await shot('5-book-city');
await page.click('#book-close'); await wait(300);

// ---- 5. travel to Citylight and back (needs the city props + skins)
if (doTravel) {
  await page.click('#galaxy-btn'); await wait(400);
  await page.click('#galaxy-list .galaxy-card[data-g="city"]');
  await wait(4000);
  const p = await ev(() => ({ galaxy: window.blorbit.planet().galaxy, biomes: window.blorbit.planet().biomes, keys: [...document.querySelectorAll('.skin')].map((s) => s.dataset.id + (s.querySelector('.key')?.textContent ?? '')) }));
  console.log('in city:', JSON.stringify(p));
  await shot('6-city');
  const citySeed = await ev(() => window.blorbit.planet().seed);
  await page.click('#galaxy-btn'); await wait(400);
  await page.click('#galaxy-list .galaxy-card[data-g="wild"]');
  await wait(3500);
  console.log('back in wild: same planet as before?', await ev(() => window.blorbit.planet().seed));
  await page.click('#galaxy-btn'); await wait(400);
  await page.click('#galaxy-list .galaxy-card[data-g="city"]');
  await wait(3500);
  console.log('city planet resumed:', (await ev(() => window.blorbit.planet().seed)) === citySeed);
  // reload: lands on the title with Citylight as the "Continue" galaxy
  await load();
  console.log('after reload save.galaxy', await ev(() => window.blorbit.save.galaxy), '| planet behind title', await ev(() => window.blorbit.planet().galaxy));
}
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
