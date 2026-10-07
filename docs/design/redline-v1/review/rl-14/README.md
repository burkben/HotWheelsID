# RL-14 Settings review

Reference: [Settings.png](../../png/Settings.png) (full length), [Settings.dc.html](../../source/Settings.dc.html),
SPEC §4.11.

| Capture | Coverage |
| --- | --- |
| [Full-length comparison](settings-web.png) | 390×1720 @2×: portal card, sections 01–07, switches, footer. |
| [Paused portal](settings-disconnected-web.jpg) | After DISCONNECT and the confirm: steel bar, CONNECT action. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-14.cjs` with
Playwright on `NODE_PATH` and Expo web on port 8082. [Browser evidence](browser-checks.json)
records section order, switch states before and after toggling, the KM/H selection,
laps 5 → 10, the shared disconnect confirm, reconnect, and Speed reading SCALE KM/H.
No console errors.

Web always runs the demo portal without Bluetooth, so the card reads DEMO MODE and
"Start in demo mode" is locked on with its explanation, as before this change.
