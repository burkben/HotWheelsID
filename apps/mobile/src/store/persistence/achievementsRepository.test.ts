import { describe, expect, it } from "vitest";

import { InMemoryAchievementsRepository } from "./achievementsRepository";

describe("InMemoryAchievementsRepository", () => {
  it("starts empty", async () => {
    const repo = new InMemoryAchievementsRepository();
    await repo.init();
    expect(await repo.loadUnlocked()).toEqual({});
  });

  it("records unlocks with their timestamp", async () => {
    const repo = new InMemoryAchievementsRepository();
    await repo.unlock("speed-100", 111);
    await repo.unlock("collect-1", 222);
    expect(await repo.loadUnlocked()).toEqual({
      "speed-100": 111,
      "collect-1": 222,
    });
  });

  it("keeps the first unlock time (re-unlock is a no-op)", async () => {
    const repo = new InMemoryAchievementsRepository();
    await repo.unlock("speed-100", 111);
    await repo.unlock("speed-100", 999);
    expect((await repo.loadUnlocked())["speed-100"]).toBe(111);
  });

  it("returns a copy callers cannot mutate", async () => {
    const repo = new InMemoryAchievementsRepository();
    await repo.unlock("speed-100", 1);
    const snap = await repo.loadUnlocked();
    snap["injected"] = 5;
    expect(await repo.loadUnlocked()).toEqual({ "speed-100": 1 });
  });

  it("clears all unlocks", async () => {
    const repo = new InMemoryAchievementsRepository();
    await repo.unlock("speed-100", 1);
    await repo.clear();
    expect(await repo.loadUnlocked()).toEqual({});
  });
});
