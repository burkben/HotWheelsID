/**
 * TelemetrySegmentedControl — a precise inset rail for 2–5 choices.
 *
 * Unlike the old `flex: 1` chips (which stretched to fill a card), this is
 * content-sized with a moving selected indicator. Every segment keeps a ≥44pt
 * hit target even when the visible rail is narrower. The selected segment moves
 * an electric indicator with a quick `withTiming`; reduce-motion snaps it.
 */
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const activeIndex = Math.max(0, segments.findIndex((s) => s.value === value));
  const accentColor = accent === "flame" ? colors.flame : colors.electric;

  // Let native text determine each segment's width. flex: 1 inside an intrinsic
  // rail gives Yoga a zero text basis, clipping every label on iOS. Measure the
  // actual segments so the indicator also fits choices with different widths.
  const [frames, setFrames] = useState<Record<number, { x: number; width: number }>>({});
  const selectedX = frames[activeIndex]?.x ?? 2;
  const selectedWidth = frames[activeIndex]?.width ?? 0;

  const indicatorX = useSharedValue(selectedX);
  const indicatorWidth = useSharedValue(selectedWidth);
  useEffect(() => {
    indicatorX.value = reduceMotion ? selectedX : withTiming(selectedX, timing);
    indicatorWidth.value = reduceMotion ? selectedWidth : withTiming(selectedWidth, timing);
  }, [selectedX, selectedWidth, reduceMotion, timing, indicatorX, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={styles.rail} accessibilityRole="tablist">
      {selectedWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { backgroundColor: accentColor }, indicatorStyle]}
        />
      )}
      {segments.map((seg, index) => {
        const selected = seg.value === value;
        return (
          <Pressable
            key={String(seg.value)}
            onLayout={({ nativeEvent: { layout } }) => {
              const { x, width } = layout;
              setFrames((previous) =>
                previous[index]?.x === x && previous[index]?.width === width
                  ? previous
                  : { ...previous, [index]: { x, width } },
              );
            }}
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
    left: 0,
    top: 2,
    bottom: 2,
    borderRadius: radiusT.field - 2,
  },
  segment: {
    flexShrink: 0,
    minWidth: 44,
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
