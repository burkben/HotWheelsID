import { describe, expect, it } from "vitest";

import { ACHIEVEMENTS } from "./catalog";
import { evaluate, newlyUnlockedIds, summarize } from "./engine";
import { emptyStats, type AchievementStats } from "./stats";

function statsWith(overrides: Partial<AchievementStats>): AchievementStats {
  return { ...emptyStats(), ...overrides };
}

function view(views: ReturnType<typeof evaluate>, id: string) {
  const v = views.find((x) => x.id === id);
  if (!v) throw new Error(`no view for ${id}`);
  return v;
}

describe("achievements engine — evaluate", () => {
  it("returns one view per catalog entry", () => {
    expect(evaluate(emptyStats())).toHaveLength(ACHIEVEMENTS.length);
  });

  it("locks everything at the empty baseline", () => {
    const views = evaluate(emptyStats());
    expect(views.every((v) => !v.unlocked)).toBe(true);
    expect(views.every((v) => v.progress === 0)).toBe(true);
  });

  it("unlocks a gte goal once the metric reaches the threshold", () => {
    expect(view(evaluate(statsWith({ topSpeedMph: 199 })), "speed-200").unlocked).toBe(false);
    expect(view(evaluate(statsWith({ topSpeedMph: 200 })), "speed-200").unlocked).toBe(true);
    expect(view(evaluate(statsWith({ topSpeedMph: 260 })), "speed-200").unlocked).toBe(true);
  });

  it("reports partial progress for gte goals", () => {
    const v = view(evaluate(statsWith({ topSpeedMph: 100 })), "speed-200");
    expect(v.progress).toBeCloseTo(0.5, 5);
    expect(v.value).toBe(100);
  });

  it("handles lte (lower-is-better) goals", () => {
    // null lap time → locked, no progress
    const none = view(evaluate(emptyStats()), "lap-sub3");
    expect(none.unlocked).toBe(false);
    expect(none.progress).toBe(0);
    // 6s lap → halfway to a 3s goal
    const half = view(evaluate(statsWith({ bestLapSeconds: 6 })), "lap-sub3");
    expect(half.progress).toBeCloseTo(0.5, 5);
    expect(half.unlocked).toBe(false);
    // exactly 3s → unlocked
    expect(view(evaluate(statsWith({ bestLapSeconds: 3 })), "lap-sub3").unlocked).toBe(true);
    // 2s → unlocked, progress capped at 1
    const fast = view(evaluate(statsWith({ bestLapSeconds: 2 })), "lap-sub3");
    expect(fast.unlocked).toBe(true);
    expect(fast.progress).toBe(1);
  });

  it("keeps earned achievements unlocked even if stats no longer meet them", () => {
    const v = view(evaluate(emptyStats(), { "speed-200": 1234 }), "speed-200");
    expect(v.unlocked).toBe(true);
    expect(v.progress).toBe(1);
    expect(v.unlockedAt).toBe(1234);
  });
});

describe("achievements engine — newlyUnlockedIds", () => {
  it("lists only freshly-met, not-yet-recorded goals in catalog order", () => {
    const stats = statsWith({ topSpeedMph: 250, racesFinished: 1, carsCollected: 1 });
    const ids = newlyUnlockedIds(stats, { "speed-100": 1 });
    // speed-100 already recorded → excluded; speed-240/200, race-first, collect-1 newly met
    expect(ids).toContain("speed-200");
    expect(ids).toContain("speed-240");
    expect(ids).toContain("race-first");
    expect(ids).toContain("collect-1");
    expect(ids).not.toContain("speed-100");
    expect(ids).not.toContain("speed-290");
    // catalog order: speed group before racing before collection
    expect(ids.indexOf("speed-200")).toBeLessThan(ids.indexOf("race-first"));
    expect(ids.indexOf("race-first")).toBeLessThan(ids.indexOf("collect-1"));
  });

  it("returns nothing when all met goals are already recorded", () => {
    const stats = statsWith({ carsCollected: 1 });
    expect(newlyUnlockedIds(stats, { "collect-1": 9 })).toEqual([]);
  });
});

describe("achievements engine — summarize", () => {
  it("counts recorded unlocks against the catalog total", () => {
    expect(summarize({})).toEqual({ unlockedCount: 0, total: ACHIEVEMENTS.length });
    expect(summarize({ "speed-100": 1, "race-first": 2 })).toEqual({
      unlockedCount: 2,
      total: ACHIEVEMENTS.length,
    });
  });
});
