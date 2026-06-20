import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initPersistence } from '@/store/persistence/initPersistence';

export default function RootLayout() {
  useEffect(() => {
    initPersistence();
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
