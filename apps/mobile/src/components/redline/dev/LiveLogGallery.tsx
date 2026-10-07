import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BleLogEntry } from '@/ble/types';
import { BleStatusBanner } from '@/components/BleStatusBanner';
import { LiveLogRow } from '@/components/LiveLogRow';
import { colorsR } from '@/theme/tokens';
import { Notice, SectionHeader } from '../index';

// Sample rows only: demo mode does not write to the BLE event log.
const at = (s: number) => new Date(2026, 9, 4, 19, 42, s).getTime();
const ENTRIES: BleLogEntry[] = [
  { id: 1, at: at(1), level: 'info', message: 'Scanning for “HWiD”…' },
  { id: 2, at: at(3), level: 'info', message: 'Connected · MPID handshake OK (P-256 ECDH)' },
  { id: 3, at: at(9), level: 'event', message: 'carDetected uid=6C:C4:5A:2B:64:81 serial=1102032557' },
  { id: 4, at: at(12), level: 'event', message: 'speed raw=0.0418 → 247.1 scale mph' },
  { id: 5, at: at(20), level: 'error', message: 'Notification error on 0x0003: GATT 133' },
];

/** `/dev/redline?section=live-log`: Speed's BLE fault banners, notices and sample log rows. */
export function LiveLogGallery() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colorsR.asphalt }} contentContainerStyle={{ padding: 16, paddingTop: Math.max(16, insets.top), gap: 14 }}>
      <BleStatusBanner phase="poweredOff" />
      <BleStatusBanner phase="error" onRetry={() => {}} />
      <Notice alert tone="danger" title="Portal firmware unsupported" body="This portal connected, but it exposes neither the legacy control service nor a usable MPID auth handshake." />
      <Notice tone="info" title="Demo mode is active" body="Switch to Live BLE to collect real portal diagnostics." />
      <SectionHeader title="Event log" count={ENTRIES.length} />
      {ENTRIES.map((entry) => <LiveLogRow key={entry.id} entry={entry} />)}
    </ScrollView>
  );
}
