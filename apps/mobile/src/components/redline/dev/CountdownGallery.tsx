import { useState } from 'react';
import { Animated, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RaceCountdown } from '@/race/components/RaceCountdown';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR } from '@/theme/tokens';
import { RaceButton, RText, SkewSwitch } from '../index';

export function CountdownGallery() {
  const params = useLocalSearchParams<{ count?: string; controls?: string }>();
  const [count, setCount] = useState(params.count == null ? 2 : Number(params.count));
  const [pulse] = useState(() => new Animated.Value(1));
  const [ready, setReady] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  return <View nativeID={ready ? 'countdown-hydrated' : undefined} onLayout={() => setReady(true)} style={{ flex: 1, backgroundColor: colorsR.asphalt }}>
    {cancelled ? <RText>Countdown cancelled</RText> : <RaceCountdown count={count} pulse={pulse} reduceMotion={reduceMotion} player="Player 1" car={{ uid: 'fixture-car', name: "’70 Dodge Charger R/T", catalogId: null, identified: false }} targetLaps={5} bestLap={2.847} nextRacer={{ player: 'Player 2', car: { uid: null, name: 'Scorpedo', catalogId: null, identified: false } }} onCancel={() => setCancelled(true)} />}
    {params.controls === '1' && <View style={{ padding: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>{[3, 2, 1, 0].map(value => <RaceButton key={value} label={value === 0 ? 'Go' : String(value)} onPress={() => setCount(value)} style={{ paddingHorizontal: 14 }} />)}</View>
      <SkewSwitch value={reduceMotion} onValueChange={value => useSettingsStore.getState().setReduceMotion(value)} accessibilityLabel="Reduce motion" />
    </View>}
  </View>;
}
