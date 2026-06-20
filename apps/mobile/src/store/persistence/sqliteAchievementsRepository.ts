/**
 * `expo-sqlite` implementation of {@link AchievementsRepository} (ADR-0006).
 *
 * Operates on the shared {@link SQLiteDatabase} handle opened (and migrated)
 * centrally by `sqliteDb.openRedlineDb()`. The SQLite import is **type-only**,
 * so requiring this file never touches the native module — only `sqliteDb.ts`
 * does, behind the bootstrap's probe. The store and vitest suite never reach
 * here, so they stay runnable under plain Node.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type { AchievementsRepository } from "./achievementsRepository";

interface UnlockedRow {
  id: string;
  unlocked_at: number;
}

export class SqliteAchievementsRepository implements AchievementsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {
    // Schema is created centrally by openRedlineDb()'s migration ladder.
  }

  async loadUnlocked(): Promise<Record<string, number>> {
    const rows = await this.db.getAllAsync<UnlockedRow>(
      "SELECT id, unlocked_at FROM achievements",
    );
    const out: Record<string, number> = {};
    for (const row of rows) out[row.id] = row.unlocked_at;
    return out;
  }

  async unlock(id: string, at: number): Promise<void> {
    await this.db.runAsync(
      "INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, ?)",
      id,
      at,
    );
  }

  async clear(): Promise<void> {
    await this.db.execAsync("DELETE FROM achievements;");
  }
}
