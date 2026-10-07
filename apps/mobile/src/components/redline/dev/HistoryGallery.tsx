import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { HistoryBoard } from '@/history/components/HistoryBoard';
import { useLayout } from '@/layout/useLayout';
import type { SessionSummary } from '@/store/persistence/sessionRepository';

// Local review fixture from History.dc.html; it never reads or writes the repository.
const at = (m: number, d: number, h: number, min: number) => new Date(2026, m - 1, d, h, min).getTime();
const NOW = at(10, 4, 19, 54);
const ROWS: readonly (SessionSummary & { spark: string })[] = [
  { id: 9, startedAt: at(10, 4, 19, 42), endedAt: null, passCount: 14, bestMph: 247, spark: '0,18 6,14 12,16 18,9 24,12 30,7 36,10 42,5 48,8 54,2' },
  { id: 8, startedAt: at(10, 4, 16, 15), endedAt: at(10, 4, 16, 33), passCount: 22, bestMph: 226, spark: '0,16 6,12 12,15 18,11 24,13 30,8 36,12 42,9 48,11 54,7' },
  { id: 7, startedAt: at(10, 2, 18, 3), endedAt: at(10, 2, 18, 10), passCount: 9, bestMph: 214, spark: '0,20 6,15 12,17 18,12 24,14 30,10 36,13 42,11 48,14 54,9' },
  { id: 6, startedAt: at(10, 1, 17, 30), endedAt: at(10, 1, 17, 56), passCount: 31, bestMph: 231, spark: '0,14 6,17 12,11 18,13 24,8 30,12 36,6 42,9 48,7 54,10' },
  { id: 5, startedAt: at(9, 30, 19, 10), endedAt: at(9, 30, 19, 19), passCount: 12, bestMph: 198, spark: '0,19 6,17 12,20 18,15 24,17 30,13 36,16 42,12 48,15 54,13' },
  { id: 4, startedAt: at(9, 26, 15, 0), endedAt: at(9, 26, 15, 20), passCount: 18, bestMph: 205, spark: '0,16 6,12 12,15 18,11 24,13 30,8 36,12 42,9 48,11 54,7' },
  { id: 3, startedAt: at(9, 26, 11, 0), endedAt: at(9, 26, 11, 12), passCount: 8, bestMph: 188, spark: '0,20 6,15 12,17 18,12 24,14 30,10 36,13 42,11 48,14 54,9' },
  { id: 2, startedAt: at(9, 25, 18, 0), endedAt: at(9, 25, 18, 7), passCount: 6, bestMph: 176, spark: '0,14 6,17 12,11 18,13 24,8 30,12 36,6 42,9 48,7 54,10' },
  { id: 1, startedAt: at(9, 22, 20, 0), endedAt: at(9, 22, 20, 5), passCount: 6, bestMph: 170, spark: '0,19 6,17 12,20 18,15 24,17 30,13 36,16 42,12 48,15 54,13' },
];

/** `/dev/redline?section=history` · `empty=1`. */
export function HistoryGallery() {
  const params = useLocalSearchParams<{ empty?: string }>();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  return (
    <HistoryBoard
      sessions={params.empty === '1' ? [] : ROWS}
      now={NOW}
      columns={Math.max(1, layout.columns - 1)}
      gutter={layout.isTablet ? layout.gutter : 16}
      bottomInset={insets.bottom}
      formatBest={(mph) => String(mph)}
      unit="MPH"
      onClear={() => {}}
      sparkFor={(id) => ROWS.find((r) => r.id === id)?.spark ?? null}
    />
  );
}
