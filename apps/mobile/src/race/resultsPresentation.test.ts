import { describe, expect, it } from 'vitest';
import type { Pass } from '@/store/portalStore';
import { lapBarFractions, raceTopSpeed, rankHeats, raceNumberSize, type RaceStartSnapshot } from './resultsPresentation';

const start: RaceStartSnapshot = { carUid: 'car', previousBest: null, at: 1000, lastPassId: 10 };
const pass = (id: number, at: number, scaleMph = 100, uid = 'car'): Pass => ({ id, at, scaleMph, uid, raw: 1 });
describe('race speed window', () => {
  it('takes the max for this car within inclusive bounds, independent of buffer order', () => expect(raceTopSpeed([pass(14, 4000, 999), pass(13, 3000, 190), pass(12, 2000, 999, 'other'), pass(11, 1000, 150), pass(10, 999, 999)], start, 3000)).toBe(190));
  it('falls back when the earliest pass was evicted', () => expect(raceTopSpeed([pass(12, 2000)], start, 3000)).toBeNull());
  it('falls back across a missing intermediate pass or duplicate', () => {
    expect(raceTopSpeed([pass(11, 1000), pass(13, 2000)], start, 3000)).toBeNull();
    expect(raceTopSpeed([pass(11, 1000), pass(11, 1000)], start, 3000)).toBeNull();
  });
  it('falls back without the snapshot, anchor, car or passes', () => {
    expect(raceTopSpeed([], start, 3000)).toBeNull();
    expect(raceTopSpeed([pass(11, 1000)], null, 3000)).toBeNull();
    expect(raceTopSpeed([pass(11, 1000)], { ...start, lastPassId: null }, 3000)).toBeNull();
    expect(raceTopSpeed([pass(11, 1000)], { ...start, carUid: null }, 3000)).toBeNull();
  });
  it('does not substitute another car', () => expect(raceTopSpeed([pass(11, 1000, 200, 'other')], start, 3000)).toBeNull());
  it.each([NaN, Infinity, 0, -1])('rejects invalid speed %s', speed => expect(raceTopSpeed([pass(11, 1000, speed)], start, 3000)).toBeNull());
});
describe('lap chart', () => {
  it('uses lap divided by slowest, including tied slowest', () => expect(lapBarFractions([3, 2, 4, 4])).toEqual([0.75, 0.5, 1, 1]));
  it('omits invalid lengths without poisoning the other bars', () => expect(lapBarFractions([0, NaN, -1, Infinity, 2])).toEqual([0, 0, 0, 0, 1]));
  it('accepts an empty race', () => expect(lapBarFractions([])).toEqual([]));
});

describe('heat ranking', () => {
  it('ranks actual totals without mutating the bracket and keeps ties stable', () => {
    const heats = [{ name: 'A', seconds: 5 }, { name: 'B', seconds: 3 }, { name: 'C', seconds: 3 }, { name: 'D' }];
    expect(rankHeats(heats).map(h => h.name)).toEqual(['B', 'C', 'A', 'D']);
    expect(heats[0].name).toBe('A');
  });
});

describe('numeric cell fit', () => {
  it('keeps the specified size when it fits', () => expect(raceNumberSize('14.903', 94, 24)).toBe(24));
  it('fits long values and reserves room for capped Dynamic Type', () => {
    expect(raceNumberSize('1514.903', 94, 24)).toBeCloseTo(18.077, 2);
    expect(raceNumberSize('1514.903', 94, 24, 2) * 1.3).toBeCloseTo(raceNumberSize('1514.903', 94, 24));
  });
});
