import type { CatalogCar } from '@/catalog/catalog';
import type { CarRecord } from '@/store/persistence/carRepository';
import type { GarageCardModel } from './components/GarageCard';
import { plateNumber } from './plateNumber';
import { seriesColor, type SeriesFilter } from './series';

export interface GarageCardContext {
  readonly cars: readonly CarRecord[];
  readonly identity: CatalogCar | undefined;
  readonly hasArtwork: (catalogId: string) => boolean;
  readonly filters: readonly SeriesFilter[];
  readonly onPortal: boolean;
  readonly record: boolean;
  /** Formatted best speed (em dash when none) and its unit caption. */
  readonly best: string;
  readonly unit: string;
}

/** Derive one trading card. Catalog names win over nicknames, as in the old list. */
export function garageCardModel(car: CarRecord, ctx: GarageCardContext): GarageCardModel {
  const identity = ctx.identity;
  return {
    uid: car.uid,
    plate: plateNumber(ctx.cars, car.uid),
    name: identity?.name ?? (car.name?.trim() || null),
    identified: identity != null,
    series: identity?.series?.trim() || null,
    seriesColor: seriesColor(ctx.filters, identity?.series),
    photoId: identity && ctx.hasArtwork(identity.id) ? identity.id : null,
    best: ctx.best,
    unit: ctx.unit,
    races: car.races,
    onPortal: ctx.onPortal,
    record: ctx.record,
  };
}

/** Pad a grid's last row with nulls so FlatList tiles keep their column width. */
export function padGrid<T>(items: readonly T[], columns: number): (T | null)[] {
  const remainder = columns > 1 ? items.length % columns : 0;
  return remainder === 0 ? [...items] : [...items, ...Array<null>(columns - remainder).fill(null)];
}
