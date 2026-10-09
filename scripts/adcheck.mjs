// Dev helper: rewarded-video free packs (Google Ad Manager demo unit on the dev server).
// usage: node scripts/adcheck.mjs [mobile]
import puppeteer from 'puppeteer-core';
const mobile = process.argv.includes('mobile');
const tag = mobile ? 'mobile' : 'desktop';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
if (mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
await page.setViewport(mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 });
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f, ...a) => page.evaluate(f, ...a);
const shot = (n) => page.screenshot({ path: `/tmp/ad-${tag}-${n}.png` });
const state = () => ev(() => { const a = window.blorbit.ads; return { enabled: a.enabled, demo: a.demo, supported: a.supported, ready: a.ready, empty: !!a.empty, blocked: !!a.blocked, slot: !!a.slot }; });

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await ev(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic'], v: 3, stardust: 0 })); Storage.prototype.setItem = () => {}; });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await (await page.waitForSelector('#title-galaxies .galaxy-card[data-g="wild"]', { visible: true })).click();
await wait(1500);
console.log('ads at start:', JSON.stringify(await state()));
for (let i = 0; i < 20 && !(await state()).ready; i++) await wait(1000);
console.log('ads after waiting:', JSON.stringify(await state()));

await page.click('#shop-btn'); await wait(500);
console.log('free buttons:', await ev(() => [...document.querySelectorAll('#shop .buy.free')].length), '| waiting style:', await ev(() => document.querySelector('#shop .buy.free')?.classList.contains('waiting')));
await shot('1-shop');
await page.click('#shop .buy.free[data-id="meadow"]'); await wait(800);
console.log('prompt:', await ev(() => document.getElementById('ad-offer-body').innerText.replace(/\s+/g, ' ').trim()), '| watch button:', await ev(() => `${document.getElementById('ad-watch').textContent}${document.getElementById('ad-watch').disabled ? ' (disabled)' : ''}`));
await shot('2-prompt');

// "No thanks" just closes; nothing else changes
await page.click('#ad-no'); await wait(300);
console.log('no thanks -> prompt closed:', await ev(() => document.getElementById('ad-offer').classList.contains('hidden')), '| shop still open:', await ev(() => !document.getElementById('shop').classList.contains('hidden')));

// ---- real flow 1: watch the whole (6 second) demo video, close it -> free pack opens
// the ad's frame: full screen on phones, a centred window on desktop
const adRect = () => ev(() => {
  const f = [...document.querySelectorAll('iframe')].filter((x) => x.offsetWidth > 200).sort((a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight)[0];
  const r = f.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
// Google's close button lives inside the ad's (cross-origin) frame: find it there and click it.
// Falls back to the frame's top-right corner if nothing labelled "close" turns up.
const clickInAdFrames = async (pattern) => {
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    const hit = await f.evaluateHandle((pat) => {
      const re = new RegExp(pat, 'i');
      return [...document.querySelectorAll('button, [role="button"], div, span')].find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && re.test(`${el.getAttribute('aria-label') || ''} ${el.textContent.trim().length < 20 ? el.textContent.trim() : ''}`);
      }) || null;
    }, pattern).catch(() => null);
    const el = hit?.asElement?.();
    if (el) { await el.click().catch(() => {}); return true; }
  }
  return false;
};
const closeAd = async () => {
  if (await clickInAdFrames('^\\s*close')) return;
  const r = await adRect();
  await page.mouse.click(r.x + r.w - 23, r.y + 23);
};
const totalFinds = () => ev(() => Object.values(window.blorbit.save.finds).reduce((a, b) => a + b, 0));
for (let i = 0; i < 20 && !(await state()).ready; i++) await wait(500);
await page.click('#shop .buy.free[data-id="meadow"]'); await wait(500);
await page.click('#ad-watch'); await wait(3000);
console.log('address while the ad plays:', await ev(() => location.href.replace(location.origin, '')));
console.log('watching: ad showing', await ev(() => window.blorbit.ads.showing), '| game audio paused:', await ev(() => !!window.blorbit.sound.adPause));
await shot('3-ad-playing');
await wait(9000);
console.log('after the video: reward granted by Google:', await ev(() => !!window.blorbit.ads.granted));
const before = await totalFinds();
await closeAd(); await wait(2500);
console.log('address after the ad:', await ev(() => location.href.replace(location.origin, '')));
console.log('closed -> pack screen:', await ev(() => !document.getElementById('pack').classList.contains('hidden')), '| label:', await ev(() => document.querySelector('.pack-box small')?.textContent), '| audio back:', await ev(() => !window.blorbit.sound.adPause), '| stardust still 0:', await ev(() => window.blorbit.save.stardust));
await shot('4-free-pack');
if (await ev(() => !!document.querySelector('.pack-box'))) {
  await page.click('.pack-box'); await wait(1300);
  for (const k of [0, 1, 2]) { await page.click(`.card[data-i="${k}"]`); await wait(250); }
  await wait(900);
  console.log('cards added:', (await totalFinds()) - before, '| after-pack buttons:', await ev(() => [...document.querySelectorAll('#pack-actions .btn')].map((b) => b.textContent.trim())));
  await shot('5-free-pack-done');
}

// ---- real flow 2: "Another free pack", start the video, close it straight away -> no pack
for (let i = 0; i < 20 && !(await state()).ready; i++) await wait(500);
console.log('next video lined up:', (await state()).ready);
await page.click('#pack-free'); await wait(600);
await page.click('#ad-watch'); await wait(3000);
const before2 = await totalFinds();
await closeAd(); await wait(1200);
// Google asks "Skip video? You will lose your reward": tap Skip (left of the blue Resume button)
if (!(await clickInAdFrames('^\\s*skip\\s*$'))) {
  const r = await adRect();
  await page.mouse.click(Math.round(r.x + r.w * 0.48), Math.round(r.y + r.h * 0.56));
}
await wait(2500);
console.log('address after skipping:', await ev(() => location.href.replace(location.origin, '')), '| history length:', await ev(() => history.length));
console.log('closed early -> message:', await ev(() => document.getElementById('ad-offer-body').innerText.replace(/\s+/g, ' ').trim()), '| cards added:', (await totalFinds()) - before2);
await shot('6-dismissed');
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
