import { describe, expect, it } from "vitest";

import { SOUND_CUES, nextLapCue } from "./cues";

describe("sound cues", () => {
  it("plays a plain lap cue for the first lap (nothing to beat)", () => {
    expect(nextLapCue([12.3])).toBe("lap");
  });

  it("plays a plain lap cue when nothing to compare", () => {
    expect(nextLapCue([])).toBe("lap");
  });

  it("chirps bestLap only when the newest lap beats every earlier lap", () => {
    expect(nextLapCue([12.0, 11.5])).toBe("bestLap");
    expect(nextLapCue([11.5, 12.0])).toBe("lap");
  });

  it("requires a strict improvement — a tie is not a new best", () => {
    expect(nextLapCue([11.5, 11.5])).toBe("lap");
  });

  it("compares against the best earlier lap, not just the previous one", () => {
    // 11.8 beats the prior lap (12.4) but not the earlier best (11.5).
    expect(nextLapCue([11.5, 12.4, 11.8])).toBe("lap");
    expect(nextLapCue([11.5, 12.4, 11.2])).toBe("bestLap");
  });

  it("exposes every cue exactly once", () => {
    expect(new Set(SOUND_CUES).size).toBe(SOUND_CUES.length);
    expect(SOUND_CUES).toEqual([
      "countdownTick",
      "countdownGo",
      "lap",
      "bestLap",
      "finish",
    ]);
  });
});
