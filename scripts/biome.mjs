// Dev helper: screenshot one biome before and after restoring it.
// usage: BIOME=volcano node scripts/biome.mjs
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.setDefaultTimeout(120000);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// every Wildbloom, Citylight and Skyhaven friend awake, so every galaxy is open
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', 'bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog', 'squirrel', 'cat', 'dog', 'raccoon', 'seagull', 'sheep', 'goat', 'unicorn', 'eagle', 'owl'], v: 3 })); });
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
// keep rolling new planets in the biome's galaxy until one has the biome we want, then play it
await page.evaluate((id) => {
  const g = window.blorbit.galaxyOf(id);
  for (let s = 1; s < 200 && !window.blorbit.planet().biomes.includes(id); s++) window.blorbit.newPlanet(s, g);
  window.blorbit.save.galaxy = g;
  window.blorbit.enterGalaxy(g);
}, process.env.BIOME);
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
