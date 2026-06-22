/**
 * Persistence seam for **casting names** — the user-assigned label a casting gets,
 * keyed by its `modelId` (the per-casting key Slice A decodes from the Mattel id).
 * A name set here applies to *every* physical copy of that casting, so it lives in
 * its own tiny table rather than on any single `CarRecord` (which is per-`uid`).
 *
 * Mirrors {@link CarRepository}: the contract + a pure {@link InMemoryCastingRepository}
 * live here so the store and unit tests stay free of native modules; the
 * `expo-sqlite` implementation lives in `sqliteCastingRepository.ts`, imported
 * only by the app bootstrap.
 *
 * The read shape is a plain `modelId → name` map so the Garage store can mirror it
 * directly and resolve a display name with one lookup.
 */

/** A `modelId → user-assigned casting name` map (keys are uppercase hex). */
export type CastingNames = Record<string, string>;

export interface CastingRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Every named casting as a `modelId → name` map (keys uppercase). */
  getCastingNames(): Promise<CastingNames>;
  /** Set (non-empty) or clear (null/blank) the name for a casting. */
  setCastingName(modelId: string, name: string | null): Promise<void>;
  /** Forget every casting name. */
  clear(): Promise<void>;
}

/**
 * Pure reducer shared by the Garage store (render mirror) and the in-memory
 * repository so both normalize identically: keys are uppercased, names are
 * trimmed, and a null/blank name removes the entry. Never mutates its input.
 */
export function applyCastingName(
  names: Readonly<CastingNames>,
  modelId: string,
  name: string | null,
): CastingNames {
  const key = modelId.toUpperCase();
  const next: CastingNames = { ...names };
  const trimmed = name?.trim();
  if (trimmed) next[key] = trimmed;
  else delete next[key];
  return next;
}

/**
 * Zero-dependency repository used by tests/CI and whenever the native SQLite
 * module is unavailable. Holds the map in memory via the same pure reducer the
 * store uses.
 */
export class InMemoryCastingRepository implements CastingRepository {
  private names: CastingNames = {};

  async init(): Promise<void> {}

  async getCastingNames(): Promise<CastingNames> {
    return { ...this.names };
  }

  async setCastingName(modelId: string, name: string | null): Promise<void> {
    this.names = applyCastingName(this.names, modelId, name);
  }

  async clear(): Promise<void> {
    this.names = {};
  }
}
