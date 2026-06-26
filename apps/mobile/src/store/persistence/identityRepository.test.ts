import { describe, expect, it } from "vitest";

import { InMemoryIdentityRepository } from "./identityRepository";

describe("InMemoryIdentityRepository", () => {
  it("loads empty maps before anything is saved", async () => {
    const repo = new InMemoryIdentityRepository();
    await repo.init();
    expect(await repo.load()).toEqual({ links: {}, identifications: {} });
  });

  it("round-trips links and identifications, overwriting on the same key", async () => {
    const repo = new InMemoryIdentityRepository();

    await repo.saveLink("2A:7E:A2:F1:62:80", "41ae5e5b");
    await repo.saveIdentification("41ae5e5b", "70-dodge-charger-r-t");
    await repo.saveLink("2A:7E:A2:F1:62:80", "41ae5e5c"); // overwrite link
    await repo.saveIdentification("41ae5e5b", "corvette-c7-r"); // overwrite ident

    expect(await repo.load()).toEqual({
      links: { "2A:7E:A2:F1:62:80": "41ae5e5c" },
      identifications: { "41ae5e5b": "corvette-c7-r" },
    });
  });

  it("returns copies so later mutations don't leak into earlier snapshots", async () => {
    const repo = new InMemoryIdentityRepository();
    await repo.saveLink("uid-1", "key-1");

    const first = await repo.load();
    await repo.saveLink("uid-1", "key-2");

    expect(first.links["uid-1"]).toBe("key-1");
  });

  it("clear forgets everything", async () => {
    const repo = new InMemoryIdentityRepository();
    await repo.saveLink("uid-1", "key-1");
    await repo.saveIdentification("key-1", "car-1");

    await repo.clear();

    expect(await repo.load()).toEqual({ links: {}, identifications: {} });
  });
});
