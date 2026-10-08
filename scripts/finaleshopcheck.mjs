// Dev helper: finish a planet, open the shop from the "Planet restored" card, close it, expect the card back.
// usage: node scripts/finaleshopcheck.mjs [mobile]
import puppeteer from 'puppeteer-core';

const mobile = process.argv[2] === 'mobile';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.setDefaultTimeout(120000);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const hidden = (id) => page.evaluate((id) => document.getElementById(id).classList.contains('hidden'), id);
const tag = mobile ? 'mobile' : 'desktop';

await wait(2500);
await page.click('#start-btn');
await wait(1500);
await page.evaluate(() => { window.blorbit.save.stardust = 140; for (let r = 0; r < 4; r++) window.blorbit.completeRegion(r); });
await page.waitForFunction(() => !document.getElementById('finale').classList.contains('hidden'), { timeout: 60000 });
await wait(1500);
await page.screenshot({ path: `/tmp/finale-${tag}-1.png` });
console.log('finale dust label:', await page.$eval('#finale-dust', (e) => e.textContent));

await page.click('#finale-shop');
await wait(800);
console.log('shop open:', !(await hidden('shop')), '| finale hidden:', await hidden('finale'));
await page.click('#shop-close');
await wait(800);
console.log('after close -> finale visible:', !(await hidden('finale')), '| shop hidden:', await hidden('shop'));

// buying a pack from here and pressing Done should also come back, with the new balance
await page.click('#finale-shop');
await wait(600);
await page.click('button[data-action="pack"][data-type="standard"]');
await wait(1200);
await page.click('.pack-box');
await wait(1500);
for (const i of [0, 1, 2]) { await page.click(`.card[data-i="${i}"]`); await wait(400); }
await page.waitForSelector('#pack-done', { visible: true, timeout: 30000 });
await wait(500);
await page.click('#pack-done');
await wait(800);
console.log('after pack -> finale visible:', !(await hidden('finale')), '| dust label:', await page.$eval('#finale-dust', (e) => e.textContent));
await page.screenshot({ path: `/tmp/finale-${tag}-2.png` });

// a plain shop visit afterwards (from the HUD) must not pop the card up again
await page.click('#keep-rolling');
await wait(500);
await page.click('#shop-btn');
await wait(500);
await page.click('#shop-close');
await wait(500);
console.log('HUD shop visit -> finale stays hidden:', await hidden('finale'));
await browser.close();
