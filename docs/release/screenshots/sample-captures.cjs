// Stand-in captures for checking the frame pipeline without a simulator.
// They come from the Expo web build (demo mode and /dev/redline review fixtures) at
// the real device pixel sizes: iPhone 17 Pro 1206 × 2622, iPad 13" landscape 2752 × 2064.
// Ship real simulator captures instead (see docs/release/app-store-submission.md).
//
//   NODE_PATH=<dir containing playwright> node docs/release/screenshots/sample-captures.cjs <out-dir>
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const out = path.resolve(process.argv[2] || 'captures');
const DEVICES = {
  iphone: { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3 },
  ipad: { viewport: { width: 1376, height: 1032 }, deviceScaleFactor: 2 },
};
// Frame order and source (SPEC §6).
const SOURCES = [
  { frame: '01', speed: true },
  { frame: '02', url: '/dev/redline?section=countdown&count=2' },
  { frame: '03', url: '/dev/redline?section=race-live' },
  { frame: '04', url: '/dev/redline?section=results' },
  { frame: '05', url: '/dev/redline?section=garage' },
  { frame: '06', url: '/dev/redline?section=trophies' },
];
const BANNER = '[data-testid="trophy-unlock-banner"]';

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    for (const [device, options] of Object.entries(DEVICES)) {
      fs.mkdirSync(path.join(out, device), { recursive: true });
      for (const source of SOURCES) {
        const page = await browser.newPage({ ...options, reducedMotion: 'reduce' });
        // Live demo unlocks would drop a trophy banner over unrelated frames.
        await page.addInitScript((sel) => document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style'); style.textContent = `${sel}{display:none!important}`; document.head.appendChild(style);
        }), BANNER);
        await page.goto(base + (source.url ?? '/'), { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        if (source.speed) {
          // Frame 1 wants a readout of at least 240 so the flames show. Demo passes
          // arrive on their own every few seconds at random speeds.
          await page.waitForFunction(() => {
            const label = document.querySelector('[aria-label^="LAST "]')?.getAttribute('aria-label') ?? '';
            return Number(label.match(/\d+/)?.[0]) >= 240;
          }, null, { timeout: 180000, polling: 250 });
        }
        await page.waitForTimeout(1500);
        await page.screenshot({ path: path.join(out, device, `${source.frame}.png`) });
        await page.close();
        console.log(`${device}/${source.frame}.png`);
      }
    }
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
