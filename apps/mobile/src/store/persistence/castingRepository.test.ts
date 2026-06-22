import { describe, expect, it } from "vitest";

import { applyCastingName, InMemoryCastingRepository } from "./castingRepository";

describe("applyCastingName", () => {
  it("sets a trimmed name under an uppercased key", () => {
    expect(applyCastingName({}, "41ae5e5b", "  Twin Mill ")).toEqual({ "41AE5E5B": "Twin Mill" });
  });

  it("overwrites an existing name", () => {
    expect(applyCastingName({ "41AE5E5B": "Old" }, "41AE5E5B", "New")).toEqual({ "41AE5E5B": "New" });
  });

  it("removes the entry when the name is null or blank", () => {
    expect(applyCastingName({ "41AE5E5B": "Twin Mill" }, "41AE5E5B", null)).toEqual({});
    expect(applyCastingName({ "41AE5E5B": "Twin Mill" }, "41ae5e5b", "   ")).toEqual({});
  });

  it("does not mutate its input", () => {
    const before = { "00FF00FF": "Bone Shaker" };
    const after = applyCastingName(before, "41AE5E5B", "Twin Mill");
    expect(before).toEqual({ "00FF00FF": "Bone Shaker" });
    expect(after).not.toBe(before);
  });
});

describe("InMemoryCastingRepository", () => {
  it("stores, reads back, deletes, and clears names", async () => {
    const repo = new InMemoryCastingRepository();
    await repo.setCastingName("41ae5e5b", "Twin Mill");
    await repo.setCastingName("00FF00FF", "Bone Shaker");
    expect(await repo.getCastingNames()).toEqual({
      "41AE5E5B": "Twin Mill",
      "00FF00FF": "Bone Shaker",
    });

    await repo.setCastingName("41AE5E5B", null); // delete one
    expect(await repo.getCastingNames()).toEqual({ "00FF00FF": "Bone Shaker" });

    await repo.clear();
    expect(await repo.getCastingNames()).toEqual({});
  });

  it("returns a copy, not the internal map", async () => {
    const repo = new InMemoryCastingRepository();
    await repo.setCastingName("ABCD1234", "X");
    const names = await repo.getCastingNames();
    names["ABCD1234"] = "tampered";
    expect((await repo.getCastingNames())["ABCD1234"]).toBe("X");
  });
});
