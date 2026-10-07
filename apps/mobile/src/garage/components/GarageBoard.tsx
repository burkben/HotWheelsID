import { FlatList, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { FilterChip, RText, ScreenHeader } from '@/components/redline';
import { colorsR } from '@/theme/tokens';
import { padGrid } from '../cardModel';
import type { SeriesFilter } from '../series';
import { GarageCard, bayHeightFor, type GarageCardModel } from './GarageCard';
import { GarageEmpty } from './GarageEmpty';

const GAP = 12;

/** Store-free Garage layout, shared by the tab and its development fixture. */
export function GarageBoard({ count, summary, filters, activeSeries, onSelect, cards, columns, gutter, bottomInset }: {
  count: number;
  summary: string;
  filters: readonly SeriesFilter[];
  activeSeries: string | null;
  onSelect: (series: string | null) => void;
  cards: readonly GarageCardModel[];
  columns: number;
  gutter: number;
  bottomInset: number;
}) {
  const { width } = useWindowDimensions();
  const bayHeight = bayHeightFor((width - gutter * 2 - GAP * (columns - 1)) / columns);
  return (
    <View style={[styles.screen, { paddingTop: 8 }]}>
      <View style={[styles.header, { paddingHorizontal: gutter }]}>
        <ScreenHeader
          title="Garage"
          subtitle={summary}
          right={
            <View accessible accessibilityLabel={`${count} ${count === 1 ? 'car' : 'cars'}`} style={styles.count}>
              <RText variant="statValue" style={styles.countValue}>{count}</RText>
              <RText variant="eyebrow" style={styles.countLabel}>{count === 1 ? 'CAR' : 'CARS'}</RText>
            </View>
          }
        />
      </View>

      {filters.length > 0 && (
        <View accessibilityRole="toolbar" accessibilityLabel="Filter by series">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.filters, { paddingHorizontal: gutter - 4 }]}>
            <FilterChip label="ALL" selected={activeSeries == null} onPress={() => onSelect(null)} />
            {filters.map((f) => (
              <FilterChip key={f.series} label={f.series.toUpperCase()} color={f.color} selected={activeSeries === f.series} onPress={() => onSelect(f.series)} />
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={padGrid(cards, columns)}
        keyExtractor={(c, i) => c?.uid ?? `spacer-${i}`}
        // FlatList refuses to change `numColumns` in place, so the key forces a
        // remount when a rotation or Split View resize changes the grid.
        key={`cols-${columns}`}
        numColumns={columns}
        columnWrapperStyle={cards.length > 0 ? styles.column : undefined}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomInset + 24, paddingHorizontal: gutter },
          count === 0 && styles.listEmpty,
        ]}
        // Spacers keep a short last row's cards at their column width.
        renderItem={({ item }) => (item ? <GarageCard card={item} bayHeight={bayHeight} /> : <View style={styles.spacer} />)}
        ListEmptyComponent={<GarageEmpty />}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  header: { paddingBottom: 18 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  countValue: { fontSize: 40, lineHeight: 40, color: colorsR.flame },
  countLabel: { fontSize: 12, lineHeight: 14, letterSpacing: 1.5, color: colorsR.inkMuted },
  filters: { paddingBottom: 8 },
  list: { gap: GAP, paddingTop: 4 },
  column: { gap: GAP },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  spacer: { flex: 1 },
});
