/**
 * Aggregate signals that drive {@link ./catalog Achievements}.
 *
 * Achievements are evaluated against a small, flat {@link AchievementStats}
 * snapshot rather than raw rows, so the engine stays pure and the data sources
 * (durable race history + the garage collection) can evolve independently. The
 * race portion is produced by `RaceRepository.aggregate()` (a single SQL query
 * over the durable `race_results` table — lifetime totals, not the capped
 * leaderboard); the garage portion is derived from the in-memory car list.
 */
import type { CarRecord } from "../store/persistence/carRepository";

/** Lifetime racing totals, computed from the durable `race_results` table. */
export interface RaceAggregate {
  /** Number of finished races ever recorded. */
  racesFinished: number;
  /** Sum of every finished race's lap count. */
  totalLaps: number;
  /** Most laps in any single finished race. */
  longestRaceLaps: number;
  /** Fastest single lap across all races, in seconds (null = no races yet). */
  bestLapSeconds: number | null;
  /** Fastest full-race total time, in seconds (null = no races yet). */
  fastestRaceSeconds: number | null;
}

/** Collection totals, derived from the garage car list. */
export interface GarageAggregate {
  /** Distinct cars ever detected on the portal. */
  carsCollected: number;
  /** Highest speed ever seen, in "scale mph" (0 = none yet). */
  topSpeedMph: number;
}

/** The full snapshot the achievements engine evaluates against. */
export interface AchievementStats extends RaceAggregate, GarageAggregate {}

/** Numeric fields of {@link AchievementStats} an achievement can target. */
export type AchievementMetric = keyof AchievementStats;

/** A zeroed snapshot — the pre-hydration / no-data baseline. */
export function emptyStats(): AchievementStats {
  return {
    racesFinished: 0,
    totalLaps: 0,
    longestRaceLaps: 0,
    bestLapSeconds: null,
    fastestRaceSeconds: null,
    carsCollected: 0,
    topSpeedMph: 0,
  };
}

/** Derive collection totals from the garage car list (pure). */
export function garageAggregate(cars: readonly CarRecord[]): GarageAggregate {
  let topSpeedMph = 0;
  for (const car of cars) {
    if (car.bestMph > topSpeedMph) topSpeedMph = car.bestMph;
  }
  return { carsCollected: cars.length, topSpeedMph };
}

/** Merge the durable race totals with the live garage totals. */
export function combineStats(
  race: RaceAggregate,
  garage: GarageAggregate,
): AchievementStats {
  return {
    racesFinished: race.racesFinished,
    totalLaps: race.totalLaps,
    longestRaceLaps: race.longestRaceLaps,
    bestLapSeconds: race.bestLapSeconds,
    fastestRaceSeconds: race.fastestRaceSeconds,
    carsCollected: garage.carsCollected,
    topSpeedMph: garage.topSpeedMph,
  };
}
