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
 * Only `sqliteDb.ts` value-imports `expo-sqlite`; `sqliteDb.web.ts` is a no-native
 * bundler stub, and the repository adapters use type-only imports.
 *
 * Absent native module → one quiet `console.log`, in-memory stores, no red screen.
 * The attempt is **one-shot per JS runtime** (a missing module can't appear without
 * an app rebuild, which restarts the runtime anyway), so we never retry.
 */
import { combineStats, garageAggregate } from "../../achievements/stats";
import { IDENTITY_SEED } from "../../catalog/identitySeed";
import { castingKeyFromMattelId } from "@redlineid/protocol";
import { setAchievementsPersistence, useAchievementsStore } from "../achievementsStore";
import { setGaragePersistence, useGarageStore } from "../garageStore";
import { setIdentityPersistence, useIdentityStore } from "../identityStore";
import { usePortalStore } from "../portalStore";
import { setRacePersistence, useRaceStore } from "../raceStore";
import { setSettingsPersistence, useSettingsStore } from "../settingsStore";
import {
  InMemoryAchievementsRepository,
  type AchievementsRepository,
} from "./achievementsRepository";
import { InMemoryCarRepository, type CarRepository } from "./carRepository";
import { InMemoryIdentityRepository, type IdentityRepository } from "./identityRepository";
import { InMemoryRaceRepository, type RaceRepository } from "./raceRepository";
import { setSessionRepository } from "./historyAccess";
import { InMemorySessionRepository, type SessionRepository } from "./sessionRepository";
import { InMemorySettingsRepository, type SettingsRepository } from "./settingsRepository";
import { usePersistenceStatusStore } from "./persistenceStatusStore";

/** The repositories the bootstrap wires. Tests may inject any subset. */
export interface PersistenceRepositories {
  race: RaceRepository;
  car: CarRepository;
  session: SessionRepository;
  settings: SettingsRepository;
  achievements: AchievementsRepository;
  identity: IdentityRepository;
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
interface PersistenceResolution {
  repositories: PersistenceRepositories;
  degradedReason: "unavailable" | null;
}

function createInMemoryRepositories(): PersistenceRepositories {
  return {
    race: new InMemoryRaceRepository(),
    car: new InMemoryCarRepository(),
    session: new InMemorySessionRepository(),
    settings: new InMemorySettingsRepository(),
    achievements: new InMemoryAchievementsRepository(),
    identity: new InMemoryIdentityRepository(),
  };
}

async function resolveRepositories(
  injected?: Partial<PersistenceRepositories>,
): Promise<PersistenceResolution> {
  if (
    injected?.race ||
    injected?.car ||
    injected?.session ||
    injected?.settings ||
    injected?.achievements ||
    injected?.identity
  ) {
    return {
      repositories: {
        race: injected.race ?? new InMemoryRaceRepository(),
        car: injected.car ?? new InMemoryCarRepository(),
        session: injected.session ?? new InMemorySessionRepository(),
        settings: injected.settings ?? new InMemorySettingsRepository(),
        achievements: injected.achievements ?? new InMemoryAchievementsRepository(),
        identity: injected.identity ?? new InMemoryIdentityRepository(),
      },
      degradedReason: null,
    };
  }

  if (!sqliteNativeModuleAvailable()) {
    return { repositories: createInMemoryRepositories(), degradedReason: "unavailable" };
  }

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
  const { SqliteIdentityRepository } =
    require("./sqliteIdentityRepository") as typeof import("./sqliteIdentityRepository");

  const db = await openRedlineDb();
  return {
    repositories: {
      race: new SqliteRaceRepository(db),
      car: new SqliteCarRepository(db),
      session: new SqliteSessionRepository(db),
      settings: new SqliteSettingsRepository(db),
      achievements: new SqliteAchievementsRepository(db),
      identity: new SqliteIdentityRepository(db),
    },
    degradedReason: null,
  };
}

async function initializeRepositories(repos: PersistenceRepositories): Promise<void> {
  await repos.race.init();
  await repos.car.init();
  await repos.session.init();
  await repos.settings.init();
  await repos.achievements.init();
  await repos.identity.init();

  useRaceStore.getState().hydrate(await repos.race.loadResults());
  useGarageStore.getState().hydrate(await repos.car.getCars());
  useSettingsStore.getState().hydrate(await repos.settings.load());
  useAchievementsStore.getState().hydrate(await repos.achievements.loadUnlocked());
  useIdentityStore.getState().hydrate(await repos.identity.load());
  setSessionRepository(repos.session);

  const refreshAchievements = (): void => {
    void repos.race
      .aggregate()
      .then((race) => {
        const stats = combineStats(race, garageAggregate(useGarageStore.getState().cars));
        useAchievementsStore.getState().applyStats(stats);
      })
      .catch((error) => console.warn("[achievements] refresh failed", error));
  };

  setRacePersistence({
    onResult: (result) =>
      void repos.race
        .saveResult(result)
        .then(refreshAchievements)
        .catch((error) => console.warn("[race] persist result failed", error)),
    onClear: () =>
      void repos.race
        .clear()
        .then(refreshAchievements)
        .catch((error) => console.warn("[race] clear failed", error)),
  });
  setGaragePersistence({
    onDetection: (input) =>
      void repos.car
        .recordDetection(input)
        .catch((error) => console.warn("[garage] detection failed", error)),
    onSerial: (uid, serial) =>
      void repos.car
        .recordSerial(uid, serial)
        .catch((error) => console.warn("[garage] serial failed", error)),
    onSpeed: (input) =>
      void repos.car
        .recordSpeed(input)
        .catch((error) => console.warn("[garage] speed failed", error)),
    onRename: (uid, name) =>
      void repos.car.setName(uid, name).catch((error) => console.warn("[garage] rename failed", error)),
    onClear: () =>
      void repos.car.clear().catch((error) => console.warn("[garage] clear failed", error)),
  });
  setSettingsPersistence({
    onSave: (key, value) =>
      void repos.settings
        .save(key, value)
        .catch((error) => console.warn("[settings] save failed", error)),
    onClear: () =>
      void repos.settings.clear().catch((error) => console.warn("[settings] clear failed", error)),
  });
  setAchievementsPersistence({
    onUnlock: (id, at) =>
      void repos.achievements
        .unlock(id, at)
        .catch((error) => console.warn("[achievements] unlock failed", error)),
    onClear: () =>
      void repos.achievements
        .clear()
        .catch((error) => console.warn("[achievements] clear failed", error)),
  });
  setIdentityPersistence({
    onLink: (uid, castingKey) =>
      void repos.identity
        .saveLink(uid, castingKey)
        .catch((error) => console.warn("[identity] link failed", error)),
    onIdentify: (castingKey, catalogId) =>
      void repos.identity
        .saveIdentification(castingKey, catalogId)
        .catch((error) => console.warn("[identity] identify failed", error)),
    onClear: () =>
      void repos.identity.clear().catch((error) => console.warn("[identity] clear failed", error)),
  });

  let lastCars = useGarageStore.getState().cars;
  unsubscribeGarage = useGarageStore.subscribe((state) => {
    if (state.cars === lastCars) return;
    lastCars = state.cars;
    refreshAchievements();
  });

  wirePortalBridges(repos.session);
  refreshAchievements();
}

export async function initPersistence(injected?: Partial<PersistenceRepositories>): Promise<void> {
  if (started) return;
  started = true;
  useIdentityStore.getState().loadSeed(IDENTITY_SEED);

  try {
    const resolution = await resolveRepositories(injected);
    await initializeRepositories(resolution.repositories);
    if (resolution.degradedReason) {
      console.log(
        "[persist] SQLite not in this build — using in-memory Race, Garage, History, Settings, Achievements, and Identity repositories.",
      );
      usePersistenceStatusStore.getState().setMemory(resolution.degradedReason);
    } else {
      usePersistenceStatusStore.getState().setDurable();
    }
  } catch (error) {
    console.warn("[persist] init failed; using in-memory stores", error);
    try {
      await initializeRepositories(createInMemoryRepositories());
    } catch (fallbackError) {
      console.warn("[persist] in-memory fallback failed", fallbackError);
      if (!useSettingsStore.getState().hydrated) useSettingsStore.getState().hydrate({});
    }
    usePersistenceStatusStore.getState().setMemory("initFailed");
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

  // Learn which casting a tag is whenever a decoded detection carries a Mattel id.
  // This is the only coupling identity adds to the portal path — a pure read of
  // `car.mattelId` → castingKey → identity store (which persists via its sink).
  const learnIdentity = (uid: string | null, mattelId: string | undefined): void => {
    if (!uid || !mattelId) return;
    const castingKey = castingKeyFromMattelId(mattelId);
    if (castingKey) useIdentityStore.getState().linkCar(uid, castingKey);
  };

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
    learnIdentity(lastUid, seed.car?.mattelId);
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
      learnIdentity(uid, state.car?.mattelId);
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
  usePersistenceStatusStore.getState().reset();
  setRacePersistence(null);
  setGaragePersistence(null);
  setSessionRepository(null);
  setSettingsPersistence(null);
  setAchievementsPersistence(null);
  setIdentityPersistence(null);
  if (unsubscribePortal) {
    unsubscribePortal();
    unsubscribePortal = null;
  }
  if (unsubscribeGarage) {
    unsubscribeGarage();
    unsubscribeGarage = null;
  }
}
