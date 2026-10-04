import type { TextStyle } from 'react-native';

import { colorsR, typeR, type TypeRVariant } from '@/theme/tokens';

/** Resolve after flattening overrides so a caller cannot request a faux face. */
export function resolveRTextStyle(
  variant: TypeRVariant,
  overrides: TextStyle | undefined,
  fontsLoaded: boolean,
): TextStyle {
  const style: TextStyle = { color: colorsR.chalk, ...typeR[variant], ...overrides };
  delete style.fontWeight;
  delete style.fontStyle;
  if (!fontsLoaded) delete style.fontFamily;
  return style;
}
