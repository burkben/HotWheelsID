/**
 * `expo-sqlite` implementation of {@link SettingsRepository} (ADR-0006, Settings).
 *
 * Operates on the shared {@link SQLiteDatabase} from `sqliteDb.openRedlineDb()`.
 * The SQLite import is **type-only**, so requiring this file never touches the
 * native module (only `sqliteDb.ts` does, guarded by the bootstrap probe).
 *
 * One row per setting, value JSON-encoded. `load()` skips unknown/corrupt rows so a
 * single bad value can never break hydration.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import { isSettingKey, type SettingsState } from "../settingsStore";
import type { SettingsRepository } from "./settingsRepository";

interface SettingRow {
  key: string;
  value: string;
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {}

  async load(): Promise<Partial<SettingsState>> {
    const rows = await this.db.getAllAsync<SettingRow>(`SELECT key, value FROM settings;`);
    const out: Partial<SettingsState> = {};
    for (const row of rows) {
      if (!isSettingKey(row.key)) continue;
      try {
        (out[row.key] as SettingsState[typeof row.key]) = JSON.parse(row.value);
      } catch {
        // Skip a corrupt value; the default stands in for it.
      }
    }
    return out;
  }

  async save<K extends keyof SettingsState>(key: K, value: SettingsState[K]): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      key,
      JSON.stringify(value),
    );
  }

  async clear(): Promise<void> {
    await this.db.execAsync(`DELETE FROM settings;`);
  }
}
