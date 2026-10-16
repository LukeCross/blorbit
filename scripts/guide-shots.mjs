// Builds the three first-time guide screenshots in public/guide/ (dev server on :5173).
// usage: node scripts/guide-shots.mjs
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.setDefaultTimeout(120000);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// a returning-player save (no guide) with a fresh spotsDone so the bolder rings show
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic'], guideSeen: true, spotsDone: 0, v: 3 })); });
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.evaluate(() => { const b = window.blorbit; b.newPlanet(7, 'wild'); b.enterGalaxy('wild'); });
await wait(1500);
await page.evaluate(() => document.getElementById('goal-hint').style.display = 'none');
// puts the blob a little way from a patch, facing it
const place = (k, back) => page.evaluate((k, back) => {
  const b = window.blorbit, p = b.planet(), c = p.patches[k].center;
  const side = c.clone().cross({ x: 0.3, y: 1, z: 0.2 }).normalize();
  const start = c.clone().applyAxisAngle(side, back).normalize();
  b.blob.placeAt(start, c.clone().sub(start));
}, k, back);
const shot = (n) => page.screenshot({ path: `public/guide/${n}.jpg`, type: 'jpeg', quality: 82, clip: { x: 190, y: 150, width: 900, height: 562 } });
await place(0, 0.3);
await wait(3500);
await shot(1);
await place(0, 0.12);
await wait(1500);
await page.keyboard.down('KeyW');
await wait(2500);
await page.keyboard.up('KeyW');
await shot(2);
await page.evaluate(() => { const b = window.blorbit; const p = b.planet(); p.patches.forEach((_, k) => p.patches[k].region === 0 && b.completePatch(k)); b.completeRegion(0); });
await wait(9000);
await shot(3);
await browser.close();
