import { describe, expect, it } from "vitest";

import {
  resolveTvScale,
  TITLE_SAFE_FRACTION,
  TV_FALLBACK_HEIGHT,
  TV_FALLBACK_WIDTH,
} from "./tvScale";

describe("resolveTvScale", () => {
  it("falls back to 720p when the window hasn't been measured", () => {
    const zero = resolveTvScale(0, 0);
    expect(zero.width).toBe(TV_FALLBACK_WIDTH);
    expect(zero.height).toBe(TV_FALLBACK_HEIGHT);
    expect(resolveTvScale(NaN, NaN)).toEqual(zero);
  });

  it("keeps everything inside the title-safe area", () => {
    const scale = resolveTvScale(1920, 1080);
    expect(scale.inset).toBeGreaterThanOrEqual(Math.round(1080 * TITLE_SAFE_FRACTION));
    // Gauge plus both insets has to fit the frame with room for the side column.
    expect(scale.gauge + scale.inset * 2).toBeLessThan(1080);
  });

  it("scales type up with the panel", () => {
    const small = resolveTvScale(1280, 720);
    const big = resolveTvScale(1920, 1080);
    expect(big.hero).toBeGreaterThan(small.hero);
    expect(big.stat).toBeGreaterThan(small.stat);
    expect(big.gauge).toBeGreaterThan(small.gauge);
  });

  it("keeps the gauge from swallowing a short, ultra-wide panel", () => {
    const ultrawide = resolveTvScale(2560, 720);
    expect(ultrawide.gauge).toBeLessThanOrEqual(Math.round(720 * 0.62));
  });

  it("clamps rather than exploding on an 8K display", () => {
    const huge = resolveTvScale(7680, 4320);
    expect(huge.gauge).toBe(620);
    expect(huge.hero).toBe(220);
    expect(huge.rows).toBeLessThanOrEqual(8);
  });

  it("stays legible on a small mirrored window", () => {
    const tiny = resolveTvScale(480, 320);
    expect(tiny.label).toBeGreaterThanOrEqual(12);
    expect(tiny.gauge).toBeGreaterThanOrEqual(220);
    expect(tiny.rows).toBeGreaterThanOrEqual(3);
  });
});
