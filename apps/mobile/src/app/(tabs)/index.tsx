import { useEffect, useMemo, useRef } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router, useIsFocused } from 'expo-router';
import { RakeLines, RText, StatCell, StatRow, StatusChip, Wordmark } from '@/components/redline';

import { FindPortal } from '@/components/redline/FindPortal';
import { shouldShowFindPortal } from '@/speed/connectState';
import { Speedometer } from '@/components/gauge/Speedometer';
import { BleStatusBanner } from '@/components/BleStatusBanner';
import { ActiveCarStrip } from '@/components/telemetry/ActiveCarStrip';
import { SpeedTrace } from '@/components/telemetry/SpeedTrace';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { isSessionBest, sessionPassCaption } from '@/components/telemetry/speedBars';
import { decorative } from '@/components/redline/decorative';
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
import { colorsR, spacing, speedGauge } from '@/theme/tokens';

export default function SpeedometerScreen() {
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
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
  const { reduceMotion } = useTelemetryMotion();
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
    if (focused) AccessibilityInfo.announceForAccessibility(status.accessibilityLabel);
  }, [status, focused]);

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

  const header = (
    <View style={[styles.header, { maxWidth: layout.isSplit ? undefined : layout.contentMaxWidth }]}>
      <View accessible accessibilityRole="header" accessibilityLabel="Redline ID"><Wordmark /></View>
      <View style={{ maxWidth: '58%', flexShrink: 1 }}>
        <StatusChip connection={connection} controlStatus={controlStatus} phase={blePhase} mode={mode} manuallyDisconnected={manuallyDisconnected} onConnect={() => void controller.connect()} onRetry={() => void controller.retry()} onDisconnect={() => void controller.disconnect()} />
      </View>
    </View>
  );

  const banners = (
    <>
      {useBle && <BleStatusBanner phase={blePhase} onRetry={() => void controller.retry()} />}
      {useBle && blePhase === 'locked' && (
        <View style={[styles.lockedBanner, { maxWidth: paneWidth }]}>
          <RText variant="body" style={styles.lockedTitle}>Portal firmware unsupported</RText>
          <RText variant="bodySmall" style={styles.lockedBody}>
            This portal connected, but cannot send car or speed readings. Connection details
            can help diagnose the problem.
          </RText>
          <Pressable
            onPress={() => router.push('/live')}
            accessibilityRole="button"
            accessibilityLabel="View connection details"
            style={({ pressed }) => [styles.lockedButton, pressed && styles.buttonPressed]}
          >
            <RText variant="bodySmall" style={styles.lockedButtonText}>View connection details</RText>
          </Pressable>
        </View>
      )}
    </>
  );

  const heroCard = <ActiveCarStrip model={hero} display={speedDisplay} />;

  const gauge = (
    <Speedometer
      variant="redline"
      newBest={isSessionBest(lastPassMph, bestMph)}
      value={lastPassMph}
      sampleKey={lastPass?.id}
      mode={racePhase === 'idle' ? 'sweep' : 'track'}
      readoutMph={lastPassMph}
      max={speedGauge.maxMph}
      zones={speedGauge.zones}
      tickStep={speedGauge.tickStep}
      flameThreshold={speedGauge.flameThreshold}
      size={layout.isTablet ? layout.gaugeSize : Math.min(340, Math.max(220, layout.width - 50))}
      display={speedDisplay}
      reduceMotion={reduceMotion}
    />
  );

  const recentPasses = useMemo(() => passes.slice(0, 14).reverse(), [passes]);
  const stats = (
    <View style={{ width: '100%', maxWidth: paneWidth }}>
      <StatRow>
        <StatCell label="LAST" value={formatBestSpeed(lastPassMph, speedDisplay)} unit={speedUnitLabel(speedUnit)} />
        <StatCell label="BEST" value={formatBestSpeed(bestMph, speedDisplay)} unit={speedUnitLabel(speedUnit)} color={colorsR.caution} accent={colorsR.caution} />
        <StatCell label="PASSES" value={passes.length.toString()} unit={sessionPassCaption(passes.length)} />
      </StatRow>
    </View>
  );
  const trace = (
    <View style={[styles.traceCard, { maxWidth: paneWidth }]}>
      <View style={styles.traceHead}>
        <RText variant="sectionTitle">RECENT PASSES</RText>
        <RText variant="eyebrow" style={styles.traceMeta}>LAST {recentPasses.length}</RText>
      </View>
      <SpeedTrace values={recentPasses.map(pass => pass.scaleMph)} sampleKeys={recentPasses.map(pass => pass.id)} newBest={isSessionBest(lastPassMph, bestMph)} display={speedDisplay} />
    </View>
  );
  const background = <View {...decorative} style={styles.rake}><RakeLines height={420} opacity={0.03} spacing={20} /></View>;

  if (shouldShowFindPortal({ connection, car, passCount: passes.length, mode })) {
    return <FindPortal status={{ connection, controlStatus, phase: blePhase, mode, manuallyDisconnected, onConnect: () => void controller.connect(), onRetry: () => void controller.retry(), onDisconnect: () => void controller.disconnect() }} onDemo={() => void controller.setMode('demo')} />;
  }

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
        {background}
        {header}
        <View style={styles.splitBody}>
          <View style={styles.splitLeft}>
            {gauge}
          </View>
          <ScrollView
            style={styles.splitRight}
            contentContainerStyle={styles.splitRightContent}
            showsVerticalScrollIndicator={false}
          >
            {banners}
            {heroCard}
            {stats}
            {trace}
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
          paddingTop: 0,
          paddingBottom: spacing(3),
          paddingHorizontal: layout.isTablet ? layout.gutter : 16,
        },
      ]}
    >
      {background}
      {header}
      {banners}
      {gauge}
      {heroCard}
      {stats}
      {trace}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { alignItems: 'center', gap: 12 },
  rake: { position: 'absolute', top: 0, left: 0, right: 0, height: 420 },
  splitRoot: { gap: spacing(4) },
  splitBody: { flex: 1, flexDirection: 'row', gap: spacing(6) },
  splitLeft: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splitRight: { flex: 1 },
  splitRightContent: { gap: 12, paddingBottom: spacing(4), flexGrow: 1, justifyContent: 'center' },
  header: { width: '100%', minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  traceCard: { width: '100%', backgroundColor: colorsR.pitLane, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, gap: 8 },
  traceHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  traceMeta: { color: colorsR.inkMuted, letterSpacing: 1 },
  lockedBanner: { width: '100%', backgroundColor: colorsR.pitLane, borderColor: colorsR.redFlag, borderWidth: 1, padding: 16, gap: 8 },
  lockedTitle: { color: colorsR.chalk },
  lockedBody: { color: colorsR.inkSecondary },
  lockedButton: { marginTop: 4, alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: colorsR.flame },
  lockedButtonText: { color: colorsR.flame },
  buttonPressed: { opacity: 0.85 },
});
