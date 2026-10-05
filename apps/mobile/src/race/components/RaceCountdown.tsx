import { useContext, useEffect } from 'react';
import { Animated as NativeAnimated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Line, Path, Text as SvgText } from 'react-native-svg';

import { Checker, Chevrons, RacePlate, RText, StartLights } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { plateNumber } from '@/garage/plateNumber';
import { useGarageStore } from '@/store/garageStore';
import { RedlineFontContext } from '@/theme/RedlineFontContext';
import { colorsR, fontR } from '@/theme/tokens';
import { countdownLights } from '../countdownPresentation';
import type { RaceCarPresentation } from '../presentation';

export function RaceCountdown({ count, reduceMotion: reduceOverride, player, car, large = false, onCancel, targetLaps, modeLabel = 'SPRINT', bestLap, nextRacer }: {
  readonly count: number;
  /** Retained for existing callers; the visual spring now runs through Reanimated. */
  readonly pulse: NativeAnimated.Value;
  readonly reduceMotion: boolean;
  readonly player: string;
  readonly car: RaceCarPresentation;
  readonly large?: boolean;
  readonly onCancel: () => void;
  readonly targetLaps?: number;
  readonly modeLabel?: string;
  readonly bestLap?: number | null;
  readonly nextRacer?: { player: string; car: RaceCarPresentation } | null;
}) {
  const insets = useSafeAreaInsets();
  const fontsLoaded = useContext(RedlineFontContext);
  const cars = useGarageStore(s => s.cars);
  const { reduceMotion: reduced, needleSpring } = useTelemetryMotion();
  const reduceMotion = reduced || reduceOverride;
  const { damping, stiffness, mass, overshootClamping } = needleSpring;
  const lights = countdownLights(count);
  const scale = useSharedValue(1);
  const slide = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) { scale.value = 1; slide.value = 0; return; }
    scale.value = 1.15;
    slide.value = -24;
    scale.value = withSpring(1, { damping, stiffness, mass, overshootClamping });
    slide.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
  }, [count, reduceMotion, scale, slide, damping, stiffness, mass, overshootClamping]);
  const digitAnimation = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const echoAnimation = useAnimatedStyle(() => ({ transform: [{ translateX: slide.value }] }));
  // SVG uses native OpenType settings; its web adapter accepts CSS numeric variants.
  const digitFeatures = Platform.OS === 'web'
    ? { style: { fontVariantNumeric: 'tabular-nums' as const } }
    : { fontFeatureSettings: '"tnum"' };
  const digitSize = large ? 340 : 320;
  const number = car.uid ? plateNumber(cars, car.uid) : '?';
  return <View testID="race-countdown" style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(20, insets.top || 54) }]}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel race" style={({ pressed }) => [styles.cancel, pressed && { opacity: 0.85 }]}><Svg {...decorative} width={20} height={20} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={colorsR.inkSecondary} strokeWidth={2.4} strokeLinecap="round" /></Svg></Pressable>
        <RText variant="chip" style={styles.caption}>{modeLabel}{targetLaps != null ? ` · ${targetLaps} LAPS` : ''}</RText>
        <View {...decorative} style={{ width: 44 }} />
      </View>
      <View style={styles.gantry}><StartLights variant="gantry" lit={lights.lit} go={lights.go} animate reduceMotion={reduceMotion} /></View>
      <View testID="countdown-digit" accessible accessibilityRole="image" accessibilityLabel={`${lights.go ? 'Go' : `Countdown ${lights.digit}`}. ${player} racing ${car.name}`} style={styles.digit}>
        <Animated.View {...decorative} testID="countdown-echoes" style={[StyleSheet.absoluteFill, echoAnimation]}>
          <Svg width="100%" height="100%" viewBox="0 0 390 280">
            {[-54, -28].map((offset, index) => <SvgText key={offset} x={195 + offset} y={264} fontFamily={fontsLoaded ? fontR.display : undefined} fontSize={digitSize} {...digitFeatures} textAnchor="middle" fill="none" stroke={lights.go ? colorsR.greenFlag : colorsR.flame} strokeWidth={2} opacity={index === 0 ? 0.25 : 0.55}>{lights.digit}</SvgText>)}
          </Svg>
        </Animated.View>
        <Animated.View {...decorative} testID="countdown-scale" style={[StyleSheet.absoluteFill, digitAnimation]}><Svg width="100%" height="100%" viewBox="0 0 390 280"><SvgText x={195} y={264} fontFamily={fontsLoaded ? fontR.display : undefined} fontSize={digitSize} {...digitFeatures} textAnchor="middle" fill={lights.go ? colorsR.greenFlag : colorsR.chalk}>{lights.digit}</SvgText></Svg></Animated.View>
      </View>
      <View style={styles.lineup}>
        <RText variant="sectionTitle" style={styles.lineUp}>LINE UP AT THE GATE</RText>
        <View style={styles.racer}>
          <View {...decorative} style={styles.accent} />
          <RacePlate number={number} size="small" />
          <View style={styles.car}><RText variant="chip" style={styles.eyebrow}>{player} · ON GRID</RText><RText variant="carName" style={{ fontSize: 21 }} numberOfLines={1}>{car.name}</RText></View>
          <View accessible accessibilityLabel={bestLap != null ? `Best lap ${bestLap.toFixed(3)} seconds` : 'Best lap unavailable'} style={{ alignItems: 'flex-end' }}><RText variant="eyebrow" style={styles.muted}>BEST</RText><RText variant="lapTime" style={{ fontSize: 16 }}>{bestLap != null ? bestLap.toFixed(3) : '—'}</RText></View>
        </View>
        {nextRacer && <View style={styles.next}><View {...decorative}><Chevrons count={1} color={colorsR.inkMuted} height={20} /></View><RText variant="eyebrow" style={styles.muted}>UP NEXT</RText><RText variant="bodySmall" style={styles.nextName}>{nextRacer.player} · {nextRacer.car.name}</RText></View>}
      </View>
    </ScrollView>
    <View {...decorative} style={{ backgroundColor: colorsR.pitLane, paddingBottom: insets.bottom }}><View style={styles.startLine}>
      <Svg width="100%" height={53}><Line x1={0} x2="100%" y1={24} y2={24} stroke={colorsR.chalk} opacity={0.5} strokeWidth={3} strokeDasharray="22 18" /></Svg>
      <View style={styles.checker}><Checker size={6.5} width={26} height={53} /></View>
    </View></View>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { alignItems: 'center', paddingBottom: 32 },
  header: { width: '100%', maxWidth: 620, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cancel: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colorsR.pitLane },
  caption: { flexShrink: 1, color: colorsR.inkSecondary, fontSize: 13, letterSpacing: 2, textAlign: 'center' },
  gantry: { width: '100%', maxWidth: 390, paddingHorizontal: 34, marginTop: 20 },
  digit: { width: '100%', maxWidth: 390, height: 280, marginTop: 2, overflow: 'visible' },
  lineup: { width: '100%', maxWidth: 620, paddingHorizontal: 16, marginTop: 14, gap: 10 },
  lineUp: { fontSize: 26, lineHeight: 31.2, textAlign: 'center' },
  racer: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colorsR.pitLane, paddingHorizontal: 14, paddingVertical: 12 },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colorsR.flame },
  car: { flex: 1, minWidth: 0 },
  eyebrow: { color: colorsR.flame, fontSize: 11, letterSpacing: 1.5 },
  muted: { color: colorsR.inkMuted, letterSpacing: 1.5 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  nextName: { flex: 1, color: colorsR.inkSecondary, fontFamily: fontR.bodySemi },
  startLine: { height: 58, borderTopWidth: 5, borderTopColor: colorsR.flame },
  checker: { position: 'absolute', top: 0, left: '50%', marginLeft: -13 },
});
