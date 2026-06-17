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
import type { RaceResult } from "../../race/raceEngine";

export interface RaceRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Every persisted result; the store ranks + caps them for the leaderboard. */
  loadResults(): Promise<RaceResult[]>;
  /** Append one finished race. */
  saveResult(result: RaceResult): Promise<void>;
  /** Remove all persisted results (mirrors clearing the leaderboard). */
  clear(): Promise<void>;
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

  async clear(): Promise<void> {
    this.results = [];
  }
}
