// Rasterise the committed SVG masters in assets/images to PNG with resvg.
// Deterministic: the same SVG and resvg version produce identical bytes.
//   npm run assets:images --workspace mobile          (write PNGs)
//   npm run assets:images --workspace mobile -- --check (fail if a PNG is stale)
//
// resvg always writes RGBA. Opaque targets (the iOS icon, Android background) are
// re-encoded here as 8-bit RGB with no alpha channel, as App Store Connect requires.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';
import { Resvg } from '@resvg/resvg-js';

const images = join(dirname(fileURLToPath(import.meta.url)), '../assets/images');

/** svg → png at a square pixel size. `opaque` drops the alpha channel. */
export const TARGETS = [
  { svg: 'icon.svg', png: 'icon.png', size: 1024, opaque: true },
  { svg: 'android-icon-foreground.svg', png: 'android-icon-foreground.png', size: 1024 },
  { svg: 'android-icon-background.svg', png: 'android-icon-background.png', size: 1024, opaque: true },
  { svg: 'android-icon-monochrome.svg', png: 'android-icon-monochrome.png', size: 1024 },
  { svg: 'favicon.svg', png: 'favicon.png', size: 48 },
  { svg: 'splash-icon.svg', png: 'splash-icon.png', size: 1024 },
];

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([length, body, crc]);
}

/** Minimal PNG encoder: 8-bit RGB, filter 0 on every row, one IDAT. */
export function encodeRgbPng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    const row = y * (1 + width * 3);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = row + 1 + x * 3;
      if (rgba[src + 3] !== 255) throw new Error(`opaque target has alpha ${rgba[src + 3]} at ${x},${y}`);
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour, no alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function render({ svg, size, opaque = false }) {
  const resvg = new Resvg(readFileSync(join(images, svg)), {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  });
  const image = resvg.render();
  return opaque ? encodeRgbPng(image.width, image.height, image.pixels) : image.asPng();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const target of TARGETS) {
    const png = render(target);
    const out = join(images, target.png);
    if (check) {
      let same = false;
      try { same = Buffer.compare(readFileSync(out), png) === 0; } catch { /* missing */ }
      if (!same) stale += 1;
      console.log(`${same ? 'ok   ' : 'STALE'} ${target.png}`);
    } else {
      writeFileSync(out, png);
      console.log(`wrote ${target.png} (${target.size}×${target.size}${target.opaque ? ', RGB' : ''}, ${png.length} bytes)`);
    }
  }
  if (stale) process.exit(1);
}
