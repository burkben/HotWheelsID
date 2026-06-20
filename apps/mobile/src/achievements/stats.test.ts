import { describe, expect, it } from "vitest";

import type { CarRecord } from "../store/persistence/carRepository";
import {
  combineStats,
  emptyStats,
  garageAggregate,
  type RaceAggregate,
} from "./stats";

function car(uid: string, bestMph: number): CarRecord {
  return {
    uid,
    name: null,
    serial: null,
    firstSeen: 0,
    lastSeen: 0,
    detections: 1,
    bestMph,
    bestLap: null,
    races: 0,
  };
}

describe("achievement stats", () => {
  it("emptyStats is a zeroed baseline", () => {
    expect(emptyStats()).toEqual({
      racesFinished: 0,
      totalLaps: 0,
      longestRaceLaps: 0,
      bestLapSeconds: null,
      fastestRaceSeconds: null,
      carsCollected: 0,
      topSpeedMph: 0,
    });
  });

  it("garageAggregate counts cars and tracks the top speed", () => {
    const agg = garageAggregate([car("a", 120), car("b", 305), car("c", 90)]);
    expect(agg).toEqual({ carsCollected: 3, topSpeedMph: 305 });
  });

  it("garageAggregate handles an empty garage", () => {
    expect(garageAggregate([])).toEqual({ carsCollected: 0, topSpeedMph: 0 });
  });

  it("combineStats merges race + garage totals", () => {
    const race: RaceAggregate = {
      racesFinished: 4,
      totalLaps: 42,
      longestRaceLaps: 15,
      bestLapSeconds: 2.4,
      fastestRaceSeconds: 33.1,
    };
    const stats = combineStats(race, { carsCollected: 7, topSpeedMph: 288 });
    expect(stats).toEqual({
      racesFinished: 4,
      totalLaps: 42,
      longestRaceLaps: 15,
      bestLapSeconds: 2.4,
      fastestRaceSeconds: 33.1,
      carsCollected: 7,
      topSpeedMph: 288,
    });
  });
});
