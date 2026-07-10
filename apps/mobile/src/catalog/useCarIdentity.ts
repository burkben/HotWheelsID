/**
 * React bindings over the {@link useIdentityStore} + {@link catalog}: turn a
 * physical tag `uid` into the real {@link CatalogCar} the user picked, and expose
 * a one-call "identify this uid as that catalog car" action for the picker.
 *
 * Identifications are keyed by `castingKey`, which the portal bridge learns from a
 * car's Mattel id. Cars seen without a Mattel id (e.g. demo passes) have no learned
 * key, so {@link useIdentifyCar} synthesises a stable per-uid key and links it — the
 * pick still persists and renders, it just doesn't group other copies of the casting.
 */
import { useCallback, useMemo } from "react";

import { useGarageStore } from "../store/garageStore";
import { catalogIdForUid, useIdentityStore } from "../store/identityStore";
import type { CarRecord } from "../store/persistence/carRepository";
import { findCatalogCar, type CatalogCar } from "./catalog";

/** The catalog car a tag is currently identified as, or `undefined`. Reactive. */
export function useCarIdentity(uid: string | undefined | null): CatalogCar | undefined {
  const links = useIdentityStore((s) => s.links);
  const identifications = useIdentityStore((s) => s.identifications);
  const seed = useIdentityStore((s) => s.seed);
  return useMemo(
    () => findCatalogCar(catalogIdForUid({ links, identifications, seed }, uid)),
    [links, identifications, seed, uid],
  );
}

export interface CastingCoverage {
  readonly castingKey: string;
  readonly totalCars: number;
  readonly otherCars: number;
  readonly synthetic: boolean;
}

/**
 * Figure out how many garage cars share the same casting key as `uid`. This is
 * the UX payoff of keying identifications on `castingKey`: one pick can label
 * every copy of that casting in the collection.
 */
export function castingCoverageForUid(
  uid: string | undefined | null,
  links: Record<string, string>,
  garageCars: readonly Pick<CarRecord, "uid">[],
): CastingCoverage | undefined {
  if (!uid) return undefined;
  const castingKey = links[uid];
  if (!castingKey) return undefined;

  const matched = new Set<string>();
  for (const car of garageCars) {
    if (links[car.uid] === castingKey) matched.add(car.uid);
  }
  if (matched.size === 0) matched.add(uid);

  return {
    castingKey,
    totalCars: matched.size,
    otherCars: Math.max(matched.size - 1, 0),
    synthetic: castingKey.startsWith("uid:"),
  };
}

export function useCastingCoverage(uid: string | undefined | null): CastingCoverage | undefined {
  const garageCars = useGarageStore((s) => s.cars);
  const links = useIdentityStore((s) => s.links);
  return useMemo(() => castingCoverageForUid(uid, links, garageCars), [garageCars, links, uid]);
}

/**
 * Returns `identify(uid, catalogId)`: records (and, if needed, fabricates) the
 * `uid → castingKey → catalogId` chain so the garage immediately renders the pick.
 */
export interface IdentificationChange {
  readonly castingKey: string;
  readonly previousCatalogId?: string;
}

export function identifyCar(uid: string, catalogId: string): IdentificationChange | undefined {
  if (!uid || !catalogId) return undefined;
  const { links, identifications, linkCar, identify } = useIdentityStore.getState();
  let castingKey = links[uid];
  if (!castingKey) {
    castingKey = `uid:${uid}`;
    linkCar(uid, castingKey);
  }
  const change = { castingKey, previousCatalogId: identifications[castingKey] };
  identify(castingKey, catalogId);
  return change;
}

export function undoIdentification(change: IdentificationChange): void {
  const { identify, forgetIdentification } = useIdentityStore.getState();
  if (change.previousCatalogId) {
    identify(change.castingKey, change.previousCatalogId);
  } else {
    forgetIdentification(change.castingKey);
  }
}

export function useIdentifyCar(): (uid: string, catalogId: string) => IdentificationChange | undefined {
  return useCallback((uid: string, catalogId: string) => {
    return identifyCar(uid, catalogId);
  }, []);
}
