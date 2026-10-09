// Dev helper: privacy policy page, title + Settings links, "Privacy & cookie settings" (consent revocation).
// usage: node scripts/privacycheck.mjs [mobile]
import puppeteer from 'puppeteer-core';
const mobile = process.argv.includes('mobile');
const tag = mobile ? 'mobile' : 'desktop';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const viewport = mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { width: 1280, height: 800 };
// the plain privacy page renders fine in a normal headless browser (software WebGL makes its screenshots hang)
const plain = await puppeteer.launch({ executablePath: CHROME, headless: 'new', protocolTimeout: 60000 });
const doc = await plain.newPage();
await doc.setViewport(viewport);
await doc.goto('http://localhost:5173/privacy.html', { waitUntil: 'load' });
console.log('privacy page:', await doc.evaluate(() => ({ title: document.title, sections: [...document.querySelectorAll('h2')].map((h) => h.textContent), googleLink: !!document.querySelector('a[href="https://policies.google.com/technologies/partner-sites"]'), placeholders: (document.body.innerText.match(/\[YOUR [A-Z ]+\]/g) || []).length })));
await doc.screenshot({ path: `/tmp/priv-${tag}-1-page.png`, captureBeyondViewport: false }).catch((e) => console.log('(privacy page screenshot skipped:', e.message.split('.')[0] + ')'));
await plain.close();

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.setViewport(viewport);
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message); });
page.setDefaultTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = (f, ...a) => page.evaluate(f, ...a);


await page.goto('http://localhost:5173/', { waitUntil: 'load' });
await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
console.log('title link:', await ev(() => document.querySelector('.title-privacy')?.getAttribute('href')));
await page.click('#settings-btn'); await wait(500); // a real tap: the title card must not cover it
console.log('settings: consent button visible', await ev(() => !document.getElementById('consent-btn').classList.contains('hidden')), '| policy link', await ev(() => document.querySelector('.privacy-actions a')?.getAttribute('href')));
// on the dev server Google's consent tool never loads (demo ad network, no published message), so the
// button stays hidden; scripts/consentcheck.mjs covers the regions where it appears
console.log('consent button (dev server, no consent rules known):', await ev(() => document.getElementById('consent-btn').classList.contains('hidden') ? 'hidden, as expected' : 'SHOWN (unexpected)'));
await ev(() => document.querySelector('#settings .panel').scrollTo(0, 99999));
await wait(300);
await page.screenshot({ path: `/tmp/priv-${tag}-2-settings.png` });
console.log(errors.length ? `PAGE ERRORS: ${errors.length}` : 'no page errors');
await browser.close();
