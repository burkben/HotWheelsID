/**
 * FlameField — the Phase 2b "high-speed flame" FX layer for the gauge.
 *
 * Rendered inside the Speedometer's SVG so it shares the dial's coordinate
 * space. Two parts:
 *   - a warm radial *bloom* over the dial that fades in with speed, and
 *   - a ring of *embers* that rise off the upper rim and flicker.
 *
 * Rendering choice (ADR-0010): react-native-svg + Reanimated, not Skia. A
 * Phase-2b spike showed Skia needs extra CanvasKit/WASM web setup to draw,
 * which can't be verified on our headless web preview channel; SVG renders
 * identically on web and native and lands in the static export. The Skia
 * particle renderer remains the eventual upgrade (ADR-0005) once it can be
 * verified on a device.
 *
 * `intensity` (0..1) is smoothed on the UI thread, so callers can pass a
 * discrete value (e.g. derived from the live needle target) and still get a
 * smooth flare-in / fade-out. Honors "reduce motion": embers stop animating
 * and the layer collapses to a faint static bloom.
 */
import { useEffect } from "react";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Circle, Defs, G, RadialGradient, Stop } from "react-native-svg";

import { colors } from "@/theme/tokens";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Ember tints, warm to white-hot. */
const EMBER_COLORS = ["#ff5a1a", colors.accent, "#ffb43a", "#ffe08a"] as const;

const HEAT_GRADIENT_ID = "hwHeatBloom";

export interface FlameFieldProps {
  /** Dial center x. */
  cx: number;
  /** Dial center y. */
  cy: number;
  /** Track radius (embers launch from just inside this). */
  r: number;
  /** 0..1 heat level; smoothed internally. */
  intensity: number;
  /** When true, embers freeze and only a faint static bloom shows. */
  reduceMotion: boolean;
  /** Number of embers around the hot arc. */
  emberCount?: number;
}

export function FlameField({
  cx,
  cy,
  r,
  intensity,
  reduceMotion,
  emberCount = 12,
}: FlameFieldProps) {
  // Smoothed heat shared value drives every child on the UI thread.
  const heat = useSharedValue(0);
  useEffect(() => {
    const target = Math.max(0, Math.min(intensity, 1));
    heat.value = withTiming(target, { duration: 420, easing: Easing.out(Easing.quad) });
  }, [intensity, heat]);

  const bloomProps = useAnimatedProps(() => {
    "worklet";
    return { opacity: heat.value * 0.5 };
  });

  // Embers span the upper/high-speed arc of the dial (top through the red
  // zone on the right): clockwise angles from ~-40deg to ~130deg.
  const startAngle = -40;
  const endAngle = 130;
  const embers = Array.from({ length: emberCount }, (_, i) => {
    const t = emberCount === 1 ? 0.5 : i / (emberCount - 1);
    const angleDeg = startAngle + t * (endAngle - startAngle);
    return (
      <Ember
        key={`ember-${i}`}
        index={i}
        cx={cx}
        cy={cy}
        baseR={r - 4}
        angleDeg={angleDeg}
        heat={heat}
        reduceMotion={reduceMotion}
      />
    );
  });

  return (
    <G>
      <Defs>
        <RadialGradient id={HEAT_GRADIENT_ID} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.55} />
          <Stop offset="55%" stopColor="#ff5a1a" stopOpacity={0.22} />
          <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
        </RadialGradient>
      </Defs>

      {/* Warm bloom over the whole dial. */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={r * 0.96}
        fill={`url(#${HEAT_GRADIENT_ID})`}
        opacity={0}
        animatedProps={bloomProps}
      />

      {embers}
    </G>
  );
}

interface EmberProps {
  index: number;
  cx: number;
  cy: number;
  baseR: number;
  angleDeg: number;
  heat: SharedValue<number>;
  reduceMotion: boolean;
}

function Ember({ index, cx, cy, baseR, angleDeg, heat, reduceMotion }: EmberProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0.3;
      return;
    }
    const duration = 950 + (index % 5) * 170;
    progress.value = withDelay(
      index * 110,
      withRepeat(withTiming(1, { duration, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [index, reduceMotion, progress]);

  const emberProps = useAnimatedProps(() => {
    "worklet";
    const p = progress.value;
    const a = ((angleDeg - 90) * Math.PI) / 180;
    const out = baseR + p * 26;
    const x = cx + out * Math.cos(a);
    const y = cy + out * Math.sin(a) - p * 12;
    const opacity = heat.value * (1 - p) * (reduceMotion ? 0.45 : 0.95);
    const radius = (1 - p) * 2.6 + 1.1;
    return { cx: x, cy: y, r: radius, opacity };
  });

  return (
    <AnimatedCircle
      // Static fallbacks so the first (server-rendered) frame is valid before
      // the worklet supplies animated values.
      cx={cx}
      cy={cy}
      r={1.5}
      opacity={0}
      fill={EMBER_COLORS[index % EMBER_COLORS.length]}
      animatedProps={emberProps}
    />
  );
}
