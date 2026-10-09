// Dev helper: mobile tap steering (always rolls, hold a side to turn).
// usage: node scripts/tapsteercheck.mjs
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await page.createCDPSession();
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
const blob = () => page.evaluate(() => ({ speed: +window.blorbit.blob.speed.toFixed(2), turn: +window.blorbit.blob.turnVel.toFixed(2) }));
const sides = () => page.evaluate(() => [...document.querySelectorAll('.steer-side')].map((e) => e.classList.contains('on')));
const hold = async (points, ms) => { await touch('touchStart', points); await wait(ms); const b = await blob(); const s = await sides(); await touch('touchEnd', []); await wait(700); return { ...b, sides: s }; };

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await wait(2500);
console.log('body.tap-steer', await page.evaluate(() => document.body.classList.contains('tap-steer')), '| title hint:', await page.$eval('.tap-only', (e) => getComputedStyle(e).display !== 'none' && e.textContent));
await page.tap('#start-btn');
await wait(600);
await page.screenshot({ path: '/tmp/tap-1-hint.png' });
await wait(2500);
console.log('no input -> rolling forward:', await blob(), '| auto-roll button visible:', await page.$eval('#autoroll', (e) => getComputedStyle(e).display !== 'none'));

console.log('hold LEFT  (turn should be < 0):', await hold([[60, 500]], 600));
await touch('touchStart', [[60, 500]]); await wait(150); const early = (await blob()).turn; await wait(700); const late = (await blob()).turn; await touch('touchEnd', []); await wait(700);
console.log('ramp: turn after 150ms', early, '-> after 850ms', late, '(should grow)');
await touch('touchStart', [[330, 500]]); await wait(500); await page.screenshot({ path: '/tmp/tap-2-right-held.png' }); await touch('touchEnd', []); await wait(700);
console.log('hold RIGHT (turn should be > 0): checked via screenshot; repeat for numbers:', await hold([[330, 500]], 600));

// quick tap: a 40ms touch should still produce a visible nudge
await touch('touchStart', [[60, 500]]); await wait(40); await touch('touchEnd', []);
await wait(90);
console.log('quick 40ms tap LEFT, 90ms later -> turn', (await blob()).turn, '(should be < 0)');
await wait(800);

console.log('both thumbs (turn ~ 0):', await hold([[60, 500], [330, 500]], 600));

// sliding a held finger across the middle switches side
await touch('touchStart', [[60, 500]]); await wait(400);
await touch('touchMove', [[330, 500]]); await wait(500);
console.log('slide left -> right while held: turn', (await blob()).turn, '(should be > 0)', '| sides', await sides());
await touch('touchEnd', []); await wait(700);

// HUD buttons are not steering zones
await page.tap('#settings-btn'); await wait(500);
console.log('settings opened by tap:', await page.$eval('#settings', (e) => !e.classList.contains('hidden')), '| sides lit:', await sides());
await page.screenshot({ path: '/tmp/tap-3-settings.png' });

// switch to joystick: auto-roll goes back to the user's toggle (off), drag works again
await page.tap('#touch-picker button[data-c="stick"]'); await wait(300);
await page.tap('#settings-close'); await wait(2500);
console.log('joystick mode, no input -> speed', (await blob()).speed, '(should be ~0) | auto-roll button visible:', await page.$eval('#autoroll', (e) => getComputedStyle(e).display !== 'none'));
await touch('touchStart', [[195, 600]]); await wait(100); await touch('touchMove', [[195, 540]]); await wait(900);
console.log('joystick drag up -> speed', (await blob()).speed, '(should be > 0)');
await touch('touchEnd', []); await wait(300);
await page.reload({ waitUntil: 'load' }); await wait(2000);
console.log('after reload: touchControls =', await page.evaluate(() => window.blorbit.save.touchControls));
await browser.close();
