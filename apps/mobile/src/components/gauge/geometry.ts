/**
 * Pure geometry helpers for the SVG speedometer dial.
 *
 * Framework-free and side-effect-free so the math can be reasoned about (and
 * unit-tested) independently of rendering. Angles are measured in **degrees,
 * clockwise from 12 o'clock** (the intuitive convention for a gauge): 0° points
 * up, 90° points right, 180° points down, −90°/270° points left.
 *
 * The dial sweeps a 270° arc from the lower-left (−135°) clockwise over the top
 * to the lower-right (+135°), leaving a 90° gap at the bottom.
 */

export const GAUGE_START_ANGLE = -135;
export const GAUGE_END_ANGLE = 135;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Convert a polar coordinate (clockwise-from-top degrees) to SVG x/y. */
export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): Point {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/**
 * Build an SVG arc `d` path from `startAngle` to `endAngle` (clockwise).
 * Used for the track and each colored speed zone.
 */
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  // sweep flag 1 == clockwise in SVG's (y-down) coordinate space.
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Clamp a speed value into [0, max]. */
export function clampValue(value: number, max: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

/** Map a speed value to its needle angle along the 270° sweep. */
export function valueToAngle(
  value: number,
  max: number,
  startAngle: number = GAUGE_START_ANGLE,
  endAngle: number = GAUGE_END_ANGLE,
): number {
  const fraction = clampValue(value, max) / max;
  return startAngle + fraction * (endAngle - startAngle);
}

export interface Tick {
  readonly value: number;
  readonly angle: number;
  /** Outer/inner endpoints of the tick mark. */
  readonly outer: Point;
  readonly inner: Point;
  /** Anchor point for the numeric label. */
  readonly label: Point;
}

/**
 * Generate evenly spaced major ticks (with labels) from 0..max at `step`.
 */
export function makeTicks(
  cx: number,
  cy: number,
  r: number,
  max: number,
  step: number,
  tickLength = 10,
  labelGap = 18,
): Tick[] {
  const ticks: Tick[] = [];
  for (let value = 0; value <= max; value += step) {
    const angle = valueToAngle(value, max);
    ticks.push({
      value,
      angle,
      outer: polarToCartesian(cx, cy, r, angle),
      inner: polarToCartesian(cx, cy, r - tickLength, angle),
      label: polarToCartesian(cx, cy, r - labelGap, angle),
    });
  }
  return ticks;
}
