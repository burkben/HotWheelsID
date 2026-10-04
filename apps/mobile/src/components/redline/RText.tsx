import { useContext } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { RedlineFontContext } from '@/theme/RedlineFontContext';
import type { TypeRVariant } from '@/theme/tokens';
import { resolveRTextStyle } from './textStyle';

export type RTextProps = TextProps & { variant?: TypeRVariant };

export function RText({ variant = 'body', style, ...props }: RTextProps) {
  const fontsLoaded = useContext(RedlineFontContext);
  const body = variant === 'body' || variant === 'bodySmall';
  return (
    <Text
      maxFontSizeMultiplier={body ? 0 : 1.3}
      {...props}
      style={resolveRTextStyle(variant, StyleSheet.flatten(style), fontsLoaded)}
    />
  );
}
