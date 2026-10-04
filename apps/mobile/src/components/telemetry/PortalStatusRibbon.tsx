import { useEffect, useRef } from 'react';
import { AccessibilityInfo, View } from 'react-native';
import { useIsFocused } from 'expo-router';

import { usePortalController, usePortalControllerActions } from '@/portal/PortalControllerProvider';
import { portalStatusPresentation } from '@/portal/selectors';
import { usePortalStore } from '@/store/portalStore';
import { StatusChip } from '../redline/StatusChip';

/** The tab shell's status channel. Speed has its own chip and announcements. */
export function PortalStatusRibbon({ visible }: { visible: boolean }) {
  const focused = useIsFocused();
  const connection = usePortalStore(s => s.connection);
  const controlStatus = usePortalStore(s => s.controlStatus);
  const phase = usePortalController(s => s.phase);
  const mode = usePortalController(s => s.mode);
  const manuallyDisconnected = usePortalController(s => s.manuallyDisconnected);
  const controller = usePortalControllerActions();
  const statusProps = { connection, controlStatus, phase, mode, manuallyDisconnected, onConnect: () => void controller.connect(), onRetry: () => void controller.retry(), onDisconnect: () => void controller.disconnect() };
  const status = portalStatusPresentation(statusProps);
  const previous = useRef(status.label);
  useEffect(() => {
    if (status.label === previous.current) return;
    previous.current = status.label;
    if (visible && focused) AccessibilityInfo.announceForAccessibility(status.accessibilityLabel);
  }, [status.label, status.accessibilityLabel, visible, focused]);
  if (!visible) return null;
  return <View testID="portal-status-ribbon"><StatusChip {...statusProps} variant="ribbon" /></View>;
}
