/** Shared action policy for the legacy pill and Redline status chip. */
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { portalStatusPresentation } from '@/portal/selectors';
import { useSettingsStore } from '@/store/settingsStore';
import type { StatusPillProps } from './StatusPill';

export function usePortalStatusAction(props: StatusPillProps) {
  const status = portalStatusPresentation(props);
  const { onConnect, onRetry, onDisconnect } = props;
  const confirmDisconnect = () => {
    const disconnect = () => {
      if (Platform.OS !== "web" && useSettingsStore.getState().haptics) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onDisconnect();
    };
    if (Platform.OS === "web") {
      if (
        typeof globalThis.confirm === "function" &&
        globalThis.confirm("Disconnect portal? Automatic reconnect will stay paused.")
      ) {
        disconnect();
      }
      return;
    }
    Alert.alert("Disconnect portal?", "Automatic reconnect will stay paused until you connect again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: disconnect,
      },
    ]);
  };

  const onPress = () => {
    if (status.action === "none") return;
    if (status.action === "disconnect") {
      confirmDisconnect();
      return;
    }
    if (Platform.OS !== "web" && useSettingsStore.getState().haptics) {
      void Haptics.selectionAsync();
    }
    if (status.action === "retry") onRetry();
    else onConnect();
  };

  return { status, onPress };
}
