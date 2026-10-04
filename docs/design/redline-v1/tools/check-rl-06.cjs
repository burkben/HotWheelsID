const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-06');
const viewport = { width: 390, height: 844 };

async function radar(page) {
  return page.evaluate(() => ({
    radius: Number(document.querySelector('[data-testid="radar-outer"]').getAttribute('r')),
    opacity: Number(document.querySelector('[data-testid="radar-outer"]').getAttribute('stroke-opacity')),
    rotation: getComputedStyle(document.querySelector('[data-testid="radar-dashed"]')).transform,
  }));
}
async function main() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [];
  async function open(phase = 'scanning', reducedMotion = 'reduce') {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${base}/dev/redline?section=connect&phase=${phase}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#connect-hydrated').waitFor();
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  try {
    const searching = await open();
    await searching.getByRole('heading', { name: 'FIND YOUR PORTAL', exact: true }).waitFor();
    await searching.getByRole('button', { name: 'Portal status: Scanning…', exact: true }).waitFor();
    assert.equal(await searching.getByTestId('portal-illustration').getAttribute('aria-hidden'), 'true');
    const staticStart = await radar(searching);
    await searching.waitForTimeout(350);
    assert.deepEqual(await radar(searching), staticStart);
    assert.equal(staticStart.radius, 180);
    await searching.screenshot({ path: path.join(output, 'searching-web.png') });
    const targets = await searching.getByRole('button').evaluateAll(nodes => nodes.map(node => ({ label: node.getAttribute('aria-label'), width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    assert.ok(targets.every(target => target.width >= 44 && target.height >= 44));
    const demo = searching.getByRole('button', { name: 'NO PORTAL? TRY DEMO MODE', exact: true });
    await demo.scrollIntoViewIfNeeded();
    const box = await demo.boundingBox();
    assert.ok(box.x >= box.height * Math.tan(Math.PI / 15));
    await demo.click();
    await searching.waitForURL(url => url.pathname === '/');
    await searching.getByTestId('redline-gauge').waitFor();
    assert.equal(await searching.getByTestId('find-portal').count(), 0);
    const off = await open('poweredOff');
    await off.getByText('Bluetooth is off', { exact: true }).scrollIntoViewIfNeeded();
    await off.screenshot({ path: path.join(output, 'bluetooth-off-web.png') });
    assert.ok(await off.getByText(/Turn Bluetooth on in Control Center or Settings/).isVisible());
    await off.getByRole('button', { name: 'Retry portal connection', exact: true }).click();
    await off.getByRole('button', { name: 'Portal status: Scanning…', exact: true }).waitFor();
    const unauthorized = await open('unauthorized');
    const settings = unauthorized.getByRole('button', { name: 'Open device settings', exact: true });
    await settings.scrollIntoViewIfNeeded();
    assert.ok((await settings.boundingBox()).height >= 44);
    await unauthorized.screenshot({ path: path.join(output, 'permission-web.png') });
    const unsupported = await open('unsupported');
    assert.equal(await unsupported.getByRole('button', { name: 'Retry portal connection', exact: true }).count(), 0);
    const moving = await open('scanning', 'no-preference');
    const first = await radar(moving);
    await moving.waitForTimeout(450);
    const second = await radar(moving);
    assert.notEqual(second.rotation, first.rotation);
    assert.notEqual(second.radius, first.radius);
    await moving.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    await moving.waitForFunction(() => Number(document.querySelector('[data-testid="radar-outer"]').getAttribute('r')) === 180);
    const appStatic = await radar(moving);
    await moving.waitForTimeout(350);
    assert.deepEqual(await radar(moving), appStatic);
    await moving.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, staticStart, first, second, appStatic, targets, errors }, null, 2) + '\n');
    console.log('PASS: searching/fault states, existing retry/settings affordances, real demo action, 44 pt/skew targets, radar motion, OS/app static state, decorative accessibility, no browser errors.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
