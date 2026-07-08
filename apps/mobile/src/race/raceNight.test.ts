import { describe, expect, it } from "vitest";

import {
  DEFAULT_RACER_NAME,
  addRacer,
  advanceLineup,
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
      { id: "racer-1", name: "Ada" },
      { id: "racer-2", name: "Grace" },
    ]);
    expect(addRacer(lineup, "   ")).toBe(lineup);
  });

  it("can pick someone deeper in the queue to be up next", () => {
    const lineup = addRacer(addRacer(addRacer([], "Ada"), "Grace"), "Linus");

    expect(chooseNextRacer(lineup, "racer-3")).toEqual([
      { id: "racer-1", name: "Ada" },
      { id: "racer-3", name: "Linus" },
      { id: "racer-2", name: "Grace" },
    ]);
  });

  it("removes racers and promotes the next queued racer naturally", () => {
    const lineup = addRacer(addRacer(addRacer([], "Ada"), "Grace"), "Linus");

    expect(removeRacer(lineup, "racer-1")).toEqual([
      { id: "racer-2", name: "Grace" },
      { id: "racer-3", name: "Linus" },
    ]);
    expect(removeRacer(lineup, "missing")).toEqual(lineup);
  });

  it("rotates the lineup after each turn and reports who is up next", () => {
    const lineup = addRacer(addRacer(addRacer([], "Ada"), "Grace"), "Linus");
    const rotated = advanceLineup(lineup);

    expect(rotated).toEqual([
      { id: "racer-2", name: "Grace" },
      { id: "racer-3", name: "Linus" },
      { id: "racer-1", name: "Ada" },
    ]);
    expect(nextUpRacer(rotated)).toEqual({ id: "racer-3", name: "Linus" });
    expect(advanceLineup([])).toEqual([]);
  });
});
