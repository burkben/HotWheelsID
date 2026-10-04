import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colorsR, skewR } from '@/theme/tokens';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { decorative } from './decorative';
import { webSpacePress } from './webSpacePress';

export function SkewSwitch({ value, onValueChange, accessibilityLabel, disabled = false }: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}) {
  const { reduceMotion, needleSpring } = useTelemetryMotion();
  const x = useSharedValue(value ? 26 : 0);
  const { damping, stiffness, mass, overshootClamping } = needleSpring;
  useEffect(() => {
    x.value = reduceMotion ? (value ? 26 : 0) : withSpring(value ? 26 : 0, { damping, stiffness, mass, overshootClamping });
  }, [value, reduceMotion, x, damping, stiffness, mass, overshootClamping]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <Pressable {...webSpacePress(() => onValueChange(!value), disabled)} onPress={() => onValueChange(!value)} disabled={disabled} accessibilityRole="switch" accessibilityLabel={accessibilityLabel} aria-checked={value} accessibilityState={{ checked: value, disabled }} style={({ pressed }) => [styles.touch, disabled && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
      <View {...decorative} style={[styles.track, { backgroundColor: value ? colorsR.flame : colorsR.steel }]}>
        <Animated.View style={[styles.knob, { backgroundColor: value ? colorsR.asphalt : colorsR.inkMuted }, knob]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: { width: 62, height: 44, alignItems: 'center', justifyContent: 'center' },
  track: { width: 54, height: 30, padding: 3, transform: [{ skewX: skewR.button }] },
  knob: { width: 22, height: 24 },
});
