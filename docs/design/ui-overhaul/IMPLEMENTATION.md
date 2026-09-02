# UI Overhaul — Implementation Status

**Selected direction: [Proposal B — Trackside Telemetry](02-proposal-trackside-telemetry.md)**
(chosen by the project owner after reviewing the three animated mocks in
[`index.html`](index.html)).

This file tracks the rollout of that proposal into `apps/mobile`. It is the
living counterpart to the proposal; the proposal remains the design intent.

## What's implemented (branch `burkben/ui-overhaul-proposals`)

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

**Verification:** `tsc --noEmit` clean (only 4 pre-existing `vitest.config.ts`
URL-type errors that exist on `main`), `eslint --max-warnings=0` clean, and
**318/318 tests pass** (40 files). No store, protocol, BLE, persistence, or TV
contract was changed.

## Deliberately not migrated yet (out of the first pass)

These remain on the legacy ramp without clashing with the new shell; they're
lower-traffic or a separate surface. Easy follow-ups:

- `app/tv.tsx` + `tv/TvStage.tsx` — the separate AirPlay-mirrored landscape
  surface; **intentionally untouched** per the proposal's "what stays the same".
- `app/live.tsx`, `app/achievements.tsx`, `app/credits.tsx`, `app/identify.tsx`
  — secondary pushed screens (raw log, badges, credits, identify picker).
- `components/CurrentCarHero.tsx` — superseded by `ActiveCarStrip` on Speed;
  kept for any other callers until those are confirmed migrated.

## Not yet done (proposal items deferred)

- Full `GlassView` adoption on the tab bar / sheets (`GlassContainer` grouping)
  — the opaque fallback is the tested baseline; glass is progressive.
- Cropped `VelocityModule` arc (the proposal's optional replacement for the
  full dial) — the existing `Speedometer` geometry is retained and rethemed.
- Gesture-driven interactions (pull-for-live-log, trace scrubbing).
- iPad right-pane History detail (proposal notes the push route is acceptable
  initially to reduce risk).
