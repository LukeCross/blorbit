// Dev helper: "Menu" button and the finale's "Back to main menu" return to the galaxy picker.
// usage: node scripts/menucheck.mjs [mobile]
import puppeteer from 'puppeteer-core';

const mobile = process.argv.includes('mobile');
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
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f, ...a) => page.evaluate(f, ...a);
const shot = (n) => page.screenshot({ path: `/tmp/menu-${tag}-${n}.png` });
const onTitle = () => ev(() => !document.getElementById('title').classList.contains('hidden') && document.getElementById('hud-left').classList.contains('hidden'));
const cardLabels = () => ev(() => [...document.querySelectorAll('#title-galaxies .galaxy-card')].map((c) => `${c.dataset.g}:${c.querySelector('.go')?.textContent ?? 'locked'}`));
const pickWild = () => page.click('#title-galaxies .galaxy-card[data-g="wild"]');

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// every Wildbloom friend awake, so both galaxies are open
await ev(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', 'bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog'], v: 3, seenGalaxies: ['wild', 'city'] })); Storage.prototype.setItem = () => {}; });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
await wait(500);
await pickWild();
await wait(1500);
await shot('1-hud');
const seed1 = await ev(() => window.blorbit.planet().seed);
await ev(() => window.blorbit.completePatch(0));
await wait(1200);

// ---- Menu button -> title, carry on with the same planet
await page.click('#menu-btn');
await wait(800);
console.log('menu button -> on title:', await onTitle(), '| cards:', await cardLabels());
await shot('2-menu');
await pickWild();
await wait(1500);
console.log('picked Wildbloom again -> same planet:', (await ev(() => window.blorbit.planet().seed)) === seed1, '| spot still done:', await ev(() => window.blorbit.planet().patches[0].done >= 0));

// ---- switch galaxy from the menu
await page.click('#menu-btn'); await wait(600);
await page.click('#title-galaxies .galaxy-card[data-g="city"]');
await wait(3500);
console.log('picked Citylight from menu -> galaxy:', await ev(() => window.blorbit.planet().galaxy), '| in game:', !(await onTitle()));

// ---- finish the planet -> finale -> Back to main menu -> picking the same galaxy starts a fresh planet
const citySeed = await ev(() => window.blorbit.planet().seed);
await ev(() => { for (let r = 0; r < 4; r++) window.blorbit.completeRegion(r); });
await page.waitForFunction(() => !document.getElementById('finale').classList.contains('hidden'), { timeout: 60000 });
await wait(800);
console.log('finale buttons:', await ev(() => [...document.querySelectorAll('#finale .finale-actions .btn')].filter((b) => !b.classList.contains('hidden')).map((b) => b.textContent.trim())));
await shot('3-finale');
await page.click('#finale-menu');
await wait(800);
console.log('finale -> menu: on title', await onTitle(), '| finale hidden', await ev(() => document.getElementById('finale').classList.contains('hidden')), '| cards:', await cardLabels());
await page.click('#title-galaxies .galaxy-card[data-g="city"]');
await wait(3500);
console.log('picked Citylight after finishing -> fresh planet:', (await ev(() => window.blorbit.planet().seed)) !== citySeed, '| woken so far', await ev(() => window.blorbit.planet().regionDone.filter((d) => d >= 0).length));
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
