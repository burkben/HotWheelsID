import { Pressable, Text, View } from "react-native";

import { formatLapTime } from "../../share/summary";
import type { RaceResult } from "../raceEngine";
import type { RaceCarPresentation } from "../presentation";
import { raceStyles as styles } from "./styles";

export function RaceLeaderboard({
  board,
  resolveCar,
  onClear,
}: {
  readonly board: readonly RaceResult[];
  readonly resolveCar: (uid: string | null, emptyLabel?: string) => RaceCarPresentation;
  readonly onClear: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeadRow}>
        <Text style={styles.cardHeading}>Race leaderboard</Text>
        {board.length > 0 ? (
          <Pressable
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel="Clear all saved race results"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {board.length === 0 ? (
        <Text style={styles.empty}>
          Finish a race to set a time. Results are saved on this device.
        </Text>
      ) : (
        board.slice(0, 8).map((result, index) => {
          const car = resolveCar(result.carUid, "Unknown car");
          return (
            <View
              key={`${result.finishedAt}-${index}`}
              style={styles.leaderboardRow}
              accessible
              accessibilityLabel={
                `Rank ${index + 1}. ${result.player}, ${formatLapTime(result.totalTime)}, ` +
                `${result.lapCount} laps, ${car.name}`
              }
            >
              <Text
                style={[
                  styles.leaderboardRank,
                  index === 0 && styles.leaderboardRankTop,
                ]}
              >
                {index + 1}
              </Text>
              <View style={styles.leaderboardMid}>
                <Text style={styles.leaderboardPlayer} numberOfLines={1}>
                  {result.player}
                </Text>
                <Text style={styles.leaderboardMeta} numberOfLines={1}>
                  {result.lapCount} laps · {car.name}
                </Text>
              </View>
              <Text
                style={[
                  styles.leaderboardTime,
                  index === 0 && styles.leaderboardTimeTop,
                ]}
              >
                {formatLapTime(result.totalTime)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}
