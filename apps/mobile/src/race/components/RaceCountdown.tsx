import { Animated, Pressable, Text, View } from "react-native";

import type { RaceCarPresentation } from "../presentation";
import { RaceCar } from "./RaceCar";
import { raceStyles as styles } from "./styles";

export function RaceCountdown({
  count,
  pulse,
  reduceMotion,
  player,
  car,
  onCancel,
}: {
  readonly count: number;
  readonly pulse: Animated.Value;
  readonly reduceMotion: boolean;
  readonly player: string;
  readonly car: RaceCarPresentation;
  readonly onCancel: () => void;
}) {
  return (
    <View style={styles.countdown}>
      <View
        accessible
        accessibilityLabel={`Countdown ${count}. ${player} racing ${car.name}`}
      >
        <Text style={styles.racerEyebrow}>Get ready</Text>
        <Text style={styles.racerHeading}>{player}</Text>
      </View>
      <RaceCar car={car} size={48} context="Car for this race" />
      <Animated.Text
        style={[styles.countNum, { transform: [{ scale: reduceMotion ? 1 : pulse }] }]}
        accessible={false}
      >
        {count}
      </Animated.Text>
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancel race countdown"
        style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
      >
        <Text style={styles.ghostBtnText}>Cancel</Text>
      </Pressable>
    </View>
  );
}
