/**
 * `expo-sqlite` implementation of {@link RaceRepository} (ADR-0006).
 *
 * It operates on a shared {@link SQLiteDatabase} handle opened (and migrated)
 * centrally by `sqliteDb.openRedlineDb()`. The SQLite import is **type-only**, so
 * requiring this file never touches the native module — only `sqliteDb.ts` does,
 * and the bootstrap guards that behind a probe. The store and the vitest suite
 * never reach here, so they stay runnable under plain Node.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type { RaceResult } from "../../race/raceEngine";
import type { RaceRepository } from "./raceRepository";

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
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {
    // Schema is created centrally by openRedlineDb()'s migration ladder.
  }

  async loadResults(): Promise<RaceResult[]> {
    const rows = await this.db.getAllAsync<RaceResultRow>(
      `SELECT finished_at, player, car_uid, lap_count, total_time, best_lap,
              best_lap_num, worst_lap, worst_lap_num, avg_lap, lap_times
         FROM race_results
        ORDER BY total_time ASC`,
    );
    return rows.map(rowToResult);
  }

  async saveResult(result: RaceResult): Promise<void> {
    await this.db.runAsync(
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
    await this.db.execAsync("DELETE FROM race_results;");
  }
}
