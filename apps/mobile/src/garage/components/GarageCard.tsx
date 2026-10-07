/**
 * Garage trading card (SPEC §4.7). Presentational: the screen derives every value,
 * so the dev gallery can render the same card from a local fixture.
 */
import { StyleSheet, View } from 'react-native';
import { Link, type Href } from 'expo-router';

import { CarPhoto } from '@/catalog/CarPhoto';
import { LinkPressable } from '@/components/LinkPressable';
import { CarSilhouette, RakeLines, Roundel, RText, SkewBox } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { spokenUnit } from '@/components/redline/readoutPresentation';
import { colorsR, fontR } from '@/theme/tokens';

export interface GarageCardModel {
  readonly uid: string;
  readonly plate: string;
  /** Catalog name, nickname, or null for an unidentified car without a nickname. */
  readonly name: string | null;
  readonly identified: boolean;
  readonly series: string | null;
  readonly seriesColor: string | null;
  /** Catalog id with bundled artwork, or null to draw the silhouette. */
  readonly photoId: string | null;
  readonly best: string;
  readonly unit: string;
  readonly races: number;
  readonly onPortal: boolean;
  /** Holds the garage's top best speed. */
  readonly record: boolean;
}

export const GARAGE_CARD_HEIGHT = 216;
export const BAY_HEIGHT = 118;

/** Phones keep the source's 118 pt bay; wider iPad tiles grow it so photos are not cropped thin. */
export function bayHeightFor(cardWidth: number): number {
  return Math.max(BAY_HEIGHT, Math.round(cardWidth * 0.62));
}

export function garageCardLabel(card: GarageCardModel): string {
  const races = `${card.races} ${card.races === 1 ? 'race' : 'races'}`;
  const best = card.best === '—' ? 'no best speed yet' : `best ${card.best} scale ${spokenUnit(card.unit)}`;
  if (!card.identified) {
    return [card.name ?? 'Mystery car', 'unidentified', best, races, card.onPortal ? 'on portal' : null].filter(Boolean).join(', ');
  }
  return [card.name, `plate ${card.plate}`, card.series, best, card.record ? 'garage record' : null, races, card.onPortal ? 'on portal' : null]
    .filter(Boolean)
    .join(', ');
}

export function GarageCard({ card, bayHeight = BAY_HEIGHT }: { card: GarageCardModel; bayHeight?: number }) {
  const href: Href = card.identified
    ? { pathname: '/garage/[uid]', params: { uid: card.uid } }
    : { pathname: '/identify', params: { uid: card.uid } };
  return (
    <View style={[styles.slot, card.onPortal && styles.onPortalGlow]}>
      <Link href={href} asChild>
        <LinkPressable
          accessibilityRole="button"
          accessibilityLabel={garageCardLabel(card)}
          accessibilityHint={card.identified ? 'Opens car details' : 'Opens identify'}
          contentStyle={({ pressed }) => [styles.card, { minHeight: GARAGE_CARD_HEIGHT - BAY_HEIGHT + bayHeight }, pressed && styles.pressed]}
        >
          <PhotoBay card={card} height={bayHeight} />
          <View style={styles.info}>
            <RText variant="carName" numberOfLines={2} style={[styles.name, !card.identified && { color: colorsR.inkSecondary }]}>
              {card.identified ? card.name : card.name ?? 'Mystery car'}
            </RText>
            {card.identified ? (
              card.series ? (
                <View style={styles.seriesLine}>
                  {card.seriesColor && <View {...decorative} style={[styles.seriesSwatch, { backgroundColor: card.seriesColor }]} />}
                  <RText variant="bodySmall" numberOfLines={1} style={styles.series}>{card.series}</RText>
                </View>
              ) : null
            ) : (
              <RText variant="bodySmall" style={[styles.series, styles.identify]}>Tap to identify</RText>
            )}
            <View style={styles.statLine}>
              <RText variant="statValue" style={[styles.best, card.record && { color: colorsR.caution }]}>{card.best}</RText>
              <RText variant="eyebrow" numberOfLines={1} style={styles.statCaption}>
                {card.unit} BEST · {card.races} {card.races === 1 ? 'RACE' : 'RACES'}
              </RText>
            </View>
          </View>
        </LinkPressable>
      </Link>
      {card.onPortal && <View {...decorative} style={styles.ring} />}
    </View>
  );
}

function PhotoBay({ card, height }: { card: GarageCardModel; height: number }) {
  const photo = card.identified ? card.photoId : null;
  return (
    <View {...decorative} style={[styles.bay, { height }]}>
      {photo ? (
        <CarPhoto carId={photo} width="100%" height={height} rounded={0} />
      ) : (
        <>
          {card.identified && <RakeLines opacity={0.04} spacing={16} style={StyleSheet.absoluteFill} />}
          <View style={styles.road} />
          {card.onPortal && (
            <>
              <View style={[styles.streak, { left: 6, bottom: 49, width: 40, backgroundColor: colorsR.chalk, opacity: 0.4 }]} />
              <View style={[styles.streak, { left: 14, bottom: 39, width: 30, backgroundColor: colorsR.flame }]} />
            </>
          )}
          <View style={[styles.car, card.onPortal && styles.carOnPortal]}>
            <CarSilhouette width={128} color={card.identified ? card.seriesColor ?? colorsR.chalk : colorsR.inkDisabled} outline={!card.identified} />
          </View>
        </>
      )}
      {card.identified ? (
        <View style={styles.roundel}><Roundel number={card.plate} /></View>
      ) : (
        <View style={styles.mysteryRoundel}>
          <RText variant="wordmark" style={styles.mysteryMark}>?</RText>
        </View>
      )}
      {card.onPortal && (
        <SkewBox angle={-14} style={styles.ribbon}>
          <RText variant="chip" style={styles.ribbonText}>ON PORTAL</RText>
        </SkewBox>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // A grid tile claims an equal share of its row; minWidth lets long names wrap.
  slot: { flex: 1, minWidth: 0 },
  onPortalGlow: { boxShadow: '0 0 22px rgba(255,106,19,0.35)' },
  card: { minHeight: GARAGE_CARD_HEIGHT, flex: 1, backgroundColor: colorsR.pitLane, overflow: 'hidden' },
  // Drawn above the card so the photo and ribbon never cover the 2 pt ring.
  ring: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderWidth: 2, borderColor: colorsR.flame },
  pressed: { opacity: 0.85 },
  bay: { backgroundColor: colorsR.pitWall, overflow: 'hidden' },
  road: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, backgroundColor: colorsR.trackGrey },
  streak: { position: 'absolute', height: 3 },
  // Anchored to the road, so a taller iPad bay keeps the source geometry.
  car: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center' },
  // Source offset: the on-portal car sits 10 pt right to clear the speed streaks.
  carOnPortal: { left: 20 },
  roundel: { position: 'absolute', left: 10, top: 10 },
  mysteryRoundel: {
    // The plate slot, so it never collides with the ON PORTAL ribbon.
    position: 'absolute', left: 10, top: 10, width: 34, height: 34, borderRadius: 17,
    borderWidth: 2, borderStyle: 'dashed', borderColor: colorsR.inkMuted, alignItems: 'center', justifyContent: 'center',
  },
  mysteryMark: { fontSize: 22, lineHeight: 24, letterSpacing: 0, color: colorsR.inkSecondary },
  ribbon: { position: 'absolute', right: -6, top: 12, backgroundColor: colorsR.flame, paddingTop: 3, paddingBottom: 3, paddingLeft: 8, paddingRight: 12 },
  ribbonText: { fontSize: 10, lineHeight: 12, letterSpacing: 1, color: colorsR.asphalt },
  info: { flex: 1, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, gap: 4 },
  name: { fontSize: 18, lineHeight: 19, letterSpacing: 0 },
  seriesLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seriesSwatch: { width: 7, height: 7 },
  series: { flexShrink: 1, fontSize: 12, lineHeight: 16, color: colorsR.inkSecondary },
  identify: { fontFamily: fontR.bodySemi, color: colorsR.electric },
  statLine: { marginTop: 'auto', flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  best: { fontSize: 20, lineHeight: 24, color: colorsR.chalk },
  statCaption: { flexShrink: 1, fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 0, color: colorsR.inkMuted },
});
