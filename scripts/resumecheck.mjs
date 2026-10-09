// Dev helper: make progress, reload, and check the planet comes back the same.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'warning' && console.log('[warn]', m.text()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const snapshot = () => page.evaluate(() => {
  const p = window.blorbit.planet();
  return {
    name: document.getElementById('planet-name').textContent,
    painted: p.painted.reduce((a, b) => a + b, 0),
    regions: p.regionDone.map((d) => d >= 0).join(','),
    patches: p.patches.filter((q) => q.done >= 0).length + '/' + p.patches.length,
    dust: window.blorbit.planet && document.querySelectorAll('#chips .chip.done').length,
    blob: window.blorbit.blob.p.toArray().map((v) => v.toFixed(3)).join(','),
  };
});
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await page.evaluate(() => { const b = window.blorbit; b.completeRegion(1); [0, 1, 2].forEach((k) => b.completePatch(k)); });
await wait(5000);
await page.keyboard.press('KeyR'); // stop rolling so the saved position is stable
await wait(1500);
await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
const before = await snapshot();
await page.reload({ waitUntil: 'networkidle0' });
await wait(500);
const after = await snapshot();
console.log('before', before);
console.log('after ', after);
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await wait(3000);
await page.screenshot({ path: '/tmp/blorbit-resumed.png' });
await browser.close();
