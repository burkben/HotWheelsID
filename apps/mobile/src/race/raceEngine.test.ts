import { describe, expect, it } from "vitest";

import {
  abortRace,
  beginCountdown,
  beginRacing,
  configureRace,
  createRace,
  currentLapElapsed,
  finishRace,
  recordGate,
  type RaceState,
} from "./raceEngine";

/** Drive a sequence of gate-crossing timestamps (ms) through a racing state. */
function runGates(state: RaceState, timestamps: number[]): RaceState {
  return timestamps.reduce((s, t) => recordGate(s, t), state);
}

describe("raceEngine — setup & lifecycle", () => {
  it("starts idle with sensible defaults", () => {
    const s = createRace();
    expect(s.phase).toBe("idle");
    expect(s.targetLaps).toBe(10);
    expect(s.lapTimes).toEqual([]);
    expect(s.result).toBeNull();
  });

  it("configures laps/player/car without leaving idle", () => {
    const s = configureRace(createRace(), { targetLaps: 5, player: "Ada", carUid: "AA:BB" });
    expect(s).toMatchObject({ phase: "idle", targetLaps: 5, player: "Ada", carUid: "AA:BB" });
  });

  it("countdown → racing clears any prior laps", () => {
    let s = configureRace(createRace(), { targetLaps: 5 });
    s = beginCountdown(s);
    expect(s.phase).toBe("countdown");
    s = beginRacing(s);
    expect(s).toMatchObject({ phase: "racing", lastGateAt: null, lapTimes: [], result: null });
  });
});

describe("raceEngine — gate timing", () => {
  it("the first gate arms the timer but records no lap (start line)", () => {
    const s = recordGate(beginRacing(configureRace(createRace(), { targetLaps: 5 })), 1000);
    expect(s.lastGateAt).toBe(1000);
    expect(s.lapTimes).toEqual([]);
    expect(s.phase).toBe("racing");
  });

  it("each subsequent gate records a lap in seconds", () => {
    let s = beginRacing(configureRace(createRace(), { targetLaps: 5 }));
    s = runGates(s, [1000, 3000, 5500]); // arm @1s, lap1=2s, lap2=2.5s
    expect(s.lapTimes).toEqual([2, 2.5]);
    expect(s.phase).toBe("racing");
  });

  it("ignores gates unless racing", () => {
    const idle = recordGate(createRace(), 1000);
    expect(idle).toEqual(createRace());

    const countdown = recordGate(beginCountdown(createRace()), 1000);
    expect(countdown.lapTimes).toEqual([]);
    expect(countdown.lastGateAt).toBeNull();
  });
});

describe("raceEngine — finishing & result math", () => {
  it("auto-finishes once targetLaps laps are complete and computes stats", () => {
    // 3-lap race needs 4 crossings (start + 3 laps). Laps: 2s, 5s, 3s.
    let s = beginRacing(configureRace(createRace(), { targetLaps: 3, player: "Ada", carUid: "6C:C4" }));
    s = runGates(s, [0, 2000, 7000, 10000]);

    expect(s.phase).toBe("finished");
    const r = s.result!;
    expect(r.lapCount).toBe(3);
    expect(r.lapTimes).toEqual([2, 5, 3]);
    expect(r.totalTime).toBe(10);
    expect(r.bestLap).toBe(2);
    expect(r.bestLapNum).toBe(1);
    expect(r.worstLap).toBe(5);
    expect(r.worstLapNum).toBe(2);
    expect(r.avgLap).toBeCloseTo(10 / 3, 6);
    expect(r.player).toBe("Ada");
    expect(r.carUid).toBe("6C:C4");
    expect(r.finishedAt).toBe(10000);
  });

  it("does not record further laps after finishing", () => {
    let s = beginRacing(configureRace(createRace(), { targetLaps: 2 }));
    s = runGates(s, [0, 1000, 2000]); // finished after 2 laps
    expect(s.phase).toBe("finished");
    const after = recordGate(s, 3000);
    expect(after).toBe(s); // unchanged reference — no-op once finished
  });

  it("ties resolve to the first occurrence (matches Python .index())", () => {
    let s = beginRacing(configureRace(createRace(), { targetLaps: 3 }));
    s = runGates(s, [0, 1000, 3000, 4000]); // laps 1s, 2s, 1s
    const r = s.result!;
    expect(r.bestLap).toBe(1);
    expect(r.bestLapNum).toBe(1); // first 1s lap, not the third
    expect(r.worstLapNum).toBe(2);
  });

  it("manual finish with no laps returns to idle; with laps it summarizes", () => {
    const armed = recordGate(beginRacing(configureRace(createRace(), { targetLaps: 5, player: "Ada" })), 500);
    const bailed = finishRace(armed, 800);
    expect(bailed.phase).toBe("idle");
    expect(bailed.player).toBe("Ada");

    const oneLap = recordGate(armed, 2500); // a single 2s lap
    const finished = finishRace(oneLap, 2500);
    expect(finished.phase).toBe("finished");
    expect(finished.result!.lapCount).toBe(1);
    expect(finished.result!.totalTime).toBe(2);
  });
});

describe("raceEngine — helpers", () => {
  it("abort keeps the chosen length + player for a rematch", () => {
    let s = beginRacing(configureRace(createRace(), { targetLaps: 15, player: "Ada", carUid: "X" }));
    s = runGates(s, [0, 1000]);
    const reset = abortRace(s);
    expect(reset).toMatchObject({ phase: "idle", targetLaps: 15, player: "Ada", lapTimes: [] });
  });

  it("currentLapElapsed reports seconds since the last gate while racing", () => {
    const armed = recordGate(beginRacing(configureRace(createRace(), { targetLaps: 5 })), 1000);
    expect(currentLapElapsed(armed, 4000)).toBeCloseTo(3, 6);
    expect(currentLapElapsed(createRace(), 4000)).toBe(0); // not racing
  });
});
