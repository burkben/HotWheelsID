import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './catalog';
import { evaluate } from './engine';
import { emptyStats } from './stats';
import { latestUnlock, medallionProgress, trophyCountLabel, trophyGroups, unlockedSince } from './trophyPresentation';

const stats = { ...emptyStats(), topSpeedMph: 247, racesFinished: 12, totalLaps: 64, carsCollected: 6, bestLapSeconds: 3.21, longestRaceLaps: 5 };
const views = evaluate(stats, { 'speed-100': 10, 'speed-240': 30, 'speed-200': 20 });
const byId = (id: string) => views.find((v) => v.id === id)!;

describe('trophyGroups', () => {
  it('orders SPEED, RACING, GARAGE with unlocked counts', () => {
    expect(trophyGroups(views).map((g) => [g.title, g.unlocked, g.items.length])).toEqual([
      ['Speed', 3, 4], ['Racing', 2, 5], ['Garage', 2, 4],
    ]);
  });
});

describe('medallionProgress', () => {
  it('shows speed as BEST value/goal and counts as value/goal', () => {
    expect(medallionProgress(byId('speed-290'))).toBe('BEST 247/290');
    expect(medallionProgress(byId('laps-100'))).toBe('64/100');
    expect(medallionProgress(byId('collect-10'))).toBe('6/10');
  });
  it('shows the best for lower-is-better goals', () => {
    expect(medallionProgress(byId('lap-sub3'))).toBe('BEST 3.21S');
  });
  it('hides progress when unlocked or without data', () => {
    expect(medallionProgress(byId('speed-100'))).toBeNull();
    expect(medallionProgress(evaluate(emptyStats()).find((v) => v.id === 'laps-100')!)).toBeNull();
  });
});

describe('latestUnlock', () => {
  it('picks the most recent unlock', () => {
    expect(latestUnlock(views)?.id).toBe('speed-240');
  });
  it('is null when nothing is unlocked', () => {
    expect(latestUnlock(evaluate(emptyStats()))).toBeNull();
  });
  it('picks the later catalog entry from one batch', () => {
    expect(latestUnlock(evaluate(stats, { 'collect-1': 9, 'speed-100': 9, 'speed-240': 9 }))?.id).toBe('collect-1');
    expect(latestUnlock(evaluate(stats, { 'speed-100': 9, 'speed-240': 9 }))?.id).toBe('speed-240');
  });
});

describe('unlockedSince', () => {
  const hydrated = { unlocked: { 'speed-100': 1 }, hydrated: true };
  it('reports new ids in catalog order', () => {
    const next = { unlocked: { 'collect-1': 5, 'speed-100': 1, 'race-first': 5 }, hydrated: true };
    expect(unlockedSince(hydrated, next, ACHIEVEMENTS)).toEqual(['race-first', 'collect-1']);
  });
  it('ignores hydration and unchanged state', () => {
    expect(unlockedSince({ unlocked: {}, hydrated: false }, hydrated, ACHIEVEMENTS)).toEqual([]);
    expect(unlockedSince(hydrated, hydrated, ACHIEVEMENTS)).toEqual([]);
  });
  it('reports nothing on reset', () => {
    expect(unlockedSince(hydrated, { unlocked: {}, hydrated: true }, ACHIEVEMENTS)).toEqual([]);
  });
});

describe('trophyCountLabel', () => {
  it('reads naturally', () => {
    expect(trophyCountLabel(8, 13)).toBe('8 of 13 trophies unlocked');
  });
});
