// Dev helper: which title hints a throttled phone sees while the game loads.
// usage: node scripts/titletimeline.mjs [url]
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const cdp = await page.createCDPSession();
await cdp.send('Network.enable');
await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 4e6 / 8, uploadThroughput: 1e6 / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const t0 = Date.now();
page.goto(process.argv[2] || 'http://localhost:5173/').catch(() => {});
const seen = [];
for (let i = 0; i < 160; i++) {
  await new Promise((r) => setTimeout(r, 250));
  const s = await page.evaluate(() => {
    const vis = (sel) => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && !!e.offsetParent; };
    // what the player can actually see: the rolling-blob loader, or the title (and which hints it shows)
    const loader = document.getElementById('loader');
    const loaderUp = !!loader && getComputedStyle(loader).visibility !== 'hidden' && getComputedStyle(loader).opacity !== '0';
    const titleEl = document.getElementById('title');
    const titleSeen = !!titleEl && getComputedStyle(titleEl).visibility !== 'hidden';
    const hints = titleSeen ? (`${vis('.controls.keys-only') ? 'DESKTOP' : ''}${vis('.controls.touch-only') ? 'TOUCH' : ''}` || 'no') : 'no';
    const cards = titleSeen ? document.querySelectorAll('#title-galaxies .galaxy-card').length : 0;
    return `${loaderUp ? 'LOADER' : 'no loader'} | title ${titleSeen ? 'visible' : 'hidden'} | ${hints} hints | ${cards} galaxy cards`;
  }).catch(() => 'loading');
  if (seen.at(-1)?.s !== s) { seen.push({ t: Date.now() - t0, s }); if (s.includes('title visible')) await page.screenshot({ path: '/tmp/title-early.png' }); }
}
console.log(seen.map((x) => `${(x.t / 1000).toFixed(1)}s ${x.s}`).join('  →  '));
await browser.close();
