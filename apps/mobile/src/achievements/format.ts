/**
 * Presentation helpers for the Achievements screen — pure + Node-tested, so the
 * screen stays declarative. Formats a goal's progress label, percentage, and
 * unlock date from an {@link AchievementView}.
 */
import type { AchievementView } from "./engine";
import type { AchievementMetric } from "./stats";

const UNIT: Record<AchievementMetric, string> = {
  topSpeedMph: "mph",
  racesFinished: "races",
  totalLaps: "laps",
  longestRaceLaps: "laps",
  bestLapSeconds: "s",
  fastestRaceSeconds: "s",
  carsCollected: "cars",
};

export function metricUnit(metric: AchievementMetric): string {
  return UNIT[metric];
}

/** A bare metric value (no unit), rounded sensibly for its kind. */
export function formatMetricValue(metric: AchievementMetric, value: number): string {
  if (metric === "bestLapSeconds" || metric === "fastestRaceSeconds") {
    return `${value.toFixed(1)}s`;
  }
  return String(Math.round(value));
}

/** Progress as a whole percentage in [0, 100]. */
export function progressPercent(progress: number): number {
  return Math.round(Math.max(0, Math.min(1, progress)) * 100);
}

/** A compact "where you are vs the goal" line for a locked achievement. */
export function goalProgressLabel(view: AchievementView): string {
  if ((view.compare ?? "gte") === "lte") {
    if (view.value === null) return `Goal: under ${view.threshold}s`;
    return `Best ${view.value.toFixed(1)}s · goal ≤ ${view.threshold}s`;
  }
  const current = view.value ?? 0;
  return `${formatMetricValue(view.metric, current)} / ${formatMetricValue(
    view.metric,
    view.threshold,
  )} ${metricUnit(view.metric)}`;
}

/** "Unlocked Jun 17, 2026" (or a bare "Unlocked" when the time is unknown). */
export function formatUnlockedDate(at: number | undefined): string {
  if (!at) return "Unlocked";
  const when = new Date(at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `Unlocked ${when}`;
}
