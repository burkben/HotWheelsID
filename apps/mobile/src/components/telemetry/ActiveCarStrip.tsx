/** Race-plate card, using the existing hero identity and a derived garage number. */
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';

import { carArtwork } from '@/catalog/artwork';
import { CarPhoto } from '@/catalog/CarPhoto';
import { useCarIdentity } from '@/catalog/useCarIdentity';
import { plateNumber } from '@/garage/plateNumber';
import type { CarHeroModel } from '@/portal/selectors';
import { formatBestSpeed, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { useGarageStore } from '@/store/garageStore';
import { colorsR } from '@/theme/tokens';
import { LinkPressable } from '../LinkPressable';
import { CarSilhouette, Kerb, RacePlate, RText } from '../redline';
import { decorative } from '../redline/decorative';
import { spokenUnit } from '../redline/readoutPresentation';

export function ActiveCarStrip({ model, display }: { model: CarHeroModel | null; display: SpeedDisplay }) {
  const cars = useGarageStore(s => s.cars);
  const catalog = useCarIdentity(model?.uid);
  const plate = model ? plateNumber(cars, model.uid) : '?';
  const metadata = [catalog?.series, catalog?.year].filter(Boolean).join(' · ');
  const content = <>
    <View {...decorative} style={styles.kerb}><Kerb /></View>
    <RacePlate number={plate} />
    <View style={styles.copy}>
      <RText variant="chip" style={{ fontSize: 11, color: model?.isCurrent ? colorsR.flame : colorsR.inkMuted }}>{model ? model.isCurrent ? '● ON PORTAL' : 'LAST SCANNED' : 'READY FOR A CAR'}</RText>
      <RText variant="carName" numberOfLines={1}>{model?.title ?? 'No car scanned yet'}</RText>
      <RText variant="bodySmall" style={styles.meta}>{metadata || (model ? 'Unidentified car' : 'Place a car on the portal')}</RText>
    </View>
    <View {...decorative} style={styles.photo}>{carArtwork(model?.catalogId) ? <CarPhoto carId={model?.catalogId} width={86} height={58} rounded={0} contentFit="contain" /> : <CarSilhouette width={86} outline={!model} />}</View>
  </>;
  if (!model) return <View accessible accessibilityLabel="No car scanned yet. Place a car on the portal." style={styles.card}>{content}</View>;
  const context = model.lastMph != null && model.lastMph >= 1 ? `Last ${formatBestSpeed(model.lastMph, display)} ${spokenUnit(speedUnitLabel(display.unit))}.` : '';
  return <Link href={{ pathname: '/garage/[uid]', params: { uid: model.uid } }} asChild>
    <LinkPressable testID="active-car-card" accessibilityRole="button" accessibilityLabel={`${model.isCurrent ? 'Car on portal' : 'Last scanned car'}: ${model.title}. Race number ${plate}. ${metadata ? `${metadata}. ` : ''}${context}`} accessibilityHint="Open car details" contentStyle={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>{content}</LinkPressable>
  </Link>;
}
const styles = StyleSheet.create({
  card: { width: '100%', minHeight: 96, backgroundColor: colorsR.pitLane, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 14, paddingRight: 16, paddingVertical: 16, overflow: 'hidden' },
  kerb: { position: 'absolute', left: 0, right: 0, top: 0 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  meta: { color: colorsR.inkSecondary, fontSize: 13 },
  photo: { width: 86, alignItems: 'center', justifyContent: 'center' },
});
