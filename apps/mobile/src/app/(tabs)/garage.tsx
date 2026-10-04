/**
 * Garage — the durable collection of every car the portal has ever seen
 * (ADR-0006, Phase 3). Renders from {@link useGarageStore}, which the persistence
 * bootstrap hydrates from SQLite and keeps in sync via the portal→garage bridge.
 * The car currently on the portal (from {@link usePortalStore}) is highlighted.
 */
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { LinkPressable } from '@/components/LinkPressable';

import { useGarageStore } from '@/store/garageStore';
import type { CarRecord } from '@/store/persistence/carRepository';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { catalogIdForUid, useIdentityStore } from '@/store/identityStore';
import { speedUnitLabel } from '@/speed/format';
import { colors, fontFamily, fontSize, fontSizeT, fontWeight, radius, radiusT, spacing } from '@/theme/tokens';
import { carLabel, formatLastSeen, formatLap, formatMph } from '@/garage/format';
import { CarPhoto } from '@/catalog/CarPhoto';
import { useCarIdentity } from '@/catalog/useCarIdentity';
import { useLayout } from '@/layout/useLayout';

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const cars = useGarageStore((s) => s.cars);
  const onPortalUid = usePortalStore((s) => s.car?.uid ?? null);

  // Count identified cars off a single identity snapshot (uid → casting → catalog).
  const links = useIdentityStore((s) => s.links);
  const identifications = useIdentityStore((s) => s.identifications);
  const seed = useIdentityStore((s) => s.seed);
  const identifiedCount = cars.reduce(
    (n, c) => (catalogIdForUid({ links, identifications, seed }, c.uid) ? n + 1 : n),
    0,
  );
  const onPortalHere = onPortalUid != null && cars.some((c) => c.uid === onPortalUid);
  const columns = layout.columns;

  const summary =
    cars.length === 0
      ? 'Your collection lives here'
      : [identifiedCount > 0 ? `${identifiedCount} identified` : null, onPortalHere ? '1 on portal' : null]
          .filter(Boolean)
          .join('  ·  ') || 'Tap a car to identify it';

  return (
    <View style={[styles.screen, { paddingTop: spacing(2) }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Garage</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        <Text style={styles.count}>{cars.length}</Text>
      </View>

      <FlatList
        data={cars}
        keyExtractor={(c) => c.uid}
        // FlatList refuses to change `numColumns` in place, so the key forces a
        // remount when a rotation or Split View resize changes the grid.
        key={`cols-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.column : undefined}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing(6), paddingHorizontal: layout.gutter },
          cars.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <CarRow car={item} onPortal={item.uid === onPortalUid} grid={columns > 1} />
        )}
        ListEmptyComponent={<EmptyGarage />}
      />
    </View>
  );
}

function CarRow({ car, onPortal, grid }: { car: CarRecord; onPortal: boolean; grid?: boolean }) {
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const display = { unit: speedUnit, calibration: speedCalibration };
  const identity = useCarIdentity(car.uid);
  const title = identity?.name ?? carLabel(car);
  return (
    <Link href={{ pathname: '/garage/[uid]', params: { uid: car.uid } }} asChild>
      <LinkPressable
        contentStyle={({ pressed }) => [
          styles.row,
          grid && styles.rowGrid,
          onPortal && styles.rowOnPortal,
          pressed && styles.pressed,
        ]}
      >
        <CarPhoto carId={identity?.id} size={56} rounded={radius.md} ring={!!identity} />
        <View style={styles.rowMain}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.carName} numberOfLines={1}>
              {title}
            </Text>
            {onPortal && <Text style={styles.onPortal}>● on portal</Text>}
          </View>
          <Text style={styles.carMeta} numberOfLines={1}>
            {identity?.series ?? (car.serial ? `#${car.serial}` : car.uid)}
            {'  ·  '}
            {formatLastSeen(car.lastSeen)}
          </Text>
        </View>
        <View style={styles.rowStats}>
          <Text style={styles.bestMph}>{formatMph(car.bestMph, display)}</Text>
          <Text style={styles.bestMphUnit}>best {speedUnitLabel(speedUnit)}</Text>
          <Text style={styles.subStat} numberOfLines={1}>
            {formatLap(car.bestLap)} · {car.races} {car.races === 1 ? 'race' : 'races'}
          </Text>
        </View>
      </LinkPressable>
    </Link>
  );
}

function EmptyGarage() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🏎️</Text>
      <Text style={styles.emptyTitle}>No cars yet</Text>
      <Text style={styles.emptyBody}>
        Place a Hot Wheels id car on the portal and
        it’ll be collected here automatically — every car you scan, forever.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.void },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.ink, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  subtitle: { color: colors.inkSecondary, fontSize: fontSize.sm },
  count: {
    color: colors.inkSecondary,
    fontFamily: fontFamily.telemetry,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.panelSolid,
    borderColor: colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusT.field,
    minWidth: 40,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: spacing(2.5),
    overflow: 'hidden',
  },
  list: { gap: spacing(3) },
  column: { gap: spacing(3) },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.panelSolid,
    borderColor: colors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radiusT.card,
    padding: spacing(4),
    // Left inset so the on-portal flame rail has somewhere to sit.
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  // In a grid every tile has to claim an equal share of the row; `minWidth: 0`
  // lets the long car name shrink instead of forcing the column wider.
  rowGrid: { flex: 1, minWidth: 0 },
  rowOnPortal: { borderLeftColor: colors.flame, backgroundColor: colors.panelRaised },
  rowMain: { flex: 1, gap: 4, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  carName: { color: colors.ink, fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  onPortal: { color: colors.flame, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  carMeta: { color: colors.inkSecondary, fontSize: fontSize.sm },
  rowStats: { alignItems: 'flex-end', gap: 1 },
  bestMph: {
    color: colors.flame,
    fontFamily: fontFamily.telemetry,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  bestMphUnit: { color: colors.inkMuted, fontSize: fontSizeT.xs, textTransform: 'uppercase', letterSpacing: 1 },
  subStat: { color: colors.inkSecondary, fontSize: fontSize.xs, marginTop: 2, fontVariant: ['tabular-nums'] },
  empty: { alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(6) },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { color: colors.ink, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  emptyBody: { color: colors.inkSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 19 },
  pressed: { opacity: 0.7 },
});
