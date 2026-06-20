/**
 * The achievements catalog — a static, data-driven list of unlockable goals.
 *
 * Each {@link AchievementDef} maps a single {@link AchievementMetric} to a
 * threshold; the {@link ./engine engine} unlocks it purely by comparing the
 * current {@link AchievementStats}. Adding an achievement is therefore just a
 * new row here (no engine or UI change). `compare` lets a goal be either
 * "reach at least X" (default, `gte` — speeds, counts) or "get down to X"
 * (`lte` — lap/race times, where lower is better).
 *
 * Stable `id`s are persisted in the `achievements` table, so never reuse or
 * repurpose an id once shipped.
 */
import type { AchievementMetric } from "./stats";

export type AchievementCategory = "speed" | "racing" | "collection";

export type AchievementCompare = "gte" | "lte";

export interface AchievementDef {
  /** Stable identifier persisted on unlock — never change once shipped. */
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  /** A leading emoji badge for the row. */
  icon: string;
  /** Which {@link AchievementStats} field this goal reads. */
  metric: AchievementMetric;
  /** The value the metric must reach (`gte`) or get under (`lte`). */
  threshold: number;
  /** Comparison direction; defaults to `gte` when omitted. */
  compare?: AchievementCompare;
}

/**
 * The shipped achievements. Ordered within each category by ascending
 * difficulty; the screen groups by {@link AchievementCategory}.
 */
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ── Speed (top recorded "scale mph"; gauge maxes at 300, redline at 240) ──
  {
    id: "speed-100",
    title: "Getting Going",
    description: "Clock a top speed of 100 mph.",
    category: "speed",
    icon: "🏎️",
    metric: "topSpeedMph",
    threshold: 100,
  },
  {
    id: "speed-200",
    title: "Quick",
    description: "Clock a top speed of 200 mph.",
    category: "speed",
    icon: "⚡",
    metric: "topSpeedMph",
    threshold: 200,
  },
  {
    id: "speed-240",
    title: "Into the Red",
    description: "Hit the redline — 240 mph.",
    category: "speed",
    icon: "🔥",
    metric: "topSpeedMph",
    threshold: 240,
  },
  {
    id: "speed-290",
    title: "Redline Hero",
    description: "Pin the needle at 290 mph.",
    category: "speed",
    icon: "🚀",
    metric: "topSpeedMph",
    threshold: 290,
  },

  // ── Racing (durable race history) ──
  {
    id: "race-first",
    title: "First Finish",
    description: "Finish your first race.",
    category: "racing",
    icon: "🏁",
    metric: "racesFinished",
    threshold: 1,
  },
  {
    id: "race-10",
    title: "Regular Racer",
    description: "Finish 10 races.",
    category: "racing",
    icon: "🏆",
    metric: "racesFinished",
    threshold: 10,
  },
  {
    id: "laps-100",
    title: "Century of Laps",
    description: "Complete 100 laps across all races.",
    category: "racing",
    icon: "🔄",
    metric: "totalLaps",
    threshold: 100,
  },
  {
    id: "race-marathon",
    title: "Marathon",
    description: "Finish a 20-lap race.",
    category: "racing",
    icon: "🥇",
    metric: "longestRaceLaps",
    threshold: 20,
  },
  {
    id: "lap-sub3",
    title: "Sub-3 Lap",
    description: "Record a lap under 3 seconds.",
    category: "racing",
    icon: "⏱️",
    metric: "bestLapSeconds",
    threshold: 3,
    compare: "lte",
  },

  // ── Collection (the garage) ──
  {
    id: "collect-1",
    title: "New Wheels",
    description: "Detect your first car.",
    category: "collection",
    icon: "🚗",
    metric: "carsCollected",
    threshold: 1,
  },
  {
    id: "collect-5",
    title: "Small Garage",
    description: "Collect 5 different cars.",
    category: "collection",
    icon: "🅿️",
    metric: "carsCollected",
    threshold: 5,
  },
  {
    id: "collect-10",
    title: "Collector",
    description: "Collect 10 different cars.",
    category: "collection",
    icon: "🏬",
    metric: "carsCollected",
    threshold: 10,
  },
  {
    id: "collect-25",
    title: "Hoarder",
    description: "Collect 25 different cars.",
    category: "collection",
    icon: "👑",
    metric: "carsCollected",
    threshold: 25,
  },
] as const;

/** Human-readable labels for each category, in display order. */
export const CATEGORY_ORDER: readonly AchievementCategory[] = [
  "racing",
  "speed",
  "collection",
];

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  racing: "Racing",
  speed: "Speed",
  collection: "Collection",
};

/** Look up a definition by id (e.g. when rehydrating persisted unlocks). */
export function achievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
