import { describe, expect, it } from "vitest";

import { InMemorySettingsRepository } from "./settingsRepository";

describe("InMemorySettingsRepository", () => {
  it("loads empty before anything is saved", async () => {
    const repo = new InMemorySettingsRepository();
    await repo.init();
    expect(await repo.load()).toEqual({});
  });

  it("round-trips saved values and overwrites on the same key", async () => {
    const repo = new InMemorySettingsRepository();

    await repo.save("playerName", "Ace");
    await repo.save("defaultLaps", 15);
    await repo.save("haptics", false);
    await repo.save("playerName", "Ben"); // overwrite

    expect(await repo.load()).toEqual({
      playerName: "Ben",
      defaultLaps: 15,
      haptics: false,
    });
  });

  it("returns a copy so later mutations don't leak", async () => {
    const repo = new InMemorySettingsRepository();
    await repo.save("playerName", "Ace");

    const first = await repo.load();
    await repo.save("playerName", "Ben");

    expect(first.playerName).toBe("Ace"); // earlier snapshot unchanged
  });

  it("clear forgets everything", async () => {
    const repo = new InMemorySettingsRepository();
    await repo.save("mockModeDefault", true);

    await repo.clear();

    expect(await repo.load()).toEqual({});
  });
});
