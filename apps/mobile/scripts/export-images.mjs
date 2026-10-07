// Rasterise the committed SVG masters in assets/images to PNG with resvg.
// Deterministic: the same SVG and resvg version produce identical bytes.
//   npm run assets:images --workspace mobile          (write PNGs)
//   npm run assets:images --workspace mobile -- --check (fail if a PNG is stale)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const images = join(dirname(fileURLToPath(import.meta.url)), '../assets/images');

/** svg → png at a square pixel size. `background` makes the output opaque. */
export const TARGETS = [
  { svg: 'splash-icon.svg', png: 'splash-icon.png', size: 1024 },
];

export function render({ svg, size, background }) {
  const resvg = new Resvg(readFileSync(join(images, svg)), {
    fitTo: { mode: 'width', value: size },
    background,
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const target of TARGETS) {
    const png = render(target);
    const out = join(images, target.png);
    if (check) {
      const same = Buffer.compare(readFileSync(out), png) === 0;
      if (!same) stale += 1;
      console.log(`${same ? 'ok   ' : 'STALE'} ${target.png}`);
    } else {
      writeFileSync(out, png);
      console.log(`wrote ${target.png} (${target.size}×${target.size}, ${png.length} bytes)`);
    }
  }
  if (stale) process.exit(1);
}
