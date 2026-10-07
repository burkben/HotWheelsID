/**
 * Trophy case — unlockable badges across Speed / Racing / Garage (Phase 5).
 * Reads the live {@link useAchievementsStore} (kept current by the persistence
 * bootstrap from durable race totals + the garage) and renders each catalog
 * entry via the pure {@link evaluate} engine. Redline layout: SPEC §4.10 /
 * `png/Achievements.png`; medallions use the icon map, not the catalog emoji.
 *
 * When SQLite isn't in the build yet the store stays empty, so everything reads
 * as locked — the same graceful no-rebuild fallback as Garage/History.
 */
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { evaluate, summarize } from '@/achievements/engine';
import { TrophyCase } from '@/achievements/components/TrophyCase';
import { useLayout } from '@/layout/useLayout';
import { useAchievementsStore } from '@/store/achievementsStore';

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const stats = useAchievementsStore((s) => s.stats);
  const views = useMemo(() => evaluate(stats, unlocked), [stats, unlocked]);
  return (
    <TrophyCase
      views={views}
      summary={summarize(unlocked)}
      maxWidth={layout.contentMaxWidth}
      top={insets.top}
      bottom={insets.bottom}
      onBack={() => (router.canGoBack() ? router.back() : router.navigate('/more'))}
    />
  );
}
