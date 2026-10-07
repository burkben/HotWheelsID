const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-09');
const viewport = { width: 390, height: 844 };
async function main() {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], dialogs = [], evidence = {};
  async function pageFor(url, size = viewport, reducedMotion = 'reduce') {
    const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2, reducedMotion });
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await page.addInitScript(() => {
      window.reviewShare = null;
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.reviewShare = data; } });
      window.motionFrames = [];
      const observer = new MutationObserver(() => {
        if (!document.querySelector('[data-testid="finish-checker"]')) return;
        observer.disconnect();
        const start = performance.now();
        const sample = () => {
          const banner = document.querySelector('[data-testid="finish-checker"]'), stamp = document.querySelector('[data-testid="record-stamp"]');
          if (banner) window.motionFrames.push({ t: performance.now() - start, banner: getComputedStyle(banner).transform, stamp: stamp && getComputedStyle(stamp).transform });
          if (performance.now() - start < 700) requestAnimationFrame(sample);
        }; requestAnimationFrame(sample);
      }); observer.observe(document, { childList: true, subtree: true });
    });
    await page.goto(`${base}${url}`, { waitUntil: 'domcontentloaded' });
    if (url.includes('section=results')) await page.locator('#results-hydrated').waitFor();
    else { await page.getByRole('button', { name: 'Start solo race', exact: true }).waitFor(); await page.waitForTimeout(1200); }
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  async function capture(page, name, quality) { await page.screenshot({ path: path.join(output, name), ...(quality ? { quality } : {}) }); }
  async function fullRace(page) {
    await page.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).waitFor();
    for (let i = 0; i < 9; i++) {
      if (await page.getByText('FINISH', { exact: true }).count()) break;
      await page.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
      await page.waitForTimeout(400);
    }
    await page.getByText('FINISH', { exact: true }).waitFor();
  }
  async function shortHeat(page) {
    await page.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
    await page.waitForTimeout(450);
    await page.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click();
    await page.getByTestId('timing-lap-1').waitFor();
    await page.getByRole('button', { name: 'Finish race now', exact: true }).click();
    await page.getByText('FINISH', { exact: true }).waitFor();
  }
  try {
    await fs.mkdir(output, { recursive: true });
    const reference = await pageFor('/dev/redline?section=results');
    await reference.waitForTimeout(700);
    await capture(reference, 'results-web.png');
    assert.ok(await reference.getByLabel('Total 14.903 seconds', { exact: true }).isVisible());
    assert.ok(await reference.getByLabel('Top speed 247 miles per hour', { exact: true }).isVisible());
    assert.ok(await reference.getByText('Beat its old best by 0.165 s', { exact: true }).isVisible());
    const button = await reference.getByRole('button', { name: 'Race again', exact: true }).boundingBox();
    assert.ok(button.height >= 44 && button.x >= 16 + button.height * Math.tan(Math.PI / 15) - 0.1);
    await reference.getByRole('button', { name: "Share P1's race result", exact: true }).click();
    evidence.share = await reference.evaluate(() => window.reviewShare);
    assert.ok(evidence.share.text.includes('14.90'));
    assert.ok(evidence.share.text.includes('Dodge Charger'));
    evidence.osMotion = await reference.evaluate(() => window.motionFrames);
    assert.equal(new Set(evidence.osMotion.filter(f => f.t > 100).map(f => f.banner)).size, 1);
    assert.equal(new Set(evidence.osMotion.filter(f => f.t > 100).map(f => f.stamp)).size, 1);
    await reference.getByRole('button', { name: 'Race again', exact: true }).click();
    await reference.getByText('Race again selected', { exact: true }).waitFor();
    for (const record of ['first', 'tie', 'miss', 'unknown']) {
      const p = await pageFor(`/dev/redline?section=results&record=${record}&fallback=1`);
      assert.equal(await p.getByTestId('record-stamp').count(), record === 'first' ? 1 : 0);
      assert.equal(await p.getByText(/Beat its old best/).count(), 0);
      assert.ok(await p.getByLabel('Average lap 2.981 seconds', { exact: true }).isVisible());
      if (record === 'tie') await capture(p, 'results-tie-fallback-web.png');
      await p.close();
    }
    const motion = await pageFor('/dev/redline?section=results&controls=1', viewport, 'no-preference');
    await motion.waitForTimeout(900);
    evidence.motion = await motion.evaluate(() => window.motionFrames);
    assert.ok(new Set(evidence.motion.map(f => f.banner)).size > 3);
    assert.ok(new Set(evidence.motion.map(f => f.stamp)).size > 3);
    await motion.getByRole('switch', { name: 'Reduce motion', exact: true }).click();
    const appMotion = await motion.evaluate(() => new Promise(resolve => {
      const frames = [], start = performance.now();
      const sample = () => { frames.push({ banner: getComputedStyle(document.querySelector('[data-testid="finish-checker"]')).transform, stamp: getComputedStyle(document.querySelector('[data-testid="record-stamp"]')).transform }); if (performance.now() - start < 400) requestAnimationFrame(sample); else resolve(frames); }; requestAnimationFrame(sample);
    }));
    assert.equal(new Set(appMotion.map(f => f.banner)).size, 1);
    assert.equal(new Set(appMotion.map(f => f.stamp)).size, 1);
    evidence.appMotion = appMotion;
    const long = await pageFor('/dev/redline?section=results&long=1');
    await long.waitForTimeout(150);
    await capture(long, 'results-long-times-web.jpg', 65);
    const longCell = await long.getByText('1514.903', { exact: true }).evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth, font: parseFloat(getComputedStyle(node).fontSize) }));
    assert.ok(longCell.scroll <= longCell.width && longCell.font < 24);
    evidence.longCell = longCell;
    assert.ok(await long.getByLabel('Total 1514.903 seconds', { exact: true }).isVisible());
    console.log('Results and motion passed');
    const solo = await pageFor('/race');
    await capture(solo, 'setup-web.png');
    const start = solo.getByRole('button', { name: 'Start solo race', exact: true });
    const before = await start.boundingBox();
    await solo.getByText('Finish a race to set a time. Results are saved on this device.', { exact: true }).scrollIntoViewIfNeeded();
    const after = await start.boundingBox();
    assert.equal(before.y, after.y);
    assert.ok(before.y + before.height < 844);
    await solo.getByRole('button', { name: '10 laps', exact: true }).click();
    assert.equal(await solo.getByRole('button', { name: '10 laps', exact: true }).getAttribute('aria-pressed'), 'true');
    await solo.getByRole('button', { name: '5 laps', exact: true }).click();
    await solo.getByRole('textbox', { name: 'Solo player name', exact: true }).fill('Solo Review');
    await start.click(); await fullRace(solo);
    await solo.getByText('FINISH', { exact: true }).scrollIntoViewIfNeeded();
    await capture(solo, 'demo-results-web.jpg', 65);
    assert.ok(await solo.getByTestId('record-stamp').count());
    await solo.getByRole('button', { name: 'Race again', exact: true }).click();
    await start.waitFor();
    console.log('Solo passed');
    await solo.getByRole('button', { name: 'Race night', exact: true }).click();
    for (const name of ['Ada', 'Ben', 'Cy']) {
      await solo.getByRole('textbox', { name: 'Racer name', exact: true }).fill(name);
      await solo.getByRole('button', { name: `Add ${name} to lineup`, exact: true }).click();
    }
    await solo.getByRole('button', { name: 'Make Cy the next racer', exact: true }).click();
    await solo.getByRole('button', { name: 'Remove Ben from lineup', exact: true }).click();
    assert.equal(await solo.getByRole('button', { name: 'Remove Ben from lineup', exact: true }).count(), 0);
    await solo.getByRole('button', { name: 'Start race for Ada', exact: true }).click(); await shortHeat(solo);
    await solo.getByRole('button', { name: 'Advance to Cy', exact: true }).click();
    await solo.getByRole('button', { name: 'Start race for Cy', exact: true }).waitFor();
    await solo.getByText('Current racer', { exact: true }).scrollIntoViewIfNeeded();
    await capture(solo, 'lineup-web.jpg', 65);
    console.log('Lineup passed');
    await solo.getByRole('switch', { name: 'Run the lineup as a single-elimination bracket', exact: true }).click();
    await solo.getByRole('button', { name: 'Start tournament', exact: true }).click(); await shortHeat(solo);
    await solo.getByRole('button', { name: 'Continue', exact: true }).click(); await shortHeat(solo);
    await solo.getByRole('button', { name: 'Continue', exact: true }).click();
    await solo.getByRole('button', { name: 'Start a new tournament', exact: true }).waitFor();
    const champion = solo.getByLabel(/^Tournament champion, /);
    evidence.champion = await champion.getAttribute('aria-label');
    await champion.scrollIntoViewIfNeeded(); await capture(solo, 'champion-web.jpg', 65);
    await solo.getByText('Bracket', { exact: true }).scrollIntoViewIfNeeded(); await capture(solo, 'bracket-web.jpg', 65);
    assert.ok(await solo.getByText('WINNER', { exact: true }).count());
    await solo.getByRole('button', { name: 'Start a new tournament', exact: true }).click();
    assert.equal(await solo.getByRole('button', { name: 'Start a new tournament', exact: true }).count(), 0);
    await solo.getByRole('button', { name: 'Start tournament', exact: true }).waitFor();
    const ipad = await pageFor('/race', { width: 1024, height: 768 });
    await ipad.getByRole('button', { name: 'Start solo race', exact: true }).click(); await shortHeat(ipad);
    const finishBox = await ipad.getByText('FINISH', { exact: true }).boundingBox();
    const chartBox = await ipad.getByText('LAP BY LAP', { exact: true }).boundingBox();
    assert.ok(chartBox.x > finishBox.x + finishBox.width);
    await ipad.getByTestId('race-results').evaluate(node => { for (let p = node.parentElement; p; p = p.parentElement) { if (p.scrollHeight > p.clientHeight) p.scrollTop = 0; } });
    await capture(ipad, 'results-ipad-web.jpg', 35);
    assert.deepEqual(errors, []); assert.deepEqual(dialogs, []);
    evidence.errors = errors; evidence.dialogs = dialogs; evidence.pinnedStart = { before, after };
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log('RL-09 browser checks passed');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
