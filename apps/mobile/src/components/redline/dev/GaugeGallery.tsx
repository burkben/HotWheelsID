import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Speedometer } from '@/components/gauge/Speedometer';
import { SpeedTrace } from '@/components/telemetry/SpeedTrace';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR, speedGauge } from '@/theme/tokens';
import { RaceButton, RText, SectionHeader, SkewSwitch } from '../index';

/** Controlled UI fixtures only. Samples never enter portal/race/garage stores. */
export function GaugeGallery() {
  const { sample, static: staticTarget } = useLocalSearchParams<{ sample?: string; static?: string }>();
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(false);
  const [pass, setPass] = useState({ id: 1, mph: Number(sample) || 0 });
  const [mode, setMode] = useState<'sweep' | 'track'>('sweep');
  const [unit, setUnit] = useState<'mph' | 'kmh'>('mph');
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const display = { unit, calibration: 1 };
  return <ScrollView onLayout={() => setReady(true)} style={{ backgroundColor: colorsR.asphalt }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 25, paddingBottom: insets.bottom + 24, gap: 12 }}>
    <RText variant="sectionTitle" nativeID={ready ? 'gauge-hydrated' : undefined}>GAUGE MOTION REVIEW</RText>
    <View style={{ alignItems: 'center' }}><Speedometer variant="redline" value={pass.mph} readoutMph={pass.mph} sampleKey={pass.id} mode={mode} max={speedGauge.maxMph} zones={speedGauge.zones} tickStep={speedGauge.tickStep} flameThreshold={speedGauge.flameThreshold} size={340} display={display} newBest={pass.mph >= 280} reduceMotion={staticTarget === '1'} /></View>
    <RText testID="gauge-sample" variant="eyebrow">PASS {pass.id} · {mode}</RText>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{[280, 180, 260, 120, 0].map(mph => <RaceButton key={mph} label={`Pass ${mph}`} onPress={() => setPass(previous => ({ id: previous.id + 1, mph }))} />)}</View>
    <RaceButton label={mode === 'sweep' ? 'Track mode' : 'Sweep mode'} variant="ghost" onPress={() => setMode(mode === 'sweep' ? 'track' : 'sweep')} />
    <RaceButton label={unit === 'mph' ? 'Show km/h' : 'Show mph'} variant="ghost" onPress={() => setUnit(unit === 'mph' ? 'kmh' : 'mph')} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><RText>Reduce motion</RText><SkewSwitch value={reduceMotion} onValueChange={value => useSettingsStore.getState().setReduceMotion(value)} accessibilityLabel="Reduce motion" /></View>
    <SectionHeader title="Recent passes" count={14} />
    <SpeedTrace values={[142, 168, 155, 190, 176, 201, 188, 214, 197, 226, 209, 231, 219, 280]} newBest display={display} />
  </ScrollView>;
}
