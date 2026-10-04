import { Platform } from 'react-native';

/** SVG web forwards unknown native props to the DOM, so use ARIA there. */
export const decorative = Platform.OS === 'web' ? {
  'aria-hidden': true,
  focusable: false,
  pointerEvents: 'none',
} as const : {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
  pointerEvents: 'none',
} as const;
