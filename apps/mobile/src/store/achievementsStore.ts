/**
 * Achievements store (Zustand) — the render source of truth for unlocked badges
 * and the latest {@link AchievementStats} snapshot.
 *
 * Mirrors the Race/Garage stores: render state only, no BLE/React Native, and
 * durability layered on via {@link setAchievementsPersistence} sinks the app
 * bootstrap wires to an `expo-sqlite` repository. The engine stays pure; this
 * store just folds new stats in, stamps freshly-crossed goals with an unlock
 * time, and forwards each new unlock to storage. Tests leave the sinks unset, so
 * the reducer runs under plain Node.
 */
import { create } from "zustand";

import { newlyUnlockedIds } from "../achievements/engine";
import { emptyStats, type AchievementStats } from "../achievements/stats";

/**
 * Optional durability hooks. `onUnlock` fires once per newly-earned achievement
 * (id + epoch-ms); `onClear` wipes the persisted set. Left unset in tests/CI.
 */
export interface AchievementsPersistence {
  onUnlock?: (id: string, at: number) => void;
  onClear?: () => void;
}

let persistence: AchievementsPersistence = {};

export function setAchievementsPersistence(
  next: AchievementsPersistence | null,
): void {
  persistence = next ?? {};
}

export interface AchievementsStore {
  /** Earned achievement id → epoch-ms it was first unlocked. */
  unlocked: Record<string, number>;
  /** The most recent stats the badges were evaluated against. */
  stats: AchievementStats;
  /** True once durable unlocks have been loaded (or the fallback ran). */
  hydrated: boolean;

  /** Replace the unlocked set from durable storage (called once on startup). */
  hydrate: (unlocked: Record<string, number>) => void;
  /**
   * Fold a fresh stats snapshot in: records any newly-crossed goals (stamped at
   * `nowMs`), forwards them to storage, and updates `stats`. Returns the ids
   * unlocked by this call (empty when nothing new) so callers can celebrate.
   */
  applyStats: (stats: AchievementStats, nowMs?: number) => string[];
  /** Forget every unlock and reset stats (mirrors clearing storage). */
  reset: () => void;
}

export const useAchievementsStore = create<AchievementsStore>((set, get) => ({
  unlocked: {},
  stats: emptyStats(),
  hydrated: false,

  hydrate: (unlocked) => set({ unlocked: { ...unlocked }, hydrated: true }),

  applyStats: (stats, nowMs = Date.now()) => {
    const fresh = newlyUnlockedIds(stats, get().unlocked);
    if (fresh.length === 0) {
      set({ stats });
      return [];
    }
    set((s) => {
      const unlocked = { ...s.unlocked };
      for (const id of fresh) unlocked[id] = nowMs;
      return { stats, unlocked };
    });
    for (const id of fresh) persistence.onUnlock?.(id, nowMs);
    return fresh;
  },

  reset: () => {
    set({ unlocked: {}, stats: emptyStats() });
    persistence.onClear?.();
  },
}));
