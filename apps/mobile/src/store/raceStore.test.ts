import { beforeEach, describe, expect, it, vi } from "vitest";

import { createRace, type RaceResult } from "../race/raceEngine";
import { InMemoryRaceRepository } from "./persistence/raceRepository";
import { setRacePersistence, useRaceStore } from "./raceStore";

function resetStore() {
  setRacePersistence(null);
  useRaceStore.setState({ race: createRace(), leaderboard: [] });
}

/** Drive the store through a full race: arm + one gate per lap → finish. */
function runRace(player: string, carUid: string, lapMs: number[], startAt = 0) {
  const store = useRaceStore.getState();
  store.configure({ targetLaps: lapMs.length, player, carUid });
  store.startRacing();
  let t = startAt;
  useRaceStore.getState().gate(t); // first crossing arms the start line
  for (const ms of lapMs) {
    t += ms;
    useRaceStore.getState().gate(t);
  }
}

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

beforeEach(resetStore);

describe("useRaceStore leaderboard", () => {
  it("banks a finished race, fastest total time first", () => {
    runRace("Ada", "C0DE", [1000, 1000]); // total 2.0s
    runRace("Cy", "BEEF", [400, 400]); // total 0.8s

    const board = useRaceStore.getState().leaderboard;
    expect(board).toHaveLength(2);
    expect(board[0].player).toBe("Cy");
    expect(board[1].player).toBe("Ada");
  });

  it("hydrate ranks and caps the leaderboard at 20", () => {
    const many = Array.from({ length: 25 }, (_, i) =>
      makeResult({ totalTime: 25 - i, finishedAt: i }),
    );
    useRaceStore.getState().hydrate(many);

    const board = useRaceStore.getState().leaderboard;
    expect(board).toHaveLength(20);
    expect(board[0].totalTime).toBe(1); // fastest survives
    expect(board[19].totalTime).toBe(20);
  });
});

describe("useRaceStore persistence sinks", () => {
  it("fires onResult once with the finished result", () => {
    const onResult = vi.fn();
    setRacePersistence({ onResult });

    runRace("Ada", "C0DE", [500, 500]);

    expect(onResult).toHaveBeenCalledTimes(1);
    expect(onResult.mock.calls[0][0].player).toBe("Ada");
    expect(onResult.mock.calls[0][0].lapCount).toBe(2);
  });

  it("does not fire onResult when a race is aborted mid-way", () => {
    const onResult = vi.fn();
    setRacePersistence({ onResult });

    const store = useRaceStore.getState();
    store.configure({ targetLaps: 3, player: "Ada", carUid: "C0DE" });
    store.startRacing();
    useRaceStore.getState().gate(0);
    useRaceStore.getState().gate(500); // one lap, not finished
    useRaceStore.getState().abort();

    expect(onResult).not.toHaveBeenCalled();
  });

  it("clearLeaderboard empties state and fires onClear", () => {
    const onClear = vi.fn();
    runRace("Ada", "C0DE", [500, 500]);
    setRacePersistence({ onClear });

    useRaceStore.getState().clearLeaderboard();

    expect(useRaceStore.getState().leaderboard).toHaveLength(0);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("persists through a repository and rehydrates after a restart", async () => {
    const repo = new InMemoryRaceRepository();
    await repo.init();
    setRacePersistence({
      onResult: (r) => void repo.saveResult(r),
      onClear: () => void repo.clear(),
    });

    runRace("Ada", "C0DE", [1000, 1000]);
    runRace("Cy", "BEEF", [400, 400]);
    await Promise.resolve();

    expect(await repo.loadResults()).toHaveLength(2);

    // Simulate a fresh launch: clear runtime state, hydrate from storage.
    useRaceStore.setState({ race: createRace(), leaderboard: [] });
    useRaceStore.getState().hydrate(await repo.loadResults());

    const board = useRaceStore.getState().leaderboard;
    expect(board).toHaveLength(2);
    expect(board[0].player).toBe("Cy"); // fastest ranked first
  });
});
