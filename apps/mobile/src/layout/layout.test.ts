import { describe, expect, it } from "vitest";

import { resolveLayout, TABLET_MIN_WIDTH, TWO_PANE_MIN_WIDTH } from "./layout";

/** Real window sizes, in points, as reported by `useWindowDimensions()`. */
const IPHONE_17_PORTRAIT = { w: 402, h: 874 };
const IPHONE_17_LANDSCAPE = { w: 874, h: 402 };
const IPAD_MINI_PORTRAIT = { w: 744, h: 1133 };
const IPAD_MINI_LANDSCAPE = { w: 1133, h: 744 };
const IPAD_11_PORTRAIT = { w: 834, h: 1210 };
const IPAD_11_LANDSCAPE = { w: 1210, h: 834 };
const IPAD_13_PORTRAIT = { w: 1032, h: 1376 };
const IPAD_13_LANDSCAPE = { w: 1376, h: 1032 };
/** An 11" iPad running the app in a half-width Split View slice. */
const IPAD_SPLIT_HALF = { w: 507, h: 1210 };

describe("resolveLayout panes", () => {
  it("keeps a phone in a single column in both orientations", () => {
    expect(resolveLayout(IPHONE_17_PORTRAIT.w, IPHONE_17_PORTRAIT.h).pane).toBe("single");
    expect(resolveLayout(IPHONE_17_LANDSCAPE.w, IPHONE_17_LANDSCAPE.h).pane).toBe("single");
  });

  it("splits every landscape iPad, which is how iPads are usually held", () => {
    for (const size of [IPAD_MINI_LANDSCAPE, IPAD_11_LANDSCAPE, IPAD_13_LANDSCAPE]) {
      const layout = resolveLayout(size.w, size.h);
      expect(layout.pane, `${size.w}x${size.h}`).toBe("split");
      expect(layout.isLandscape).toBe(true);
    }
  });

  it("keeps narrower portrait iPads single-column but splits the 13-inch", () => {
    // A portrait iPad is tall and narrow; two panes would squeeze both. The 13"
    // is wide enough (1032pt) that side-by-side still reads well.
    expect(resolveLayout(IPAD_MINI_PORTRAIT.w, IPAD_MINI_PORTRAIT.h).pane).toBe("single");
    expect(resolveLayout(IPAD_11_PORTRAIT.w, IPAD_11_PORTRAIT.h).pane).toBe("single");
    expect(resolveLayout(IPAD_13_PORTRAIT.w, IPAD_13_PORTRAIT.h).pane).toBe("split");
  });

  it("treats a half-width Split View slice as a phone", () => {
    // Layout follows the *window*, not the hardware, so a narrow slice on iPad
    // gets the phone layout instead of two cramped panes.
    const layout = resolveLayout(IPAD_SPLIT_HALF.w, IPAD_SPLIT_HALF.h);
    expect(layout.pane).toBe("single");
    expect(layout.isTablet).toBe(false);
  });

  it("switches exactly at the documented breakpoints", () => {
    expect(resolveLayout(TWO_PANE_MIN_WIDTH - 1, 1000).isSplit).toBe(false);
    expect(resolveLayout(TWO_PANE_MIN_WIDTH, 1000).isSplit).toBe(true);
    expect(resolveLayout(TABLET_MIN_WIDTH - 1, 1000).isTablet).toBe(false);
    expect(resolveLayout(TABLET_MIN_WIDTH, 1000).isTablet).toBe(true);
  });
});

describe("resolveLayout gauge sizing", () => {
  it("grows the gauge on iPad without letting it overflow the window", () => {
    const phone = resolveLayout(IPHONE_17_PORTRAIT.w, IPHONE_17_PORTRAIT.h);
    const pad = resolveLayout(IPAD_11_LANDSCAPE.w, IPAD_11_LANDSCAPE.h);
    expect(pad.gaugeSize).toBeGreaterThan(phone.gaugeSize);
    expect(pad.gaugeSize).toBeLessThanOrEqual(IPAD_11_LANDSCAPE.h);
  });

  it("never exceeds the pane it has to fit inside", () => {
    for (const size of [
      IPHONE_17_PORTRAIT,
      IPHONE_17_LANDSCAPE,
      IPAD_MINI_PORTRAIT,
      IPAD_MINI_LANDSCAPE,
      IPAD_11_PORTRAIT,
      IPAD_11_LANDSCAPE,
      IPAD_13_PORTRAIT,
      IPAD_13_LANDSCAPE,
      IPAD_SPLIT_HALF,
    ]) {
      const layout = resolveLayout(size.w, size.h);
      const paneWidth = layout.isSplit ? size.w / 2 : size.w;
      expect(layout.gaugeSize, `${size.w}x${size.h} width`).toBeLessThanOrEqual(paneWidth);
      expect(layout.gaugeSize, `${size.w}x${size.h} height`).toBeLessThanOrEqual(size.h);
    }
  });

  it("stays within its clamp on absurd windows", () => {
    expect(resolveLayout(4000, 4000).gaugeSize).toBe(560);
    expect(resolveLayout(200, 200).gaugeSize).toBe(220);
  });

  it("falls back to the phone default before the window is measured", () => {
    // React Native reports 0x0 for a frame or two on some launches; the gauge
    // must still get a usable size rather than collapsing to nothing.
    expect(resolveLayout(0, 0).gaugeSize).toBe(300);
    expect(resolveLayout(Number.NaN, Number.NaN).gaugeSize).toBe(300);
  });
});

describe("resolveLayout grids", () => {
  it("adds columns as the window widens", () => {
    expect(resolveLayout(IPHONE_17_PORTRAIT.w, IPHONE_17_PORTRAIT.h).columns).toBe(1);
    expect(resolveLayout(IPAD_MINI_PORTRAIT.w, IPAD_MINI_PORTRAIT.h).columns).toBe(2);
    expect(resolveLayout(IPAD_11_LANDSCAPE.w, IPAD_11_LANDSCAPE.h).columns).toBe(3);
    expect(resolveLayout(IPAD_13_LANDSCAPE.w, IPAD_13_LANDSCAPE.h).columns).toBe(4);
  });

  it("widens the reading column and gutters on tablets", () => {
    const phone = resolveLayout(IPHONE_17_PORTRAIT.w, IPHONE_17_PORTRAIT.h);
    const pad = resolveLayout(IPAD_11_PORTRAIT.w, IPAD_11_PORTRAIT.h);
    expect(pad.contentMaxWidth).toBeGreaterThan(phone.contentMaxWidth);
    expect(pad.gutter).toBeGreaterThan(phone.gutter);
  });
});
