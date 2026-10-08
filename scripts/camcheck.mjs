// Dev helper: screenshot several follow-camera framings. usage: node scripts/camcheck.mjs
import puppeteer from 'puppeteer-core';
const variants = JSON.parse(process.env.VARIANTS || '[{"up":7.5,"back":5.5,"ahead":3,"drop":0}]');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:5173/?seed=42', { waitUntil: 'networkidle0' });
await page.keyboard.press('Space');
await page.keyboard.press('KeyR');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [i, v] of variants.entries()) {
  await page.evaluate((v) => Object.assign(window.blorbit.CAM, v), v);
  await wait(3500);
  await page.screenshot({ path: `/tmp/blorbit-cam${i}.png` });
}
await browser.close();
