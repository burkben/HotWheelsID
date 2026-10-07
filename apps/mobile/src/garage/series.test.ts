import { describe, expect, it } from 'vitest';
import { colorsR } from '@/theme/tokens';
import { SERIES_COLORS, filterBySeries, recordHolders, seriesColor, seriesFilters } from './series';

type Car = { uid: string; series: string | null; bestMph: number };
const car = (uid: string, series: string | null, bestMph = 0): Car => ({ uid, series, bestMph });
const of = (c: Car) => c.series;

describe('seriesFilters', () => {
  it('returns no filters for an empty or all-unidentified garage', () => {
    expect(seriesFilters([], of)).toEqual([]);
    expect(seriesFilters([car('a', null), car('b', '  ')], of)).toEqual([]);
  });

  it('sorts by count, then name, and assigns colours in the fixed order', () => {
    const cars = [car('a', 'Street Beasts'), car('b', 'Speed Demons'), car('c', 'Speed Demons'), car('d', 'Factory Fresh'), car('e', null)];
    expect(seriesFilters(cars, of)).toEqual([
      { series: 'Speed Demons', count: 2, color: colorsR.flame },
      { series: 'Factory Fresh', count: 1, color: colorsR.electric },
      { series: 'Street Beasts', count: 1, color: colorsR.caution },
    ]);
  });

  it('continues with green and red, then cycles', () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F'];
    const colors = seriesFilters(names.map((n) => car(n, n)), of).map((f) => f.color);
    expect(colors).toEqual([...SERIES_COLORS, colorsR.flame]);
    expect(colors.slice(3, 5)).toEqual([colorsR.greenFlag, colorsR.redFlag]);
  });

  it('trims series names so whitespace does not split a group', () => {
    expect(seriesFilters([car('a', 'HW Exotics '), car('b', 'HW Exotics')], of)).toEqual([{ series: 'HW Exotics', count: 2, color: colorsR.flame }]);
  });
});

describe('filterBySeries', () => {
  const cars = [car('a', 'X'), car('b', 'Y'), car('c', null), car('d', 'X')];
  it('keeps every car for ALL, preserving store order', () => {
    expect(filterBySeries(cars, of, null)).toBe(cars);
  });
  it('keeps only the selected series in store order', () => {
    expect(filterBySeries(cars, of, 'X').map((c) => c.uid)).toEqual(['a', 'd']);
  });
  it('falls back to all cars when the series is no longer present', () => {
    expect(filterBySeries(cars, of, 'Gone')).toBe(cars);
  });
});

describe('seriesColor', () => {
  const filters = seriesFilters([car('a', 'X'), car('b', 'X'), car('c', 'Y')], of);
  it('matches the chip colour', () => {
    expect(seriesColor(filters, 'Y')).toBe(colorsR.electric);
  });
  it('is null for missing or unknown series', () => {
    expect(seriesColor(filters, null)).toBeNull();
    expect(seriesColor(filters, 'Z')).toBeNull();
  });
});

describe('recordHolders', () => {
  it('marks every car tied on the top best speed', () => {
    expect([...recordHolders([car('a', null, 200), car('b', null, 247), car('c', null, 247)])]).toEqual(['b', 'c']);
  });
  it('marks nobody when no car has a recorded speed', () => {
    expect(recordHolders([car('a', null, 0), car('b', null, Number.NaN)]).size).toBe(0);
    expect(recordHolders([]).size).toBe(0);
  });
});
