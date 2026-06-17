/**
 * `expo-sqlite` implementation of {@link SessionRepository} (ADR-0006, History).
 *
 * Operates on the shared {@link SQLiteDatabase} from `sqliteDb.openRedlineDb()`.
 * The SQLite import is **type-only**, so requiring this file never touches the
 * native module (only `sqliteDb.ts` does, guarded by the bootstrap probe).
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type {
  PassInput,
  SessionPass,
  SessionRepository,
  SessionSummary,
} from "./sessionRepository";

interface SessionRow {
  id: number;
  started_at: number;
  ended_at: number | null;
  pass_count: number;
  best_mph: number;
}

interface PassRow {
  id: number;
  session_id: number;
  car_uid: string | null;
  serial: string | null;
  raw: number;
  scale_mph: number;
  at: number;
}

function rowToSession(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    passCount: row.pass_count,
    bestMph: row.best_mph,
  };
}

function rowToPass(row: PassRow): SessionPass {
  return {
    id: row.id,
    sessionId: row.session_id,
    carUid: row.car_uid,
    serial: row.serial,
    raw: row.raw,
    scaleMph: row.scale_mph,
    at: row.at,
  };
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {
    // Schema is created centrally by openRedlineDb()'s migration ladder.
  }

  async startSession(startedAt: number): Promise<number> {
    const res = await this.db.runAsync(
      `INSERT INTO sessions (started_at, pass_count, best_mph) VALUES (?, 0, 0)`,
      startedAt,
    );
    return res.lastInsertRowId;
  }

  async endSession(id: number, endedAt: number): Promise<void> {
    await this.db.runAsync(`UPDATE sessions SET ended_at = ? WHERE id = ?`, endedAt, id);
  }

  async addPass(sessionId: number, pass: PassInput): Promise<void> {
    // One transaction so the passes row and the session summary (pass_count /
    // best_mph) never drift, and so a pass for a missing session (e.g. cleared
    // mid-connection) writes nothing instead of an orphan row.
    await this.db.withTransactionAsync(async () => {
      const res = await this.db.runAsync(
        `UPDATE sessions
            SET pass_count = pass_count + 1,
                best_mph   = MAX(best_mph, ?)
          WHERE id = ?`,
        pass.scaleMph,
        sessionId,
      );
      if (res.changes === 0) {
        throw new Error(`addPass: session ${sessionId} not found`);
      }
      await this.db.runAsync(
        `INSERT INTO passes (session_id, car_uid, serial, raw, scale_mph, at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        sessionId,
        pass.carUid ?? null,
        pass.serial ?? null,
        pass.raw,
        pass.scaleMph,
        pass.at,
      );
    });
  }

  async listSessions(): Promise<SessionSummary[]> {
    const rows = await this.db.getAllAsync<SessionRow>(
      `SELECT id, started_at, ended_at, pass_count, best_mph
         FROM sessions
        ORDER BY started_at DESC, id DESC`,
    );
    return rows.map(rowToSession);
  }

  async passesForSession(sessionId: number): Promise<SessionPass[]> {
    const rows = await this.db.getAllAsync<PassRow>(
      `SELECT id, session_id, car_uid, serial, raw, scale_mph, at
         FROM passes
        WHERE session_id = ?
        ORDER BY at DESC, id DESC`,
      sessionId,
    );
    return rows.map(rowToPass);
  }

  async clear(): Promise<void> {
    await this.db.execAsync("DELETE FROM passes; DELETE FROM sessions;");
  }
}
