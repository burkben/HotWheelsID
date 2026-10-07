import type { CarRecord } from '@/store/persistence/carRepository';

/**
 * A car's place in the garage by best speed (SPEC §4.8 "GARAGE #n"). Ties share a
 * place (247, 247, 231 → 1, 1, 3). Cars without a recorded speed are unranked.
 */
export function garageRank(cars: readonly Pick<CarRecord, 'uid' | 'bestMph'>[], uid: string): number | null {
  const car = cars.find((c) => c.uid === uid);
  if (!car || !(car.bestMph > 0)) return null;
  return 1 + cars.filter((c) => c.bestMph > car.bestMph).length;
}

/** Only the top three earn the caution tag. */
export function garageRankTag(rank: number | null): string | null {
  return rank != null && rank <= 3 ? `GARAGE #${rank}` : null;
}

/** Fill of the 240° mini arc: best speed over the gauge's full scale, clamped. */
export function bestArcFraction(bestMph: number, maxMph: number): number {
  if (!(bestMph > 0) || !(maxMph > 0)) return 0;
  return Math.min(1, bestMph / maxMph);
}
