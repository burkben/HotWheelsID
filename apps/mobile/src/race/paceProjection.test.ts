import { describe, expect, it } from 'vitest';
import { paceFraction, pointOnTrack, PORTAL_GATE, projectPace, RACE_TRACK_POINTS, wrapFraction } from './paceProjection';

describe('pace projection', () => {
  it('has 201 evenly spaced samples beginning and ending at the portal', () => {
    expect(RACE_TRACK_POINTS).toHaveLength(201);
    expect(RACE_TRACK_POINTS[0]).toEqual(PORTAL_GATE);
    expect(RACE_TRACK_POINTS[200].x).toBeCloseTo(PORTAL_GATE.x);
    const lengths = RACE_TRACK_POINTS.slice(1).map((p, i) => Math.hypot(p.x - RACE_TRACK_POINTS[i].x, p.y - RACE_TRACK_POINTS[i].y));
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(0.08);
  });
  it('moves clockwise from the gate and interpolates between samples', () => {
    expect(pointOnTrack(0.01).x).toBeGreaterThan(PORTAL_GATE.x);
    expect(pointOnTrack(0.01).y).toBe(30);
    expect(pointOnTrack(0.0125).x).toBeCloseTo((pointOnTrack(0.01).x + pointOnTrack(0.015).x) / 2);
  });
  it.each([[1, 0], [1.25, 0.25], [-0.25, 0.75], [0, 0], [NaN, 0]])('wraps %s to %s', (value, expected) => expect(wrapFraction(value)).toBe(expected));
  it('projects elapsed time as a fraction of the reference', () => {
    expect(paceFraction(1, 4)).toEqual({ fraction: 0.25, progress: 0.25, overflow: false });
    expect(projectPace(1, 4)).toMatchObject(pointOnTrack(0.25));
    expect(paceFraction(-1, 4)?.progress).toBe(0);
  });
  it('parks at the gate at and after reference time rather than claiming another lap', () => {
    for (const elapsed of [3, 4.5, 15]) expect(projectPace(elapsed, 3)).toMatchObject({ ...PORTAL_GATE, progress: 1, overflow: true });
  });
  it.each([null, 0, -1, NaN, Infinity])('hides a marker without valid reference %s', reference => expect(projectPace(1, reference)).toBeNull());
  it('never claims a current car position; the faster reference travels farther', () => {
    expect(projectPace(1, 2)!.fraction).toBeGreaterThan(projectPace(1, 3)!.fraction);
  });
});
