import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';

// No navigation entry; direct /dev/redline access works only in development.
const Gallery: ComponentType | null = __DEV__
  // Keep the gallery module out of the production bundle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require('@/components/redline/dev/RedlineGallery').RedlineGallery
  : null;

export default function RedlineGalleryRoute() {
  return Gallery ? <Gallery /> : <Redirect href="/" />;
}
