import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { Kerb } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { colorsR } from '@/theme/tokens';
import { paceFraction } from '../paceProjection';

function Segment({ completed, fastest, current, elapsed, reference }: { completed: boolean; fastest: boolean; current: boolean; elapsed: SharedValue<number>; reference: number | null }) {
  const { reduceMotion } = useTelemetryMotion();
  const previouslyComplete = useRef(completed);
  const completion = useSharedValue(completed ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) completion.value = completed ? 1 : 0;
    else if (completed && !previouslyComplete.current) {
      completion.value = 0;
      completion.value = withTiming(1, { duration: 300 });
    } else if (!completed) completion.value = 0;
    previouslyComplete.current = completed;
  }, [completed, reduceMotion, completion]);
  const fill = useAnimatedStyle(() => {
    const progress = completed ? completion.value : current && !reduceMotion ? paceFraction(elapsed.value, reference)?.progress ?? 0 : 0;
    return { width: `${progress * 100}%`, opacity: completed && completion.value === 1 ? 0 : 1 };
  });
  const surface = useAnimatedStyle(() => ({ backgroundColor: completed && completion.value === 1 ? fastest ? colorsR.electric : colorsR.flame : colorsR.steel }));
  return <Animated.View testID="lap-segment" style={[styles.segment, surface]}>
    <Animated.View testID={current ? 'current-lap-fill' : undefined} style={[styles.fill, fill]}><Kerb height={14} stripe={6} /></Animated.View>
  </Animated.View>;
}
export function LapSegments({ laps, target, elapsed, reference, armed }: { laps: readonly number[]; target: number; elapsed: SharedValue<number>; reference: number | null; armed: boolean }) {
  const fastest = laps.length ? Math.min(...laps) : null;
  return <View accessible accessibilityRole="image" accessibilityLabel={`${laps.length} of ${target} laps complete${armed ? `, lap ${Math.min(laps.length + 1, target)} in progress` : ', waiting for the first gate crossing'}`}>
    <View {...decorative} style={styles.row}>{Array.from({ length: target }, (_, index) => <Segment key={index} completed={index < laps.length} fastest={laps[index] === fastest} current={index === laps.length && armed} elapsed={elapsed} reference={reference} />)}</View>
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 6 },
  segment: { flex: 1, height: 14, overflow: 'hidden', transform: [{ skewX: '-20deg' }] },
  fill: { height: 14, overflow: 'hidden' },
});
