import { useState } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { RaceResults } from '@/race/components/RaceResults';
import { colorsR } from '@/theme/tokens';
import { RText, SkewSwitch } from '../index';
import { useSettingsStore } from '@/store/settingsStore';

/** Local review fixture; never inserts sample results or cars in a store. */
export function ResultsGallery() {
  const params = useLocalSearchParams<{ record?: string; fallback?: string; long?: string; controls?: string }>();
  const insets = useSafeAreaInsets();
  const reduced = useSettingsStore(s => s.reduceMotion);
  const [ready, setReady] = useState(false);
  const [again, setAgain] = useState(false);
  const laps = params.long === '1' ? [303.012, 302.847, 302.905, 303.098, 303.041] : [3.012, 2.847, 2.905, 3.098, 3.041];
  const total = laps.reduce((a, b) => a + b, 0);
  const previousBest = params.record === 'first' ? null : params.record === 'tie' ? laps[1] : params.record === 'miss' ? laps[1] - 0.1 : params.record === 'unknown' ? undefined : laps[1] + 0.165;
  return <ScrollView nativeID={ready ? 'results-hydrated' : undefined} onLayout={() => setReady(true)} style={{ flex: 1, backgroundColor: colorsR.asphalt }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(34, insets.bottom), alignItems: 'center' }}>
    {again ? <RText>Race again selected</RText> : <RaceResults result={{ player: 'P1', carUid: 'fixture-car', lapCount: laps.length, lapTimes: laps, totalTime: total, bestLap: laps[1], bestLapNum: 2, worstLap: laps[3], worstLapNum: 4, avgLap: total / laps.length, finishedAt: 1000 }} car={{ uid: 'fixture-car', name: "’70 Dodge Charger R/T", catalogId: null, identified: false }} previousBest={previousBest} topSpeed={params.fallback === '1' ? null : 247} nextRacerName={null} primaryActionLabel="Race again" onPrimaryAction={() => setAgain(true)} />}
    {params.controls === '1' && <SkewSwitch value={reduced} onValueChange={value => useSettingsStore.getState().setReduceMotion(value)} accessibilityLabel="Reduce motion" />}
  </ScrollView>;
}
