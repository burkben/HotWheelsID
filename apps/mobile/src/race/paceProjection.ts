/** Presentation-only pace estimates. No marker represents a measured position. */
export const RACE_TRACK_PATH = 'M70 30 H270 C310 30 335 55 320 92 L290 160 C278 186 240 190 222 166 L196 132 C184 116 162 116 150 132 L124 166 C106 190 66 186 52 160 L30 110 C14 70 34 30 70 30 Z';
export type TrackPoint = { x: number; y: number };
export const PORTAL_GATE: TrackPoint = { x: 170, y: 30 };

export function wrapFraction(fraction: number): number {
  'worklet';
  return Number.isFinite(fraction) ? ((fraction % 1) + 1) % 1 : 0;
}
export function paceFraction(elapsed: number, reference: number | null) {
  'worklet';
  if (reference == null || !Number.isFinite(reference) || reference <= 0 || !Number.isFinite(elapsed)) return null;
  const fraction = Math.max(0, elapsed) / reference;
  return { fraction: wrapFraction(fraction), progress: Math.min(1, fraction), overflow: fraction >= 1 };
}

/** Sample the source's line/cubic segments once, then resample by arc length. */
function trackPolyline(): readonly TrackPoint[] {
  const dense: TrackPoint[] = [{ x: 70, y: 30 }];
  const line = (x: number, y: number) => dense.push({ x, y });
  const cubic = (x1: number, y1: number, x2: number, y2: number, x: number, y: number) => {
    const start = dense[dense.length - 1];
    for (let i = 1; i <= 100; i += 1) {
      const t = i / 100, u = 1 - t;
      dense.push({ x: u ** 3 * start.x + 3 * u ** 2 * t * x1 + 3 * u * t ** 2 * x2 + t ** 3 * x, y: u ** 3 * start.y + 3 * u ** 2 * t * y1 + 3 * u * t ** 2 * y2 + t ** 3 * y });
    }
  };
  line(270, 30); cubic(310, 30, 335, 55, 320, 92); line(290, 160);
  cubic(278, 186, 240, 190, 222, 166); line(196, 132);
  cubic(184, 116, 162, 116, 150, 132); line(124, 166);
  cubic(106, 190, 66, 186, 52, 160); line(30, 110); cubic(14, 70, 34, 30, 70, 30);
  const distances = [0];
  for (let i = 1; i < dense.length; i += 1) distances.push(distances[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  const length = distances[distances.length - 1];
  return Array.from({ length: 201 }, (_, index) => {
    // The source path begins 100 pt before the gate on its top straight.
    const distance = (100 + index / 200 * length) % length;
    const end = distances.findIndex(value => value >= distance);
    if (end === 0) return dense[0];
    const fraction = (distance - distances[end - 1]) / (distances[end] - distances[end - 1]);
    return { x: dense[end - 1].x + fraction * (dense[end].x - dense[end - 1].x), y: dense[end - 1].y + fraction * (dense[end].y - dense[end - 1].y) };
  });
}
export const RACE_TRACK_POINTS = trackPolyline();
export function pointOnTrack(fraction: number): TrackPoint {
  'worklet';
  const position = wrapFraction(fraction) * (RACE_TRACK_POINTS.length - 1);
  const start = Math.floor(position), t = position - start;
  const a = RACE_TRACK_POINTS[start], b = RACE_TRACK_POINTS[start + 1];
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}
export function projectPace(elapsed: number, reference: number | null) {
  'worklet';
  const pace = paceFraction(elapsed, reference);
  return pace ? { ...pace, ...(pace.overflow ? PORTAL_GATE : pointOnTrack(pace.fraction)) } : null;
}
