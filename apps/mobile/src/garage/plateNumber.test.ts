import { describe, expect, it } from 'vitest';
import { plateNumber } from './plateNumber';

describe('plateNumber', () => {
  const cars = [{ uid: 'C', firstSeen: 30 }, { uid: 'A', firstSeen: 10 }, { uid: 'B', firstSeen: 20 }];
  it('numbers by firstSeen, one-based and zero-padded', () => {
    expect(plateNumber(cars, 'A')).toBe('01');
    expect(plateNumber(cars, 'B')).toBe('02');
    expect(plateNumber(cars, 'C')).toBe('03');
  });
  it('does not change the store array order', () => {
    const original = Object.freeze([...cars]);
    plateNumber(original, 'A');
    expect(original.map(({ uid }) => uid)).toEqual(['C', 'A', 'B']);
  });
  it('breaks timestamp ties by UID independent of input order', () => {
    const tied = [{ uid: 'B', firstSeen: 10 }, { uid: 'A', firstSeen: 10 }];
    expect(plateNumber(tied, 'A')).toBe('01');
    expect(plateNumber([...tied].reverse(), 'A')).toBe('01');
    expect(plateNumber(tied, 'B')).toBe('02');
  });
  it('shows unknown for missing cars and an empty garage', () => {
    expect(plateNumber(cars, 'missing')).toBe('?');
    expect(plateNumber([], 'A')).toBe('?');
  });
  it('retains three digits for a large garage', () => {
    const large = Array.from({ length: 100 }, (_, i) => ({ uid: String(i), firstSeen: i }));
    expect(plateNumber(large, '99')).toBe('100');
  });
});
