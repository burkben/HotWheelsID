import { describe, expect, it } from 'vitest';

import { fontR, typeR, type TypeRVariant } from '@/theme/tokens';
import { resolveRTextStyle } from './textStyle';

describe('Redline text face resolution', () => {
  it.each(Object.keys(typeR) as TypeRVariant[])('%s uses its face without synthesized weight or style', (variant) => {
    const style = resolveRTextStyle(variant, { fontWeight: '900', fontStyle: 'italic' }, true);
    expect(style.fontFamily).toBe(typeR[variant].fontFamily);
    expect(Object.values(fontR)).toContain(style.fontFamily);
    expect(style).not.toHaveProperty('fontWeight');
    expect(style).not.toHaveProperty('fontStyle');
  });

  it.each(Object.keys(typeR) as TypeRVariant[])('%s falls back to system text when fonts fail', (variant) => {
    const style = resolveRTextStyle(variant, { color: '#123456', fontSize: 42 }, false);
    expect(style).not.toHaveProperty('fontFamily');
    expect(style.color).toBe('#123456');
    expect(style.fontSize).toBe(42);
  });

  it('keeps tabular figures for HUD values and accepts an explicit bundled face', () => {
    const style = resolveRTextStyle('statValue', { fontFamily: fontR.hudMedium }, true);
    expect(style.fontFamily).toBe(fontR.hudMedium);
    expect(style.fontVariant).toEqual(['tabular-nums']);
  });

  it('does not mutate shared tokens or caller styles', () => {
    const overrides = Object.freeze({ fontWeight: '900' as const, fontStyle: 'italic' as const });
    resolveRTextStyle('screenTitle', overrides, false);
    expect(overrides.fontWeight).toBe('900');
    expect(typeR.screenTitle.fontFamily).toBe(fontR.display);
  });
});
