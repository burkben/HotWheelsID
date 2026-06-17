import { beforeEach, describe, expect, it } from "vitest";

import { createRace, type RaceResult } from "../../race/raceEngine";
import { useGarageStore } from "../garageStore";
import { usePortalStore } from "../portalStore";
import { useRaceStore } from "../raceStore";
import { InMemoryCarRepository } from "./carRepository";
import { initPersistence, resetPersistenceForTests } from "./initPersistence";
import { InMemoryRaceRepository, type RaceRepository } from "./raceRepository";

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

  it("degrades gracefully when a repository cannot initialize", async () => {
    const race: RaceRepository = {
      init: () => Promise.reject(new Error("Cannot find native module 'ExpoSQLite'")),
      loadResults: () => Promise.resolve([]),
      saveResult: () => Promise.resolve(),
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
});
