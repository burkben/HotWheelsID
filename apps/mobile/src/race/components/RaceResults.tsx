import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Link } from 'expo-router';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LinkPressable } from '@/components/LinkPressable';
import { Checker, RaceButton, RacePlate, RText, SkewBox } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { spokenUnit } from '@/components/redline/readoutPresentation';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { plateNumber } from '@/garage/plateNumber';
import { raceShareText } from '@/share/summary';
import { formatSpeedValue, speedUnitLabel } from '@/speed/format';
import { useGarageStore } from '@/store/garageStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR } from '@/theme/tokens';
import type { RaceResult } from '../raceEngine';
import type { RaceCarPresentation } from '../presentation';
import { raceRecord } from '../records';
import { lapBarFractions, raceNumberSize } from '../resultsPresentation';
import { raceHaptic } from '../useRaceSession';

export function ResultsLapChart({ lapTimes, bestLap }: { readonly lapTimes: readonly number[]; readonly bestLap: number }) {
  const fractions = lapBarFractions(lapTimes);
  const { fontScale } = useWindowDimensions();
  return <View style={styles.chart}>
    <View style={styles.chartHeader}><RText variant="sectionTitle">LAP BY LAP</RText><RText variant="eyebrow" style={{ letterSpacing: 0, color: colorsR.inkMuted }}>SHORTER = FASTER</RText></View>
    {lapTimes.map((lap, index) => {
      const fastest = lap === bestLap;
      const color = fastest ? colorsR.electric : colorsR.inkSecondary;
      return <View key={index} style={styles.chartRow} accessible accessibilityLabel={`Lap ${index + 1}, ${lap.toFixed(3)} seconds${fastest ? ', fastest' : ''}`}>
        <RText variant="wordmark" style={{ width: 22, fontSize: 17, lineHeight: 22, color }}>L{index + 1}</RText>
        <View {...decorative} style={styles.barTrack}><View style={{ height: 18, width: `${fractions[index] * 100}%`, backgroundColor: fastest ? colorsR.electric : colorsR.barMuted, transform: [{ skewX: '-18deg' }] }} /></View>
        <RText variant="lapTime" numberOfLines={1} adjustsFontSizeToFit style={{ width: 54, textAlign: 'right', fontSize: raceNumberSize(lap.toFixed(3), 54, 14, fontScale), lineHeight: 20, color: fastest ? colorsR.electric : colorsR.chalk }}>{lap.toFixed(3)}</RText>
      </View>;
    })}
  </View>;
}

function ResultStat({ label, value, detail, color, spoken }: { label: string; value: string; detail: string; color: string; spoken: string }) {
  const [width, setWidth] = useState(100);
  const { fontScale } = useWindowDimensions();
  return <View onLayout={event => setWidth(event.nativeEvent.layout.width - 24)} style={styles.stat} accessible accessibilityLabel={spoken}>
    <View {...decorative} style={[styles.accent, { backgroundColor: color }]} />
    <RText variant="eyebrow" style={{ fontSize: 10, lineHeight: 12, color: colorsR.inkMuted }}>{label}</RText>
    <RText variant="statValue" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ fontSize: raceNumberSize(value, width, 24, fontScale), lineHeight: 24, color: label === 'TOTAL' ? colorsR.chalk : color }}>{value}</RText>
    <RText variant="eyebrow" style={{ fontSize: 10, lineHeight: 12, letterSpacing: 0, color: colorsR.inkMuted }}>{detail}</RText>
  </View>;
}

export function RaceResults({ result, car, nextRacerName, primaryActionLabel, showLaps = true, previousBest, topSpeed = null, modeLabel = 'SPRINT', onPrimaryAction }: {
  readonly result: RaceResult;
  readonly car: RaceCarPresentation;
  readonly nextRacerName: string | null;
  readonly primaryActionLabel: string;
  readonly showLaps?: boolean;
  readonly previousBest?: number | null;
  readonly topSpeed?: number | null;
  readonly modeLabel?: string;
  readonly onPrimaryAction: () => void;
}) {
  const cars = useGarageStore(s => s.cars);
  const garageName = cars.find(c => c.uid === result.carUid)?.name ?? null;
  const unit = useSettingsStore(s => s.speedUnit);
  const calibration = useSettingsStore(s => s.speedCalibration);
  const record = raceRecord(result.bestLap, previousBest);
  const { reduceMotion, needleSpring } = useTelemetryMotion();
  const slide = useSharedValue(0);
  const stamp = useSharedValue(1);
  const { damping, stiffness, mass, overshootClamping } = needleSpring;
  useEffect(() => {
    slide.value = reduceMotion ? 0 : -420;
    stamp.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) {
      slide.value = withTiming(0, { duration: 350 });
      stamp.value = withSpring(1, { damping, stiffness, mass, overshootClamping });
    }
    return () => { cancelAnimation(slide); cancelAnimation(stamp); };
  }, [result.finishedAt, reduceMotion, slide, stamp, damping, stiffness, mass, overshootClamping]);
  const bannerMotion = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value }, { rotate: '-6deg' }] }));
  const stampMotion = useAnimatedStyle(() => ({ transform: [{ scale: 1.4 - stamp.value * 0.4 }, { rotate: `${-14 + stamp.value * 6}deg` }] }));
  const [shareHeight, setShareHeight] = useState(56);
  const onShare = () => {
    raceHaptic(() => Haptics.selectionAsync());
    Share.share({ message: raceShareText(result, { carName: garageName ?? car.name }) }).catch(() => {});
  };
  const speed = topSpeed == null ? null : formatSpeedValue(topSpeed, { unit, calibration });
  const speedUnit = speedUnitLabel(unit);
  return <View testID="race-results" style={styles.section}>
    <View {...decorative} style={styles.bannerFrame}><Animated.View testID="finish-checker" style={[styles.banner, bannerMotion]}><Checker size={16} width="100%" height={64} /></Animated.View></View>
    <View style={styles.hero} accessible accessibilityLabel={`${result.player} finished ${result.lapCount} laps in ${result.totalTime.toFixed(3)} seconds. Best lap ${result.bestLap.toFixed(3)} seconds.${record.isRecord ? ' New record.' : ''}${nextRacerName ? ` Up next, ${nextRacerName}.` : ''}`}>
      <RText variant="chip" style={{ color: colorsR.inkSecondary, letterSpacing: 2 }}>{modeLabel} · {result.lapCount} LAPS · {result.player}</RText>
      <View style={styles.finishRow}>
        <RText variant="screenTitle" numberOfLines={1} adjustsFontSizeToFit style={styles.finish}>FINISH</RText>
        {record.isRecord && <Animated.View {...decorative} testID="record-stamp" style={[styles.stamp, stampMotion]}><View style={styles.stampInner}><RText variant="wordmark" style={styles.stampText}>NEW</RText><RText variant="wordmark" style={styles.stampText}>RECORD</RText></View></Animated.View>}
      </View>
    </View>
    <View style={styles.stats}>
      <ResultStat label="TOTAL" value={result.totalTime.toFixed(3)} detail="SEC" color={colorsR.flame} spoken={`Total ${result.totalTime.toFixed(3)} seconds`} />
      <ResultStat label="BEST LAP" value={result.bestLap.toFixed(3)} detail={`LAP ${result.bestLapNum}`} color={colorsR.electric} spoken={`Best lap ${result.bestLapNum}, ${result.bestLap.toFixed(3)} seconds`} />
      <ResultStat label={speed == null ? 'AVG LAP' : 'TOP SPEED'} value={speed ?? result.avgLap.toFixed(3)} detail={speed == null ? 'SEC' : speedUnit} color={colorsR.caution} spoken={speed == null ? `Average lap ${result.avgLap.toFixed(3)} seconds` : `Top speed ${speed} ${spokenUnit(speedUnit)}`} />
    </View>
    {showLaps && <ResultsLapChart lapTimes={result.lapTimes} bestLap={result.bestLap} />}
    <View style={styles.car} accessible accessibilityLabel={`${car.name}${record.improvement != null ? `. Beat its old best by ${record.improvement.toFixed(3)} seconds` : ''}`}>
      <RacePlate number={car.uid ? plateNumber(cars, car.uid) : '?'} size="small" />
      <View style={{ flex: 1, gap: 2 }}><RText variant="carName" style={{ fontSize: 21 }} numberOfLines={2}>{car.name}</RText>{record.improvement != null && <RText variant="bodySmall" style={{ fontSize: 13, color: colorsR.inkSecondary }}>Beat its old best by {record.improvement.toFixed(3)} s</RText>}</View>
    </View>
    {!!nextRacerName && <RText variant="bodySmall" style={{ color: colorsR.electric }}>Up next: {nextRacerName}</RText>}
    <View style={styles.actions}>
      <View style={{ flex: 1 }}><RaceButton label={primaryActionLabel} onPress={onPrimaryAction} chevron fullWidth style={{ paddingHorizontal: 12 }} /></View>
      <Pressable onPress={onShare} onLayout={e => setShareHeight(e.nativeEvent.layout.height)} accessibilityRole="button" accessibilityLabel={`Share ${result.player}'s race result`} style={({ pressed }) => [styles.share, { marginHorizontal: shareHeight * Math.tan(Math.PI / 15), opacity: pressed ? 0.85 : 1 }]}>
        <SkewBox style={[StyleSheet.absoluteFill, { borderWidth: 2, borderColor: colorsR.chalk }]} />
        <View {...decorative}><Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colorsR.chalk} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 3v13M7 8l5-5 5 5M5 13v7h14v-7" /></Svg></View>
      </Pressable>
    </View>
    <Link href="/" asChild><LinkPressable accessibilityRole="link" accessibilityLabel="Done racing, return to Speed" contentStyle={({ pressed }) => [styles.done, { opacity: pressed ? 0.7 : 1 }]}><RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Done · Return to Speed</RText></LinkPressable></Link>
  </View>;
}

const styles = StyleSheet.create({
  section: { width: '100%', maxWidth: 620, gap: 22 },
  bannerFrame: { height: 100, marginHorizontal: -16 },
  banner: { position: 'absolute', left: -40, right: -40, top: 32, borderTopWidth: 4, borderBottomWidth: 4, borderColor: colorsR.flame },
  hero: { paddingHorizontal: 4, gap: 0, marginBottom: 10 },
  finishRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  finish: { fontSize: 92, lineHeight: 78.2, letterSpacing: -1, flexShrink: 1 },
  stamp: { borderWidth: 3, borderColor: colorsR.caution, padding: 3, marginRight: 4 },
  stampInner: { borderWidth: 1, borderColor: colorsR.caution, paddingVertical: 6, paddingHorizontal: 10, alignItems: 'center' },
  stampText: { fontSize: 18, lineHeight: 18, color: colorsR.caution },
  stats: { flexDirection: 'row', gap: 2 },
  stat: { flex: 1, minWidth: 0, backgroundColor: colorsR.pitLane, padding: 12, gap: 4 },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  chart: { width: '100%', backgroundColor: colorsR.pitLane, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16, gap: 10 },
  chartHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  chartRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: { flex: 1, marginHorizontal: 3 },
  car: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, marginTop: 12 },
  actions: { flexDirection: 'row', alignItems: 'stretch', marginTop: 12 },
  share: { width: 64, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  done: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
});
