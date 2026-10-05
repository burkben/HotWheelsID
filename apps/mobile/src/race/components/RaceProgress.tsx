import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { RaceButton, RacePlate, RText, SectionHeader, SkewBox, TimingRow } from '@/components/redline';
import { spokenLapDelta } from '@/components/redline/readoutPresentation';
import { decorative } from '@/components/redline/decorative';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { plateNumber } from '@/garage/plateNumber';
import { formatSpeedValue, speedUnitLabel } from '@/speed/format';
import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR, fontR } from '@/theme/tokens';
import { fastestReference, formatRaceClock, lapGateSpeeds } from '../livePresentation';
import type { RaceState } from '../raceEngine';
import type { RaceCarPresentation } from '../presentation';
import { LapSegments } from './LapSegments';
import { RaceClock, useLapClock } from './RaceClock';
import { RaceTrack } from './RaceTrack';
import { raceStyles as styles } from './styles';

export function LiveStat({
  label,
  value,
  hot = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly hot?: boolean;
}) {
  return (
    <View style={styles.liveStat} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={styles.liveStatLabel}>{label}</Text>
      <Text style={[styles.liveStatValue, hot && styles.liveStatValueHot]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function EnteringLap({ children, animate, lap }: { children: React.ReactNode; animate: boolean; lap: number }) {
  const { reduceMotion } = useTelemetryMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (!animate || reduceMotion) { y.value = 0; return; }
    y.value = -12;
    y.value = withTiming(0, { duration: 220 });
  }, [animate, reduceMotion, y]);
  const entrance = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View testID={`timing-lap-${lap}`} style={entrance}>{children}</Animated.View>;
}
export function LapList({ lapTimes, bestLap, runningLap, gateSpeeds, speedUnit = 'mph' }: {
  readonly lapTimes: readonly number[];
  readonly bestLap: number | null;
  readonly runningLap?: number;
  readonly gateSpeeds?: readonly string[] | null;
  readonly speedUnit?: string;
}) {
  return <View style={liveStyles.timing}>
    <SectionHeader title="TIMING" count={gateSpeeds ? `GATE SPEED · ${speedUnit.toUpperCase()}` : undefined} />
    {lapTimes.length === 0 && !runningLap && <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>No laps yet. The first crossing arms the timer.</RText>}
    {lapTimes.map((lap, index) => <EnteringLap key={index} lap={index + 1} animate={index === lapTimes.length - 1}><TimingRow timeFormat="seconds" lap={index + 1} seconds={lap} deltaSeconds={bestLap != null ? lap - bestLap : undefined} state={lap === bestLap ? 'fastest' : 'normal'} gateSpeed={gateSpeeds?.[index]} speedUnit={speedUnit} /></EnteringLap>)}
    {!!runningLap && <TimingRow lap={runningLap} state="running" gateSpeed={gateSpeeds ? '—' : undefined} speedUnit={speedUnit} />}
  </View>;
}

export function LiveLapList({ race }: { race: RaceState }) {
  const passes = usePortalStore(s => s.passes);
  const unit = useSettingsStore(s => s.speedUnit);
  const calibration = useSettingsStore(s => s.speedCalibration);
  const speeds = lapGateSpeeds(race, passes)?.map(speed => formatSpeedValue(speed, { unit, calibration }));
  return <LapList lapTimes={race.lapTimes} bestLap={fastestReference(race.lapTimes, null)} runningLap={race.lastGateAt != null ? Math.min(race.lapTimes.length + 1, race.targetLaps) : undefined} gateSpeeds={speeds} speedUnit={speedUnitLabel(unit)} />;
}

export function RaceProgress({ race, car, liveLap, canTriggerDemo, large = false, showLaps = true, onTriggerDemo, onFinish, showRacer = false, elapsedOverride }: {
  readonly race: RaceState;
  readonly car: RaceCarPresentation;
  readonly liveLap: number;
  readonly canTriggerDemo: boolean;
  readonly large?: boolean;
  readonly showLaps?: boolean;
  readonly onTriggerDemo: () => void;
  readonly onFinish: () => void;
  readonly showRacer?: boolean;
  /** Fixed development fixture clock, never used by the production route. */
  readonly elapsedOverride?: number;
}) {
  const cars = useGarageStore(s => s.cars);
  const carBest = cars.find(record => record.uid === car.uid)?.bestLap ?? null;
  const lapsDone = race.lapTimes.length;
  const armed = race.lastGateAt != null;
  const best = fastestReference(race.lapTimes, null);
  const reference = fastestReference(race.lapTimes, carBest);
  const lastLap = lapsDone ? race.lapTimes[lapsDone - 1] : null;
  const displayedLap = Math.min(lapsDone + (armed ? 1 : 0), race.targetLaps);
  const completedTime = race.lapTimes.reduce((sum, lap) => sum + lap, 0);
  const elapsed = useLapClock(race.lastGateAt, elapsedOverride);
  const delta = best == null ? null : liveLap - best;
  return <View testID="race-progress" style={liveStyles.section}>
    {showRacer && <View style={liveStyles.racer}><RacePlate number={car.uid ? plateNumber(cars, car.uid) : '?'} size="small" /><View style={{ flex: 1 }}><RText variant="chip" style={{ color: colorsR.flame }}>{race.player}</RText><RText variant="carName" numberOfLines={1}>{car.name}</RText></View></View>}
    <View style={liveStyles.header}>
      <View accessible accessibilityLabel={armed ? `Lap ${displayedLap} of ${race.targetLaps}` : `${race.player}, cross the line to start`} style={liveStyles.lap}>
        <RText variant="carName" style={{ fontSize: 22, color: colorsR.inkSecondary }}>LAP</RText>
        <RText variant="gaugeReadout" style={{ fontFamily: fontR.display, fontSize: large ? 88 : 80, lineHeight: 80 }}>{displayedLap}</RText>
        <RText variant="gaugeReadout" style={{ fontFamily: fontR.display, fontSize: 36, lineHeight: 44, color: colorsR.inkMuted }}>/{race.targetLaps}</RText>
      </View>
      <View style={liveStyles.total}>
        <RText variant="chip" style={{ fontSize: 11, color: colorsR.greenFlag, letterSpacing: 1.5, textAlign: 'right' }}>● GREEN FLAG</RText>
        <RaceClock elapsed={elapsed} snapshot={liveLap} offset={completedTime} total label={`Total ${formatRaceClock(completedTime + liveLap)} seconds`} testID="race-total-clock" />
        <RText variant="eyebrow" style={[liveStyles.muted, { textAlign: 'right' }]}>TOTAL</RText>
      </View>
    </View>
    {!armed && <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Cross the line to start the timer.</RText>}
    <LapSegments laps={race.lapTimes} target={race.targetLaps} elapsed={elapsed} reference={reference} armed={armed} />
    <RaceTrack elapsed={elapsed} bestLap={reference} lastLap={lastLap} armed={armed} />
    <View style={liveStyles.current}>
      <View style={{ flex: 1, minWidth: 0 }}><RText variant="eyebrow" style={liveStyles.muted}>CURRENT LAP</RText><View style={liveStyles.readout}><View style={{ width: 150, flexShrink: 1, minWidth: 0 }}><RaceClock elapsed={elapsed} snapshot={liveLap} inactive={!armed} label={armed ? `Current lap ${liveLap.toFixed(3)} seconds` : 'Current lap has not started'} testID="race-lap-clock" /></View><RText variant="statValue" style={{ fontSize: 30, color: colorsR.inkMuted, textTransform: 'none' }}>s</RText></View></View>
      {lapsDone > 0 && best != null && delta != null && <View style={liveStyles.delta}><RText variant="eyebrow" style={liveStyles.muted}>VS FASTEST</RText><View accessible accessibilityLabel={spokenLapDelta(delta)} style={liveStyles.deltaValue}><SkewBox style={[StyleSheet.absoluteFill, { backgroundColor: delta > 0 ? 'rgba(255,77,94,0.15)' : colorsR.status.ahead.fill, borderWidth: 1, borderColor: delta > 0 ? colorsR.deltaSlower : colorsR.greenFlag }]} /><View {...decorative}><RaceClock elapsed={elapsed} snapshot={liveLap} offset={-best} delta label="" testID="race-delta-clock" /></View></View></View>}
    </View>
    {showLaps && <LiveLapList race={race} />}
    <View style={liveStyles.actions}>
      {canTriggerDemo && <RaceButton variant="ghost" label="TRIGGER PASS" accessibilityLabel="Trigger demo portal pass" fullWidth onPress={onTriggerDemo} />}
      <RaceButton variant="destructive" label="END RACE EARLY" accessibilityLabel="Finish race now" accessibilityHint="Saves a result if at least one lap is complete" fullWidth onPress={onFinish} />
    </View>
  </View>;
}
const liveStyles = StyleSheet.create({
  section: { width: '100%', maxWidth: 620, gap: 18 },
  header: { marginBottom: -8, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  lap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  total: { width: 148, alignItems: 'stretch', gap: 4 },
  muted: { fontSize: 11, letterSpacing: 2, color: colorsR.inkMuted },
  current: { minHeight: 92, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  readout: { flexDirection: 'row', alignItems: 'baseline' },
  delta: { alignItems: 'flex-end', gap: 6 },
  deltaValue: { width: 82, paddingHorizontal: 10, paddingVertical: 4, marginHorizontal: 5 },
  timing: { width: '100%', maxWidth: 620, gap: 6 },
  actions: { gap: 12, paddingTop: 22, paddingBottom: 4 },
  racer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colorsR.pitLane, borderTopWidth: 3, borderTopColor: colorsR.flame },
});
