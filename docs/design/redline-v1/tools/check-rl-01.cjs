// Run with Playwright available on NODE_PATH and Expo web running on port 8082.
// PLAYWRIGHT_CHANNEL=chrome uses an existing Chrome installation.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-01');
const viewport = { width: 390, height: 844 };

async function main() {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  try {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${base}/dev/redline`, { waitUntil: 'networkidle' });
    assert.equal(await page.getByTestId('font-status').innerText(), 'BUNDLED FONTS READY');
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => Array.from(document.fonts).map(({ family, status }) => ({ family, status })));
    assert.equal(fonts.length, 10);
    assert.ok(fonts.every(({ status }) => status === 'loaded'));
    const variants = await page.locator('[data-testid^="type-"], [data-testid^="face-"]').evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { id: element.dataset.testid, family: style.fontFamily, weight: style.fontWeight, style: style.fontStyle };
    }));
    assert.equal(variants.length, 27); // 17 variants and all 10 individual faces.
    assert.ok(variants.every(({ family, weight, style }) => fonts.some((font) => font.family === family) && weight === '400' && style === 'normal'));
    await page.screenshot({ path: path.join(output, 'gallery-web.png') });
    for (const variant of ['raceDigit', 'gaugeReadout', 'body']) {
      await page.getByTestId(`specimen-${variant}`).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `type-${variant}-web.png`) });
    }
    await page.getByTestId('face-display700').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'type-face-web.png') });

    await page.goto(`${base}/credits`, { waitUntil: 'networkidle' });
    await page.getByText('Read font licenses', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, 'credits-web.png') });
    await page.context().setOffline(true);
    await page.getByText('Read font licenses', { exact: true }).click();
    assert.equal(await page.getByText('PERMISSION & CONDITIONS', { exact: false }).count(), 1);
    await page.context().setOffline(false);
    assert.deepEqual(errors, []);

    // Expo SSR emits font-face CSS, which its hydration path treats as loaded.
    // Remove that cache to exercise the runtime loader's rejected-promise path.
    const fallback = await browser.newPage({ viewport, deviceScaleFactor: 2 });
    await fallback.route('**/dev/redline', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace(/<style id="expo-generated-fonts">[\s\S]*?<\/style>/, '') });
    });
    await fallback.route(/\.ttf(?:\?|$)/, (route) => route.abort());
    await fallback.goto(`${base}/dev/redline`, { waitUntil: 'domcontentloaded' });
    await fallback.getByTestId('font-status').filter({ hasText: 'SYSTEM FONT FALLBACK' }).waitFor({ timeout: 25000 });
    const fallbackFamily = await fallback.getByTestId('type-wordmark').evaluate((element) => getComputedStyle(element).fontFamily);
    assert.doesNotMatch(fallbackFamily, /Barlow|Chakra/);
    await fallback.screenshot({ path: path.join(output, 'fallback-web.png') });
    await fs.writeFile(path.join(output, 'web-verification.json'), JSON.stringify({ viewport, deviceScaleFactor: 2, fonts, variants, offlineLicenses: true, fallbackFamily, errors }, null, 2) + '\n');
    console.log('PASS: 10 fonts, 17 variants, offline licenses, runtime failure fallback, no page errors.');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
