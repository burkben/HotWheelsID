/**
 * Sizing for the TV stage.
 *
 * A TV is viewed from ten feet, not ten inches, and the panel can be anything
 * from a 720p AirPlay session to a 4K display reporting 1920x1080 points. So
 * nothing on the stage is a fixed pt value — every size is derived from the
 * window here, which keeps the arithmetic testable under Node (`TvStage` itself
 * is hook-bound and can't be unit-mounted; see `src/test/reactNativeStub.ts`).
 */

/** What a real external display reports when we can't measure one yet. */
export const TV_FALLBACK_WIDTH = 1280;
export const TV_FALLBACK_HEIGHT = 720;

/**
 * Consumer TVs still overscan, cropping roughly 2.5–5% off each edge. Content
 * inside this fraction of the frame is safe on every panel.
 */
export const TITLE_SAFE_FRACTION = 0.035;

export interface TvScale {
  readonly width: number;
  readonly height: number;
  /** Title-safe padding around the whole stage. */
  readonly inset: number;
  /** Speedometer diameter. */
  readonly gauge: number;
  /** The one enormous number (lap clock, finish time). */
  readonly hero: number;
  readonly title: number;
  readonly stat: number;
  readonly label: number;
  readonly gap: number;
  readonly pad: number;
  readonly dot: number;
  /** Car photo width in the side column. */
  readonly photo: number;
  /** How many list rows fit in a side card without scrolling. */
  readonly rows: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveTvScale(width: number, height: number): TvScale {
  const w = Number.isFinite(width) && width > 0 ? width : TV_FALLBACK_WIDTH;
  const h = Number.isFinite(height) && height > 0 ? height : TV_FALLBACK_HEIGHT;
  const short = Math.min(w, h);

  const label = clamp(Math.round(h * 0.024), 12, 30);
  const stat = clamp(Math.round(h * 0.038), 18, 48);

  return {
    width: w,
    height: h,
    inset: Math.round(short * TITLE_SAFE_FRACTION) + 12,
    // Bounded by height so the gauge never crowds the side column, and by width
    // so it doesn't overflow a short-but-wide 21:9 panel.
    gauge: clamp(Math.round(Math.min(h * 0.62, w * 0.36)), 220, 620),
    hero: clamp(Math.round(h * 0.17), 56, 220),
    title: clamp(Math.round(h * 0.046), 18, 60),
    stat,
    label,
    gap: clamp(Math.round(short * 0.022), 12, 40),
    pad: clamp(Math.round(short * 0.02), 10, 32),
    dot: clamp(Math.round(label * 0.7), 8, 20),
    photo: clamp(Math.round(w * 0.15), 110, 340),
    // Each row is roughly two label-lines tall; keep a couple of cards' worth on
    // screen rather than letting a long race push the standings off the bottom.
    rows: clamp(Math.floor(h / (stat * 6)), 3, 8),
  };
}
