// Dev helper: five rarity tiers, three packs and their guarantees, odds table, book + colorblind markers.
// usage: node scripts/raritycheck.mjs [mobile]
import puppeteer from 'puppeteer-core';
const mobile = process.argv.includes('mobile');
const tag = mobile ? 'mobile' : 'desktop';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f, ...a) => page.evaluate(f, ...a);
const shot = (n) => page.screenshot({ path: `/tmp/rar-${tag}-${n}.png` });
const RANK = { c: 0, u: 1, r: 2, e: 3, l: 4 };

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
// an old save: finds collected under the previous tiers must still count
await ev(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic'], v: 3, stardust: 2000, finds: { 'meadow:Daisy': 2, 'meadow:Sunflower': 1, 'meadow:Bird nest': 1, 'meadow:Four-leaf clover': 1 } })); Storage.prototype.setItem = () => {}; });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await wait(1500);

await page.click('#shop-btn'); await wait(400);
await page.click('#shop .odds summary'); await wait(300);
console.log('odds table:', await ev(() => [...document.querySelectorAll('#shop .odds tbody tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()).join(' | '))));
console.log('buttons per row:', await ev(() => document.querySelector('#shop .pack-row').querySelectorAll('.buy').length));
await shot('1-shop');

for (const type of ['standard', 'premium', 'prism']) {
  // open 5 packs of each type and check the guarantee every time
  const floors = { standard: 'u', premium: 'r', prism: 'e' };
  let ok = 0;
  const seen = [];
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => { document.getElementById('pack').classList.add('hidden'); window.blorbit.shop.open(); });
    await wait(200);
    await page.click(`#shop .buy[data-id="meadow"][data-type="${type}"]`);
    await page.waitForSelector('.pack-box', { visible: true }); await wait(300);
    await page.click('.pack-box'); await wait(1300);
    for (const k of [0, 1, 2]) { await page.click(`.card[data-i="${k}"]`); await wait(250); }
    const rar = await ev(() => [...document.querySelectorAll('.card')].map((c) => [...c.classList].find((x) => 'curel'.includes(x) && x.length === 1)));
    seen.push(rar.join(''));
    if (rar.some((r) => RANK[r] >= RANK[floors[type]])) ok++;
    if (i === 0) await shot(`2-pack-${type}`);
  }
  console.log(`${type}: guarantee kept ${ok}/5 | packs:`, seen.join(' '));
}
await ev(() => window.blorbit.shop.close()); await wait(600);

// book: tiers shown; old finds still counted; colorblind markers
await ev(() => window.blorbit.toggleBook()); await wait(500);
console.log('meadow slots:', await ev(() => [...document.querySelectorAll('#book-grid .book-row')][0].querySelectorAll('.slot').length), '| tiers:', await ev(() => [...[...document.querySelectorAll('#book-grid .book-row')][0].querySelectorAll('.slot')].map((s) => [...s.classList].find((x) => x.length === 1)).join('')));
console.log('old finds kept:', await ev(() => ['Daisy', 'Sunflower', 'Bird nest', 'Four-leaf clover'].every((n) => window.blorbit.save.finds[`meadow:${n}`] >= 1)));
await shot('3-book');
await ev(() => window.blorbit.toggleBook()); await wait(300);
await ev(() => document.getElementById('settings-btn').click()); await wait(300);
await page.click('#colorblind'); await wait(200);
await page.click('#settings-close'); await wait(200);
await ev(() => window.blorbit.toggleBook()); await wait(500);
await shot('4-book-cb');
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
