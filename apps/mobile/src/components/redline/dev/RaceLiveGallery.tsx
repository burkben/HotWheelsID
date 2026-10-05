import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RaceProgress } from '@/race/components/RaceProgress';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR } from '@/theme/tokens';
import { RaceButton, RText, SkewSwitch } from '../index';

export function RaceLiveGallery() {
  const params = useLocalSearchParams<{ moving?: string; controls?: string; empty?: string; lineup?: string; elapsed?: string; stall?: string; slow?: string; first?: string }>();
  const insets = useSafeAreaInsets();
  const [lapTimes, setLapTimes] = useState(params.empty === '1' || params.first === '1' ? [] : params.slow === '1' ? [30.12, 28.47] : [3.012, 2.847]);
  const [elapsed, setElapsed] = useState(Number(params.elapsed ?? 2.31));
  const [gate, setGate] = useState(() => Date.now() - elapsed * 1000);
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stallLabel, setStallLabel] = useState('JS ready');
  useEffect(() => {
    if (params.stall !== '1') return;
    let block: ReturnType<typeof setTimeout> | undefined;
    const prepare = setTimeout(() => {
      setStallLabel('JS paused');
      block = setTimeout(() => {
        const end = performance.now() + 1800;
        // Development-only probe: clocks/markers should keep moving on native UI.
        while (performance.now() < end) { /* deliberately occupy JS */ }
        setStallLabel('JS resumed');
      }, 150);
    }, 1800);
    return () => { clearTimeout(prepare); clearTimeout(block); };
  }, [params.stall]);
  const reduced = useSettingsStore(s => s.reduceMotion);
  const clockMoving = params.moving === '1';
  return <ScrollView nativeID={ready ? 'race-live-hydrated' : undefined} onLayout={() => setReady(true)} style={{ flex: 1, backgroundColor: colorsR.asphalt }} contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 16, paddingTop: insets.top || 54, paddingBottom: Math.max(insets.bottom, 34), gap: 20 }}>
    {params.stall === '1' && <RText>{stallLabel}</RText>}
    {finished ? <RText>Race ended</RText> : <RaceProgress race={{ phase: 'racing', targetLaps: 5, player: 'Player 1', carUid: 'fixture-car', lastGateAt: params.empty === '1' ? null : gate, lapTimes, result: null }} car={{ uid: 'fixture-car', name: "’70 Dodge Charger R/T", catalogId: null, identified: false }} liveLap={elapsed} canTriggerDemo={false} onTriggerDemo={() => {}} onFinish={() => setFinished(true)} showRacer={params.lineup === '1'} elapsedOverride={clockMoving ? undefined : elapsed} />}
    {params.controls === '1' && <View style={{ gap: 12 }}>
      <RaceButton label="Complete lap" onPress={() => { setLapTimes(laps => [...laps, 2.6]); setElapsed(0); setGate(Date.now()); }} />
      <RaceButton label="Overflow" onPress={() => { setElapsed(4); setGate(Date.now() - 4000); }} />
      <SkewSwitch value={reduced} onValueChange={value => useSettingsStore.getState().setReduceMotion(value)} accessibilityLabel="Reduce motion" />
    </View>}
  </ScrollView>;
}
