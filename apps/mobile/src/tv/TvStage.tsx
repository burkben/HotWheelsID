/**
 * TV stage — the big-screen "host" view.
 *
 * This is what a TV shows when one is attached: readable from a couch, with no
 * controls on it at all (an external display is non-interactive, and the phone
 * or iPad stays the remote). It renders from the same Zustand stores as the
 * app because the native side mounts it as a *second React surface on the same
 * JS runtime* — see `docs/adr/0015-external-display-tv-mode.md` — so a pass
 * recorded on the device updates the TV in the same tick.
 *
 * The same component backs the in-app `/tv` screen, which is how the feature
 * degrades to plain AirPlay mirroring (and how you preview it without a TV).
 *
 * Deliberately router-free: an external-display surface has no navigation
 * context, so nothing here may import `expo-router`.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CarPhoto } from '@/catalog/CarPhoto';
import { useCarIdentity } from '@/catalog/useCarIdentity';
import { Speedometer } from '@/components/gauge/Speedometer';
import { currentLapElapsed, type RaceResult } from '@/race/raceEngine';
import { formatSpeedValue, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { usePortalStore } from '@/store/portalStore';
import { useRaceStore } from '@/store/raceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { colors, fontWeight, radius, spacing, speedGauge } from '@/theme/tokens';
import { resolveTvScale, type TvScale } from './tvScale';

/** "12.34" / "1:02.34" — the unit-less form, since the TV labels it separately. */
function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—';
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    return `${m}:${(seconds - m * 60).toFixed(2).padStart(5, '0')}`;
  }
  return seconds.toFixed(2);
}

function shortUid(uid?: string | null): string {
  if (!uid) return '—';
  const parts = uid.split(':');
  return parts.length > 2 ? parts.slice(-2).join(':') : uid;
}

export function TvStage() {
  // The stage measures itself instead of reading `useWindowDimensions()`:
  // RN's `Dimensions` describes the *device* screen, so on the external-display
  // surface it would report the iPad, not the TV. `onLayout` is per-surface.
  const [box, setBox] = useState({ width: 0, height: 0 });
  const scale = resolveTvScale(box.width, box.height);

  const connection = usePortalStore((s) => s.connection);
  const car = usePortalStore((s) => s.car);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);
  const lastSpeed = usePortalStore((s) => s.lastSpeed);

  const race = useRaceStore((s) => s.race);
  const leaderboard = useRaceStore((s) => s.leaderboard);

  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const display: SpeedDisplay = { unit: speedUnit, calibration: speedCalibration };

  const identity = useCarIdentity(car?.uid);

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }}
    >
      <View style={[styles.safe, { padding: scale.inset }]}>
        <TvHeader scale={scale} connection={connection} phase={race.phase} player={race.player} />

        <View style={[styles.body, { gap: scale.gap }]}>
          <View style={styles.hero}>
            {race.phase === 'countdown' ? (
              <Countdown scale={scale} />
            ) : race.phase === 'racing' ? (
              <RaceHero scale={scale} race={race} />
            ) : race.phase === 'finished' && race.result ? (
              <FinishHero scale={scale} result={race.result} />
            ) : (
              <SpeedHero
                scale={scale}
                lastMph={lastSpeed?.scaleMph ?? 0}
                bestMph={bestMph}
                display={display}
              />
            )}
          </View>

          <View style={[styles.side, { gap: scale.gap }]}>
            <CarCard
              scale={scale}
              catalogId={identity?.id ?? null}
              name={identity?.name ?? (car ? shortUid(car.uid) : null)}
              subtitle={car ? (identity ? shortUid(car.uid) : 'Unidentified tag') : 'No car on portal'}
            />
            {race.phase === 'racing' || race.phase === 'finished' ? (
              <LapBoard scale={scale} lapTimes={race.lapTimes} targetLaps={race.targetLaps} />
            ) : (
              <PassBoard scale={scale} passes={passes} bestMph={bestMph} display={display} />
            )}
            <Standings scale={scale} board={leaderboard} />
          </View>
        </View>
      </View>
    </View>
  );
}

function TvHeader({
  scale,
  connection,
  phase,
  player,
}: {
  scale: TvScale;
  connection: string;
  phase: string;
  player: string;
}) {
  const status =
    connection === 'connected' ? 'Portal live' : connection === 'connecting' ? 'Connecting' : 'Portal offline';
  const dot =
    connection === 'connected' ? colors.ok : connection === 'connecting' ? colors.warn : colors.idle;
  const mode =
    phase === 'racing' || phase === 'countdown'
      ? player.trim() || 'Race in progress'
      : phase === 'finished'
        ? 'Race complete'
        : 'Speed trap';

  return (
    <View style={styles.header}>
      <Text style={[styles.wordmark, { fontSize: scale.title }]}>REDLINE ID</Text>
      <View style={styles.headerRight}>
        <Text style={[styles.mode, { fontSize: scale.label }]}>{mode}</Text>
        <View style={[styles.dot, { backgroundColor: dot, width: scale.dot, height: scale.dot }]} />
        <Text style={[styles.status, { fontSize: scale.label }]}>{status}</Text>
      </View>
    </View>
  );
}

function SpeedHero({
  scale,
  lastMph,
  bestMph,
  display,
}: {
  scale: TvScale;
  lastMph: number;
  bestMph: number;
  display: SpeedDisplay;
}) {
  // The gauge needle springs to each pass then eases back, mirroring the phone
  // so both screens tell the same story.
  const [needle, setNeedle] = useState(0);
  useEffect(() => {
    if (lastMph < 1) return;
    setNeedle(lastMph);
    const id = setTimeout(() => setNeedle(0), 1300);
    return () => clearTimeout(id);
  }, [lastMph]);

  return (
    <View style={styles.heroCenter}>
      <Speedometer
        value={needle}
        readoutMph={lastMph}
        max={speedGauge.maxMph}
        zones={speedGauge.zones}
        tickStep={speedGauge.tickStep}
        flameThreshold={speedGauge.flameThreshold}
        size={scale.gauge}
        display={display}
      />
      <Text style={[styles.heroCaption, { fontSize: scale.label }]}>
        BEST {formatSpeedValue(bestMph, display)} {speedUnitLabel(display.unit).toUpperCase()}
      </Text>
    </View>
  );
}

function Countdown({ scale }: { scale: TvScale }) {
  return (
    <View style={styles.heroCenter}>
      <Text style={[styles.countdown, { fontSize: scale.hero }]}>GET READY</Text>
      <Text style={[styles.heroCaption, { fontSize: scale.label }]}>Roll on the green</Text>
    </View>
  );
}

function RaceHero({ scale, race }: { scale: TvScale; race: ReturnType<typeof useRaceStore.getState>['race'] }) {
  // The lap clock is the whole point of the TV during a race, so it ticks here
  // independently of whatever screen the device happens to be showing.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const lapsDone = race.lapTimes.length;
  const best = lapsDone > 0 ? Math.min(...race.lapTimes) : null;
  const armed = race.lastGateAt != null;

  return (
    <View style={styles.heroCenter}>
      <Text style={[styles.heroLabel, { fontSize: scale.label }]}>
        {armed ? 'CURRENT LAP' : 'CROSS THE LINE TO START'}
      </Text>
      <Text style={[styles.heroValue, { fontSize: scale.hero }]}>
        {armed ? fmtTime(currentLapElapsed(race, now)) : '—'}
      </Text>
      <Text style={[styles.heroCaption, { fontSize: scale.title }]}>
        LAP {Math.min(lapsDone + (armed ? 1 : 0), race.targetLaps)} / {race.targetLaps}
      </Text>
      <View style={[styles.heroStats, { gap: scale.gap }]}>
        <MiniStat scale={scale} label="Last" value={lapsDone > 0 ? fmtTime(race.lapTimes[lapsDone - 1]) : '—'} />
        <MiniStat scale={scale} label="Best" value={best != null ? fmtTime(best) : '—'} hot />
      </View>
    </View>
  );
}

function FinishHero({ scale, result }: { scale: TvScale; result: RaceResult }) {
  return (
    <View style={styles.heroCenter}>
      <Text style={[styles.heroLabel, { fontSize: scale.label }]}>FINISHED</Text>
      <Text style={[styles.heroValue, { fontSize: scale.hero }]}>{fmtTime(result.totalTime)}</Text>
      <Text style={[styles.heroCaption, { fontSize: scale.title }]} numberOfLines={1}>
        {result.player.trim() || 'Racer'} · {result.lapCount} laps
      </Text>
      <View style={[styles.heroStats, { gap: scale.gap }]}>
        <MiniStat scale={scale} label={`Best lap ${result.bestLapNum}`} value={fmtTime(result.bestLap)} hot />
        <MiniStat scale={scale} label="Average" value={fmtTime(result.avgLap)} />
      </View>
    </View>
  );
}

function MiniStat({
  scale,
  label,
  value,
  hot,
}: {
  scale: TvScale;
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <View style={[styles.miniStat, { padding: scale.pad }]}>
      <Text style={[styles.miniLabel, { fontSize: scale.label }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.miniValue, { fontSize: scale.stat }, hot && styles.hot]}>{value}</Text>
    </View>
  );
}

function CarCard({
  scale,
  catalogId,
  name,
  subtitle,
}: {
  scale: TvScale;
  catalogId: string | null;
  name: string | null;
  subtitle: string;
}) {
  return (
    <View style={[styles.card, { padding: scale.pad, gap: scale.pad }]}>
      <CarPhoto carId={catalogId} width={scale.photo} aspectRatio={16 / 10} rounded={radius.md} />
      <View style={styles.cardText}>
        <Text style={[styles.cardTitle, { fontSize: scale.stat }]} numberOfLines={1}>
          {name ?? 'Waiting for a car'}
        </Text>
        <Text style={[styles.cardSub, { fontSize: scale.label }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function PassBoard({
  scale,
  passes,
  bestMph,
  display,
}: {
  scale: TvScale;
  passes: readonly { id: number; uid?: string; scaleMph: number }[];
  bestMph: number;
  display: SpeedDisplay;
}) {
  return (
    <View style={[styles.card, styles.cardColumn, { padding: scale.pad }]}>
      <Text style={[styles.cardHeading, { fontSize: scale.label }]}>RECENT PASSES</Text>
      {passes.length === 0 ? (
        <Text style={[styles.empty, { fontSize: scale.label }]}>Waiting for a car to cross…</Text>
      ) : (
        passes.slice(0, scale.rows).map((pass) => {
          const isBest = bestMph > 0 && pass.scaleMph >= bestMph;
          return (
            <View key={pass.id} style={styles.row}>
              <Text style={[styles.rowKey, { fontSize: scale.label }]} numberOfLines={1}>
                {shortUid(pass.uid)}
              </Text>
              <Text style={[styles.rowValue, { fontSize: scale.stat }, isBest && styles.hot]}>
                {formatSpeedValue(pass.scaleMph, display)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

function LapBoard({
  scale,
  lapTimes,
  targetLaps,
}: {
  scale: TvScale;
  lapTimes: readonly number[];
  targetLaps: number;
}) {
  const best = lapTimes.length > 0 ? Math.min(...lapTimes) : null;
  // Newest laps matter most on a long race, so the tail is what stays on screen.
  const shown = lapTimes.slice(-scale.rows);
  const offset = lapTimes.length - shown.length;

  return (
    <View style={[styles.card, styles.cardColumn, { padding: scale.pad }]}>
      <Text style={[styles.cardHeading, { fontSize: scale.label }]}>
        LAPS {lapTimes.length} / {targetLaps}
      </Text>
      {shown.length === 0 ? (
        <Text style={[styles.empty, { fontSize: scale.label }]}>First crossing arms the timer.</Text>
      ) : (
        shown.map((t, i) => (
          <View key={offset + i} style={styles.row}>
            <Text style={[styles.rowKey, { fontSize: scale.label }]}>Lap {offset + i + 1}</Text>
            <Text style={[styles.rowValue, { fontSize: scale.stat }, t === best && styles.hot]}>
              {fmtTime(t)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

function Standings({ scale, board }: { scale: TvScale; board: readonly RaceResult[] }) {
  if (board.length === 0) return null;
  return (
    <View style={[styles.card, styles.cardColumn, { padding: scale.pad }]}>
      <Text style={[styles.cardHeading, { fontSize: scale.label }]}>SESSION STANDINGS</Text>
      {board.slice(0, scale.rows).map((entry, i) => (
        <View key={`${entry.finishedAt}-${i}`} style={styles.row}>
          <Text style={[styles.rowKey, { fontSize: scale.label }]} numberOfLines={1}>
            {i + 1}. {entry.player.trim() || 'Racer'}
          </Text>
          <Text style={[styles.rowValue, { fontSize: scale.stat }, i === 0 && styles.hot]}>
            {fmtTime(entry.totalTime)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Pure black rather than the app's night-track blue: TVs render black as
  // "off", which makes the stage read as a dedicated display, not a mirror.
  root: { flex: 1, backgroundColor: '#000000' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmark: { color: colors.accent, fontWeight: fontWeight.heavy, letterSpacing: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  mode: { color: colors.textPrimary, fontWeight: fontWeight.bold, letterSpacing: 2 },
  dot: { borderRadius: radius.pill },
  status: { color: colors.textSecondary, fontWeight: fontWeight.medium, letterSpacing: 1 },
  body: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  hero: { flex: 3, justifyContent: 'center' },
  heroCenter: { alignItems: 'center', justifyContent: 'center', gap: spacing(2) },
  heroLabel: { color: colors.textSecondary, fontWeight: fontWeight.bold, letterSpacing: 3 },
  heroValue: {
    color: colors.textPrimary,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  heroCaption: { color: colors.textSecondary, fontWeight: fontWeight.bold, letterSpacing: 2 },
  countdown: { color: colors.accent, fontWeight: fontWeight.heavy, letterSpacing: 6 },
  heroStats: { flexDirection: 'row' },
  side: { flex: 2, justifyContent: 'center' },
  miniStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    alignItems: 'center',
    minWidth: 150,
  },
  miniLabel: { color: colors.textMuted, fontWeight: fontWeight.bold, letterSpacing: 2 },
  miniValue: {
    color: colors.textPrimary,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardColumn: { flexDirection: 'column', alignItems: 'stretch' },
  cardText: { flex: 1, minWidth: 0 },
  cardHeading: {
    color: colors.textMuted,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
    marginBottom: spacing(1),
  },
  cardTitle: { color: colors.textPrimary, fontWeight: fontWeight.heavy },
  cardSub: { color: colors.textSecondary, fontWeight: fontWeight.medium },
  empty: { color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
    paddingVertical: spacing(1),
  },
  rowKey: { color: colors.textSecondary, flexShrink: 1 },
  rowValue: {
    color: colors.textPrimary,
    fontWeight: fontWeight.heavy,
    fontVariant: ['tabular-nums'],
  },
  hot: { color: colors.accent },
});
