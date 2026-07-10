import { describe, expect, it } from "vitest";

import type { CatalogCar } from "../catalog/catalog";
import type { RaceResult } from "./raceEngine";
import {
  canStartRace,
  countdownAnnouncement,
  finishAnnouncement,
  lapAnnouncement,
  portalReadiness,
  presentRaceCar,
  resultPrimaryActionLabel,
} from "./presentation";

const catalogCar: CatalogCar = {
  id: "twin-mill",
  name: "Twin Mill",
  toyNumber: "FXB01",
  series: "HW id",
  year: 2019,
  wave: null,
  bodyColor: "Red",
  image: "https://example.com/twin-mill.jpg",
  wikiPage: null,
};

const result: RaceResult = {
  player: "Ada",
  carUid: "car:aa",
  lapCount: 2,
  lapTimes: [1.2, 1],
  totalTime: 2.2,
  bestLap: 1,
  bestLapNum: 2,
  worstLap: 1.2,
  worstLapNum: 1,
  avgLap: 1.1,
  finishedAt: 100,
};

describe("portalReadiness", () => {
  it("maps connection states to meaningful readiness", () => {
    expect(portalReadiness("connected")).toMatchObject({ label: "Portal ready", ready: true });
    expect(portalReadiness("connecting")).toMatchObject({ label: "Connecting", ready: false });
    expect(portalReadiness("disconnected")).toMatchObject({
      label: "Portal disconnected",
      ready: false,
    });
  });
});

describe("canStartRace", () => {
  it("requires portal readiness for every mode", () => {
    expect(canStartRace("solo", "disconnected", 0)).toBe(false);
    expect(canStartRace("raceNight", "connecting", 2)).toBe(false);
  });

  it("lets Solo start immediately but requires a Race-night lineup", () => {
    expect(canStartRace("solo", "connected", 0)).toBe(true);
    expect(canStartRace("raceNight", "connected", 0)).toBe(false);
    expect(canStartRace("raceNight", "connected", 1)).toBe(true);
  });
});

describe("presentRaceCar", () => {
  it("uses identified catalog names and photos", () => {
    expect(presentRaceCar("car:aa", catalogCar)).toEqual({
      uid: "car:aa",
      name: "Twin Mill",
      image: "https://example.com/twin-mill.jpg",
      identified: true,
    });
  });

  it("falls back to a short uid or contextual empty label", () => {
    expect(presentRaceCar("AA:BB:CC:DD", undefined).name).toBe("CC:DD");
    expect(presentRaceCar(null, undefined, "No car on portal").name).toBe("No car on portal");
  });
});

describe("race action and announcement copy", () => {
  it("names the next racer only when the lineup will advance", () => {
    expect(resultPrimaryActionLabel("raceNight", 3, "Grace")).toBe("Advance to Grace");
    expect(resultPrimaryActionLabel("raceNight", 1, null)).toBe("Race again");
    expect(resultPrimaryActionLabel("solo", 3, "Grace")).toBe("Race again");
  });

  it("builds concise countdown, lap, best-time, and finish announcements", () => {
    expect(countdownAnnouncement(3)).toBe("3");
    expect(countdownAnnouncement(0)).toBe("Go");
    expect(lapAnnouncement(2, 1, true)).toBe("Lap 2, 1.00s, new best time");
    expect(lapAnnouncement(3, 1.2, false)).toBe("Lap 3, 1.20s");
    expect(finishAnnouncement(result, "Grace")).toBe(
      "Ada finished 2 laps in 2.20s. Best lap 1.00s. Up next, Grace.",
    );
  });
});
