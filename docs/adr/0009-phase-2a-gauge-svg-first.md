# 9. Phase 2a gauge: SVG-first, defer Skia FX to Phase 2b

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0005](0005-ui-stack-reanimated-skia-expo-router.md),
  [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md),
  [ADR-0006](0006-state-management-and-persistence.md)

## Context

[ADR-0005](0005-ui-stack-reanimated-skia-expo-router.md) selected
`@shopify/react-native-skia` for the hero speedometer (gauge arcs + flame/particle
effects). Phase 2a builds the **first playable version** of that screen, and the only
preview channel available without a paid Apple Developer account and a custom dev build
is **react-native-web** (Expo Go cannot run this app — it needs the `react-native-ble-plx`
native module per [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md), and the project
is on a bleeding-edge SDK Expo Go does not support).

Skia on web relies on a CanvasKit/WASM runtime that must be loaded and served correctly.
That setup is hard to validate in a headless CI/agent environment and adds risk to the one
channel we can actually look at right now. The Phase 2a deliverable is the **gauge shape,
motion, zones, and event plumbing** — none of which require Skia's GPU canvas. Skia's real
payoff is the **flame/particle FX** in Phase 2b.

## Decision

Render the Phase 2a speedometer with **`react-native-svg` + `react-native-reanimated`**:

- SVG `Path` arcs for the track and the green/yellow/red speed zones; SVG ticks/labels.
- A Reanimated shared value drives the needle via a `useAnimatedProps` worklet (UI-thread,
  interruptible `withSpring`), exactly the data path ADR-0005/0006 describe — only the
  *renderer* differs.
- Pure, framework-free gauge geometry (`components/gauge/geometry.ts`) so the math is
  reasoned about independently of the renderer.
- A `flameThreshold` / `isHot` flag is plumbed through the gauge now as the explicit hook
  where the **Skia FX layer drops in for Phase 2b**.

This **amends** ADR-0005's "Skia for the gauge" for Phase 2a only; ADR-0005 remains the
direction for the FX-heavy gauge.

## Consequences

### Positive
- Reliable, identical rendering on web **and** native with no WASM/CanvasKit setup, so the
  gauge can be previewed and reviewed immediately (hardware-free).
- The animation architecture (Reanimated shared value → worklet) is already the ADR-0005
  one, so adopting Skia later is a localized renderer swap, not a rewrite.
- Smaller dependency surface for the first milestone.

### Negative / costs
- SVG is less suited to dense particle/flame effects at 60–120 fps — hence Skia still owns
  Phase 2b FX.
- Two rendering technologies will briefly coexist (SVG dial + Skia FX) until/unless the dial
  is migrated to Skia. Acceptable: the `isHot` seam keeps the boundary clean.

## Alternatives considered

- **Skia now (as ADR-0005).** Rejected for Phase 2a only: unacceptable risk to the sole
  (web) preview channel for no Phase 2a benefit, since FX is Phase 2b.
- **Wait for a dev build to preview Skia on device.** Rejected: blocks all UI progress on
  paid Apple enrollment + signing, defeating the hardware-free, build-before-hardware plan
  ([ui-and-design.md](../architecture/ui-and-design.md) §6).
- **Plain RN `Animated`.** Rejected for the same reason as ADR-0005 — weaker for
  interruptible UI-thread motion.
