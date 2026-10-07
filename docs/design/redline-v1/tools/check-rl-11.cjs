// RL-11 car detail review against Expo web on :8082, driven through the real demo
// flow (web stores are in-memory, so every step navigates inside the app).
// PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-11.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-11');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], evidence = {};
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const shot = async (name, opts = {}) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(700); await page.screenshot({ path: path.join(output, name), ...opts }); };
  async function identifyAs(query, name) {
    await page.getByRole('link', { name: /Identify this car|Change identity/ }).click();
    await page.waitForURL(/\/identify/);
    await page.getByPlaceholder(/Search name/).fill(query);
    await page.getByText(name, { exact: true }).first().click();
    await page.getByText('Confirm', { exact: true }).click();
    await page.getByText('Done', { exact: true }).click();
    await page.waitForURL(/\/garage\//);
  }
  try {
    await fs.mkdir(output, { recursive: true });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.getByText('demo mode', { exact: false }).first().click();
    await page.waitForTimeout(8000);
    await page.locator('a[href^="/garage/"]').first().click();
    await page.waitForURL(/\/garage\//);
    evidence.route = new URL(page.url()).pathname;
    await page.getByText(/^Unidentified · /).waitFor();
    await shot('detail-unidentified-web.jpg', { quality: 82 });

    await identifyAs('FXB03', "'70 Dodge Charger R/T");
    await page.getByText('GARAGE #1').waitFor();
    evidence.bestLabel = await page.getByLabel(/^Best \d+ scale miles per hour/).getAttribute('aria-label');
    assert.match(evidence.bestLabel, /number 1 in the garage$/);
    evidence.catalogRows = await page.getByLabel(/^(Toy number|Wave|Year): /).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    assert.deepEqual(evidence.catalogRows, ['Toy number: FXB03', 'Wave: 2019 SERIES 1', 'Year: 2019']);
    evidence.seen = await page.getByLabel(/^seen: /).getAttribute('aria-label');
    await shot('detail-photo-web.png');

    await page.getByLabel('Nickname').fill('Big Orange');
    await page.getByRole('button', { name: 'Save nickname' }).click();
    await page.getByRole('button', { name: 'Back to Garage' }).click();
    await page.getByRole('tab', { name: /Speed/i }).click();
    await page.locator('a[href^="/garage/"]').first().click();
    await page.waitForURL(/\/garage\//);
    evidence.nicknameAfterReturn = await page.getByLabel('Nickname').inputValue();
    assert.equal(evidence.nicknameAfterReturn, 'Big Orange');

    await identifyAs('Honda S2000', 'Honda S2000');
    await page.locator('[role=heading]:visible', { hasText: 'Honda S2000' }).waitFor();
    await shot('detail-web.png');

    await page.goto(base + '/garage/00:00:00:00:00:00', { waitUntil: 'networkidle' });
    await page.getByText('Car not in your garage').waitFor();
    await shot('detail-missing-web.jpg', { quality: 82 });

    evidence.errors = errors;
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
