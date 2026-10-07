import { Pressable, StyleSheet, View } from 'react-native';
import { RaceButton, RText } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { colorsR } from '@/theme/tokens';
import { carForCurrentRacer, type RaceNightLineup as Lineup } from '../raceNight';
import type { RaceCarPresentation } from '../presentation';
import { RaceCar } from './RaceCar';

type ResolveCar = (
  uid: string | null,
  emptyLabel?: string,
) => RaceCarPresentation;

interface RaceNightLineupProps {
  readonly lineup: Lineup;
  readonly liveCarUid: string | null;
  readonly resolveCar: ResolveCar;
  readonly canStart: boolean;
  readonly hideStartAction?: boolean;
  readonly onStart: () => void;
  /** Overrides the default `Start {racer}` label (tournament mode uses this). */
  readonly startLabel?: string;
  readonly onChooseNext: (racerId: string) => void;
  readonly onRemove: (racerId: string) => void;
  readonly onAssignCar: (racerId: string) => void;
}

export function RaceNightLineup({ lineup, liveCarUid, resolveCar, canStart, onStart, startLabel, hideStartAction = false, onChooseNext, onRemove, onAssignCar }: RaceNightLineupProps) {
  if (!lineup.length) return <View style={styles.card}><RText variant="sectionTitle">Race-night lineup</RText><RText variant="bodySmall" style={styles.muted}>Add the first racer above. Their current portal car will be saved with their turn.</RText></View>;
  const liveCar = resolveCar(liveCarUid, 'No car on portal');
  return <View style={{ gap: 14 }}>
    {lineup.map((racer, index) => <View key={racer.id} style={styles.card}>
      {index < 2 && <View {...decorative} style={[styles.accent, { backgroundColor: index === 0 ? colorsR.flame : colorsR.electric }]} />}
      <RText variant="eyebrow" style={{ color: index === 0 ? colorsR.flame : colorsR.inkSecondary }}>{index === 0 ? 'Current racer' : index === 1 ? 'Up next' : `Position ${index + 1}`}</RText>
      <RText variant="carName">{racer.name}</RText>
      <RaceCar car={resolveCar(index === 0 ? carForCurrentRacer(lineup, liveCarUid) : racer.carUid, 'Car on portal at start')} size={48} context={racer.carUid ? 'Assigned to this racer' : 'Uses the portal car at start'} />
      <View style={styles.actions}>
        {index > 1 && <Pressable onPress={() => onChooseNext(racer.id)} accessibilityRole="button" accessibilityLabel={`Make ${racer.name} the next racer`} style={({ pressed }) => [styles.small, pressed && styles.pressed]}><RText variant="bodySmall" style={styles.link}>Make next</RText></Pressable>}
        {liveCarUid != null && liveCarUid !== racer.carUid && <Pressable onPress={() => onAssignCar(racer.id)} accessibilityRole="button" accessibilityLabel={`Assign ${liveCar.name} to ${racer.name}`} style={({ pressed }) => [styles.small, pressed && styles.pressed]}><RText variant="bodySmall" style={styles.link}>Assign portal car</RText></Pressable>}
        <Pressable onPress={() => onRemove(racer.id)} accessibilityRole="button" accessibilityLabel={`Remove ${racer.name} from lineup`} style={({ pressed }) => [styles.small, pressed && styles.pressed]}><RText variant="bodySmall" style={{ color: colorsR.destructiveInk }}>Remove</RText></Pressable>
      </View>
      {index === 0 && !hideStartAction && <RaceButton label={startLabel ?? 'START RACE'} accessibilityLabel={startLabel ?? `Start race for ${racer.name}`} accessibilityHint={canStart ? 'Begins the race countdown' : 'Connect the portal before starting'} disabled={!canStart} onPress={onStart} fullWidth chevron />}
    </View>)}
    {lineup.length === 1 && <View style={styles.card}><RText variant="sectionTitle">Up next</RText><RText variant="bodySmall" style={styles.muted}>No one else is queued. Add another racer for a rotation.</RText></View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colorsR.pitLane, padding: 14, gap: 12 },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  small: { minHeight: 44, minWidth: 44, backgroundColor: colorsR.inset, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  muted: { color: colorsR.inkSecondary },
  link: { color: colorsR.electric },
});
