/**
 * Responsive layout resolution — one place that decides what a given window size
 * means for the UI.
 *
 * The app shipped as a phone-shaped single column: every screen centered a
 * ~420pt stack and iPad users got a stretched iPhone. Rather than sprinkle
 * `Platform.isPad` checks around, screens ask for a {@link Layout} and switch on
 * *shape* — how much room they actually have — so a Split View iPad, a rotated
 * iPad, and a phone all fall out of the same rule set.
 *
 * Deliberately driven by the **window**, not the device: iPadOS Split View and
 * Stage Manager hand an app an arbitrary-width window, and a half-width iPad
 * should read like a phone. `useWindowDimensions()` re-renders on every one of
 * those changes, which a device check would miss.
 */

/**
 * Point width at/above which a window is roomy enough for side-by-side panes.
 *
 * 900pt clears a portrait iPad mini (744pt) and a 1/2 Split View slice on an
 * 11" iPad (~507pt), while any landscape iPad (>=1024pt) and a portrait 13" iPad
 * (1032pt) qualify. In other words: two panes only when there is genuinely room
 * for two, not merely because the app is running on tablet hardware.
 */
export const TWO_PANE_MIN_WIDTH = 900;

/** Below this the window is phone-shaped, whatever hardware it is running on. */
export const TABLET_MIN_WIDTH = 700;

/** How screens should arrange their primary content. */
export type PaneMode = "single" | "split";

export interface Layout {
  readonly width: number;
  readonly height: number;
  /** The window (not the device) is tablet-sized. */
  readonly isTablet: boolean;
  readonly isLandscape: boolean;
  /** `split` when there is room to run two panes side by side. */
  readonly pane: PaneMode;
  /** Convenience for `pane === "split"`. */
  readonly isSplit: boolean;
  /** Hero gauge diameter for this window. */
  readonly gaugeSize: number;
  /** Max width of a single column of content, so text never runs edge to edge. */
  readonly contentMaxWidth: number;
  /** Column count for card grids (Garage, History). */
  readonly columns: number;
  /** Horizontal screen padding in points. */
  readonly gutter: number;
}

/**
 * Pure window-size to layout mapping. Kept free of React and React Native so the
 * breakpoints are directly testable; {@link useLayout} is the thin hook over it.
 */
export function resolveLayout(width: number, height: number): Layout {
  const w = Number.isFinite(width) && width > 0 ? width : 0;
  const h = Number.isFinite(height) && height > 0 ? height : 0;

  const isTablet = w >= TABLET_MIN_WIDTH;
  const isLandscape = w > h;
  const pane: PaneMode = w >= TWO_PANE_MIN_WIDTH ? "split" : "single";
  const isSplit = pane === "split";

  return {
    width: w,
    height: h,
    isTablet,
    isLandscape,
    pane,
    isSplit,
    gaugeSize: gaugeSizeFor(w, h, isSplit),
    contentMaxWidth: isTablet ? 620 : 420,
    columns: columnsFor(w),
    gutter: isTablet ? 32 : 20,
  };
}

/**
 * The gauge is the hero, so it should grow with the window — but it also has to
 * fit *vertically*, which is the binding constraint in landscape. In split mode
 * it only owns one pane, so it is sized against half the width.
 */
function gaugeSizeFor(width: number, height: number, isSplit: boolean): number {
  if (width === 0 || height === 0) return 300;
  const widthBudget = isSplit ? width * 0.42 : width - 64;
  // Leave room for the header, stat row and controls that share the pane.
  const heightBudget = height * (isSplit ? 0.62 : 0.42);
  return Math.round(clamp(Math.min(widthBudget, heightBudget), 220, 560));
}

function columnsFor(width: number): number {
  if (width >= 1280) return 4;
  if (width >= 900) return 3;
  if (width >= TABLET_MIN_WIDTH) return 2;
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
