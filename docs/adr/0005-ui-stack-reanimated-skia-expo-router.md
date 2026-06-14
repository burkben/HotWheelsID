# 5. UI stack: Expo Router + Reanimated + Skia

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0002](0002-adopt-react-native-and-expo.md)

## Context

"A more attractive UI" is a primary goal. The signature screen is a **live speedometer**
that animates as a car passes through the portal, plus race/lap views, a car "garage,"
and history/leaderboards. We need:

- buttery, interruptible animation for the gauge needle, bars, and celebratory effects
  (the upstream tool shows flames at 100+ mph — we want a real animated version);
- custom 2D drawing for the circular gauge, arcs, and particle/flame effects;
- clean navigation across several screens with good defaults.

## Decision

Standardize the UI on:

- **Expo Router** (file-based navigation) for screen structure and deep links.
- **`react-native-reanimated`** for high-performance, gesture-driven, UI-thread animation
  (needle motion, transitions, count-ups).
- **`@shopify/react-native-skia`** for the custom speedometer gauge, arcs, gradients, and
  flame/particle effects rendered on a GPU canvas.
- A small set of primitives (typography, color tokens, spacing) defined as a lightweight
  **design system** (see `docs/architecture/ui-and-design.md`). We will start with a
  hand-rolled token set + a few components and adopt a component library only if needed.
- **`expo-image`** for fast image loading (car art), and **`expo-haptics`** for tactile
  feedback on car detection / new records.

Static UI can be built and reviewed against **mocked portal events** before any BLE work,
including on the iOS Simulator and (for layout) react-native-web.

## Consequences

### Positive
- Reanimated + Skia is the canonical high-performance combo for exactly this kind of
  data-driven, animated, game-like UI.
- Expo Router gives us URL-addressable screens and tidy file-based structure.
- The gauge is real drawing code, not an image — themable and resolution-independent.

### Negative / costs
- Skia adds binary size and a learning curve for custom drawing.
- Reanimated worklets have their own mental model (UI vs JS thread); contributors need a
  short ramp-up.
- A bespoke design system means we own the components; acceptable at this scale and
  revisitable later.

## Alternatives considered

- **`react-native-svg` instead of Skia** for the gauge. Simpler and fine for static or
  lightly animated SVG, but Skia is smoother for continuous 60–120 fps needle motion and
  particle effects. We may still use SVG for simple icons.
- **A full component library (e.g. Tamagui / NativeBase / RN Paper).** Deferred: great for
  speed, but the app is visually bespoke (racing aesthetic) and small; we start with tokens
  and add a library only if it pays for itself.
- **Plain React Native `Animated`.** Rejected for the gauge: less capable than Reanimated
  for complex, interruptible, UI-thread animation.
