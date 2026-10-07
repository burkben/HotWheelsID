import { describe, expect, it } from 'vitest';
import { bestArcFraction, garageRank, garageRankTag } from './rank';

const cars = [
  { uid: 'a', bestMph: 231 },
  { uid: 'b', bestMph: 247 },
  { uid: 'c', bestMph: 247 },
  { uid: 'd', bestMph: 0 },
  { uid: 'e', bestMph: 120 },
  { uid: 'f', bestMph: 100 },
];

describe('garageRank', () => {
  it('ranks by best speed with shared places for ties', () => {
    expect(['b', 'c', 'a', 'e', 'f'].map((uid) => garageRank(cars, uid))).toEqual([1, 1, 3, 4, 5]);
  });
  it('leaves cars without a speed, and missing cars, unranked', () => {
    expect(garageRank(cars, 'd')).toBeNull();
    expect(garageRank(cars, 'zzz')).toBeNull();
    expect(garageRank([{ uid: 'x', bestMph: Number.NaN }], 'x')).toBeNull();
  });
  it('ranks a lone car first', () => {
    expect(garageRank([{ uid: 'x', bestMph: 10 }], 'x')).toBe(1);
  });
});

describe('garageRankTag', () => {
  it('tags only the top three', () => {
    expect([1, 2, 3, 4, null].map(garageRankTag)).toEqual(['GARAGE #1', 'GARAGE #2', 'GARAGE #3', null, null]);
  });
});

describe('bestArcFraction', () => {
  it('scales and clamps to the gauge', () => {
    expect(bestArcFraction(150, 300)).toBe(0.5);
    expect(bestArcFraction(400, 300)).toBe(1);
    expect(bestArcFraction(0, 300)).toBe(0);
    expect(bestArcFraction(Number.NaN, 300)).toBe(0);
    expect(bestArcFraction(100, 0)).toBe(0);
  });
});
