import { useContext, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FilterChip, RaceButton, RText, SectionHeader } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { resolveRTextStyle } from '@/components/redline/textStyle';
import { RedlineFontContext } from '@/theme/RedlineFontContext';
import { colorsR } from '@/theme/tokens';
import { LAP_OPTIONS, type LapOption } from '../raceEngine';
import type { RaceNightLineup } from '../raceNight';
import type { RaceCarPresentation, RaceMode } from '../presentation';
import { RaceCar } from './RaceCar';
import { RaceNightLineup as Lineup } from './RaceNightLineup';

type ResolveCar = (
  uid: string | null,
  emptyLabel?: string,
) => RaceCarPresentation;

interface RaceSetupProps {
  readonly mode: RaceMode;
  readonly laps: LapOption;
  readonly soloPlayer: string;
  readonly racerDraft: string;
  readonly lineup: RaceNightLineup;
  readonly liveCarUid: string | null;
  readonly resolveCar: ResolveCar;
  readonly canStart: boolean;
  readonly hideStartAction?: boolean;
  /** Overrides the race-night start button label (tournament mode uses this). */
  readonly startLabel?: string;
  /** Tournament toggle or champion banner, rendered under the lineup. */
  readonly tournamentSlot?: ReactNode;
  readonly onModeChange: (mode: RaceMode) => void;
  readonly onLapsChange: (laps: LapOption) => void;
  readonly onSoloPlayerChange: (name: string) => void;
  readonly onRacerDraftChange: (name: string) => void;
  readonly onAddRacer: () => void;
  readonly onStart: () => void;
  readonly onChooseNext: (racerId: string) => void;
  readonly onRemove: (racerId: string) => void;
  readonly onAssignCar: (racerId: string) => void;
}

export function RaceSetup({
  mode,
  laps,
  soloPlayer,
  racerDraft,
  lineup,
  liveCarUid,
  resolveCar,
  canStart,
  hideStartAction = false,
  startLabel,
  tournamentSlot,
  onModeChange,
  onLapsChange,
  onSoloPlayerChange,
  onRacerDraftChange,
  onAddRacer,
  onStart,
  onChooseNext,
  onRemove,
  onAssignCar,
}: RaceSetupProps) {
  const fontsLoaded = useContext(RedlineFontContext);
  const canAddRacer = racerDraft.trim().length > 0;
  const liveCar = resolveCar(liveCarUid, 'No car on portal');
  const inputStyle = [styles.input, resolveRTextStyle('body', undefined, fontsLoaded)];
  return <View style={styles.section}>
    <SectionHeader title="How are you racing?" />
    <View style={styles.modes}>
      {([{ value: 'solo', label: 'Solo', a11y: 'Solo race', detail: 'Name, laps, start. No lineup required.', hint: 'A quick race for one player' }, { value: 'raceNight', label: 'Race night', a11y: 'Race night', detail: 'Set the order, cars, and next racer.', hint: 'Build a multi-racer lineup with assigned cars' }] as const).map(option => <Pressable key={option.value} onPress={() => onModeChange(option.value)} accessibilityRole="button" accessibilityLabel={option.a11y} accessibilityHint={option.hint} aria-pressed={mode === option.value} accessibilityState={{ selected: mode === option.value }} style={({ pressed }) => [styles.mode, { opacity: pressed ? 0.8 : 1 }]}>
        {mode === option.value && <View {...decorative} style={styles.accent} />}
        <RText variant="carName" style={{ color: mode === option.value ? colorsR.flame : colorsR.chalk }}>{option.label}</RText>
        <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>{option.detail}</RText>
      </Pressable>)}
    </View>
    <SectionHeader title="Race length" />
    <View style={styles.chips}>{LAP_OPTIONS.map(option => <FilterChip key={option} label={`${option} laps`} selected={laps === option} onPress={() => onLapsChange(option)} />)}</View>
    <SectionHeader title={mode === 'solo' ? 'Player' : 'Add racer'} />
    {mode === 'solo' ? <>
      <TextInput value={soloPlayer} onChangeText={onSoloPlayerChange} placeholder="Player 1" placeholderTextColor={colorsR.inkMuted} style={inputStyle} maxLength={24} returnKeyType="done" autoCorrect={false} accessibilityLabel="Solo player name" />
      <View style={styles.panel}><RText variant="sectionTitle">Car for this race</RText><RaceCar car={liveCar} context={liveCarUid ? 'Currently on the portal' : 'Place a car on the portal'} /></View>
      {!hideStartAction && <RaceButton label="START RACE" accessibilityLabel="Start solo race" accessibilityHint={canStart ? 'Begins the race countdown' : 'Connect the portal before starting'} disabled={!canStart} onPress={onStart} fullWidth chevron />}
    </> : <>
      <TextInput value={racerDraft} onChangeText={onRacerDraftChange} onSubmitEditing={canAddRacer ? onAddRacer : undefined} placeholder="Racer name" placeholderTextColor={colorsR.inkMuted} style={inputStyle} maxLength={24} returnKeyType="done" autoCorrect={false} accessibilityLabel="Racer name" accessibilityHint="The car currently on the portal will be assigned when added" />
      <View style={styles.panel}><RaceCar car={liveCar} size={48} context={liveCarUid ? 'Will be assigned when added' : 'No car will be assigned'} /><RaceButton label="Add racer" variant="ghost" fullWidth onPress={onAddRacer} disabled={!canAddRacer} accessibilityLabel={canAddRacer ? `Add ${racerDraft.trim()} to lineup` : 'Add racer to lineup'} /></View>
      <Lineup lineup={lineup} liveCarUid={liveCarUid} resolveCar={resolveCar} canStart={canStart} onStart={onStart} startLabel={startLabel} hideStartAction={hideStartAction} onChooseNext={onChooseNext} onRemove={onRemove} onAssignCar={onAssignCar} />
      {tournamentSlot}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  section: { width: '100%', maxWidth: 620, gap: 16 },
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, minHeight: 100, padding: 14, gap: 8, backgroundColor: colorsR.pitLane },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: colorsR.flame },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  input: { minHeight: 52, backgroundColor: colorsR.inset, borderWidth: 1, borderColor: colorsR.fieldBorder, paddingHorizontal: 14, paddingVertical: 12, fontVariant: ['tabular-nums'] },
  panel: { backgroundColor: colorsR.pitLane, padding: 14, gap: 14 },
});
