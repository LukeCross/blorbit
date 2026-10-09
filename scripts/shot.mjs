// Dev helper: drives the game in headless Chrome and saves screenshots.
// usage: node scripts/shot.mjs [outDir]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const out = process.argv[2] || '/tmp/blorbit-shots';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('console', (m) => m.type() !== 'debug' && console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.goto(`http://localhost:5173/?seed=${process.env.SEED || 1}`, { waitUntil: 'networkidle0' });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

await wait(2000);
await shot('1-title');
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await wait(500);
console.log(await page.evaluate(() => {
  const p = window.blorbit.planet();
  return p.biomes.map((b, r) => `${b}:${p.regionTotal[r]}v/${p.patches.filter((q) => q.region === r).map((q) => `${q.name}(${q.verts.length})`).join(',')}`).join('\n');
}));

// drive forward while weaving
await page.keyboard.down('ArrowUp');
for (let i = 0; i < 4; i++) {
  const k = i % 2 ? 'ArrowLeft' : 'ArrowRight';
  await page.keyboard.down(k); await wait(900); await page.keyboard.up(k); await wait(700);
}
await page.keyboard.up('ArrowUp');
await shot('2-rolling');

// visit each biome: look at a patch before and after completing it
const visit = (r) => page.evaluate((r) => {
  const b = window.blorbit, p = b.planet();
  const patch = p.patches.find((q) => q.region === r) ;
  const target = patch ? patch.center : p.centers[r];
  const tangent = target.clone().cross(p.centers[r]).normalize();
  const start = target.clone().applyAxisAngle(tangent.lengthSq() ? tangent : target.clone().cross({x:0,y:1,z:0}).normalize(), 0.22).normalize();
  b.blob.placeAt(start, target.clone().sub(start));
  return p.biomes[r] + ' / ' + (patch ? patch.name : '-');
}, r);
const n = await page.evaluate(() => window.blorbit.planet().biomes.length);
for (let r = 0; r < n; r++) {
  console.log('visit', await visit(r));
  await wait(2500);
  await shot(`3-biome${r}-dead`);
  await page.evaluate((r) => {
    const b = window.blorbit, p = b.planet();
    const k = p.patches.findIndex((q) => q.region === r);
    if (k >= 0) b.completePatch(k);
  }, r);
  await wait(2500);
  await shot(`3-biome${r}-patch`);
  await page.evaluate((r) => window.blorbit.completeRegion(r), r);
  await wait(9000);
  await shot(`3-biome${r}-restored`);
}
await wait(6000);
await shot('6-finale');
await browser.close();
