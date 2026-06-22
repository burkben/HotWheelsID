import { beforeEach, describe, expect, it, vi } from "vitest";

import { setGaragePersistence, useGarageStore } from "./garageStore";
import type { CarRecord } from "./persistence/carRepository";

function car(over: Partial<CarRecord> = {}): CarRecord {
  return {
    uid: "AA",
    name: null,
    serial: null,
    firstSeen: 0,
    lastSeen: 0,
    detections: 1,
    bestMph: 0,
    bestLap: null,
    races: 0,
    mattelId: null,
    modelId: null,
    ...over,
  };
}

beforeEach(() => {
  setGaragePersistence(null);
  useGarageStore.setState({ cars: [], castingNames: {} });
});

describe("garageStore", () => {
  it("hydrates most-recently-seen first", () => {
    useGarageStore.getState().hydrate([
      car({ uid: "OLD", lastSeen: 1 }),
      car({ uid: "NEW", lastSeen: 9 }),
    ]);
    expect(useGarageStore.getState().cars.map((c) => c.uid)).toEqual(["NEW", "OLD"]);
  });

  it("records a detection and fires the onDetection sink", () => {
    const onDetection = vi.fn();
    setGaragePersistence({ onDetection });

    useGarageStore.getState().recordDetection({ uid: "AA", serial: "S1", at: 5 });

    const [c] = useGarageStore.getState().cars;
    expect(c).toMatchObject({ uid: "AA", serial: "S1", detections: 1 });
    expect(onDetection).toHaveBeenCalledWith({ uid: "AA", serial: "S1", at: 5 });
  });

  it("keeps best speed monotonic and fires the onSpeed sink", () => {
    const onSpeed = vi.fn();
    setGaragePersistence({ onSpeed });

    useGarageStore.getState().recordSpeed({ uid: "AA", mph: 15, at: 1 });
    useGarageStore.getState().recordSpeed({ uid: "AA", mph: 9, at: 2 });

    expect(useGarageStore.getState().cars[0].bestMph).toBe(15);
    expect(onSpeed).toHaveBeenCalledTimes(2);
  });

  it("renames a car and fires the onRename sink", () => {
    const onRename = vi.fn();
    setGaragePersistence({ onRename });
    useGarageStore.getState().recordDetection({ uid: "AA", at: 1 });

    useGarageStore.getState().rename("AA", "Bone Shaker");

    expect(useGarageStore.getState().cars[0].name).toBe("Bone Shaker");
    expect(onRename).toHaveBeenCalledWith("AA", "Bone Shaker");
  });

  it("records casting identity and fires the onIdentity sink", () => {
    const onIdentity = vi.fn();
    setGaragePersistence({ onIdentity });
    useGarageStore.getState().recordDetection({ uid: "AA", at: 1 });

    const input = { uid: "AA", mattelId: "AQBBrl5b", modelId: "41AE5E5B", at: 2 };
    useGarageStore.getState().recordIdentity(input);

    expect(useGarageStore.getState().cars[0]).toMatchObject({ modelId: "41AE5E5B", mattelId: "AQBBrl5b" });
    expect(onIdentity).toHaveBeenCalledWith(input);
  });

  it("names a casting (trimmed, uppercased key) and fires the onNameCasting sink", () => {
    const onNameCasting = vi.fn();
    setGaragePersistence({ onNameCasting });

    useGarageStore.getState().nameCasting("41ae5e5b", "  Twin Mill ");

    expect(useGarageStore.getState().castingNames).toEqual({ "41AE5E5B": "Twin Mill" });
    expect(onNameCasting).toHaveBeenCalledWith("41ae5e5b", "  Twin Mill "); // sink gets raw input; repo normalizes
  });

  it("clears a casting name when set to null or blank", () => {
    useGarageStore.setState({ castingNames: { "41AE5E5B": "Twin Mill" } });
    useGarageStore.getState().nameCasting("41AE5E5B", null);
    expect(useGarageStore.getState().castingNames).toEqual({});
  });

  it("hydrateCastingNames replaces the whole map", () => {
    useGarageStore.setState({ castingNames: { "41AE5E5B": "Twin Mill" } });
    useGarageStore.getState().hydrateCastingNames({ "00FF00FF": "Bone Shaker" });
    expect(useGarageStore.getState().castingNames).toEqual({ "00FF00FF": "Bone Shaker" });
  });

  it("forgetAll clears and fires the onClear sink", () => {
    const onClear = vi.fn();
    setGaragePersistence({ onClear });
    useGarageStore.getState().recordDetection({ uid: "AA", at: 1 });

    useGarageStore.getState().forgetAll();

    expect(useGarageStore.getState().cars).toHaveLength(0);
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("never throws when persistence sinks are unset (CI path)", () => {
    expect(() => {
      useGarageStore.getState().recordDetection({ uid: "AA", at: 1 });
      useGarageStore.getState().recordSpeed({ uid: "AA", mph: 3, at: 2 });
      useGarageStore.getState().recordIdentity({ uid: "AA", mattelId: "M", modelId: "ABCD", at: 3 });
      useGarageStore.getState().rename("AA", "X");
      useGarageStore.getState().nameCasting("ABCD", "Y");
      useGarageStore.getState().forgetAll();
    }).not.toThrow();
  });
});
