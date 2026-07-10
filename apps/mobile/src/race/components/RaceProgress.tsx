import { Pressable, Text, View } from "react-native";

import { formatLapTime } from "../../share/summary";
import type { RaceState } from "../raceEngine";
import type { RaceCarPresentation } from "../presentation";
import { RaceCar } from "./RaceCar";
import { raceStyles as styles } from "./styles";

export function LiveStat({
  label,
  value,
  hot = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly hot?: boolean;
}) {
  return (
    <View style={styles.liveStat} accessible accessibilityLabel={`${label}, ${value}`}>
      <Text style={styles.liveStatLabel}>{label}</Text>
      <Text style={[styles.liveStatValue, hot && styles.liveStatValueHot]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function LapList({
  lapTimes,
  bestLap,
}: {
  readonly lapTimes: readonly number[];
  readonly bestLap: number | null;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Laps</Text>
      {lapTimes.length === 0 ? (
        <Text style={styles.empty}>No laps yet. The first crossing arms the timer.</Text>
      ) : (
        lapTimes.map((lapTime, index) => {
          const isBest = bestLap != null && lapTime === bestLap;
          return (
            <View
              key={index}
              style={styles.lapRow}
              accessible
              accessibilityLabel={`Lap ${index + 1}, ${formatLapTime(lapTime)}${isBest ? ", best time" : ""}`}
            >
              <Text style={styles.lapNum}>Lap {index + 1}</Text>
              <View style={styles.lapRight}>
                <Text style={[styles.lapTime, isBest && styles.lapTimeBest]}>
                  {formatLapTime(lapTime)}
                </Text>
                {isBest ? <Text style={styles.bestTag}>BEST</Text> : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

export function RaceProgress({
  race,
  car,
  liveLap,
  canTriggerDemo,
  onTriggerDemo,
  onFinish,
}: {
  readonly race: RaceState;
  readonly car: RaceCarPresentation;
  readonly liveLap: number;
  readonly canTriggerDemo: boolean;
  readonly onTriggerDemo: () => void;
  readonly onFinish: () => void;
}) {
  const lapsDone = race.lapTimes.length;
  const bestSoFar = lapsDone > 0 ? Math.min(...race.lapTimes) : null;
  const displayedLap = Math.min(
    lapsDone + (race.lastGateAt == null ? 0 : 1),
    race.targetLaps,
  );

  return (
    <View style={styles.section}>
      <View style={[styles.card, styles.cardRaised]}>
        <Text style={styles.racerEyebrow}>Current racer</Text>
        <Text style={styles.racerHeading}>{race.player}</Text>
        <RaceCar car={car} size={48} context="Car in this race" />
      </View>

      <View
        style={styles.lapHero}
        accessible
        accessibilityLabel={
          race.lastGateAt == null
            ? `${race.player}, cross the line to start`
            : `Lap ${displayedLap} of ${race.targetLaps}`
        }
      >
        <Text style={styles.lapHeroNum}>
          {displayedLap}
          <Text style={styles.lapHeroOf}> / {race.targetLaps}</Text>
        </Text>
        <Text style={styles.lapHeroLabel}>
          {race.lastGateAt == null ? "Cross the line to start" : "Lap"}
        </Text>
      </View>

      <View style={styles.liveRow}>
        <LiveStat
          label="This lap"
          value={race.lastGateAt == null ? "—" : formatLapTime(liveLap)}
          hot
        />
        <LiveStat
          label="Last lap"
          value={lapsDone > 0 ? formatLapTime(race.lapTimes[lapsDone - 1]) : "—"}
        />
        <LiveStat label="Best" value={bestSoFar != null ? formatLapTime(bestSoFar) : "—"} />
      </View>

      <LapList lapTimes={race.lapTimes} bestLap={bestSoFar} />

      <View style={styles.actionRow}>
        {canTriggerDemo ? (
          <Pressable
            onPress={onTriggerDemo}
            accessibilityRole="button"
            accessibilityLabel="Trigger demo portal pass"
            style={({ pressed }) => [styles.ghostBtn, styles.flex1, pressed && styles.pressed]}
          >
            <Text style={styles.ghostBtnText}>Trigger pass</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onFinish}
          accessibilityRole="button"
          accessibilityLabel="Finish race now"
          accessibilityHint="Saves a result if at least one lap is complete"
          style={({ pressed }) => [styles.dangerBtn, styles.flex1, pressed && styles.pressed]}
        >
          <Text style={styles.dangerBtnText}>Finish</Text>
        </Pressable>
      </View>
    </View>
  );
}
