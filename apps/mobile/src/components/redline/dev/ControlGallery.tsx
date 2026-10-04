import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colorsR } from '@/theme/tokens';
import type { StatusPillProps } from '@/components/StatusPill';
import { CompactStepper, SettingGroup, SettingRow, SettingsSection, TelemetrySegmentedControl } from '@/components/telemetry';
import { useSettingsStore } from '@/store/settingsStore';
import { FilterChip, RaceButton, RText, ScreenHeader, SectionHeader, SkewSwitch, StatCell, StatRow, StatusChip, TimingRow } from '../index';

export function ControlGallery() {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const wide = useWindowDimensions().width >= 800;
  const [action, setAction] = useState('Ready');
  const [enabled, setEnabled] = useState(true);
  const [sound, setSound] = useState(false);
  const [unit, setUnit] = useState<'mph' | 'kmh'>('mph');
  const [laps, setLaps] = useState(5);
  const [calibration, setCalibration] = useState(100);
  const [filter, setFilter] = useState('All');
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const status: StatusPillProps = { connection: 'connected', controlStatus: null, phase: null, mode: 'live', manuallyDisconnected: false, onConnect: () => setAction('Connect'), onRetry: () => setAction('Retry'), onDisconnect: () => setAction('Disconnect') };
  return (
    <ScrollView testID="control-gallery" onLayout={() => setReady(true)} style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}>
      <ScreenHeader title="PIT EQUIPMENT" />
      <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Development gallery · interactive specimen controls</RText>
      <RText testID="control-action" nativeID={ready ? 'controls-hydrated' : undefined} variant="eyebrow">{action}</RText>
      <View style={[styles.grid, wide && { flexDirection: 'row' }]}>
        <View testID="controls-buttons" style={[styles.panel, wide && styles.column]}>
          <SectionHeader title="Buttons" />
          <RaceButton label="Start race" chevron fullWidth onPress={() => setAction('Start race')} />
          <RaceButton label="Try demo mode" variant="ghost" fullWidth onPress={() => setAction('Try demo mode')} />
          <RaceButton label="End race" variant="destructive" fullWidth onPress={() => setAction('End race')} />
          <RaceButton label="Start disabled" disabled fullWidth />
          <RaceButton label="Ghost disabled" variant="ghost" disabled fullWidth />
          <RaceButton label="End disabled" variant="destructive" disabled fullWidth />
        </View>
        <View testID="controls-status" style={[styles.panel, wide && styles.column]}>
          <SectionHeader title="Portal status" />
          <StatusChip {...status} />
          <StatusChip {...status} connection="connecting" phase="scanning" />
          <StatusChip {...status} controlStatus="carPresent" />
          <StatusChip {...status} mode="demo" />
          <StatusChip {...status} connection="disconnected" phase="notFound" />
          <StatusChip {...status} connection="disconnected" manuallyDisconnected />
        </View>
        <View testID="controls-stats" style={[styles.panel, wide && styles.column]}>
          <SectionHeader title="Stat block" count={2} />
          <StatRow><StatCell label="Best" value="247" unit="MPH" color={colorsR.caution} accent={colorsR.caution} /><StatCell label="Passes" value="38" unit="today" accent={colorsR.flame} /></StatRow>
          <StatCell label="Best lap" value="2.847" unit="s" size="lg" accent={colorsR.electric} />
          <StatCell label="Current" value="2.31" unit="s" size="hero" />
          <StatRow><StatCell value="210" unit="MPH" delta="+2.4" /><StatCell value="—" unit="MPH" delta="-0.8" /></StatRow>
        </View>
        <View testID="controls-timing" style={[styles.panel, wide && styles.column]}>
          <SectionHeader title="Timing tower" />
          <TimingRow lap={2} seconds={3.012} deltaSeconds={0.165} />
          <TimingRow lap={3} seconds={2.847} state="fastest" />
          <TimingRow lap={4} state="running" />
          <TimingRow lap={5} seconds={2.6} deltaSeconds={-0.247} gateSpeed="247" />
          <TimingRow lap={6} />
        </View>
      </View>
      <View testID="controls-settings">
        <ScreenHeader title="SETTINGS" backLabel="More" onBack={() => setAction('Back')} right={<RText variant="chip">7 GROUPS</RText>} />
        <SettingsSection title="Racing" index={2}>
          <SettingGroup><SettingRow label="Default laps" control={<TelemetrySegmentedControl segments={[3, 5, 10].map(value => ({ value, label: String(value) }))} value={laps} onChange={setLaps} />} /></SettingGroup>
        </SettingsSection>
        <SettingsSection title="Speed" index={3}>
          <SettingGroup>
            <SettingRow label="Units" control={<TelemetrySegmentedControl segments={[{ value: 'mph' as const, label: 'MPH', accessibilityLabel: 'Miles per hour' }, { value: 'kmh' as const, label: 'KM/H', accessibilityLabel: 'Kilometers per hour' }]} value={unit} onChange={setUnit} />} />
            <SettingRow label="Calibration" hint="Trim displayed speeds to match a known reference. Recorded data and goals stay unchanged." control={<CompactStepper value={`${(calibration / 100).toFixed(2)}×`} accessibilityLabel="Speed calibration" canDecrement={calibration > 90} canIncrement={calibration < 110} onDecrement={() => setCalibration(value => value - 5)} onIncrement={() => setCalibration(value => value + 5)} />} />
          </SettingGroup>
        </SettingsSection>
        <SettingsSection title="Feedback" index={4}>
          <SettingGroup>
            <SettingRow label="Haptics" control={<SkewSwitch value={enabled} onValueChange={setEnabled} accessibilityLabel="Haptics" />} />
            <SettingRow label="Sound" control={<SkewSwitch value={sound} onValueChange={setSound} accessibilityLabel="Sound" />} />
            <SettingRow label="Reduce motion" control={<SkewSwitch value={reduceMotion} onValueChange={value => useSettingsStore.getState().setReduceMotion(value)} accessibilityLabel="Reduce motion" />} />
            <SettingRow label="Unavailable" disabled control={<SkewSwitch value={false} onValueChange={() => {}} accessibilityLabel="Unavailable" disabled />} />
          </SettingGroup>
        </SettingsSection>
        <SettingsSection title="Community" index={6}>
          <SettingGroup><SettingRow label="Share car identities" hint="Only casting → catalog facts are shared, never your tags or collection." chevron onPress={() => setAction('Community')} /><SettingRow label="Reset to defaults" destructive onPress={() => setAction('Reset specimen')} /><SettingRow label="Disabled action" disabled onPress={() => setAction('Unexpected')} /></SettingGroup>
        </SettingsSection>
      </View>
      <View testID="controls-filters" style={{ gap: 12 }}>
        <SectionHeader title="Series filters" />
        <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
          {['All', 'HW Race Team', 'Factory Fresh'].map((label, index) => <FilterChip key={label} label={label} color={[colorsR.flame, colorsR.electric, colorsR.caution][index]} selected={filter === label} onPress={() => setFilter(label)} />)}
          <FilterChip label="Unavailable" selected={false} onPress={() => {}} disabled />
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 16, gap: 20 },
  grid: { gap: 16 },
  column: { flex: 1, minWidth: 0 },
  panel: { padding: 14, gap: 14, backgroundColor: colorsR.pitLane },
});
