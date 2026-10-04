# UI Overhaul — Implementation Status

**Selected direction: [Proposal B — Trackside Telemetry](02-proposal-trackside-telemetry.md)**
(chosen by the project owner after reviewing the three animated mocks in
[`index.html`](index.html)).

This file tracks the rollout of that proposal into `apps/mobile`. It is the
living counterpart to the proposal; the proposal remains the design intent.

## What's implemented (branch `burkben/ui-overhaul-proposals`)

**Post-merge simplification (2026-09-09)**

- Removed the global portal/status ribbon, including its standby and demo text.
  The tab shell still reserves the iOS safe area.
- Removed Speed's full-width Live BLE / Demo switch, manual sample-pass button,
  and explanatory footer. Demo appears only as a small label in the existing
  header when simulated readings are active.
- Speed's Settings shortcut opens portal controls at the top of Settings.
  Demo switches immediately using the existing controller and startup preference;
  connect/retry/pause and manual sample passes live alongside it.
- Connection failures remain actionable in the screen body with a retry or
  device-settings button. Race setup links to Settings for connection recovery.
- Settings keeps nested controls individually accessible; switches have explicit
  labels and hints. Reset restores the active portal mode as well as its preference.

Verification: mobile typecheck and zero-warning lint, 318 mobile tests, 69 protocol
tests, and the 20-route web export pass. Native checks on iPhone 17 Pro / iOS 26.5
confirmed the safe-area layout, Speed → Settings → back navigation, conditional
Demo label, sample-pass action, and Race → Settings recovery link. An injected
simulator-only transport exercised live/demo switching, the saved startup choice,
and the in-body not-found retry action. Physical BLE was not exercised; controller,
protocol, persistence, settings-store API, and needle animation code are unchanged.

The sections below describe the original rollout, including the ribbon that this
follow-up replaces.

**Foundation**
- `theme/tokens.ts`: added the telemetry ramp — `void`, `panelSolid`,
  `panelInset`, `panelRaised`, `glassFill`, `glassHighlight`, `hairline`, the
  `ink`/`inkSecondary`/`inkMuted` text ramp, calibrated `flame`/`electric`
  accents, `okT`/`caution`/`fault` status, `radiusT` precision radii,
  `fontSizeT` (incl. `hero`/`raceDisplay`/`nano`), and `fontFamily.telemetry`
  (SF Mono). All additive; the legacy tokens are untouched so unmigrated
  surfaces keep working.
- `components/telemetry/`: `TelemetrySurface` (expo-glass-effect `GlassView`
  with a designed opaque fallback, Reduce-Transparency aware),
  `TelemetrySegmentedControl` (content-sized rail, animated indicator),
  `TelemetryValue` (tabular/mono value + unit + signed delta),
  `CompactStepper`, `SettingGroup`/`SettingRow`/`SettingsSection` (the 44pt
  label-line geometry), `PortalStatusRibbon`, and `useTelemetryMotion` (the
  single reduce-motion gate + standard timing/spring configs).

**Settings — the alignment overhaul (research §5, all 7 bugs fixed)**
- `app/settings.tsx` rebuilt on `SettingRow`: control is a sibling of the label
  on a ≥44pt label line; the hint sits below that line, never beside the
  control. Balanced 3-slot header (fixed 64pt sides → optically centered
  title), `flex:1` chips replaced by content-sized `TelemetrySegmentedControl`,
  compact on-line `CompactStepper` for calibration, single section rhythm via
  `SettingsSection`, grouped inset cards with inset dividers, and Reset moved
  into a labeled **System** group. All eight settings keys and the store API
  are unchanged.

**Global shell**
- `(tabs)/_layout.tsx`: mounts `PortalStatusRibbon` (portal state · mode · car
  · last event; tap = connect/retry/disconnect via the existing selectors) and
  restyles the tab dock to the telemetry ramp. The ribbon lives in the tab
  shell, so pushed routes and `/tv` are excluded automatically.

**Screens restyled onto the ramp**
- **Speed** (`(tabs)/index.tsx`): new `SpeedTrace` live sparkline (svg,
  stroke-reveal gated by reduce-motion), `ActiveCarStrip` (horizontal car
  strip with flame on-portal rail), stats as `TelemetryValue` (Best · Passes ·
  Delta vs session best), telemetry mode toggle + banners.
- **Race**: `race/components/styles.ts` migrated to the ramp (one shared
  stylesheet rethemes setup/countdown/live/results/lineup/tournament at once;
  geometry and the race engine untouched).
- **Garage / History / Garage-detail / History-detail / RecentPasses /
  StatusPill / CarPhoto / gauge (needle/readout/FlameField) / status banners**:
  migrated to `panelSolid`+`hairline` surfaces, `flame`/`electric` accents, and
  tabular/mono numerals.

**Verification (2026-09-05):** mobile typecheck and lint are clean;
**318/318 mobile tests** (40 files) and **69/69 protocol tests** pass. No store,
protocol, BLE, persistence, or TV stage contract was changed.

## Native polish and motion verification

- The gauge uses one uninterrupted 620ms UI-thread ascent, holds for 900ms, then
  returns with a damped spring. Heat follows the animated needle as it returns.
- Accepted pass IDs retrigger equal-speed sweeps. Car-removed notifications and
  zero/noise readings no longer interrupt a real pass.
- During a race, the Speed tab uses continuous tracking and holds its target
  between laps. The TV speed-trap gauge also tracks accepted passes; the TV race
  hero remains the existing lap clock.
- Reduce Motion shows a static target instead of skipping the sequence to zero.
  The TV gauge now receives the app's override as well as the OS preference.
- The tab shell owns the top safe area so the portal ribbon appears below the
  iOS status bar; individual tabs no longer add the top inset a second time.
- Settings segments use their native text widths and measured indicator frames.
  This fixes invisible labels caused by flex children inside an intrinsic rail.
- `LinkPressable` keeps pressed-state style callbacks out of Expo Router's
  object-style merge. More, Garage, History, and linked detail/race controls keep
  their intended spacing, orientation, and press feedback.

Verified on the iPhone 17 Pro simulator (iOS 26.5) using the native app and its
debugger, with temporary controlled samples:

1. A 280 mph sweep continued while JavaScript was deliberately blocked for
   300ms (needle angle advanced from -20.6° to 107.9°), reached 117°, and returned
   to -135°. Car removal and a zero sample did not interrupt it.
2. A second 280 mph pass had a new pass ID and retriggered the sweep.
3. Race tracking held 180 mph through removal/zero notifications, then moved
   monotonically to 260 and down to 120 without returning to zero.
4. Reduce Motion immediately showed 240 mph and remained static beyond the
   ordinary sweep's hold duration.
5. Native screenshots checked Settings (including the Community section),
   the corrected segmented labels, and the tab safe area. These are simulator
   checks, not a physical-device frame-rate benchmark.

## Deliberately not migrated (out of scope by design)

- `app/tv.tsx` + `tv/TvStage.tsx` — the separate AirPlay-mirrored landscape
  layout is retained. The follow-up needle behavior changes are listed above.
- `components/CurrentCarHero.tsx` — superseded by `ActiveCarStrip` on Speed;
  kept only in case another caller appears (none currently render it).

## Swept in the consistency pass (now complete)

Every remaining screen is on the telemetry ramp: `app/live.tsx`,
`app/achievements.tsx`, `app/credits.tsx`, and `app/identify.tsx` were migrated
(grouped cards, hairlines, flame/electric accents, tabular numerals). So the
entire app except the TV surface now shares one design system.

## Not yet done (proposal items deferred)

- Full `GlassView` adoption on the tab bar / sheets (`GlassContainer` grouping)
  — the opaque fallback is the tested baseline; glass is progressive.
- Cropped `VelocityModule` arc (the proposal's optional replacement for the
  full dial) — the existing `Speedometer` geometry is retained and rethemed.
- Gesture-driven interactions (pull-for-live-log, trace scrubbing).
- iPad right-pane History detail (proposal notes the push route is acceptable
  initially to reduce risk).
