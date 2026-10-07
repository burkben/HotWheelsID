// RL-15 remaining surfaces review against Expo web on :8082: Live portal, Credits,
// Identify (incl. a no-artwork placeholder), the web persistence banner and the
// splash glyph composited at its configured size.
// PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-15.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-15');
const splash = path.resolve(__dirname, '../../../../apps/mobile/assets/images/splash-icon.png');
const BANNER = '[data-testid="trophy-unlock-banner"]';

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], evidence = {};
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript((sel) => document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style'); style.textContent = `${sel}{display:none!important}`; document.head.appendChild(style);
  }), BANNER);
  const settle = async () => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900); };
  try {
    await fs.mkdir(output, { recursive: true });
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000); // let demo passes and log events arrive

    await page.getByRole('tab', { name: /More/i }).click();
    await page.getByRole('link', { name: /^Live portal/ }).click();
    await page.waitForURL(/\/live/);
    await settle();
    await page.screenshot({ path: path.join(output, 'live-web.png') });
    evidence.liveNotice = await page.getByRole('alert').first().innerText();
    // Demo mode never writes to the BLE log, so the live page shows the empty state.
    evidence.liveLogEmpty = await page.getByText(/^No events yet/).count() === 1;
    evidence.persistenceBanner = await page.getByLabel(/^Browser session\./).count();
    assert.equal(evidence.persistenceBanner, 1);

    await page.getByRole('button', { name: 'Back to More' }).click();
    await page.getByRole('link', { name: /^Credits/ }).click();
    await page.waitForURL(/\/credits/);
    await settle();
    await page.screenshot({ path: path.join(output, 'credits-web.png') });
    await page.getByRole('button', { name: /Read font licenses/ }).click();
    evidence.fontLicenseShown = await page.getByText(/SIL OPEN FONT LICENSE/i).count() > 0;
    assert.ok(evidence.fontLicenseShown);

    await page.getByRole('button', { name: 'Back to More' }).click().catch(() => page.goBack());
    await page.getByRole('tab', { name: /Garage/i }).click();
    await page.getByRole('link', { name: /^Mystery car/ }).first().click();
    await page.waitForURL(/\/identify/);
    await settle();
    await page.screenshot({ path: path.join(output, 'identify-web.png') });
    await page.getByLabel('Search the catalog').fill('Corvette Racer');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(output, 'identify-placeholder-web.jpg'), quality: 82 });
    evidence.placeholderCard = await page.getByRole('button', { name: /Corvette Racer/ }).first().getAttribute('aria-label');
    await page.getByRole('button', { name: /Corvette Racer/ }).first().click();
    await page.getByText('Confirm', { exact: true }).click();
    await page.getByRole('button', { name: /^Undo identifying as/ }).waitFor();
    await page.screenshot({ path: path.join(output, 'identify-saved-web.jpg'), quality: 82, clip: { x: 0, y: 0, width: 390, height: 520 } });
    await page.getByRole('button', { name: /^Undo identifying as/ }).click();
    await page.getByRole('button', { name: '2020', exact: true }).click();
    evidence.yearSelected = await page.getByRole('button', { name: '2020', exact: true }).getAttribute('aria-pressed');
    assert.equal(evidence.yearSelected, 'true');

    await page.goto(base + '/dev/redline?section=live-log', { waitUntil: 'networkidle' });
    await settle();
    await page.screenshot({ path: path.join(output, 'live-log-web.png') });
    evidence.logRows = await page.getByLabel(/^\d\d:\d\d:\d\d, (event|info|error): /).allInnerTexts().then((t) => t.length);
    assert.equal(evidence.logRows, 5);

    // Splash preview: the exported glyph at imageWidth 120 on #07090F, as expo-splash-screen lays it out.
    const glyph = (await fs.readFile(splash)).toString('base64');
    await page.setContent(`<body style="margin:0;background:#07090F;width:390px;height:844px;display:flex;align-items:center;justify-content:center"><img src="data:image/png;base64,${glyph}" width="160" height="160"></body>`);
    await page.screenshot({ path: path.join(output, 'splash-preview.png') });

    evidence.errors = errors;
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
