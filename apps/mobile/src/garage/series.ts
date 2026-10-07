/**
 * Garage series filters (SPEC §4.7). Pure client-side derivation from the cars in
 * the garage and their catalog identities; the store order is never changed.
 */
import { colorsR } from '@/theme/tokens';

/** Fixed accent order. Colour is never the only cue: the name is always printed. */
export const SERIES_COLORS = [colorsR.flame, colorsR.electric, colorsR.caution, colorsR.greenFlag, colorsR.redFlag] as const;

export interface SeriesFilter {
  readonly series: string;
  readonly count: number;
  readonly color: string;
}

/** A car's series, or null when it is unidentified or the catalog has none. */
export type SeriesOf<T> = (car: T) => string | null | undefined;

function clean(series: string | null | undefined): string | null {
  const trimmed = series?.trim();
  return trimmed ? trimmed : null;
}

/** One filter per series present, most cars first; ties sort by name for stability. */
export function seriesFilters<T>(cars: readonly T[], seriesOf: SeriesOf<T>): SeriesFilter[] {
  const counts = new Map<string, number>();
  for (const car of cars) {
    const series = clean(seriesOf(car));
    if (series) counts.set(series, (counts.get(series) ?? 0) + 1);
  }
  return [...counts]
    .sort(([a, an], [b, bn]) => bn - an || a.localeCompare(b))
    .map(([series, count], index) => ({ series, count, color: SERIES_COLORS[index % SERIES_COLORS.length] }));
}

/** Null selects every car. A series no longer in the garage also falls back to all. */
export function filterBySeries<T>(cars: readonly T[], seriesOf: SeriesOf<T>, selected: string | null): readonly T[] {
  if (selected == null || !cars.some((car) => clean(seriesOf(car)) === selected)) return cars;
  return cars.filter((car) => clean(seriesOf(car)) === selected);
}

/** Colour for a series, from the same ordering as the chips. */
export function seriesColor(filters: readonly SeriesFilter[], series: string | null | undefined): string | null {
  const name = clean(series);
  return name ? filters.find((f) => f.series === name)?.color ?? null : null;
}

/** Uids holding the garage's top best speed (the caution "record" value). */
export function recordHolders(cars: readonly { uid: string; bestMph: number }[]): ReadonlySet<string> {
  const top = cars.reduce((max, car) => (Number.isFinite(car.bestMph) && car.bestMph > max ? car.bestMph : max), 0);
  return new Set(top > 0 ? cars.filter((car) => car.bestMph === top).map((car) => car.uid) : []);
}
