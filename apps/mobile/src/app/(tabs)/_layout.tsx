/**
 * Bottom tab bar — the app's primary navigation (epic #28, issue #29).
 *
 * Replaces the v1.0 home "hub" (a vertical stack of mode buttons) with a
 * persistent tab bar for the primary modes. Everything else (Achievements,
 * Live portal, Settings) lives behind **More** and pushes over the tabs from
 * the root stack in {@link RootLayout}. See docs/architecture/design-language.md §6.
 *
 * Icons are emoji to match the app's iconography vocabulary and to render
 * identically across iOS, Android, and the web preview. Active tint is the
 * flame `accent`; inactive is `textMuted`.
 */
import type { ComponentProps } from 'react';
import { Text } from 'react-native';
import { Tabs } from 'expo-router';

import { colors, fontWeight } from '@/theme/tokens';

/** An emoji tab glyph that brightens when its tab is focused. */
function tabIcon(glyph: string) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.6 }}>{glyph}</Text>;
  };
}

const screenOptions: ComponentProps<typeof Tabs>['screenOptions'] = {
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: fontWeight.bold },
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="index" options={{ title: 'Speed', tabBarIcon: tabIcon('🏠') }} />
      <Tabs.Screen name="race" options={{ title: 'Race', tabBarIcon: tabIcon('🏁') }} />
      <Tabs.Screen name="garage" options={{ title: 'Garage', tabBarIcon: tabIcon('🏎️') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('🕘') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('☰') }} />
    </Tabs>
  );
}
