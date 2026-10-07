import type { Pass } from '@/store/portalStore';

export interface RaceStartSnapshot {
  readonly carUid: string | null;
  readonly previousBest: number | null | undefined;
  readonly at: number;
  readonly lastPassId: number | null;
}

/** Require contiguous coverage from the start snapshot, since the buffer is bounded.
 * A missing anchor (e.g. after disconnect), eviction or unknown car uses AVG LAP.
 */
export function raceTopSpeed(passes: readonly Pass[], start: RaceStartSnapshot | null, finishedAt: number): number | null {
  if (!start?.carUid || start.lastPassId == null || finishedAt < start.at) return null;
  const window = passes.filter(p => p.id > start.lastPassId! && p.at >= start.at && p.at <= finishedAt).sort((a, b) => a.id - b.id);
  if (!window.length || window.some((p, i) => p.id !== start.lastPassId! + i + 1)) return null;
  const speeds = window.filter(p => p.uid === start.carUid).map(p => p.scaleMph);
  return speeds.length && speeds.every(s => Number.isFinite(s) && s > 0) ? Math.max(...speeds) : null;
}

export function lapBarFractions(laps: readonly number[]): number[] {
  const slowest = Math.max(0, ...laps.filter(lap => Number.isFinite(lap) && lap > 0));
  return laps.map(lap => Number.isFinite(lap) && lap > 0 && slowest > 0 ? lap / slowest : 0);
}

/** Timed heats first, ascending; unrun heats retain their bracket order. */
export function rankHeats<T extends { seconds?: number }>(heats: readonly T[]): T[] {
  return [...heats].sort((a, b) => (a.seconds ?? Infinity) - (b.seconds ?? Infinity));
}

/** Chakra tabular digits stay readable within measured cells, including Dynamic Type. */
export function raceNumberSize(text: string, width: number, preferred: number, fontScale = 1): number {
  return Math.min(preferred, Math.max(1, width) / (Math.max(1, text.length) * 0.65 * Math.max(1, Math.min(fontScale, 1.3))));
}
