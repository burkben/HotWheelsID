# RL-04 app shell review

Web captures use demo mode, 390×844 at 2×. Reproduce against the running Expo web
server with `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-04.cjs`
(and a `NODE_PATH` containing Playwright if it is not locally installed).

| Build | Reference | Comparison |
| --- | --- | --- |
| [Speed](speed-web.png) | [Speed.png](../../png/Speed.png) | Wordmark, status chip and dock; body remains scheduled for RL-05. |
| [Garage](garage-web.png) | [Garage.png](../../png/Garage.png) | 40 pt condensed title/count, 62 pt dock and active underline; body is RL-10. |
| [History](history-web.png) | [History.png](../../png/History.png) | Condensed title and electric Clear action; body is RL-12. |
| [Race](race-web.png) | [Race.png](../../png/Race.png) | Shared header/dock only; setup has no dedicated mockup and is RL-09. |
| [More](more-web.png) | [Main.png](../../png/Main.png) | Shared title/dock; destination groups are RL-13. |
| [TV](tv-web.png) | Existing TV | 1440×900 capture: legacy needle, no tab dock or ribbon. |
| [Speed iOS](speed-ios.png), [Garage iOS](garage-ios.png) | Speed/Garage | iPhone 17 Pro, iOS 26.5: bundled faces, native SVG wordmark, dock and safe areas. |

The [verification output](web-verification.json) records all five 78×62 web tab
targets, instant indicator positions with app and OS reduced motion, and the web
status live region. Navigation, Space activation, selected states, Speed's ribbon
exclusion, disconnect confirmation, and reconnect are exercised. No browser errors.

Decisions: actual safe-area insets replace the artboards' fixed bottom padding.
The existing browser-session notice remains visible on web. The explicit RL-04
ribbon requirement restores the non-Speed status channel removed by PR #66;
it is 44 pt tall for touch accessibility, although the reference images omit it.
Speed carries only its header chip. Status updates retain native announcements;
web also uses a polite live region because RN Web's announcement method is a no-op.
Native screenshots include the development client's floating gear, which is not
app UI. VoiceOver, physical BLE, haptics, and sound were not checked here.
