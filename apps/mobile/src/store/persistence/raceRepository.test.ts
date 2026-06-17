import { describe, expect, it } from "vitest";

import type { RaceResult } from "../../race/raceEngine";
import { InMemoryRaceRepository } from "./raceRepository";

function makeResult(over: Partial<RaceResult> = {}): RaceResult {
  return {
    player: "Ben",
    carUid: "AA11",
    lapCount: 2,
    lapTimes: [1.2, 1.4],
    totalTime: 2.6,
    bestLap: 1.2,
    bestLapNum: 1,
    worstLap: 1.4,
    worstLapNum: 2,
    avgLap: 1.3,
    finishedAt: 1000,
    ...over,
  };
}

describe("InMemoryRaceRepository", () => {
  it("round-trips saved results", async () => {
    const repo = new InMemoryRaceRepository();
    await repo.init();
    await repo.saveResult(makeResult({ finishedAt: 1 }));
    await repo.saveResult(makeResult({ finishedAt: 2, totalTime: 9 }));

    const loaded = await repo.loadResults();
    expect(loaded).toHaveLength(2);
    expect(loaded.map((r) => r.finishedAt)).toEqual([1, 2]);
    expect(loaded[1].totalTime).toBe(9);
  });

  it("clears all results", async () => {
    const repo = new InMemoryRaceRepository();
    await repo.saveResult(makeResult());
    await repo.clear();
    expect(await repo.loadResults()).toHaveLength(0);
  });

  it("returns copies so callers cannot mutate stored state", async () => {
    const repo = new InMemoryRaceRepository();
    await repo.saveResult(makeResult());
    const loaded = await repo.loadResults();
    (loaded[0].lapTimes as number[]).push(99);
    const again = await repo.loadResults();
    expect(again[0].lapTimes).toEqual([1.2, 1.4]);
  });
});
