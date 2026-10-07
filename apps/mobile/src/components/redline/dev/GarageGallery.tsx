import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { carArtwork } from '@/catalog/artwork';
import { findCatalogCar } from '@/catalog/catalog';
import { useLayout } from '@/layout/useLayout';
import { garageCardModel } from '@/garage/cardModel';
import { GarageBoard } from '@/garage/components/GarageBoard';
import { filterBySeries, recordHolders, seriesFilters } from '@/garage/series';
import type { CarRecord } from '@/store/persistence/carRepository';

// Local review fixture matching Garage.dc.html; nothing enters a store.
const FIXTURE: readonly (CarRecord & { catalogId: string | null })[] = [
  { uid: 'fx-07', catalogId: '70-dodge-charger-r-t', bestMph: 247, races: 9 },
  { uid: 'fx-12', catalogId: 'scorpedo', bestMph: 231, races: 6 },
  { uid: 'fx-03', catalogId: '17-nissan-gt-r-r35', bestMph: 219, races: 4 },
  { uid: 'fx-mystery', catalogId: null, bestMph: 198, races: 2 },
  { uid: 'fx-14', catalogId: 'night-shifter', bestMph: 205, races: 3 },
  { uid: 'fx-09', catalogId: 'fiat-500e', bestMph: 188, races: 1 },
].map((car, i) => ({ ...car, name: null, serial: null, firstSeen: i, lastSeen: i, detections: 1, bestLap: null }));

/** `/dev/redline?section=garage` · `photos=1` uses bundled artwork · `empty=1` · `odd=1`. */
export function GarageGallery() {
  const params = useLocalSearchParams<{ photos?: string; empty?: string; odd?: string }>();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const [selected, setSelected] = useState<string | null>(null);
  const cars = params.empty === '1' ? [] : params.odd === '1' ? FIXTURE.slice(0, 5) : FIXTURE;
  const identityOf = (uid: string) => findCatalogCar(FIXTURE.find((c) => c.uid === uid)?.catalogId ?? undefined);
  const filters = seriesFilters(cars, (c) => identityOf(c.uid)?.series);
  const active = filters.some((f) => f.series === selected) ? selected : null;
  const records = recordHolders(cars);
  const cards = filterBySeries(cars, (c) => identityOf(c.uid)?.series, active).map((car) => garageCardModel(car, {
    cars, identity: identityOf(car.uid), filters, onPortal: car.uid === 'fx-07', record: records.has(car.uid),
    hasArtwork: (id) => params.photos === '1' && carArtwork(id) != null, best: String(car.bestMph), unit: 'MPH',
  }));
  const identified = cars.filter((c) => c.catalogId).length;
  return (
    <GarageBoard
      count={cars.length}
      summary={cars.length ? `${identified} identified · 1 on portal` : 'Your collection lives here'}
      filters={filters}
      activeSeries={active}
      onSelect={setSelected}
      cards={cards}
      columns={Math.max(2, layout.columns)}
      gutter={layout.isTablet ? layout.gutter : 16}
      bottomInset={insets.bottom}
    />
  );
}
