import { StyleSheet, View } from 'react-native';

import { RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { colorsR, fontR } from '@/theme/tokens';
import { heatStripLabel, type HeatStrip as Strip } from '../heat';

/** LAST 14 DAYS panel (History.dc.html). One summarising label; cells are decorative. */
export function HeatStrip({ strip }: { strip: Strip }) {
  return (
    <View style={styles.panel} accessible accessibilityRole="image" accessibilityLabel={heatStripLabel(strip)}>
      <View style={styles.titleRow}>
        <RText variant="sectionTitle" style={styles.title}>Last {strip.days.length} days</RText>
        <RText variant="eyebrow" numberOfLines={1} style={styles.caption}>
          {strip.sessions} {strip.sessions === 1 ? 'SESSION' : 'SESSIONS'} · {strip.passes} {strip.passes === 1 ? 'PASS' : 'PASSES'}
        </RText>
      </View>
      <View {...decorative} style={styles.cells}>
        {strip.days.map((d) => (
          <View key={d.date} style={styles.day}>
            <View style={[styles.cell, { backgroundColor: colorsR.heat[d.level] }, d.isToday && styles.today]} />
            <RText variant="eyebrow" style={[styles.letter, d.isToday && { color: colorsR.chalk }]}>{d.letter}</RText>
          </View>
        ))}
      </View>
      <View {...decorative} style={styles.legend}>
        <RText variant="bodySmall" style={styles.legendText}>Fewer</RText>
        {colorsR.heat.map((c) => <View key={c} style={[styles.swatch, { backgroundColor: c }]} />)}
        <RText variant="bodySmall" style={styles.legendText}>More</RText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colorsR.pitLane, paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  title: { letterSpacing: 0 },
  caption: { flexShrink: 1, fontFamily: fontR.hud, letterSpacing: 1, color: colorsR.inkSecondary },
  cells: { flexDirection: 'row', gap: 4 },
  day: { flex: 1, alignItems: 'center', gap: 5 },
  cell: { alignSelf: 'stretch', height: 30, transform: [{ skewX: '-10deg' }] },
  today: { borderWidth: 2, borderColor: colorsR.chalk },
  letter: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 0, color: colorsR.inkMuted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11, lineHeight: 14, color: colorsR.inkMuted },
  swatch: { width: 12, height: 8 },
});
