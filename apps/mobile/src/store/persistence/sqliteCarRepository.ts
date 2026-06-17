/**
 * `expo-sqlite` implementation of {@link CarRepository} (ADR-0006, Garage).
 *
 * Operates on the shared {@link SQLiteDatabase} from `sqliteDb.openRedlineDb()`.
 * The SQLite import is **type-only**, so requiring this file never touches the
 * native module (only `sqliteDb.ts` does, guarded by the bootstrap probe).
 *
 * The `cars` table stores detection-derived facts. Per-car race stats
 * (`bestLap`, `races`) are **derived at read time** via a LEFT JOIN on
 * `race_results`, keeping the Garage decoupled from race writes.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type {
  CarRecord,
  CarRepository,
  DetectionInput,
  SpeedInput,
} from "./carRepository";

interface CarRow {
  uid: string;
  name: string | null;
  serial: string | null;
  first_seen: number;
  last_seen: number;
  detections: number;
  best_mph: number;
  best_lap: number | null;
  races: number;
}

function rowToCar(row: CarRow): CarRecord {
  return {
    uid: row.uid,
    name: row.name,
    serial: row.serial,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    detections: row.detections,
    bestMph: row.best_mph,
    bestLap: row.best_lap,
    races: row.races,
  };
}

export class SqliteCarRepository implements CarRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {
    // Schema is created centrally by openRedlineDb()'s migration ladder.
  }

  async getCars(): Promise<CarRecord[]> {
    const rows = await this.db.getAllAsync<CarRow>(
      `SELECT c.uid, c.name, c.serial, c.first_seen, c.last_seen,
              c.detections, c.best_mph,
              MIN(r.best_lap) AS best_lap,
              COUNT(r.id)     AS races
         FROM cars c
         LEFT JOIN race_results r ON r.car_uid = c.uid
        GROUP BY c.uid
        ORDER BY c.last_seen DESC`,
    );
    return rows.map(rowToCar);
  }

  async recordDetection(input: DetectionInput): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO cars (uid, serial, first_seen, last_seen, detections, best_mph)
       VALUES (?, ?, ?, ?, 1, 0)
       ON CONFLICT(uid) DO UPDATE SET
         detections = detections + 1,
         last_seen  = MAX(last_seen, excluded.last_seen),
         serial     = COALESCE(excluded.serial, serial)`,
      input.uid,
      input.serial ?? null,
      input.at,
      input.at,
    );
  }

  async recordSerial(uid: string, serial: string): Promise<void> {
    await this.db.runAsync(`UPDATE cars SET serial = ? WHERE uid = ?`, serial, uid);
  }

  async recordSpeed(input: SpeedInput): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO cars (uid, first_seen, last_seen, detections, best_mph)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(uid) DO UPDATE SET
         best_mph  = MAX(best_mph, excluded.best_mph),
         last_seen = MAX(last_seen, excluded.last_seen)`,
      input.uid,
      input.at,
      input.at,
      input.mph,
    );
  }

  async setName(uid: string, name: string | null): Promise<void> {
    await this.db.runAsync(`UPDATE cars SET name = ? WHERE uid = ?`, name, uid);
  }

  async clear(): Promise<void> {
    await this.db.execAsync("DELETE FROM cars;");
  }
}
