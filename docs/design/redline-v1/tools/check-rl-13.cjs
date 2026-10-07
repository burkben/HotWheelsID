// RL-13 More, Trophy case and unlock banner review against Expo web on :8082.
// Web always runs the demo portal, so real unlocks (New Wheels, speed trophies)
// arrive within seconds of load; the fixture captures hide that live banner.
// PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-13.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-13');
const BANNER = '[data-testid="trophy-unlock-banner"]';

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], evidence = {};
  async function open(url, { viewport = { width: 390, height: 844 }, hideBanner = false, reducedMotion = 'reduce' } = {}) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    if (hideBanner) await page.addInitScript((sel) => document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style'); style.textContent = `${sel}{display:none!important}`; document.head.appendChild(style);
    }), BANNER);
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(900);
    return page;
  }
  try {
    await fs.mkdir(output, { recursive: true });
    const fixture = await open('/dev/redline?section=trophies', { hideBanner: true });
    await fixture.screenshot({ path: path.join(output, 'trophies-web.png') });
    evidence.progressLabel = await fixture.getByRole('progressbar').getAttribute('aria-label');
    assert.equal(evidence.progressLabel, '8 of 13 trophies unlocked');
    evidence.latest = await fixture.getByLabel(/^Latest unlock:/).getAttribute('aria-label');
    evidence.lockedTile = await fixture.getByLabel(/^Redline Hero, locked/).getAttribute('aria-label');
    assert.match(evidence.lockedTile, /best 247\/290/);
    await (await open('/dev/redline?section=trophies&none=1', { hideBanner: true })).screenshot({ path: path.join(output, 'trophies-none-web.jpg'), quality: 82 });

    // Real unlocks: record every banner that appears while demo passes run.
    const live = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'no-preference' });
    live.on('pageerror', (e) => errors.push(e.message));
    await live.addInitScript((sel) => {
      window.bannerLog = [];
      new MutationObserver(() => {
        const el = document.querySelector(sel);
        const label = el && el.getAttribute('aria-label');
        if (label && window.bannerLog[window.bannerLog.length - 1]?.label !== label) window.bannerLog.push({ label, t: performance.now() });
      }).observe(document, { childList: true, subtree: true, attributes: true });
    }, BANNER);
    await live.goto(base + '/more', { waitUntil: 'networkidle' });
    await live.locator(BANNER).waitFor();
    await live.waitForTimeout(300);
    await live.screenshot({ path: path.join(output, 'unlock-banner-web.png') });
    // Let the queue drain (each banner: ~0.5 s in + 2.5 s hold + 0.26 s out).
    await live.waitForFunction((sel) => !document.querySelector(sel), BANNER, { timeout: 60000 });
    await live.waitForTimeout(500);
    const log = await live.evaluate(() => window.bannerLog);
    evidence.banners = log.map((b) => b.label.replace(/^Trophy unlocked: /, '').replace(/\..*$/, ''));
    evidence.bannerGapsMs = log.slice(1).map((b, i) => Math.round(b.t - log[i].t));
    const row = await live.getByRole('link', { name: /^Trophy case, / }).getAttribute('aria-label');
    evidence.moreRow = row;
    const unlockedCount = Number(row.match(/(\d+) of 13/)[1]);
    assert.equal(new Set(evidence.banners).size, evidence.banners.length, 'no unlock is shown twice');
    assert.equal(evidence.banners.length, unlockedCount, 'one banner per unlock');
    assert.ok(evidence.bannerGapsMs.every((g) => g >= 3000), 'each banner holds before the next');
    await live.screenshot({ path: path.join(output, 'more-web.png') });
    await live.getByRole('link', { name: /^Trophy case, / }).click();
    await live.waitForURL(/\/achievements/);
    await live.waitForTimeout(800);
    await live.screenshot({ path: path.join(output, 'trophies-demo-web.jpg'), quality: 82 });

    evidence.errors = errors;
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
