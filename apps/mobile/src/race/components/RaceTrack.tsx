import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { colorsR } from '@/theme/tokens';
import { projectPace, RACE_TRACK_PATH } from '../paceProjection';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
function PaceMarker({ elapsed, reference, ghost, reduceMotion }: { elapsed: SharedValue<number>; reference: number; ghost: boolean; reduceMotion: boolean }) {
  const props = useAnimatedProps(() => {
    const point = projectPace(reduceMotion ? 0 : elapsed.value, reference)!;
    return { cx: point.x, cy: point.y };
  });
  const halo = useAnimatedProps(() => {
    const point = projectPace(reduceMotion ? 0 : elapsed.value, reference)!;
    const pulse = point.overflow && !reduceMotion ? (Math.sin(elapsed.value * Math.PI * 2) + 1) / 2 : 0;
    return { cx: point.x, cy: point.y, r: (ghost ? 11 : 14) + pulse * 3, opacity: (ghost ? 0.25 : 0.2) + pulse * 0.15 };
  });
  return <>
    <AnimatedCircle cx={170} cy={30} r={ghost ? 11 : 14} fill={ghost ? colorsR.electric : colorsR.chalk} opacity={0.2} animatedProps={halo} />
    <AnimatedCircle testID={ghost ? 'pace-ghost' : 'pace-last-lap'} cx={170} cy={30} r={ghost ? 5.5 : 7} fill={ghost ? 'none' : colorsR.chalk} stroke={ghost ? colorsR.electric : colorsR.asphalt} strokeWidth={ghost ? 2.5 : 2} animatedProps={props} />
  </>;
}
export function RaceTrack({ elapsed, bestLap, lastLap, armed }: { elapsed: SharedValue<number>; bestLap: number | null; lastLap: number | null; armed: boolean }) {
  const { reduceMotion } = useTelemetryMotion();
  const grid = `race-grid-${useId().replace(/:/g, '')}`;
  return <View testID="pace-map" accessible accessibilityRole="image" accessibilityLabel={`Pace estimate, not a measured car position. ${bestLap != null ? `Best-lap reference ${bestLap.toFixed(3)} seconds.` : 'No best-lap reference.'} ${lastLap != null ? `Last-lap reference ${lastLap.toFixed(3)} seconds.` : 'No last-lap reference.'}`} style={styles.panel}>
    <View {...decorative} style={styles.drawing}>
      <Svg width="100%" height="100%" viewBox="0 0 358 200">
        <Defs><Pattern id={grid} width={24} height={24} patternUnits="userSpaceOnUse"><Path d="M24 0H0V24" stroke={colorsR.inkSecondary} strokeOpacity={0.05} fill="none" /></Pattern></Defs>
        <Rect width={358} height={222} fill={`url(#${grid})`} />
        <Path d={RACE_TRACK_PATH} fill="none" stroke={colorsR.gridBox} strokeWidth={28} strokeLinejoin="round" transform="translate(0 4)" />
        <Path d={RACE_TRACK_PATH} fill="none" stroke={colorsR.flame} strokeWidth={16} strokeLinejoin="round" transform="translate(0 4)" />
        <Path d={RACE_TRACK_PATH} fill="none" stroke={colorsR.asphalt} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="6 8" transform="translate(0 4)" />
        <Path d="M214 25 l6 5 -6 5 M226 25 l6 5 -6 5" fill="none" stroke={colorsR.asphalt} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" transform="translate(0 4)" />
        <Rect x={165} y={24} width={10} height={20} fill={colorsR.chalk} />
        {[[165, 24], [170, 29], [165, 34], [170, 39]].map(([x, y]) => <Rect key={y} x={x} y={y} width={5} height={5} fill={colorsR.asphalt} />)}
        <Path d="M156 46 V18 C156 10 162 6 170 6 C178 6 184 10 184 18 V46" fill="none" stroke={colorsR.chalk} strokeWidth={3.5} transform="translate(0 4)" />
        {/* Same 4 pt artboard offset as the copied track. */}
        <G transform="translate(0 4)">
          {armed && lastLap != null && <PaceMarker elapsed={elapsed} reference={lastLap} ghost={false} reduceMotion={reduceMotion} />}
          {armed && bestLap != null && <PaceMarker elapsed={elapsed} reference={bestLap} ghost reduceMotion={reduceMotion} />}
        </G>
      </Svg>
      <View style={styles.gateLabel}><RText variant="chip" maxFontSizeMultiplier={1} style={{ fontSize: 10, color: colorsR.inkSecondary, letterSpacing: 1.5 }}>PORTAL GATE</RText></View>
    </View>
    <View {...decorative} style={styles.legend}>
      <View style={styles.key}><View style={styles.dot} /><RText variant="bodySmall" style={styles.legendText}>Last lap</RText></View>
      <View style={styles.key}><View style={[styles.dot, styles.ghost]} /><RText variant="bodySmall" style={styles.legendText}>Best-lap ghost</RText></View>
      <RText variant="eyebrow" style={styles.estimate}>PACE ESTIMATE</RText>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: colorsR.inset, minHeight: 222, overflow: 'hidden' },
  drawing: { width: '100%', aspectRatio: 358 / 200 },
  gateLabel: { position: 'absolute', top: '27%', left: '20%', right: '25%', alignItems: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, paddingBottom: 10 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colorsR.chalk },
  ghost: { borderWidth: 2, borderColor: colorsR.electric, backgroundColor: 'transparent' },
  legendText: { fontSize: 12, lineHeight: 14, color: colorsR.inkSecondary },
  estimate: { flexGrow: 1, textAlign: 'right', fontSize: 10, letterSpacing: 1, color: colorsR.inkMuted },
});
