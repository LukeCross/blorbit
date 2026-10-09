// Dev helper: screenshot creature skins, front and back.
// usage: SKINS=cat,dog T=0.4 node scripts/creaturebooth.mjs [out.png]
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 300000, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: Number(process.env.W || 1500), height: Number(process.env.H || 700) });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const q = new URLSearchParams({ ...(process.env.SKINS ? { skins: process.env.SKINS } : {}), ...(process.env.T ? { t: process.env.T } : {}) });
await page.goto(`http://localhost:5173/scripts/creaturebooth.html?${q}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.boothReady, { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate(() => window.skinTris)));
await page.screenshot({ path: process.argv[2] || '/tmp/creaturebooth.png' });
await browser.close();
