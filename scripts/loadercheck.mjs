// Dev helper: screenshots of the rolling-blob loading screen (throttled so it stays up) and the reveal.
// usage: node scripts/loadercheck.mjs [mobile]
import puppeteer from 'puppeteer-core';
const mobile = process.argv.includes('mobile');
const tag = mobile ? 'mobile' : 'desktop';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', protocolTimeout: 120000 });
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
// slow the game's code down so the loader stays up long enough to look at
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 300000 / 8, uploadThroughput: 300000 / 8 });
page.goto('http://localhost:5173/').catch(() => {});
await new Promise((r) => setTimeout(r, 1200));
for (const [i, ms] of [[1, 0], [2, 480], [3, 470]]) {
  await new Promise((r) => setTimeout(r, ms));
  await page.screenshot({ path: `/tmp/loader-${tag}-${i}.png` }).catch((e) => console.log('shot failed', e.message));
}
console.log('loader showing:', await page.evaluate(() => !!document.getElementById('loader') && document.body.classList.contains('booting')));
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await page.waitForFunction(() => !document.body.classList.contains('booting'), { timeout: 120000 });
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `/tmp/loader-${tag}-4-revealed.png` });
console.log('revealed: loader gone', await page.evaluate(() => !document.getElementById('loader')), '| galaxy cards', await page.evaluate(() => document.querySelectorAll('#title-galaxies .galaxy-card').length));
await browser.close();
