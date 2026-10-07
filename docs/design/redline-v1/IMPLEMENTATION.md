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
| RL-07 / #74 | [PR #94](https://github.com/burkben/HotWheelsID/pull/94), CI and Seed passed |
| RL-08 / #75 | [PR #95](https://github.com/burkben/HotWheelsID/pull/95) |
| RL-09 / #76 | [PR #96](https://github.com/burkben/HotWheelsID/pull/96) |
| RL-10 / #77 | [PR #97](https://github.com/burkben/HotWheelsID/pull/97) |
| RL-11 / #78 | [PR #98](https://github.com/burkben/HotWheelsID/pull/98) |
| RL-12 / #79 | [PR #99](https://github.com/burkben/HotWheelsID/pull/99) |
| RL-13 / #80 | [PR #100](https://github.com/burkben/HotWheelsID/pull/100) |
| RL-14 / #81 | [PR #101](https://github.com/burkben/HotWheelsID/pull/101) |
| RL-15 / #82 | [PR #102](https://github.com/burkben/HotWheelsID/pull/102) |
| RL-16 / #83 | [PR #103](https://github.com/burkben/HotWheelsID/pull/103) |
| RL-17 / #84 | [PR #104](https://github.com/burkben/HotWheelsID/pull/104) |
| RL-18 / #85 | This branch; see below |
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

## RL-08 — Live race

Branch: `redline/rl-08-race-live`, stacked on RL-07 for an isolated issue diff.

- Reworked `RaceProgress`: display lap header, green flag and total clock, skewed
  lap segments, source track/gate/chevrons, current timer/delta, timing tower, racer
  identity for lineup/heats, and the existing no-confirm early-finish action.
- Added `paceProjection` with a precomputed 201-point polyline and worklet-safe
  fraction/wrap/overflow projection. Ghost uses race best then car best; the chalk
  marker uses the last lap. Missing references hide markers. All are pace estimates.
- UI-thread clocks and marker worklets read the authoritative gate timestamp.
  `useTelemetryMotion` gates marker/fill/pulse motion and the 300 ms segment and
  220 ms row transitions. Measurement clocks continue with reduced motion.
- Added exact car/closing-time pass matching for gate speeds. Any missing/ambiguous
  match omits the entire column. Values respect current units/calibration.
- Shared `TimingRow` gains optional seconds formatting and explicit spoken
  faster/slower/tie labels; its existing clock default remains unchanged.
  `LiveLapList` supplies both phone and existing split-layout towers. The shared
  Results lap rows also adopt the tower; its complete redesign and leaderboard
  styling remain in RL-09.
- Added 26 pure tests covering projection, reference fallback, clock formatting,
  gate-speed matching and spoken deltas. Existing tests are untouched.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, web export, and all 439 mobile plus 69
  protocol tests pass. No dependencies or protected areas changed.
- [Ten visual captures, comparisons and reproduction](review/rl-08/README.md).
  Browser checks cover first-gate/first-lap/overflow states, clock and marker motion,
  app/OS static decoration, completion/row animation, targets, long timers, real
  demo passes, both layouts and immediate early finish without a dialog.
- Native Simulator captures demonstrate clock/marker progress while JS is blocked
  for 1.8 seconds. Native font and numeric clipping issues found during review were
  fixed. Physical frame-rate measurement, VoiceOver and hardware effects remain
  follow-ups; existing session cues/announcements are untouched.

### Decisions and deviations

- Computed totals/deltas replace the mockup's inconsistent sample arithmetic;
  identical last/best references legitimately place both markers together.
- The Race tab keeps navigation, status and demo actions. The standalone development
  fixture provides a direct artboard comparison. Countdown remains immersive.
- Unmatched gate speeds are omitted; reference-less markers are hidden. Under
  reduced motion decorative positions remain at the gate, while time still updates.
- Body content scrolls/wraps, buttons use safe skew margins, and long timers fit.
  Native review images use compact JPEG exports for the connector upload limit.

Next: RL-09 results, setup, lineup and tournament. RL-19 remains excluded.

## RL-09 — Race results, setup, lineup and tournament

Branch: `redline/rl-09-race-results`, stacked on RL-08 for an isolated issue diff.

- Reworked `RaceResults` with source checker/FINISH/stamp, three stats, real-ratio
  lap chart, derived car plate, improvement text, existing share summary and actions.
  The split layout reuses the same chart. Long numeric cells fit measured space.
- Added pure `records.ts` and `resultsPresentation.ts`: start-snapshot record
  comparisons, reliable pass-window speed/fallback, lap ratios, heat ranking and
  numeric sizing. 28 new tests; existing tests unchanged.
- The route snapshots the car's old best at GO and captures top speed at finish.
  No race engine, store shape, settings key or persistence change. Missing snapshots
  omit records; incomplete pass coverage uses AVG LAP.
- Restyled setup mode panels, lap chips, inset field and race car; pinned START RACE
  above the tab dock with existing callbacks. Readiness uses StatusChip; recovery
  text and Settings action remain available.
- Lineup panels retain add, assign, reorder, remove and rotate actions. Tournament
  uses SkewSwitch, actual ranked heat times and caution winner/champion treatments.
  `TimingRow` adds an optional ranking presentation while retaining its lap defaults.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, web export, and all 467 mobile plus 69
  protocol tests pass. Protected areas, TV, dependencies and existing tests untouched.
- [Eleven captures, reference comparison and reproduction](review/rl-09/README.md).
  Browser checks cover record variants, AVG LAP, share content, motion/app/OS gates,
  long times, pinned action geometry, a full solo race, queue reorder/remove/rotation,
  two tournament heats/champion/reset, and iPad split results with no console errors.
- Native Simulator results and setup inspected. Physical BLE/car swapping,
  VoiceOver, share sheet, keyboard avoidance, haptics and sound remain follow-ups.

### Decisions and deviations

- Source checker repeat means 16-point cells, while SPEC says 32-point squares.
  The exact source visual wins. Chart widths use computed ratios, not sample bars.
- Record detection uses the start snapshot, never the updated garage record.
  Speed requires contiguous retained race-window coverage, otherwise AVG LAP.
- Kept the existing shell, navigation and Done action; only countdown is immersive.
  Content scrolls and wraps, unknown plates use `?`, and skewed actions are inset.
- Fixed an OS-reduce-motion hydration snap by initializing motifs at their final
  positions. Also fixed web truncation of long result and lap values during review.

Next: RL-10 garage trading cards and series filters. RL-19 remains excluded.

## RL-10 — Garage trading cards and series filters

Branch: `redline/rl-10-garage`, stacked on RL-09.

- The Garage tab is now a two-up trading-card grid on phones; iPad keeps
  `useLayout().columns`. Each card has a photo bay (bundled `CarPhoto`, or a
  series-tinted `CarSilhouette` over rake lines and a road strip), a `Roundel` plate
  from `plateNumber`, name, series swatch and line, and best speed with
  "MPH BEST · N RACES". The on-portal card gets the 2 pt flame ring, 22 pt glow,
  speed streaks and a −14° ON PORTAL ribbon.
- Unidentified cars render as MYSTERY CAR cards: a dashed silhouette, a dashed "?"
  roundel and an electric "Tap to identify" line. They route to `/identify?uid=…`.
  Identified cards route to car detail.
- Series filters: an ALL chip plus one `FilterChip` per series present, sorted by count
  and then name. Pure `garage/series.ts` and `garage/cardModel.ts` (17 tests) cover
  derivation, the fixed colour order (flame, electric, caution, green, red), filtering,
  fallback when a selected series disappears, the record holder, and grid padding.
- `ScreenHeader` gains an optional `subtitle`; the right slot then aligns to the
  title block's bottom, as in the source. The empty state replaces the emoji with a
  `TrackLane` and an outline car, plus the spec copy.
- Store-free `GarageBoard` renders the tab and the `/dev/redline?section=garage`
  fixture (`photos=1`, `odd=1`, `empty=1`). No store, schema or settings change.

### Checks and visual evidence

- `npm ci`, typecheck, zero-warning lint, web export and all mobile/protocol tests pass.
- [Captures and browser checks](review/rl-10/README.md): reference comparison,
  bundled photos with an odd count, the empty state, iPad at 1024×768 and the real
  demo garage. The browser check covers filtering, aria-pressed state, card labels
  with spoken units, identified and mystery routing, and zero console errors.

### Decisions and deviations

- Equal-count series sort by name, so colours are stable between launches. The
  mockup's sample order differs, so the fixture's colours differ from the PNG.
- The garage's top best speed is shown in caution, as on the mockup's
  record-holding card. Ties all show caution; no recorded speed shows none.
- The mystery "?" sits in the plate slot instead of the centre so it never
  collides with the ON PORTAL ribbon. The on-portal car shifts 10 pt right
  (source offset) to clear the speed streaks.
- Photos fill the bay (`cover`). The bay grows with card width on iPad (≥ 118 pt,
  0.62 × width) so photos are not cropped to a thin strip.
- Mystery cards route to Identify as specified, so their detail page is no longer
  one tap from the Garage. After identifying, the card routes to detail.

Next: RL-11 car detail. RL-19 remains excluded.

## RL-11 — Car detail

Branch: `redline/rl-11-car-detail`, stacked on RL-10.

- Back link "‹ Garage" (falls back to the Garage when there is no history) and a
  static ON PORTAL tag in the on-portal status palette. It describes the car, not the
  portal connection, so it is not the tappable `StatusChip`.
- Full-bleed 218 pt hero bay: the bundled photo when artwork exists; otherwise rake
  lines, the 56 pt road with a flame edge and dashed lane, speed streaks and a 290 pt
  silhouette in the car's Garage series colour (dashed outline when unidentified).
  `RacePlate` (62×50) from `plateNumber` and a −14° toy-number ribbon. The CC BY-SA
  photo credit stays directly under the bay.
- Name (display 36), series swatch · wave, and an electric Change / Identify link to
  the existing picker. Unidentified cars keep the serial line and the casting-coverage
  hint.
- Best-speed panel with a caution top bar, the source's 240° mini arc filled to
  `bestMph / speedGauge.maxMph`, HUD 40 value and a caution GARAGE #n tag for the top
  three. The pure, tested `garage/rank.ts` uses shared places for ties and leaves cars
  without a speed unranked.
- Four stats (BEST LAP in electric, RACES, SCANS = detections, SEEN with "Now" on the
  portal), the nickname field (same save-on-blur/submit; a Save link shows while
  edited), and Catalog rows (toy number, wave, year) with the Source ↗ link.
- The missing-car state is restyled with a ghost "Back to Garage" button.
- Shared: `useGarageIdentities` (now used by the Garage too) and an optional `right`
  slot on `SectionHeader`.

### Checks and visual evidence

- Typecheck, zero-warning lint, web export and all tests pass.
- [Captures and browser checks](review/rl-11/README.md) cover the real demo flow:
  unidentified detail, identify as the '70 Charger (photo, FXB03, GARAGE #1),
  nickname saved and still there after leaving and returning, re-identify as a
  car without artwork (silhouette), and the missing-car state. No console errors.

### Decisions and deviations

- Photos fill the hero bay (`cover`). Road, streaks and silhouette draw only when
  there is no artwork, so they never sit on top of a photo.
- The bay is no longer the tap target for Change; the explicit Change link is.
- The old "Save name" button became a Save link that appears only while the field is
  edited. Saving on blur and submit is unchanged.
- The road uses `trackGrey` (#161C27) instead of the source's one-off #141A25.

## RL-12 — History list, 14-day strip and history detail

Branch: `redline/rl-12-history`, stacked on RL-11.

- `ScreenHeader` "HISTORY" with the electric Clear button (same confirm; it also
  drops cached sparklines).
- LAST 14 DAYS panel: 14 cells skewed −10°, coloured by the heat ramp, with weekday
  initials, a chalk ring on today, a "SESSIONS · PASSES" caption and the
  Fewer/More legend. It has one summarising accessibility label.
- Sessions grouped TODAY / THIS WEEK / EARLIER as 76 pt tickets: date tab, dashed
  perforation, start time with a green LIVE tag and top bar, "{n} passes ·
  {length}" ("so far" while live), sparkline and best speed. The all-time-best
  session's sparkline and value are caution.
- Sparklines are lazy and memoised per visible row from the existing
  `passesForSession`, keyed by id + pass count so live sessions refresh. Cache
  capped at 200. No repository or schema change.
- Pure, tested `history/heat.ts` (13 tests): local-day buckets built from date
  components, heat levels, totals, strip label, grouping, record sessions, date
  tabs, lengths and sparkline sampling. Tests pass under the local zone,
  Pacific/Auckland and UTC, plus explicit New York DST and Tokyo cases.
- History detail (no mockup): back/Share row, date title with time, PASSES /
  DURATION / BEST stats, the Speed screen's bar chart for the whole session (up to
  60 bars, summarised label), and TimingRow-style pass rows (number cell, time, car,
  mph; fastest in electric) linking to car detail.
- `SpeedTrace` gains an optional `limit` (default 14, Speed unchanged). A
  store-free `HistoryBoard` renders the tab and `/dev/redline?section=history`.

### Checks and visual evidence

- Typecheck, zero-warning lint, web export and all tests pass.
- [Captures and browser checks](review/rl-12/README.md): reference comparison,
  empty, iPad, the real demo session (live ticket with a loaded sparkline), session
  detail, and a pass linking to car detail. No console errors.

### Decisions and deviations

- THIS WEEK is the six days before today (a rolling week), so it does not depend on
  the locale's first weekday. This matches the mockup's grouping.
- The repository returns passes newest first. The detail list keeps that order but
  numbers passes from the first one; the chart and sparklines plot oldest → newest.
- Heat cells and totals come from real sessions. The mockup's sample counts don't
  match its own list, so the fixture's cells differ from the PNG.
- When two days tie for busiest, the label names the most recent.

## RL-13 — More, Trophy case and unlock banner

Branch: `redline/rl-13-trophies`, stacked on RL-12.

- More: `ScreenHeader` "MORE", Racing tools / App `SectionHeader`s, square `pitLane`
  groups with flame icons, Barlow titles, secondary subtitles and chevrons. The row
  formerly titled Achievements is now "Trophy case" and carries the caution/chalk
  kerb progress and an "8/13" count with a spoken "8 of 13 trophies unlocked".
- Trophy case: back link "‹ More", "TROPHY CASE" (display 46) with the caution count,
  an 8 pt caution/chalk `Kerb` progress bar (one progressbar label), the LATEST
  UNLOCK panel (featured flame `Medallion`, faint flames; hidden when nothing is
  unlocked), and SPEED / RACING / GARAGE groups with counts and a 4-column
  medallion grid. Locked tiles show HUD progress ("BEST 247/290", "64/100").
- `achievements/icons.ts` maps every catalog id to the SPEC §4.10
  MaterialCommunityIcons glyph. A test asserts every id has an icon and every icon
  exists in the bundled glyph map. The catalog's emoji `icon` field is unchanged.
- `TrophyUnlockBanner` (root layout, hidden on `/tv`) subscribes to the achievements
  store and shows each id the store stamps from `newlyUnlockedIds()`. It ignores the
  startup hydrate and resets. Banners queue, drop in with a spring, hold 2.5 s and
  rise out, and are static under reduce motion. Each one fires a gated success
  haptic and an announcement, and tapping opens the trophy case.
- Pure, tested `achievements/trophyPresentation.ts`: groups, progress lines, latest
  unlock, unlock diffing and the count label. Engine and store APIs unchanged.

### Checks and visual evidence

- Typecheck, zero-warning lint, web export and all tests pass.
- [Captures and browser checks](review/rl-13/README.md): reference comparison,
  nothing-unlocked state, a real banner, More, and the demo trophy case. On the
  live demo, every real unlock (2–4 per run; demo speeds are random) showed exactly
  one banner, in order, at least 3 s apart, matching the More count. No console
  errors.

### Decisions and deviations

- Medallions follow catalog order and the SPEC icon table, so a few positions and
  glyphs differ from the mockup (e.g. Sub-3 Lap is last in RACING).
- When one stats refresh unlocks several trophies at the same time, the later
  catalog entry is the "latest", matching the last banner shown.
- Web always runs the demo portal, so fixture captures hide the live banner.
- The More row title changed from "Achievements" to "Trophy case" to match the
  screen it opens. RL-17 updates the release doc's wording.

## RL-14 — Settings restyle and portal card

Branch: `redline/rl-14-settings`, stacked on RL-13.

- Back link "‹ More" and `screenTitle` SETTINGS via `ScreenHeader`.
- Portal card: a 5 pt green/asphalt `Kerb` when connected, caution/asphalt while
  searching, `steel` when idle; the source's portal-arch glyph; the tone eyebrow;
  "RACE PORTAL" (or "DEMO MODE") with its hint; and a compact skewed ghost button.
  The button uses `usePortalStatusAction`, so connect / retry / confirm-disconnect
  behave exactly like the status chip. A pure, tested `settings/presentation.ts`
  maps the shared `portalStatusPresentation` to the card. Trigger-a-sample-pass
  (demo) and Connection details stay as rows under the card.
- Numbered sections 01 PROFILE … 07 SYSTEM. The player name is now an always-visible
  150 pt inset field on the row (same blur/submit commit and hydration guard).
  Default laps uses `CompactStepper` over the existing `LAP_OPTIONS`. Units use the
  skewed segments, calibration the stepper with its hint. Haptics, sound, reduce
  motion and start in demo mode use `SkewSwitch`, with their explanations kept as
  accessibility hints. Community rows and Reset (own group, same confirm) follow.
- Footer: 60 % `Wordmark`, "VERSION x.y.z (build) · CREDITS" from `expo-constants`
  (the build is omitted when the config has none), and the Mattel disclaimer.
- `RaceButton` gains an additive `compact` size (44 pt target, 15 pt label, 1 pt
  ghost border) for inline actions.
- No settings key, store API or persistence change.

### Checks and visual evidence

- Typecheck, zero-warning lint, web export and all tests pass, including the
  existing settings store tests.
- [Captures and browser checks](review/rl-14/README.md): full-length comparison
  and the paused portal card. The browser check covers section order; switch,
  unit and laps changes reflected in state; the name commit; disconnect through
  the shared confirm, then reconnect; and Speed showing SCALE KM/H afterwards. No
  console errors.

### Decisions and deviations

- Default laps moves from a segmented control to the spec's stepper over the same
  options.
- Toggle hints are spoken rather than printed, matching the mockup's single-line
  rows. The demo-mode hint prints only when Bluetooth is unavailable, because it
  explains why the switch is locked.
- Demo trigger and Connection details rows are kept (the mockup omits them) so no
  existing action is lost.
- The calibration value keeps the existing `formatCalibration` output ("×1.00").

## RL-15 — Remaining surfaces, banners, empty states and splash

Branch: `redline/rl-15-surfaces`, stacked on RL-14.

- Live portal: `ScreenHeader` "LIVE PORTAL" (back to More) with the `StatusChip`.
  Notices use a new shared `Notice` panel (pitLane, 3 pt tone bar, HUD eyebrow,
  body). Stats are `StatCell`s. Log rows are a new `LiveLogRow`: HUD timestamp, a
  skewed EVENT/INFO/ERROR tag in chip colours, and the payload in HUD medium.
- Credits: `ScreenHeader`, `SectionHeader`s and square pitLane panels. All provenance,
  license, font-license and privacy content and links are unchanged; links now meet
  44 pt.
- Identify: `ScreenHeader` with Done. Mode, year and wave use the Redline
  `FilterChip` in horizontal rows, with an inset search field. Catalog cards use the
  Garage card info layout (photo bay with a toy-number ribbon, display-800 name,
  meta lines, wiki link). Confirm and Undo use Redline panels and compact buttons.
  Every action and the confirm/undo flow are unchanged.
- `BleStatusBanner` and `PersistenceStatusBanner`: pitLane with a 3 pt tone bar, HUD
  eyebrow and body. Same copy, actions and live-region roles.
- Emoji: the last UI emoji (the `CarPhoto` no-artwork placeholder) is now the dashed
  "?" roundel. A code-point grep finds emoji only in the achievements catalog data
  (kept by design) and a BLE debug log string.
- Splash: `expo-splash-screen` background `#07090F` with the icon's track glyph
  (`assets/images/splash-icon.svg`, clipped to the icon tile, transparent), 160 pt
  wide on iOS and Android. `npm run assets:images --workspace mobile` exports it
  with the new devDependency `@resvg/resvg-js`; `-- --check` verifies the PNG is
  byte-identical to a fresh export. TV mode is untouched.

### Checks and visual evidence

- Typecheck, zero-warning lint, web export and all tests pass.
- [Captures and browser checks](review/rl-15/README.md): Live (real web state and a
  log fixture), Credits with the font license expanded, Identify (catalog, a
  no-artwork placeholder, confirm → saved → undo, the year filter), the web
  persistence banner, and the splash glyph composited at its configured size. No
  console errors.

### Decisions and deviations

- Demo mode does not write to the BLE event log (unchanged), so log styling is
  reviewed with `/dev/redline?section=live-log` sample rows.
- `BleStatusBanner` appears on Speed only for native Bluetooth faults, which web
  cannot produce, so the fixture renders it in its powered-off and error states.
- The splash glyph keeps the icon tile's rounded clip. On the asphalt background
  only the track and finish line read. A native splash can't be captured on web;
  `splash-preview.png` composites the exported PNG at 160 pt on #07090F.
- `@resvg/resvg-js` is a Node build tool (devDependency only). It is never bundled
  into the app and adds no native module.

## RL-16 — App icon (iOS and Android)

Branch: `redline/rl-16-app-icon`, stacked on RL-15.

- `apps/mobile/assets/images/icon.svg` is the Track master from `source/Icon.dc.html`:
  full-bleed, square, filled `#07090F`, with no `rx` mask. `icon.png` is exported at
  1024 × 1024 as **8-bit RGB with no alpha channel**. resvg always writes RGBA, so
  the export script re-encodes opaque targets with Node's zlib. The re-encode
  throws if any pixel is not fully opaque.
- Android adaptive icon: the foreground is the artwork on transparent, scaled into
  the central 66 % (72 of 108 dp) and clipped there. The background is solid
  `#07090F`. The monochrome version is the track silhouette only. `app.json`
  `adaptiveIcon.backgroundColor` is now `#07090F`.
- Favicon (48 px) from the same master on its rounded board tile.
- One reproducible pipeline: `npm run assets:images --workspace mobile` writes all six
  PNGs (icon, three Android layers, favicon, splash) from their committed SVGs, and
  `-- --check` confirms each PNG matches a fresh export byte for byte (all six pass).
- `src/brand/appIcon.test.ts` probes the shipped PNGs: icon 1024², bit depth 8,
  colour type 2 (RGB, no alpha), asphalt at the corners (no rounded mask). It also
  checks transparency on the Android foreground/monochrome, the opaque background,
  and the favicon size.

### Checks and visual evidence

- Typecheck, zero-warning lint, web export, all tests and `assets:images -- --check`
  pass.
- [Icon set](review/rl-16/icon-set.png): the full-bleed 1024 master; Android adaptive
  under a circle mask; the themed monochrome; iOS-masked previews at 180/120/87/58/40.

### Decisions and deviations

- A single 1024 master ships for iOS, as SPEC §5 allows. The board's small-size
  detail drops are intent only.
- Byte-exact regeneration is a local script check, not a CI unit test: rasteriser
  SIMD paths can differ across CPU architectures, so CI only probes the committed
  PNGs.
- Alternate icons (RL-19) remain out of scope.

## RL-17 — App Store screenshot pipeline and submission doc

Branch: `redline/rl-17-store-screenshots`, stacked on RL-16.

- `docs/release/screenshots/frames.html` reproduces Store01–06: headline (display 64),
  wordmark or HUD eyebrow, the frame's background and single motif, the 324 × 678
  bezel with Dynamic Island, and the phone bleeding toward the bottom. It also has an
  iPad landscape layout with the same headline system and a 4:3 landscape bezel. It
  uses the bundled fonts from `docs/design/redline-v1/static/fonts/`.
- `render.cjs` (Playwright) composites `captures/iphone/01–06.png` and
  `captures/ipad/01–06.png` at exact App Store Connect sizes. It re-encodes each PNG
  as 8-bit RGB without alpha, and fails on a missing capture, a transparent pixel, a
  wrong size, or "Hot Wheels"/"Mattel" text in a frame.
- **Sizes checked against App Store Connect (October 2026):** the iPhone requirement
  is now the Dynamic Island *medium* display, 1206 × 2622 (1179 × 2556 also
  accepted); 6.9" 1320 × 2868 is optional; iPad 13" is required while iPad is
  supported (2752 × 2064 landscape). The mockups' 6.7" 1290 × 2796 is no longer
  the required size.
- `sample-captures.cjs` makes stand-in captures from the Expo web build at those
  device pixel sizes, so the pipeline can be verified without a simulator.
- `docs/release/app-store-submission.md`: a new screenshot section (sizes, the final
  six-frame order and captions, reconciliation with the old lineup/tournament/TV
  set, capture and no-Mattel-marks rules, CC BY-SA guidance). The review notes now
  point at the RL-14 Settings layout (Start in demo mode, portal card), and
  "Achievements" reads "Trophy case".

### Checks and visual evidence

- One run over stand-in captures rendered all 18 frames (6 × three sizes), each the
  exact pixel size and RGB without alpha.
- [iPhone frames vs the reference PNGs](review/rl-17/iphone-vs-reference.jpg),
  [iPad landscape set](review/rl-17/ipad-landscape.jpg), and a
  [full-size 1206 × 2622 frame](review/rl-17/04-beat-your-best-1206x2622.jpg).

### Decisions and deviations

- The iPhone stage keeps the artboard's 430 pt width and grows in height to the
  output aspect, so every element keeps its artboard position.
- iPad uses one landscape set: App Store Connect accepts either orientation, and
  landscape shows the two-pane layout.
- Lineup, tournament and TV-preview shots leave the set. They are covered by the
  description copy and the iPad Race frames; TV keeps its legacy look in V1.
- Stand-in captures come from review fixtures without safe-area insets, so some
  clip under the island. Real simulator captures include the status bar.
- Follow-up: capture the real set on the iPhone 17 Pro and iPad Pro 13" simulators
  against the release build, then render.

## RL-18 — Design docs

Branch: `redline/rl-18-design-docs`, stacked on RL-17.

- `docs/architecture/design-language.md` now describes the Redline system: principles,
  colour, type, shape and skew, depth, the trackside kit, the icon vocabulary (including
  the achievement icon map), navigation, components, motion, haptics, connection UX,
  accessibility and voice. It marks the Trackside tokens **legacy (TV only)**.
- New [ADR-0016](../../adr/0016-redline-v1-visual-identity.md): bundled fonts, additive
  tokens, square panels and the skew language, the gauge variant, TV on legacy, honest
  data, icons over emoji, reproducible brand assets. ADR index rows added for 0015
  (missing before) and 0016.
- `docs/design/ui-overhaul/README.md` points at `docs/design/redline-v1/` as the current
  direction. The redline-v1 README status is updated.

## Summary

| Issue | State | Notes |
| --- | --- | --- |
| RL-01 – RL-16 | Done | Each in its own stacked PR with checks and review evidence above. |
| RL-17 | Done (pipeline) | Template, render script and doc are complete and verified on stand-in captures. The real simulator capture pass is a release-time follow-up. |
| RL-18 | Done | This section. |
| RL-19 | Not started | Needs a native module and owner approval. |

**Open follow-ups across the epic** (device or release-time, not code gaps):

- On-device checks: VoiceOver, haptic and sound feel, keyboard avoidance (car-detail
  nickname, Settings player name), frame rate during races, physical BLE car swapping and
  share sheets.
- Native rebuild to see the splash glyph and new icons; confirm them in App Store Connect.
- Capture the six store frames on iPhone 17 Pro and iPad Pro 13" simulators against the
  release build, then run `docs/release/screenshots/render.cjs`. Re-check App Store
  Connect's required sizes first.
- PRs are stacked (#88 → #105). Merge in order, retargeting each PR to `main` once its base
  merges.

