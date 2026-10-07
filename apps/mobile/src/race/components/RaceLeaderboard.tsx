import { Pressable, View } from 'react-native';
import { RText, SectionHeader, TimingRow } from '@/components/redline';
import { colorsR } from '@/theme/tokens';
import type { RaceResult } from '../raceEngine';
import type { RaceCarPresentation } from '../presentation';

export function RaceLeaderboard({ board, resolveCar, onClear }: {
  readonly board: readonly RaceResult[];
  readonly resolveCar: (uid: string | null, emptyLabel?: string) => RaceCarPresentation;
  readonly onClear: () => void;
}) {
  return <View style={{ width: '100%', maxWidth: 620, gap: 8 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><View style={{ flex: 1 }}><SectionHeader title="Race leaderboard" /></View>{board.length > 0 && <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear all saved race results" style={({ pressed }) => ({ minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, opacity: pressed ? 0.7 : 1 })}><RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Clear</RText></Pressable>}</View>
    {board.length === 0 ? <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Finish a race to set a time. Results are saved on this device.</RText> : board.slice(0, 8).map((result, index) => <TimingRow key={`${result.finishedAt}-${index}`} lap={index + 1} seconds={result.totalTime} ranking={{ name: result.player, detail: `${result.lapCount} laps · ${resolveCar(result.carUid, 'Unknown car').name}`, winner: index === 0 }} />)}
  </View>;
}
