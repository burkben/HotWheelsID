# RL-05 Speed and gauge review

Reference: [Speed.png](../../png/Speed.png), with exact geometry, SVG paths, heat
ramp, and bar colors from [Speed.dc.html](../../source/Speed.dc.html).

| Build | What to compare |
| --- | --- |
| [Speed web](speed-web.png) | 390×844 @2× demo: rake, wordmark/chip, 240° dial, linked race-plate card, LAST/BEST/PASSES, 14 recent bars. |
| [Speed iOS](speed-ios.png) | iPhone 17 Pro / iOS 26.5: native fonts, SVGs, car card, bars and safe-area dock. |
| [280 web](gauge-280-web.png) / [280 iOS](gauge-280-ios.png) | Controlled development fixture: new-best tag, tip at 280, both flame clusters at full opacity. |
| [km/h with reduced motion](gauge-kmh-reduced-web.png) | 280 canonical mph displays 451 km/h, including converted ticks and spoken units. |
| [iPad web](speed-ipad-web.png) | 1194×834 @2×: gauge left; car, stats and bars right. |
| [TV](tv-web.png) | 1440×900 @2×: legacy needle renderer remains the default. |

`tools/check-rl-05.cjs` records arc/tip/heat values per animation frame in
[web-verification.json](web-verification.json). It verifies the 620 ms ascent,
900 ms hold, return, second equal-speed pass, NEW BEST tag spring, tracking in both directions without
returning to zero, and static targets beyond the hold duration for app and OS
reduced motion. It also checks converted units, bar colors, car-detail navigation,
iPad panes, TV exclusion, and browser errors. Run with `PLAYWRIGHT_CHANNEL=chrome`
and a `NODE_PATH` containing Playwright against Expo on port 8082. The controlled
fixtures live at `/dev/redline?section=gauge`; release builds redirect that route.

Native QA caught `adjustsFontSizeToFit` shrinking the readout to almost nothing.
The fixed-width readout now uses its specified face/size without that native
shrinking behavior. A native static 280 capture and a live demo capture verify it.
The existing UI-thread choreography is unchanged, and the new renderer derives
from its shared value. Native JavaScript-blocking/frame-rate performance was not
re-benchmarked; VoiceOver and physical BLE/haptics/sound remain device follow-ups.

Decisions/deviations:

- Demo identity is genuinely unidentified, so the capture uses its UID tail and
  silhouette instead of the mockup's sample Dodge/photo/series/year. Gallery
  samples are isolated presentation fixtures and never enter app stores.
- The protected store keeps only 20 recent passes. The PASSES caption changes from
  SESSION to RECENT when that buffer fills; it does not invent a lifetime total.
- Tied session bests receive the best treatment, matching the source artboard and
  existing pass haptic policy. The flame ramp follows the source's step to full
  opacity at the existing 240 mph threshold.
- The new bar chart replaces the redundant legacy pass list. Unfilled slots stay
  empty until real passes arrive. Bar thresholds stay in canonical mph.
- Glow uses translucent SVG stroke layers for native/web parity. Native safe areas,
  the 44 pt chip, scalable text, and the existing web persistence notice make the
  layout taller than the fixed artboard. The phone content scrolls when needed.
- Development-client screenshots include its floating gear; it is not app chrome.
