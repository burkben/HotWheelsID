import { describe, expect, it } from 'vitest';
import { spokenUnit, timingPresentation } from './readoutPresentation';

describe('spokenUnit', () => {
  it.each([['MPH', 'miles per hour'], ['km/h', 'kilometers per hour'], ['s', 'seconds'], ['ms', 'milliseconds'], ['passes', 'passes'], ['', '']])('expands %s', (unit, expected) => expect(spokenUnit(unit)).toBe(expected));
});
describe('timingPresentation', () => {
  it('formats seconds and a signed slower delta', () => expect(timingPresentation(3.012, 0.165)).toEqual({ time: '00:03.012', delta: '+0.165', slower: true, spoken: '3.012 seconds' }));
  it('keeps faster and tied deltas distinct', () => {
    expect(timingPresentation(2.847, -0.1)).toMatchObject({ delta: '-0.100', slower: false });
    expect(timingPresentation(0, 0)).toMatchObject({ time: '00:00.000', delta: '0.000', slower: false });
  });
  it('carries rounding into the next minute', () => expect(timingPresentation(59.9999).time).toBe('01:00.000'));
  it.each([undefined, NaN, Infinity, -1])('does not invent unavailable time %s', seconds => expect(timingPresentation(seconds, NaN)).toEqual({ time: '—', delta: undefined, slower: false, spoken: 'Time unavailable' }));
});
