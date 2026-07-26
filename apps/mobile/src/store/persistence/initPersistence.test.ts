import { beforeEach, describe, expect, it } from "vitest";

import { createRace, type RaceResult } from "../../race/raceEngine";
import { useAchievementsStore } from "../achievementsStore";
import { useGarageStore } from "../garageStore";
import { useIdentityStore } from "../identityStore";
import { usePortalStore } from "../portalStore";
import { useRaceStore } from "../raceStore";
import { DEFAULT_SETTINGS, useSettingsStore } from "../settingsStore";
import { InMemoryAchievementsRepository } from "./achievementsRepository";
import { InMemoryCarRepository } from "./carRepository";
import { getSessionRepository } from "./historyAccess";
import { InMemoryIdentityRepository } from "./identityRepository";
import { initPersistence, resetPersistenceForTests } from "./initPersistence";
import { InMemoryRaceRepository, type RaceRepository } from "./raceRepository";
import { InMemorySessionRepository } from "./sessionRepository";
import { InMemorySettingsRepository } from "./settingsRepository";
import { emptyStats } from "../../achievements/stats";

/** Flush pending micro + macro tasks so async repo writes settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function makeResult(over: Partial<RaceResult> = {}): RaceResult {
  return {
    player: "Ben",
    carUid: "AA11",
    lapCount: 1,
    lapTimes: [1],
    totalTime: 1,
    bestLap: 1,
    bestLapNum: 1,
    worstLap: 1,
    worstLapNum: 1,
    avgLap: 1,
    finishedAt: 0,
    ...over,
  };
}

beforeEach(() => {
  resetPersistenceForTests();
  useRaceStore.setState({ race: createRace(), leaderboard: [] });
  useGarageStore.setState({ cars: [] });
  useIdentityStore.setState({ links: {}, identifications: {}, seed: {}, hydrated: false });
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, hydrated: false });
  useAchievementsStore.setState({ unlocked: {}, stats: emptyStats(), hydrated: false });
  usePortalStore.getState().reset();
});

describe("initPersistence", () => {
  it("skips SQLite entirely when the native module is absent (nothing injected)", async () => {
    // Mirrors a dev client built before expo-sqlite: globalThis.expo is undefined
    // in Node, so the probe is falsy and we must NOT import the native adapters.
    // Regression guard for the LogBox red screen ("Cannot find native module
    // 'ExpoSQLite'" / "Requiring unknown module").
    expect(
      (globalThis as { expo?: unknown }).expo,
      "test env unexpectedly exposes globalThis.expo",
    ).toBeUndefined();

    await expect(initPersistence()).resolves.toBeUndefined();
    expect(useRaceStore.getState().leaderboard).toHaveLength(0);
    expect(useGarageStore.getState().cars).toHaveLength(0);
    // Settings still report "loaded" (at defaults) so hydration-gated UI proceeds.
    expect(useSettingsStore.getState().hydrated).toBe(true);

    // No sinks registered, so finishing a race must not throw.
    const store = useRaceStore.getState();
    store.configure({ targetLaps: 1, player: "Ada", carUid: "C0DE" });
    store.startRacing();
    useRaceStore.getState().gate(0);
    expect(() => useRaceStore.getState().gate(500)).not.toThrow();
  });

  it("hydrates the leaderboard from the injected race repository", async () => {
    const race = new InMemoryRaceRepository();
    await race.saveResult(makeResult({ player: "Ada", totalTime: 2 }));
    await race.saveResult(makeResult({ player: "Cy", totalTime: 1 }));

    await initPersistence({ race });

    expect(useRaceStore.getState().leaderboard.map((r) => r.player)).toEqual(["Cy", "Ada"]);
  });

  it("hydrates the garage from the injected car repository", async () => {
    const car = new InMemoryCarRepository();
    await car.recordDetection({ uid: "OLD", at: 100 });
    await car.recordDetection({ uid: "NEW", at: 500 });

    await initPersistence({ car });

    expect(useGarageStore.getState().cars.map((c) => c.uid)).toEqual(["NEW", "OLD"]);
  });

  it("hydrates settings from the injected settings repository", async () => {
    const settings = new InMemorySettingsRepository();
    await settings.save("playerName", "Ace");
    await settings.save("defaultLaps", 20);
    await settings.save("mockModeDefault", true);

    await initPersistence({ settings });

    const s = useSettingsStore.getState();
    expect(s).toMatchObject({ playerName: "Ace", defaultLaps: 20, mockModeDefault: true });
    expect(s.haptics).toBe(DEFAULT_SETTINGS.haptics); // unset key stays default
    expect(s.hydrated).toBe(true);
  });

  it("wires settings sinks so edits persist and reset clears storage", async () => {
    const settings = new InMemorySettingsRepository();
    await initPersistence({ settings });

    useSettingsStore.getState().setPlayerName("Ben");
    useSettingsStore.getState().setHaptics(false);
    await Promise.resolve();
    expect(await settings.load()).toMatchObject({ playerName: "Ben", haptics: false });

    useSettingsStore.getState().reset();
    await Promise.resolve();
    expect(await settings.load()).toEqual({});
  });

  it("wires race sinks so clearing the leaderboard clears storage", async () => {
    const race = new InMemoryRaceRepository();
    await race.saveResult(makeResult());
    await initPersistence({ race });
    expect(await race.loadResults()).toHaveLength(1);

    useRaceStore.getState().clearLeaderboard();
    await Promise.resolve();

    expect(await race.loadResults()).toHaveLength(0);
  });

  it("wires garage sinks so renaming persists through the repository", async () => {
    const car = new InMemoryCarRepository();
    await car.recordDetection({ uid: "AA", at: 1 });
    await initPersistence({ car });

    useGarageStore.getState().rename("AA", "Twin Mill");
    await Promise.resolve();

    expect((await car.getCars())[0].name).toBe("Twin Mill");
  });

  it("wires identity removal so Undo persists without clearing casting links", async () => {
    const identity = new InMemoryIdentityRepository();
    await identity.saveLink("uid-1", "key-1");
    await identity.saveIdentification("key-1", "car-1");
    await initPersistence({ identity });

    useIdentityStore.getState().forgetIdentification("key-1");
    await flush();

    expect(await identity.load()).toEqual({
      links: { "uid-1": "key-1" },
      identifications: {},
    });
  });

  it("bridges portal car detections and passes into the garage", async () => {
    const car = new InMemoryCarRepository();
    await initPersistence({ car });

    const portal = usePortalStore.getState();
    portal.setConnection("connected");
    portal.dispatch({ kind: "carDetected", uid: "6C:C4" });
    portal.dispatch({ kind: "serial", serial: "1102032557" });
    portal.dispatch({ kind: "speed", raw: 100, scaleMph: 18 });
    await Promise.resolve();

    const [c] = useGarageStore.getState().cars;
    expect(c).toMatchObject({ uid: "6C:C4", serial: "1102032557", detections: 1, bestMph: 18 });
    expect((await car.getCars())[0]).toMatchObject({ uid: "6C:C4", bestMph: 18 });
  });

  it("backfills a car already on the portal at init, without double-counting", async () => {
    // A car is present before the bridge subscribes (init ran after connect):
    // subscribe only sees future changes, so the bridge must seed it once.
    const portal = usePortalStore.getState();
    portal.setConnection("connected");
    portal.dispatch({ kind: "carDetected", uid: "AA:BB" });

    const car = new InMemoryCarRepository();
    await initPersistence({ car });

    // A later pass for the same car must not add a second detection.
    usePortalStore.getState().dispatch({ kind: "speed", raw: 50, scaleMph: 12 });
    await Promise.resolve();

    const cars = await car.getCars();
    expect(cars).toHaveLength(1);
    expect(cars[0]).toMatchObject({ uid: "AA:BB", detections: 1, bestMph: 12 });
  });

  it("bridges portal connection + passes into history sessions", async () => {
    const session = new InMemorySessionRepository();
    await initPersistence({ session });

    const portal = usePortalStore.getState();
    portal.setConnection("connected");
    await flush(); // let startSession resolve before passes arrive

    portal.dispatch({ kind: "carDetected", uid: "6C:C4" });
    portal.dispatch({ kind: "serial", serial: "1102032557" });
    portal.dispatch({ kind: "speed", raw: 100, scaleMph: 18 });
    portal.dispatch({ kind: "speed", raw: 60, scaleMph: 9 });
    await flush();

    portal.setConnection("disconnected");
    await flush();

    const sessions = await session.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ passCount: 2, bestMph: 18 });
    expect(sessions[0].endedAt).not.toBeNull();

    const passes = await session.passesForSession(sessions[0].id);
    expect(passes).toHaveLength(2);
    expect(passes[0]).toMatchObject({ carUid: "6C:C4", serial: "1102032557" });
  });

  it("opens a fresh session on each reconnect and closes it on disconnect", async () => {
    const session = new InMemorySessionRepository();
    await initPersistence({ session });
    const portal = usePortalStore.getState();

    for (let i = 0; i < 2; i++) {
      portal.setConnection("connected");
      await flush();
      portal.setConnection("disconnected");
      await flush();
    }

    const sessions = await session.listSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.endedAt != null)).toBe(true);
  });

  it("publishes the session repository for History screens, and clears it on reset", async () => {
    const session = new InMemorySessionRepository();
    await initPersistence({ session });
    expect(getSessionRepository()).toBe(session);

    resetPersistenceForTests();
    expect(getSessionRepository()).toBeNull();
  });

  it("does not misattribute passes when a connection drops before its session opens", async () => {
    // Race: connect then disconnect *before* the async startSession resolves. The
    // epoch guard must close that orphan session and open a fresh one on reconnect,
    // so a later pass belongs to the new session — never the stale one.
    const session = new InMemorySessionRepository();
    await initPersistence({ session });
    const portal = usePortalStore.getState();

    portal.setConnection("connected");
    portal.setConnection("disconnected"); // no flush between — startSession still pending
    await flush();

    portal.setConnection("connected");
    await flush();
    portal.dispatch({ kind: "carDetected", uid: "AA:BB" });
    portal.dispatch({ kind: "speed", raw: 100, scaleMph: 14 });
    await flush();

    const sessions = await session.listSessions();
    expect(sessions).toHaveLength(2);

    // Exactly one session holds the pass; the other is an empty, properly-ended orphan.
    const counts = await Promise.all(
      sessions.map(async (s) => ({
        endedAt: s.endedAt,
        passes: (await session.passesForSession(s.id)).length,
      })),
    );
    expect(counts.map((c) => c.passes).sort()).toEqual([0, 1]);
    const orphan = counts.find((c) => c.passes === 0);
    expect(orphan?.endedAt).not.toBeNull();
  });

  it("degrades gracefully when a repository cannot initialize", async () => {
    const race: RaceRepository = {
      init: () => Promise.reject(new Error("Cannot find native module 'ExpoSQLite'")),
      loadResults: () => Promise.resolve([]),
      saveResult: () => Promise.resolve(),
      aggregate: () =>
        Promise.resolve({
          racesFinished: 0,
          totalLaps: 0,
          longestRaceLaps: 0,
          bestLapSeconds: null,
          fastestRaceSeconds: null,
        }),
      clear: () => Promise.resolve(),
    };

    await expect(initPersistence({ race })).resolves.toBeUndefined();
    expect(useRaceStore.getState().leaderboard).toHaveLength(0);
  });

  it("is one-shot per runtime; a rebuilt client (guard reset) hydrates", async () => {
    const failing: RaceRepository = {
      init: () => Promise.reject(new Error("Cannot find native module 'ExpoSQLite'")),
      loadResults: () => Promise.resolve([]),
      saveResult: () => Promise.resolve(),
      aggregate: () =>
        Promise.resolve({
          racesFinished: 0,
          totalLaps: 0,
          longestRaceLaps: 0,
          bestLapSeconds: null,
          fastestRaceSeconds: null,
        }),
      clear: () => Promise.resolve(),
    };
    const good = new InMemoryRaceRepository();
    await good.saveResult(makeResult({ player: "Ada" }));

    await initPersistence({ race: failing });
    // Same runtime: the guard stays latched, so we do NOT retry (no log spam).
    await initPersistence({ race: good });
    expect(useRaceStore.getState().leaderboard).toHaveLength(0);

    // A rebuild restarts the JS runtime; emulate that by resetting the guard.
    resetPersistenceForTests();
    useRaceStore.setState({ race: createRace(), leaderboard: [] });
    await initPersistence({ race: good });
    expect(useRaceStore.getState().leaderboard.map((r) => r.player)).toEqual(["Ada"]);
  });

  it("unlocks achievements retroactively from durable totals and persists them", async () => {
    const race = new InMemoryRaceRepository();
    // A finished 20-lap race with a sub-3 best lap → race-first, race-marathon, lap-sub3.
    await race.saveResult(
      makeResult({ lapCount: 20, totalTime: 40, bestLap: 2.5, lapTimes: Array(20).fill(2) }),
    );
    const achievements = new InMemoryAchievementsRepository();

    await initPersistence({ race, achievements });
    await flush();

    const unlocked = useAchievementsStore.getState().unlocked;
    expect(unlocked["race-first"]).toBeDefined();
    expect(unlocked["race-marathon"]).toBeDefined();
    expect(unlocked["lap-sub3"]).toBeDefined();
    // Persisted, so a relaunch would rehydrate them.
    expect(Object.keys(await achievements.loadUnlocked()).sort()).toEqual(
      ["lap-sub3", "race-first", "race-marathon"].sort(),
    );
  });

  it("unlocks a collection achievement when the garage gains a car", async () => {
    const achievements = new InMemoryAchievementsRepository();
    await initPersistence({ achievements });
    await flush();
    expect(useAchievementsStore.getState().unlocked["collect-1"]).toBeUndefined();

    // A detected car flows portal → garage → achievements refresh.
    usePortalStore.getState().dispatch({ kind: "carDetected", uid: "AA:BB:CC" });
    await flush();
    expect(useAchievementsStore.getState().unlocked["collect-1"]).toBeDefined();
    expect((await achievements.loadUnlocked())["collect-1"]).toBeDefined();
  });

  it("banking a new race unlocks first-finish through the race sink", async () => {
    const achievements = new InMemoryAchievementsRepository();
    await initPersistence({ achievements });
    await flush();
    expect(useAchievementsStore.getState().unlocked["race-first"]).toBeUndefined();

    // Drive the race store to a finish; its onResult sink saves then refreshes.
    const store = useRaceStore.getState();
    store.configure({ targetLaps: 1, player: "Ben", carUid: "AA11" });
    store.startRacing();
    useRaceStore.getState().gate(0); // arm
    useRaceStore.getState().gate(1000); // lap 1 → finish
    await flush();

    expect(useAchievementsStore.getState().unlocked["race-first"]).toBeDefined();
    expect((await achievements.loadUnlocked())["race-first"]).toBeDefined();
  });
});
