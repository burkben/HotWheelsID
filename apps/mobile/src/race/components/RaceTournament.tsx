/** Presentation only; the bracket engine and heat transitions stay unchanged. */
import { StyleSheet, View } from 'react-native';
import { RaceButton, RText, SectionHeader, SkewSwitch, TimingRow } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { colorsR } from '@/theme/tokens';
import { rankHeats } from '../resultsPresentation';
import type { Tournament, TournamentMatch } from '../tournament';

export function TournamentToggle({ on, enabled, onToggle }: { readonly on: boolean; readonly enabled: boolean; readonly onToggle: () => void }) {
  return <View style={styles.panel}><View style={styles.row}><RText variant="sectionTitle">Tournament</RText><SkewSwitch value={on} disabled={!enabled} onValueChange={onToggle} accessibilityLabel="Run the lineup as a single-elimination bracket" /></View><RText variant="bodySmall" style={styles.muted}>{enabled ? 'Run the lineup as a single-elimination bracket — each pairing races, fastest time advances, last car standing wins.' : 'Add at least two racers to the lineup to run a bracket.'}</RText></View>;
}

export function ChampionBanner({ name, onReset }: { readonly name: string; readonly onReset: () => void }) {
  return <View style={[styles.panel, { borderWidth: 1, borderColor: colorsR.caution }]}>
    <View {...decorative} style={{ height: 3, backgroundColor: colorsR.caution, position: 'absolute', top: 0, left: 0, right: 0 }} />
    <View accessible accessibilityLabel={`Tournament champion, ${name}`}><RText variant="eyebrow" style={{ color: colorsR.caution }}>Tournament champion</RText><RText variant="carName" style={{ fontSize: 32, lineHeight: 38, color: colorsR.caution }}>{name}</RText></View>
    <RaceButton label="New tournament" variant="ghost" fullWidth onPress={onReset} accessibilityLabel="Start a new tournament" />
  </View>;
}

export function BracketCard({ tournament, nameFor, activeMatch, matchTimes = {} }: {
  readonly tournament: Tournament;
  readonly nameFor: (id: string | null) => string;
  readonly activeMatch: TournamentMatch | null;
  readonly matchTimes?: Readonly<Record<string, { a?: number; b?: number }>>;
}) {
  const rounds = Array.from({ length: tournament.rounds }, (_, i) => i + 1);
  const roundLabel = (round: number) => ['Final', 'Semifinals', 'Quarterfinals'][tournament.rounds - round] ?? `Round ${round}`;
  return <View style={{ width: '100%', gap: 14 }}><SectionHeader title="Bracket" />
    {rounds.map(round => <View key={round} style={{ gap: 8 }}><RText variant="eyebrow" style={styles.muted}>{roundLabel(round)}</RText>
      {tournament.matches.filter(match => match.round === round).map(match => <View key={match.id} style={[styles.match, activeMatch?.id === match.id && { borderColor: colorsR.electric }]}>
        <RText variant="bodySmall" style={styles.muted}>{nameFor(match.a)} vs {nameFor(match.b)}{activeMatch?.id === match.id ? ' · Racing now' : ''}</RText>
        {rankHeats([{ id: match.a, seconds: matchTimes[match.id]?.a }, { id: match.b, seconds: matchTimes[match.id]?.b }]).map((heat, index) => <TimingRow key={heat.id ?? `bye-${index}`} lap={index + 1} seconds={heat.seconds} ranking={{ name: nameFor(heat.id), winner: !!match.winner && match.winner === heat.id, detail: heat.id == null ? 'No heat required' : heat.seconds == null ? 'Awaiting heat' : 'Heat total' }} />)}
      </View>)}
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  panel: { padding: 14, backgroundColor: colorsR.pitLane, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  muted: { color: colorsR.inkSecondary },
  match: { padding: 8, borderWidth: 1, borderColor: colorsR.hairline, backgroundColor: colorsR.inset, gap: 6 },
});
