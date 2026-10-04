/** Redline stat cell. Existing value/unit/delta props remain supported. */
import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colorsR } from '@/theme/tokens';
import { RText } from '../redline/RText';
import { decorative } from '../redline/decorative';
import { spokenUnit } from '../redline/readoutPresentation';

export interface TelemetryValueProps {
  value: string;
  unit?: string;
  /** Signed delta like "+2.4" / "-0.8"; rendered with color + sign. */
  delta?: string;
  size?: 'md' | 'lg' | 'hero';
  color?: string;
  accessibilityLabel?: string;
  label?: string;
  accent?: string;
}

const SIZES = { md: 30, lg: 40, hero: 64 } as const;

export function TelemetryValue({ value, unit, delta, size = 'md', color = colorsR.chalk, accessibilityLabel, label, accent }: TelemetryValueProps) {
  return (
    <View style={label != null || accent ? styles.cell : styles.readout} accessible accessibilityLabel={accessibilityLabel ?? [label, value, spokenUnit(unit), delta && `${delta} ${spokenUnit(unit)}`].filter(Boolean).join(' ')}>
      {!!accent && <View {...decorative} style={[styles.accent, { backgroundColor: accent }]} />}
      {!!label && <RText variant="eyebrow" style={styles.muted}>{label}</RText>}
      <RText variant="statValue" style={{ color, fontSize: SIZES[size], lineHeight: SIZES[size] * 1.1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</RText>
      {!!unit && <RText variant="eyebrow" style={styles.unit}>{unit}</RText>}
      {!!delta && <RText variant="lapTime" style={{ fontSize: 14, color: delta.startsWith('+') ? colorsR.greenFlag : colorsR.redFlag }}>{delta}</RText>}
    </View>
  );
}

export function StatCell(props: TelemetryValueProps) {
  return <TelemetryValue {...props} label={props.label ?? ''} />;
}
export function StatRow({ children }: PropsWithChildren) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  cell: { flex: 1, minWidth: 0, backgroundColor: colorsR.pitLane, padding: 12, gap: 4 },
  readout: { minWidth: 0, gap: 4 },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  muted: { color: colorsR.inkMuted },
  unit: { color: colorsR.inkMuted, fontSize: 10, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: 2, backgroundColor: colorsR.asphalt },
});
