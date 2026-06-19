import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyStats, type AchievementStats } from "../achievements/stats";
import {
  setAchievementsPersistence,
  useAchievementsStore,
} from "./achievementsStore";

function resetStore() {
  setAchievementsPersistence(null);
  useAchievementsStore.setState({
    unlocked: {},
    stats: emptyStats(),
    hydrated: false,
  });
}

function statsWith(overrides: Partial<AchievementStats>): AchievementStats {
  return { ...emptyStats(), ...overrides };
}

describe("achievements store", () => {
  beforeEach(resetStore);

  it("hydrates the unlocked set and flips hydrated", () => {
    useAchievementsStore.getState().hydrate({ "speed-100": 42 });
    const s = useAchievementsStore.getState();
    expect(s.unlocked).toEqual({ "speed-100": 42 });
    expect(s.hydrated).toBe(true);
  });

  it("applyStats stamps newly-unlocked goals and updates stats", () => {
    const fresh = useAchievementsStore
      .getState()
      .applyStats(statsWith({ topSpeedMph: 210, carsCollected: 1 }), 1000);
    expect(fresh).toContain("speed-100");
    expect(fresh).toContain("speed-200");
    expect(fresh).toContain("collect-1");
    const s = useAchievementsStore.getState();
    expect(s.unlocked["speed-200"]).toBe(1000);
    expect(s.stats.topSpeedMph).toBe(210);
  });

  it("does not re-unlock or re-stamp an already-earned goal", () => {
    const store = useAchievementsStore.getState();
    store.applyStats(statsWith({ topSpeedMph: 120 }), 1000);
    const again = useAchievementsStore
      .getState()
      .applyStats(statsWith({ topSpeedMph: 250 }), 2000);
    expect(again).not.toContain("speed-100");
    expect(useAchievementsStore.getState().unlocked["speed-100"]).toBe(1000);
  });

  it("calls onUnlock once per new achievement, not for repeats", () => {
    const onUnlock = vi.fn();
    setAchievementsPersistence({ onUnlock });
    useAchievementsStore.getState().applyStats(statsWith({ carsCollected: 1 }), 5);
    expect(onUnlock).toHaveBeenCalledTimes(1);
    expect(onUnlock).toHaveBeenCalledWith("collect-1", 5);
    // applying the same (or lower) stats again unlocks nothing new
    useAchievementsStore.getState().applyStats(statsWith({ carsCollected: 1 }), 6);
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it("applyStats with no new unlocks still records the latest stats", () => {
    const fresh = useAchievementsStore
      .getState()
      .applyStats(statsWith({ topSpeedMph: 50 }), 1);
    expect(fresh).toEqual([]);
    expect(useAchievementsStore.getState().stats.topSpeedMph).toBe(50);
  });

  it("reset clears unlocks + stats and propagates onClear", () => {
    const onClear = vi.fn();
    setAchievementsPersistence({ onClear });
    useAchievementsStore.getState().applyStats(statsWith({ carsCollected: 9 }), 1);
    useAchievementsStore.getState().reset();
    const s = useAchievementsStore.getState();
    expect(s.unlocked).toEqual({});
    expect(s.stats).toEqual(emptyStats());
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
