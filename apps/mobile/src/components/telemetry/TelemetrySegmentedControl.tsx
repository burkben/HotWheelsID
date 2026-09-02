/**
 * TelemetrySegmentedControl — a precise inset rail for 2–5 choices.
 *
 * Unlike the old `flex: 1` chips (which stretched to fill a card), this is
 * content-sized with a moving selected indicator. Every segment keeps a ≥44pt
 * hit target even when the visible rail is narrower. The selected segment moves
 * an electric indicator with a quick `withTiming`; reduce-motion snaps it.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { colors, fontSize, fontWeight, radiusT, spacing } from "@/theme/tokens";
import { useTelemetryMotion } from "./useTelemetryMotion";

export interface Segment<T> {
  value: T;
  label: string;
  accessibilityLabel?: string;
}

export interface TelemetrySegmentedControlProps<T> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accent for the active indicator. Defaults to electric blue. */
  accent?: "electric" | "flame";
}

export function TelemetrySegmentedControl<T extends string | number>({
  segments,
  value,
  onChange,
  accent = "electric",
}: TelemetrySegmentedControlProps<T>) {
  const { reduceMotion, timing } = useTelemetryMotion();
  const n = Math.max(1, segments.length);
  const activeIndex = Math.max(0, segments.findIndex((s) => s.value === value));
  const accentColor = accent === "flame" ? colors.flame : colors.electric;

  // Measure the rail's inner width so the indicator slides in points, not a
  // fragile mix of % and translate. 2pt padding on each side.
  const [innerWidth, setInnerWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setInnerWidth(e.nativeEvent.layout.width - 4);
  const slot = innerWidth / n;

  const progress = useSharedValue(activeIndex);
  useEffect(() => {
    progress.value = reduceMotion ? activeIndex : withTiming(activeIndex, timing);
  }, [activeIndex, reduceMotion, timing, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * slot }],
    width: slot,
  }));

  return (
    <View style={styles.rail} accessibilityRole="tablist" onLayout={onLayout}>
      {slot > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { backgroundColor: accentColor }, indicatorStyle]}
        />
      )}
      {segments.map((seg) => {
        const selected = seg.value === value;
        return (
          <Pressable
            key={String(seg.value)}
            onPress={() => onChange(seg.value)}
            accessibilityRole="tab"
            accessibilityLabel={seg.accessibilityLabel ?? String(seg.label)}
            accessibilityState={{ selected }}
            hitSlop={6}
            style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {seg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: "relative",
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: colors.panelInset,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radiusT.field,
    padding: 2,
    minHeight: 36,
  },
  indicator: {
    position: "absolute",
    top: 2,
    bottom: 2,
    borderRadius: radiusT.field - 2,
  },
  segment: {
    flex: 1,
    minHeight: 32,
    paddingHorizontal: spacing(3),
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  label: {
    color: colors.inkSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontVariant: ["tabular-nums"],
  },
  labelActive: {
    color: colors.void,
  },
  pressed: { opacity: 0.7 },
});
