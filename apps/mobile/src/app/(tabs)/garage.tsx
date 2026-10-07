/**
 * Garage — the durable collection of every car the portal has ever seen
 * (ADR-0006, Phase 3). Renders from {@link useGarageStore}, which the persistence
 * bootstrap hydrates from SQLite and keeps in sync via the portal→garage bridge.
 * The car currently on the portal (from {@link usePortalStore}) is highlighted.
 * Series filters are client-side only (SPEC §4.7); the store order is unchanged.
 */
import { useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGarageStore } from '@/store/garageStore';
import type { CarRecord } from '@/store/persistence/carRepository';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { carArtwork } from '@/catalog/artwork';
import { speedUnitLabel } from '@/speed/format';
import { formatMph } from '@/garage/format';
import { garageCardModel } from '@/garage/cardModel';
import { filterBySeries, recordHolders, seriesFilters } from '@/garage/series';
import { GarageBoard } from '@/garage/components/GarageBoard';
import { useGarageIdentities } from '@/garage/useGarageIdentities';
import { useLayout } from '@/layout/useLayout';

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const cars = useGarageStore((s) => s.cars);
  const onPortalUid = usePortalStore((s) => s.car?.uid ?? null);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);

  const identities = useGarageIdentities(cars);

  const [selected, setSelected] = useState<string | null>(null);
  const seriesOf = (car: CarRecord) => identities.get(car.uid)?.series;
  const filters = useMemo(() => seriesFilters(cars, (car) => identities.get(car.uid)?.series), [cars, identities]);
  const activeSeries = selected != null && filters.some((f) => f.series === selected) ? selected : null;
  const visible = filterBySeries(cars, seriesOf, activeSeries);

  const cards = useMemo(() => {
    const records = recordHolders(cars);
    const display = { unit: speedUnit, calibration: speedCalibration };
    return visible.map((car) => garageCardModel(car, {
      cars, identity: identities.get(car.uid), hasArtwork: (id) => carArtwork(id) != null, filters, onPortal: car.uid === onPortalUid,
      record: records.has(car.uid), best: formatMph(car.bestMph, display), unit: speedUnitLabel(speedUnit).toUpperCase(),
    }));
  }, [visible, cars, identities, filters, onPortalUid, speedUnit, speedCalibration]);

  const identifiedCount = identities.size;
  const onPortalHere = onPortalUid != null && cars.some((c) => c.uid === onPortalUid);
  // Phones get the two-up trading-card grid; iPad keeps its width-based columns.
  const columns = Math.max(2, layout.columns);
  const gutter = layout.isTablet ? layout.gutter : 16;

  const summary =
    cars.length === 0
      ? 'Your collection lives here'
      : [identifiedCount > 0 ? `${identifiedCount} identified` : null, onPortalHere ? '1 on portal' : null]
          .filter(Boolean)
          .join(' · ') || 'Tap a car to identify it';

  return (
    <GarageBoard
      count={cars.length}
      summary={summary}
      filters={filters}
      activeSeries={activeSeries}
      onSelect={setSelected}
      cards={cards}
      columns={columns}
      gutter={gutter}
      bottomInset={insets.bottom}
    />
  );
}
