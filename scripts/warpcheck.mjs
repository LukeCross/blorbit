// Dev helper: check planets are time-seeded and the New planet button works.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const name = () => page.$eval('#planet-name', (e) => e.textContent);
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
const a = await name();
await page.reload({ waitUntil: 'networkidle0' });
const b = await name();
console.log('boot 1:', a, '| boot 2:', b);
await page.keyboard.press('Space');
await wait(4000); // auto-roll paints some ground, so leaving needs a confirm
await page.click('#new-planet');
await wait(300);
console.log('after 1 tap:', await name(), '| button:', await page.$eval('#new-planet', (e) => e.textContent));
await page.screenshot({ path: '/tmp/blorbit-confirm.png' });
await page.click('#new-planet');
await wait(2500);
console.log('after 2 taps:', await name());
await page.screenshot({ path: '/tmp/blorbit-warped.png' });
await browser.close();
