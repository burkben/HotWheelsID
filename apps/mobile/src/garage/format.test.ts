import { describe, expect, it } from 'vitest';

import { carLabel, formatLap, formatLastSeen, formatMph, shortUid } from './format';

describe('garage formatters', () => {
  it('shortens a 6-octet UID to its last two octets', () => {
    expect(shortUid('6C:C4:5A:2B:64:81')).toBe('64:81');
    expect(shortUid('AB')).toBe('AB'); // too short to shorten
  });

  it('labels a car by nickname when set, else the short UID', () => {
    expect(carLabel({ name: 'Twin Mill', uid: '6C:C4:5A:2B:64:81' })).toBe('Twin Mill');
    expect(carLabel({ name: null, uid: '6C:C4:5A:2B:64:81' })).toBe('64:81');
    expect(carLabel({ name: '   ', uid: '6C:C4:5A:2B:64:81' })).toBe('64:81'); // blank ⇒ UID
  });

  it('formats best mph, dashing an unrecorded speed', () => {
    expect(formatMph(18.6)).toBe('19');
    expect(formatMph(0)).toBe('—');
  });

  it('formats best lap, dashing an unraced car', () => {
    expect(formatLap(3.14159)).toBe('3.14s');
    expect(formatLap(null)).toBe('—');
    expect(formatLap(0)).toBe('—');
  });

  it('formats last-seen relative to now', () => {
    const now = 10_000_000_000;
    expect(formatLastSeen(now - 5_000, now)).toBe('just now');
    expect(formatLastSeen(now - 5 * 60_000, now)).toBe('5m ago');
    expect(formatLastSeen(now - 3 * 3_600_000, now)).toBe('3h ago');
    expect(formatLastSeen(now - 2 * 86_400_000, now)).toBe('2d ago');
    expect(formatLastSeen(now + 5_000, now)).toBe('just now'); // clock skew guard
  });
});
