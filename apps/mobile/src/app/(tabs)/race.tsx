/**
 * Race Mode — a lap-timing game on top of the live portal.
 *
 * The timing rules live in the pure {@link raceEngine} (a faithful port of
 * `python/race_mode.py`); this screen is the UI + wiring around the
 * {@link useRaceStore}. It is a *consumer* of the portal store: every car pass
 * the application-level transport records (real BLE or the mock) lands in
 * `portalStore.passes`, and we fold each new pass into the race as a gate
 * crossing. The first crossing after the countdown is the start line; each later
 * one closes a lap; the race auto-finishes at the chosen length.
 *
 * Single-connection invariant: Race never opens its own BLE transport. The root
 * controller starts before any tab mounts and keeps streaming across navigation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';

import { LAP_OPTIONS, currentLapElapsed, type RaceResult } from '@/race/raceEngine';
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
} from '@/race/raceNight';
import { useRaceStore } from '@/store/raceStore';
import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { catalogIdForUid, useIdentityStore } from '@/store/identityStore';
import { findCatalogCar } from '@/catalog/catalog';
import { useSettingsStore } from '@/store/settingsStore';
import { raceShareText } from '@/share/summary';
import {
  usePortalController,
  usePortalControllerActions,
} from '@/portal/PortalControllerProvider';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';

/** Milliseconds each countdown digit is shown before the race arms. */
const COUNTDOWN_STEP_MS = 800;

function haptic(fn: () => Promise<unknown>) {
  if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) fn().catch(() => {});
}

/** "12.34s", or "1:02.34" once a lap crosses a minute. */
function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m}:${(seconds - m * 60).toFixed(2).padStart(5, '0')}`;
  }
  return `${seconds.toFixed(2)}s`;
}

function shortUid(uid?: string | null): string {
  if (!uid) return 'Any car';
  const parts = uid.split(':');
  return parts.length > 2 ? parts.slice(-2).join(':') : uid;
}

export default function RaceScreen() {
  const insets = useSafeAreaInsets();
  // Force-reduce via the Settings toggle even when the OS setting is off.
  const reduceMotion = useReducedMotion() || useSettingsStore((s) => s.reduceMotion);

  const race = useRaceStore((s) => s.race);
  const leaderboard = useRaceStore((s) => s.leaderboard);
  const configure = useRaceStore((s) => s.configure);
  const startCountdown = useRaceStore((s) => s.startCountdown);
  const startRacing = useRaceStore((s) => s.startRacing);
  const gate = useRaceStore((s) => s.gate);
  const stop = useRaceStore((s) => s.stop);
  const abort = useRaceStore((s) => s.abort);
  const clearLeaderboard = useRaceStore((s) => s.clearLeaderboard);

  const connection = usePortalStore((s) => s.connection);
  const car = usePortalStore((s) => s.car);
  const passes = usePortalStore((s) => s.passes);
  const portalMode = usePortalController((s) => s.mode);
  const portalController = usePortalControllerActions();

  const phase = race.phase;

  // --- Setup form state (seeded from Settings defaults) ---
  const [laps, setLaps] = useState<number>(() => useSettingsStore.getState().defaultLaps);
  const [player, setPlayer] = useState<string>(() => useSettingsStore.getState().playerName);
  const [lineup, setLineup] = useState<RaceNightLineup>([]);

  // --- Gate wiring: fold each *new* portal pass into the race -----------------
  // Track the newest pass id we've already consumed. Reset it when the race arms
  // so passes fired before "Go" (e.g. demo auto-passes during setup) don't count.
  const lastSeenPassId = useRef(0);
  useEffect(() => {
    if (phase === 'racing') {
      const latest = usePortalStore.getState().passes[0];
      lastSeenPassId.current = latest ? latest.id : 0;
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'racing') return;
    // `passes` is newest-first; collect everything newer than last seen.
    const fresh = [] as typeof passes;
    for (const p of passes) {
      if (p.id <= lastSeenPassId.current) break;
      fresh.push(p);
    }
    if (fresh.length === 0) return;
    lastSeenPassId.current = passes[0].id;
    // Replay oldest-first so laps record in the order the cars crossed.
    for (let i = fresh.length - 1; i >= 0; i--) gate(fresh[i].at);
  }, [passes, phase, gate]);

  // --- Countdown 3·2·1 → arm the race ----------------------------------------
  const [count, setCount] = useState(3);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (phase !== 'countdown') return;
    let n = 3;
    setCount(n);
    haptic(() => Haptics.selectionAsync());
    const id = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(id);
        haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
        startRacing();
      } else {
        setCount(n);
        haptic(() => Haptics.selectionAsync());
      }
    }, COUNTDOWN_STEP_MS);
    return () => clearInterval(id);
  }, [phase, startRacing]);

  // Pulse the countdown digit (skipped under reduce-motion).
  useEffect(() => {
    if (phase !== 'countdown' || reduceMotion) return;
    pulse.setValue(1.35);
    Animated.timing(pulse, {
      toValue: 1,
      duration: COUNTDOWN_STEP_MS - 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [count, phase, reduceMotion, pulse]);

  // --- Live lap clock: tick while racing -------------------------------------
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (phase !== 'racing') return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [phase]);

  // --- Haptics on lap + finish ------------------------------------------------
  const prevLaps = useRef(0);
  useEffect(() => {
    const n = race.lapTimes.length;
    if (phase === 'racing' && n > prevLaps.current) {
      haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
    }
    prevLaps.current = n;
  }, [race.lapTimes.length, phase]);

  useEffect(() => {
    if (phase === 'finished') {
      haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    }
  }, [phase]);

  // --- Actions ----------------------------------------------------------------
  const canAddRacer = player.trim().length > 0;
  const currentRacer = currentRacerName(lineup, player);
  const nextRacer = nextUpRacer(lineup);
  const liveCarUid = car?.uid ?? null;

  // Resolve a tag uid to a friendly label: the identified catalog name, else a
  // short uid, else a hint that the heat will use whatever is on the portal.
  const links = useIdentityStore((s) => s.links);
  const identifications = useIdentityStore((s) => s.identifications);
  const seed = useIdentityStore((s) => s.seed);
  const carLabel = useCallback(
    (uid: string | null): string => {
      if (!uid) return 'Car on portal';
      const catalogCar = findCatalogCar(catalogIdForUid({ links, identifications, seed }, uid));
      return catalogCar?.name ?? shortUid(uid);
    },
    [links, identifications, seed],
  );

  const onAddRacer = () => {
    setLineup((current) => addRacer(current, player, liveCarUid));
    setPlayer('');
  };

  const onChooseNextRacer = (racerId: string) => {
    setLineup((current) => chooseNextRacer(current, racerId));
  };

  const onRemoveRacer = (racerId: string) => {
    setLineup((current) => removeRacer(current, racerId));
  };

  const onAssignCar = (racerId: string) => {
    setLineup((current) => assignCar(current, racerId, liveCarUid));
  };

  const onAdvanceLineup = () => {
    setLineup((current) => advanceLineup(current));
    abort();
  };

  const onStart = () => {
    configure({
      targetLaps: laps,
      player: currentRacer,
      carUid: carForCurrentRacer(lineup, liveCarUid),
    });
    startCountdown();
  };

  const triggerDemoPass = () => portalController.triggerDemoPass();
  const canTriggerDemo = portalMode === 'demo' && connection === 'connected';

  const liveLap = currentLapElapsed(race, now);
  const lapsDone = race.lapTimes.length;
  const bestSoFar = lapsDone > 0 ? Math.min(...race.lapTimes) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing(3), paddingBottom: insets.bottom + spacing(8) },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>Race Mode</Text>
        <ConnDot connection={connection} />
      </View>

      {phase === 'idle' && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Race length</Text>
          <View style={styles.chips}>
            {LAP_OPTIONS.map((opt) => {
              const active = laps === opt;
              return (
                <Pressable
                  key={opt}
                  onPress={() => setLaps(opt)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
                  <Text style={[styles.chipUnit, active && styles.chipTextActive]}>laps</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>{lineup.length > 0 ? 'Add racer' : 'Player'}</Text>
          <TextInput
            value={player}
            onChangeText={setPlayer}
            placeholder={lineup.length > 0 ? 'Add another racer' : 'Player 1'}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
            autoCorrect={false}
          />

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>Car: {shortUid(car?.uid)}</Text>
            <Text style={styles.metaText}>
              {connection === 'connected'
                ? 'Portal ready'
                : connection === 'connecting'
                  ? 'Connecting…'
                  : 'Portal not connected'}
            </Text>
          </View>

          <LineupCard
            lineup={lineup}
            draftName={player}
            liveCarUid={liveCarUid}
            carLabel={carLabel}
            onChooseNext={onChooseNextRacer}
            onRemove={onRemoveRacer}
            onAssignCar={onAssignCar}
          />

          {connection !== 'connected' && (
            <Text style={styles.hint}>
              The portal connects automatically across tabs. If it needs attention, use the status
              pill on the{' '}
              <Link href="/" style={styles.hintLink}>
                Speed tab
              </Link>
              .
            </Text>
          )}

          <View style={styles.actionRow}>
            <Pressable
              onPress={onAddRacer}
              disabled={!canAddRacer}
              style={({ pressed }) => [
                styles.ghostBtn,
                styles.flex1,
                !canAddRacer && styles.btnDisabled,
                pressed && canAddRacer && styles.pressed,
              ]}
            >
              <Text style={[styles.ghostBtnText, !canAddRacer && styles.btnDisabledText]}>Add to lineup</Text>
            </Pressable>

            <Pressable
              onPress={onStart}
              style={({ pressed }) => [styles.primaryBtn, styles.flex1, pressed && styles.pressed]}
            >
              <Text style={styles.primaryBtnText}>Start race</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'countdown' && (
        <View style={styles.countdown}>
          <Animated.Text style={[styles.countNum, { transform: [{ scale: reduceMotion ? 1 : pulse }] }]}>
            {count}
          </Animated.Text>
          <Text style={styles.countLabel}>Get ready…</Text>
          <Pressable onPress={abort} style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {phase === 'racing' && (
        <View style={styles.section}>
          <View style={styles.lapHero}>
            <Text style={styles.lapHeroNum}>
              {Math.min(lapsDone + (race.lastGateAt == null ? 0 : 1), race.targetLaps)}
              <Text style={styles.lapHeroOf}> / {race.targetLaps}</Text>
            </Text>
            <Text style={styles.lapHeroLabel}>
              {race.lastGateAt == null ? 'Cross the line to start' : 'Lap'}
            </Text>
          </View>

          <View style={styles.liveRow}>
            <LiveStat label="This lap" value={race.lastGateAt == null ? '—' : fmtTime(liveLap)} live />
            <LiveStat label="Last lap" value={lapsDone > 0 ? fmtTime(race.lapTimes[lapsDone - 1]) : '—'} />
            <LiveStat label="Best" value={bestSoFar != null ? fmtTime(bestSoFar) : '—'} />
          </View>

          <LapList lapTimes={race.lapTimes} bestLap={bestSoFar} />

          <View style={styles.actionRow}>
            {canTriggerDemo && (
              <Pressable
                onPress={triggerDemoPass}
                accessibilityRole="button"
                accessibilityLabel="Trigger a demo car pass"
                style={({ pressed }) => [styles.ghostBtn, styles.flex1, pressed && styles.pressed]}
              >
                <Text style={styles.ghostBtnText}>Trigger pass</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => stop()}
              style={({ pressed }) => [styles.dangerBtn, styles.flex1, pressed && styles.pressed]}
            >
              <Text style={styles.dangerBtnText}>Finish</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'finished' && race.result && (
        <Results
          result={race.result}
          nextRacerName={nextRacer?.name ?? null}
          onPrimaryAction={lineup.length > 1 ? onAdvanceLineup : abort}
          primaryActionLabel={lineup.length > 1 ? 'Next racer' : 'Race again'}
        />
      )}

      {(phase === 'idle' || phase === 'finished') && (
        <Leaderboard board={leaderboard} onClear={clearLeaderboard} />
      )}
    </ScrollView>
  );
}

function ConnDot({ connection }: { connection: string }) {
  const color =
    connection === 'connected' ? colors.ok : connection === 'connecting' ? colors.warn : colors.idle;
  return <View style={[styles.connDot, { backgroundColor: color }]} />;
}

function LiveStat({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <View style={styles.liveStat}>
      <Text style={styles.liveStatLabel}>{label}</Text>
      <Text style={[styles.liveStatValue, live && styles.liveStatValueHot]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LapList({ lapTimes, bestLap }: { lapTimes: readonly number[]; bestLap: number | null }) {
  if (lapTimes.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Laps</Text>
        <Text style={styles.empty}>No laps yet — the first crossing arms the timer.</Text>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Laps</Text>
      {lapTimes.map((t, i) => {
        const isBest = bestLap != null && t === bestLap;
        return (
          <View key={i} style={styles.lapRow}>
            <Text style={styles.lapNum}>Lap {i + 1}</Text>
            <View style={styles.lapRight}>
              <Text style={[styles.lapTime, isBest && styles.lapTimeBest]}>{fmtTime(t)}</Text>
              {isBest ? <Text style={styles.bestTag}>BEST</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function LineupCard({
  lineup,
  draftName,
  liveCarUid,
  carLabel,
  onChooseNext,
  onRemove,
  onAssignCar,
}: {
  lineup: RaceNightLineup;
  draftName: string;
  liveCarUid: string | null;
  carLabel: (uid: string | null) => string;
  onChooseNext: (racerId: string) => void;
  onRemove: (racerId: string) => void;
  onAssignCar: (racerId: string) => void;
}) {
  const current = currentRacerName(lineup, draftName);
  const currentEntry = lineup[0] ?? null;
  const queued = lineup.slice(1);

  // "Set car" only does something when a car is live on the portal, and only
  // when it would actually change the racer's assignment.
  const canAssign = (uid: string | null) => liveCarUid != null && liveCarUid !== uid;

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Race-night lineup</Text>

      <View style={styles.lineupCurrentRow}>
        <View style={styles.lineupBody}>
          <Text style={styles.lineupLabel}>Current racer</Text>
          <Text style={styles.lineupName} numberOfLines={1}>
            {current}
          </Text>
          <Text style={styles.lineupCar} numberOfLines={1}>
            🏎 {currentEntry ? carLabel(currentEntry.carUid) : carLabel(liveCarUid)}
          </Text>
        </View>

        {currentEntry ? (
          <View style={styles.lineupActions}>
            {canAssign(currentEntry.carUid) && (
              <Pressable onPress={() => onAssignCar(currentEntry.id)} hitSlop={8}>
                <Text style={styles.lineupActionText}>Set car</Text>
              </Pressable>
            )}
            <Pressable onPress={() => onRemove(currentEntry.id)} hitSlop={8}>
              <Text style={styles.lineupRemoveText}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.lineupHintText}>From input</Text>
        )}
      </View>

      {queued.length === 0 ? (
        <Text style={styles.empty}>
          {lineup.length === 0
            ? 'Add racers above to build a turn order, or start a solo race from the player field.'
            : 'No one is queued yet — add more racers above to build a rotation.'}
        </Text>
      ) : (
        queued.map((racer, index) => (
          <View key={racer.id} style={styles.lineupRow}>
            <View style={styles.lineupBody}>
              <Text style={styles.lineupLabel}>{index === 0 ? 'Up next' : `Queue ${index + 2}`}</Text>
              <Text style={styles.lineupName} numberOfLines={1}>
                {racer.name}
              </Text>
              <Text style={styles.lineupCar} numberOfLines={1}>
                🏎 {carLabel(racer.carUid)}
              </Text>
            </View>

            <View style={styles.lineupActions}>
              {index === 0 ? (
                <Text style={styles.lineupHintText}>Up next</Text>
              ) : (
                <Pressable onPress={() => onChooseNext(racer.id)} hitSlop={8}>
                  <Text style={styles.lineupActionText}>Make next</Text>
                </Pressable>
              )}
              {canAssign(racer.carUid) && (
                <Pressable onPress={() => onAssignCar(racer.id)} hitSlop={8}>
                  <Text style={styles.lineupActionText}>Set car</Text>
                </Pressable>
              )}
              <Pressable onPress={() => onRemove(racer.id)} hitSlop={8}>
                <Text style={styles.lineupRemoveText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function Results({
  result,
  nextRacerName,
  onPrimaryAction,
  primaryActionLabel,
}: {
  result: RaceResult;
  nextRacerName: string | null;
  onPrimaryAction: () => void;
  primaryActionLabel: string;
}) {
  const carName = useGarageStore((s) => s.cars.find((c) => c.uid === result.carUid)?.name ?? null);

  const onShare = () => {
    haptic(() => Haptics.selectionAsync());
    Share.share({ message: raceShareText(result, { carName }) }).catch(() => {});
  };

  return (
    <View style={styles.section}>
      <View style={styles.resultHero}>
        <Text style={styles.resultHeroLabel}>Finished</Text>
        <Text style={styles.resultHeroTime}>{fmtTime(result.totalTime)}</Text>
        <Text style={styles.resultHeroSub}>
          {result.player} · {result.lapCount} laps · {shortUid(result.carUid)}
        </Text>
        {nextRacerName ? <Text style={styles.nextUpText}>Up next: {nextRacerName}</Text> : null}
      </View>

      <View style={styles.liveRow}>
        <LiveStat label={`Best (lap ${result.bestLapNum})`} value={fmtTime(result.bestLap)} />
        <LiveStat label="Average" value={fmtTime(result.avgLap)} />
        <LiveStat label={`Worst (lap ${result.worstLapNum})`} value={fmtTime(result.worstLap)} />
      </View>

      <LapList lapTimes={result.lapTimes} bestLap={result.bestLap} />

      <Pressable
        onPress={onShare}
        style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
      >
        <Text style={styles.shareBtnText}>Share result</Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onPrimaryAction}
          style={({ pressed }) => [styles.primaryBtn, styles.flex1, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>{primaryActionLabel}</Text>
        </Pressable>
        <Link href="/" asChild>
          <Pressable style={({ pressed }) => [styles.ghostBtn, styles.flex1, pressed && styles.pressed]}>
            <Text style={styles.ghostBtnText}>Done</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function Leaderboard({ board, onClear }: { board: RaceResult[]; onClear: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeadRow}>
        <Text style={styles.cardHeading}>Session leaderboard</Text>
        {board.length > 0 ? (
          <Pressable onPress={onClear} hitSlop={8}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {board.length === 0 ? (
        <Text style={styles.empty}>Finish a race to set a time. Results reset when the app restarts.</Text>
      ) : (
        board.slice(0, 8).map((r, i) => (
          <View key={`${r.finishedAt}-${i}`} style={styles.lbRow}>
            <Text style={[styles.lbRank, i === 0 && styles.lbRankTop]}>{i + 1}</Text>
            <View style={styles.lbMid}>
              <Text style={styles.lbPlayer} numberOfLines={1}>
                {r.player}
              </Text>
              <Text style={styles.lbMeta}>
                {r.lapCount} laps · {shortUid(r.carUid)}
              </Text>
            </View>
            <Text style={[styles.lbTime, i === 0 && styles.lbTimeTop]}>{fmtTime(r.totalTime)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { alignItems: 'center', paddingHorizontal: spacing(5), gap: spacing(5) },
  header: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.heavy },
  connDot: { width: 11, height: 11, borderRadius: radius.pill },

  section: { width: '100%', maxWidth: 420, gap: spacing(3) },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  chips: { flexDirection: 'row', gap: spacing(2) },
  chip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    alignItems: 'center',
    gap: 1,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.heavy },
  chipUnit: { color: colors.textMuted, fontSize: fontSize.xs },
  chipTextActive: { color: colors.bg },

  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { color: colors.textSecondary, fontSize: fontSize.sm },
  hint: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 19 },
  hintLink: { color: colors.accentBlue, fontWeight: fontWeight.bold },

  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
  },
  primaryBtnText: { color: colors.bg, fontSize: fontSize.md, fontWeight: fontWeight.heavy },

  countdown: { width: '100%', maxWidth: 420, alignItems: 'center', gap: spacing(4), paddingVertical: spacing(8) },
  countNum: { color: colors.accent, fontSize: 140, fontWeight: fontWeight.heavy, fontVariant: ['tabular-nums'] },
  countLabel: { color: colors.textSecondary, fontSize: fontSize.md },

  lapHero: { alignItems: 'center', paddingVertical: spacing(3), gap: spacing(1) },
  lapHeroNum: { color: colors.textPrimary, fontSize: 72, fontWeight: fontWeight.heavy, fontVariant: ['tabular-nums'] },
  lapHeroOf: { color: colors.textMuted, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  lapHeroLabel: { color: colors.textSecondary, fontSize: fontSize.sm, textTransform: 'uppercase', letterSpacing: 1 },

  liveRow: { flexDirection: 'row', gap: spacing(2) },
  liveStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(2),
    alignItems: 'center',
    gap: 2,
  },
  liveStatLabel: { color: colors.textMuted, fontSize: fontSize.xs, textAlign: 'center' },
  liveStatValue: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  liveStatValueHot: { color: colors.accent },

  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(4),
    gap: spacing(1),
  },
  cardHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeading: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(1),
  },
  clearText: { color: colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  empty: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 18 },

  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  lapNum: { color: colors.textSecondary, fontSize: fontSize.sm },
  lapRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  lapTime: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  lapTimeBest: { color: colors.accent },
  bestTag: { color: colors.accent, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 1 },

  resultHero: { alignItems: 'center', gap: spacing(1), paddingVertical: spacing(2) },
  resultHeroLabel: { color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.heavy, textTransform: 'uppercase', letterSpacing: 2 },
  resultHeroTime: { color: colors.textPrimary, fontSize: 56, fontWeight: fontWeight.heavy, fontVariant: ['tabular-nums'] },
  resultHeroSub: { color: colors.textSecondary, fontSize: fontSize.sm },

  actionRow: { flexDirection: 'row', gap: spacing(2) },
  flex1: { flex: 1 },
  shareBtn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  shareBtnText: { color: colors.accent, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  ghostBtn: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
  },
  ghostBtnText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  btnDisabled: { opacity: 0.55 },
  btnDisabledText: { color: colors.textMuted },
  dangerBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(3.5),
    alignItems: 'center',
  },
  dangerBtnText: { color: colors.danger, fontSize: fontSize.md, fontWeight: fontWeight.bold },

  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  lbRank: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: fontWeight.heavy,
    width: 22,
    textAlign: 'center',
  },
  lbRankTop: { color: colors.accent },
  lbMid: { flex: 1 },
  lbPlayer: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  lbMeta: { color: colors.textMuted, fontSize: fontSize.xs },
  lbTime: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, fontVariant: ['tabular-nums'] },
  lbTimeTop: { color: colors.accent },
  lineupCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
    paddingBottom: spacing(2),
  },
  lineupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  lineupBody: { flex: 1, gap: 2 },
  lineupLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  lineupName: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  lineupCar: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: spacing(0.5) },
  lineupActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  lineupActionText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  lineupHintText: { color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  lineupRemoveText: { color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  nextUpText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },

  pressed: { opacity: 0.7 },
});
