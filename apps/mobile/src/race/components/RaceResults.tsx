import { Pressable, Share, Text, View } from "react-native";
import { Link } from "expo-router";
import * as Haptics from "expo-haptics";

import { raceShareText, formatLapTime } from "../../share/summary";
import { useGarageStore } from "../../store/garageStore";
import type { RaceResult } from "../raceEngine";
import type { RaceCarPresentation } from "../presentation";
import { raceHaptic } from "../useRaceSession";
import { RaceCar } from "./RaceCar";
import { LapList, LiveStat } from "./RaceProgress";
import { raceStyles as styles } from "./styles";

export function RaceResults({
  result,
  car,
  nextRacerName,
  primaryActionLabel,
  onPrimaryAction,
}: {
  readonly result: RaceResult;
  readonly car: RaceCarPresentation;
  readonly nextRacerName: string | null;
  readonly primaryActionLabel: string;
  readonly onPrimaryAction: () => void;
}) {
  const garageName = useGarageStore(
    (state) => state.cars.find((garageCar) => garageCar.uid === result.carUid)?.name ?? null,
  );

  const onShare = () => {
    raceHaptic(() => Haptics.selectionAsync());
    Share.share({ message: raceShareText(result, { carName: garageName ?? car.name }) }).catch(
      () => {},
    );
  };

  return (
    <View style={styles.section}>
      <View
        style={styles.resultHero}
        accessible
        accessibilityLabel={
          `${result.player} finished in ${formatLapTime(result.totalTime)}. ` +
          `Best lap ${formatLapTime(result.bestLap)}.` +
          (nextRacerName ? ` Up next, ${nextRacerName}.` : "")
        }
      >
        <Text style={styles.resultHeroLabel}>Finished</Text>
        <Text style={styles.resultHeroTime}>{formatLapTime(result.totalTime)}</Text>
        <Text style={styles.resultHeroSub}>
          {result.player} · {result.lapCount} laps
        </Text>
        {nextRacerName ? <Text style={styles.nextUpText}>Up next: {nextRacerName}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Race car</Text>
        <RaceCar car={car} context="Car used for this result" />
      </View>

      <View style={styles.liveRow}>
        <LiveStat label={`Best · lap ${result.bestLapNum}`} value={formatLapTime(result.bestLap)} hot />
        <LiveStat label="Average" value={formatLapTime(result.avgLap)} />
        <LiveStat label={`Worst · lap ${result.worstLapNum}`} value={formatLapTime(result.worstLap)} />
      </View>

      <LapList lapTimes={result.lapTimes} bestLap={result.bestLap} />

      <Pressable
        onPress={onShare}
        accessibilityRole="button"
        accessibilityLabel={`Share ${result.player}'s race result`}
        style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
      >
        <Text style={styles.shareBtnText}>Share result</Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onPrimaryAction}
          accessibilityRole="button"
          accessibilityLabel={primaryActionLabel}
          style={({ pressed }) => [styles.primaryBtn, styles.flex1, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>{primaryActionLabel}</Text>
        </Pressable>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Done racing, return to Speed"
            style={({ pressed }) => [styles.ghostBtn, styles.flex1, pressed && styles.pressed]}
          >
            <Text style={styles.ghostBtnText}>Done</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}
