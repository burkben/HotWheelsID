/** Recent accepted passes, oldest → newest, in canonical scale mph. */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { colorsR, speedGauge } from '@/theme/tokens';
import { DEFAULT_SPEED_DISPLAY, formatSpeedValue, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { decorative } from '../redline/decorative';
import { RText } from '../redline/RText';
import { spokenUnit } from '../redline/readoutPresentation';
import { useTelemetryMotion } from './useTelemetryMotion';
import { recentPassBarColor } from './speedBars';

export interface SpeedTraceProps {
  values: number[];
  height?: number;
  sampleKeys?: number[];
  newBest?: boolean;
  display?: SpeedDisplay;
}

export function SpeedTrace({ values, height = 84, sampleKeys, newBest = false, display = DEFAULT_SPEED_DISPLAY }: SpeedTraceProps) {
  const recent = values.slice(-14);
  const keys = sampleKeys?.slice(-14);
  return (
    <View testID="recent-pass-bars" accessible accessibilityRole="image" accessibilityLabel={recent.length ? `Recent passes, oldest to newest: ${recent.map(value => formatSpeedValue(value, display)).join(', ')} ${spokenUnit(speedUnitLabel(display.unit))}. Threshold ${formatSpeedValue(220, display)} ${spokenUnit(speedUnitLabel(display.unit))}.` : 'No passes recorded this session.'} style={[styles.box, { height }]}>
      <View {...decorative} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%"><Line x1={0} x2="100%" y1={height * (1 - 220 / speedGauge.maxMph)} y2={height * (1 - 220 / speedGauge.maxMph)} stroke={colorsR.redFlag} strokeOpacity={0.5} strokeWidth={1} strokeDasharray="3 3" /></Svg>
      </View>
      {recent.map((mph, index) => <Bar key={keys?.[index] ?? index} mph={mph} height={height} color={recentPassBarColor(mph, index === recent.length - 1, newBest)} />)}
      {recent.length > 0 && Array.from({ length: 14 - recent.length }, (_, i) => <View key={`empty-${i}`} {...decorative} style={{ flex: 1 }} />)}
      {recent.length === 0 && <RText variant="bodySmall" style={styles.empty}>Send a car through the portal</RText>}
    </View>
  );
}

function Bar({ mph, height, color }: { mph: number; height: number; color: string }) {
  const { reduceMotion } = useTelemetryMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    grow.value = reduceMotion ? 1 : withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion, grow]);
  const animated = useAnimatedStyle(() => ({ transform: [{ skewX: '-10deg' }, { scaleY: grow.value }] }));
  return <Animated.View {...decorative} testID="pass-bar" style={[styles.bar, { height: Math.max(4, Math.min(1, Math.max(0, mph) / speedGauge.maxMph) * height), backgroundColor: color }, animated]} />;
}
const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, borderBottomWidth: 1, borderBottomColor: colorsR.chartBaseline, marginHorizontal: 7 },
  bar: { flex: 1, transformOrigin: 'bottom' },
  empty: { alignSelf: 'center', flex: 1, textAlign: 'center', color: colorsR.inkMuted },
});
