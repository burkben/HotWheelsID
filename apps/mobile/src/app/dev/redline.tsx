import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ComponentType } from 'react';

// No navigation entry; direct /dev/redline access works only in development.
const Gallery: ComponentType | null = __DEV__
  // Keep the gallery module out of the production bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/RedlineGallery').RedlineGallery
  : null;
const Motifs: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/MotifGallery').MotifGallery
  : null;
const Controls: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/ControlGallery').ControlGallery
  : null;

const Gauge: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/GaugeGallery').GaugeGallery
  : null;

const Connect: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/ConnectGallery').ConnectGallery
  : null;

const Countdown: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/CountdownGallery').CountdownGallery
  : null;

const RaceLive: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/RaceLiveGallery').RaceLiveGallery
  : null;

const Results: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/ResultsGallery').ResultsGallery
  : null;

const Garage: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/GarageGallery').GarageGallery
  : null;

const History: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/HistoryGallery').HistoryGallery
  : null;

const Trophies: ComponentType | null = __DEV__
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/TrophyGallery').TrophyGallery
  : null;

export default function RedlineGalleryRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (section === 'trophies' && Trophies) return <Trophies />;
  if (section === 'history' && History) return <History />;
  if (section === 'garage' && Garage) return <Garage />;
  if (section === 'results' && Results) return <Results />;
  if (section === 'race-live' && RaceLive) return <RaceLive />;
  if (section === 'countdown' && Countdown) return <Countdown />;
  if (section === 'connect' && Connect) return <Connect />;
  if (section === 'gauge' && Gauge) return <Gauge />;
  if (section === 'controls' && Controls) return <Controls />;
  if (section === 'motifs' && Motifs) return <Motifs />;
  return Gallery ? <Gallery /> : <Redirect href="/" />;
}
