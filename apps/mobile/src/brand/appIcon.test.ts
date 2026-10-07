/**
 * Probes the shipped icon PNGs (SPEC §5, RL-16): the iOS icon must be 1024²,
 * opaque with no alpha channel, and full-bleed (no rounded corners). Byte-exact
 * regeneration is checked by `npm run assets:images -- --check`, not here, as
 * rasteriser SIMD paths may differ across CI architectures.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

const images = join(__dirname, '../../assets/images');

function readPng(name: string) {
  const buf = readFileSync(join(images, name));
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let offset = 8;
  let header: { width: number; height: number; depth: number; colorType: number } | null = null;
  const idat: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = { width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], colorType: data[9] };
    if (type === 'IDAT') idat.push(data);
    offset += 12 + length;
  }
  return { header: header!, raw: inflateSync(Buffer.concat(idat)) };
}

describe('iOS app icon', () => {
  const { header, raw } = readPng('icon.png');
  it('is 1024 × 1024, 8-bit RGB with no alpha channel', () => {
    expect(header).toEqual({ width: 1024, height: 1024, depth: 8, colorType: 2 });
  });
  it('is full-bleed: every corner pixel is opaque asphalt or artwork, never a mask', () => {
    const stride = 1 + 1024 * 3;
    const pixel = (x: number, y: number) => {
      expect(raw[y * stride]).toBe(0); // the exporter writes unfiltered rows
      const i = y * stride + 1 + x * 3;
      return [raw[i], raw[i + 1], raw[i + 2]];
    };
    // Top corners sit on the asphalt ground; the track runs off the bottom-left.
    expect(pixel(0, 0)).toEqual([0x07, 0x09, 0x0f]);
    expect(pixel(1023, 0)).toEqual([0x07, 0x09, 0x0f]);
    expect(pixel(1023, 1023)).toEqual([0x07, 0x09, 0x0f]);
    expect(pixel(0, 1023)).not.toEqual([255, 255, 255]);
  });
});

describe('Android adaptive icon and favicon', () => {
  it('foreground and monochrome keep transparency; background is opaque', () => {
    expect(readPng('android-icon-foreground.png').header.colorType).toBe(6);
    expect(readPng('android-icon-monochrome.png').header.colorType).toBe(6);
    expect(readPng('android-icon-background.png').header).toMatchObject({ width: 1024, colorType: 2 });
  });
  it('favicon is 48 px from the same master', () => {
    expect(readPng('favicon.png').header).toMatchObject({ width: 48, height: 48 });
  });
});
