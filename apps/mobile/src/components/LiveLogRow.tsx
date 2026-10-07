import { StyleSheet, View } from 'react-native';

import type { BleLogEntry } from '@/ble/types';
import { colorsR, fontR } from '@/theme/tokens';
import { RText } from './redline/RText';
import { SkewBox } from './redline/SkewBox';

/** Event-type tags use the chip palette; colour is backed by the printed tag. */
const LOG_TAG: Record<BleLogEntry['level'], { label: string; fill: string; border: string; ink: string }> = {
  event: { label: 'EVENT', ...colorsR.status.onPortal },
  info: { label: 'INFO', ...colorsR.status.demo },
  error: { label: 'ERROR', fill: 'rgba(255,77,94,0.12)', border: 'rgba(255,77,94,0.55)', ink: colorsR.redFlag },
};

export function formatLogTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Live portal log row (SPEC §4.12): HUD timestamp, tone tag, HUD-medium payload. */
export function LiveLogRow({ entry }: { entry: BleLogEntry }) {
  const tag = LOG_TAG[entry.level];
  const time = formatLogTime(entry.at);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${time}, ${tag.label.toLowerCase()}: ${entry.message}`}>
      <RText variant="lapTime" style={styles.time}>{time}</RText>
      <SkewBox style={[styles.tag, { backgroundColor: tag.fill, borderColor: tag.border }]}>
        <RText variant="chip" style={[styles.tagText, { color: tag.ink }]}>{tag.label}</RText>
      </SkewBox>
      <RText style={[styles.message, entry.level === 'error' && { color: colorsR.redFlag }]}>{entry.message}</RText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: colorsR.pitLane, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44 },
  time: { fontSize: 13, lineHeight: 18, color: colorsR.inkMuted, minWidth: 62 },
  tag: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 1, marginTop: 1 },
  tagText: { fontSize: 9, lineHeight: 13, letterSpacing: 1 },
  message: { flex: 1, fontFamily: fontR.hudMedium, fontSize: 13, lineHeight: 18, color: colorsR.chalk },
});
