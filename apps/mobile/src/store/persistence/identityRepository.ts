/**
 * Persistence seam for **car identity** (Phase 5 catalog prototype).
 *
 * Two tiny tables behind one repository: `car_links` (uid → castingKey) and
 * `car_identifications` (castingKey → catalogId). As with the other seams, the
 * contract + a pure {@link InMemoryIdentityRepository} live here so the store and
 * unit tests stay free of native modules; the `expo-sqlite` implementation is in
 * `sqliteIdentityRepository.ts`, imported only by the bootstrap.
 */
import type { IdentityState } from "../identityStore";

export interface IdentityRepository {
  /** Open/create the backing store. Safe to call once at startup. */
  init(): Promise<void>;
  /** Load both maps. */
  load(): Promise<IdentityState>;
  /** Persist a uid → castingKey link (insert or replace). */
  saveLink(uid: string, castingKey: string): Promise<void>;
  /** Persist a castingKey → catalogId identification (insert or replace). */
  saveIdentification(castingKey: string, catalogId: string): Promise<void>;
  /** Remove one user identification without disturbing its uid links. */
  deleteIdentification(castingKey: string): Promise<void>;
  /** Forget all identity data. */
  clear(): Promise<void>;
}

/** Zero-dependency repository used by tests/CI and whenever SQLite is absent. */
export class InMemoryIdentityRepository implements IdentityRepository {
  private links: Record<string, string> = {};
  private identifications: Record<string, string> = {};

  async init(): Promise<void> {}

  async load(): Promise<IdentityState> {
    return { links: { ...this.links }, identifications: { ...this.identifications } };
  }

  async saveLink(uid: string, castingKey: string): Promise<void> {
    this.links[uid] = castingKey;
  }

  async saveIdentification(castingKey: string, catalogId: string): Promise<void> {
    this.identifications[castingKey] = catalogId;
  }

  async deleteIdentification(castingKey: string): Promise<void> {
    delete this.identifications[castingKey];
  }

  async clear(): Promise<void> {
    this.links = {};
    this.identifications = {};
  }
}
