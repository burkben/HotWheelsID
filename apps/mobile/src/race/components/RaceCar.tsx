import { View } from 'react-native';
import { CarPhoto } from '@/catalog/CarPhoto';
import { carArtwork } from '@/catalog/artwork';
import { CarSilhouette, RacePlate, RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { plateNumber } from '@/garage/plateNumber';
import { useGarageStore } from '@/store/garageStore';
import { colorsR } from '@/theme/tokens';
import type { RaceCarPresentation } from '../presentation';

export function RaceCar({ car, size = 56, context }: { readonly car: RaceCarPresentation; readonly size?: number; readonly context?: string }) {
  const cars = useGarageStore(s => s.cars);
  const meta = context ?? (car.identified ? 'Identified car' : car.uid ? 'Unidentified car' : 'Flexible assignment');
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessible accessibilityLabel={`${car.name}. ${meta}`}>
    <RacePlate number={car.uid ? plateNumber(cars, car.uid) : '?'} size="small" />
    <View style={{ flex: 1, gap: 4 }}><RText variant="carName" style={{ fontSize: 21 }} numberOfLines={2}>{car.name}</RText><RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>{meta}</RText></View>
    <View {...decorative}>{carArtwork(car.catalogId) ? <CarPhoto carId={car.catalogId} size={size} rounded={0} /> : <CarSilhouette width={size} />}</View>
  </View>;
}
