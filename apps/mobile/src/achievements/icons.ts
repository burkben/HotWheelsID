/**
 * UI icons for achievements (SPEC §4.10). The catalog keeps its emoji `icon` for
 * sharing and tests; screens draw these MaterialCommunityIcons glyphs instead.
 */
import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type TrophyIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const TROPHY_ICONS: Readonly<Record<string, TrophyIconName>> = {
  'speed-100': 'speedometer-slow',
  'speed-200': 'lightning-bolt',
  'speed-240': 'fire',
  'speed-290': 'star-four-points',
  'race-first': 'flag-checkered',
  'race-10': 'repeat',
  'laps-100': 'timer-sand',
  'race-marathon': 'road-variant',
  'lap-sub3': 'timer-outline',
  'collect-1': 'key-variant',
  'collect-5': 'car-side',
  'collect-10': 'view-grid-outline',
  'collect-25': 'layers-triple-outline',
};

/** Unknown ids (a future catalog entry) still render a trophy. */
export function trophyIcon(id: string): TrophyIconName {
  return TROPHY_ICONS[id] ?? 'trophy-outline';
}
