// Composite simulator captures into the Redline V1 App Store frames (SPEC §6).
//
//   NODE_PATH=<dir containing playwright> node docs/release/screenshots/render.cjs \
//     --captures <dir> --out <dir> [--sizes iphone-1206x2622,iphone-1320x2868,ipad-2752x2064]
//
// <captures>/iphone/01.png … 06.png  portrait simulator captures, in frame order
// <captures>/ipad/01.png … 06.png    landscape iPad 13" simulator captures
//
// Output: <out>/<size>/<NN>-<slug>.png at exactly the App Store Connect pixel size,
// 8-bit RGB with no alpha channel (App Store Connect rejects transparency).
// Required sizes were checked against App Store Connect's screenshot specifications
// in October 2026; see docs/release/app-store-submission.md.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const zlib = require('node:zlib');
const { chromium } = require('playwright');

const SIZES = {
  // Required: iPhone with Dynamic Island (medium display), e.g. iPhone 17 Pro.
  'iphone-1206x2622': { device: 'iphone', width: 1206, height: 2622 },
  // Optional: 6.9" (large display). Provide it for the sharpest large-phone listing.
  'iphone-1320x2868': { device: 'iphone', width: 1320, height: 2868 },
  // Required because the app supports iPad: 13" display, landscape.
  'ipad-2752x2064': { device: 'ipad', width: 2752, height: 2064 },
};
const FRAME_COUNT = 6;

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
}

/** Re-encode a PNG as 8-bit RGB without alpha; fails if any pixel is not opaque. */
function stripAlpha(png) {
  const chunks = [];
  for (let o = 8; o < png.length;) {
    const len = png.readUInt32BE(o);
    chunks.push({ type: png.toString('ascii', o + 4, o + 8), data: png.subarray(o + 8, o + 8 + len) });
    o += 12 + len;
  }
  const ihdr = chunks.find((c) => c.type === 'IHDR').data;
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const colorType = ihdr[9];
  if (ihdr[8] !== 8 || (colorType !== 2 && colorType !== 6)) throw new Error(`unexpected PNG format ${ihdr[8]}/${colorType}`);
  if (colorType === 2) return { png, width, height };
  const bpp = 4;
  const stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data)));
  const out = Buffer.alloc(height * (1 + width * 3));
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      line[x] = (line[x] + pred) & 0xff;
    }
    const row = y * (1 + width * 3);
    for (let x = 0; x < width; x++) {
      if (line[x * 4 + 3] !== 255) throw new Error(`frame has a transparent pixel at ${x},${y}`);
      line.copy(out, row + 1 + x * 3, x * 4, x * 4 + 3);
    }
    prev = line;
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.from(ihdr); header[9] = 2;
  return {
    png: Buffer.concat([png.subarray(0, 8), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(out, { level: 9 })), chunk('IEND', Buffer.alloc(0))]),
    width,
    height,
  };
}

(async () => {
  const captures = path.resolve(arg('captures', ''));
  const out = path.resolve(arg('out', 'store-screenshots'));
  const sizes = arg('sizes', Object.keys(SIZES).join(',')).split(',');
  if (!arg('captures')) throw new Error('--captures <dir> is required');
  const template = pathToFileURL(path.join(__dirname, 'frames.html')).href;
  const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const results = [];
  try {
    for (const name of sizes) {
      const size = SIZES[name];
      if (!size) throw new Error(`unknown size ${name}; choose from ${Object.keys(SIZES).join(', ')}`);
      fs.mkdirSync(path.join(out, name), { recursive: true });
      const page = await browser.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 1 });
      for (let frame = 1; frame <= FRAME_COUNT; frame++) {
        const nn = String(frame).padStart(2, '0');
        const capture = path.join(captures, size.device, `${nn}.png`);
        if (!fs.existsSync(capture)) throw new Error(`missing capture ${capture}`);
        const hash = new URLSearchParams({ frame, device: size.device, width: size.width, height: size.height, capture: pathToFileURL(capture).href });
        // A distinct query per frame forces a real load; a hash-only change would not re-run the template.
        await page.goto(`${template}?render=${name}-${nn}#${hash}`);
        await page.waitForFunction(() => window.frameReady || window.frameError);
        const failure = await page.evaluate(() => window.frameError);
        if (failure) throw new Error(failure);
        await page.evaluate(() => document.fonts.ready);
        const slug = await page.evaluate((n) => window.FRAMES[n].slug, frame);
        const text = await page.evaluate(() => document.body.innerText);
        if (/hot\s*wheels|mattel/i.test(text)) throw new Error(`frame ${nn} contains a Mattel mark`);
        const { png, width, height } = stripAlpha(await page.screenshot({ type: 'png' }));
        if (width !== size.width || height !== size.height) throw new Error(`frame ${nn} is ${width}×${height}, expected ${size.width}×${size.height}`);
        const file = path.join(out, name, `${nn}-${slug}.png`);
        fs.writeFileSync(file, png);
        results.push(`${path.relative(process.cwd(), file)}  ${width}×${height} RGB`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  console.log(results.join('\n'));
})().catch((e) => { console.error(e.message ?? e); process.exit(1); });
