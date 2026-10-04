// Run with Playwright on NODE_PATH and Expo web on port 8082.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

async function main() {
  const output = path.resolve(__dirname, '../review/rl-02');
  const viewport = { width: 390, height: 844 };
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(`${process.env.REDLINE_REVIEW_URL || 'http://localhost:8082'}/dev/redline?section=motifs`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.getByTestId('motif-grid').waitFor();
    const patterns = await page.locator('pattern').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(new Set(patterns).size, patterns.length);
    const svgs = page.getByTestId('motif-gallery').locator('svg');
    const exposed = await svgs.evaluateAll(nodes => nodes.filter(node => !node.closest('[aria-hidden="true"]')).map(node => node.outerHTML));
    assert.deepEqual(exposed, []);
    await page.screenshot({ path: path.join(output, 'motifs-web.png') });
    for (const [id, file] of [['motif-cars', 'cars-medallions-web.png'], ['motif-marks', 'marks-web.png'], ['motif-gantry', 'gantry-web.png']]) {
      await page.getByTestId(id).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, file) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByTestId('motif-gallery').evaluate(node => node.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, 'motifs-wide-web.png') });
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, errors, patterns, svgCount: await svgs.count(), exposed }, null, 2) + '\n');
    console.log('PASS: unique SVG patterns, decorative accessibility, zero browser errors; phone and wide captures saved.');
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
