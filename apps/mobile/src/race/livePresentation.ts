import type { Pass } from '@/store/portalStore';
import type { RaceState } from './raceEngine';

export function formatRaceClock(seconds: number, total = false): string {
  'worklet';
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (!total) return safe.toFixed(2);
  const ms = Math.floor(safe * 1000);
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
export function fastestReference(laps: readonly number[], carBest: number | null): number | null {
  const valid = laps.filter(value => Number.isFinite(value) && value > 0);
  return valid.length ? Math.min(...valid) : carBest != null && Number.isFinite(carBest) && carBest > 0 ? carBest : null;
}
/** Only complete, unambiguous, timestamp + car matches can expose the column. */
export function lapGateSpeeds(race: Pick<RaceState, 'lastGateAt' | 'lapTimes' | 'carUid'>, passes: readonly Pass[]): readonly number[] | null {
  if (!race.carUid || race.lastGateAt == null || !race.lapTimes.length || race.lapTimes.some(lap => !Number.isFinite(lap) || lap <= 0)) return null;
  let at = race.lastGateAt - race.lapTimes.reduce((sum, lap) => sum + lap * 1000, 0);
  const speeds: number[] = [];
  for (const lap of race.lapTimes) {
    at += lap * 1000;
    const matched = passes.filter(pass => pass.uid === race.carUid && Math.abs(pass.at - at) < 1 && Number.isFinite(pass.scaleMph) && pass.scaleMph > 0);
    if (matched.length !== 1) return null;
    speeds.push(matched[0].scaleMph);
  }
  return speeds;
}
