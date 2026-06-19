/**
 * The pure achievements engine.
 *
 * Given an {@link AchievementStats} snapshot and the set of already-unlocked
 * ids, it produces a {@link AchievementView} per catalog entry (unlocked state
 * + 0..1 progress) and can report which ids have *newly* crossed their
 * threshold. No framework, storage, or time dependencies — fully Node-testable.
 */
import {
  ACHIEVEMENTS,
  type AchievementCompare,
  type AchievementDef,
} from "./catalog";
import type { AchievementStats } from "./stats";

/** A catalog entry resolved against the current stats. */
export interface AchievementView extends AchievementDef {
  unlocked: boolean;
  /** Completion ratio, clamped to [0, 1]. */
  progress: number;
  /** Current metric value (null = the metric has no data yet). */
  value: number | null;
  /** When unlocked (epoch ms), if known. */
  unlockedAt?: number;
}

function clamp01(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** Read an achievement's metric off the stats snapshot. */
export function metricValue(
  stats: AchievementStats,
  metric: AchievementDef["metric"],
): number | null {
  return stats[metric];
}

function isMet(
  value: number | null,
  threshold: number,
  compare: AchievementCompare,
): boolean {
  if (value === null) return false;
  return compare === "lte" ? value <= threshold : value >= threshold;
}

function progressFor(
  value: number | null,
  threshold: number,
  compare: AchievementCompare,
): number {
  if (value === null) return 0;
  if (threshold <= 0) return value > 0 ? 1 : 0;
  // For "lower is better" goals, progress grows as the value shrinks toward the
  // target; an unmet (larger) value yields partial progress, met yields 1.
  return compare === "lte"
    ? clamp01(threshold / value)
    : clamp01(value / threshold);
}

/**
 * Resolve every catalog entry against `stats`. `unlocked` maps an id to the
 * epoch-ms it was first unlocked (the durable record); an id present there is
 * always reported unlocked even if a later stat reset would no longer meet it
 * (achievements don't un-earn).
 */
export function evaluate(
  stats: AchievementStats,
  unlocked: Readonly<Record<string, number>> = {},
): AchievementView[] {
  return ACHIEVEMENTS.map((def) => {
    const compare = def.compare ?? "gte";
    const value = metricValue(stats, def.metric);
    const earned = unlocked[def.id] !== undefined;
    const met = earned || isMet(value, def.threshold, compare);
    return {
      ...def,
      value,
      unlocked: met,
      progress: met ? 1 : progressFor(value, def.threshold, compare),
      unlockedAt: unlocked[def.id],
    };
  });
}

/**
 * Ids whose threshold is met by `stats` but that are not yet in
 * `alreadyUnlocked`. Returned in catalog order so unlock stamping is
 * deterministic.
 */
export function newlyUnlockedIds(
  stats: AchievementStats,
  alreadyUnlocked: Readonly<Record<string, number>> = {},
): string[] {
  const out: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (alreadyUnlocked[def.id] !== undefined) continue;
    const compare = def.compare ?? "gte";
    if (isMet(metricValue(stats, def.metric), def.threshold, compare)) {
      out.push(def.id);
    }
  }
  return out;
}

/** Count of unlocked vs total, for headline summaries. */
export function summarize(unlocked: Readonly<Record<string, number>>): {
  unlockedCount: number;
  total: number;
} {
  let unlockedCount = 0;
  for (const def of ACHIEVEMENTS) {
    if (unlocked[def.id] !== undefined) unlockedCount += 1;
  }
  return { unlockedCount, total: ACHIEVEMENTS.length };
}
