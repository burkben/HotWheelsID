import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { colorsR, fontR } from '@/theme/tokens';
import { formatSpeedValue, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { FlameTongues, RText, SkewBox } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { spokenUnit } from '@/components/redline/readoutPresentation';
import { describeArc, GAUGE_END_ANGLE, GAUGE_START_ANGLE, polarToCartesian, REDLINE_END_ANGLE, REDLINE_START_ANGLE, redlineHeat, valueToAngle } from './geometry';
import type { SpeedZone } from './Speedometer';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const CIRCUMFERENCE = 2 * Math.PI * 134;
const ARC_LENGTH = CIRCUMFERENCE * (REDLINE_END_ANGLE - REDLINE_START_ANGLE) / 360;

/** Presentation only: shares the needle's existing UI-thread animation value. */
export function RedlineGauge({ angle, readoutMph, max, zones, flameThreshold, size, display, newBest }: {
  angle: SharedValue<number>;
  readoutMph: number;
  max: number;
  zones: readonly SpeedZone[];
  flameThreshold: number;
  size: number;
  display: SpeedDisplay;
  newBest: boolean;
}) {
  const scale = size / 340;
  const fraction = useDerivedValue(() => Math.max(0, Math.min(1, (angle.value - GAUGE_START_ANGLE) / (GAUGE_END_ANGLE - GAUGE_START_ANGLE))));
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: ARC_LENGTH * (1 - fraction.value) }));
  const tipProps = useAnimatedProps(() => {
    const a = (REDLINE_START_ANGLE + fraction.value * (REDLINE_END_ANGLE - REDLINE_START_ANGLE) - 90) * Math.PI / 180;
    return { cx: 170 + 134 * Math.cos(a), cy: 165 + 134 * Math.sin(a) };
  });
  const flames = useAnimatedStyle(() => ({ opacity: redlineHeat(fraction.value * max, flameThreshold) }));
  const ticks = Array.from({ length: Math.floor(max / 10) + 1 }, (_, i) => i * 10);
  const labels = ticks.filter(value => value % 60 === 0);
  const start = polarToCartesian(170, 165, 134, REDLINE_START_ANGLE);
  return (
    <View testID="redline-gauge" accessible accessibilityRole="image" accessibilityLabel={`Speedometer, ${formatSpeedValue(readoutMph, display)} ${spokenUnit(speedUnitLabel(display.unit))}${newBest ? ', new session best' : ''}`} style={{ width: size, height: 300 * scale }}>
      <Animated.View {...decorative} testID="gauge-flames" style={[styles.flames, { top: 196 * scale }, flames]}>
        <FlameTongues width={120 * scale} />
        <FlameTongues width={120 * scale} side="right" />
      </Animated.View>
      <Svg {...decorative} width={size} height={300 * scale} viewBox="0 0 340 300">
        {zones.map((zone, index) => <Path key={zone.from} d={describeArc(170, 165, 152, valueToAngle(zone.from, max, -120, 120), valueToAngle(zone.to, max, -120, 120))} fill="none" stroke={[colorsR.zones.green, colorsR.zones.caution, colorsR.zones.red][index] ?? zone.color} strokeWidth={4} />)}
        <Path d={describeArc(170, 165, 134, REDLINE_START_ANGLE, REDLINE_END_ANGLE)} fill="none" stroke={colorsR.trackGrey} strokeWidth={18} />
        {/* Layered glow works on native SVG and web without CSS filters. */}
        {[{ width: 34, opacity: 0.05 }, { width: 26, opacity: 0.12 }, { width: 18, opacity: 1 }].map(layer => (
          <AnimatedCircle key={layer.width} testID={layer.width === 18 ? 'gauge-arc' : undefined} cx={170} cy={165} r={134} fill="none" stroke={colorsR.flame} strokeWidth={layer.width} opacity={layer.opacity} strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`} strokeDashoffset={ARC_LENGTH} transform="rotate(150 170 165)" animatedProps={arcProps} />
        ))}
        {ticks.map(value => {
          const a = valueToAngle(value, max, REDLINE_START_ANGLE, REDLINE_END_ANGLE);
          const major = value % 30 === 0;
          const outer = polarToCartesian(170, 165, 116 + (major ? 5.5 : 2.5), a);
          const inner = polarToCartesian(170, 165, 116 - (major ? 5.5 : 2.5), a);
          return <Line key={value} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={major ? colorsR.inkSecondary : colorsR.tickMinor} strokeWidth={major ? 3 : 1.5} />;
        })}
        <AnimatedCircle cx={start.x} cy={start.y} r={15} fill={colorsR.flame} opacity={0.3} animatedProps={tipProps} />
        <AnimatedCircle testID="gauge-tip" cx={start.x} cy={start.y} r={6} fill={colorsR.chalk} animatedProps={tipProps} />
      </Svg>
      {labels.map(value => {
        const point = polarToCartesian(170, 165, 100, valueToAngle(value, max, REDLINE_START_ANGLE, REDLINE_END_ANGLE));
        return <View {...decorative} key={value} style={{ position: 'absolute', left: (point.x - 24) * scale, top: (point.y - 9) * scale, width: 48 * scale, alignItems: 'center' }}><RText variant="lapTime" maxFontSizeMultiplier={1} style={{ fontSize: 13 * scale, lineHeight: 18 * scale, color: value >= 240 ? colorsR.redFlag : colorsR.inkMuted, fontFamily: value >= 240 ? fontR.hudBold : fontR.hud }}>{formatSpeedValue(value, display)}</RText></View>;
      })}
      {newBest && <View {...decorative} style={[styles.center, { top: 90 * scale }]}><SkewBox style={{ backgroundColor: colorsR.caution, paddingHorizontal: 10 * scale, paddingVertical: 3 * scale }}><RText variant="wordmark" maxFontSizeMultiplier={1} style={{ color: colorsR.asphalt, fontSize: 15 * scale, lineHeight: 18 * scale, letterSpacing: 1.5 * scale }}>NEW BEST</RText></SkewBox></View>}
      <View {...decorative} style={[styles.center, { top: 116 * scale }]}><RText variant="gaugeReadout" style={{ fontSize: 84 * scale, lineHeight: 84 * scale, width: '100%', textAlign: 'center' }} numberOfLines={1}>{formatSpeedValue(readoutMph, display)}</RText></View>
      <View {...decorative} style={[styles.center, { top: 206 * scale }]}><RText variant="eyebrow" maxFontSizeMultiplier={1} style={{ fontSize: 13 * scale, lineHeight: 18 * scale, letterSpacing: 3 * scale, color: colorsR.inkSecondary }}>SCALE {speedUnitLabel(display.unit).toUpperCase()}</RText></View>
    </View>
  );
}
const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flames: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
});
