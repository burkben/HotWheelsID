import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { TrophyCase } from '@/achievements/components/TrophyCase';
import { evaluate, summarize } from '@/achievements/engine';
import { emptyStats } from '@/achievements/stats';
import { useLayout } from '@/layout/useLayout';

// Local review fixture matching Achievements.dc.html (8/13); it never touches the store.
const UNLOCKED = {
  'speed-100': 1, 'speed-200': 2, 'race-first': 3, 'race-10': 4, 'lap-sub3': 5, 'collect-1': 6, 'collect-5': 7, 'speed-240': 8,
};
const STATS = { ...emptyStats(), topSpeedMph: 247, racesFinished: 12, totalLaps: 64, longestRaceLaps: 0, bestLapSeconds: 2.85, carsCollected: 6 };

/** `/dev/redline?section=trophies` · `none=1` shows the nothing-unlocked state. */
export function TrophyGallery() {
  const params = useLocalSearchParams<{ none?: string }>();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const unlocked = params.none === '1' ? {} : UNLOCKED;
  return (
    <TrophyCase
      views={evaluate(params.none === '1' ? emptyStats() : STATS, unlocked)}
      summary={summarize(unlocked)}
      maxWidth={layout.contentMaxWidth}
      top={insets.top}
      bottom={insets.bottom}
      onBack={() => {}}
    />
  );
}
