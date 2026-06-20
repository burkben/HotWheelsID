import { describe, expect, it } from 'vitest';

import type { RaceResult } from '../race/raceEngine';
import type { SessionPass, SessionSummary } from '../store/persistence/sessionRepository';
import { formatLapTime, raceShareText, sessionShareText } from './summary';

const EM_DASH = '\u2014';
const FLASH = '\u26A1';

function makeResult(over: Partial<RaceResult> = {}): RaceResult {
  return {
    player: 'Ben',
    carUid: '6C:C4:5A:2B:64:81',
    lapCount: 3,
    lapTimes: [2.5, 2.1, 2.8],
    totalTime: 7.4,
    bestLap: 2.1,
    bestLapNum: 2,
    worstLap: 2.8,
    worstLapNum: 3,
    avgLap: 2.47,
    finishedAt: 1_700_000_000_000,
    ...over,
  };
}

function makeSession(over: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id: 1,
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_000_090_000,
    passCount: 3,
    bestMph: 250,
    ...over,
  };
}

function makePass(over: Partial<SessionPass> = {}): SessionPass {
  return {
    id: 1,
    sessionId: 1,
    carUid: '6C:C4:5A:2B:64:81',
    serial: null,
    raw: 0,
    scaleMph: 100,
    at: 1_700_000_000_000,
    ...over,
  };
}

describe('formatLapTime', () => {
  it('formats sub-minute as SS.sss', () => {
    expect(formatLapTime(2.1)).toBe('2.10s');
  });

  it('rolls over past a minute to M:SS.ss', () => {
    expect(formatLapTime(65)).toBe('1:05.00');
  });

  it('returns an em dash for non-finite input', () => {
    expect(formatLapTime(Number.NaN)).toBe(EM_DASH);
    expect(formatLapTime(Number.POSITIVE_INFINITY)).toBe(EM_DASH);
  });
});

describe('raceShareText', () => {
  it('summarizes a multi-lap race with splits and a lap list', () => {
    const text = raceShareText(makeResult());
    expect(text).toContain('Ben finished 3 laps in 7.40s');
    expect(text).toContain('Car: 64:81'); // falls back to short UID
    expect(text).toContain('Best lap 2.10s (lap 2)');
    expect(text).toContain('Average 2.47s');
    expect(text).toContain('Worst lap 2.80s (lap 3)');
    expect(text).toContain('Laps:');
    expect(text).toContain('via RedlineID');
  });

  it('flags the fastest lap in the lap list', () => {
    const lines = raceShareText(makeResult()).split('\n');
    expect(lines).toContain(`  2. 2.10s ${FLASH}`);
    expect(lines).toContain('  1. 2.50s');
    expect(lines).toContain('  3. 2.80s');
  });

  it('uses the singular lap label for a one-lap race', () => {
    const text = raceShareText(makeResult({ lapCount: 1, lapTimes: [3.2], bestLapNum: 1, worstLapNum: 1 }));
    expect(text).toContain('finished 1 lap in');
  });

  it('prefers a provided car nickname over the UID', () => {
    const text = raceShareText(makeResult(), { carName: 'Twin Mill' });
    expect(text).toContain('Car: Twin Mill');
    expect(text).not.toContain('64:81');
  });

  it('omits the lap list when there are no recorded laps', () => {
    const text = raceShareText(makeResult({ lapTimes: [] }));
    expect(text).not.toContain('Laps:');
    expect(text).toContain('via RedlineID');
  });
});

describe('sessionShareText', () => {
  const passes = [
    makePass({ id: 1, scaleMph: 100, carUid: 'AA' }),
    makePass({ id: 2, scaleMph: 250, carUid: 'BB' }),
    makePass({ id: 3, scaleMph: 180, carUid: null }),
  ];

  it('recaps a session in mph with the fastest passes first', () => {
    const text = sessionShareText(makeSession(), passes, {
      carNames: new Map([['BB', 'Bone Shaker']]),
    });
    expect(text).toContain('Race session');
    expect(text).toContain('3 passes');
    expect(text).toContain('Best 250 mph');
    const lines = text.split('\n');
    expect(lines).toContain('Top 3 passes:');
    expect(lines).toContain('  1. 250 mph \u2014 Bone Shaker'); // nickname from map
    expect(lines).toContain('  2. 180 mph \u2014 Unknown car'); // null carUid
    expect(lines).toContain('  3. 100 mph \u2014 AA'); // short UID fallback
    expect(text).toContain('via RedlineID');
  });

  it('converts speeds and unit label to km/h', () => {
    const text = sessionShareText(makeSession({ bestMph: 200 }), [makePass({ scaleMph: 200, carUid: 'AA' })], {
      display: { unit: 'kmh', calibration: 1 },
    });
    expect(text).toContain('Best 322 km/h'); // 200 * 1.609344 = 321.87 -> 322
    expect(text).toContain('  1. 322 km/h \u2014 AA');
  });

  it('applies a calibration trim to shared speeds', () => {
    const text = sessionShareText(makeSession({ bestMph: 200 }), [], {
      display: { unit: 'mph', calibration: 1.1 },
    });
    expect(text).toContain('Best 220 mph'); // 200 * 1.1
  });

  it('handles an empty session: em-dash best, no top list', () => {
    const text = sessionShareText(makeSession({ passCount: 0, bestMph: 0 }), []);
    expect(text).toContain(`Best ${EM_DASH} mph`);
    expect(text).not.toContain('Top');
    expect(text).toContain('via RedlineID');
  });

  it('respects topN and singular labels', () => {
    const text = sessionShareText(makeSession({ passCount: 1 }), passes, { topN: 1 });
    expect(text).toContain('1 pass');
    const lines = text.split('\n');
    expect(lines).toContain('Top pass:');
    expect(lines).toContain('  1. 250 mph \u2014 BB');
    expect(lines).not.toContain('  2. 180 mph \u2014 Unknown car');
  });
});
