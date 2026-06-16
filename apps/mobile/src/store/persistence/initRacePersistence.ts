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
 *
 * Crucially, we **probe for the native module before importing `expo-sqlite`**.
 * `expo-sqlite` throws *at module-evaluation time* when `ExpoSQLite` is missing,
 * and Metro reports that eval-throw straight to LogBox (a red screen) — and then
 * "Requiring unknown module" on the next attempt — even when the resulting
 * promise rejection is caught. Checking `globalThis.expo.modules.ExpoSQLite`
 * first (the very lookup expo itself does) means we simply never import the
 * adapter when the module is absent, so nothing throws and no red screen appears.
 *
 * The attempt is **one-shot per JS runtime**: a missing native module can't
 * appear without an app rebuild (which restarts the runtime anyway), so we never
 * retry.
 */
import { setRacePersistence, useRaceStore } from "../raceStore";
import type { RaceRepository } from "./raceRepository";

let started = false;

/**
 * True when the `ExpoSQLite` native module is actually present in this binary.
 * Reads the same `globalThis.expo.modules` registry `requireOptionalNativeModule`
 * uses, but without importing `expo-sqlite` (which would throw if absent) or
 * `expo-modules-core` (whose TS source can't load under the Node test runner).
 * In Node/CI `globalThis.expo` is undefined, so this is `false` and tests never
 * touch the native seam.
 */
function sqliteNativeModuleAvailable(): boolean {
  try {
    const expo = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo;
    return Boolean(expo?.modules?.ExpoSQLite);
  } catch {
    return false;
  }
}

/**
 * Dynamically import the SQLite adapter, but only after confirming the native
 * module exists. Returns `null` (not a throw) when it doesn't, so the caller can
 * fall back to the in-memory leaderboard cleanly.
 */
async function loadSqliteRepository(): Promise<RaceRepository | null> {
  if (!sqliteNativeModuleAvailable()) return null;
  const { SqliteRaceRepository } = await import("./sqliteRaceRepository");
  return new SqliteRaceRepository();
}

export async function initRacePersistence(repo?: RaceRepository): Promise<void> {
  if (started) return;
  started = true; // attempt once; never reset (see file header)

  try {
    const repository = repo ?? (await loadSqliteRepository());
    if (!repository) {
      console.log(
        "[race] SQLite not in this build — leaderboard is in-memory until you rebuild the dev client (expo run:ios).",
      );
      return;
    }

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
    // The native module was present but init failed for some other reason (e.g.
    // a corrupt DB). Keep the app on the in-memory leaderboard rather than crash.
    console.warn("[race] persistence init failed; using in-memory leaderboard", err);
  }
}

/** Test-only: reset the one-shot guard (and sinks) so each test starts clean. */
export function resetRacePersistenceForTests(): void {
  started = false;
  setRacePersistence(null);
}
