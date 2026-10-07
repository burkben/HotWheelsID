import { View } from 'react-native';
import { Link } from 'expo-router';
import { LinkPressable } from '@/components/LinkPressable';
import { RText, StatusChip } from '@/components/redline';
import { usePortalController, usePortalControllerActions } from '@/portal/PortalControllerProvider';
import { type ConnectionState, usePortalStore } from '@/store/portalStore';
import { colorsR } from '@/theme/tokens';
import { portalReadiness } from '../presentation';

export function PortalStatusPill({ connection }: { readonly connection: ConnectionState }) {
  const controlStatus = usePortalStore(s => s.controlStatus);
  const phase = usePortalController(s => s.phase);
  const mode = usePortalController(s => s.mode);
  const manuallyDisconnected = usePortalController(s => s.manuallyDisconnected);
  const controller = usePortalControllerActions();
  return <StatusChip connection={connection} controlStatus={controlStatus} phase={phase} mode={mode} manuallyDisconnected={manuallyDisconnected} label={portalReadiness(connection).label} onConnect={() => void controller.connect()} onRetry={() => void controller.retry()} onDisconnect={() => void controller.disconnect()} />;
}

export function PortalRecovery({ connection }: { readonly connection: ConnectionState }) {
  if (connection !== 'disconnected') return null;
  const readiness = portalReadiness(connection);
  return <View style={{ width: '100%', maxWidth: 620, backgroundColor: colorsR.pitLane, borderTopWidth: 3, borderColor: colorsR.caution, padding: 14, gap: 10 }}>
    <View accessible accessibilityLabel={`${readiness.label}. ${readiness.detail}`}><RText variant="sectionTitle">{readiness.label}</RText><RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>{readiness.detail}</RText></View>
    <Link href="/settings" asChild><LinkPressable accessibilityRole="link" accessibilityLabel="Open portal settings" accessibilityHint="Connect your portal or enable Demo mode in Settings" contentStyle={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}><RText variant="bodySmall" style={{ color: colorsR.electric }}>Open portal settings</RText></LinkPressable></Link>
  </View>;
}
