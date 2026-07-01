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

import { catalogIdForUid, useIdentityStore } from "@/store/identityStore";
import { findCatalogCar, type CatalogCar } from "./catalog";

/** The catalog car a tag is currently identified as, or `undefined`. Reactive. */
export function useCarIdentity(uid: string | undefined | null): CatalogCar | undefined {
  const links = useIdentityStore((s) => s.links);
  const identifications = useIdentityStore((s) => s.identifications);
  return useMemo(
    () => findCatalogCar(catalogIdForUid({ links, identifications }, uid)),
    [links, identifications, uid],
  );
}

/**
 * Returns `identify(uid, catalogId)`: records (and, if needed, fabricates) the
 * `uid → castingKey → catalogId` chain so the garage immediately renders the pick.
 */
export function useIdentifyCar(): (uid: string, catalogId: string) => void {
  return useCallback((uid: string, catalogId: string) => {
    if (!uid || !catalogId) return;
    const { links, linkCar, identify } = useIdentityStore.getState();
    let castingKey = links[uid];
    if (!castingKey) {
      castingKey = `uid:${uid}`;
      linkCar(uid, castingKey);
    }
    identify(castingKey, catalogId);
  }, []);
}
