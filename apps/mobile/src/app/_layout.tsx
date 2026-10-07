import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { PortalControllerProvider } from '@/portal/PortalControllerProvider';
import { TrophyUnlockBanner } from '@/achievements/components/TrophyUnlockBanner';
import { initPersistence } from '@/store/persistence/initPersistence';
import { redlineFonts } from '@/theme/redlineFonts';
import { RedlineFontContext } from '@/theme/RedlineFontContext';

// Run before React mounts so the native splash cannot disappear between frames.
void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.warn('Unable to keep the splash screen visible', error);
});

export default function RootLayout() {
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts(redlineFonts);

  useEffect(() => {
    if (fontError) console.warn('Redline fonts unavailable; using system text', fontError);
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch((error: unknown) => {
        console.warn('Unable to hide the splash screen', error);
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    initPersistence();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios' || Platform.isPad) return;

    const orientation = pathname === '/tv'
      ? ScreenOrientation.OrientationLock.LANDSCAPE
      : ScreenOrientation.OrientationLock.PORTRAIT_UP;

    void ScreenOrientation.lockAsync(orientation).catch((error: unknown) => {
      console.warn('Unable to update screen orientation', error);
    });
  }, [pathname]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <RedlineFontContext.Provider value={fontsLoaded}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PortalControllerProvider>
            <Stack screenOptions={{ headerShown: false }}>
              {/* Primary modes live in the bottom tab bar (issue #29). */}
              <Stack.Screen name="(tabs)" />
              {/* Secondary screens push over the tabs — reached from the More tab
                  or from a tab's detail links. */}
              <Stack.Screen name="garage/[uid]" />
              <Stack.Screen name="identify" options={{ presentation: 'modal' }} />
              <Stack.Screen name="history/[id]" />
              <Stack.Screen name="achievements" />
              <Stack.Screen name="live" />
              <Stack.Screen name="tv" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="credits" />
            </Stack>
            <TrophyUnlockBanner />
            <StatusBar style="light" />
          </PortalControllerProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </RedlineFontContext.Provider>
  );
}
