// Dev helper: renders scripts/advert/overlay.html scenes to /tmp/ad/ov-<scene>.png (transparent 1080x1920). Needs the dev server.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
for (const s of ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'mark', 'end']) {
  await page.goto(`http://localhost:5173/scripts/advert/overlay.html?s=${s}`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `/tmp/ad/ov-${s}.png`, omitBackground: true });
}
await browser.close();
console.log('overlays done');
