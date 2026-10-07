# RL-13 More, Trophy case and unlock banner review

Reference: [Achievements.png](../../png/Achievements.png),
[Achievements.dc.html](../../source/Achievements.dc.html), SPEC §4.10. More has no mockup.

| Capture | Coverage |
| --- | --- |
| [Reference comparison](trophies-web.png) | 390×844 @2×, fixture at 8/13 with Into the Red as the latest unlock. |
| [Nothing unlocked](trophies-none-web.jpg) | Empty progress bar, no latest panel, every medallion locked. |
| [Unlock banner](unlock-banner-web.png) | A real New Wheels unlock from the demo portal. |
| [More](more-web.png) | Restyled groups with trophy progress on the Trophy case row. |
| [Demo trophy case](trophies-demo-web.jpg) | Live data after the demo unlocks. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-13.cjs` with
Playwright on `NODE_PATH` and Expo web on port 8082. [Browser evidence](browser-checks.json)
records the progress and tile labels and the sequence of real banners. Each unlock is
shown once, in order, at least 3 s apart, and the banner count matches the More row.
No console errors.

Web always runs the demo portal, so a fresh page unlocks trophies within seconds. The
fixture captures (`/dev/redline?section=trophies`, `none=1`) hide that live banner.
