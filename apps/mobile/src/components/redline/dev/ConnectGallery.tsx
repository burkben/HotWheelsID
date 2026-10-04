import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BlePhase } from '@/ble/types';
import { usePortalControllerActions } from '@/portal/PortalControllerProvider';
import { useSettingsStore } from '@/store/settingsStore';
import { colorsR } from '@/theme/tokens';
import { FindPortal } from '../FindPortal';
import { RText } from '../RText';
import { SkewSwitch } from '../SkewSwitch';

/** Web/Simulator controllers intentionally force demo, so faults use fixtures. */
export function ConnectGallery() {
  const params = useLocalSearchParams<{ phase?: string }>();
  const allowed = ['scanning', 'poweredOff', 'unauthorized', 'notFound', 'unsupported'] as const;
  const initial = allowed.find(phase => phase === params.phase) ?? 'scanning';
  const [phase, setPhase] = useState<BlePhase>(initial);
  const [ready, setReady] = useState(false);
  const insets = useSafeAreaInsets();
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const controller = usePortalControllerActions();
  return <View nativeID={ready ? 'connect-hydrated' : undefined} onLayout={() => setReady(true)} style={{ flex: 1, paddingTop: insets.top, backgroundColor: colorsR.asphalt }}>
    <FindPortal status={{ connection: phase === 'scanning' ? 'connecting' : 'disconnected', phase, mode: 'live', controlStatus: null, manuallyDisconnected: false, onConnect: () => setPhase('scanning'), onRetry: () => setPhase('scanning'), onDisconnect: () => setPhase('idle') }} onDemo={() => { void controller.setMode('demo').then(() => router.replace('/')); }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: insets.bottom + 8 }}><RText testID="connect-phase" variant="eyebrow">DEV · {phase}</RText><SkewSwitch accessibilityLabel="Reduce motion" value={reduceMotion} onValueChange={value => useSettingsStore.getState().setReduceMotion(value)} /></View>
  </View>;
}
