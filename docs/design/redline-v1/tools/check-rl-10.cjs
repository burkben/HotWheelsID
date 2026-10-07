// RL-10 Garage review: captures and behaviour checks against Expo web on :8082.
// PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-10.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-10');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], evidence = {};
  async function open(url, viewport = { width: 390, height: 844 }) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    return page;
  }
  const cards = (page) => page.getByRole('link', { name: /races?(, on portal)?$/ });
  try {
    await fs.mkdir(output, { recursive: true });

    const fixture = await open('/dev/redline?section=garage');
    await fixture.screenshot({ path: path.join(output, 'garage-web.png') });
    evidence.allCards = await cards(fixture).count();
    assert.equal(evidence.allCards, 6);
    await fixture.getByRole('button', { name: 'NIGHTBURNERZ', exact: true }).click();
    evidence.filteredCards = await cards(fixture).allInnerTexts().then((t) => t.length);
    assert.equal(evidence.filteredCards, 1);
    assert.equal(await fixture.getByRole('button', { name: 'NIGHTBURNERZ', exact: true }).getAttribute('aria-pressed'), 'true');
    await fixture.getByRole('button', { name: 'ALL', exact: true }).click();
    assert.equal(await cards(fixture).count(), 6);
    evidence.onPortalLabel = await cards(fixture).first().getAttribute('aria-label');
    assert.match(evidence.onPortalLabel, /plate 01.*best 247 scale miles per hour, garage record, 9 races, on portal/);
    await cards(fixture).first().click();
    await fixture.waitForURL(/\/garage\/fx-07/);
    evidence.identifiedRoute = new URL(fixture.url()).pathname;

    const mystery = await open('/dev/redline?section=garage');
    await mystery.getByRole('link', { name: /^Mystery car, unidentified/ }).click();
    await mystery.waitForURL(/\/identify\?uid=fx-mystery/);
    evidence.mysteryRoute = new URL(mystery.url()).pathname + new URL(mystery.url()).search;

    const photos = await open('/dev/redline?section=garage&photos=1&odd=1');
    await photos.screenshot({ path: path.join(output, 'garage-photos-web.jpg'), quality: 82 });
    const empty = await open('/dev/redline?section=garage&empty=1');
    await empty.getByText('No cars yet').waitFor();
    await empty.screenshot({ path: path.join(output, 'garage-empty-web.jpg'), quality: 82 });
    const ipad = await open('/dev/redline?section=garage&photos=1', { width: 1024, height: 768 });
    await ipad.screenshot({ path: path.join(output, 'garage-ipad-web.jpg'), quality: 82 });

    const demo = await open('/');
    await demo.getByText('demo mode', { exact: false }).first().click();
    await demo.waitForTimeout(8000);
    await demo.getByRole('tab', { name: /Garage/i }).click();
    await demo.waitForTimeout(1200);
    await demo.screenshot({ path: path.join(output, 'garage-demo-web.jpg'), quality: 82 });
    evidence.demoCard = await demo.getByRole('link', { name: /on portal$/ }).first().getAttribute('aria-label');

    evidence.errors = errors;
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
