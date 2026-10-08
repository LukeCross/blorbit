// Dev helper: same planet in Smooth and Pretty, plus rough timing of the game's per-frame JS.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const q of ['smooth', 'pretty']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 720 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text().slice(0, 200)));
  await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 120000 });
  await page.evaluate((q) => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', 'fox'], equipped: 'fox', v: 3, quality: q })); }, q);
  await page.goto('http://localhost:5173/?seed=42', { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.blorbit, { timeout: 120000 });
  await page.click('#start-btn');
  await page.evaluate(() => { const b = window.blorbit; const p = b.planet(); b.completeRegion(p.regionAt(b.blob.p)); });
  await new Promise((r) => setTimeout(r, 15000));
  await page.screenshot({ path: `/tmp/quality-${q}.png` });
  // time the planet's per-frame update + painting (the CPU-side gameplay work)
  const t = await page.evaluate(() => {
    const b = window.blorbit, p = b.planet();
    const t0 = performance.now();
    for (let i = 0; i < 300; i++) { p.paint(b.blob.p, 1.3); p.update(1 / 60, null); }
    return ((performance.now() - t0) / 300).toFixed(3);
  });
  console.log(q, '| planet paint+update per frame:', t, 'ms', '| active vertices:', await page.evaluate(() => window.blorbit.planet().activeList.length), '/', await page.evaluate(() => window.blorbit.planet().count));
  await page.close();
}
await browser.close();
