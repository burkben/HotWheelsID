/** `undefined` means no start snapshot; `null` means a known first race. */
export function raceRecord(bestLap: number, previousBest: number | null | undefined) {
  const valid = Number.isFinite(bestLap) && bestLap > 0;
  const beat = valid && previousBest != null && Number.isFinite(previousBest) && previousBest > bestLap;
  return { isRecord: valid && (previousBest === null || beat), improvement: beat ? previousBest - bestLap : null };
}
