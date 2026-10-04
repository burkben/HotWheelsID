import { useState } from 'react';
import { Pressable, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colorsR } from '@/theme/tokens';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { decorative } from './decorative';
import { RText } from './RText';
import { SkewBox } from './SkewBox';

export interface RaceButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'primary' | 'ghost' | 'destructive';
  chevron?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function RaceButton({ label, variant = 'primary', chevron = false, fullWidth = false, disabled, style, accessibilityLabel = label, ...props }: RaceButtonProps) {
  const primary = variant === 'primary';
  const minimumHeight = primary ? 56 : 52;
  const [height, setHeight] = useState(minimumHeight);
  const { reduceMotion } = useTelemetryMotion();
  const ink = primary ? colorsR.asphalt : variant === 'destructive' ? colorsR.redFlag : colorsR.chalk;
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
      onLayout={event => { setHeight(event.nativeEvent.layout.height); props.onLayout?.(event); }}
      style={({ pressed }) => [
        styles.button,
        { minHeight: minimumHeight, alignSelf: fullWidth ? 'stretch' : 'flex-start', marginHorizontal: fullWidth ? height * Math.tan(Math.PI / 15) : 6 },
        style,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.85, transform: [{ scale: reduceMotion ? 1 : 0.98 }] },
      ]}
    >
      <SkewBox style={[StyleSheet.absoluteFill, { backgroundColor: primary ? colorsR.flame : 'transparent', borderWidth: primary ? 0 : 2, borderColor: ink }]} />
      <RText variant={primary ? 'buttonPrimary' : 'buttonGhost'} style={[styles.label, { color: ink }]}>{label}</RText>
      {chevron && <View {...decorative}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M9 5l7 7-7 7" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, paddingVertical: 10, paddingHorizontal: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { textAlign: 'center', flexShrink: 1 },
});
