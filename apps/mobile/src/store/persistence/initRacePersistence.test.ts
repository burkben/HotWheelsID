import { beforeEach, describe, expect, it } from "vitest";

import { createRace, type RaceResult } from "../../race/raceEngine";
import { setRacePersistence, useRaceStore } from "../raceStore";
import { initRacePersistence, resetRacePersistenceForTests } from "./initRacePersistence";
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
  resetRacePersistenceForTests();
  setRacePersistence(null);
  useRaceStore.setState({ race: createRace(), leaderboard: [] });
});

describe("initRacePersistence", () => {
  it("hydrates the leaderboard from the injected repository", async () => {
    const repo = new InMemoryRaceRepository();
    await repo.saveResult(makeResult({ player: "Ada", totalTime: 2 }));
    await repo.saveResult(makeResult({ player: "Cy", totalTime: 1 }));

    await initRacePersistence(repo);

    expect(useRaceStore.getState().leaderboard.map((r) => r.player)).toEqual(["Cy", "Ada"]);
  });

  it("wires sinks so clearing the leaderboard clears storage", async () => {
    const repo = new InMemoryRaceRepository();
    await repo.saveResult(makeResult());
    await initRacePersistence(repo);
    expect(await repo.loadResults()).toHaveLength(1);

    useRaceStore.getState().clearLeaderboard();
    await Promise.resolve();

    expect(await repo.loadResults()).toHaveLength(0);
  });

  it("degrades gracefully when the repository cannot initialize", async () => {
    const failing: RaceRepository = {
      init: () => Promise.reject(new Error("Cannot find native module 'ExpoSQLite'")),
      loadResults: () => Promise.resolve([]),
      saveResult: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    };

    // Must not throw — a missing native module degrades to in-memory only.
    await expect(initRacePersistence(failing)).resolves.toBeUndefined();
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

    await initRacePersistence(failing);
    // Same runtime: the guard stays latched, so we do NOT retry (no log spam).
    await initRacePersistence(good);
    expect(useRaceStore.getState().leaderboard).toHaveLength(0);

    // A rebuild restarts the JS runtime; emulate that by resetting the guard.
    resetRacePersistenceForTests();
    useRaceStore.setState({ race: createRace(), leaderboard: [] });
    await initRacePersistence(good);
    expect(useRaceStore.getState().leaderboard.map((r) => r.player)).toEqual(["Ada"]);
  });
});
