# Redline V1 implementation

The [spec](SPEC.md) and [issue Definition of Done](ISSUES.md#definition-of-done-applies-to-every-issue)
govern this rollout. GitHub [epic #67](https://github.com/burkben/HotWheelsID/issues/67)
is the source of truth for merge status. Each issue has its own branch and PR.

| Issue | Implementation status |
| --- | --- |
| RL-01 / #68 | [PR #88](https://github.com/burkben/HotWheelsID/pull/88), CI and Seed passed |
| RL-02 / #69 | [PR #89](https://github.com/burkben/HotWheelsID/pull/89), CI and Seed passed |
| RL-03 / #70 | [PR #90](https://github.com/burkben/HotWheelsID/pull/90), CI and Seed passed |
| RL-04 / #71 | [PR #91](https://github.com/burkben/HotWheelsID/pull/91), CI and Seed passed |
| RL-05 / #72 | [PR #92](https://github.com/burkben/HotWheelsID/pull/92), CI and Seed passed |
| RL-06 / #73 | [PR #93](https://github.com/burkben/HotWheelsID/pull/93), CI and Seed passed |
| RL-07 / #74 | Implemented; review evidence below |
| RL-08–RL-18 / #75–#85 | Pending, in order |
| RL-19 / #86 | Out of scope; not started |

## RL-01 — tokens and bundled fonts

Branch: `redline/rl-01-tokens-fonts`, based on `main` after the design handoff merged.

- Added `colorsR` (including status fills, heat ramp and zone colours), `fontR`,
  `radiusR`, `skewR`, and the 17 `typeR` variants. Existing tokens and speed-zone
  boundaries are unchanged.
- Added only the three JS-only Google Fonts packages, with ten face-specific imports
  so unused weights do not enter the export. Font loading uses the existing
  `expo-font` and `expo-splash-screen`; success or failure releases the splash.
- Added `RText`, which resolves flattened style overrides without `fontWeight` or
  `fontStyle`, and removes `fontFamily` after a load failure. Body text scales;
  display/HUD defaults to a 1.3× cap. Numeric styles use tabular figures.
- Added font copyright notices and full OFL texts to `THIRD_PARTY_NOTICES.md` and
  bundled them for offline reading in Credits.
- Added `/dev/redline`, guarded by `__DEV__` with no navigation entry. It shows the
  palette, every type variant and all ten faces. Production access redirects home.

### Checks and visual evidence

- `npm ci`: passed. The only new dependencies are the three font packages.
- `npm run typecheck`: passed for both workspaces.
- `npm test`: 354 mobile tests and 69 protocol tests passed, including 36 new
  text-resolution cases. Existing tests were not edited.
- `npm run lint --workspace mobile`: passed with zero warnings.
- `npm run web:export --workspace mobile`: passed, 21 routes; exactly ten Redline
  TTF assets exported. The extra route is the development gallery's home redirect.
- Playwright, 390×844 at 2×: inspected all 17 variants and ten loaded faces, verified
  no additional bold/italic synthesis, opened the font licenses offline, and
  deliberately failed font requests to verify the system-font fallback.
- iPhone 17 Pro simulator, iOS 26.5: the existing development client opens the
  gallery with bundled fonts loaded. Native palette and display glyphs agree with
  web and the reference. The Simulator GUI is unavailable in this environment, so
  remaining native specimens were not scrolled for visual inspection. Native splash
  appearance in a release build, VoiceOver,
  physical BLE, haptics, and glass were not validated by this foundation change.
- [Review images and reproduction instructions](review/rl-01/README.md), compared
  with [Main.png](png/Main.png), especially “Paint & tarmac” and “Type on the move”.
- Production web smoke check: `/dev/redline` redirects home, Speed runs in demo
  mode with its existing design, and `/tv` renders its needle gauge.
- Protected paths, store shapes, schema, settings keys, TV code, and existing tests
  have no changes.

### Decisions and deviations

- The gallery adapts the wide identity sheet into a phone column. It verifies
  tokens and faces, not a production-screen redesign. Credits has no reference
  PNG; this issue adds only its font-license card. The Credits restyle is RL-15.
- Where the scale gives several sizes, tokens use the primary screen size; callers
  can choose another specified size. CSS line-height ratios become point values.
  Unspecified line heights use 1.2×. Added plate-size and lap-bar variants retain
  the exact geometry needed by subsequent issues.
- Font-load failure uses regular system text. This deliberately sacrifices the
  racing face so the app stays usable even when bundled fonts cannot load.
- The current `main` already removed the global portal ribbon (PR #66). RL-04 must
  reconcile that current shell with the handoff while preserving controller APIs.

Next: RL-02 motif primitives and the pure, tested race-plate derivation. RL-19 remains excluded.

## RL-02 — motif primitives

Branch: `redline/rl-02-motif-primitives`. Stacked on RL-01 so its PR contains only
this issue's changes; retarget to main after the dependency merges.

- Added fourteen primitives and the `components/redline/index.ts` barrel:
  `Kerb`, `Checker`, `RakeLines`, `TrackLane`, `RacePlate`, `Roundel`, `StartLights`,
  `SpeedStreaks`, `Chevrons`, `FlameTongues`, `CarSilhouette`, `Medallion`, `Wordmark`,
  and `SkewBox`. SVG patterns have unique IDs; the specified car, chevron, flame and
  hexagon paths are copied verbatim from the source artboards.
- All motifs are static and hidden from accessibility. Web uses ARIA rather than
  forwarding native-only accessibility props into SVG DOM nodes. Screen owners
  will supply semantic labels and gate their animations through `useTelemetryMotion`.
- `SkewBox` counter-skews its content. Race plates support the four source sizes;
  start lights support the identity sheet's strip and Countdown's three-pod gantry.
- Added pure `garage/plateNumber.ts`: firstSeen order, UID tie-break, two-digit
  minimum, and `?` for a missing car. It never mutates the store array or persists
  a number. Five tests cover ordering, ties, missing/empty data, immutability, and
  100-car numbering.
- `/dev/redline?section=motifs` renders all primitives and their alternate states;
  it remains outside production navigation and redirects home in release builds.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, and web export pass. All 359 mobile and
  69 protocol tests pass; no existing test was changed.
- Playwright at 390×844 @2× and a wide four-column capture: no page or console
  errors, five unique SVG pattern IDs, and all sixteen gallery SVGs hidden from
  accessibility. [Captures and comparison](review/rl-02/README.md).
- Compared with Main's Trackside kit, Speed's flames/wordmark, Countdown's gantry,
  and Achievements' medallions. Physical-device effects and VoiceOver still need
  device checks; this issue adds no animation, haptic, or sound behavior.
- iPhone 17 Pro simulator: first viewport checked with native fonts and SVGs. Fixed
  iOS clipping of rotated pattern tiles by drawing the diagonals inside unrotated
  tiles. Lower native specimens remain unchecked because Simulator GUI scrolling
  is unavailable; the complete gallery is captured on web.
- Protected paths, persistence, TV, settings, existing tests, and dependencies
  remain unchanged.

### Decisions and deviations

- Phone specimens stack the identity board's four columns into two. The gallery
  uses smaller lamps/plates so they fit; components retain the full source sizes.
- Flames deliberately use the Speed artboard's two 120×96 clusters as SPEC §2
  requires; Main's larger demonstration flame drawing is different.
- Missing cars display `?`, matching the unknown-plate motif. Equal timestamps use
  UID lexical order so receiving another detection does not reshuffle plates.
- `SkewBox` is decorative, like the other motifs. Interactive callers must place
  the accessible pressable and its label outside it (RL-03).

Next: RL-03 controls and building blocks. RL-19 remains excluded.

## RL-03 — controls and building blocks

Branch: `redline/rl-03-controls`, stacked on RL-02 for an isolated issue diff.

- Added `RaceButton`, `StatusChip`, `SectionHeader`, `ScreenHeader`, `TimingRow`,
  `FilterChip`, and `SkewSwitch`, exported through the Redline barrel.
- Restyled `TelemetryValue` (with `StatCell`/`StatRow` exports),
  `TelemetrySegmentedControl`, `CompactStepper`, and the settings row/group/section
  components. Existing props and callbacks remain supported. Optional stat labels,
  accent bars, and section numbers support the later screen issues.
- Moved the existing pill action policy into `usePortalStatusAction`, shared by
  `StatusPill` and `StatusChip`. Controller selectors, disconnect confirmation,
  haptic settings checks, and callbacks retain their existing behavior.
- Added pure status presentation and timing/spoken-unit helpers with 19 tests.
  Missing timing stays unavailable; gate speed is omitted when absent.
- Added every component/state to the development gallery, including disabled
  controls, slower/faster/fastest/running timing, errors, and disconnect states.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, and web export pass. All 378 mobile and
  69 protocol tests pass. Existing tests and dependencies are unchanged.
- [Phone, wide, and iOS screenshots with reference comparisons](review/rl-03/README.md).
  Main's Pit equipment and Settings source/PNG were inspected. Speed's shared stat
  readout still fits its current cards; TV still renders its legacy needle gauge.
- Playwright checks every gallery control at ≥44 pt, full-width skew insets, button
  presses, status connect/retry/disconnect confirmation, keyboard switch toggling,
  segment/filter selection, stepper bounds, and instant knob movement under both
  app and OS reduced motion. Zero browser errors.
- Native first viewport inspected. Full native scrolling, VoiceOver, BLE, and
  physical feedback remain unverified; no native-only behavior was introduced.
- Protected paths, store shapes, persistence, settings keys, and TV are untouched.

### Decisions and deviations

- Compact visible controls are centered in real 44 pt targets. Full-width button
  margins use the measured height × tan(12°), so wrapped labels remain contained.
- Existing readout-only `TelemetryValue` callers retain their parent panel's
  padding. `StatCell` provides the complete new panel; RL-05 adopts it on Speed.
- The segmented control's optional `accent` prop remains accepted; selected
  segments now use the specified chalk fill. Existing measured label widths and
  reduce-motion behavior remain in place.
- Explicit ARIA state accompanies native accessibility state because the installed
  RN Web ignores `accessibilityState.checked/selected`. Space-key handling is added
  for switch/tab roles, which RN Web does not activate with Space by default.
- Error labels and their red fault treatment remain available beyond the four
  artboard tones. Gallery values are examples only and never enter stores.

Next: RL-04 app shell, tab bar, and portal status. RL-19 remains excluded.

## RL-04 — app shell, tab bar, and portal status

Branch: `redline/rl-04-app-shell`, stacked on RL-03 for an isolated issue diff.

- Restyled the five-tab shell with condensed italic labels, existing icons, a
  flame skewed underline, and actual bottom/side safe-area insets. Navigation
  press/long-press events and routes are preserved. Indicator motion uses the
  existing reduced-motion hook; app and OS flags both snap it to its destination.
- Speed now carries the Redline wordmark and shared status chip. Garage, History,
  Race, and More use the shared screen header; Garage's count is derived from cars.
- Restored `PortalStatusRibbon` on non-Speed tabs using public controller selectors
  and actions. It shares the connect/retry/disconnect confirmation behavior of the
  header chip. Native announcements remain, with focus gating to avoid duplicate
  announcements from inactive screens. Status text has a web-only polite live region.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, and web export pass. All 378 mobile and
  69 protocol tests pass; no existing test or dependency changed.
- [Web, iOS and TV captures with comparisons](review/rl-04/README.md).
  Speed, Garage, History, Race, Countdown, and Achievements references were inspected
  for the shell/header language. Playwright verifies all five routes and 44 pt
  targets, selected states, keyboard activation, status actions/announcements,
  both reduced-motion flags, and TV isolation. Zero browser errors.
- iOS Speed and Garage confirm fonts, header, ribbon and native safe-area placement.
  VoiceOver and physical BLE/feedback remain unverified.
- Protected paths, store shapes, schema, settings keys, and TV code are untouched.

### Decisions and deviations

- RL-04 explicitly requires the ribbon despite its removal by PR #66. It is restored
  only on non-Speed tabs, at 44 pt for accessibility; the mockups omit this channel.
- Native safe-area dimensions replace the mockups' fixed bottom spacer. Web keeps
  the existing browser-session persistence notice. Full screen bodies are assigned
  to subsequent issues, so these captures deliberately show mixed old/new surfaces.
- RN Web's announcement API is a no-op in the installed version; the live-region
  fallback makes visible status updates available to browser assistive technology.

Next: RL-05 Speed and the Redline gauge. RL-19 remains excluded.

## RL-05 — Speed and Redline gauge

Branch: `redline/rl-05-speed-gauge`, stacked on RL-04 for an isolated issue diff.

- Added the optional `redline` Speedometer renderer; `needle` remains the default.
  Its 240° progress arc, comet, and flame opacity derive from the existing shared
  animation value. The ascent/hold/spring sequence and pass-ID dependencies are
  unchanged. The NEW BEST tag springs from 0.8 to 1 per accepted best pass.
  All new motion uses `useTelemetryMotion`.
- Restyled Speed with rake lines, the gauge above a linked race-plate car card,
  LAST/BEST/PASSES cells, and 14 recent-pass bars. iPad keeps two panes with details
  on the right. Artwork comes from `CarPhoto`; unknown cars use `CarSilhouette`.
- Added 22 pure tests for angles/endpoints, heat, bar colors, tied session bests,
  and an honest caption for the bounded pass buffer. Existing tests are untouched.
- Added a controlled, development-only gauge gallery, independent of app data.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, and web export pass. All 400 mobile and
  69 protocol tests pass. No dependency or protected-path changes.
- [Reference comparisons, native captures and reproduction](review/rl-05/README.md).
  Playwright records the 280 mph sweep/retrigger, hold/return, track up/down/hold,
  arc-tip correspondence, full flame opacity, app/OS static targets, km/h labels,
  chart colors, car navigation, iPad layout, and unchanged TV needle.
- Native Speed and static 280 screenshots inspected. Fixed native readout shrinking
  discovered during this check. Native JS-blocking performance was not re-measured;
  VoiceOver and physical-device effects remain follow-ups.

### Decisions and deviations

- The pass store is capped at 20. Once full, the PASSES unit says RECENT instead of
  claiming an unavailable total session count. Store shape and behavior are intact.
- Tied bests follow the source/existing haptic treatment. Glow uses layered SVG
  strokes. Unknown demo identity is displayed honestly; no sample identity is added.
- The recent-pass chart replaces the old list. Empty chart slots reserve room for
  future readings. Scrollable layout accommodates accessible controls, text and
  real safe areas instead of copying fixed artboard positioning.

Next: RL-06 Find your portal state. RL-19 remains excluded.

## RL-06 — Find your portal state

Branch: `redline/rl-06-connect-state`, stacked on RL-05 for an isolated issue diff.

- Added a pure, six-case-tested selector for the empty disconnected live session.
  Speed shows `FindPortal` until connected, a current car/pass exists, or demo mode
  is selected. It adds no route, store field, setting, or persisted onboarding flag.
- Added the source SVG portal/radar/track illustration, shared kerb, wordmark,
  heading, searching chip, setup tiles, and full-width ghost demo action.
- Radar rings pulse over 2.4 seconds and the dashed ring rotates every 20 seconds.
  The shared motion hook stops both under app or OS reduced motion; cleanup cancels
  both loops. Decorative artwork is hidden from accessibility.
- Fault states read the existing `bleStatusBanner` mapping and preserve its complete
  copy and retry/device-settings actions. `StatusChip` gains an optional visual
  label for the source's SEARCHING… text; its action/semantic policy is unchanged.
- The demo button invokes `controller.setMode('demo')`. Existing Speed status/car
  announcements and haptic gates are retained.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, and web export pass. All 406 mobile and
  69 protocol tests pass. Existing tests and dependencies are untouched.
- [Web/iOS screenshots and source comparison](review/rl-06/README.md). Playwright
  verifies searching/fault states, retry, Settings affordance, real demo action,
  ≥44 pt targets/skew inset, decorative semantics, and app/OS motion gates.
- The production controller forces demo on web/Simulator, so the live states use an
  isolated development fixture. Native first viewport inspected; physical BLE,
  permission/Settings handoff and VoiceOver remain device follow-ups.
- Protected paths, store shapes, schema, settings keys, and TV are unchanged.

### Decisions and deviations

- Scanning/connecting retain the hero; establishing a connection hides it. This
  reconciles the searching artboard with the issue's connection acceptance wording.
- Existing tab navigation remains because this is a Speed state. Content scrolls
  for complete fault copy, real safe areas, scalable text, and 44 pt controls.
- A manually disconnected session offers reconnection through the status chip and
  says so, rather than claiming that the controller will connect automatically.

Next: RL-07 race countdown. RL-19 remains excluded.

## RL-07 — Race countdown

Branch: `redline/rl-07-countdown`, stacked on RL-06 for an isolated issue diff.

- Replaced `RaceCountdown` presentation with the source gantry, 320 pt digit and
  outline echoes, cancel/header, racer/next-up rows, and checker start strip.
- Added optional glow animation to shared `StartLights`; countdown digit spring,
  echo slide, and lamp bloom all use the shared OS/app motion gate.
- Added seven pure tests for countdown-to-light mapping and player/car best laps.
  Plate and history are derived from existing data; missing values stay unavailable.
- Integrated an immersive core Modal and a 400 ms GO presentation after the existing
  start call. `useRaceSession`, its 800 ms ticks, announcements, haptics and sound
  remain unchanged. Racing/gate timing begins normally under the brief GO overlay.
- Added an isolated development gallery and browser verification script.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, web export, and all 413 mobile plus 69
  protocol tests pass. Existing tests, dependencies and protected paths are unchanged.
- [Reference comparison and six captures](review/rl-07/README.md): count 2 and GO
  on web/iOS, actual demo race, and iPad layout. Browser checks cover light mapping,
  spring/slide/glow, both reduced-motion flags, announcements and cancellation.
- Native fonts/outlines/glow verified in Simulator. VoiceOver, native modal focus,
  sound, haptics and physical BLE remain device follow-ups.

### Decisions and deviations

- The old hook changes directly from 1 to racing. The local GO overlay supplies the
  specified zero state without delaying the race engine or changing cue behavior.
- Scrollable content and actual safe areas replace fixed artboard coordinates.
  Unknown car plates show `?`; absent bests show `—`; next-up is conditional.
- SVG text uses equivalent native OpenType/web CSS tabular-number settings. GO
  echoes turn green and may extend offscreen, while the main word remains visible.

Next: RL-08 race live. RL-19 remains excluded.
