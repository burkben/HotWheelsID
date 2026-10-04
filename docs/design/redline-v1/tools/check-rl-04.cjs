const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-04');
const viewport = { width: 390, height: 844 };

async function settledIndicator(page, index) {
  await page.waitForFunction(index => {
    const indicator = document.querySelector('[data-testid="tab-indicator"]');
    if (!indicator) return false;
    const width = indicator.parentElement.getBoundingClientRect().width / 5;
    return Math.abs(new DOMMatrix(getComputedStyle(indicator).transform).m41 - width * (index + 0.24)) < 0.1;
  }, index);
}

async function main() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.error(message.text()); } });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Portal status: Demo ready', exact: true }).waitFor();
    await settledIndicator(page, 0);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.getByTestId('portal-status-ribbon').count(), 0);
    const tabs = page.getByTestId('redline-tab-bar').getByRole('tab');
    const targets = await tabs.evaluateAll(nodes => nodes.map(node => ({ label: node.getAttribute('aria-label'), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    assert.equal(targets.length, 5);
    assert.ok(targets.every(({ width, height }) => width >= 44 && height >= 44));
    await page.screenshot({ path: path.join(output, 'speed-web.png') });
    for (const [index, name] of ['Speed', 'Race', 'Garage', 'History', 'More'].entries()) {
      await page.getByRole('tab', { name, exact: true }).click();
      await settledIndicator(page, index);
      assert.equal(await page.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), 'true');
      assert.equal(await page.getByTestId('portal-status-ribbon').count(), index === 0 ? 0 : 1);
      await page.screenshot({ path: path.join(output, `${name.toLowerCase()}-web.png`) });
    }
    // The ribbon uses the same confirmation/action policy as the header chip.
    page.once('dialog', dialog => dialog.accept());
    await page.getByTestId('portal-status-ribbon').getByRole('button').click();
    await page.getByRole('button', { name: 'Portal status: Demo paused', exact: true }).waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('[aria-live]')).some(node => node.textContent.includes('DEMO PAUSED')));
    const announcements = await page.locator('[aria-live]').allTextContents();
    await page.getByRole('button', { name: 'Portal status: Demo paused', exact: true }).click();
    await page.getByRole('button', { name: 'Portal status: Demo ready', exact: true }).waitFor();
    // Use the real setting through Settings; restore it after checking the dock.
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    const reduce = page.getByRole('switch', { name: 'Reduce motion', exact: true });
    await reduce.click();
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    await page.getByRole('tab', { name: 'Garage', exact: true }).focus();
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('[data-testid="tab-garage"]')?.getAttribute('aria-selected') === 'true');
    const appReduced = await page.getByTestId('tab-indicator').evaluate(async node => { await new Promise(requestAnimationFrame); return new DOMMatrix(getComputedStyle(node).transform).m41; });
    assert.ok(Math.abs(appReduced - 390 / 5 * 2.24) < 0.1);
    await page.getByRole('tab', { name: 'More', exact: true }).click();
    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await page.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    await page.getByRole('button', { name: 'Go back', exact: true }).click();
    const reduced = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await reduced.goto(base, { waitUntil: 'domcontentloaded' });
    await reduced.getByTestId('tab-indicator').waitFor();
    await reduced.getByRole('tab', { name: 'History', exact: true }).click();
    await reduced.waitForFunction(() => document.querySelector('[data-testid="tab-history"]')?.getAttribute('aria-selected') === 'true');
    const osReduced = await reduced.getByTestId('tab-indicator').evaluate(async node => { await new Promise(requestAnimationFrame); return new DOMMatrix(getComputedStyle(node).transform).m41; });
    assert.ok(Math.abs(osReduced - 390 / 5 * 3.24) < 0.1);
    const tv = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await tv.goto(`${base}/tv`, { waitUntil: 'domcontentloaded' });
    await tv.getByLabel(/^Speedometer,/).waitFor();
    assert.equal(await tv.getByTestId('redline-tab-bar').count(), 0);
    assert.equal(await tv.getByTestId('portal-status-ribbon').count(), 0);
    await tv.screenshot({ path: path.join(output, 'tv-web.png') });
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, targets, appReduced, osReduced, announcements, errors }, null, 2) + '\n');
    console.log('PASS: five routes, 44 pt targets, indicator positions, Speed ribbon exclusion, status announcements/actions, keyboard navigation, reduced-motion settings, TV isolation.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
