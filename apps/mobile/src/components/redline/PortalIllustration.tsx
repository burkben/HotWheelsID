import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { colorsR } from '@/theme/tokens';
import { decorative } from './decorative';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Paths copied verbatim from Connect.dc.html. Decorative and offline. */
export function PortalIllustration({ width = 390 }: { width?: number }) {
  const { reduceMotion } = useTelemetryMotion();
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(rotation);
    cancelAnimation(pulse);
    rotation.value = 0;
    pulse.value = 0;
    if (!reduceMotion) {
      rotation.value = withRepeat(withTiming(360, { duration: 20000, easing: Easing.linear }), -1, false);
      pulse.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false);
    }
    return () => { cancelAnimation(rotation); cancelAnimation(pulse); };
  }, [reduceMotion, rotation, pulse]);
  const ring = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const scale = width / 390;
  const outer = useAnimatedProps(() => ({ r: 180 + pulse.value * 30, strokeOpacity: 0.07 * (1 - pulse.value) }));
  const middle = useAnimatedProps(() => ({ r: 140 + pulse.value * 30, strokeOpacity: 0.15 * (1 - pulse.value) }));
  const inner = useAnimatedProps(() => ({ r: 100 + pulse.value * 30, strokeOpacity: 0.3 * (1 - pulse.value) }));
  return <View {...decorative} style={{ width, height: width * 330 / 390 }}>
    <Animated.View testID="radar-dashed" style={[{ position: 'absolute', left: 128 * scale, top: 73 * scale, width: 134 * scale, height: 134 * scale }, ring]}>
      <Svg width="100%" height="100%" viewBox="0 0 134 134"><Circle cx={67} cy={67} r={66} fill="none" stroke={colorsR.flame} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="6 8" /></Svg>
    </Animated.View>
    <Svg {...decorative} testID="portal-illustration" width={width} height={width * 330 / 390} viewBox="0 0 390 330">
    <AnimatedCircle testID="radar-outer" cx={195} cy={140} r={180} fill="none" stroke={colorsR.flame} strokeOpacity={0.07} strokeWidth={2} animatedProps={outer} />
    <AnimatedCircle cx={195} cy={140} r={140} fill="none" stroke={colorsR.flame} strokeOpacity={0.15} strokeWidth={2} animatedProps={middle} />
    <AnimatedCircle cx={195} cy={140} r={100} fill="none" stroke={colorsR.flame} strokeOpacity={0.3} strokeWidth={2} animatedProps={inner} />
    <Path d="M40 330 L350 330 L222 176 L168 176 Z" fill={colorsR.flame} />
    <Path d="M40 330 L168 176" stroke={colorsR.flameDeep} strokeWidth={5} />
    <Path d="M350 330 L222 176" stroke={colorsR.flameDeep} strokeWidth={5} />
    <Path d="M118 330 L178 176" stroke={colorsR.flameMid} strokeWidth={2} />
    <Path d="M272 330 L212 176" stroke={colorsR.flameMid} strokeWidth={2} />
    <Rect x={140} y={176} width={20} height={10} fill={colorsR.steel} />
    <Rect x={230} y={176} width={20} height={10} fill={colorsR.steel} />
    <Path d="M150 180 V124 C150 98 170 84 195 84 C220 84 240 98 240 124 V180" fill={colorsR.pitLane} stroke={colorsR.chalk} strokeWidth={10} strokeLinejoin="round" />
    <Path d="M164 176 V128 C164 110 177 100 195 100 C213 100 226 110 226 128 V176" fill={colorsR.asphalt} />
    <Circle cx={195} cy={92} r={4} fill={colorsR.electric} />
    <Circle cx={195} cy={92} r={9} fill={colorsR.electric} fillOpacity={0.25} />
    <Path d="M186 126 L204 144 L195 152 L195 116 L204 124 L186 142" fill="none" stroke={colorsR.electric} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x={22} y={250} width={56} height={4} rx={2} fill={colorsR.chalk} fillOpacity={0.35} />
    <Rect x={8} y={266} width={44} height={4} rx={2} fill={colorsR.flame} />
    <Rect x={320} y={250} width={56} height={4} rx={2} fill={colorsR.chalk} fillOpacity={0.35} />
    <Rect x={338} y={266} width={44} height={4} rx={2} fill={colorsR.flame} />
  </Svg></View>;
}
