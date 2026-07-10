import { describe, expect, it } from "vitest";

import {
  DEFAULT_RACER_NAME,
  addRacer,
  advanceLineup,
  assignCar,
  carForCurrentRacer,
  chooseNextRacer,
  currentRacerName,
  nextUpRacer,
  removeRacer,
} from "./raceNight";

describe("raceNight", () => {
  it("uses the queued current racer before falling back to the draft name", () => {
    const lineup = addRacer([], "Ada");

    expect(currentRacerName(lineup, "Grace")).toBe("Ada");
    expect(currentRacerName([], "  Grace  ")).toBe("Grace");
    expect(currentRacerName([], "   ")).toBe(DEFAULT_RACER_NAME);
  });

  it("adds trimmed racers with stable incrementing ids and ignores blank input", () => {
    const lineup = addRacer(addRacer([], " Ada "), "Grace");

    expect(lineup).toEqual([
      { id: "racer-1", name: "Ada", carUid: null },
      { id: "racer-2", name: "Grace", carUid: null },
    ]);
    expect(addRacer(lineup, "   ")).toBe(lineup);
  });

  it("captures the car a racer is added with", () => {
    const lineup = addRacer(addRacer([], "Ada", "car:aa"), "Grace");

    expect(lineup).toEqual([
      { id: "racer-1", name: "Ada", carUid: "car:aa" },
      { id: "racer-2", name: "Grace", carUid: null },
    ]);
  });

  it("assigns and clears a racer's car without touching others", () => {
    const lineup = addRacer(addRacer([], "Ada"), "Grace");

    const assigned = assignCar(lineup, "racer-1", "car:aa");
    expect(assigned).toEqual([
      { id: "racer-1", name: "Ada", carUid: "car:aa" },
      { id: "racer-2", name: "Grace", carUid: null },
    ]);

    const cleared = assignCar(assigned, "racer-1", null);
    expect(cleared[0].carUid).toBeNull();
    expect(assignCar(lineup, "missing", "car:zz")).toEqual(lineup);
  });

  it("runs the current racer's car, falling back to the live portal car", () => {
    const withCar = addRacer([], "Ada", "car:aa");
    expect(carForCurrentRacer(withCar, "car:live")).toBe("car:aa");

    const noCar = addRacer([], "Ada");
    expect(carForCurrentRacer(noCar, "car:live")).toBe("car:live");

    // Solo race (empty lineup) falls straight through to the portal car.
    expect(carForCurrentRacer([], "car:live")).toBe("car:live");
    expect(carForCurrentRacer([], null)).toBeNull();
  });

  it("can pick someone deeper in the queue to be up next, keeping their car", () => {
    const lineup = addRacer(
      addRacer(addRacer([], "Ada"), "Grace"),
      "Linus",
      "car:linus",
    );

    expect(chooseNextRacer(lineup, "racer-3")).toEqual([
      { id: "racer-1", name: "Ada", carUid: null },
      { id: "racer-3", name: "Linus", carUid: "car:linus" },
      { id: "racer-2", name: "Grace", carUid: null },
    ]);
  });

  it("removes racers and promotes the next queued racer naturally", () => {
    const lineup = addRacer(addRacer(addRacer([], "Ada"), "Grace"), "Linus");

    expect(removeRacer(lineup, "racer-1")).toEqual([
      { id: "racer-2", name: "Grace", carUid: null },
      { id: "racer-3", name: "Linus", carUid: null },
    ]);
    expect(removeRacer(lineup, "missing")).toEqual(lineup);
  });

  it("rotates the lineup after each turn and reports who is up next", () => {
    const lineup = addRacer(addRacer(addRacer([], "Ada"), "Grace"), "Linus");
    const rotated = advanceLineup(lineup);

    expect(rotated).toEqual([
      { id: "racer-2", name: "Grace", carUid: null },
      { id: "racer-3", name: "Linus", carUid: null },
      { id: "racer-1", name: "Ada", carUid: null },
    ]);
    expect(nextUpRacer(rotated)).toEqual({ id: "racer-3", name: "Linus", carUid: null });
    expect(advanceLineup([])).toEqual([]);
  });
});
