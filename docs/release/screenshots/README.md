# App Store screenshots

The Redline V1 store frames (SPEC §6; artboards in `docs/design/redline-v1/source/Store01–06`),
built from **real simulator captures** at App Store Connect's pixel sizes.

| File | Purpose |
| --- | --- |
| `frames.html` | The six frames: headline, background, one motif, bezel, Dynamic Island, bottom bleed. iPhone portrait and iPad landscape. |
| `render.cjs` | Composites captures into the frames and writes exact-size 8-bit RGB PNGs (no alpha). |
| `sample-captures.cjs` | Stand-in captures from the Expo web build, to check the pipeline without a simulator. Do not ship these. |

## Sizes (checked against App Store Connect, October 2026)

| Output folder | Pixels | Status |
| --- | --- | --- |
| `iphone-1206x2622` | 1206 × 2622 | **Required**: iPhone with Dynamic Island, medium display (iPhone 17 Pro). 1179 × 2556 is also accepted. |
| `iphone-1320x2868` | 1320 × 2868 | Optional: 6.9" large display. |
| `ipad-2752x2064` | 2752 × 2064 | **Required** while iPad is supported: 13" display, landscape. |

Re-check the [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
before each submission; Apple changes the required set. Add or change sizes in `SIZES` at the
top of `render.cjs`.

## Captures

Put one capture per frame in a folder, in frame order:

```
captures/iphone/01.png … 06.png   portrait, any Dynamic Island iPhone simulator
captures/ipad/01.png … 06.png     landscape, iPad Pro 13" simulator
```

| # | Screen to capture (demo mode) | Headline |
| --- | --- | --- |
| 01 | Speed, readout ≥ 240 so the flames show | THE PORTAL IS BACK. |
| 02 | Race countdown at "2" | LIGHTS OUT. LET'S RACE. |
| 03 | Race live, lap 3/5 | EVERY LAP ON THE CLOCK. |
| 04 | Results with NEW RECORD | BEAT YOUR BEST. |
| 05 | Garage | EVERY CAR, REMEMBERED. |
| 06 | Trophy case | 13 TROPHIES TO HUNT. |

`xcrun simctl io booted screenshot captures/iphone/01.png` captures the booted simulator at
its native resolution. Set a clean status bar first, for example
`xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100`.

## Render

```bash
NODE_PATH=<dir containing playwright> PLAYWRIGHT_CHANNEL=chrome \
  node docs/release/screenshots/render.cjs --captures captures --out store-screenshots
```

Each output is written as `<size>/<NN>-<slug>.png`. The script fails on a missing capture, a
transparent pixel, a wrong output size, or any "Hot Wheels" or "Mattel" text in a frame.
To try the pipeline without a simulator, start Expo web on port 8082 and run
`node docs/release/screenshots/sample-captures.cjs captures` first.
