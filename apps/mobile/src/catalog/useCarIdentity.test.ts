import { afterEach, describe, expect, it } from "vitest";

import { useIdentityStore } from "../store/identityStore";
import {
  castingCoverageForUid,
  identifyCar,
  undoIdentification,
} from "./useCarIdentity";

afterEach(() => {
  useIdentityStore.setState({ links: {}, identifications: {}, seed: {}, hydrated: false });
});

describe("castingCoverageForUid", () => {
  it("counts every garage car that shares the same casting key", () => {
    expect(
      castingCoverageForUid(
        "uid-1",
        { "uid-1": "cast-a", "uid-2": "cast-a", "uid-3": "cast-b" },
        [{ uid: "uid-1" }, { uid: "uid-2" }, { uid: "uid-3" }],
      ),
    ).toEqual({
      castingKey: "cast-a",
      totalCars: 2,
      otherCars: 1,
      synthetic: false,
    });

  });

  it("falls back to one car when the current uid is linked but not present in the garage snapshot", () => {
    expect(castingCoverageForUid("uid-9", { "uid-9": "cast-a" }, [{ uid: "uid-1" }])).toEqual({
      castingKey: "cast-a",
      totalCars: 1,
      otherCars: 0,
      synthetic: false,
    });
  });

  describe("identification confirmation helpers", () => {
    it("undo restores the prior user identification", () => {
      useIdentityStore.setState({
        links: { uid1: "keyA" },
        identifications: { keyA: "car-before" },
      });

      const change = identifyCar("uid1", "car-after");
      expect(useIdentityStore.getState().identifications.keyA).toBe("car-after");

      undoIdentification(change!);
      expect(useIdentityStore.getState().identifications.keyA).toBe("car-before");
    });

    it("undo removes a new override so the seed is visible again", () => {
      useIdentityStore.setState({
        links: { uid1: "keyA" },
        identifications: {},
        seed: { keyA: "seed-car" },
      });

      const change = identifyCar("uid1", "wrong-car");
      undoIdentification(change!);

      expect(useIdentityStore.getState().identifications).toEqual({});
      expect(useIdentityStore.getState().seed?.keyA).toBe("seed-car");
    });
  });

  it("marks per-uid synthetic links", () => {
    expect(castingCoverageForUid("uid-1", { "uid-1": "uid:uid-1" }, [{ uid: "uid-1" }])).toEqual({
      castingKey: "uid:uid-1",
      totalCars: 1,
      otherCars: 0,
      synthetic: true,
    });
  });

  it("returns undefined when the uid is absent or not linked", () => {
    expect(castingCoverageForUid(undefined, { "uid-1": "cast-a" }, [{ uid: "uid-1" }])).toBeUndefined();
    expect(castingCoverageForUid("uid-2", { "uid-1": "cast-a" }, [{ uid: "uid-1" }])).toBeUndefined();
  });
});
