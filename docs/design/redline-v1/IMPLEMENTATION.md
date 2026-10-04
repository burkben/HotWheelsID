# Redline V1 implementation

The [spec](SPEC.md) and [issue Definition of Done](ISSUES.md#definition-of-done-applies-to-every-issue)
govern this rollout. GitHub [epic #67](https://github.com/burkben/HotWheelsID/issues/67)
is the source of truth for merge status. Each issue has its own branch and PR.

| Issue | Implementation status |
| --- | --- |
| RL-01 / #68 | [PR #88](https://github.com/burkben/HotWheelsID/pull/88), CI and Seed passed |
| RL-02 / #69 | [PR #89](https://github.com/burkben/HotWheelsID/pull/89), CI and Seed passed |
| RL-03 / #70 | Implemented; review evidence below |
| RL-04–RL-18 / #71–#85 | Pending, in order |
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
