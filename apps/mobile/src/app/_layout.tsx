import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initRacePersistence } from '@/store/persistence/initRacePersistence';

export default function RootLayout() {
  useEffect(() => {
    initRacePersistence();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="live" />
          <Stack.Screen name="race" />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
