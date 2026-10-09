// Dev helper: clear every spot in one biome and check the biome completes on its own.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://localhost:5173/?seed=42', { waitUntil: 'networkidle0' });
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await page.keyboard.press('KeyR');
await wait(500);
const r = await page.evaluate(() => window.blorbit.planet().regionAt(window.blorbit.blob.p));
const ids = await page.evaluate((r) => window.blorbit.planet().patches.map((p, k) => (p.region === r ? k : -1)).filter((k) => k >= 0), r);
console.log(`biome ${r} has ${ids.length} spots`);
for (const [n, k] of ids.entries()) {
  await page.evaluate((k) => window.blorbit.completePatch(k), k);
  await wait(250);
  if (ids.length - n - 1 <= 2) console.log('label:', await page.$eval('#biome-progress', (e) => e.textContent), '| ground coverage', await page.evaluate((r) => window.blorbit.planet().coverage(r).toFixed(2), r));
}
await wait(200);
console.log('right after last spot, biome done?', await page.evaluate((r) => window.blorbit.planet().regionDone[r] >= 0, r));
await wait(1500);
console.log('1.5s later, biome done?', await page.evaluate((r) => window.blorbit.planet().regionDone[r] >= 0, r), '| label:', await page.$eval('#biome-progress', (e) => e.textContent));
await browser.close();
