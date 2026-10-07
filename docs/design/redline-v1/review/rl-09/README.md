# RL-09 results, setup, lineup and tournament review

Reference: [Results.png](../../png/Results.png),
[Results.dc.html](../../source/Results.dc.html), SPEC §4.3 and §4.6.
Setup, lineup and tournament have no separate mockups.

| Capture | Coverage |
| --- | --- |
| [Results comparison](results-web.png) | 390×844 @2×, exact source lap values and total, record improvement, top-speed fixture. |
| [Tie and fallback](results-tie-fallback-web.png) | No record stamp or improvement; AVG LAP replaces unavailable speed. |
| [Long times](results-long-times-web.jpg) | Measured numeric sizing keeps full values visible. |
| [Setup](setup-web.png) | Mode panels, chips, player field, derived plate, pinned START RACE. |
| [Real demo result](demo-results-web.jpg) | Existing engine completes five laps, real pass-window top speed and first record. |
| [Rotated lineup](lineup-web.jpg) | Reordered queue advanced to Cy, real car assignment, pinned action. |
| [Tournament bracket](bracket-web.jpg) | Actual heat totals ranked, winner identified with text and caution. |
| [Champion](champion-web.jpg) | Completed two-racer tournament, reset action and saved leaderboard. |
| [Split results](results-ipad-web.jpg) | 1024×768 @2×, lap chart and ranking in the right pane. |
| [Native results](results-ios.jpg) | iPhone 17 Pro / iOS 26.5; bundled fonts, checker, stamp, chart and actions. |
| [Native setup](setup-ios.jpg) | Safe areas, controls, car fallback and pinned action above the dock. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-09.cjs`
with Playwright on `NODE_PATH` and Expo on port 8082. [Browser evidence](browser-checks.json)
records the existing share payload, animated checker/stamp frames, static app/OS
reduced-motion frames, long-number sizing and the pinned action's unchanged bounds.
The script exercises solo completion, lap selection, lineup add/reorder/remove/
rotation, tournament heats/champion/reset and the split layout. Zero page/console
errors and no unexpected dialogs. Assignment callbacks and existing pure lineup
coverage are preserved; swapping physical cars remains a hardware follow-up.

The isolated development route is `/dev/redline?section=results`; `record=first`,
`record=tie`, `record=miss`, `record=unknown`, `fallback=1`, `long=1`, and `controls=1`
expose review states. Its sample result never enters any store, and the module is
excluded from release builds. The optional switch uses the existing setting action.

Decisions/deviations:

- The checker uses 16-point cells: the source's 32×32 CSS repeat contains two cells
  per axis. This follows source precedence over SPEC's “32 pt squares”. The banner
  is 64 points with real 4-point borders, rotated −6 degrees.
- Bar widths are actual lap/slowest ratios; the reference's illustrative lengths
  do not match its numbers. The fastest lap remains identified in the stats and
  spoken chart labels. The isolated fixture has no garage entry, so its plate is
  `?`. Real demo cars have derived plates.
- Best-lap records compare against a local snapshot at GO, before garage updates.
  Unknown snapshots never claim a record; a known absent previous best permits a
  first record; ties do not. The same snapshot supplies improvement text.
- Top speed requires a known car and contiguous retained pass IDs after a known
  start anchor, inside the inclusive race window. Missing coverage, buffer
  eviction, unknown identity or invalid speeds uses AVG LAP. The result's speed
  is captured once at finish and respects units/calibration. No fields are added.
- The Race tab retains its status, navigation, recovery, share, Done, queue and
  tournament actions. Results scroll in the existing shell; the gallery isolates
  the content for artboard comparison. START RACE is pinned above the existing
  safe-area-aware tab dock. Full-width skew margins use measured button height.
- Reduced-motion rendering begins at the final motif positions even during web
  hydration; the allowed entrance uses a 350 ms checker slide and stamp spring
  from scale 1.4/−14 degrees to 1/−8 degrees. Haptics, sound and announcements stay
  in their existing settings-gated paths.
- Native captures were inspected at 1206×2622 and exported as 804×1748 JPEGs for
  the connector limit. The floating gear belongs to Expo's development client.
  Supplementary web JPEGs retain their original pixel dimensions. Primary PNGs
  use lossless Zopfli compression with pixel-equivalence verified; no app dependency
  was added. Physical BLE, native share sheet, VoiceOver, keyboard avoidance and
  physical haptic/sound checks remain follow-ups.
