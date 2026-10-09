// Dev helper: unlock a locked galaxy by watching a rewarded video (Google Ad Manager demo unit).
// usage: node scripts/galaxyadcheck.mjs [mobile]
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
const shot = (n) => page.screenshot({ path: `/tmp/gad-${tag}-${n}.png` });
const cards = (sel) => ev((sel) => [...document.querySelectorAll(`${sel} .galaxy-card`)].map((c) => `${c.dataset.g}:${c.classList.contains('locked') ? 'locked' : 'open'}${c.querySelector('.unlock-video') ? '+video' : ''}${c.querySelector('.badge:not(.locked)') ? '+NEW' : ''}`), sel);
// Google's close / skip buttons live inside the ad's cross-origin frame
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
const adReady = async () => { for (let i = 0; i < 40 && !(await ev(() => window.blorbit.ads.ready)); i++) await wait(500); return ev(() => window.blorbit.ads.ready); };

await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await ev(() => { localStorage.clear(); localStorage.setItem('blorbit-save-v1', JSON.stringify({ unlocked: ['classic', 'bunny', 'frog'], v: 3 })); Storage.prototype.setItem = () => {}; });
await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
await wait(800);
console.log('title cards:', await cards('#title-galaxies'));
await shot('1-title');

// ---- watch a video to unlock Citylight
console.log('video ready:', await adReady());
await page.click('#title-galaxies [data-unlock="city"]'); await wait(600);
console.log('prompt:', await ev(() => document.getElementById('ad-offer-body').innerText.replace(/\s+/g, ' ').trim()));
await shot('2-prompt');
await page.click('#ad-watch'); await wait(12000);
console.log('reward granted by Google:', await ev(() => !!window.blorbit.ads.granted));
if (!(await clickInAdFrames('^\\s*close'))) console.log('(could not find the ad close button)');
await wait(2500);
console.log('after the video: title cards', await cards('#title-galaxies'), '| saved:', JSON.stringify(await ev(() => window.blorbit.save.adUnlocked)), '| toast:', await ev(() => document.getElementById('toast').innerText.replace(/\s+/g, ' ').trim()), '| address:', await ev(() => location.hash || '(none)'));
await shot('3-unlocked');

// ---- skip a video for Skyhaven: stays locked
console.log('next video ready:', await adReady());
await page.click('#title-galaxies [data-unlock="sky"]'); await wait(600);
await page.click('#ad-watch'); await wait(3000);
await clickInAdFrames('^\\s*close'); await wait(1200);
await clickInAdFrames('^\\s*skip\\s*$'); await wait(2500);
console.log('skipped: message', await ev(() => document.getElementById('ad-offer-body').innerText.replace(/\s+/g, ' ').trim()), '| sky still locked:', await ev(() => document.querySelector('#title-galaxies .galaxy-card[data-g="sky"]').classList.contains('locked')));
await page.click('#ad-no'); await wait(300);

// ---- the unlock sticks: play Citylight, its shop tab is open
await page.click('#title-galaxies .galaxy-card[data-g="city"]'); await wait(4500);
console.log('playing in:', await ev(() => window.blorbit.planet().galaxy));
await page.click('#shop-btn'); await wait(500);
console.log('shop tabs:', await ev(() => [...document.querySelectorAll('#shop .galaxy-tabs button')].map((b) => `${b.textContent.trim()}${b.disabled ? ' [disabled]' : ''}`)));
await page.click('#shop-close'); await wait(300);
await page.click('#galaxy-btn'); await wait(500);
console.log('travel panel:', await cards('#galaxy-list'));
await shot('4-travel');
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
