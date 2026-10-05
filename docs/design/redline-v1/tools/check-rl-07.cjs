const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-07');
const viewport = { width: 390, height: 844 };
async function frames(page, duration = 420) {
  return page.evaluate(duration => new Promise(resolve => {
    const start = performance.now(), values = [];
    const sample = () => {
      const scale = document.querySelector('[data-testid="countdown-scale"]');
      const echoes = document.querySelector('[data-testid="countdown-echoes"]');
      values.push({ t: performance.now() - start, scale: getComputedStyle(scale).transform, echoes: getComputedStyle(echoes).transform,
        glow: getComputedStyle(document.querySelectorAll('[data-testid="start-lamp-on"] > div')[document.querySelectorAll('[data-testid="start-lamp-on"] > div').length - 2]).opacity });
      if (performance.now() - start < duration) requestAnimationFrame(sample); else resolve(values);
    }; requestAnimationFrame(sample);
  }), duration);
}
async function main() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [];
  async function open(query = '', reducedMotion = 'reduce', size = viewport) {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${base}/dev/redline?section=countdown${query}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#countdown-hydrated').waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  try {
    await fs.mkdir(output, { recursive: true });
    const reference = await open();
    assert.equal(await reference.getByTestId('start-lamp-on').count(), 4);
    assert.equal(await reference.getByTestId('start-lamp-off').count(), 2);
    await reference.screenshot({ path: path.join(output, 'count-2-web.png') });
    const target = await reference.getByRole('button', { name: 'Cancel race', exact: true }).boundingBox();
    assert.ok(target.width >= 44 && target.height >= 44);
    assert.equal(await reference.getByTestId('countdown-echoes').getAttribute('aria-hidden'), 'true');
    assert.ok(await reference.getByLabel('Best lap 2.847 seconds', { exact: true }).isVisible());
    const go = await open('&count=0');
    assert.equal(await go.getByTestId('start-lamp-on').count(), 6);
    assert.equal(await go.getByTestId('countdown-scale').locator('text').getAttribute('fill'), '#39D98A');
    await go.screenshot({ path: path.join(output, 'go-web.png') });
    const tablet = await open('', 'reduce', { width: 1024, height: 768 });
    await tablet.screenshot({ path: path.join(output, 'count-2-ipad-web.png') });
    assert.ok((await tablet.getByTestId('countdown-digit').boundingBox()).width <= 390);
    const controls = await open('&controls=1');
    const sequence = [];
    for (const [label, lit] of [['3', 2], ['2', 4], ['1', 6], ['Go', 6]]) {
      await controls.getByRole('button', { name: label, exact: true }).click();
      assert.equal(await controls.getByTestId('start-lamp-on').count(), lit);
      sequence.push({ label, lit });
    }
    const osStatic = await frames(controls);
    assert.ok(osStatic.every(value => value.scale === osStatic[0].scale && value.echoes === osStatic[0].echoes));
    const moving = await open('&controls=1', 'no-preference');
    await moving.getByRole('button', { name: '1', exact: true }).click();
    const motion = await frames(moving);
    assert.ok(new Set(motion.map(value => value.scale)).size > 3);
    assert.ok(new Set(motion.map(value => value.echoes)).size > 3);
    assert.ok(new Set(motion.map(value => value.glow)).size > 1);
    await moving.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    await moving.getByRole('button', { name: '2', exact: true }).click();
    const appStatic = await frames(moving);
    assert.ok(appStatic.every(value => value.scale === appStatic[0].scale && value.echoes === appStatic[0].echoes));
    await moving.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    await reference.getByRole('button', { name: 'Cancel race', exact: true }).click();
    await reference.getByText('Countdown cancelled', { exact: true }).waitFor();
    // Actual race flow, with the existing demo controller and race engine.
    const race = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    race.on('pageerror', error => errors.push(error.message));
    await race.goto(`${base}/race`, { waitUntil: 'domcontentloaded' });
    await race.getByRole('button', { name: 'Portal status: Demo ready', exact: true }).waitFor();
    await race.getByRole('button', { name: 'Start solo race', exact: true }).click();
    await race.getByTestId('race-countdown').waitFor();
    const announcements = [];
    for (const digit of [3, 2, 1]) {
      await race.getByTestId('countdown-digit').filter({ has: race.locator(`[aria-hidden="true"]`) }).waitFor();
      await race.waitForFunction(digit => document.querySelector('[data-testid="countdown-digit"]')?.getAttribute('aria-label')?.startsWith(`Countdown ${digit}.`), digit);
      announcements.push(await race.locator('[aria-live="assertive"]').innerText());
      if (digit === 2) await race.screenshot({ path: path.join(output, 'race-count-2-web.png') });
    }
    await race.waitForFunction(() => document.querySelector('[data-testid="countdown-digit"]')?.getAttribute('aria-label')?.startsWith('Go.'));
    announcements.push(await race.locator('[aria-live="assertive"]').innerText());
    assert.deepEqual(announcements, ['3', '2', '1', 'Go']);
    await race.getByTestId('race-countdown').waitFor({ state: 'hidden' });
    await race.getByRole('button', { name: 'Finish race now', exact: true }).waitFor();
    // Reload gives a fresh, non-persisted race; cancellation must reveal setup.
    await race.reload({ waitUntil: 'domcontentloaded' });
    await race.getByRole('button', { name: 'Portal status: Demo ready', exact: true }).waitFor();
    await race.getByRole('button', { name: 'Start solo race', exact: true }).click();
    await race.getByRole('button', { name: 'Cancel race', exact: true }).click();
    await race.getByRole('button', { name: 'Start solo race', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, target, sequence, announcements, motion, osStatic, appStatic, errors }, null, 2) + '\n');
    console.log('PASS: reference/GO/iPad captures, six-light mapping, decorative semantics, spoken units, 44 pt cancellation, spring/echo motion, OS/app static states, actual race countdown/GO/announcements/cancellation, zero errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
