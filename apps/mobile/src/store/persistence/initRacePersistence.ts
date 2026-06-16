/**
 * App bootstrap that makes the Race leaderboard durable (ADR-0006 Phase 3).
 *
 * Called once from the root layout. It opens the SQLite repository, hydrates the
 * in-memory leaderboard from disk, and registers persistence sinks so every
 * finished race is written through (and `clearLeaderboard` wipes storage too).
 *
 * If the native `expo-sqlite` module is unavailable — e.g. a dev build compiled
 * before this feature was added — it degrades gracefully: the app keeps working
 * with the in-memory leaderboard, results just won't survive a restart until the
 * client is rebuilt. This mirrors the "build before hardware" discipline: the
 * pure store never depends on the native seam being present.
 */
import { setRacePersistence, useRaceStore } from "../raceStore";
import type { RaceRepository } from "./raceRepository";

let started = false;

/**
 * Load the native SQLite repository **lazily**. A dev client built before
 * `expo-sqlite` was added has no `ExpoSQLite` native module, and that module is
 * evaluated the moment `expo-sqlite` is imported — so a *static* import here
 * would throw at load time and take the whole root layout down with it. Doing
 * the import inside {@link initRacePersistence}'s try/catch lets that failure be
 * caught and degraded to the in-memory leaderboard instead.
 */
async function loadSqliteRepository(): Promise<RaceRepository> {
  const { SqliteRaceRepository } = await import("./sqliteRaceRepository");
  return new SqliteRaceRepository();
}

export async function initRacePersistence(repo?: RaceRepository): Promise<void> {
  if (started) return;
  started = true;

  try {
    const repository = repo ?? (await loadSqliteRepository());
    await repository.init();
    const stored = await repository.loadResults();
    useRaceStore.getState().hydrate(stored);

    setRacePersistence({
      onResult: (result) => {
        repository
          .saveResult(result)
          .catch((err) => console.warn("[race] failed to persist result", err));
      },
      onClear: () => {
        repository
          .clear()
          .catch((err) => console.warn("[race] failed to clear results", err));
      },
    });
  } catch (err) {
    started = false;
    console.warn(
      "[race] persistence unavailable, leaderboard will be in-memory only",
      err,
    );
  }
}

/** Test-only: reset the one-shot guard so each test starts clean. */
export function resetRacePersistenceForTests(): void {
  started = false;
}
