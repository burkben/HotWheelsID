import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colorsR } from '@/theme/tokens';
import { decorative } from './decorative';
import { RText } from './RText';

const TONES = { caution: colorsR.caution, danger: colorsR.redFlag, info: colorsR.electric } as const;

/** Inline notice panel (SPEC §4.12 banner language): pitLane, 3 pt tone bar, HUD eyebrow, body. */
export function Notice({ tone = 'caution', title, body, alert = false, children }: PropsWithChildren<{
  tone?: keyof typeof TONES;
  title: string;
  body: string;
  alert?: boolean;
}>) {
  const ink = TONES[tone];
  return (
    <View style={styles.notice} accessibilityRole={alert ? 'alert' : undefined}>
      <View {...decorative} style={[styles.bar, { backgroundColor: ink }]} />
      <RText variant="chip" style={[styles.title, { color: ink }]}>{title}</RText>
      <RText variant="bodySmall" style={styles.body}>{body}</RText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { backgroundColor: colorsR.pitLane, paddingTop: 15, paddingHorizontal: 14, paddingBottom: 14, gap: 6, overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  title: { fontSize: 11, lineHeight: 14 },
  body: { color: colorsR.inkSecondary },
});
