const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const output = path.resolve(__dirname, '../review/rl-03');
  const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
  const viewport = { width: 390, height: 844 };
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') { errors.push(message.text()); console.error(message.text()); } });
    await page.goto(`${base}/dev/redline?section=controls`, { waitUntil: 'domcontentloaded' });
    await page.locator('#controls-hydrated').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const gallery = page.getByTestId('control-gallery');
    const targets = await gallery.locator('[role="button"], [role="switch"], [role="tab"]').evaluateAll(nodes => nodes.map(node => ({ label: node.getAttribute('aria-label') || node.textContent, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    assert.ok(targets.every(({ width, height }) => width >= 44 && height >= 44), JSON.stringify(targets));
    const button = page.getByRole('button', { name: 'Start race', exact: true });
    await page.waitForFunction(() => {
      const node = document.querySelector('[aria-label="Start race"]');
      return node && Math.abs(parseFloat(getComputedStyle(node).marginLeft) - node.getBoundingClientRect().height * Math.tan(Math.PI / 15)) < 0.1;
    });
    const inset = await button.evaluate(node => ({ height: node.getBoundingClientRect().height, margin: parseFloat(getComputedStyle(node).marginLeft) }));
    assert.ok(Math.abs(inset.margin - inset.height * Math.tan(Math.PI / 15)) < 0.1);
    await page.screenshot({ path: path.join(output, 'controls-web.png') });
    await button.hover();
    await page.mouse.down();
    await page.screenshot({ path: path.join(output, 'button-pressed-web.png') });
    await page.mouse.up();
    assert.equal(await page.getByTestId('control-action').innerText(), 'START RACE');
    assert.equal(await page.getByRole('button', { name: 'Start disabled', exact: true }).getAttribute('aria-disabled'), 'true');
    await page.getByRole('button', { name: 'Portal status: Disconnected', exact: true }).click();
    assert.equal(await page.getByTestId('control-action').innerText(), 'CONNECT');
    await page.getByRole('button', { name: 'Portal status: portal not found', exact: true }).click();
    assert.equal(await page.getByTestId('control-action').innerText(), 'RETRY');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('button', { name: 'Portal status: Connected', exact: true }).click();
    assert.equal(await page.getByTestId('control-action').innerText(), 'RETRY');
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Portal status: Connected', exact: true }).click();
    assert.equal(await page.getByTestId('control-action').innerText(), 'DISCONNECT');
    for (const id of ['status', 'stats', 'timing', 'settings', 'filters']) {
      await page.getByTestId(`controls-${id}`).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${id}-specimen-web.png`) });
    }
    const haptics = page.getByRole('switch', { name: 'Haptics', exact: true });
    await haptics.focus();
    await page.keyboard.press('Space');
    assert.equal(await haptics.getAttribute('aria-checked'), 'false');
    await page.getByRole('tab', { name: 'Kilometers per hour' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Kilometers per hour' }).getAttribute('aria-selected'), 'true');
    await page.getByRole('button', { name: 'Speed calibration, increase' }).click({ clickCount: 1 });
    await page.getByRole('button', { name: 'Speed calibration, increase' }).click();
    assert.equal(await page.getByRole('button', { name: 'Speed calibration, increase' }).getAttribute('aria-disabled'), 'true');
    await page.getByRole('button', { name: 'HW Race Team', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'HW Race Team', exact: true }).getAttribute('aria-pressed'), 'true');
    const reduce = page.getByRole('switch', { name: 'Reduce motion', exact: true });
    await reduce.click();
    assert.equal(await reduce.getAttribute('aria-checked'), 'true');
    await page.getByRole('switch', { name: 'Sound', exact: true }).click();
    const appReducedKnob = await page.getByRole('switch', { name: 'Sound', exact: true }).evaluate(async node => { await new Promise(requestAnimationFrame); return getComputedStyle(node.firstElementChild.firstElementChild).transform; });
    assert.equal(appReducedKnob, 'matrix(1, 0, 0, 1, 26, 0)');
    await reduce.click(); // Restore the persisted setting.
    const wide = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    await wide.goto(`${base}/dev/redline?section=controls`, { waitUntil: 'domcontentloaded' });
    await wide.locator('#controls-hydrated').waitFor();
    await wide.evaluate(() => document.fonts.ready);
    await wide.waitForFunction(() => Array.from(document.querySelectorAll('[role="tablist"]')).every(rail => {
      const selected = rail.querySelector('[aria-selected="true"]');
      return selected && Math.abs(parseFloat(getComputedStyle(rail.lastElementChild).width) - selected.getBoundingClientRect().width) < 0.1;
    }));
    await wide.screenshot({ path: path.join(output, 'controls-wide-web.png') });
    const reduced = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    await reduced.goto(`${base}/dev/redline?section=controls`, { waitUntil: 'domcontentloaded' });
    await reduced.locator('#controls-hydrated').waitFor();
    const sound = reduced.getByRole('switch', { name: 'Sound', exact: true });
    await sound.click();
    const osReducedKnob = await sound.evaluate(async node => { await new Promise(requestAnimationFrame); return getComputedStyle(node.firstElementChild.firstElementChild).transform; });
    assert.equal(osReducedKnob, 'matrix(1, 0, 0, 1, 26, 0)');
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, targets, inset, appReducedKnob, osReducedKnob, errors, interactions: ['button press', 'connect/retry', 'disconnect cancel/confirm', 'switch keyboard toggle', 'segment selection', 'stepper limit', 'filter selection'] }, null, 2) + '\n');
    console.log('PASS: touch targets, skew insets, actions, keyboard switch, app/OS reduced motion, screenshots, zero browser errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
