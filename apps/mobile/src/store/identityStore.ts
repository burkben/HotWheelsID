/**
 * Car **identity** store — maps physical tags to real catalog cars (Phase 5).
 *
 * Identity is deliberately *isolated* from the Garage (`cars` table / garageStore):
 * the garage records detection-derived facts keyed by NFC `uid`, while identity is
 * the user's manual "this casting is the '70 Charger" decision. Keeping it separate
 * means the catalog prototype never touches the shipped garage schema or reducers.
 *
 * Two small maps, mirrored to disk through an {@link IdentityPersistence} sink
 * exactly like Settings/Garage:
 *  - **links** `uid → castingKey`: learned automatically on every detection that
 *    carries a Mattel id (the portal bridge computes `castingKeyFromMattelId`).
 *  - **identifications** `castingKey → catalogId`: the user's confirmed pick.
 *
 * Rendering a car's identity is therefore `uid → link → castingKey → identification
 * → catalog entry`. Keying the *identification* on `castingKey` (not `uid`) means
 * identifying one copy of a casting names every copy automatically.
 */
import { create } from "zustand";

/** Write-through sink registered by the persistence bootstrap (no-op in CI). */
export interface IdentityPersistence {
  onLink: (uid: string, castingKey: string) => void;
  onIdentify: (castingKey: string, catalogId: string) => void;
  onClear: () => void;
}

let persistence: IdentityPersistence | null = null;

export function setIdentityPersistence(sink: IdentityPersistence | null): void {
  persistence = sink;
}

export interface IdentityState {
  /** uid → castingKey (model id), learned from decoded detections. */
  links: Record<string, string>;
  /** castingKey → catalog car id, the user's confirmed identification. */
  identifications: Record<string, string>;
  /**
   * castingKey → catalog car id, the bundled crowd-sourced community seed
   * (ADR-0014). Read-only reference data merged at bootstrap; it only *fills
   * gaps* — a user's own {@link identifications} pick always wins. Never
   * persisted, and never exported (only the user's own picks are shareable).
   * Optional so existing `{ links, identifications }` snapshots keep type-checking.
   */
  seed?: Record<string, string>;
}

interface IdentityStore extends IdentityState {
  /** True once the bootstrap has loaded persisted maps. */
  hydrated: boolean;
  /** Merge persisted maps in (does not write back). */
  hydrate: (state: Partial<IdentityState>) => void;
  /** Load the bundled community seed (ADR-0014). Reference data — never persisted. */
  loadSeed: (seed: Record<string, string>) => void;
  /** Remember which casting a tag belongs to (idempotent; persists on change). */
  linkCar: (uid: string, castingKey: string) => void;
  /** Confirm which catalog car a casting is (persists). */
  identify: (castingKey: string, catalogId: string) => void;
  /** Forget all *user* identity data (links + identifications). The seed stays. */
  reset: () => void;
}

export const useIdentityStore = create<IdentityStore>((set, get) => ({
  links: {},
  identifications: {},
  seed: {},
  hydrated: false,

  hydrate: (state) =>
    set({
      links: { ...(state.links ?? {}) },
      identifications: { ...(state.identifications ?? {}) },
      hydrated: true,
    }),

  loadSeed: (seed) => set({ seed: { ...seed } }),

  linkCar: (uid, castingKey) => {
    if (!uid || !castingKey) return;
    if (get().links[uid] === castingKey) return; // unchanged — skip the write
    set((s) => ({ links: { ...s.links, [uid]: castingKey } }));
    persistence?.onLink(uid, castingKey);
  },

  identify: (castingKey, catalogId) => {
    if (!castingKey || !catalogId) return;
    set((s) => ({ identifications: { ...s.identifications, [castingKey]: catalogId } }));
    persistence?.onIdentify(castingKey, catalogId);
  },

  reset: () => {
    set({ links: {}, identifications: {} });
    persistence?.onClear();
  },
}));

/**
 * Resolve the catalog id a tag currently maps to, if any: `uid → castingKey →
 * catalogId`. The user's own {@link IdentityState.identifications} pick wins;
 * the bundled community {@link IdentityState.seed} only fills gaps (ADR-0014).
 * Pure selector over a snapshot so it's trivial to unit-test and to reuse from a
 * `useIdentityStore` subscription.
 */
export function catalogIdForUid(state: IdentityState, uid: string | undefined | null): string | undefined {
  if (!uid) return undefined;
  const castingKey = state.links[uid];
  if (!castingKey) return undefined;
  return state.identifications[castingKey] ?? state.seed?.[castingKey];
}
