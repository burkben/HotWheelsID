# 16. Redline V1 visual identity

- **Status:** Accepted
- **Date:** 2026-10-07
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0005](0005-ui-stack-reanimated-skia-expo-router.md), [ADR-0009](0009-phase-2a-gauge-svg-first.md), [ADR-0010](0010-phase-2b-flame-fx-svg.md), [ADR-0015](0015-external-display-tv-mode.md)

## Context

For the App Store V1 launch the app needed a recognisable identity of its own. The
previous *Trackside Telemetry* look (glass panels, system fonts, rounded cards) read as a
generic dashboard and leaned on system typography that can't carry a brand. The design
hand-off in `docs/design/redline-v1/` (SPEC, mockups, source artboards) specifies a
motorsport identity, **Redline**. It had to land without changing the app's structure, data,
BLE/protocol, persistence, settings keys or the TV stage, and without native dependencies.

## Decision

1. **Bundled fonts.** Barlow, Barlow Condensed and Chakra Petch (SIL OFL 1.1) ship through the
   JS-only `@expo-google-fonts/*` packages and the existing `expo-font`. Each face is referenced
   by its own family name, never with `fontWeight`/`fontStyle`, to avoid faux styles on iOS. If
   loading fails, the app falls back to system fonts rather than block.
2. **Additive tokens.** `colorsR`, `fontR`, `radiusR`, `skewR` and `typeR` are added to
   `theme/tokens.ts`. Existing tokens are not renamed or removed.
3. **Square panels and a skew language.** Panels have no radius. Interactive and label shapes
   lean (−12° buttons and chips, −10° plates, −14° ribbons) with counter-skewed content.
   Numbers stay upright and tabular. Repeating motifs use `react-native-svg` `<Pattern>`; accent
   bars are real views, not inset shadows.
4. **Gauge variant, not a rewrite.** `Speedometer` gains `variant="redline"` (240° arc, comet,
   flames) driven by the existing UI-thread choreography. `'needle'` remains the default.
5. **TV stays on the legacy look.** `TvStage` and the needle gauge keep the Trackside tokens for
   V1, so the AirPlay mirroring path validated in ADR-0015 is untouched.
6. **Honest data.** Where the mockups show data the portal can't measure, the UI projects and
   labels it (pace estimate), derives it (top speed from the race's pass window, plates by
   `firstSeen`) or falls back (AVG LAP). Derivations are pure, unit-tested modules.
7. **Icons, not emoji, in chrome.** MaterialCommunityIcons for navigation and trophies (with a
   tested id → icon map); motif illustrations for empty states. Catalog emoji remain data.
8. **Reproducible brand assets.** The app icon, Android layers, favicon and splash glyph are
   exported from committed SVG masters by a deterministic `@resvg/resvg-js` script
   (devDependency only). The iOS icon is full-bleed, opaque and alpha-free.

## Consequences

- One shared kit (`components/redline/`) carries every screen; review fixtures under
  `/dev/redline` reproduce each mockup without touching stores.
- Two token systems coexist until TV migrates. New code must read only the Redline tokens.
- Font assets add to the bundle size. They work offline and need no network.
- Alternate app icons (trophy unlocks) need a native module and stay out of V1 (RL-19)
  pending owner approval.

## Alternatives considered

- **Keep Trackside and polish it:** lower risk, but no distinct identity for the store launch.
- **Skia for motifs and gauge:** deferred, as in ADR-0009/0010; SVG covers the needs.
- **Restyle TV at the same time:** rejected for V1 to keep the AirPlay path stable.
