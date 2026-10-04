import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { decorative } from './decorative';

export function SkewBox({ angle = -12, style, contentStyle, children }: {
  angle?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View {...decorative} style={[style, { transform: [{ skewX: `${angle}deg` }] }]}>
      <View style={[contentStyle, { transform: [{ skewX: `${-angle}deg` }] }]}>{children}</View>
    </View>
  );
}
