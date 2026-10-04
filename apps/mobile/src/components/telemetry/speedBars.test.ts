import { describe, expect, it } from 'vitest';
import { colorsR } from '@/theme/tokens';
import { isSessionBest, recentPassBarColor, sessionPassCaption } from './speedBars';

describe('recent pass bars', () => {
  it.each([[0, colorsR.barMuted], [219.9, colorsR.barMuted], [220, colorsR.flame], [300, colorsR.flame]])('colors older %s mph passes by the canonical threshold', (mph, color) => {
    expect(recentPassBarColor(mph, false, true)).toBe(color);
  });
  it('marks the latest pass even below the threshold', () => {
    expect(recentPassBarColor(120, true, false)).toBe(colorsR.flame);
    expect(recentPassBarColor(120, true, true)).toBe(colorsR.caution);
  });
  it('never calls an empty reading a best and preserves tied-best treatment', () => {
    expect(isSessionBest(0, 0)).toBe(false);
    expect(isSessionBest(219, 240)).toBe(false);
    expect(isSessionBest(240, 240)).toBe(true);
    expect(isSessionBest(250, 240)).toBe(true);
  });
});

it('does not claim a complete session count once the retained buffer is full', () => {
  expect(sessionPassCaption(0)).toBe('SESSION');
  expect(sessionPassCaption(19)).toBe('SESSION');
  expect(sessionPassCaption(20)).toBe('RECENT');
});
