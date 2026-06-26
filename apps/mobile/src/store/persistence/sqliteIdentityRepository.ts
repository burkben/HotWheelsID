/**
 * `expo-sqlite` implementation of {@link IdentityRepository} (Phase 5 catalog).
 *
 * Operates on the shared {@link SQLiteDatabase} from `openRedlineDb()`. The SQLite
 * import is **type-only**, so requiring this file never touches the native module
 * (only `sqliteDb.ts` does, guarded by the bootstrap probe). Tables `car_links`
 * and `car_identifications` are created by migration v6.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import type { IdentityState } from "../identityStore";
import type { IdentityRepository } from "./identityRepository";

interface LinkRow {
  uid: string;
  casting_key: string;
}

interface IdentRow {
  casting_key: string;
  catalog_id: string;
}

export class SqliteIdentityRepository implements IdentityRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async init(): Promise<void> {}

  async load(): Promise<IdentityState> {
    const linkRows = await this.db.getAllAsync<LinkRow>(`SELECT uid, casting_key FROM car_links;`);
    const identRows = await this.db.getAllAsync<IdentRow>(
      `SELECT casting_key, catalog_id FROM car_identifications;`,
    );
    const links: Record<string, string> = {};
    for (const row of linkRows) links[row.uid] = row.casting_key;
    const identifications: Record<string, string> = {};
    for (const row of identRows) identifications[row.casting_key] = row.catalog_id;
    return { links, identifications };
  }

  async saveLink(uid: string, castingKey: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO car_links (uid, casting_key) VALUES (?, ?)
       ON CONFLICT(uid) DO UPDATE SET casting_key = excluded.casting_key;`,
      uid,
      castingKey,
    );
  }

  async saveIdentification(castingKey: string, catalogId: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO car_identifications (casting_key, catalog_id) VALUES (?, ?)
       ON CONFLICT(casting_key) DO UPDATE SET catalog_id = excluded.catalog_id;`,
      castingKey,
      catalogId,
    );
  }

  async clear(): Promise<void> {
    await this.db.execAsync(`DELETE FROM car_links; DELETE FROM car_identifications;`);
  }
}
