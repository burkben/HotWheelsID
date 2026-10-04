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

export default function RedlineGalleryRoute() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  if (section === 'motifs' && Motifs) return <Motifs />;
  return Gallery ? <Gallery /> : <Redirect href="/" />;
}
