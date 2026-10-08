// Dev helper: capture the blob mid-roll and at rest. usage: SKIN=fox node scripts/rollcheck.mjs
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const skin = process.env.SKIN || 'fox';
await page.goto('http://localhost:5173/?seed=7', { waitUntil: 'networkidle0' });
await page.evaluate((skin) => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', skin], equipped: skin, autoRoll: false, v: 3 })); }, skin);
await page.reload({ waitUntil: 'networkidle0' });
await page.keyboard.press('Space');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(1500);
await page.keyboard.down('ArrowUp');
await wait(1200);
for (let i = 0; i < 4; i++) {
  const a = await page.evaluate(() => (window.blorbit.blob.rollAngle % (Math.PI * 2)).toFixed(2));
  await page.screenshot({ path: `/tmp/blorbit-roll${i}.png`, clip: { x: 300, y: 200, width: 300, height: 300 } });
  console.log('frame', i, 'roll angle', a);
  await wait(450);
}
await page.keyboard.up('ArrowUp');
await wait(3500);
console.log('at rest, roll angle', await page.evaluate(() => (window.blorbit.blob.rollAngle % (Math.PI * 2)).toFixed(3)));
await page.screenshot({ path: '/tmp/blorbit-rest.png', clip: { x: 300, y: 200, width: 300, height: 300 } });
await browser.close();
