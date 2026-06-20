/**
 * App persistence bootstrap (ADR-0006, Phase 3). Called once from the root layout.
 *
 * Opens the shared `redlineid.db` **once**, hydrates every render store from disk,
 * registers write-through sinks, and bridges the runtime portal store into the
 * Garage and History. Today it wires four repositories — Race (durable
 * leaderboard), Car (durable garage), Session (durable history), and Settings
 * (durable preferences) — sharing a single migrated DB handle.
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
import { combineStats, garageAggregate } from "../../achievements/stats";
import { setAchievementsPersistence, useAchievementsStore } from "../achievementsStore";
import { setGaragePersistence, useGarageStore } from "../garageStore";
import { usePortalStore } from "../portalStore";
import { setRacePersistence, useRaceStore } from "../raceStore";
import { setSettingsPersistence, useSettingsStore } from "../settingsStore";
import {
  InMemoryAchievementsRepository,
  type AchievementsRepository,
} from "./achievementsRepository";
import { InMemoryCarRepository, type CarRepository } from "./carRepository";
import { InMemoryRaceRepository, type RaceRepository } from "./raceRepository";
import { setSessionRepository } from "./historyAccess";
import { InMemorySessionRepository, type SessionRepository } from "./sessionRepository";
import { InMemorySettingsRepository, type SettingsRepository } from "./settingsRepository";

/** The repositories the bootstrap wires. Tests may inject any subset. */
export interface PersistenceRepositories {
  race: RaceRepository;
  car: CarRepository;
  session: SessionRepository;
  settings: SettingsRepository;
  achievements: AchievementsRepository;
}

let started = false;
let unsubscribePortal: (() => void) | null = null;
let unsubscribeGarage: (() => void) | null = null;

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
  if (
    injected?.race ||
    injected?.car ||
    injected?.session ||
    injected?.settings ||
    injected?.achievements
  ) {
    return {
      race: injected.race ?? new InMemoryRaceRepository(),
      car: injected.car ?? new InMemoryCarRepository(),
      session: injected.session ?? new InMemorySessionRepository(),
      settings: injected.settings ?? new InMemorySettingsRepository(),
      achievements: injected.achievements ?? new InMemoryAchievementsRepository(),
    };
  }

  if (!sqliteNativeModuleAvailable()) return null;

  const { openRedlineDb } = require("./sqliteDb") as typeof import("./sqliteDb");
  const { SqliteRaceRepository } =
    require("./sqliteRaceRepository") as typeof import("./sqliteRaceRepository");
  const { SqliteCarRepository } =
    require("./sqliteCarRepository") as typeof import("./sqliteCarRepository");
  const { SqliteSessionRepository } =
    require("./sqliteSessionRepository") as typeof import("./sqliteSessionRepository");
  const { SqliteSettingsRepository } =
    require("./sqliteSettingsRepository") as typeof import("./sqliteSettingsRepository");
  const { SqliteAchievementsRepository } =
    require("./sqliteAchievementsRepository") as typeof import("./sqliteAchievementsRepository");

  const db = await openRedlineDb();
  return {
    race: new SqliteRaceRepository(db),
    car: new SqliteCarRepository(db),
    session: new SqliteSessionRepository(db),
    settings: new SqliteSettingsRepository(db),
    achievements: new SqliteAchievementsRepository(db),
  };
}

export async function initPersistence(injected?: Partial<PersistenceRepositories>): Promise<void> {
  if (started) return;
  started = true; // attempt once; never reset (see file header)

  try {
    const repos = await resolveRepositories(injected);
    if (!repos) {
      console.log(
        "[persist] SQLite not in this build — Race leaderboard, Garage, History, and Settings are in-memory until you rebuild the dev client (expo run:ios).",
      );
      // Settings stay at defaults, but mark them "loaded" so hydration-gated UI
      // (e.g. Home's startup demo-mode default) doesn't wait forever.
      if (!useSettingsStore.getState().hydrated) useSettingsStore.getState().hydrate({});
      return;
    }

    await repos.race.init();
    await repos.car.init();
    await repos.session.init();
    await repos.settings.init();
    await repos.achievements.init();

    // Hydrate the render stores from durable storage.
    useRaceStore.getState().hydrate(await repos.race.loadResults());
    useGarageStore.getState().hydrate(await repos.car.getCars());
    useSettingsStore.getState().hydrate(await repos.settings.load());
    useAchievementsStore.getState().hydrate(await repos.achievements.loadUnlocked());

    // History has no render store — publish the repo so screens read it on focus.
    setSessionRepository(repos.session);

    // Recompute achievement stats from the durable race totals + the live garage,
    // then fold them in (unlocking anything newly earned). Called once now and
    // again whenever a race is banked or the garage changes (see below).
    const refreshAchievements = (): void => {
      void repos.race
        .aggregate()
        .then((race) => {
          const stats = combineStats(race, garageAggregate(useGarageStore.getState().cars));
          useAchievementsStore.getState().applyStats(stats);
        })
        .catch((e) => console.warn("[achievements] refresh failed", e));
    };

    // Write-through sinks: every store mutation persists (failures stay non-fatal).
    setRacePersistence({
      onResult: (result) =>
        void repos.race
          .saveResult(result)
          .then(refreshAchievements) // the new race is now in the durable totals
          .catch((e) => console.warn("[race] persist result failed", e)),
      onClear: () =>
        void repos.race
          .clear()
          .then(refreshAchievements)
          .catch((e) => console.warn("[race] clear failed", e)),
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
    setSettingsPersistence({
      onSave: (key, value) =>
        void repos.settings.save(key, value).catch((e) => console.warn("[settings] save failed", e)),
      onClear: () =>
        void repos.settings.clear().catch((e) => console.warn("[settings] clear failed", e)),
    });
    setAchievementsPersistence({
      onUnlock: (id, at) =>
        void repos.achievements.unlock(id, at).catch((e) => console.warn("[achievements] unlock failed", e)),
      onClear: () =>
        void repos.achievements.clear().catch((e) => console.warn("[achievements] clear failed", e)),
    });

    // Garage changes (new car, faster pass) move collection/speed achievements;
    // refresh off the in-memory store snapshot. Race achievements refresh via the
    // race sink above (after the durable write, so aggregate() counts it).
    let lastCars = useGarageStore.getState().cars;
    unsubscribeGarage = useGarageStore.subscribe((state) => {
      if (state.cars === lastCars) return;
      lastCars = state.cars;
      refreshAchievements();
    });

    // Bridge the runtime portal store → Garage (collect every detected car) and
    // → History (open a session per connection, record each pass), keeping
    // portalStore pure (no new coupling, just an external subscription).
    wirePortalBridges(repos.session);

    // Initial evaluation against the hydrated totals (may unlock retroactively).
    refreshAchievements();
  } catch (err) {
    // Native module present but init failed (e.g. a corrupt DB). Keep the app on
    // in-memory stores rather than crash.
    console.warn("[persist] init failed; using in-memory stores", err);
    // If settings never hydrated before the failure, fall back to defaults so the
    // store reports "loaded" (don't clobber a successful settings hydration).
    if (!useSettingsStore.getState().hydrated) useSettingsStore.getState().hydrate({});
  }
}

/**
 * Subscribe to the runtime portal store and feed both durable mirrors:
 *
 * **Garage** (every detected car is collected):
 *  - a new/changed car `uid` is a placement → `recordDetection`;
 *  - the same car gaining a serial is a late serial → `recordSerial`;
 *  - a new pass with a uid is a speed sample → `recordSpeed` (best-mph tracking).
 *
 * **History** (one session per BLE connection):
 *  - `connection` → `connected` opens a session (`startSession`);
 *  - `connection` → `disconnected` closes it (`endSession`);
 *  - each new pass while a session is open is recorded (`addPass`).
 *
 * Seeded from the current state so existing values aren't replayed as new. The
 * `startSession` write is async, so the current session id is tracked in a closure
 * var and a pass arriving before it resolves is simply not recorded (a connect is
 * always followed by seconds of setup before the first crossing, so this is moot).
 */
function wirePortalBridges(sessionRepo: SessionRepository): void {
  if (unsubscribePortal) return; // idempotent within a runtime

  const garage = () => useGarageStore.getState();
  const warn = (label: string) => (e: unknown) => console.warn(`[history] ${label} failed`, e);
  const seed = usePortalStore.getState();
  let lastUid: string | null = seed.car?.uid ?? null;
  let lastSerial: string | null = seed.car?.serial ?? null;
  let lastPassId = seed.passes[0]?.id ?? 0;
  let lastConnection = seed.connection;
  let sessionId: number | null = null;

  // A History session is open **iff** the portal connection is `connected`. The
  // `startSession` write is async, so a connection that drops before it resolves
  // would otherwise leave a stale `sessionId`; an epoch counter — bumped on every
  // open/close — lets a late `startSession` detect that the connection has moved on
  // and close the orphan session instead of mis-binding later passes to it.
  let sessionEpoch = 0;

  const openSession = () => {
    const epoch = ++sessionEpoch;
    void sessionRepo
      .startSession(Date.now())
      .then((id) => {
        if (epoch === sessionEpoch) {
          sessionId = id;
        } else {
          // The connection changed before this resolved — immediately close it.
          void sessionRepo.endSession(id, Date.now()).catch(warn("endSession"));
        }
      })
      .catch(warn("startSession"));
  };

  const closeSession = () => {
    sessionEpoch++; // invalidate any in-flight openSession
    const closing = sessionId;
    sessionId = null;
    if (closing != null) {
      void sessionRepo.endSession(closing, Date.now()).catch(warn("endSession"));
    }
  };

  // If a car is already on the portal when we subscribe (e.g. init ran after a
  // connection was established), collect it now so its detection isn't missed —
  // `subscribe` only fires on *future* changes. At cold start the portal is
  // disconnected, so this is a no-op.
  if (lastUid) {
    garage().recordDetection({ uid: lastUid, serial: lastSerial, at: Date.now() });
  }

  // Likewise, open a session if we boot already connected.
  if (seed.connection === "connected") openSession();

  unsubscribePortal = usePortalStore.subscribe((state) => {
    // --- connection → History session lifecycle (open iff connected) ---
    if (state.connection !== lastConnection) {
      const wasConnected = lastConnection === "connected";
      const nowConnected = state.connection === "connected";
      if (nowConnected && !wasConnected) openSession();
      else if (wasConnected && !nowConnected) closeSession();
      lastConnection = state.connection;
    }

    // --- car → Garage ---
    const uid = state.car?.uid ?? null;
    const serial = state.car?.serial ?? null;
    if (uid && uid !== lastUid) {
      garage().recordDetection({ uid, serial, at: Date.now() });
    } else if (uid && uid === lastUid && serial && serial !== lastSerial) {
      garage().recordSerial(uid, serial);
    }
    lastUid = uid;
    lastSerial = serial;

    // --- pass → Garage best-mph + History pass log ---
    const head = state.passes[0];
    if (head && head.id !== lastPassId) {
      lastPassId = head.id;
      if (head.uid) garage().recordSpeed({ uid: head.uid, mph: head.scaleMph, at: head.at });
      if (sessionId != null) {
        void sessionRepo
          .addPass(sessionId, {
            carUid: head.uid || null,
            serial,
            raw: head.raw,
            scaleMph: head.scaleMph,
            at: head.at,
          })
          .catch(warn("addPass"));
      }
    }
  });
}

/** Test-only: reset the one-shot guard, sinks, and portal bridge between tests. */
export function resetPersistenceForTests(): void {
  started = false;
  setRacePersistence(null);
  setGaragePersistence(null);
  setSessionRepository(null);
  setSettingsPersistence(null);
  setAchievementsPersistence(null);
  if (unsubscribePortal) {
    unsubscribePortal();
    unsubscribePortal = null;
  }
  if (unsubscribeGarage) {
    unsubscribeGarage();
    unsubscribeGarage = null;
  }
}
