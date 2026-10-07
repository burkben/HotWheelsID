/**
 * History — the durable log of portal sessions (ADR-0006, Phase 3). One session
 * spans a single BLE connection; the persistence bootstrap opens one on connect
 * and closes it on disconnect, recording every car pass in between.
 *
 * History has **no render store**: this screen reads the {@link SessionRepository}
 * straight from {@link getSessionRepository} on focus (a cold list read, not a hot
 * path). When SQLite isn't in the build yet the repo is `null` → empty state.
 * Redline layout: SPEC §4.9 / `png/History.png`. The strip, grouping and
 * sparklines are derived client-side; the repository is unchanged.
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { getSessionRepository } from '@/store/persistence/historyAccess';
import type { SessionSummary } from '@/store/persistence/sessionRepository';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel } from '@/speed/format';
import { useLayout } from '@/layout/useLayout';
import { formatMphLabel } from '@/history/format';
import { clearSparkCache } from '@/history/sparkCache';
import { HistoryBoard } from '@/history/components/HistoryBoard';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  // Session tickets are text-dense, so they get one fewer column than the photo
  // grid in the Garage — two wide on any iPad, three only on a big landscape one.
  const columns = Math.max(1, layout.columns - 1);
  const gutter = layout.isTablet ? layout.gutter : 16;
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const [sessions, setSessions] = useState<SessionSummary[] | null>(null);
  // Captured on each focus read, so "today" and live lengths match the data.
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(() => {
    const repo = getSessionRepository();
    setNow(Date.now());
    if (!repo) {
      setSessions([]);
      return;
    }
    let active = true;
    repo
      .listSessions()
      .then((s) => active && setSessions(s))
      .catch(() => active && setSessions([]));
    return () => {
      active = false;
    };
  }, []);

  useFocusEffect(reload);

  const confirmClear = () => {
    const repo = getSessionRepository();
    if (!repo || (sessions?.length ?? 0) === 0) return;
    Alert.alert('Clear history?', 'This permanently deletes every recorded session and pass.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          repo
            .clear()
            .then(() => {
              clearSparkCache();
              setSessions([]);
            })
            .catch(() => {});
        },
      },
    ]);
  };

  return (
    <HistoryBoard
      sessions={sessions}
      now={now}
      columns={columns}
      gutter={gutter}
      bottomInset={insets.bottom}
      formatBest={(mph) => formatMphLabel(mph, { unit: speedUnit, calibration: speedCalibration })}
      unit={speedUnitLabel(speedUnit).toUpperCase()}
      onClear={confirmClear}
    />
  );
}
