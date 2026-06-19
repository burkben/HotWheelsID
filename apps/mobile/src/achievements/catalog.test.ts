import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENTS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  achievementById,
} from "./catalog";
import { emptyStats, type AchievementMetric } from "./stats";

describe("achievements catalog", () => {
  it("has unique, stable ids", () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses positive thresholds and known categories", () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.threshold).toBeGreaterThan(0);
      expect(CATEGORY_ORDER).toContain(a.category);
      expect(a.icon.length).toBeGreaterThan(0);
      expect(a.title.length).toBeGreaterThan(0);
    }
  });

  it("targets only real AchievementStats metrics", () => {
    const validMetrics = Object.keys(emptyStats()) as AchievementMetric[];
    for (const a of ACHIEVEMENTS) {
      expect(validMetrics).toContain(a.metric);
    }
  });

  it("only uses lte compare on time metrics (lower is better)", () => {
    for (const a of ACHIEVEMENTS) {
      if (a.compare === "lte") {
        expect(["bestLapSeconds", "fastestRaceSeconds"]).toContain(a.metric);
      }
    }
  });

  it("labels every ordered category", () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });

  it("looks up by id", () => {
    expect(achievementById("speed-100")?.metric).toBe("topSpeedMph");
    expect(achievementById("nope")).toBeUndefined();
  });
});
