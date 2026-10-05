# RL-07 countdown review

Reference: [Countdown.png](../../png/Countdown.png), with exact dimensions and paths
from [Countdown.dc.html](../../source/Countdown.dc.html).

| Capture | Coverage |
| --- | --- |
| [Count 2 web](count-2-web.png) | 390×844 @2×, isolated lineup fixture, OS reduced motion. |
| [Real demo race](race-count-2-web.png) | The actual start-race flow, native modal equivalent, honest unknown car/best fallback. |
| [GO web](go-web.png) | All six lights, main text and echoes green. |
| [iPad web](count-2-ipad-web.png) | 1024×768, centered bounded content; lineup can scroll. |
| [Count 2 iOS](count-2-ios.jpg), [GO iOS](go-ios.jpg) | iPhone 17 Pro / iOS 26.5: native SVG custom fonts, outlines, glow, real safe areas. |

The fixture route is `/dev/redline?section=countdown&count=2`; add `controls=1` for
manual ticks and the app motion switch. Fixture data is never written to stores,
and the route is unavailable in release. The plate remains `?` because the fixture
car is not in the garage. Production BEST is the fastest known positive lap for the
same player/car in race history; absent history shows an em dash. UP NEXT appears
only when the existing race-night queue supplies a next racer.

[Verification output](web-verification.json) records each light count, the digit
spring, echo slide, 120 ms glow bloom, and static app/OS reduced-motion states. The
script also verifies the 44 pt cancel target, decorative semantics, spoken seconds,
real demo-race announcements (3, 2, 1, Go), transition to racing and cancellation back
to setup, with zero console/page errors. Run `PLAYWRIGHT_CHANNEL=chrome node
docs/design/redline-v1/tools/check-rl-07.cjs` with Playwright on `NODE_PATH` against
Expo on port 8082.

Decisions/deviations: the old hook never renders count 0. A local 400 ms GO overlay
starts alongside the existing `startRacing()` call, preserving the 800 ms countdown
steps, gate timing, cues and announcements. `useRaceSession` is unchanged. A core
React Native full-screen Modal provides the spec's immersive layout. The start
strip uses a 58 pt total height including its border; native adds the bottom safe
area. Content scrolls for smaller viewports and larger text. SVG glyphs use native
OpenType `tnum` and web CSS `tabular-nums` because SVG text does not accept RN Text's
fontVariant array. Echoes intentionally extend offscreen on GO.

Native captures are the fixture, not an automated native race. The floating gear
belongs to the development client. VoiceOver, native modal focus, sound, haptics
and physical BLE remain device follow-ups; their existing calls/gates are untouched.

Native review JPEGs are reduced to 804×1748 at quality 80 to fit the GitHub
connector upload limit. Full 1206×2622 PNGs were inspected before export.
