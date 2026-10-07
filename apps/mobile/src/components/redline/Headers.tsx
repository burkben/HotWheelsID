import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colorsR, fontR } from '@/theme/tokens';
import { decorative } from './decorative';
import { RText } from './RText';

export function SectionHeader({ title, index, count }: { title: string; index?: string | number; count?: string | number }) {
  return (
    <View style={styles.section}>
      {index != null && <RText variant="eyebrow" style={{ color: colorsR.flame }}>{String(index).padStart(2, '0')}</RText>}
      <RText variant="sectionTitle" accessibilityRole="header" style={{ flexShrink: 1 }}>{title}</RText>
      <View {...decorative} style={styles.rule} />
      {count != null && <RText variant="eyebrow" style={{ color: colorsR.inkMuted }}>{count}</RText>}
    </View>
  );
}

export function ScreenHeader({ title, subtitle, right, backLabel, onBack }: { title: string; subtitle?: ReactNode; right?: ReactNode; backLabel?: string; onBack?: () => void }) {
  return (
    <View style={{ gap: 8 }}>
      {onBack && <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={`Back to ${backLabel ?? 'previous screen'}`} style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}>
        <Svg {...decorative} width={18} height={18} viewBox="0 0 24 24"><Path d="M15 5l-7 7 7 7" stroke={colorsR.electric} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <RText style={{ fontFamily: fontR.bodySemi, color: colorsR.electric }}>{backLabel ?? 'Back'}</RText>
      </Pressable>}
      <View style={[styles.titleRow, subtitle != null && styles.titleRowWithSubtitle]}>
        <View style={styles.titleBlock}>
          <RText variant="screenTitle" accessibilityRole="header">{title}</RText>
          {typeof subtitle === 'string' ? <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>{subtitle}</RText> : subtitle}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { flex: 1, height: 1, backgroundColor: colorsR.rule },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  // With a subtitle the right slot sits on the block's baseline, as in Garage.dc.html.
  titleRowWithSubtitle: { alignItems: 'flex-end' },
  titleBlock: { flexShrink: 1, gap: 4 },
  back: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
});
