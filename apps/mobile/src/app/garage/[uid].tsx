/**
 * Garage car detail — full stats for one car plus inline rename (ADR-0006).
 * Reads the car from {@link useGarageStore} by its `uid` route param; the rename
 * writes through the store's `rename` action (persisted by the bootstrap sink).
 */
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel } from '@/speed/format';
import { carLabel, formatLap, formatLastSeen, formatMph, shortUid } from '@/garage/format';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';
import { CarPhoto } from '@/catalog/CarPhoto';
import { useCarIdentity } from '@/catalog/useCarIdentity';

export default function CarDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const car = useGarageStore((s) => s.cars.find((c) => c.uid === uid));
  const rename = useGarageStore((s) => s.rename);
  const onPortal = usePortalStore((s) => s.car?.uid === uid);
  const identity = useCarIdentity(uid);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const speedDisplay = { unit: speedUnit, calibration: speedCalibration };

  const [draft, setDraft] = useState(car?.name ?? '');

  const saveName = () => {
    const trimmed = draft.trim();
    const next = trimmed.length > 0 ? trimmed : null;
    if (next === (car?.name ?? null)) return;
    rename(uid, next);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };

  const dirty = draft.trim() !== (car?.name ?? '');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing(2), paddingBottom: insets.bottom + spacing(8) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ Garage</Text>
        </Pressable>
        {onPortal && <Text style={styles.onPortal}>● on portal</Text>}
      </View>

      {!car ? (
        <View style={styles.missing}>
          <Text style={styles.missingTitle}>Car not in your garage</Text>
          <Text style={styles.missingBody}>
            {shortUid(uid)} hasn’t been collected, or the garage was cleared.
          </Text>
          <Link href="/garage" asChild>
            <Pressable style={({ pressed }) => [styles.missingButton, pressed && styles.pressed]}>
              <Text style={styles.missingButtonText}>‹ Back to Garage</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <>
          <Text style={styles.title} numberOfLines={1}>
            {identity?.name ?? carLabel(car)}
          </Text>
          <Text style={styles.subtitle}>
            {car.serial ? `Serial #${car.serial}` : 'No serial captured'} · {car.uid}
          </Text>

          <Link href={{ pathname: '/identify', params: { uid } }} asChild>
            <Pressable style={({ pressed }) => [styles.identityCard, pressed && styles.pressed]}>
              <CarPhoto uri={identity?.image} size={64} rounded={radius.sm} />
              <View style={styles.identityText}>
                <Text style={styles.identityName} numberOfLines={1}>
                  {identity?.name ?? 'Unidentified car'}
                </Text>
                <Text style={styles.identityMeta} numberOfLines={1}>
                  {identity
                    ? [identity.series, identity.year ? String(identity.year) : null]
                        .filter(Boolean)
                        .join(' · ') || 'Hot Wheels id'
                    : 'Tap to match this tag to a real casting'}
                </Text>
              </View>
              <Text style={styles.identityCta}>{identity ? 'Change' : 'Identify'}</Text>
            </Pressable>
          </Link>

          <View style={styles.hero}>
            <Text style={styles.heroValue}>{formatMph(car.bestMph, speedDisplay)}</Text>
            <Text style={styles.heroUnit}>best scale {speedUnitLabel(speedUnit)}</Text>
          </View>

          <View style={styles.statsGrid}>
            <Stat label="Best lap" value={formatLap(car.bestLap)} />
            <Stat label="Races" value={car.races.toString()} />
            <Stat label="Detections" value={car.detections.toString()} />
            <Stat label="Last seen" value={formatLastSeen(car.lastSeen)} />
          </View>

          <Text style={styles.sectionLabel}>Nickname</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={saveName}
            placeholder={shortUid(car.uid)}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={28}
            returnKeyType="done"
            onSubmitEditing={saveName}
            autoCorrect={false}
          />
          <Pressable
            onPress={saveName}
            disabled={!dirty}
            style={({ pressed }) => [
              styles.saveBtn,
              !dirty && styles.saveBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.saveBtnText}>{dirty ? 'Save name' : 'Saved'}</Text>
          </Pressable>

          <Text style={styles.note}>
            First seen {formatLastSeen(car.firstSeen)}. Best lap and race count come from finished
            races with this car; speed is its fastest pass over the portal.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing(5), gap: spacing(3) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { paddingVertical: spacing(1), paddingRight: spacing(2) },
  backText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  onPortal: { color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, marginTop: spacing(1) },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.sm },
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(3),
    marginTop: spacing(2),
  },
  identityText: { flex: 1, gap: 2 },
  identityName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  identityMeta: { color: colors.textSecondary, fontSize: fontSize.sm },
  identityCta: {
    color: colors.accent,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.heavy,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing(5),
    marginTop: spacing(2),
  },
  heroValue: { color: colors.accent, fontSize: fontSize.display, fontWeight: fontWeight.heavy },
  heroUnit: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) },
  stat: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    gap: 2,
  },
  statLabel: { color: colors.textMuted, fontSize: fontSize.xs, textTransform: 'uppercase', letterSpacing: 1 },
  statValue: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginTop: spacing(2),
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  saveBtnText: { color: colors.bg, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
  note: { color: colors.textMuted, fontSize: fontSize.xs, lineHeight: 18, marginTop: spacing(1) },
  missing: { alignItems: 'center', gap: spacing(2), paddingVertical: spacing(10) },
  missingTitle: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  missingBody: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
  missingButton: {
    marginTop: spacing(2),
    backgroundColor: colors.surface,
    borderColor: colors.accentBlue,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(5),
  },
  missingButtonText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  pressed: { opacity: 0.7 },
});
