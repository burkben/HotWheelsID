const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-08');
const viewport = { width: 390, height: 844 };
async function sample(page) {
  return page.evaluate(() => {
    const point = id => { const node = document.querySelector(`[data-testid="${id}"]`); return node ? { x: Number(node.getAttribute('cx')), y: Number(node.getAttribute('cy')) } : null; };
    return { clock: document.querySelector('[data-testid="race-lap-clock"]').value, ghost: point('pace-ghost'), last: point('pace-last-lap'), fill: document.querySelector('[data-testid="current-lap-fill"]')?.getBoundingClientRect().width };
  });
}
async function main() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], dialogs = [];
  async function open(query = '', reducedMotion = 'no-preference', size = viewport) {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.dismiss(); });
    await page.goto(`${base}/dev/redline?section=race-live${query}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#race-live-hydrated').waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (!query.includes('moving=1')) await page.waitForTimeout(350);
    return page;
  }
  try {
    await fs.mkdir(output, { recursive: true });
    const reference = await open();
    await reference.waitForFunction(() => document.querySelector('[data-testid="race-lap-clock"]').value === '2.31');
    await reference.screenshot({ path: path.join(output, 'race-live-web.png') });
    assert.equal(await reference.getByTestId('race-total-clock').inputValue(), '00:08.169');
    assert.equal(await reference.getByTestId('race-delta-clock').inputValue(), '−0.54');
    assert.equal(await reference.getByText(/GATE SPEED/).count(), 0);
    assert.ok(await reference.getByLabel('Lap 2, 2.847 seconds, fastest', { exact: true }).isVisible());
    assert.equal(await reference.getByTestId('race-lap-clock').getAttribute('tabindex'), '-1');
    const fixed = await sample(reference);
    assert.deepEqual(fixed.ghost, fixed.last); // Last lap is also the fastest: markers coincide honestly.
    const target = await reference.getByRole('button', { name: 'Finish race now', exact: true }).boundingBox();
    assert.ok(target.height >= 44 && target.width >= 44);
    assert.ok(target.x >= 16 + target.height * Math.tan(Math.PI / 15) - 0.1);
    const first = await open('&first=1');
    assert.equal(await first.getByTestId('pace-ghost').count(), 0);
    assert.equal(await first.getByTestId('pace-last-lap').count(), 0);
    assert.equal(await first.getByText('VS FASTEST', { exact: true }).count(), 0);
    await first.screenshot({ path: path.join(output, 'first-lap-web.png') });
    const empty = await open('&empty=1&elapsed=0');
    assert.equal(await empty.getByTestId('race-lap-clock').inputValue(), '—');
    await empty.getByText('Cross the line to start the timer.', { exact: true }).waitFor();
    const overflow = await open('&elapsed=4');
    const parked = await sample(overflow);
    assert.deepEqual(parked.ghost, { x: 170, y: 30 });
    assert.ok((await overflow.getByTestId('race-delta-clock').inputValue()).startsWith('+'));
    await overflow.screenshot({ path: path.join(output, 'overflow-web.png') });
    const moving = await open('&moving=1&controls=1&slow=1');
    const before = await sample(moving);
    await moving.waitForTimeout(250);
    const after = await sample(moving);
    assert.notEqual(after.clock, before.clock);
    assert.notDeepEqual(after.ghost, before.ghost);
    assert.notEqual(after.fill, before.fill);
    await moving.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    await moving.waitForTimeout(80);
    const appBefore = await sample(moving);
    await moving.waitForTimeout(250);
    const appAfter = await sample(moving);
    assert.deepEqual(appBefore.ghost, appAfter.ghost);
    assert.deepEqual(appBefore.last, appAfter.last);
    assert.equal(appBefore.fill, appAfter.fill);
    assert.notEqual(appBefore.clock, appAfter.clock); // Measurement still ticks; decoration stays static.
    await moving.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    const os = await open('&moving=1&slow=1', 'reduce');
    const osBefore = await sample(os);
    await os.waitForTimeout(250);
    const osAfter = await sample(os);
    assert.deepEqual(osBefore.ghost, osAfter.ghost);
    assert.notEqual(osBefore.clock, osAfter.clock);
    const complete = await open('&controls=1');
    await complete.getByRole('button', { name: 'Complete lap', exact: true }).click();
    const completion = await complete.evaluate(() => new Promise(resolve => {
      const start = performance.now(), rows = [];
      const tick = () => { rows.push({ t: performance.now() - start, color: getComputedStyle(document.querySelectorAll('[data-testid="lap-segment"]')[2]).backgroundColor, transform: getComputedStyle(document.querySelector('[data-testid="timing-lap-3"]')).transform });
        if (performance.now() - start < 380) requestAnimationFrame(tick); else resolve(rows); }; requestAnimationFrame(tick);
    }));
    assert.ok(new Set(completion.map(row => row.color)).size > 1);
    assert.ok(new Set(completion.map(row => row.transform)).size > 3);
    assert.equal(completion.at(-1).color, 'rgb(43, 209, 255)');
    const lineup = await open('&lineup=1', 'reduce', { width: 1024, height: 768 });
    await lineup.screenshot({ path: path.join(output, 'lineup-ipad-web.jpg'), quality: 65 });
    const long = await open('&elapsed=120');
    const longClock = await long.getByTestId('race-lap-clock').evaluate(node => ({ value: node.value, width: node.getBoundingClientRect().width, fontSize: Number.parseFloat(getComputedStyle(node).fontSize) }));
    assert.equal(longClock.value, '120.00');
    assert.ok(longClock.fontSize < 64 && longClock.fontSize >= 30);
    await reference.getByRole('button', { name: 'Finish race now', exact: true }).click();
    await reference.getByText('Race ended', { exact: true }).waitFor();
    // Real controller + engine. Explicit passes supplement the automatic demo.
    const race = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    race.on('pageerror', error => errors.push(error.message));
    race.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    race.on('dialog', dialog => { dialogs.push(dialog.message()); dialog.dismiss(); });
    await race.goto(`${base}/race`, { waitUntil: 'domcontentloaded' });
    await race.getByRole('button', { name: 'Portal status: Demo ready', exact: true }).waitFor();
    await race.waitForTimeout(1200);
    await race.getByRole('button', { name: 'Start solo race', exact: true }).click();
    await race.getByTestId('race-countdown').waitFor({ state: 'hidden' });
    await race.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
    await race.waitForTimeout(400);
    await race.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
    await race.getByTestId('timing-lap-1').waitFor();
    await race.getByTestId('race-progress').scrollIntoViewIfNeeded();
    await race.screenshot({ path: path.join(output, 'demo-race-web.jpg'), quality: 75 });
    await race.getByRole('button', { name: 'Finish race now', exact: true }).click();
    await race.getByText('Finished', { exact: true }).waitFor();
    await race.screenshot({ path: path.join(output, 'results-shared-timing-web.jpg'), quality: 75 });
    const split = await browser.newPage({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    split.on('pageerror', error => errors.push(error.message));
    await split.goto(`${base}/race`, { waitUntil: 'domcontentloaded' });
    await split.getByRole('button', { name: 'Portal status: Demo ready', exact: true }).waitFor();
    await split.waitForTimeout(1200);
    await split.getByRole('button', { name: 'Start solo race', exact: true }).click();
    await split.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
    await split.waitForTimeout(400);
    await split.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
    await split.getByTestId('timing-lap-1').waitFor();
    const mapBox = await split.getByTestId('pace-map').boundingBox();
    const rowBox = await split.getByTestId('timing-lap-1').boundingBox();
    assert.ok(rowBox.x > mapBox.x + mapBox.width);
    await split.screenshot({ path: path.join(output, 'demo-race-ipad-web.jpg'), quality: 45 });
    assert.deepEqual(dialogs, []);
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, fixed, parked, before, after, appBefore, appAfter, osBefore, osAfter, completion, target, longClock, errors, dialogs }, null, 2) + '\n');
    console.log('PASS: reference/first-lap/overflow/lineup/real race screenshots, source-path projection, UI clocks, no-reference fallback, app/OS static decoration, lap-completion/row motion, target geometry, long timer fit, real gate events and no-confirm early finish, zero browser errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
