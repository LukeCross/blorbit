// Dev helper: screenshot prop kinds, restored and withered side by side.
// usage: KINDS=tower,house node scripts/propbooth.mjs [out.png]   (default: every kind)
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 300000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: Number(process.env.W || 1500), height: Number(process.env.H || 1000) });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('[console]', m.text()));
const q = new URLSearchParams({ ...(process.env.KINDS ? { kinds: process.env.KINDS } : {}), ...(process.env.COLS ? { cols: process.env.COLS } : {}) });
await page.goto(`http://localhost:5173/scripts/propbooth.html?${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.boothReady, { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate(() => window.propTris)));
await page.screenshot({ path: process.argv[2] || '/tmp/propbooth.png' });
await browser.close();
