// Dev helper: render public/favicon.svg into the PNG app icons (Apple touch icon + web app manifest).
// The square icons get a soft lilac background, with the blob inside the "maskable" safe zone.
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;
    background:radial-gradient(circle at 50% 40%, #f4ecff, #d6c6ff 70%, #c2adff)">
    <div style="width:${Math.round(size * 0.72)}px;height:${Math.round(size * 0.72)}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: `public/${file}` });
  console.log('wrote', file);
}
await browser.close();
