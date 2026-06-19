/**
 * Persistence seam for **Achievements** — the durable set of unlocked badges
 * (ADR-0006, Phase 5).
 *
 * Like the other repositories, the contract + a pure {@link InMemoryAchievementsRepository}
 * live here so the store and unit tests stay free of native modules. The native
 * `expo-sqlite` implementation lives in `sqliteAchievementsRepository.ts`,
 * imported solely by the app bootstrap.
 *
 * Only the *unlocked* set is persisted (id → first-unlock epoch-ms); current
 * progress is always recomputed from live stats, so nothing here needs to track
 * it. First unlock wins — re-unlocking an id is a no-op (keeps the original
 * timestamp), mirroring the SQLite `INSERT OR IGNORE`.
 */
export interface AchievementsRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Every earned achievement: id → epoch-ms it was first unlocked. */
  loadUnlocked(): Promise<Record<string, number>>;
  /** Record an unlock. No-op if the id is already recorded. */
  unlock(id: string, at: number): Promise<void>;
  /** Forget every unlock. */
  clear(): Promise<void>;
}

/** Zero-dependency fallback used in tests/CI and when SQLite is unavailable. */
export class InMemoryAchievementsRepository implements AchievementsRepository {
  private unlocked: Record<string, number> = {};

  async init(): Promise<void> {}

  async loadUnlocked(): Promise<Record<string, number>> {
    return { ...this.unlocked };
  }

  async unlock(id: string, at: number): Promise<void> {
    if (this.unlocked[id] === undefined) this.unlocked[id] = at;
  }

  async clear(): Promise<void> {
    this.unlocked = {};
  }
}
