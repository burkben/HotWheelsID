/**
 * Trophy case presentation (SPEC §4.10). Pure helpers over the engine's
 * {@link AchievementView}s; the engine and store APIs are unchanged.
 */
import type { AchievementCategory } from './catalog';
import type { AchievementView } from './engine';

/** Display order and names; the catalog's `collection` reads as GARAGE. */
export const TROPHY_GROUPS: readonly { category: AchievementCategory; title: string }[] = [
  { category: 'speed', title: 'Speed' },
  { category: 'racing', title: 'Racing' },
  { category: 'collection', title: 'Garage' },
];

export function trophyGroups(views: readonly AchievementView[]) {
  return TROPHY_GROUPS.map((g) => {
    const items = views.filter((v) => v.category === g.category);
    return { ...g, items, unlocked: items.filter((v) => v.unlocked).length };
  });
}

/** HUD progress under a locked medallion, or null when there is nothing to show yet. */
export function medallionProgress(view: AchievementView): string | null {
  if (view.unlocked || view.value == null || !(view.value > 0)) return null;
  if ((view.compare ?? 'gte') === 'lte') return `BEST ${view.value.toFixed(2)}S`;
  const value = Math.round(view.value);
  return view.metric === 'topSpeedMph' ? `BEST ${value}/${view.threshold}` : `${value}/${view.threshold}`;
}

/**
 * Most recently unlocked view, or null. One stats refresh stamps several ids with
 * the same time; the later catalog entry wins, matching the last banner shown.
 */
export function latestUnlock(views: readonly AchievementView[]): AchievementView | null {
  return views.reduce<AchievementView | null>(
    (latest, v) => (v.unlocked && v.unlockedAt != null && v.unlockedAt >= (latest?.unlockedAt ?? -Infinity) ? v : latest),
    null,
  );
}

/**
 * Ids the store stamped between two snapshots, in catalog order. The store adds
 * exactly what `newlyUnlockedIds()` returned, so this observes that result without
 * changing the store API. Hydration (loading saved unlocks) is not a celebration.
 */
export function unlockedSince(
  prev: { unlocked: Readonly<Record<string, number>>; hydrated: boolean },
  next: { unlocked: Readonly<Record<string, number>>; hydrated: boolean },
  order: readonly { id: string }[],
): string[] {
  if (!prev.hydrated || prev.unlocked === next.unlocked) return [];
  return order.map((a) => a.id).filter((id) => next.unlocked[id] !== undefined && prev.unlocked[id] === undefined);
}

/** "8 of 13 trophies unlocked". */
export function trophyCountLabel(unlocked: number, total: number): string {
  return `${unlocked} of ${total} ${total === 1 ? 'trophy' : 'trophies'} unlocked`;
}
