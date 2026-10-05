# RL-08 live race review

Reference: [Race.png](../../png/Race.png), [Race.dc.html](../../source/Race.dc.html),
and SPEC §4.5's corrected pace-marker semantics. The loop, gate and chevron paths
are copied from the source. A 201-point, equal-distance polyline starts at the gate.

| Capture | Coverage |
| --- | --- |
| [Live reference fixture](race-live-web.png) | 390×844 @2×; lap 3, source lap times, an honest total and elapsed-vs-best delta. |
| [First lap](first-lap-web.png) | No reference markers or VS FASTEST badge before a completed lap/history reference. |
| [Reference exceeded](overflow-web.png) | Markers park on the gate, current segment fills, delta is positive. |
| [Lineup on iPad](lineup-ipad-web.jpg) | Racer name, derived plate fallback and scalable track. |
| [Real demo race](demo-race-web.jpg) | Real controller passes, matched gate speed, original shell/dock and demo action. |
| [Real iPad demo](demo-race-ipad-web.jpg) | Existing two-pane layout with the timing tower in the right pane. |
| [Results shared timing](results-shared-timing-web.jpg) | Early finish preserves results; only its shared lap rows change here. Full Results work is RL-09. |
| [Native live](race-live-ios.jpg) | iPhone 17 Pro / iOS 26.5: fonts, track, clocks, time rows and end action. |
| [Native pause frame 1](stall-1-ios.jpg), [frame 2](stall-2-ios.jpg) | While JS is deliberately paused, the lap clock advances 4.83→5.66 and markers move along the track. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-08.cjs`
with Playwright on `NODE_PATH` and Expo on port 8082.
[Browser verification](web-verification.json) records clock/marker movement, static
app/OS reduced-motion decorations, continuing measurement clocks, 300 ms segment
completion, 220 ms row entrance, target/skew geometry, long-time fit, first-gate
fallback, and no-confirm early finish. It exercises actual demo passes and the
existing race engine, and reports zero page/console errors or dialogs.

The isolated development route is `/dev/redline?section=race-live`; `first=1`,
`empty=1`, `elapsed=4`, `lineup=1`, and `controls=1` expose review states. It never
writes fixture data into a store. To reproduce the native UI-thread probe, open
`redlineid:///` then `redlineid://dev/redline?section=race-live&moving=1&slow=1&stall=1`.
At 1.95 seconds after mount the fixture blocks JS for 1.8 seconds. The two captures
show its JS-paused label while both UI clocks and the markers advance.
[Capture timing](native-stall-times.json) records wall times after the deep link.
The fixture is omitted from release bundles.

Decisions/deviations:

- The source sample's total/delta don't follow its lap values. Two completed laps
  of 3.012 and 2.847 plus 2.31 elapsed total 8.169; current-vs-fastest is −0.537.
  Those values are computed, never copied into production. Both markers coincide
  when the last lap is also the fastest; the ghost ring remains visible on the dot.
- After a reference expires the marker parks at the gate and its halo pulses.
  With either reduced-motion flag, markers stay at the gate and decorative fills/
  transitions are static. Measurement clocks keep ticking.
- GATE SPEED appears only if every closing time has exactly one matching retained
  pass for that car. Missing identity, expired buffer entries, invalid speeds or
  ambiguous timestamps omit the whole column. Units respect calibration/settings.
- The production Race tab retains its shell/navigation and demo trigger. Only the
  countdown is specified as immersive. The scrolling gallery isolates the live
  content for comparison with the standalone artboard. The known skew overhang is
  corrected by the shared button inset. Text and legends can wrap; long numeric
  readouts fit their available width instead of clipping.
- Native screenshots were inspected at 1206×2622 and exported as 804×1748 JPEGs at
  quality 75 for the connector limit. The floating gear is the development client.
  Physical-device frame-rate measurement, VoiceOver, haptics, sound and BLE remain
  follow-ups. No existing cue/announcement or engine behavior was changed.

Large supplementary web captures use JPEG (quality 45–75) at the original pixel
dimensions to fit the connector limit. The primary 390×844 @2× comparison remains
a lossless PNG; all full PNG captures were inspected before compression.
