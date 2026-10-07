import { afterEach, describe, expect, it } from 'vitest';
import { dateTab, formatStartTime, groupSessions, heatStrip, heatStripLabel, localDay, recordSessionIds, sessionLength, sparkPoints } from './heat';

// Local-time constructors keep these tests valid in any time zone.
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const session = (id: number, startedAt: number, passCount = 1, bestMph = 100, endedAt: number | null = startedAt + 60_000) => ({ id, startedAt, endedAt, passCount, bestMph });
const NOW = at(2026, 10, 4, 19, 42); // Sunday

describe('heatStrip', () => {
  it('buckets by local day, oldest to today', () => {
    const strip = heatStrip([
      session(1, at(2026, 10, 4, 0, 1), 5),
      session(2, at(2026, 10, 4, 23, 59), 6),
      session(3, at(2026, 10, 3, 23, 59), 2),
      session(4, at(2026, 9, 21, 0, 0), 4),
      session(5, at(2026, 9, 20, 23, 59), 9),
    ], NOW);
    expect(strip.days).toHaveLength(14);
    expect(strip.days[13]).toMatchObject({ sessions: 2, passes: 11, level: 2, isToday: true, letter: 'S' });
    expect(strip.days[12]).toMatchObject({ sessions: 1, level: 1, letter: 'S' });
    expect(strip.days[0]).toMatchObject({ date: localDay(at(2026, 9, 21)), sessions: 1, letter: 'M' });
    expect(strip.sessions).toBe(4);
    expect(strip.passes).toBe(17);
  });

  it('caps the ramp at three and ignores future sessions', () => {
    const many = [1, 2, 3, 4].map((i) => session(i, at(2026, 10, 2, 10 + i)));
    const strip = heatStrip([...many, session(9, at(2026, 10, 5, 9))], NOW);
    expect(strip.days[11].level).toBe(3);
    expect(strip.sessions).toBe(4);
  });

  it('summarises the strip in one label', () => {
    expect(heatStripLabel(heatStrip([], NOW))).toBe('Last 14 days: 0 sessions, 0 passes.');
    const strip = heatStrip([session(1, at(2026, 10, 4), 1), session(2, at(2026, 10, 1), 3), session(3, at(2026, 10, 1, 15), 2)], NOW);
    expect(heatStripLabel(strip)).toBe('Last 14 days: 3 sessions, 6 passes. Busiest: Thursday, 2 sessions.');
    expect(heatStripLabel(heatStrip([session(1, at(2026, 10, 4), 1)], NOW))).toBe('Last 14 days: 1 session, 1 pass. Busiest: today, 1 session.');
    const tie = heatStrip([session(1, at(2026, 9, 26), 1), session(2, at(2026, 9, 30), 1)], NOW);
    expect(heatStripLabel(tie)).toBe('Last 14 days: 2 sessions, 2 passes. Busiest: Wednesday, 1 session.');
  });
});

describe('time zones and DST', () => {
  const original = process.env.TZ;
  // Assigning undefined would store the string "undefined" (read as UTC).
  afterEach(() => { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; });

  it('keeps a 14-day window across the US fall-back transition', () => {
    process.env.TZ = 'America/New_York';
    const now = new Date(2026, 10, 8, 9).getTime(); // 1 Nov 2026 was the DST change
    const strip = heatStrip([session(1, new Date(2026, 10, 1, 0, 30).getTime()), session(2, new Date(2026, 9, 31, 23, 30).getTime())], now);
    const dates = strip.days.map((d) => new Date(d.date));
    expect(dates.every((d) => d.getHours() === 0)).toBe(true);
    expect(dates[0].getDate()).toBe(26);
    expect(strip.days.find((d) => new Date(d.date).getDate() === 1)?.sessions).toBe(1);
    expect(strip.days.find((d) => new Date(d.date).getDate() === 31)?.sessions).toBe(1);
  });

  it('groups by the device time zone, not UTC', () => {
    process.env.TZ = 'Asia/Tokyo';
    const now = new Date(2026, 9, 4, 1).getTime();
    const lateYesterday = new Date(2026, 9, 3, 23, 50).getTime();
    expect(groupSessions([{ startedAt: lateYesterday }], now)[0].key).toBe('THIS WEEK');
  });
});

describe('groupSessions', () => {
  it('splits today, the previous six days and earlier, keeping order', () => {
    const rows = [at(2026, 10, 4, 19), at(2026, 10, 4, 0, 0), at(2026, 10, 3, 23, 59), at(2026, 9, 28, 0, 0), at(2026, 9, 27, 23, 59)].map((t, i) => session(i, t));
    expect(groupSessions(rows, NOW).map((g) => [g.key, g.sessions.map((s) => s.id)])).toEqual([
      ['TODAY', [0, 1]],
      ['THIS WEEK', [2, 3]],
      ['EARLIER', [4]],
    ]);
  });
  it('drops empty groups', () => {
    expect(groupSessions([session(1, at(2026, 8, 1))], NOW).map((g) => g.key)).toEqual(['EARLIER']);
    expect(groupSessions([], NOW)).toEqual([]);
  });
});

describe('row formatting', () => {
  it('builds date tabs and start times locally', () => {
    expect(dateTab(at(2026, 9, 30))).toEqual({ day: '30', month: 'SEP' });
    expect(formatStartTime(at(2026, 10, 4, 19, 42))).toBe('7:42 PM');
    expect(formatStartTime(at(2026, 10, 4, 0, 5))).toBe('12:05 AM');
  });
  it('describes finished and live lengths', () => {
    expect(sessionLength(0, 18 * 60_000, 0)).toBe('18 min');
    expect(sessionLength(0, 45_000, 0)).toBe('45s');
    expect(sessionLength(0, null, 12 * 60_000)).toBe('12 min so far');
  });
  it('marks every session tied on the all-time best', () => {
    expect([...recordSessionIds([session(1, 0, 1, 247), session(2, 0, 1, 226), session(3, 0, 1, 247)])]).toEqual([1, 3]);
    expect(recordSessionIds([session(1, 0, 0, 0)]).size).toBe(0);
  });
});

describe('sparkPoints', () => {
  it('needs two passes', () => {
    expect(sparkPoints([])).toBeNull();
    expect(sparkPoints([200])).toBeNull();
  });
  it('draws faster passes higher and spans the width', () => {
    expect(sparkPoints([100, 200])).toBe('0,22 54,2');
    expect(sparkPoints([150, 150])).toBe('0,12 54,12');
  });
  it('samples long sessions down, keeping the first and last pass', () => {
    const points = sparkPoints(Array.from({ length: 100 }, (_, i) => i))!.split(' ');
    expect(points).toHaveLength(12);
    expect(points[0]).toBe('0,22');
    expect(points[11]).toBe('54,2');
  });
});
