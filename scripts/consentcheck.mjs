// Dev helper: "Privacy & cookie settings" only appears for visitors covered by European or US state
// privacy rules, and opens the right Google dialog. Google's consent tool is faked per scenario,
// since real messages only run on your own Ad Manager site.
// usage: node scripts/consentcheck.mjs
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SCENARIOS = {
  'EEA visitor': { gdpr: true, us: 1 },
  'California visitor': { gdpr: false, us: 2 },
  'visitor elsewhere': { gdpr: false, us: 1 },
  'consent tool blocked': null,
};
for (const [label, sc] of Object.entries(SCENARIOS)) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', label, e.message); });
  page.on('console', (m) => m.type() === 'error' && console.log('[console]', label, m.text().slice(0, 200)));
  page.setDefaultTimeout(40000);
  if (sc) {
    await page.evaluateOnNewDocument((sc) => {
      // a stand-in for Google's Privacy & messaging tool, with the same API the game uses
      window.__tcfapi = (cmd, v, cb) => cb({ gdprApplies: sc.gdpr }, true);
      window.googlefc = {
        showRevocationMessage: () => { window.__opened = 'European consent message'; },
        usstatesoptout: {
          InitialUsStatesOptOutStatusEnum: { UNKNOWN: 0, DOES_NOT_APPLY: 1, NOT_OPTED_OUT: 2, OPTED_OUT: 3 },
          getInitialUsStatesOptOutStatus: () => sc.us,
          openConfirmationDialog: (cb) => { window.__opened = 'US "Do not sell or share" dialog'; cb(false); },
        },
        callbackQueue: { push: (x) => setTimeout(() => (typeof x === 'function' ? x() : Object.values(x).forEach((f) => f())), 50) },
      };
    }, sc);
  }
  await page.goto('http://localhost:5173/', { waitUntil: 'load' });
  await page.waitForSelector('#title-galaxies .galaxy-card', { visible: true });
  await wait(500);
  await page.click('#settings-btn'); await wait(400);
  const shown = await page.evaluate(() => !document.getElementById('consent-btn').classList.contains('hidden'));
  const text = await page.evaluate(() => document.querySelector('#settings .setting-row.stacked small').innerText.trim());
  let opened = '-';
  if (shown) {
    await page.evaluate(() => document.getElementById('consent-btn').scrollIntoView({ block: 'center' }));
    await page.click('#consent-btn'); await wait(600);
    opened = await page.evaluate(() => window.__opened || 'nothing');
  }
  console.log(`${label.padEnd(21)} button ${shown ? 'shown ' : 'hidden'} | opens: ${opened} | text: "${text}"${errors.length ? ` | PAGE ERRORS ${errors.length}` : ''}`);
  await page.close();
}
await browser.close();
