import { Pressable, SectionList, StyleSheet, View } from 'react-native';

import { CarSilhouette, RText, ScreenHeader, SectionHeader, TrackLane } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import type { SessionSummary } from '@/store/persistence/sessionRepository';
import { colorsR, fontR } from '@/theme/tokens';
import { groupSessions, heatStrip, recordSessionIds } from '../heat';
import { HeatStrip } from './HeatStrip';
import { SessionTicket } from './SessionTicket';

const GAP = 8;

/** Store-free History layout, shared by the tab and its development fixture. */
export function HistoryBoard({ sessions, now, columns, gutter, bottomInset, formatBest, unit, onClear, sparkFor }: {
  /** Null while the first read is in flight. */
  sessions: readonly SessionSummary[] | null;
  now: number;
  columns: number;
  gutter: number;
  bottomInset: number;
  formatBest: (bestMph: number) => string;
  unit: string;
  onClear: () => void;
  /** Fixture override; the tab loads sparklines lazily from the repository. */
  sparkFor?: (id: number) => string | null;
}) {
  const list = sessions ?? [];
  const hasSessions = list.length > 0;
  const strip = heatStrip(list, now);
  const records = recordSessionIds(list);
  // Each SectionList item is one grid row, so iPad columns stay virtualised.
  const sections = groupSessions(list, now).map((g) => ({
    key: g.key,
    data: Array.from({ length: Math.ceil(g.sessions.length / columns) }, (_, i) => g.sessions.slice(i * columns, (i + 1) * columns)),
  }));
  return (
    <View style={[styles.screen, { paddingTop: 8 }]}>
      <View style={[styles.header, { paddingHorizontal: gutter }]}>
        <ScreenHeader title="History" right={hasSessions ? (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear history" style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
            <RText style={styles.clearText}>Clear</RText>
          </Pressable>
        ) : undefined} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(row) => row.map((s) => s.id).join('-')}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomInset + 24, paddingHorizontal: gutter },
          !hasSessions && styles.listEmpty,
        ]}
        ListHeaderComponent={hasSessions ? <View style={styles.strip}><HeatStrip strip={strip} /></View> : null}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}><SectionHeader title={section.key} /></View>
        )}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.map((s) => (
              <SessionTicket key={s.id} session={s} now={now} best={formatBest(s.bestMph)} unit={unit} record={records.has(s.id)} spark={sparkFor?.(s.id)} />
            ))}
            {Array.from({ length: columns - item.length }, (_, i) => <View key={`spacer-${i}`} style={styles.spacer} />)}
          </View>
        )}
        ListEmptyComponent={sessions ? <EmptyHistory /> : null}
      />
    </View>
  );
}

function EmptyHistory() {
  return (
    <View style={styles.empty}>
      <View {...decorative} style={styles.emptyArt}>
        <TrackLane height={64} />
        <View style={styles.emptyCar}><CarSilhouette width={180} color={colorsR.inkDisabled} outline /></View>
      </View>
      <RText variant="sectionTitle" accessibilityRole="header" style={styles.emptyTitle}>No sessions yet</RText>
      <RText style={styles.emptyBody}>
        Connect to your race portal and every car pass is logged here, grouped by session, so you can
        look back at a whole afternoon of racing.
      </RText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  header: { paddingBottom: 14 },
  clear: { minHeight: 44, minWidth: 44, paddingHorizontal: 4, justifyContent: 'center' },
  clearText: { color: colorsR.electric, fontFamily: fontR.bodySemi },
  pressed: { opacity: 0.7 },
  list: { gap: GAP },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  strip: { marginBottom: 14 },
  sectionHeader: { paddingTop: 8, paddingBottom: 0 },
  row: { flexDirection: 'row', gap: 12 },
  spacer: { flex: 1 },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  emptyArt: { width: '100%', maxWidth: 320, height: 118, justifyContent: 'flex-end', marginBottom: 8 },
  emptyCar: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },
  emptyTitle: { fontSize: 22, lineHeight: 26 },
  emptyBody: { color: colorsR.inkSecondary, textAlign: 'center', maxWidth: 320 },
});
