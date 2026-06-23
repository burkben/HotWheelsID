import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Device from 'expo-device';

import { prewarmBle } from '@/ble/blePortal';
import { initPersistence } from '@/store/persistence/initPersistence';

export default function RootLayout() {
  useEffect(() => {
    initPersistence();
    // Trigger the iOS Bluetooth permission / power prompts now, on the home
    // screen, rather than mid-race inside Guided Access (where iOS hides them and
    // a pending prompt can block Guided Access from starting). Device-only: the
    // Simulator has no radio and web has no native module. See
    // docs/guides/ios-guided-access.md.
    if (Device.isDevice) prewarmBle();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Primary modes live in the bottom tab bar (issue #29). */}
          <Stack.Screen name="(tabs)" />
          {/* Secondary screens push over the tabs — reached from the More tab
              or from a tab's detail links. */}
          <Stack.Screen name="garage/[uid]" />
          <Stack.Screen name="history/[id]" />
          <Stack.Screen name="achievements" />
          <Stack.Screen name="live" />
          <Stack.Screen name="settings" />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
