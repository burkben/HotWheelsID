/**
 * Shared `expo-sqlite` database for all durable RedlineID data (ADR-0006).
 *
 * This is the **single place** `expo-sqlite` is imported as a value, and the
 * single place the schema is created. The app bootstrap requires it only after
 * probing that the native module exists (see `initPersistence.ts`), so the
 * top-level `import * as SQLite` never throws on a SQLite-less build.
 *
 * Schema evolves through an additive `PRAGMA user_version` ladder. Each step is
 * idempotent (`CREATE TABLE IF NOT EXISTS`), so a device that shipped an earlier
 * version keeps its data: e.g. a client from PR #15 already has `race_results`
 * (with `user_version` still 0), so the ladder simply adds `cars` and stamps the
 * version forward without disturbing existing rows.
 */
import * as SQLite from "expo-sqlite";

const DB_NAME = "redlineid.db";

type Db = SQLite.SQLiteDatabase;

/**
 * Ordered migrations. Index `i` migrates the DB to `user_version` `i + 1`.
 * **Append only** — never edit or reorder a shipped step.
 */
const MIGRATIONS: ((db: Db) => Promise<void>)[] = [
  // v1 — finished races (shipped PR #15). IF NOT EXISTS preserves existing data.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS race_results (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        finished_at   INTEGER NOT NULL,
        player        TEXT    NOT NULL,
        car_uid       TEXT    NOT NULL,
        lap_count     INTEGER NOT NULL,
        total_time    REAL    NOT NULL,
        best_lap      REAL    NOT NULL,
        best_lap_num  INTEGER NOT NULL,
        worst_lap     REAL    NOT NULL,
        worst_lap_num INTEGER NOT NULL,
        avg_lap       REAL    NOT NULL,
        lap_times     TEXT    NOT NULL
      );
    `);
  },
  // v2 — garage: the durable car collection (detection-derived facts).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cars (
        uid         TEXT    PRIMARY KEY,
        name        TEXT,
        serial      TEXT,
        first_seen  INTEGER NOT NULL,
        last_seen   INTEGER NOT NULL,
        detections  INTEGER NOT NULL DEFAULT 0,
        best_mph    REAL    NOT NULL DEFAULT 0
      );
    `);
  },
  // v3 — history: one session per BLE connection + the passes recorded in it.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sessions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at  INTEGER NOT NULL,
        ended_at    INTEGER,
        pass_count  INTEGER NOT NULL DEFAULT 0,
        best_mph    REAL    NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS passes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id  INTEGER NOT NULL,
        car_uid     TEXT,
        serial      TEXT,
        raw         REAL    NOT NULL,
        scale_mph   REAL    NOT NULL,
        at          INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_passes_session ON passes (session_id);
    `);
  },
  // v4 — settings: durable app preferences as a small JSON-encoded KV table.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  },
  // v5 — achievements: the durable set of unlocked badges (id → first unlock).
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS achievements (
        id          TEXT    PRIMARY KEY,
        unlocked_at INTEGER NOT NULL
      );
    `);
  },
  // v6 — car identity (catalog prototype): a tag→casting link map and a
  // casting→catalog identification map, kept separate from the `cars` garage.
  async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS car_links (
        uid         TEXT PRIMARY KEY,
        casting_key TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS car_identifications (
        casting_key TEXT PRIMARY KEY,
        catalog_id  TEXT NOT NULL
      );
    `);
  },
];

/** Open the shared DB, enable WAL, and run any pending migrations. */
export async function openRedlineDb(): Promise<Db> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync("PRAGMA journal_mode = WAL;");
  await migrate(db);
  return db;
}

async function migrate(db: Db): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version;");
  const current = row?.user_version ?? 0;
  // A DB written by a newer build may be ahead of this binary's ladder; never
  // stamp it backward (that would risk re-running a future migration later).
  if (current >= MIGRATIONS.length) return;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await MIGRATIONS[v](db);
  }
  // PRAGMA user_version takes no bound params; the value is a trusted constant.
  await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length};`);
}
