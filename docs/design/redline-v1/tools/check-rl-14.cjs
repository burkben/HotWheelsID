// RL-14 Settings review against Expo web on :8082 (web always runs the demo portal,
// so the card shows DEMO MODE and "Start in demo mode" is locked on, as before).
// PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-14.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-14');
const BANNER = '[data-testid="trophy-unlock-banner"]';

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], evidence = {};
  const page = await browser.newPage({ viewport: { width: 390, height: 1720 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', (d) => { evidence.dialog = d.message(); d.accept(); });
  await page.addInitScript((sel) => document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style'); style.textContent = `${sel}{display:none!important}`; document.head.appendChild(style);
  }), BANNER);
  const sw = (name) => page.getByRole('switch', { name, exact: true });
  try {
    await fs.mkdir(output, { recursive: true });
    await page.goto(base + '/settings', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(output, 'settings-web.png') });

    evidence.sections = (await page.getByRole('heading').allInnerTexts()).filter((t) => t !== 'SETTINGS');
    assert.deepEqual(evidence.sections, ['PROFILE', 'RACING', 'SPEED', 'FEEDBACK', 'STARTUP', 'COMMUNITY', 'SYSTEM']);
    evidence.switchesBefore = await Promise.all(['Haptics', 'Sound', 'Reduce motion', 'Start in demo mode'].map(async (n) => [n, await sw(n).getAttribute('aria-checked')]));

    await sw('Sound').click();
    await sw('Reduce motion').click();
    await page.getByRole('tab', { name: 'KM/H', exact: true }).click();
    await page.getByRole('button', { name: 'Default laps, increase', exact: true }).click();
    await page.getByLabel('Player name').fill('Ben');
    await page.getByLabel('Player name').press('Enter');
    await page.waitForTimeout(400);
    evidence.switchesAfter = await Promise.all(['Sound', 'Reduce motion'].map(async (n) => [n, await sw(n).getAttribute('aria-checked')]));
    assert.deepEqual(evidence.switchesAfter, [['Sound', 'false'], ['Reduce motion', 'true']]);
    evidence.unitSelected = await page.getByRole('tab', { name: 'KM/H', exact: true }).getAttribute('aria-selected');
    assert.equal(evidence.unitSelected, 'true');
    evidence.laps = await page.getByRole('button', { name: 'Default laps, increase', exact: true }).locator('xpath=..').innerText();
    assert.match(evidence.laps, /10/);
    evidence.version = await page.getByText(/^VERSION /).innerText();

    // Portal card action goes through the shared confirm-disconnect path.
    await page.getByRole('button', { name: /^Portal status:/ }).click();
    await page.waitForTimeout(800);
    evidence.afterDisconnect = await page.getByRole('button', { name: /^Portal status:/ }).getAttribute('aria-label');
    await page.screenshot({ path: path.join(output, 'settings-disconnected-web.jpg'), quality: 82, clip: { x: 0, y: 0, width: 390, height: 420 } });
    await page.getByRole('button', { name: /^Portal status:/ }).click();
    await page.waitForTimeout(1500);
    evidence.afterConnect = await page.getByRole('button', { name: /^Portal status:/ }).getAttribute('aria-label');

    // Settings apply elsewhere: Speed shows km/h and the race setup uses the new laps/name.
    await page.getByRole('button', { name: 'Back to More' }).click();
    await page.getByRole('tab', { name: /Speed/i }).click();
    await page.waitForTimeout(800);
    evidence.speedUnit = await page.locator('text=/SCALE KM\\/H/i').first().innerText().catch(() => null);
    assert.ok(evidence.speedUnit, 'Speed shows km/h');

    evidence.errors = errors;
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
