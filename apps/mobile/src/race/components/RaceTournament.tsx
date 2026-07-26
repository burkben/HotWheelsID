/**
 * Tournament-mode presentation: the opt-in toggle, the live bracket, and the
 * champion banner. All bracket state lives in the pure engine (`race/tournament`)
 * — these components only render it.
 */
import { Pressable, Text, View } from "react-native";

import type { Tournament, TournamentMatch } from "../tournament";
import { raceStyles as styles } from "./styles";

export function TournamentToggle({
  on,
  enabled,
  onToggle,
}: {
  readonly on: boolean;
  readonly enabled: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeadRow}>
        <Text style={styles.cardHeading}>Tournament</Text>
        <Pressable
          onPress={onToggle}
          disabled={!enabled}
          accessibilityRole="switch"
          accessibilityState={{ checked: on, disabled: !enabled }}
          accessibilityLabel="Run the lineup as a single-elimination bracket"
          style={[styles.tourPill, on && styles.tourPillOn, !enabled && styles.btnDisabled]}
        >
          <Text style={[styles.tourPillText, on && styles.tourPillTextOn]}>{on ? "On" : "Off"}</Text>
        </Pressable>
      </View>
      <Text style={styles.empty}>
        {enabled
          ? "Run the lineup as a single-elimination bracket — each pairing races, fastest time advances, last car standing wins."
          : "Add at least two racers to the lineup to run a bracket."}
      </Text>
    </View>
  );
}

export function ChampionBanner({
  name,
  onReset,
}: {
  readonly name: string;
  readonly onReset: () => void;
}) {
  return (
    <View style={[styles.card, styles.champCard]} accessible accessibilityLabel={`Tournament champion, ${name}`}>
      <Text style={styles.champLabel}>Tournament champion</Text>
      <Text style={styles.champName} numberOfLines={1}>
        🏆 {name}
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Start a new tournament"
        style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
      >
        <Text style={styles.ghostBtnText}>New tournament</Text>
      </Pressable>
    </View>
  );
}

export function BracketCard({
  tournament,
  nameFor,
  activeMatch,
}: {
  readonly tournament: Tournament;
  readonly nameFor: (id: string | null) => string;
  readonly activeMatch: TournamentMatch | null;
}) {
  const rounds = Array.from({ length: tournament.rounds }, (_, index) => index + 1);
  const roundLabel = (round: number): string => {
    const fromEnd = tournament.rounds - round;
    if (fromEnd === 0) return "Final";
    if (fromEnd === 1) return "Semifinals";
    if (fromEnd === 2) return "Quarterfinals";
    return `Round ${round}`;
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Bracket</Text>
      {rounds.map((round) => (
        <View key={round} style={styles.bracketRound}>
          <Text style={styles.bracketRoundLabel}>{roundLabel(round)}</Text>
          {tournament.matches
            .filter((match) => match.round === round)
            .map((match) => {
              const isActive = activeMatch?.id === match.id;
              const decided = !!match.winner;
              return (
                <View
                  key={match.id}
                  style={[styles.bracketMatch, isActive && styles.bracketMatchActive]}
                  accessible
                  accessibilityLabel={
                    `${roundLabel(round)}: ${nameFor(match.a)} versus ${nameFor(match.b)}.` +
                    (decided ? ` ${nameFor(match.winner)} advances.` : isActive ? " Racing now." : "")
                  }
                >
                  <BracketSlot name={nameFor(match.a)} won={decided && match.winner === match.a} />
                  <Text style={styles.bracketVs}>vs</Text>
                  <BracketSlot name={nameFor(match.b)} won={decided && match.winner === match.b} />
                  {isActive ? <Text style={styles.bracketNow}>▶</Text> : null}
                </View>
              );
            })}
        </View>
      ))}
    </View>
  );
}

function BracketSlot({ name, won }: { readonly name: string; readonly won: boolean }) {
  return (
    <Text style={[styles.bracketName, won && styles.bracketNameWon]} numberOfLines={1}>
      {won ? "✓ " : ""}
      {name}
    </Text>
  );
}
