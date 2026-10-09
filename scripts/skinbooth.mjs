// Dev helper: close-up portrait of the blob in every skin. Writes /tmp/skin-<id>.png
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ids = (process.env.SKINS || 'classic,fox,frog,moth,snail,bunny,penguin,turtle,lizard,bear,hedgehog').split(',');
await page.goto('http://localhost:5173/', { waitUntil: 'load', timeout: 120000 });
await page.evaluate((ids) => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ids, v: 3, autoRoll: false })); }, ids);
await page.goto('http://localhost:5173/?seed=5', { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.blorbit, { timeout: 120000 });
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
// camera in front of the blob, three-quarter view, looking at its face
await page.evaluate((VIEW) => {
  Object.assign(window.blorbit.CAM, VIEW === 'back' ? { up: 3.2, back: 3.4, ahead: 0, drop: -0.2 } : { up: 1.6, back: -3.6, ahead: 0, drop: -0.35 });
  document.querySelectorAll('#hud-top,#hud-left,#hud-right,#skins,#biome-label,#world-rings').forEach((e) => (e.style.display = 'none'));
}, process.env.VIEW || 'front');
await wait(8000); // let the camera settle before the first portrait
for (const id of ids) {
  await page.evaluate((id) => { const b = window.blorbit; b.blob.setSkin(id); b.blob.rollAngle = 0; }, id);
  await wait(6000);
  await page.screenshot({ path: `/tmp/skin-${id}${process.env.VIEW === 'back' ? '-back' : ''}.png`, clip: { x: 250, y: 150, width: 400, height: 400 } });
}
await browser.close();
