# RL-10 Garage review

Reference: [Garage.png](../../png/Garage.png), [Garage.dc.html](../../source/Garage.dc.html),
SPEC §4.7.

| Capture | Coverage |
| --- | --- |
| [Reference comparison](garage-web.png) | 390×844 @2×, fixture with the mockup's cars, silhouettes, on-portal ring/ribbon, mystery card. |
| [Bundled photos](garage-photos-web.jpg) | Same fixture with catalog artwork and an odd count; the last card keeps its column width. |
| [Empty](garage-empty-web.jpg) | Track lane and outline-car illustration with the spec copy. |
| [iPad](garage-ipad-web.jpg) | 1024×768 @2×, three columns, taller photo bay. |
| [Real demo garage](garage-demo-web.jpg) | Demo mode after passes: one unidentified car on the portal. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-10.cjs` with
Playwright on `NODE_PATH` and Expo web on port 8082. [Browser evidence](browser-checks.json)
records card counts before and after filtering, the on-portal card's spoken label,
identified → `/garage/fx-07` and mystery → `/identify?uid=fx-mystery` routing, and zero
console errors.

The fixture lives at `/dev/redline?section=garage` (`photos=1`, `odd=1`, `empty=1`). It
never writes to a store. Plates are derived from the fixture's six cars, so they read
01–06 rather than the mockup's sample numbers.
