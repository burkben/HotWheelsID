const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-05');
const viewport = { width: 390, height: 844 };
const arcLength = 2 * Math.PI * 134 * 240 / 360;

async function record(page, label, duration) {
  return page.getByRole('button', { name: label, exact: true }).evaluate((button, duration) => new Promise(resolve => {
    const frames = [];
    const start = performance.now();
    button.click();
    function tick() {
      const arc = document.querySelector('[data-testid="gauge-arc"]');
      const tip = document.querySelector('[data-testid="gauge-tip"]');
      frames.push({ t: performance.now() - start, offset: Number(arc.getAttribute('stroke-dashoffset')), x: Number(tip.getAttribute('cx')), y: Number(tip.getAttribute('cy')), heat: Number(getComputedStyle(document.querySelector('[data-testid="gauge-flames"]')).opacity), bestScale: document.querySelector('[data-testid="gauge-best"]') ? new DOMMatrix(getComputedStyle(document.querySelector('[data-testid="gauge-best"]')).transform).m11 : null });
      if (frames.at(-1).t < duration) requestAnimationFrame(tick); else resolve(frames);
    }
    requestAnimationFrame(tick);
  }), duration);
}
const at = (frames, ms) => frames.find(frame => frame.t >= ms) || frames.at(-1);
const mph = frame => (1 - frame.offset / arcLength) * 300;
const close = (actual, target, tolerance = 1) => assert.ok(Math.abs(actual - target) < tolerance, `${actual} should be near ${target}`);

async function main() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [];
  async function open(url, options = {}) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, ...options });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(base + url, { waitUntil: 'domcontentloaded' });
    return page;
  }
  try {
    const page = await open('/dev/redline?section=gauge');
    await page.locator('#gauge-hydrated').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const sweepPromise = record(page, 'Pass 280', 3100);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(output, 'gauge-280-web.png') });
    const sweep = await sweepPromise;
    assert.ok(mph(at(sweep, 250)) > 150 && mph(at(sweep, 250)) < 280);
    close(mph(at(sweep, 700)), 280);
    close(mph(at(sweep, 1400)), 280);
    assert.equal(at(sweep, 700).heat, 1);
    assert.ok(sweep.some(frame => frame.bestScale < 0.95));
    close(at(sweep, 700).bestScale, 1, 0.01);
    assert.ok(mph(at(sweep, 1900)) < 100);
    close(mph(sweep.at(-1)), 0);
    close(at(sweep, 700).x, 170 + 134 * Math.cos(14 * Math.PI / 180), 0.1);
    close(at(sweep, 700).y, 165 + 134 * Math.sin(14 * Math.PI / 180), 0.1);
    const repeat = await record(page, 'Pass 280', 3100);
    close(mph(at(repeat, 700)), 280);
    close(mph(repeat.at(-1)), 0);
    assert.match(await page.getByTestId('gauge-sample').textContent(), /PASS 3/);
    await page.getByRole('button', { name: 'Track mode', exact: true }).click();
    const track = await record(page, 'Pass 180', 2100);
    close(mph(at(track, 1000)), 180);
    close(mph(track.at(-1)), 180);
    const up = await record(page, 'Pass 260', 1200);
    const down = await record(page, 'Pass 120', 1200);
    for (let i = 1; i < up.length; i++) assert.ok(mph(up[i]) >= mph(up[i - 1]) - 0.1);
    for (let i = 1; i < down.length; i++) assert.ok(mph(down[i]) <= mph(down[i - 1]) + 0.1);
    close(mph(up.at(-1)), 260);
    close(mph(down.at(-1)), 120);
    await page.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    await page.getByRole('button', { name: 'Sweep mode', exact: true }).click();
    const appReduced = await record(page, 'Pass 280', 1800);
    close(mph(at(appReduced, 50)), 280);
    close(mph(appReduced.at(-1)), 280);
    close(at(appReduced, 50).bestScale, 1, 0.001);
    await page.getByRole('button', { name: 'Show km/h', exact: true }).click();
    await page.getByRole('img', { name: 'Speedometer, 451 kilometers per hour, new session best', exact: true }).waitFor();
    await page.evaluate(() => document.querySelector('[data-testid="redline-gauge"]').scrollIntoView());
    await page.screenshot({ path: path.join(output, 'gauge-kmh-reduced-web.png') });
    const barColors = await page.getByTestId('pass-bar').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    assert.equal(barColors.length, 14);
    assert.equal(barColors[13], 'rgb(255, 210, 63)');
    assert.equal(barColors[9], 'rgb(255, 106, 19)');
    assert.equal(barColors[0], 'rgb(46, 58, 77)');
    await page.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    const reduced = await open('/dev/redline?section=gauge', { reducedMotion: 'reduce' });
    await reduced.locator('#gauge-hydrated').waitFor();
    const osReduced = await record(reduced, 'Pass 280', 1800);
    close(mph(at(osReduced, 50)), 280);
    close(mph(osReduced.at(-1)), 280);
    close(at(osReduced, 50).bestScale, 1, 0.001);
    const demo = await open('/', { reducedMotion: 'reduce' });
    await demo.getByTestId('tab-indicator').waitFor();
    await demo.waitForFunction(() => document.querySelectorAll('[data-testid="pass-bar"]').length === 14, null, { timeout: 55000 });
    await demo.screenshot({ path: path.join(output, 'speed-web.png') });
    const card = demo.getByTestId('active-car-card');
    assert.ok((await card.boundingBox()).height >= 44);
    await card.click();
    await demo.waitForURL(/\/garage\//);
    const wide = await open('/', { viewport: { width: 1194, height: 834 }, reducedMotion: 'reduce' });
    await wide.getByTestId('tab-indicator').waitFor();
    await wide.getByTestId('active-car-card').waitFor();
    await wide.evaluate(() => document.fonts.ready);
    const gaugeBox = await wide.getByTestId('redline-gauge').boundingBox();
    const cardBox = await wide.getByTestId('active-car-card').boundingBox();
    assert.ok(gaugeBox.x + gaugeBox.width < cardBox.x);
    await wide.screenshot({ path: path.join(output, 'speed-ipad-web.png') });
    const tv = await open('/tv', { viewport: { width: 1440, height: 900 } });
    await tv.getByLabel(/^Speedometer,/).waitFor();
    await tv.evaluate(() => document.fonts.ready);
    assert.equal(await tv.getByTestId('redline-gauge').count(), 0);
    await tv.screenshot({ path: path.join(output, 'tv-web.png') });
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, sweep, repeat, track, up, down, appReduced, osReduced, barColors, gaugeBox, cardBox, errors }, null, 2) + '\n');
    console.log('PASS: 280 sweep + repeat, hold/return, track up/down/hold, tip geometry, full heat, app + OS static targets, km/h, bar colors, car navigation, iPad panes, TV needle.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
