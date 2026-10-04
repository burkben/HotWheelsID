/** Redline dock: the existing five routes, icons, and navigation events. */
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Tabs, usePathname } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { colorsR, skewR } from '@/theme/tokens';
import { PersistenceStatusBanner } from '@/components/PersistenceStatusBanner';
import { PortalStatusRibbon } from '@/components/telemetry/PortalStatusRibbon';
import { useTelemetryMotion } from '@/components/telemetry/useTelemetryMotion';
import { RText } from '@/components/redline/RText';
import { decorative } from '@/components/redline/decorative';
import { webSpacePress } from '@/components/redline/webSpacePress';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size?: number }) {
    return <MaterialCommunityIcons name={name} color={color} size={size ?? 24} />;
  };
}

function RedlineTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const [width, setWidth] = useState(0);
  const { reduceMotion, needleSpring } = useTelemetryMotion();
  const { damping, stiffness, mass, overshootClamping } = needleSpring;
  const tabWidth = width / state.routes.length;
  const targetX = tabWidth * (state.index + 0.24);
  const indicatorX = useSharedValue(targetX);
  const initialized = useRef(false);
  useEffect(() => {
    if (width === 0) return;
    indicatorX.value = reduceMotion || !initialized.current ? targetX : withSpring(targetX, { damping, stiffness, mass, overshootClamping });
    initialized.current = true;
  }, [width, targetX, reduceMotion, indicatorX, damping, stiffness, mass, overshootClamping]);
  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }, { skewX: skewR.indicator }] }));

  return (
    <View testID="redline-tab-bar" style={[styles.dock, { paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View accessibilityRole="tablist" accessibilityLabel="Main navigation" style={styles.tabs} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 && <Animated.View {...decorative} testID="tab-indicator" style={[styles.indicator, { width: tabWidth * 0.52 }, indicator]} />}
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const label = options.title ?? route.name;
          const color = focused ? colorsR.flame : colorsR.inkMuted;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable key={route.key} {...webSpacePress(onPress)} onPress={onPress} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })} accessibilityRole="tab" accessibilityLabel={options.tabBarAccessibilityLabel ?? label} accessibilityState={{ selected: focused }} aria-selected={focused} testID={`tab-${route.name}`} style={({ pressed }) => [styles.tab, pressed && { opacity: 0.75 }]}>
              <View {...decorative}>{options.tabBarIcon?.({ focused, color, size: 24 })}</View>
              <RText variant="tabLabel" style={{ color }} numberOfLines={1}>{label}</RText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const pathname = usePathname();
  return (
    <SafeAreaView edges={['top']} style={styles.layout}>
      <PersistenceStatusBanner />
      <PortalStatusRibbon visible={pathname !== '/'} />
      <Tabs screenOptions={{ headerShown: false }} tabBar={props => <RedlineTabBar {...props} />}>
        <Tabs.Screen name="index" options={{ title: 'Speed', tabBarIcon: tabIcon('speedometer') }} />
        <Tabs.Screen name="race" options={{ title: 'Race', tabBarIcon: tabIcon('flag-checkered') }} />
        <Tabs.Screen name="garage" options={{ title: 'Garage', tabBarIcon: tabIcon('garage') }} />
        <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('history') }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: tabIcon('dots-horizontal') }} />
      </Tabs>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colorsR.pitWall },
  dock: { backgroundColor: colorsR.pitWall, borderTopWidth: 1, borderTopColor: colorsR.hairline },
  tabs: { flexDirection: 'row', height: 62 },
  tab: { flex: 1, minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', gap: 3 },
  indicator: { position: 'absolute', top: -1, left: 0, height: 3, backgroundColor: colorsR.flame },
});
