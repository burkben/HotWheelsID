import { describe, expect, it } from 'vitest';
import { raceRecord } from './records';

describe('race record against the start snapshot', () => {
  it('awards the first race', () => expect(raceRecord(3, null)).toEqual({ isRecord: true, improvement: null }));
  it('awards a faster lap with its improvement', () => expect(raceRecord(2.5, 3)).toEqual({ isRecord: true, improvement: 0.5 }));
  it('does not award a slower lap', () => expect(raceRecord(3.5, 3).isRecord).toBe(false));
  it('does not award a tie', () => expect(raceRecord(3, 3).isRecord).toBe(false));
  it('does not assume a first race without a snapshot', () => expect(raceRecord(3, undefined).isRecord).toBe(false));
  it.each([0, -1, NaN, Infinity])('rejects invalid lap %s', lap => expect(raceRecord(lap, null).isRecord).toBe(false));
  it.each([0, -1, NaN, Infinity])('rejects invalid previous best %s', best => expect(raceRecord(3, best).isRecord).toBe(false));
});
