# RL-12 History review

Reference: [History.png](../../png/History.png), [History.dc.html](../../source/History.dc.html),
SPEC §4.9. History detail has no mockup.

| Capture | Coverage |
| --- | --- |
| [Reference comparison](history-web.png) | 390×844 @2×, fixture with the mockup's sessions and sparklines, fixed "now". |
| [Empty](history-empty-web.jpg) | Track lane and outline car instead of the flag emoji. |
| [iPad](history-ipad-web.jpg) | 1024×768 @2×, two-column tickets under full-width group headers. |
| [Real demo session](history-demo-web.jpg) | Live ticket from demo passes, sparkline loaded from the repository. |
| [Session detail](history-detail-web.png) | Stats, whole-session bar chart, numbered pass rows with the fastest highlighted. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-12.cjs` with
Playwright on `NODE_PATH` and Expo web on port 8082. [Browser evidence](browser-checks.json)
records the strip label, group headings, live ticket labels, the sparkline, the
summarised chart label, the fastest pass and pass → car routing. No console errors.

The fixture lives at `/dev/redline?section=history` (`empty=1`). It never touches the
session repository.
