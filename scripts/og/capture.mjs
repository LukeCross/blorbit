// Dev helper: capture a fully restored planet for the social share image (UI hidden).
// usage: node scripts/og/capture.mjs   -> /tmp/og-planet-<n>.png
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 240000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
page.setDefaultTimeout(180000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic'], v: 3, quality: 'pretty' })); Storage.prototype.setItem = () => {}; });
await page.goto('http://localhost:5173/?seed=204&galaxy=wild', { waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
await page.click('#title-galaxies .galaxy-card[data-g="wild"]');
await wait(1500);
// park the blob where the pond, candy and autumn biomes meet, so the finale camera (which circles
// above the blob) frames several colourful biomes at once
await page.evaluate(() => {
  const b = window.blorbit, p = b.planet();
  const dir = ['pond', 'candy', 'autumn'].map((id) => p.centers[p.biomes.indexOf(id)]).reduce((a, c) => a.clone().add(c)).normalize();
  b.blob.placeAt(dir, p.centers[p.biomes.indexOf('meadow')].clone().sub(dir));
});
await wait(1500);
await page.evaluate(() => { for (let r = 0; r < 4; r++) window.blorbit.completeRegion(r); });
await wait(16000); // let the bloom waves, props and critters all come in; the finale camera orbits the whole planet
// hide every bit of UI, keep only the 3D scene
await page.addStyleTag({ content: 'body > *:not(canvas) { visibility: hidden !important; } #toast, .world-ring, .popup { display: none !important; }' });
for (let i = 1; i <= 4; i++) {
  await wait(2500);
  await page.screenshot({ path: `/tmp/og-planet-${i}.png` });
}
await browser.close();
console.log('done');
