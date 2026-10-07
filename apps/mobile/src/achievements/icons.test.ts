import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './catalog';
import { TROPHY_ICONS, trophyIcon } from './icons';

const require = createRequire(import.meta.url);
const glyphs = JSON.parse(readFileSync(require.resolve('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'), 'utf8')) as Record<string, number>;

describe('trophy icons', () => {
  it('maps every catalog id to an icon', () => {
    for (const a of ACHIEVEMENTS) expect(TROPHY_ICONS[a.id], a.id).toBeTruthy();
  });
  it('uses only glyphs that exist in MaterialCommunityIcons', () => {
    for (const name of [...Object.values(TROPHY_ICONS), trophyIcon('unknown')]) expect(glyphs[name], name).toBeTypeOf('number');
  });
  it('keeps the catalog emoji for sharing', () => {
    expect(ACHIEVEMENTS.every((a) => a.icon.length > 0)).toBe(true);
  });
});
