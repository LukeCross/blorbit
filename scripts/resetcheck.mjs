// Dev helper: trail refund, settings panel, and full progress reset.
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const storage = () => page.evaluate(() => ({ save: localStorage.getItem('blorbit-save-v1'), planet: !!localStorage.getItem('blorbit-planet-v1') }));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', 'fox', 'frog'], equipped: 'fox', restored: 3, stardust: 50, finds: { 'meadow:Daisy': 2, 'pond:Koi': 1 }, trailsOwned: ['drips', 'sparkle', 'rainbow'], trail: 'rainbow', v: 2 }));
});
await page.reload({ waitUntil: 'networkidle0' });
const s1 = JSON.parse((await storage()).save);
console.log('after load: stardust', s1.stardust, '(50 + 60 sparkle + 220 rainbow refund = 330)', '| trail fields left:', 'trailsOwned' in s1 || 'trail' in s1);
await page.click('#start-btn');
await wait(5000); // let the autosave write a planet
await page.keyboard.press('KeyP');
await wait(400);
console.log('shop tabs present:', !!(await page.$('.shop-tab')), '| pack rows:', (await page.$$('.pack-row')).length);
await page.keyboard.press('Escape');
await page.click('#settings-btn');
await wait(400);
await page.screenshot({ path: '/tmp/blorbit-settings.png' });
await page.click('#reset-btn');
await wait(300);
await page.screenshot({ path: '/tmp/blorbit-reset-confirm.png' });
await page.click('#reset-cancel');
console.log('after cancel, progress kept:', JSON.parse((await storage()).save).restored === 3);
await page.click('#reset-btn');
await page.click('#reset-yes');
await page.waitForNavigation({ waitUntil: 'networkidle0' });
await wait(500);
const after = await storage();
const s2 = after.save ? JSON.parse(after.save) : null;
console.log('after reset: save', s2 ? `unlocked=${s2.unlocked} stardust=${s2.stardust} finds=${Object.keys(s2.finds || {}).length} restored=${s2.restored}` : 'none (fresh)', '| planet save:', after.planet);
console.log('HUD stardust:', await page.$eval('#dust-count', (e) => e.textContent), '| book:', await page.$eval('#book-count', (e) => e.textContent));
await browser.close();
