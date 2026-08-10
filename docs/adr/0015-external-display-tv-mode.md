# 15. AirPlay screen-mirroring TV mode and responsive iPad layout

- **Status:** Accepted (amended)
- **Date:** 2026-07-25; amended 2026-08-01
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0005](0005-ui-toolkit.md), [ADR-0006](0006-state-management-and-persistence.md)

## Context

TV/host mode needs a couch-readable lap clock, speed, laps, and standings. The
first implementation declared an iOS external-display scene and mounted
`TvStage` as a second React Native Fabric surface on Expo's shared host. The
phone was intended to remain an independent controller.

That architecture worked in an iPad Simulator application window but failed on
physical AirPlay hardware. iOS created a 1920×1080 external scene and React
reported a nonzero layout, yet the TV stayed black. A follow-up that added a
dedicated scene delegate, native loading UI, explicit constraints, and
React-ready signaling still left the TV blank and could corrupt the primary
phone surface. The shared second-surface path is therefore unsafe for V1.

The responsive iPad work is independent of that failure. Screens still resolve
their layout from the current window, allowing two-pane and multi-column
layouts in landscape, Split View, and Stage Manager.

## Decision

**V1 uses normal iOS AirPlay Screen Mirroring and one React surface.**

- `UIApplicationSceneManifest` and all external-window/second-root code are
  removed. iOS mirrors the primary application window.
- The `/tv` route immediately renders `TvStage` full-screen on the device, so
  the TV receives the exact same presentation when mirroring starts. It does
  not depend on a capture-state callback to become usable.
- `expo-screen-orientation` keeps normal iPhone screens portrait and locks the
  TV route to landscape. iPad remains free to rotate.
- Independent TV output, where the device remains a separate controller, is
  deferred. A future implementation must use a proven native renderer or
  another architecture validated on physical AirPlay hardware before release.

## Consequences

- TV mode is reliable because there is only one UIKit window and one React
  surface to render.
- The device and TV show the same dashboard during V1 TV mode; the phone is not
  an independent race controller.
- `TvStage` remains router-free, reusable, and measurable through its own
  `onLayout`.
- The Simulator cannot validate AirPlay mirroring. Every release containing TV
  changes requires a physical-device test for connection, rendering,
  disconnection, and primary-UI recovery.
- Multiple-scene support and the accidental iPad multi-window claim are removed.
