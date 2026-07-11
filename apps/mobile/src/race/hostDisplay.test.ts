import { describe, expect, it } from "vitest";

import { beginRacing, configureRace, createRace, recordGate } from "./raceEngine";
import { formatRaceTime, raceHostSnapshot } from "./hostDisplay";

describe("formatRaceTime", () => {
  it("formats seconds and minute-length times", () => {
    expect(formatRaceTime(12.345)).toBe("12.35s");
    expect(formatRaceTime(62.345)).toBe("1:02.34");
    expect(formatRaceTime(Number.NaN)).toBe("—");
  });
});

describe("raceHostSnapshot", () => {
  it("shows the armed state before the first gate crossing", () => {
    const race = beginRacing(configureRace(createRace(), { player: "Mia", targetLaps: 5 }));

    expect(raceHostSnapshot(race, 1_000)).toMatchObject({
      phaseLabel: "Cross the line to start",
      racer: "Mia",
      lap: "0 / 5",
      primaryValue: "READY",
    });
  });

  it("shows the live lap and completed-lap stats", () => {
    let race = beginRacing(configureRace(createRace(), { player: "Leo", targetLaps: 5 }));
    race = recordGate(race, 1_000);
    race = recordGate(race, 3_500);

    expect(raceHostSnapshot(race, 5_000)).toMatchObject({
      phaseLabel: "Race live",
      lap: "2 / 5",
      primaryValue: "1.50s",
      lastLap: "2.50s",
      bestLap: "2.50s",
    });
  });
});
