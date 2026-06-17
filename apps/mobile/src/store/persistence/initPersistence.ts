/**
 * App persistence bootstrap (ADR-0006, Phase 3). Called once from the root layout.
 *
 * Opens the shared `redlineid.db` **once**, hydrates every render store from disk,
 * registers write-through sinks, and bridges the runtime portal store into the
 * Garage. Today it wires two repositories — Race (durable leaderboard) and Car
 * (durable garage) — sharing a single migrated DB handle; History/Settings join
 * the same pattern later.
 *
 * **Native-module discipline (load-bearing — do not relax):** `expo-sqlite`
 * throws *at module-evaluation time* when `ExpoSQLite` is absent (its
 * `ExpoSQLite.js` is literally `export default requireNativeModule('ExpoSQLite')`),
 * and Metro surfaces that straight to LogBox as a red screen. So we:
 *   1. **probe `globalThis.expo.modules.ExpoSQLite` first** (the same lookup expo
 *      itself does) and never load the SQLite layer when it's missing; and
 *   2. pull the SQLite modules in with a **synchronous `require()`, not a dynamic
 *      `import()`** — a dynamic `import()` makes Metro emit a separate async chunk
 *      whose module id is "poisoned" by the first eval-throw and then reported as
 *      `Requiring unknown module "…"` on every later reload. `require()` keeps the
 *      adapters in the main bundle, and their factories only run once the probe has
 *      confirmed the module is present.
 * Only `sqliteDb.ts` value-imports `expo-sqlite`; the repository adapters use
 * type-only imports, so requiring them is always safe.
 *
 * Absent native module → one quiet `console.log`, in-memory stores, no red screen.
 * The attempt is **one-shot per JS runtime** (a missing module can't appear without
 * an app rebuild, which restarts the runtime anyway), so we never retry.
 */
import { setGaragePersistence, useGarageStore } from "../garageStore";
import { usePortalStore } from "../portalStore";
import { setRacePersistence, useRaceStore } from "../raceStore";
import { InMemoryCarRepository, type CarRepository } from "./carRepository";
import { InMemoryRaceRepository, type RaceRepository } from "./raceRepository";

/** The repositories the bootstrap wires. Tests may inject either or both. */
export interface PersistenceRepositories {
  race: RaceRepository;
  car: CarRepository;
}

let started = false;
let unsubscribePortal: (() => void) | null = null;

/**
 * True when the `ExpoSQLite` native module is present in this binary. Reads the
 * same `globalThis.expo.modules` registry `requireOptionalNativeModule` uses, but
 * without importing `expo-sqlite` (which throws if absent) or `expo-modules-core`
 * (whose TS source can't load under the Node test runner). In Node/CI
 * `globalThis.expo` is undefined, so this is `false` and tests never touch SQLite.
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
 * Resolve the repositories to use. Injected repos (tests) win; a partial injection
 * fills the gap with an in-memory repo. Otherwise, only when the native module is
 * confirmed present, open the shared DB and build the SQLite adapters. Returns
 * `null` (not a throw) when SQLite is unavailable so the caller falls back cleanly.
 */
async function resolveRepositories(
  injected?: Partial<PersistenceRepositories>,
): Promise<PersistenceRepositories | null> {
  if (injected?.race || injected?.car) {
    return {
      race: injected.race ?? new InMemoryRaceRepository(),
      car: injected.car ?? new InMemoryCarRepository(),
    };
  }

  if (!sqliteNativeModuleAvailable()) return null;

  const { openRedlineDb } = require("./sqliteDb") as typeof import("./sqliteDb");
  const { SqliteRaceRepository } =
    require("./sqliteRaceRepository") as typeof import("./sqliteRaceRepository");
  const { SqliteCarRepository } =
    require("./sqliteCarRepository") as typeof import("./sqliteCarRepository");

  const db = await openRedlineDb();
  return { race: new SqliteRaceRepository(db), car: new SqliteCarRepository(db) };
}

export async function initPersistence(injected?: Partial<PersistenceRepositories>): Promise<void> {
  if (started) return;
  started = true; // attempt once; never reset (see file header)

  try {
    const repos = await resolveRepositories(injected);
    if (!repos) {
      console.log(
        "[persist] SQLite not in this build — Race leaderboard and Garage are in-memory until you rebuild the dev client (expo run:ios).",
      );
      return;
    }

    await repos.race.init();
    await repos.car.init();

    // Hydrate the render stores from durable storage.
    useRaceStore.getState().hydrate(await repos.race.loadResults());
    useGarageStore.getState().hydrate(await repos.car.getCars());

    // Write-through sinks: every store mutation persists (failures stay non-fatal).
    setRacePersistence({
      onResult: (result) =>
        void repos.race.saveResult(result).catch((e) => console.warn("[race] persist result failed", e)),
      onClear: () =>
        void repos.race.clear().catch((e) => console.warn("[race] clear failed", e)),
    });
    setGaragePersistence({
      onDetection: (input) =>
        void repos.car.recordDetection(input).catch((e) => console.warn("[garage] detection failed", e)),
      onSerial: (uid, serial) =>
        void repos.car.recordSerial(uid, serial).catch((e) => console.warn("[garage] serial failed", e)),
      onSpeed: (input) =>
        void repos.car.recordSpeed(input).catch((e) => console.warn("[garage] speed failed", e)),
      onRename: (uid, name) =>
        void repos.car.setName(uid, name).catch((e) => console.warn("[garage] rename failed", e)),
      onClear: () =>
        void repos.car.clear().catch((e) => console.warn("[garage] clear failed", e)),
    });

    // Bridge the runtime portal store → Garage so any detected car is collected,
    // keeping portalStore pure (no new coupling, just an external subscription).
    wirePortalToGarage();
  } catch (err) {
    // Native module present but init failed (e.g. a corrupt DB). Keep the app on
    // in-memory stores rather than crash.
    console.warn("[persist] init failed; using in-memory stores", err);
  }
}

/**
 * Subscribe to the runtime portal store and feed the Garage:
 *  - a new/changed car `uid` is a placement → `recordDetection`;
 *  - the same car gaining a serial is a late serial → `recordSerial`;
 *  - a new pass with a uid is a speed sample → `recordSpeed` (best-mph tracking).
 * Seeded from the current state so existing values aren't replayed as new.
 */
function wirePortalToGarage(): void {
  if (unsubscribePortal) return; // idempotent within a runtime

  const garage = () => useGarageStore.getState();
  const seed = usePortalStore.getState();
  let lastUid: string | null = seed.car?.uid ?? null;
  let lastSerial: string | null = seed.car?.serial ?? null;
  let lastPassId = seed.passes[0]?.id ?? 0;

  // If a car is already on the portal when we subscribe (e.g. init ran after a
  // connection was established), collect it now so its detection isn't missed —
  // `subscribe` only fires on *future* changes. At cold start the portal is
  // disconnected, so this is a no-op.
  if (lastUid) {
    garage().recordDetection({ uid: lastUid, serial: lastSerial, at: Date.now() });
  }

  unsubscribePortal = usePortalStore.subscribe((state) => {
    const uid = state.car?.uid ?? null;
    const serial = state.car?.serial ?? null;

    if (uid && uid !== lastUid) {
      garage().recordDetection({ uid, serial, at: Date.now() });
    } else if (uid && uid === lastUid && serial && serial !== lastSerial) {
      garage().recordSerial(uid, serial);
    }
    lastUid = uid;
    lastSerial = serial;

    const head = state.passes[0];
    if (head && head.id !== lastPassId) {
      lastPassId = head.id;
      if (head.uid) garage().recordSpeed({ uid: head.uid, mph: head.scaleMph, at: head.at });
    }
  });
}

/** Test-only: reset the one-shot guard, sinks, and portal bridge between tests. */
export function resetPersistenceForTests(): void {
  started = false;
  setRacePersistence(null);
  setGaragePersistence(null);
  if (unsubscribePortal) {
    unsubscribePortal();
    unsubscribePortal = null;
  }
}
