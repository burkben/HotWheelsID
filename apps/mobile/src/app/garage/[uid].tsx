/**
 * Garage car detail — full stats for one car plus inline rename (ADR-0006).
 * Reads the car from {@link useGarageStore} by its `uid` route param; the rename
 * writes through the store's `rename` action (persisted by the bootstrap sink).
 * Redline layout: SPEC §4.8 / `png/CarDetail.png`.
 */
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';

import { LinkPressable } from '@/components/LinkPressable';
import { CarSilhouette, RaceButton, RacePlate, RakeLines, RText, SectionHeader, SkewBox } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { spokenUnit } from '@/components/redline/readoutPresentation';
import { useLayout } from '@/layout/useLayout';
import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { useSettingsStore } from '@/store/settingsStore';
import { speedUnitLabel } from '@/speed/format';
import { carLabel, formatLastSeen, formatMph, shortUid } from '@/garage/format';
import { plateNumber } from '@/garage/plateNumber';
import { bestArcFraction, garageRank, garageRankTag } from '@/garage/rank';
import { seriesColor, seriesFilters } from '@/garage/series';
import { useGarageIdentities } from '@/garage/useGarageIdentities';
import { colorsR, fontR, speedGauge } from '@/theme/tokens';
import { CarPhoto } from '@/catalog/CarPhoto';
import { carArtwork, carArtworkCredit } from '@/catalog/artwork';
import { useCarIdentity, useCastingCoverage } from '@/catalog/useCarIdentity';

const GUTTER = 16;
const HERO_HEIGHT = 218;

export default function CarDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useLayout();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const cars = useGarageStore((s) => s.cars);
  const car = cars.find((c) => c.uid === uid);
  const rename = useGarageStore((s) => s.rename);
  const onPortal = usePortalStore((s) => s.car?.uid === uid);
  const identity = useCarIdentity(uid);
  const identities = useGarageIdentities(cars);
  const photoCredit = carArtworkCredit(identity?.id);
  const coverage = useCastingCoverage(uid);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const speedDisplay = { unit: speedUnit, calibration: speedCalibration };
  const unit = speedUnitLabel(speedUnit).toUpperCase();

  // Same series colour as the Garage card: ordering comes from the whole garage.
  const swatch = useMemo(
    () => seriesColor(seriesFilters(cars, (c) => identities.get(c.uid)?.series), identity?.series),
    [cars, identities, identity?.series],
  );

  const [draft, setDraft] = useState(car?.name ?? '');
  const saveName = () => {
    const trimmed = draft.trim();
    const next = trimmed.length > 0 ? trimmed : null;
    if (next === (car?.name ?? null)) return;
    rename(uid, next);
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };
  const dirty = draft.trim() !== (car?.name ?? '');
  const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/garage'));

  const rank = car ? garageRank(cars, car.uid) : null;
  const rankTag = garageRankTag(rank);
  const best = car ? formatMph(car.bestMph, speedDisplay) : '—';
  const bestLap = car?.bestLap != null && car.bestLap > 0 ? car.bestLap.toFixed(3) : '—';
  const seen = onPortal ? 'Now' : car ? formatLastSeen(car.lastSeen) : '—';
  const catalogRows: [string, string][] = [];
  if (identity?.toyNumber) catalogRows.push(['Toy number', identity.toyNumber]);
  if (identity?.wave) catalogRows.push(['Wave', identity.wave.toUpperCase()]);
  if (identity?.year != null) catalogRows.push(['Year', String(identity.year)]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { maxWidth: layout.contentMaxWidth, paddingTop: insets.top + 4, paddingBottom: insets.bottom + 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back to Garage" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Svg {...decorative} width={20} height={20} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" stroke={colorsR.electric} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <RText style={styles.link}>Garage</RText>
        </Pressable>
        {onPortal && (
          <View style={styles.onPortal} accessible accessibilityLabel="On portal now">
            <View {...decorative} style={styles.onPortalDot} />
            <RText variant="chip" style={styles.onPortalText}>ON PORTAL</RText>
          </View>
        )}
      </View>

      {!car ? (
        <View style={styles.missing}>
          <RText variant="sectionTitle" accessibilityRole="header" style={styles.missingTitle}>Car not in your garage</RText>
          <RText style={styles.missingBody}>{shortUid(uid)} hasn’t been collected, or the garage was cleared.</RText>
          <RaceButton label="Back to Garage" variant="ghost" onPress={() => router.navigate('/garage')} />
        </View>
      ) : (
        <>
          <View {...decorative} style={styles.hero}>
            {identity && carArtwork(identity.id) ? (
              <CarPhoto carId={identity.id} width="100%" height={HERO_HEIGHT} rounded={0} />
            ) : (
              <>
                <RakeLines opacity={0.04} spacing={18} style={StyleSheet.absoluteFill} />
                <View style={styles.road} />
                <View style={styles.laneLine}>
                  <Svg width="100%" height={3}><Path d="M0 1.5 H2000" stroke={colorsR.chalk} strokeWidth={3} strokeDasharray="22 18" /></Svg>
                </View>
                <View style={[styles.streak, { left: -10, top: 110, width: 90, opacity: 0.45 }]} />
                <View style={[styles.streak, { left: 10, top: 124, width: 70, backgroundColor: colorsR.flame }]} />
                <View style={[styles.streak, { left: -20, top: 138, width: 100, opacity: 0.2 }]} />
                <View style={styles.heroCar}>
                  <CarSilhouette width={290} color={identity ? swatch ?? colorsR.flame : colorsR.inkDisabled} outline={!identity} />
                </View>
              </>
            )}
            <View style={styles.plate}><RacePlate number={plateNumber(cars, car.uid)} size="large" /></View>
            {identity?.toyNumber && (
              <SkewBox angle={-14} style={styles.toyRibbon}>
                <RText variant="chip" style={styles.toyText}>{identity.toyNumber}</RText>
              </SkewBox>
            )}
          </View>

          {photoCredit?.uploader ? (
            <Pressable onPress={() => void WebBrowser.openBrowserAsync(photoCredit.filePage)} accessibilityRole="link" hitSlop={6} style={({ pressed }) => [pressed && styles.pressed]}>
              <RText variant="bodySmall" style={styles.credit}>Photo by {photoCredit.uploader} · CC BY-SA ↗</RText>
            </Pressable>
          ) : null}

          <View style={styles.nameBlock}>
            <RText variant="screenTitle" accessibilityRole="header" style={styles.name}>
              {identity?.name ?? carLabel(car)}
            </RText>
            <View style={styles.seriesRow}>
              {identity && swatch && <View {...decorative} style={[styles.swatch, { backgroundColor: swatch }]} />}
              <RText variant="bodySmall" numberOfLines={2} style={styles.seriesText}>
                {identity
                  ? [identity.series, identity.wave].filter(Boolean).join(' · ') || 'Catalog car'
                  : `Unidentified · ${car.serial ? `Serial #${car.serial}` : 'no serial captured'}`}
              </RText>
              <Link href={{ pathname: '/identify', params: { uid } }} asChild>
                <LinkPressable accessibilityRole="link" accessibilityLabel={identity ? 'Change identity' : 'Identify this car'} contentStyle={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]}>
                  <RText style={[styles.link, styles.linkSmall]}>{identity ? 'Change' : 'Identify'}</RText>
                </LinkPressable>
              </Link>
            </View>
            {!identity && (
              <RText variant="bodySmall" style={styles.hint}>
                {coverage && coverage.otherCars > 0
                  ? `Identify once to label this car + ${coverage.otherCars} other ${coverage.otherCars === 1 ? 'copy' : 'copies'}.`
                  : 'Match this tag to a real casting from the catalog.'}
              </RText>
            )}
          </View>

          <View
            style={styles.bestPanel}
            accessible
            accessibilityLabel={best === '—' ? 'No best speed yet' : `Best ${best} scale ${spokenUnit(speedUnitLabel(speedUnit))}${rankTag ? `, number ${rank} in the garage` : ''}`}
          >
            <View {...decorative} style={styles.cautionBar} />
            <MiniArc fraction={bestArcFraction(car.bestMph, speedGauge.maxMph)} />
            <View style={styles.bestText}>
              <RText variant="heroNumber" style={styles.bestValue}>{best}</RText>
              <RText variant="eyebrow" style={styles.bestCaption}>BEST SCALE {unit}</RText>
            </View>
            {rankTag && (
              <SkewBox style={styles.rankTag}>
                <RText variant="buttonPrimary" style={styles.rankText}>{rankTag}</RText>
              </SkewBox>
            )}
          </View>

          <View style={styles.stats}>
            <Stat label="BEST LAP" value={bestLap} spoken={bestLap === '—' ? 'none' : `${bestLap} seconds`} color={colorsR.electric} />
            <Stat label="RACES" value={String(car.races)} />
            <Stat label="SCANS" value={String(car.detections)} />
            <Stat label="SEEN" value={seen} />
          </View>

          <View style={styles.section}>
            <RText variant="sectionTitle" nativeID="nickname-label" style={styles.label}>NICKNAME</RText>
            <View style={styles.fieldRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onBlur={saveName}
                placeholder="Give this car a name"
                placeholderTextColor={colorsR.inkMuted}
                accessibilityLabel="Nickname"
                aria-labelledby="nickname-label"
                accessibilityHint="Saves when you finish editing"
                style={styles.input}
                maxLength={28}
                returnKeyType="done"
                onSubmitEditing={saveName}
                autoCorrect={false}
              />
              {dirty && (
                <Pressable onPress={saveName} accessibilityRole="button" accessibilityLabel="Save nickname" style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
                  <RText style={styles.link}>Save</RText>
                </Pressable>
              )}
            </View>
          </View>

          {identity && (
            <View>
              <SectionHeader
                title="Catalog"
                right={identity.wikiPage ? (
                  <Pressable onPress={() => void WebBrowser.openBrowserAsync(identity.wikiPage!)} accessibilityRole="link" accessibilityLabel="Open catalog source" style={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]}>
                    <RText style={[styles.link, styles.linkSmall]}>Source ↗</RText>
                  </Pressable>
                ) : undefined}
              />
              {catalogRows.map(([label, value]) => (
                <View key={label} style={styles.catalogRow} accessible accessibilityLabel={`${label}: ${value}`}>
                  <RText variant="bodySmall" style={styles.catalogLabel}>{label}</RText>
                  <RText variant="lapTime" style={styles.catalogValue}>{value}</RText>
                </View>
              ))}
              {coverage && coverage.totalCars > 1 && (
                <RText variant="bodySmall" style={styles.hint}>This identification applies to {coverage.totalCars} cars in your garage.</RText>
              )}
            </View>
          )}

          <RText variant="bodySmall" style={styles.note}>
            First seen {formatLastSeen(car.firstSeen)}. Best lap and race count come from finished races with this car;
            speed is its fastest pass over the portal.
          </RText>
        </>
      )}
    </ScrollView>
  );
}

/** 240° arc from source CarDetail.dc.html (r 40, 251.3 circumference, 167.6 visible). */
function MiniArc({ fraction }: { fraction: number }) {
  return (
    <Svg {...decorative} width={74} height={56} viewBox="0 0 100 76">
      <Circle cx={50} cy={50} r={40} fill="none" stroke={colorsR.steel} strokeWidth={10} strokeDasharray="167.6 251.3" transform="rotate(150 50 50)" />
      {fraction > 0 && (
        <Circle cx={50} cy={50} r={40} fill="none" stroke={colorsR.caution} strokeWidth={10} strokeDasharray={`${(167.6 * fraction).toFixed(1)} 251.3`} transform="rotate(150 50 50)" />
      )}
    </Svg>
  );
}

function Stat({ label, value, spoken, color = colorsR.chalk }: { label: string; value: string; spoken?: string; color?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label.toLowerCase()}: ${spoken ?? value}`}>
      <RText variant="eyebrow" style={styles.statLabel}>{label}</RText>
      <RText variant="statValue" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[styles.statValue, { color }]}>{value}</RText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { paddingHorizontal: GUTTER, gap: 12, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginLeft: -4 },
  back: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { fontFamily: fontR.bodySemi, fontSize: 16, color: colorsR.electric },
  linkSmall: { fontSize: 14 },
  inlineLink: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end', marginLeft: 'auto' },
  onPortal: {
    flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, borderWidth: 1, paddingVertical: 5, paddingLeft: 9, paddingRight: 11,
    backgroundColor: colorsR.status.onPortal.fill, borderColor: colorsR.status.onPortal.border,
  },
  onPortalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colorsR.flame, boxShadow: `0 0 8px ${colorsR.flame}` },
  onPortalText: { fontSize: 11, lineHeight: 13, color: colorsR.flame },
  pressed: { opacity: 0.7 },
  hero: { height: HERO_HEIGHT, marginHorizontal: -GUTTER, backgroundColor: colorsR.pitWall, overflow: 'hidden' },
  road: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 56, backgroundColor: colorsR.trackGrey, borderTopWidth: 4, borderTopColor: colorsR.flame },
  laneLine: { position: 'absolute', left: 0, right: 0, bottom: 24, height: 3, opacity: 0.4 },
  streak: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: colorsR.chalk },
  heroCar: { position: 'absolute', left: 70, top: 84 },
  plate: { position: 'absolute', left: 16, top: 14 },
  toyRibbon: { position: 'absolute', right: -6, top: 18, backgroundColor: colorsR.gridBox, paddingVertical: 5, paddingLeft: 10, paddingRight: 16 },
  toyText: { fontSize: 12, lineHeight: 14, color: colorsR.inkSecondary },
  credit: { fontSize: 12, lineHeight: 16, color: colorsR.inkMuted, marginTop: -6 },
  nameBlock: { gap: 4 },
  name: { fontSize: 36, lineHeight: 34, letterSpacing: -0.3 },
  seriesRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginTop: -6, marginBottom: -6 },
  swatch: { width: 8, height: 8 },
  seriesText: { flexShrink: 1, color: colorsR.inkSecondary },
  hint: { color: colorsR.inkMuted, marginTop: 4 },
  bestPanel: { height: 76, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colorsR.pitLane, paddingHorizontal: 14 },
  cautionBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colorsR.caution },
  bestText: { flexShrink: 1 },
  bestValue: { fontSize: 40, lineHeight: 42, color: colorsR.caution },
  bestCaption: { fontFamily: fontR.hud, letterSpacing: 1.5, color: colorsR.inkMuted },
  rankTag: { marginLeft: 'auto', backgroundColor: colorsR.caution, paddingVertical: 3, paddingHorizontal: 9 },
  rankText: { fontSize: 13, lineHeight: 16, letterSpacing: 1, color: colorsR.asphalt },
  stats: { flexDirection: 'row', gap: 2 },
  stat: { flex: 1, minWidth: 0, backgroundColor: colorsR.pitLane, padding: 10, gap: 3 },
  statLabel: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 1.5, color: colorsR.inkMuted },
  // Relative times ("Now", "2m ago") stay sentence case, as in the source.
  statValue: { fontSize: 18, lineHeight: 22, textTransform: 'none' },
  section: { gap: 6, marginTop: 10 },
  label: { fontSize: 16, lineHeight: 19 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, height: 46, paddingHorizontal: 14, backgroundColor: colorsR.inset, borderWidth: 1, borderColor: colorsR.fieldBorder,
    color: colorsR.chalk, fontFamily: fontR.body, fontSize: 16,
  },
  save: { minHeight: 46, minWidth: 44, justifyContent: 'center', paddingHorizontal: 4 },
  catalogRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 36, borderBottomWidth: 1, borderBottomColor: colorsR.divider },
  catalogLabel: { color: colorsR.inkSecondary },
  catalogValue: { fontSize: 14, lineHeight: 18 },
  note: { color: colorsR.inkMuted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  missing: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  missingTitle: { fontSize: 22, lineHeight: 26 },
  missingBody: { color: colorsR.inkSecondary, textAlign: 'center' },
});
