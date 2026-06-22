/**
 * `expo-sqlite` implementation of {@link CastingRepository} (Slice B).
 *
 * Operates on the shared {@link SQLiteDatabase} from `sqliteDb.openRedlineDb()`.
 * The SQLite import is **type-only**, so requiring this file never touches the
 * native module (only `sqliteDb.ts` does, guarded by the bootstrap probe).
 *
 * Casting names live in their own `castings` table keyed by `model_id`, decoupled
 * from `cars` (which is keyed by `uid`): one name serves all copies of a casting,
 * and it survives a car being forgotten.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type { CastingNames, CastingRepository } from "./castingRepository";

interface CastingRow {
  model_id: string;
  name: string;
}

export class SqliteCastingRepository implements CastingRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {
    // Schema is created centrally by openRedlineDb()'s migration ladder.
  }

  async getCastingNames(): Promise<CastingNames> {
    const rows = await this.db.getAllAsync<CastingRow>(
      `SELECT model_id, name FROM castings`,
    );
    const names: CastingNames = {};
    for (const row of rows) names[row.model_id] = row.name;
    return names;
  }

  async setCastingName(modelId: string, name: string | null): Promise<void> {
    const key = modelId.toUpperCase();
    const trimmed = name?.trim();
    if (!trimmed) {
      await this.db.runAsync(`DELETE FROM castings WHERE model_id = ?`, key);
      return;
    }
    await this.db.runAsync(
      `INSERT INTO castings (model_id, name, named_at)
       VALUES (?, ?, ?)
       ON CONFLICT(model_id) DO UPDATE SET
         name     = excluded.name,
         named_at = excluded.named_at`,
      key,
      trimmed,
      Date.now(),
    );
  }

  async clear(): Promise<void> {
    await this.db.execAsync("DELETE FROM castings;");
  }
}
