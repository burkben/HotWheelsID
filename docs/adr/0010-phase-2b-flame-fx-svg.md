# 10. Phase 2b flame FX: SVG particles now, Skia still deferred

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0005](0005-ui-stack-reanimated-skia-expo-router.md),
  [ADR-0009](0009-phase-2a-gauge-svg-first.md),
  [ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)

## Context

Phase 2b adds the roadmap's **"high-speed flame/particle effect + haptics"** to the hero
gauge. [ADR-0005](0005-ui-stack-reanimated-skia-expo-router.md) earmarked
`@shopify/react-native-skia` for exactly this FX, and [ADR-0009](0009-phase-2a-gauge-svg-first.md)
deferred adopting Skia until Phase 2b because Skia-on-web needs a CanvasKit/WASM runtime
that is hard to verify on our **only hardware-free preview channel** (react-native-web).
With the user's device still offline (no dev build yet, per
[ADR-0003](0003-bluetooth-with-react-native-ble-plx.md)), web remains the channel we use to
*prove* the work before they build.

We ran a **Skia spike** to settle this empirically: installed `@shopify/react-native-skia`,
added a trivial `<Canvas><Circle/></Canvas>` route, and ran `expo export --platform web`.

**Findings:**

- The bundle built and the route's static HTML rendered **without crashing** (good — Skia
  doesn't break SSR).
- But the exported HTML contained **no `<canvas>`, no CanvasKit reference, and no `.wasm`
  asset** was emitted. Out of the box, Skia draws **nothing** on web without additional
  `WithSkiaWeb` / CanvasKit-loading setup — which we cannot exercise or verify headlessly.

So adopting Skia now would mean shipping the headline FX **unverifiable on the one channel
we can see**, while the user is away and testing on-device later the same evening.

## Decision

Build the Phase 2b flame FX with **`react-native-svg` + `react-native-reanimated`**, in a
`FlameField` component layered inside the existing SVG gauge:

- A **radial heat bloom** (`<RadialGradient>`) whose opacity scales with a smoothed `heat`
  shared value.
- A ring of **ember `<Circle>`s** along the dial's high-speed arc that rise and fade via
  per-ember `useAnimatedProps` worklets (`withRepeat`/`withDelay`).
- Heat is driven by `liveIntensity` — how far the **live needle target** sits past
  `flameThreshold` — so flames flare on a fast pass and fade as the needle settles.
- **Haptics** (`expo-haptics`): a selection tick on car detection, a medium impact on each
  pass, and a success notification on a new record. Guarded to native (`Platform.OS`).
- **Reduce-motion**: `useReducedMotion()` collapses the embers to a faint static bloom, and
  the needle spring carries `ReduceMotion.System`.

**Skia remains the eventual renderer for a denser GPU particle system (ADR-0005).** The
spike de-risked it — it bundles and SSRs cleanly — so the future swap is: add the CanvasKit
web setup, verify on a device, and replace `FlameField`'s internals behind the same props.
This ADR **extends ADR-0009** (SVG-first for the same web-verifiability reason); it does not
supersede ADR-0005's longer-term direction.

## Consequences

### Positive

- The FX renders **identically on web and native** and lands in the static export — verified
  headlessly: the index route's HTML contains the bloom gradient and all ember circles.
- No CanvasKit/WASM setup, no heavy native dependency added to the dev build the user
  installs tonight (the spike's Skia dependency was removed).
- Honors accessibility (reduce-motion) and adds tactile feedback on device.

### Negative / costs

- SVG is less suited to *dense* (hundreds of particles) effects at 60–120 fps than Skia, so
  the ember count is deliberately modest. Sufficient for the "gauge catches fire" read; a
  richer particle system waits for the Skia renderer.
- A second brief coexistence of approaches (SVG FX now, Skia later) — bounded cleanly by the
  `FlameField` component boundary and the `intensity`/`reduceMotion` props.

## Alternatives considered

- **Skia now (as ADR-0005).** Rejected for Phase 2b: the spike proved it renders nothing on
  web without extra WASM setup we can't verify headlessly — unacceptable for unattended,
  pre-device work.
- **Wait for the dev build to do Skia on device.** Rejected: blocks the headline FX on Apple
  enrollment/signing and a manual build, defeating the build-before-hardware plan
  ([ui-and-design.md](../architecture/ui-and-design.md) §6).
