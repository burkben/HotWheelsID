import { describe, expect, it } from 'vitest';
import { fastestReference, formatRaceClock, lapGateSpeeds } from './livePresentation';
import { spokenLapDelta, timingPresentation } from '@/components/redline/readoutPresentation';
const race = { carUid: 'car', lastGateAt: 6859, lapTimes: [3.012, 2.847] };
const passes = [{ id: 2, uid: 'car', at: 6859, raw: 2, scaleMph: 231 }, { id: 1, uid: 'car', at: 4012, raw: 1, scaleMph: 212 }];
describe('live race readouts', () => {
  it.each([[0, '0.000 seconds, equal to fastest lap'], [0.125, '0.125 seconds, slower than fastest lap'], [-0.1, '0.100 seconds, faster than fastest lap'], [NaN, 'Comparison unavailable']])('speaks delta %s without relying on color', (delta, expected) => expect(spokenLapDelta(Number(delta))).toBe(expected));
  it('formats timing tower seconds without changing the shared clock default', () => {
    expect(timingPresentation(3.012, 0.165, 'seconds').time).toBe('3.012');
    expect(timingPresentation(undefined, undefined, 'seconds').time).toBe('—');
  });
  it('formats live hundredths and total minutes/seconds/milliseconds', () => {
    expect(formatRaceClock(2.31)).toBe('2.31');
    expect(formatRaceClock(68.412, true)).toBe('01:08.412');
    expect(formatRaceClock(3600.001, true)).toBe('60:00.001');
    expect(formatRaceClock(-1, true)).toBe('00:00.000');
    expect(formatRaceClock(NaN)).toBe('0.00');
  });
  it('uses race best before personal best, without inventing a reference', () => {
    expect(fastestReference([3, 2.8], 2.5)).toBe(2.8);
    expect(fastestReference([], 2.5)).toBe(2.5);
    expect(fastestReference([], null)).toBeNull();
    expect(fastestReference([NaN, 0], -1)).toBeNull();
  });
  it('matches exact car + closing times in lap order from newest-first passes', () => expect(lapGateSpeeds(race, passes)).toEqual([212, 231]));
  it('omits the entire column when the bounded pass buffer misses a lap', () => expect(lapGateSpeeds(race, passes.slice(0, 1))).toBeNull());
  it('rejects other cars and missing identity', () => {
    expect(lapGateSpeeds({ ...race, carUid: 'other' }, passes)).toBeNull();
    expect(lapGateSpeeds({ ...race, carUid: null }, passes)).toBeNull();
  });
  it('rejects ambiguous timestamps and invalid data', () => {
    expect(lapGateSpeeds(race, [...passes, passes[0]])).toBeNull();
    expect(lapGateSpeeds({ ...race, lapTimes: [NaN] }, passes)).toBeNull();
    expect(lapGateSpeeds({ ...race, lastGateAt: null }, passes)).toBeNull();
  });
});
