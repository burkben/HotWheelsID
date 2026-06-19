/**
 * Persistence seam for finished races (ADR-0006, ADR-0012).
 *
 * The Race store keeps an in-memory leaderboard for fast, framework-free
 * rendering; a {@link RaceRepository} is the *only* place durable storage is
 * touched. Keeping the contract here — with a pure {@link InMemoryRaceRepository}
 * fallback — lets the store and tests stay free of native modules. The native
 * `expo-sqlite` implementation lives in `sqliteRaceRepository.ts`, which is
 * imported solely by the app bootstrap (never by the store or unit tests).
 */
import type { RaceAggregate } from "../../achievements/stats";
import type { RaceResult } from "../../race/raceEngine";

export interface RaceRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Every persisted result; the store ranks + caps them for the leaderboard. */
  loadResults(): Promise<RaceResult[]>;
  /** Append one finished race. */
  saveResult(result: RaceResult): Promise<void>;
  /**
   * Lifetime totals across *all* persisted races (not the capped leaderboard),
   * for the achievements engine. One cheap roll-up query on SQLite.
   */
  aggregate(): Promise<RaceAggregate>;
  /** Remove all persisted results (mirrors clearing the leaderboard). */
  clear(): Promise<void>;
}

/** Roll a list of results into the lifetime {@link RaceAggregate} (shared by
 *  the in-memory repo and any other pure caller). */
export function aggregateResults(results: readonly RaceResult[]): RaceAggregate {
  let totalLaps = 0;
  let longestRaceLaps = 0;
  let bestLapSeconds = Infinity;
  let fastestRaceSeconds = Infinity;
  for (const r of results) {
    totalLaps += r.lapCount;
    if (r.lapCount > longestRaceLaps) longestRaceLaps = r.lapCount;
    if (r.bestLap < bestLapSeconds) bestLapSeconds = r.bestLap;
    if (r.totalTime < fastestRaceSeconds) fastestRaceSeconds = r.totalTime;
  }
  return {
    racesFinished: results.length,
    totalLaps,
    longestRaceLaps,
    bestLapSeconds: Number.isFinite(bestLapSeconds) ? bestLapSeconds : null,
    fastestRaceSeconds: Number.isFinite(fastestRaceSeconds)
      ? fastestRaceSeconds
      : null,
  };
}

/**
 * Zero-dependency repository used as the test/CI fallback and whenever the
 * native SQLite module is unavailable (e.g. a dev build that predates this
 * feature). Behaves exactly like the old in-memory-only leaderboard.
 */
export class InMemoryRaceRepository implements RaceRepository {
  private results: RaceResult[] = [];

  async init(): Promise<void> {}

  async loadResults(): Promise<RaceResult[]> {
    return this.results.map((r) => ({ ...r, lapTimes: [...r.lapTimes] }));
  }

  async saveResult(result: RaceResult): Promise<void> {
    this.results.push({ ...result, lapTimes: [...result.lapTimes] });
  }

  async aggregate(): Promise<RaceAggregate> {
    return aggregateResults(this.results);
  }

  async clear(): Promise<void> {
    this.results = [];
  }
}
