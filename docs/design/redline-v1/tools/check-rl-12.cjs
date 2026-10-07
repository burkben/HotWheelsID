// RL-12 History review against Expo web on :8082.
// PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-12.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const base = process.env.REDLINE_REVIEW_URL || 'http://localhost:8082';
const output = path.resolve(__dirname, '../review/rl-12');

(async () => {
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const errors = [], evidence = {};
  async function open(url, viewport = { width: 390, height: 844 }) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(base + url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    return page;
  }
  try {
    await fs.mkdir(output, { recursive: true });
    const fixture = await open('/dev/redline?section=history');
    await fixture.screenshot({ path: path.join(output, 'history-web.png') });
    evidence.stripLabel = await fixture.getByRole('img', { name: /^Last 14 days/ }).getAttribute('aria-label');
    assert.equal(evidence.stripLabel, 'Last 14 days: 9 sessions, 126 passes. Busiest: today, 2 sessions.');
    evidence.groups = await fixture.getByRole('heading').allInnerTexts();
    evidence.liveTicket = await fixture.getByRole('link', { name: /, live,/ }).getAttribute('aria-label');
    assert.match(evidence.liveTicket, /14 passes · 12 min so far, best 247 scale miles per hour, all-time best$/);
    await (await open('/dev/redline?section=history&empty=1')).screenshot({ path: path.join(output, 'history-empty-web.jpg'), quality: 82 });
    await (await open('/dev/redline?section=history', { width: 1024, height: 768 })).screenshot({ path: path.join(output, 'history-ipad-web.jpg'), quality: 82 });

    const demo = await open('/');
    await demo.getByText('demo mode', { exact: false }).first().click();
    for (let i = 0; i < 5; i++) {
      await demo.getByRole('button', { name: 'Trigger demo portal pass', exact: true }).click().catch(() => {});
      await demo.waitForTimeout(700);
    }
    await demo.getByRole('tab', { name: /History/i }).click();
    const ticket = demo.locator('a[href^="/history/"]').first();
    await ticket.waitFor();
    await demo.waitForTimeout(1200);
    evidence.demoTicket = await ticket.getAttribute('aria-label');
    assert.match(evidence.demoTicket, /, live, \d+ passes/);
    evidence.demoSparkline = await ticket.locator('polyline').count();
    assert.equal(evidence.demoSparkline, 1);
    await demo.screenshot({ path: path.join(output, 'history-demo-web.jpg'), quality: 82 });
    await ticket.click();
    await demo.waitForURL(/\/history\/\d+/);
    // The Speed tab stays mounted (hidden) behind the stack, so match visible nodes only.
    const chart = demo.locator('[data-testid="recent-pass-bars"]:visible');
    await chart.waitFor();
    await demo.waitForTimeout(800);
    evidence.chartLabel = await chart.getAttribute('aria-label');
    evidence.fastestRow = await demo.getByRole('link', { name: /, fastest$/ }).first().getAttribute('aria-label');
    await demo.screenshot({ path: path.join(output, 'history-detail-web.png') });
    await demo.getByRole('link', { name: /^Pass 1,/ }).click();
    await demo.waitForURL(/\/garage\//);
    evidence.passRoute = new URL(demo.url()).pathname;

    evidence.errors = errors;
    assert.deepEqual(errors, []);
    await fs.writeFile(path.join(output, 'browser-checks.json'), JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify(evidence, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
