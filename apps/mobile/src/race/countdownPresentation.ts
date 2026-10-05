import type { RaceResult } from './raceEngine';

export function countdownLights(count: number) {
  const digit = Number.isFinite(count) ? Math.max(0, Math.min(3, Math.ceil(count))) : 3;
  return { digit: digit === 0 ? 'GO' : String(digit), lit: digit === 0 ? 3 : 4 - digit, go: digit === 0 };
}

/** Known best for this player/car pairing; absent history is not a sample time. */
export function countdownBestLap(results: readonly RaceResult[], player: string, carUid: string | null): number | null {
  if (!carUid) return null;
  const times = results.filter(result => result.player === player && result.carUid === carUid && Number.isFinite(result.bestLap) && result.bestLap > 0).map(result => result.bestLap);
  return times.length ? Math.min(...times) : null;
}
