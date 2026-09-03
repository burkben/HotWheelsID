/**
 * SpeedTrace — a live sparkline of recent passes (Trackside Telemetry).
 *
 * Plots the last N pass speeds as an electric-blue trace over a faint grid,
 * with a bright current-point marker. Pure SVG; the path is computed from data
 * (portal passes are low-frequency), so it stays cheap. Honors reduce-motion by
 * drawing the final path immediately instead of animating the stroke reveal.
 */
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors, radiusT } from "@/theme/tokens";
import { useTelemetryMotion } from "./useTelemetryMotion";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export interface SpeedTraceProps {
  /** Recent pass speeds, oldest → newest (caller orders them). */
  values: number[];
  height?: number;
}

const WIDTH = 320; // viewBox width; the view scales to its container.
const PAD = 6;

export function SpeedTrace({ values, height = 92 }: SpeedTraceProps) {
  const { reduceMotion, timingSlow } = useTelemetryMotion();
  const reveal = useSharedValue(reduceMotion ? 1 : 0);

  const { path, last, min, max } = useMemo(() => {
    if (values.length === 0) return { path: "", last: null as { x: number; y: number } | null, min: 0, max: 0 };
    const mn = Math.min(...values);
    const mx = Math.max(...values);
    const span = Math.max(1, mx - mn);
    const innerW = WIDTH - PAD * 2;
    const innerH = 100 - PAD * 2;
    const n = values.length;
    const pts = values.map((v, i) => {
      const x = PAD + (n === 1 ? innerW : (i / (n - 1)) * innerW);
      const y = PAD + innerH - ((v - mn) / span) * innerH;
      return { x, y };
    });
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ");
    return { path: d, last: pts[pts.length - 1], min: mn, max: mx };
  }, [values]);

  useEffect(() => {
    reveal.value = reduceMotion ? 1 : withTiming(1, timingSlow);
  }, [path, reduceMotion, timingSlow, reveal]);

  // Animate the stroke drawing in via dash offset (UI thread), unless reduced.
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (1 - reveal.value) * 1000,
  }));

  return (
    <View style={[styles.box, { height }]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${WIDTH} 100`} preserveAspectRatio="none">
        {/* faint grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <Line
            key={f}
            x1={PAD}
            x2={WIDTH - PAD}
            y1={100 * f}
            y2={100 * f}
            stroke={colors.hairline}
            strokeWidth={0.5}
            strokeDasharray="3 4"
          />
        ))}
        {path ? (
          <>
            <AnimatedPath
              d={path}
              fill="none"
              stroke={colors.electric}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={1000}
              animatedProps={animatedProps}
              vectorEffect="non-scaling-stroke"
            />
            {last ? (
              <Circle cx={last.x} cy={last.y} r={3.5} fill={colors.flame} />
            ) : null}
          </>
        ) : (
          // Idle baseline: a flat dashed center line so an empty trace still
          // reads as a live instrument, not a dead box.
          <Line
            x1={PAD}
            x2={WIDTH - PAD}
            y1={50}
            y2={50}
            stroke={colors.electric}
            strokeOpacity={0.3}
            strokeWidth={1.5}
            strokeDasharray="1 6"
            strokeLinecap="round"
          />
        )}
      </Svg>
      {/* min/max annotations */}
      {values.length > 1 ? (
        <View pointerEvents="none" style={styles.scale}>
          <View style={styles.scaleRow}>
            <View style={styles.scaleMaxMin}>
              <Animated.Text style={styles.scaleText}>{Math.round(max)}</Animated.Text>
            </View>
          </View>
          <View style={styles.scaleRow}>
            <View style={styles.scaleMaxMin}>
              <Animated.Text style={styles.scaleText}>{Math.round(min)}</Animated.Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radiusT.field,
    overflow: "hidden",
    backgroundColor: colors.panelInset,
  },
  scale: {
    position: "absolute",
    top: 4,
    bottom: 4,
    right: 6,
    justifyContent: "space-between",
  },
  scaleRow: { alignItems: "flex-end" },
  scaleMaxMin: {},
  scaleText: {
    color: colors.inkMuted,
    fontSize: 9,
    fontVariant: ["tabular-nums"],
  },
});
