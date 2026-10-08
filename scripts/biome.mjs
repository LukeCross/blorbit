// Dev helper: screenshot one biome before and after restoring it.
// usage: BIOME=volcano node scripts/biome.mjs
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
// keep rolling new planets until one has the biome we want
await page.evaluate((id) => { for (let s = 1; s < 200 && !window.blorbit.planet().biomes.includes(id); s++) window.blorbit.newPlanet(s); }, process.env.BIOME);
await page.keyboard.press('Space');
await page.keyboard.press('KeyR'); // auto-roll off so the blob stays put
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const r = await page.evaluate((id) => {
  const b = window.blorbit, p = b.planet();
  const r = p.biomes.indexOf(id);
  const c = p.centers[r];
  const side = c.clone().cross({ x: 0.3, y: 1, z: 0.2 }).normalize();
  const start = c.clone().applyAxisAngle(side, 0.32).normalize();
  b.blob.placeAt(start, c.clone().sub(start));
  return r;
}, process.env.BIOME);
await wait(3000);
await page.screenshot({ path: `/tmp/blorbit-${process.env.BIOME}-dead.png` });
await page.evaluate((r) => window.blorbit.completeRegion(r), r);
await wait(12000);
await page.screenshot({ path: `/tmp/blorbit-${process.env.BIOME}-restored.png` });
await browser.close();
