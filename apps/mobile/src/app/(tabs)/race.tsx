/**
 * Race Mode composes the pure race engine/store with portal events and Race-owned
 * presentation. It never creates or controls the BLE transport: connect (or start
 * Demo) on Speed, then portal passes flow through the shared portal store.
 */
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";

import { findCatalogCar } from "@/catalog/catalog";
import { RaceCountdown } from "@/race/components/RaceCountdown";
import { RaceLeaderboard } from "@/race/components/RaceLeaderboard";
import {
  PortalRecovery,
  PortalStatusPill,
} from "@/race/components/PortalReadiness";
import { RaceProgress } from "@/race/components/RaceProgress";
import { RaceResults } from "@/race/components/RaceResults";
import { RaceSetup } from "@/race/components/RaceSetup";
import { raceStyles as styles } from "@/race/components/styles";
import { LAP_OPTIONS, type LapOption } from "@/race/raceEngine";
import {
  addRacer,
  advanceLineup,
  assignCar,
  carForCurrentRacer,
  chooseNextRacer,
  currentRacerName,
  nextUpRacer,
  removeRacer,
  type RaceNightLineup,
} from "@/race/raceNight";
import {
  canStartRace,
  presentRaceCar,
  resultPrimaryActionLabel,
  type RaceCarPresentation,
  type RaceMode,
} from "@/race/presentation";
import { useRaceSession } from "@/race/useRaceSession";
import { catalogIdForUid, useIdentityStore } from "@/store/identityStore";
import { usePortalStore } from "@/store/portalStore";
import { useRaceStore } from "@/store/raceStore";
import { useSettingsStore } from "@/store/settingsStore";
import { spacing } from "@/theme/tokens";

function initialLapOption(): LapOption {
  const configured = useSettingsStore.getState().defaultLaps;
  return LAP_OPTIONS.find((option) => option === configured) ?? LAP_OPTIONS[0];
}

export default function RaceScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion() || useSettingsStore((state) => state.reduceMotion);

  const race = useRaceStore((state) => state.race);
  const leaderboard = useRaceStore((state) => state.leaderboard);
  const configure = useRaceStore((state) => state.configure);
  const startCountdown = useRaceStore((state) => state.startCountdown);
  const startRacing = useRaceStore((state) => state.startRacing);
  const gate = useRaceStore((state) => state.gate);
  const stop = useRaceStore((state) => state.stop);
  const abort = useRaceStore((state) => state.abort);
  const clearLeaderboard = useRaceStore((state) => state.clearLeaderboard);

  const connection = usePortalStore((state) => state.connection);
  const liveCarUid = usePortalStore((state) => state.car?.uid ?? null);
  const passes = usePortalStore((state) => state.passes);

  const [mode, setMode] = useState<RaceMode>("solo");
  const [laps, setLaps] = useState<LapOption>(initialLapOption);
  const [soloPlayer, setSoloPlayer] = useState(
    () => useSettingsStore.getState().playerName,
  );
  const [racerDraft, setRacerDraft] = useState("");
  const [lineup, setLineup] = useState<RaceNightLineup>([]);

  const links = useIdentityStore((state) => state.links);
  const identifications = useIdentityStore((state) => state.identifications);
  const seed = useIdentityStore((state) => state.seed);
  const resolveCar = useCallback(
    (uid: string | null, emptyLabel?: string): RaceCarPresentation => {
      const catalogId = catalogIdForUid({ links, identifications, seed }, uid);
      return presentRaceCar(uid, findCatalogCar(catalogId), emptyLabel);
    },
    [identifications, links, seed],
  );

  const nextRacer =
    mode === "raceNight" && lineup.length > 1 ? nextUpRacer(lineup) : null;
  const session = useRaceSession({
    race,
    passes,
    reduceMotion,
    nextRacerName: nextRacer?.name ?? null,
    gate,
    startRacing,
  });

  const canStart = canStartRace(mode, connection, lineup.length);

  const onAddRacer = () => {
    setLineup((current) => addRacer(current, racerDraft, liveCarUid));
    setRacerDraft("");
  };

  const onStart = () => {
    const player =
      mode === "solo"
        ? currentRacerName([], soloPlayer)
        : currentRacerName(lineup, "");
    const carUid =
      mode === "solo" ? liveCarUid : carForCurrentRacer(lineup, liveCarUid);
    configure({ targetLaps: laps, player, carUid });
    startCountdown();
  };

  const onAdvanceLineup = () => {
    setLineup((current) => advanceLineup(current));
    abort();
  };

  const resultCar = race.result
    ? resolveCar(race.result.carUid, "Unknown car")
    : null;
  const activeCar = resolveCar(race.carUid, "Car on portal at start");
  const primaryActionLabel = resultPrimaryActionLabel(
    mode,
    lineup.length,
    nextRacer?.name ?? null,
  );
  const shouldAdvance = mode === "raceNight" && lineup.length > 1;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing(3),
          paddingBottom: insets.bottom + spacing(8),
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Race Mode
        </Text>
        <PortalStatusPill connection={connection} />
      </View>

      <PortalRecovery connection={connection} />

      {session.webAnnouncement != null ? (
        <Text
          style={styles.screenReaderOnly}
          accessibilityLiveRegion="assertive"
        >
          {session.webAnnouncement}
        </Text>
      ) : null}

      {race.phase === "idle" ? (
        <RaceSetup
          mode={mode}
          laps={laps}
          soloPlayer={soloPlayer}
          racerDraft={racerDraft}
          lineup={lineup}
          liveCarUid={liveCarUid}
          resolveCar={resolveCar}
          canStart={canStart}
          onModeChange={setMode}
          onLapsChange={setLaps}
          onSoloPlayerChange={setSoloPlayer}
          onRacerDraftChange={setRacerDraft}
          onAddRacer={onAddRacer}
          onStart={onStart}
          onChooseNext={(racerId) =>
            setLineup((current) => chooseNextRacer(current, racerId))
          }
          onRemove={(racerId) =>
            setLineup((current) => removeRacer(current, racerId))
          }
          onAssignCar={(racerId) =>
            setLineup((current) => assignCar(current, racerId, liveCarUid))
          }
        />
      ) : null}

      {race.phase === "countdown" ? (
        <RaceCountdown
          count={session.count}
          pulse={session.pulse}
          reduceMotion={reduceMotion}
          player={race.player}
          car={activeCar}
          onCancel={abort}
        />
      ) : null}

      {race.phase === "racing" ? (
        <RaceProgress
          race={race}
          car={activeCar}
          liveLap={session.liveLap}
          canTriggerDemo={session.canTriggerDemo}
          onTriggerDemo={session.triggerDemoPass}
          onFinish={() => stop()}
        />
      ) : null}

      {race.phase === "finished" && race.result && resultCar ? (
        <RaceResults
          result={race.result}
          car={resultCar}
          nextRacerName={nextRacer?.name ?? null}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={shouldAdvance ? onAdvanceLineup : abort}
        />
      ) : null}

      {race.phase === "idle" || race.phase === "finished" ? (
        <RaceLeaderboard
          board={leaderboard}
          resolveCar={resolveCar}
          onClear={clearLeaderboard}
        />
      ) : null}
    </ScrollView>
  );
}
