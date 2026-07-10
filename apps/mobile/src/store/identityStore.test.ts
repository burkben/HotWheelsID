import { afterEach, describe, expect, it, vi } from "vitest";

import {
  catalogIdForUid,
  setIdentityPersistence,
  useIdentityStore,
  type IdentityState,
} from "./identityStore";

const reset = () => {
  setIdentityPersistence(null);
  useIdentityStore.setState({ links: {}, identifications: {}, seed: {}, hydrated: false });
};

afterEach(reset);

describe("identityStore", () => {
  it("hydrates both maps and marks hydrated", () => {
    useIdentityStore.getState().hydrate({
      links: { uid1: "keyA" },
      identifications: { keyA: "car-a" },
    });
    const s = useIdentityStore.getState();
    expect(s.links).toEqual({ uid1: "keyA" });
    expect(s.identifications).toEqual({ keyA: "car-a" });
    expect(s.hydrated).toBe(true);
  });

  it("linkCar records uid → castingKey and fires the sink once", () => {
    const onLink = vi.fn();
    setIdentityPersistence({ onLink, onIdentify: vi.fn(), onClear: vi.fn() });

    useIdentityStore.getState().linkCar("uid1", "keyA");
    useIdentityStore.getState().linkCar("uid1", "keyA"); // unchanged — no second write

    expect(useIdentityStore.getState().links).toEqual({ uid1: "keyA" });
    expect(onLink).toHaveBeenCalledTimes(1);
    expect(onLink).toHaveBeenCalledWith("uid1", "keyA");
  });

  it("identify records castingKey → catalogId and fires the sink", () => {
    const onIdentify = vi.fn();
    setIdentityPersistence({ onLink: vi.fn(), onIdentify, onClear: vi.fn() });

    useIdentityStore.getState().identify("keyA", "70-dodge-charger-r-t");

    expect(useIdentityStore.getState().identifications).toEqual({
      keyA: "70-dodge-charger-r-t",
    });
    expect(onIdentify).toHaveBeenCalledWith("keyA", "70-dodge-charger-r-t");
  });

  it("ignores empty uid/castingKey/catalogId", () => {
    const sink = { onLink: vi.fn(), onIdentify: vi.fn(), onClear: vi.fn() };
    setIdentityPersistence(sink);

    useIdentityStore.getState().linkCar("", "keyA");
    useIdentityStore.getState().linkCar("uid1", "");
    useIdentityStore.getState().identify("", "car");
    useIdentityStore.getState().identify("keyA", "");

    expect(useIdentityStore.getState().links).toEqual({});
    expect(useIdentityStore.getState().identifications).toEqual({});
    expect(sink.onLink).not.toHaveBeenCalled();
    expect(sink.onIdentify).not.toHaveBeenCalled();
  });

  it("reset clears both maps and fires onClear", () => {
    const onClear = vi.fn();
    setIdentityPersistence({ onLink: vi.fn(), onIdentify: vi.fn(), onClear });
    useIdentityStore.getState().linkCar("uid1", "keyA");

    useIdentityStore.getState().reset();

    expect(useIdentityStore.getState().links).toEqual({});
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("loadSeed stores the seed and reset leaves it intact", () => {
    setIdentityPersistence({ onLink: vi.fn(), onIdentify: vi.fn(), onClear: vi.fn() });
    useIdentityStore.getState().loadSeed({ keyA: "car-a" });
    useIdentityStore.getState().linkCar("uid1", "keyB");

    useIdentityStore.getState().reset();

    // user data cleared, bundled reference seed survives
    expect(useIdentityStore.getState().links).toEqual({});
    expect(useIdentityStore.getState().identifications).toEqual({});
    expect(useIdentityStore.getState().seed).toEqual({ keyA: "car-a" });
  });
});

describe("catalogIdForUid", () => {
  const state: IdentityState = {
    links: { uid1: "keyA", uid2: "keyB" },
    identifications: { keyA: "car-a" },
  };

  it("resolves uid → castingKey → catalogId", () => {
    expect(catalogIdForUid(state, "uid1")).toBe("car-a");
  });

  it("returns undefined when the casting isn't identified yet", () => {
    expect(catalogIdForUid(state, "uid2")).toBeUndefined();
  });

  it("returns undefined for an unknown or empty uid", () => {
    expect(catalogIdForUid(state, "nope")).toBeUndefined();
    expect(catalogIdForUid(state, undefined)).toBeUndefined();
  });

  it("falls back to the seed when the user hasn't identified the casting", () => {
    const seeded: IdentityState = {
      links: { uid1: "keyA", uid2: "keyB" },
      identifications: { keyA: "car-a" },
      seed: { keyA: "seed-a", keyB: "seed-b" },
    };
    // user's own pick wins over the seed
    expect(catalogIdForUid(seeded, "uid1")).toBe("car-a");
    // seed fills the gap for an un-identified casting
    expect(catalogIdForUid(seeded, "uid2")).toBe("seed-b");
  });
});
