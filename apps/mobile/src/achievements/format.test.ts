import { describe, expect, it } from "vitest";

import { evaluate } from "./engine";
import {
  formatMetricValue,
  formatUnlockedDate,
  goalProgressLabel,
  metricUnit,
  progressPercent,
} from "./format";
import { emptyStats, type AchievementStats } from "./stats";

function view(id: string, stats: Partial<AchievementStats>, unlocked = {}) {
  const v = evaluate({ ...emptyStats(), ...stats }, unlocked).find((x) => x.id === id);
  if (!v) throw new Error(`no view for ${id}`);
  return v;
}

describe("achievements format", () => {
  it("maps metrics to units", () => {
    expect(metricUnit("topSpeedMph")).toBe("mph");
    expect(metricUnit("racesFinished")).toBe("races");
    expect(metricUnit("carsCollected")).toBe("cars");
    expect(metricUnit("bestLapSeconds")).toBe("s");
  });

  it("formats metric values by kind", () => {
    expect(formatMetricValue("topSpeedMph", 199.6)).toBe("200");
    expect(formatMetricValue("racesFinished", 3)).toBe("3");
    expect(formatMetricValue("bestLapSeconds", 2.45)).toBe("2.5s");
  });

  it("clamps progress to a 0..100 percent", () => {
    expect(progressPercent(0)).toBe(0);
    expect(progressPercent(0.5)).toBe(50);
    expect(progressPercent(1)).toBe(100);
    expect(progressPercent(2)).toBe(100);
    expect(progressPercent(-1)).toBe(0);
  });

  it("labels gte progress as current / target unit", () => {
    expect(goalProgressLabel(view("speed-200", { topSpeedMph: 120 }))).toBe("120 / 200 mph");
    expect(goalProgressLabel(view("race-10", { racesFinished: 4 }))).toBe("4 / 10 races");
  });

  it("labels lte progress against the time goal", () => {
    expect(goalProgressLabel(view("lap-sub3", {}))).toBe("Goal: under 3s");
    expect(goalProgressLabel(view("lap-sub3", { bestLapSeconds: 4.2 }))).toBe(
      "Best 4.2s · goal ≤ 3s",
    );
  });

  it("formats an unlock date", () => {
    expect(formatUnlockedDate(undefined)).toBe("Unlocked");
    expect(formatUnlockedDate(Date.UTC(2026, 5, 17))).toMatch(/^Unlocked /);
  });
});
