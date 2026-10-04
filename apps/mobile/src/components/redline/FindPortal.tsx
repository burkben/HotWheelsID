import { Linking, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { bleStatusBanner } from '@/ble/bleStatus';
import type { StatusPillProps } from '@/components/StatusPill';
import { colorsR, fontR } from '@/theme/tokens';
import { Kerb } from './Patterns';
import { PortalIllustration } from './PortalIllustration';
import { RaceButton } from './RaceButton';
import { RText } from './RText';
import { StatusChip } from './StatusChip';
import { Wordmark } from './Marks';

/** The empty, disconnected live state inside Speed; owns no connection state. */
export function FindPortal({ status, onDemo }: { status: StatusPillProps; onDemo: () => void }) {
  const width = Math.min(useWindowDimensions().width || 390, 390);
  const banner = bleStatusBanner(status.phase);
  return <ScrollView testID="find-portal" style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.heading}>
      <View accessible accessibilityRole="image" accessibilityLabel="Redline ID"><Wordmark size={22} /></View>
      <RText variant="screenTitle" accessibilityRole="header" style={styles.title}>FIND YOUR{'\n'}PORTAL</RText>
    </View>
    <View style={{ width, alignSelf: 'center', marginTop: -3 }}><PortalIllustration width={width} /></View>
    <View style={styles.kerb}><Kerb height={14} stripe={12} /></View>
    <View style={styles.body}>
      <View style={{ alignSelf: 'center' }}><StatusChip {...status} label={status.phase === 'scanning' ? 'SEARCHING…' : undefined} /></View>
      {banner ? <View accessibilityRole="alert" aria-live="polite" style={styles.fault}>
        <RText variant="body" style={styles.faultTitle}>{banner.title}</RText>
        <RText variant="body" style={styles.copy}>{banner.body}</RText>
        {banner.openSettings ? <RaceButton label="Open Settings" variant="ghost" fullWidth accessibilityLabel="Open device settings" onPress={() => { Linking.openSettings().catch(() => {}); }} /> : status.phase !== 'unsupported' && status.onRetry ? <RaceButton label="Try again" variant="ghost" fullWidth accessibilityLabel="Retry portal connection" onPress={status.onRetry} /> : null}
      </View> : <RText variant="body" style={styles.copy}>{status.manuallyDisconnected ? 'Switch on your Race Portal and keep your phone close. Tap the status above to reconnect.' : "Switch on your Race Portal and keep your phone close. We'll connect on our own."}</RText>}
      <View style={styles.steps}>
        {['Power on the portal', 'Allow Bluetooth', 'Send a car through'].map((step, index) => <View key={step} accessible accessibilityLabel={`Step ${index + 1}: ${step}`} style={styles.step}>
          <RText variant="wordmark" style={styles.number}>0{index + 1}</RText>
          <RText variant="bodySmall" style={styles.stepText}>{step}</RText>
        </View>)}
      </View>
      <RaceButton label="NO PORTAL? TRY DEMO MODE" variant="ghost" fullWidth onPress={onDemo} style={styles.demo} />
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { paddingTop: 5, paddingBottom: 24 },
  heading: { alignItems: 'center', gap: 16, paddingHorizontal: 20 },
  title: { fontSize: 54, lineHeight: 48.6, textAlign: 'center' },
  kerb: { marginTop: -8 },
  body: { width: '100%', maxWidth: 438, alignSelf: 'center', paddingHorizontal: 24, marginTop: 24, gap: 12 },
  copy: { color: colorsR.inkSecondary, textAlign: 'center' },
  fault: { gap: 12 },
  faultTitle: { color: colorsR.redFlag, fontFamily: fontR.bodySemi, textAlign: 'center' },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, minWidth: 0, backgroundColor: colorsR.pitLane, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, gap: 6 },
  number: { color: colorsR.flame, fontSize: 22, lineHeight: 22 },
  stepText: { fontFamily: fontR.bodySemi, fontSize: 13, lineHeight: 16.9 },
  demo: { marginTop: 14, paddingHorizontal: 12 },
});
