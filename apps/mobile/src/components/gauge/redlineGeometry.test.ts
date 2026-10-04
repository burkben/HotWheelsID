import { describe, expect, it } from 'vitest';
import { describeArc, polarToCartesian, REDLINE_START_ANGLE, REDLINE_END_ANGLE, valueToAngle, redlineHeat } from './geometry';

describe('Redline gauge geometry', () => {
  it.each([[0, -120], [60, -72], [150, 0], [280, 104], [300, 120], [-1, -120], [400, 120]])('maps %s mph to %s degrees', (mph, angle) => {
    expect(valueToAngle(mph, 300, REDLINE_START_ANGLE, REDLINE_END_ANGLE)).toBeCloseTo(angle);
  });
  it('leaves a 120 degree bottom gap and sweeps clockwise over the top', () => {
    const start = polarToCartesian(170, 165, 134, REDLINE_START_ANGLE);
    const end = polarToCartesian(170, 165, 134, REDLINE_END_ANGLE);
    expect(start.x).toBeCloseTo(53.9526);
    expect(start.y).toBeCloseTo(232);
    expect(end.x).toBeCloseTo(286.0474);
    expect(end.y).toBeCloseTo(232);
    expect(describeArc(170, 165, 134, -120, 120)).toContain('A 134 134 0 1 1');
  });
  it.each([[0, 0], [200, 0], [220, 0.3], [239, 0.585], [240, 1], [280, 1]])('maps animated %s mph to flame opacity %s', (mph, heat) => {
    expect(redlineHeat(mph, 240)).toBeCloseTo(heat);
  });
  it('keeps the heat ramp relative to the supplied threshold', () => {
    expect(redlineHeat(180, 200)).toBeCloseTo(0.3);
  });
});
