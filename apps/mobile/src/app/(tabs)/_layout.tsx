/**
 * Bottom tab bar — the app's primary navigation (epic #28, issue #29).
 *
 * Replaces the v1.0 home "hub" (a vertical stack of mode buttons) with a
 * persistent tab bar for the primary modes. Everything else (Achievements,
 * Live portal, Settings) lives behind **More** and pushes over the tabs from
 * the root stack in {@link RootLayout}. See docs/architecture/design-language.md §6.
 *
 * Icons are MaterialCommunityIcons (vector) so they tint cleanly with the
 * active/inactive tab color. Active tint is the flame `accent`; inactive is
 * `textMuted`. See docs/architecture/design-language.md §5.
 */
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { colors, fontWeight } from '@/theme/tokens';
import { PersistenceStatusBanner } from '@/components/PersistenceStatusBanner';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** A vector tab glyph; its tint follows the active/inactive tab color. */
function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size?: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size ?? 26} />;
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
    <View style={styles.layout}>
      <PersistenceStatusBanner />
      <Tabs screenOptions={screenOptions}>
        <Tabs.Screen name="index" options={{ title: 'Speed', tabBarIcon: tabIcon('speedometer') }} />
        <Tabs.Screen name="race" options={{ title: 'Race', tabBarIcon: tabIcon('flag-checkered') }} />
        <Tabs.Screen name="garage" options={{ title: 'Garage', tabBarIcon: tabIcon('garage') }} />
        <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('history') }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('dots-horizontal') }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
