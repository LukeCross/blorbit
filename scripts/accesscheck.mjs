// Dev helper: turning-sensitivity slider and colorblind mode in Settings.
// usage: node scripts/accesscheck.mjs [mobile]
import puppeteer from 'puppeteer-core';

const mobile = process.argv[2] === 'mobile';
const tag = mobile ? 'mobile' : 'desktop';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const load = async () => { await page.goto('http://localhost:5173/', { waitUntil: 'load' }); await wait(2500); await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click(); await wait(1200); };
const turnRate = () => page.evaluate(() => window.blorbit.blob.turnRate.toFixed(3));

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await load();
console.log('default turn rate', await turnRate());
await page.click('#settings-btn');
await wait(500);
await page.screenshot({ path: `/tmp/access-${tag}-1-settings.png` });

// drag-free: set the slider like a user would, firing input + change
await page.$eval('#sensitivity', (el) => { el.value = 0.6; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
console.log('at 60%: turn rate', await turnRate(), '| label', await page.$eval('#sensitivity-value', (e) => e.textContent));

// keyboard: arrows nudge the slider and must not steer the blob
const f0 = await page.evaluate(() => window.blorbit.blob.f.toArray().map((v) => v.toFixed(4)).join());
await page.focus('#sensitivity');
for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
await wait(400);
const f1 = await page.evaluate(() => window.blorbit.blob.f.toArray().map((v) => v.toFixed(4)).join());
console.log('after 4x ArrowRight: label', await page.$eval('#sensitivity-value', (e) => e.textContent), '| blob heading unchanged:', f0 === f1);
await page.$eval('#sensitivity', (el) => el.dispatchEvent(new Event('change', { bubbles: true })));

await page.click('#colorblind');
await wait(300);
console.log('colorblind on: body.cb', await page.evaluate(() => document.body.classList.contains('cb')), '| aria-checked', await page.$eval('#colorblind', (e) => e.getAttribute('aria-checked')));
await page.screenshot({ path: `/tmp/access-${tag}-2-settings-cb.png` });

// persists across reload
await load();
console.log('after reload: turn rate', await turnRate(), '| sensitivity', await page.evaluate(() => window.blorbit.save.sensitivity), '| body.cb', await page.evaluate(() => document.body.classList.contains('cb')));

// show the cues: finish a biome (✓ ring), push one nearly done (pulse), unlock some finds of each rarity
await page.evaluate(() => {
  const b = window.blorbit;
  b.completeRegion(0);
  for (let i = 0; i < 6; i++) b.rollFind('meadow', b.blob.p.clone());
});
await wait(6000);
await page.screenshot({ path: `/tmp/access-${tag}-3-hud-cb.png` });
await page.evaluate(() => window.blorbit.toggleBook());
await wait(600);
await page.screenshot({ path: `/tmp/access-${tag}-4-book-cb.png` });
await browser.close();
