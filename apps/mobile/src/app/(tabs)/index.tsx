import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useReducedMotion } from 'react-native-reanimated';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { RecentPasses } from '@/components/RecentPasses';
import { Speedometer } from '@/components/gauge/Speedometer';
import { BleStatusBanner } from '@/components/BleStatusBanner';
import { ActiveCarStrip } from '@/components/telemetry/ActiveCarStrip';
import { SpeedTrace } from '@/components/telemetry/SpeedTrace';
import { TelemetrySurface } from '@/components/telemetry/TelemetrySurface';
import { TelemetryValue } from '@/components/telemetry/TelemetryValue';
import { useCarIdentity } from '@/catalog/useCarIdentity';
import { useLayout } from '@/layout/useLayout';
import {
  usePortalController,
  usePortalControllerActions,
} from '@/portal/PortalControllerProvider';
import { carHeroModel, portalStatusPresentation } from '@/portal/selectors';
import { useGarageStore } from '@/store/garageStore';
import { usePortalStore } from '@/store/portalStore';
import { useRaceStore } from '@/store/raceStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatBestSpeed, speedUnitLabel, type SpeedDisplay } from '@/speed/format';
import { colors, fontSize, fontSizeT, fontWeight, radiusT, spacing, speedGauge } from '@/theme/tokens';

export default function SpeedometerScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();

  const connection = usePortalStore((s) => s.connection);
  const controlStatus = usePortalStore((s) => s.controlStatus);
  const car = usePortalStore((s) => s.car);
  const lastCar = usePortalStore((s) => s.lastCar);
  const bestMph = usePortalStore((s) => s.bestMph);
  const passes = usePortalStore((s) => s.passes);
  const lastPass = passes[0];
  const racePhase = useRaceStore((s) => s.race.phase);
  const garageCars = useGarageStore((s) => s.cars);

  const mode = usePortalController((s) => s.mode);
  const blePhase = usePortalController((s) => s.phase);
  const manuallyDisconnected = usePortalController((s) => s.manuallyDisconnected);
  const controller = usePortalControllerActions();
  const useBle = mode === 'live';

  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const speedCalibration = useSettingsStore((s) => s.speedCalibration);
  const reduceMotionSetting = useSettingsStore((s) => s.reduceMotion);
  const reduceMotion = useReducedMotion() || reduceMotionSetting;
  const speedDisplay: SpeedDisplay = { unit: speedUnit, calibration: speedCalibration };

  const heroUid = car?.uid || lastCar?.uid || garageCars[0]?.uid;
  const catalogCar = useCarIdentity(heroUid);
  const hero = useMemo(
    () =>
      carHeroModel({
        currentCar: car,
        lastCar,
        garageCars,
        catalogCar,
        sessionBestMph: bestMph,
        lastMph: lastPass?.scaleMph,
      }),
    [car, lastCar, garageCars, catalogCar, bestMph, lastPass?.scaleMph],
  );

  const status = useMemo(
    () =>
      portalStatusPresentation({
        connection,
        controlStatus,
        phase: blePhase,
        mode,
        manuallyDisconnected,
      }),
    [connection, controlStatus, blePhase, mode, manuallyDisconnected],
  );
  const previousStatus = useRef(status.label);
  useEffect(() => {
    if (status.label === previousStatus.current) return;
    previousStatus.current = status.label;
    AccessibilityInfo.announceForAccessibility(status.accessibilityLabel);
  }, [status]);

  const previousHero = useRef(hero ? `${hero.uid}:${hero.isCurrent}` : null);
  useEffect(() => {
    const key = hero ? `${hero.uid}:${hero.isCurrent}` : null;
    if (!hero || key === previousHero.current) return;
    previousHero.current = key;
    AccessibilityInfo.announceForAccessibility(
      `${hero.isCurrent ? 'Car on portal' : 'Last scanned car'}: ${hero.title}`,
    );
  }, [hero]);

  // Accepted passes survive car-removed/zero notifications and suppress BLE
  // echoes. Their IDs retrigger equal-speed sweeps without remounting the gauge.
  const lastPassMph = lastPass?.scaleMph ?? 0;

  useEffect(() => {
    if (!lastPass) return;

    // Tactile punch on each pass; a celebratory cue when it's a new best.
    // (The store has already folded this pass into bestMph by now.)
    if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) {
      const isRecord = lastPass.scaleMph >= usePortalStore.getState().bestMph - 0.001;
      const haptic = isRecord
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      haptic.catch(() => {});
    }
  }, [lastPass]);

  // Light tick when a new car is detected on the portal.
  useEffect(() => {
    if (!car) return;
    if (Platform.OS !== 'web' && useSettingsStore.getState().haptics) {
      Haptics.selectionAsync().catch(() => {});
    }
    // The object also carries mutable timestamps; haptics should fire only for a new UID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car?.uid]);

  // Each region is built once and then arranged either as one scrolling column
  // (phone) or as two panes (iPad). Keeping them as locals rather than nested
  // components preserves component identity across a rotation, so the gauge's
  // Reanimated needle keeps its position instead of remounting at zero.
  const paneWidth = layout.isSplit ? undefined : layout.contentMaxWidth;

  // Connection and demo controls live in Settings. Label simulated readings only
  // while demo is active, in the existing header rather than a separate strip.
  const header = (
    <View style={[styles.header, { maxWidth: layout.isSplit ? undefined : layout.contentMaxWidth }]}>
      <View style={styles.headerText}>
        <Text style={styles.title}>Redline ID</Text>
      </View>
      <Pressable
        onPress={() => router.push('/settings')}
        accessibilityRole="button"
        accessibilityLabel={`Portal settings. ${status.label}`}
        accessibilityHint="Connection controls and demo mode."
        style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
      >
        {mode === 'demo' && <Text style={styles.demoLabel}>Demo</Text>}
        <MaterialCommunityIcons name="cog-outline" size={22} color={colors.inkSecondary} />
      </Pressable>
    </View>
  );

  const banners = (
    <>
      {useBle && <BleStatusBanner phase={blePhase} onRetry={() => void controller.retry()} />}
      {useBle && blePhase === 'locked' && (
        <View style={[styles.lockedBanner, { maxWidth: paneWidth }]}>
          <Text style={styles.lockedTitle}>Portal firmware unsupported</Text>
          <Text style={styles.lockedBody}>
            This portal connected, but cannot send car or speed readings. Connection details
            can help diagnose the problem.
          </Text>
          <Pressable
            onPress={() => router.push('/live')}
            accessibilityRole="button"
            accessibilityLabel="View connection details"
            style={({ pressed }) => [styles.lockedButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.lockedButtonText}>View connection details</Text>
          </Pressable>
        </View>
      )}
    </>
  );

  const heroCard = <ActiveCarStrip model={hero} display={speedDisplay} />;

  const gauge = (
    <Speedometer
      value={lastPassMph}
      sampleKey={lastPass?.id}
      mode={racePhase === 'idle' ? 'sweep' : 'track'}
      readoutMph={lastPassMph}
      max={speedGauge.maxMph}
      zones={speedGauge.zones}
      tickStep={speedGauge.tickStep}
      flameThreshold={speedGauge.flameThreshold}
      size={layout.gaugeSize}
      display={speedDisplay}
      reduceMotion={reduceMotion}
    />
  );

  // Live telemetry trace of recent passes (oldest → newest).
  const traceValues = useMemo(
    () => passes.map((p) => p.scaleMph).slice(0, 30).reverse(),
    [passes],
  );

  const lastDelta =
    lastPassMph > 0 && bestMph > 0 ? lastPassMph - bestMph : null;

  const stats = (
    <View style={[styles.statsRow, { maxWidth: paneWidth }]}>
      <Stat
        label="Best"
        value={formatBestSpeed(bestMph, speedDisplay)}
        unit={speedUnitLabel(speedUnit)}
      />
      <Stat label="Passes" value={passes.length.toString()} unit="total" />
      <Stat
        label="Delta"
        value={lastDelta == null ? '—' : formatBestSpeed(Math.abs(lastDelta), speedDisplay)}
        unit={speedUnitLabel(speedUnit)}
        delta={
          lastDelta == null
            ? undefined
            : `${lastDelta >= 0 ? '+' : '−'}${formatBestSpeed(Math.abs(lastDelta), speedDisplay)}`
        }
      />
    </View>
  );

  const trace = (
    <TelemetrySurface style={[styles.traceCard, { maxWidth: paneWidth }]}>
      <View style={styles.traceHead}>
        <Text style={styles.traceLabel}>Speed trace</Text>
        <Text style={styles.traceMeta}>last {Math.min(traceValues.length, 30)} passes</Text>
      </View>
      <SpeedTrace values={traceValues} height={92} />
    </TelemetrySurface>
  );

  // --- iPad: gauge holds a fixed left pane, detail scrolls on the right -------
  if (layout.isSplit) {
    return (
      <View
        style={[
          styles.screen,
          styles.splitRoot,
          {
            paddingTop: spacing(3),
            paddingBottom: insets.bottom + spacing(3),
            paddingLeft: insets.left + layout.gutter,
            paddingRight: insets.right + layout.gutter,
          },
        ]}
      >
        {header}
        <View style={styles.splitBody}>
          <View style={styles.splitLeft}>
            {gauge}
            {stats}
            {trace}
          </View>
          <ScrollView
            style={styles.splitRight}
            contentContainerStyle={styles.splitRightContent}
            showsVerticalScrollIndicator={false}
          >
            {banners}
            {heroCard}
            <RecentPasses
              passes={passes}
              bestMph={bestMph}
              display={speedDisplay}
              maxWidth={layout.width}
              limit={12}
            />
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
          paddingTop: spacing(3),
          paddingBottom: insets.bottom + spacing(6),
          paddingHorizontal: layout.gutter,
        },
      ]}
    >
      {header}
      {banners}
      {heroCard}
      {gauge}
      {stats}
      {trace}
      <RecentPasses
        passes={passes}
        bestMph={bestMph}
        display={speedDisplay}
        maxWidth={layout.contentMaxWidth}
      />
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  unit,
  delta,
}: {
  label: string;
  value: string;
  unit: string;
  delta?: string;
}) {
  return (
    <TelemetrySurface style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <TelemetryValue value={value} unit={unit} delta={delta} size="md" />
    </TelemetrySurface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.void,
  },
  content: {
    alignItems: 'center',
    gap: spacing(4),
  },
  /** iPad: a fixed frame, since each pane manages its own scrolling. */
  splitRoot: {
    gap: spacing(4),
  },
  splitBody: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing(6),
  },
  splitLeft: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(4),
  },
  splitRight: {
    flex: 1,
  },
  splitRightContent: {
    gap: spacing(4),
    paddingBottom: spacing(4),
    // Matches the left pane, which centres its column.
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(3),
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    color: colors.ink,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.heavy,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing(3),
  },
  stat: {
    flex: 1,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    alignItems: 'flex-start',
    gap: 4,
  },
  statLabel: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  traceCard: {
    width: '100%',
    padding: spacing(3),
    gap: spacing(2),
  },
  traceHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  traceLabel: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  traceMeta: {
    color: colors.inkMuted,
    fontSize: fontSizeT.xs,
    fontVariant: ['tabular-nums'],
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    gap: spacing(2),
    paddingHorizontal: spacing(2),
  },
  demoLabel: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  lockedBanner: {
    width: '100%',
    backgroundColor: colors.panelSolid,
    borderColor: colors.fault,
    borderWidth: 1,
    borderRadius: radiusT.card,
    padding: spacing(4),
    gap: spacing(2),
  },
  lockedTitle: {
    color: colors.ink,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  lockedBody: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  lockedButton: {
    marginTop: spacing(1),
    alignSelf: 'flex-start',
    backgroundColor: colors.panelInset,
    borderColor: colors.flame,
    borderWidth: 1,
    borderRadius: radiusT.field,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(4),
  },
  lockedButtonText: {
    color: colors.flame,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
