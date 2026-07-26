/**
 * Race Mode composes the pure race engine/store with portal events and Race-owned
 * presentation. It never creates or controls the BLE transport: connect (or start
 * Demo) on Speed, then portal passes flow through the shared portal store.
 */
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";

import { findCatalogCar } from "@/catalog/catalog";
import { useLayout } from "@/layout/useLayout";
import { RaceCountdown } from "@/race/components/RaceCountdown";
import { RaceLeaderboard } from "@/race/components/RaceLeaderboard";
import {
  PortalRecovery,
  PortalStatusPill,
} from "@/race/components/PortalReadiness";
import { LapList, RaceProgress } from "@/race/components/RaceProgress";
import { RaceResults } from "@/race/components/RaceResults";
import { RaceSetup } from "@/race/components/RaceSetup";
import {
  BracketCard,
  ChampionBanner,
  TournamentToggle,
} from "@/race/components/RaceTournament";
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
  type RaceNightRacer,
} from "@/race/raceNight";
import {
  canStartRace,
  presentRaceCar,
  resultPrimaryActionLabel,
  type RaceCarPresentation,
  type RaceMode,
} from "@/race/presentation";
import {
  createTournament,
  currentMatch,
  reportTimes,
  type Tournament,
  type TournamentMatch,
} from "@/race/tournament";
import { useRaceSession } from "@/race/useRaceSession";
import { catalogIdForUid, useIdentityStore } from "@/store/identityStore";
import { usePortalStore } from "@/store/portalStore";
import { useRaceStore } from "@/store/raceStore";
import { useSettingsStore } from "@/store/settingsStore";
import { TvBadge } from "@/tv/TvBadge";
import { spacing } from "@/theme/tokens";

/** Heat times accumulated per match until both racers are in and it can be decided. */
type MatchTimes = Record<string, { a?: number; b?: number }>;

/** Racer id that still owes a heat in `match` (A before B), or null if both are in. */
function runnerId(match: TournamentMatch, times: MatchTimes): string | null {
  const heat = times[match.id] ?? {};
  if (match.a && heat.a == null) return match.a;
  if (match.b && heat.b == null) return match.b;
  return null;
}

function initialLapOption(): LapOption {
  const configured = useSettingsStore.getState().defaultLaps;
  return LAP_OPTIONS.find((option) => option === configured) ?? LAP_OPTIONS[0];
}

export default function RaceScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const systemReduceMotion = useReducedMotion();
  const settingReduceMotion = useSettingsStore((state) => state.reduceMotion);
  const reduceMotion = systemReduceMotion || settingReduceMotion;

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

  // Tournament mode (Phase 5): opt-in single-elimination bracket over the lineup.
  // `null` = casual rotating-queue mode (unchanged).
  const [tournamentOn, setTournamentOn] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matchTimes, setMatchTimes] = useState<MatchTimes>({});

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

  // --- Tournament mode -------------------------------------------------------
  const nameForRacer = useCallback(
    (racerId: string | null): string =>
      racerId ? (lineup.find((racer) => racer.id === racerId)?.name ?? "—") : "Bye",
    [lineup],
  );

  const beginHeatFor = (racer: RaceNightRacer) => {
    configure({
      targetLaps: laps,
      player: racer.name,
      carUid: racer.carUid ?? liveCarUid,
    });
    startCountdown();
  };

  /** The racer who still owes a heat in the current match, with that match. */
  const runnerFor = (
    bracket: Tournament,
    times: MatchTimes,
  ): { racer: RaceNightRacer; match: TournamentMatch } | null => {
    const match = currentMatch(bracket);
    if (!match) return null;
    const id = runnerId(match, times);
    const racer = id ? (lineup.find((entry) => entry.id === id) ?? null) : null;
    return racer ? { racer, match } : null;
  };

  const onStartTournament = () => {
    const bracket = createTournament(lineup.map((racer) => racer.id));
    setTournament(bracket);
    setMatchTimes({});
    const next = runnerFor(bracket, {});
    if (next) beginHeatFor(next.racer);
  };

  const onResetTournament = () => {
    setTournament(null);
    setMatchTimes({});
    abort();
  };

  /** Record the just-finished heat's time, decide/advance the bracket, run next. */
  const onTournamentContinue = () => {
    if (!tournament || !race.result) return;
    const active = currentMatch(tournament);
    if (!active) return;

    const runner = runnerFor(tournament, matchTimes);
    if (!runner) return;
    const times = { ...(matchTimes[active.id] ?? {}) };
    if (runner.racer.id === active.a) times.a = race.result.totalTime;
    else if (runner.racer.id === active.b) times.b = race.result.totalTime;
    const nextTimes = { ...matchTimes, [active.id]: times };

    let bracket = tournament;
    if (times.a != null && times.b != null) {
      bracket = reportTimes(tournament, active.id, times.a, times.b);
    }
    setTournament(bracket);
    setMatchTimes(nextTimes);

    const next = runnerFor(bracket, nextTimes);
    if (next) beginHeatFor(next.racer);
    else abort(); // champion decided — fall back to setup, which shows the banner
  };

  const onResumeTournament = () => {
    if (!tournament) return;
    const next = runnerFor(tournament, matchTimes);
    if (next) beginHeatFor(next.racer);
  };

  const activeMatch = tournament ? currentMatch(tournament) : null;
  const tournamentReady = mode === "raceNight" && lineup.length >= 2;
  const tournamentArmed = tournamentOn && tournamentReady;
  const inTournament = !!tournament && !tournament.championId;

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


  const tournamentSlot = tournament?.championId ? (
    <ChampionBanner
      name={nameForRacer(tournament.championId)}
      onReset={onResetTournament}
    />
  ) : (
    <TournamentToggle
      on={tournamentArmed}
      enabled={tournamentReady}
      onToggle={() => setTournamentOn((on) => !on)}
    />
  );

  // Every region is built once and placed by the layout below. Sharing the same
  // element instances across the phone and split branches keeps the live lap
  // clock and the countdown animation from remounting on rotation.
  const header = (
    <View style={[styles.header, layout.isSplit && styles.headerWide]}>
      <Text accessibilityRole="header" style={styles.title}>
        Race Mode
      </Text>
      <View style={styles.headerRight}>
        <TvBadge />
        <PortalStatusPill connection={connection} />
      </View>
    </View>
  );

  const announcement =
    session.webAnnouncement != null ? (
      <Text style={styles.screenReaderOnly} accessibilityLiveRegion="assertive">
        {session.webAnnouncement}
      </Text>
    ) : null;

  const bracket =
    tournament && (race.phase === "idle" || race.phase === "finished") ? (
      <BracketCard
        tournament={tournament}
        nameFor={nameForRacer}
        activeMatch={activeMatch}
      />
    ) : null;

  const tournamentControls =
    race.phase === "idle" && inTournament ? (
      <View style={styles.actionRow}>
        <Pressable
          onPress={onResetTournament}
          accessibilityRole="button"
          accessibilityLabel="End tournament"
          style={({ pressed }) => [
            styles.ghostBtn,
            styles.flex1,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.ghostBtnText}>End tournament</Text>
        </Pressable>
        <Pressable
          onPress={onResumeTournament}
          accessibilityRole="button"
          accessibilityLabel="Race the next heat"
          style={({ pressed }) => [
            styles.primaryBtn,
            styles.flex1,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {activeMatch
              ? `Race ${nameForRacer(runnerId(activeMatch, matchTimes))}`
              : "Resume"}
          </Text>
        </Pressable>
      </View>
    ) : null;

  const setup =
    race.phase === "idle" && !inTournament ? (
      <RaceSetup
        mode={mode}
        laps={laps}
        soloPlayer={soloPlayer}
        racerDraft={racerDraft}
        lineup={lineup}
        liveCarUid={liveCarUid}
        resolveCar={resolveCar}
        canStart={canStart}
        startLabel={tournamentArmed ? "Start tournament" : undefined}
        tournamentSlot={tournamentSlot}
        onModeChange={setMode}
        onLapsChange={setLaps}
        onSoloPlayerChange={setSoloPlayer}
        onRacerDraftChange={setRacerDraft}
        onAddRacer={onAddRacer}
        onStart={tournamentArmed ? onStartTournament : onStart}
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
    ) : null;

  const countdown =
    race.phase === "countdown" ? (
      <RaceCountdown
        count={session.count}
        pulse={session.pulse}
        reduceMotion={reduceMotion}
        player={race.player}
        car={activeCar}
        large={layout.isSplit}
        onCancel={abort}
      />
    ) : null;

  const progress =
    race.phase === "racing" ? (
      <RaceProgress
        race={race}
        car={activeCar}
        liveLap={session.liveLap}
        canTriggerDemo={session.canTriggerDemo}
        large={layout.isSplit}
        showLaps={!layout.isSplit}
        onTriggerDemo={session.triggerDemoPass}
        onFinish={() => stop()}
      />
    ) : null;

  const results =
    race.phase === "finished" && race.result && resultCar ? (
      <RaceResults
        result={race.result}
        car={resultCar}
        nextRacerName={tournament ? null : (nextRacer?.name ?? null)}
        primaryActionLabel={tournament ? "Continue" : primaryActionLabel}
        showLaps={!layout.isSplit}
        onPrimaryAction={
          tournament
            ? onTournamentContinue
            : shouldAdvance
              ? onAdvanceLineup
              : abort
        }
      />
    ) : null;

  // In the split layout the lap lists move to the right pane, so a race never
  // hides its own lap times behind a scroll.
  const paneLaps = !layout.isSplit ? null : race.phase === "racing" ? (
    <LapList
      lapTimes={race.lapTimes}
      bestLap={race.lapTimes.length > 0 ? Math.min(...race.lapTimes) : null}
    />
  ) : race.phase === "finished" && race.result ? (
    <LapList lapTimes={race.result.lapTimes} bestLap={race.result.bestLap} />
  ) : null;

  const leaderboardBlock =
    race.phase === "idle" || race.phase === "finished" ? (
      <RaceLeaderboard
        board={leaderboard}
        resolveCar={resolveCar}
        onClear={clearLeaderboard}
      />
    ) : null;

  // Two panes on a big landscape screen: whatever you're doing *now* on the
  // left, the record of what happened on the right.
  if (layout.isSplit) {
    return (
      <View
        style={[
          styles.screen,
          styles.splitRoot,
          {
            paddingTop: insets.top + spacing(3),
            paddingBottom: insets.bottom + spacing(3),
          },
        ]}
      >
        {header}
        {announcement}
        <View style={styles.splitBody}>
          <ScrollView
            style={styles.splitLeft}
            contentContainerStyle={styles.splitPane}
            keyboardShouldPersistTaps="handled"
          >
            <PortalRecovery connection={connection} />
            {setup}
            {tournamentControls}
            {countdown}
            {progress}
            {results}
          </ScrollView>

          <ScrollView
            style={styles.splitRight}
            contentContainerStyle={styles.splitPane}
          >
            {bracket}
            {paneLaps}
            {leaderboardBlock}
          </ScrollView>
        </View>
      </View>
    );
  }

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
      {header}
      <PortalRecovery connection={connection} />
      {announcement}
      {race.phase === "idle" ? bracket : null}
      {tournamentControls}
      {setup}
      {countdown}
      {progress}
      {results}
      {race.phase === "finished" ? bracket : null}
      {leaderboardBlock}
    </ScrollView>
  );
}
