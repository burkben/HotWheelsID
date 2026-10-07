import { useMemo } from 'react';

import { findCatalogCar, type CatalogCar } from '@/catalog/catalog';
import { catalogIdForUid, useIdentityStore } from '@/store/identityStore';
import type { CarRecord } from '@/store/persistence/carRepository';

/** Every garage car's catalog identity, resolved off one identity-store snapshot. */
export function useGarageIdentities(cars: readonly Pick<CarRecord, 'uid'>[]): ReadonlyMap<string, CatalogCar> {
  const links = useIdentityStore((s) => s.links);
  const identifications = useIdentityStore((s) => s.identifications);
  const seed = useIdentityStore((s) => s.seed);
  return useMemo(() => {
    const map = new Map<string, CatalogCar>();
    for (const car of cars) {
      const identity = findCatalogCar(catalogIdForUid({ links, identifications, seed }, car.uid));
      if (identity) map.set(car.uid, identity);
    }
    return map;
  }, [cars, links, identifications, seed]);
}
