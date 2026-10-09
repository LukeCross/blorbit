// Dev helper: tooltip/labels on locked galaxy tabs for a save with N Wildbloom friends awake.
// usage: N=6 node scripts/tipcheck.mjs
import puppeteer from 'puppeteer-core';
const n = Number(process.env.N ?? 6);
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.setDefaultTimeout(120000);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.evaluate((n) => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', ...['bunny', 'frog', 'fox', 'penguin', 'moth', 'snail', 'turtle', 'lizard', 'bear', 'hedgehog'].slice(0, n)], v: 3 })); Storage.prototype.setItem = () => {}; }, n);
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await new Promise((r) => setTimeout(r, 1500));
for (const [open, sel] of [['#shop-btn', '#shop'], ['#book-btn', '#book']]) {
  await page.click(open); await new Promise((r) => setTimeout(r, 400));
  console.log(sel, await page.$eval(`${sel} .galaxy-tabs button.locked`, (b) => ({ label: b.textContent.trim(), title: b.title, aria: b.getAttribute('aria-label') })));
  await page.keyboard.press('Escape'); await new Promise((r) => setTimeout(r, 300));
}
console.log('card:', await page.evaluate(() => { document.getElementById('galaxy-btn').click(); return document.querySelector('#galaxy-list .galaxy-card[data-g="city"] .lock')?.textContent.trim(); }));
await browser.close();
