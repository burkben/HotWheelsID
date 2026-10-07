# RL-11 car detail review

Reference: [CarDetail.png](../../png/CarDetail.png), [CarDetail.dc.html](../../source/CarDetail.dc.html),
SPEC §4.8. All captures come from the real demo flow at 390×844 @2×.

| Capture | Coverage |
| --- | --- |
| [Silhouette (comparison)](detail-web.png) | A car without artwork: hero bay, plate, toy ribbon, GARAGE #1, stats, nickname, catalog rows. |
| [Photo](detail-photo-web.png) | '70 Dodge Charger R/T with bundled artwork and its CC BY-SA credit. |
| [Unidentified](detail-unidentified-web.jpg) | Dashed silhouette, serial line, Identify link and hint. |
| [Missing car](detail-missing-web.jpg) | Unknown uid with the Back to Garage action. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-11.cjs` with
Playwright on `NODE_PATH` and Expo web on port 8082. [Browser evidence](browser-checks.json)
records the spoken best-speed label with rank, the catalog rows, SEEN "Now", and the
nickname still saved after leaving and returning. Web stores are in-memory, so the
script stays inside the app rather than reloading.

The demo car's numbers differ from the mockup's samples (one car, few passes, no
races), so BEST LAP reads "—" and the plate is 01.
