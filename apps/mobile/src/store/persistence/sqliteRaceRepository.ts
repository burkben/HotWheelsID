/**
 * `expo-sqlite` implementation of {@link RaceRepository} (ADR-0006).
 *
 * This is the single native seam for race persistence. It is imported only by
 * the app bootstrap (`initRacePersistence` → `_layout.tsx`); the store and the
 * vitest suite never reach it, so they stay runnable under plain Node.
 *
 * Schema is a forward-compatible slice of the ADR-0006 design: a `race_results`
 * table today, leaving room for `cars` / `sessions` / `passes` to join it as
 * Garage and History land in later Phase 3 increments.
 */
import * as SQLite from "expo-sqlite";

import type { RaceResult } from "../../race/raceEngine";
import type { RaceRepository } from "./raceRepository";

const DB_NAME = "redlineid.db";

interface RaceResultRow {
  finished_at: number;
  player: string;
  car_uid: string;
  lap_count: number;
  total_time: number;
  best_lap: number;
  best_lap_num: number;
  worst_lap: number;
  worst_lap_num: number;
  avg_lap: number;
  lap_times: string;
}

function rowToResult(row: RaceResultRow): RaceResult {
  let lapTimes: number[] = [];
  try {
    const parsed = JSON.parse(row.lap_times);
    if (Array.isArray(parsed)) lapTimes = parsed.map(Number);
  } catch {
    lapTimes = [];
  }
  return {
    player: row.player,
    carUid: row.car_uid,
    lapCount: row.lap_count,
    lapTimes,
    totalTime: row.total_time,
    bestLap: row.best_lap,
    bestLapNum: row.best_lap_num,
    worstLap: row.worst_lap,
    worstLapNum: row.worst_lap_num,
    avgLap: row.avg_lap,
    finishedAt: row.finished_at,
  };
}

export class SqliteRaceRepository implements RaceRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS race_results (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        finished_at  INTEGER NOT NULL,
        player       TEXT    NOT NULL,
        car_uid      TEXT    NOT NULL,
        lap_count    INTEGER NOT NULL,
        total_time   REAL    NOT NULL,
        best_lap     REAL    NOT NULL,
        best_lap_num INTEGER NOT NULL,
        worst_lap    REAL    NOT NULL,
        worst_lap_num INTEGER NOT NULL,
        avg_lap      REAL    NOT NULL,
        lap_times    TEXT    NOT NULL
      );
    `);
    this.db = db;
  }

  private requireDb(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error("SqliteRaceRepository.init() not called");
    return this.db;
  }

  async loadResults(): Promise<RaceResult[]> {
    const rows = await this.requireDb().getAllAsync<RaceResultRow>(
      `SELECT finished_at, player, car_uid, lap_count, total_time, best_lap,
              best_lap_num, worst_lap, worst_lap_num, avg_lap, lap_times
         FROM race_results
        ORDER BY total_time ASC`,
    );
    return rows.map(rowToResult);
  }

  async saveResult(result: RaceResult): Promise<void> {
    await this.requireDb().runAsync(
      `INSERT INTO race_results
         (finished_at, player, car_uid, lap_count, total_time, best_lap,
          best_lap_num, worst_lap, worst_lap_num, avg_lap, lap_times)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      result.finishedAt,
      result.player,
      result.carUid,
      result.lapCount,
      result.totalTime,
      result.bestLap,
      result.bestLapNum,
      result.worstLap,
      result.worstLapNum,
      result.avgLap,
      JSON.stringify(result.lapTimes),
    );
  }

  async clear(): Promise<void> {
    await this.requireDb().execAsync("DELETE FROM race_results;");
  }
}
