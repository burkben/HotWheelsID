/**
 * Garage — the durable collection of every car the portal has ever seen
 * (ADR-0006, Phase 3). Renders from {@link useGarageStore}, which the persistence
 * bootstrap hydrates from SQLite and keeps in sync via the portal→garage bridge.
 * The car currently on the portal (from {@link usePortalStore}) is highlighted.
 */
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { useGarageStore } from '@/store/garageStore';
import { groupByCasting, type CarRecord } from '@/store/persistence/carRepository';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel } from '@/speed/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { carLabel, formatLastSeen, formatLap, formatMph } from '@/garage/format';

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const cars = useGarageStore((s) => s.cars);
  const onPortalUid = usePortalStore((s) => s.car?.uid ?? null);

  // How many cars share each casting, so a row can flag duplicates with a ×N badge.
  const copiesByModel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [modelId, group] of groupByCasting(cars)) counts.set(modelId, group.length);
    return counts;
  }, [cars]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ Home</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Garage</Text>
        <Text style={styles.count}>{cars.length}</Text>
      </View>

      <FlatList
        data={cars}
        keyExtractor={(c) => c.uid}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing(6) },
          cars.length === 0 && styles.listEmpty,
        ]}
        renderItem={({ item }) => (
          <CarRow
            car={item}
            onPortal={item.uid === onPortalUid}
            copies={item.modelId ? copiesByModel.get(item.modelId) ?? 1 : 1}
          />
        )}
        ListEmptyComponent={<EmptyGarage />}
      />
    </View>
  );
}

function CarRow({ car, onPortal, copies }: { car: CarRecord; onPortal: boolean; copies: number }) {
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const display = { unit: speedUnit, calibration: speedCalibration };
  return (
    <Link href={{ pathname: '/garage/[uid]', params: { uid: car.uid } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, onPortal && styles.rowOnPortal, pressed && styles.pressed]}>
        <View style={styles.rowMain}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.carName} numberOfLines={1}>
              {carLabel(car)}
            </Text>
            {copies > 1 && (
              <Text style={styles.dupeBadge} accessibilityLabel={`${copies} copies of this casting`}>
                ×{copies}
              </Text>
            )}
            {onPortal && <Text style={styles.onPortal}>● on portal</Text>}
          </View>
          <Text style={styles.carMeta} numberOfLines={1}>
            {car.serial ? `#${car.serial}` : car.uid}
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
      </Pressable>
    </Link>
  );
}

function EmptyGarage() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🏎️</Text>
      <Text style={styles.emptyTitle}>No cars yet</Text>
      <Text style={styles.emptyBody}>
        Place a Hot Wheels id car on the portal (or run a demo pass from Home) and it’ll be
        collected here automatically — every car you scan, forever.
      </Text>
      <Link href="/" asChild>
        <Pressable style={({ pressed }) => [styles.emptyButton, pressed && styles.pressed]}>
          <Text style={styles.emptyButtonText}>‹ Back to Home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  back: { paddingVertical: spacing(1), paddingRight: spacing(1) },
  backText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, flex: 1 },
  count: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    minWidth: 32,
    textAlign: 'center',
    paddingVertical: 2,
    paddingHorizontal: spacing(2),
    overflow: 'hidden',
  },
  list: { paddingHorizontal: spacing(5), gap: spacing(3) },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
  },
  rowOnPortal: { borderColor: colors.accent },
  rowMain: { flex: 1, gap: 4 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  carName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  dupeBadge: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing(1.5),
    paddingVertical: 1,
    overflow: 'hidden',
  },
  onPortal: { color: colors.accent, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  carMeta: { color: colors.textSecondary, fontSize: fontSize.sm },
  rowStats: { alignItems: 'flex-end', gap: 1 },
  bestMph: { color: colors.accent, fontSize: fontSize.lg, fontWeight: fontWeight.heavy },
  bestMphUnit: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  subStat: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  empty: { alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(6) },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  emptyBody: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', lineHeight: 19 },
  emptyButton: {
    marginTop: spacing(2),
    backgroundColor: colors.surface,
    borderColor: colors.accentBlue,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(5),
  },
  emptyButtonText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  pressed: { opacity: 0.7 },
});
