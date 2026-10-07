# Redline ID App Store submission

Copy-ready metadata and review answers for version 1.0.0.

## Product page

| Field | Value |
|---|---|
| Name | Redline ID |
| Subtitle | Race Portal speed and timing |
| Primary category | Entertainment |
| Secondary category | Utilities |
| Price | Free |
| Privacy Policy URL | https://burkben.github.io/HotWheelsID/privacy/ |
| Support URL | https://burkben.github.io/HotWheelsID/support/ |
| Marketing URL | https://burkben.github.io/HotWheelsID/ |
| Copyright | 2026 Hyperion Studio |

### Promotional text

Bring a discontinued Race Portal back to life with live speed, lap timing, a
persistent garage, achievements, and race-night tournament tools.

### Keywords

race portal,speedometer,lap timer,hot wheels id,bluetooth,garage,toy cars,racing

### Description

Redline ID brings the discontinued Hot Wheels id Race Portal back to life.

Connect an iPhone or iPad to the portal over Bluetooth and see every pass on a
live speedometer. Run lap races, organize a race-night lineup, assign cars, and
play a single-elimination tournament. Redline ID also keeps a local garage,
session history, personal bests, achievements, and app settings.

Features:

- Live speed and car telemetry from the Race Portal
- Timed lap races with results and personal bests
- Race-night lineups, car assignments, and tournament brackets
- Persistent garage, history, achievements, and settings
- mph and km/h with optional speed calibration
- Sound, haptics, and reduced-motion controls
- Demo mode for exploring the app without portal hardware

Privacy is simple: there is no account, advertising, analytics, crash reporting,
or application server. App data stays on the device unless you deliberately
export something through the iOS share sheet.

Redline ID is a free, open-source community project. It is not affiliated with,
endorsed by, or sponsored by Mattel, Inc. "Hot Wheels" and "Hot Wheels id" are
trademarks of Mattel, Inc. and are used only to identify compatible discontinued
hardware.

### What's New

Initial App Store release.

## App Review notes

Redline ID is a Bluetooth companion for the discontinued Hot Wheels id Race
Portal. No account, login, subscription, or backend service is required.

The physical accessory is not required for review:

1. Open More → Settings.
2. Turn on **Start in demo mode** (section 05 Startup). The switch takes effect
   immediately. The first-run "Find your portal" screen also offers **Try demo mode**.
3. Return to Speed. Simulated car passes begin automatically. The Settings portal
   card also offers Trigger a sample pass.
4. Open Race, choose a lap count, and start a race.
5. Use Trigger pass to advance laps and reach the results screen.
6. Garage, History, Trophy case, Settings, race-night lineups, and tournament
   mode remain available from the tab bar and More menu.

For live use, turn off Start in demo mode. The app connects automatically; the
portal card at the top of Settings also offers connect, retry, and pause controls. Bluetooth is
used solely to communicate with the Race Portal.
The app supports both known portal firmware transports.

The app performs a standard P-256 ECDH handshake and AES-128-CTR encryption only
for local communication with compatible hardware. It does not provide general
encryption services, messaging, VPN, or user-controlled cryptography.

## App Privacy

Select **Data Not Collected**.

- No account, analytics, ads, crash reporting, tracking, or application server.
- Garage, race history, achievements, preferences, player names, and car names
  remain in the app's private on-device database.
- OS share-sheet actions are explicit user-directed exports. The developer does
  not receive them unless the user deliberately chooses to send them there.
- External links open only after a user taps them.
- Bluetooth data is processed locally and is not transmitted to the developer.

Tracking: **No**.

## Age rating and Kids Category

- Age rating questionnaire: answer **None** for violence, sexual content,
  profanity, gambling, substances, horror, medical content, and unrestricted
  web access.
- Expected rating: **4+**.
- Do not select the Kids Category. The app is family-friendly but is a
  general-audience hardware utility and includes user-initiated external links.

## Export compliance

`ITSAppUsesNonExemptEncryption` is `false`.

The only cryptography beyond operating-system networking is standard P-256 ECDH
and AES-128-CTR used to communicate locally with the Race Portal. The publisher
should confirm the exemption answer in App Store Connect; the app does not
implement proprietary cryptography or provide cryptography as a primary
function.

## Screenshots

The store frames follow the Redline V1 design (SPEC §6) and are composited from real
simulator captures by `docs/release/screenshots/` (template, render script and
capture instructions in its README). Keep iPad support enabled.

**Required sizes** (App Store Connect screenshot specifications, checked October
2026; re-check before each submission):

| Set | Pixels | Notes |
|---|---|---|
| iPhone, Dynamic Island medium display | 1206 × 2622 | Required. Capture on an iPhone 17 Pro simulator. |
| iPhone 6.9" | 1320 × 2868 | Optional. The render script produces it from the same captures. |
| iPad 13" | 2752 × 2064 | Required while iPad is supported. **Landscape**: the iPad build lays out in two panes above 900 pt, so a portrait iPad shot would not represent it. |

Final set, the same order and captions on iPhone and iPad:

| Order | Screen (demo mode) | Headline |
|---|---|---|
| 1 | Speed, readout ≥ 240 so the flames show | THE PORTAL IS BACK. |
| 2 | Race countdown at "2" | LIGHTS OUT. LET'S RACE. |
| 3 | Race live, lap 3/5 | EVERY LAP ON THE CLOCK. |
| 4 | Results with NEW RECORD | BEAT YOUR BEST. |
| 5 | Garage | EVERY CAR, REMEMBERED. |
| 6 | Trophy case | 13 TROPHIES TO HUNT. |

This replaces the earlier lineup. Race-night lineup and tournament bracket move out of
the screenshot set and stay described in the product page copy. On iPad, frames 2–4
show the two-pane Race tab, which covers the old "whole race night on one screen" shot.
The TV mode preview is dropped: TV mode keeps the legacy look in V1.

Rules:

- No Mattel or Hot Wheels logos, wordmarks, packaging or flame logos in any frame. The
  product is **Redline ID**. The render script fails if a frame's text contains "Hot
  Wheels" or "Mattel".
- Capture with demo mode on and a clean status bar (`xcrun simctl status_bar booted
  override --time 9:41 …`).
- Outputs are 8-bit RGB PNGs with no alpha channel, which App Store Connect requires.

Catalog car photos appear in the app UI (Identify, Garage, car detail). They are
CC BY-SA wiki photographs, and App Store screenshots are a distribution surface that
carries no attribution. The low-risk options, in order:

1. Prefer screens where photos are absent or incidental. Frames 1–4 and 6 have none.
2. For the Garage frame, a grid of trading cards is fine. Rely on the in-app Credits
   screen, which names every photographer. This is the common practice for CC BY-SA
   media shown inside a product UI.
3. Avoid a screenshot whose subject *is* a single car photo blown up full-bleed.

Recapture every frame against the Redline V1 build; older captures show the previous
Trackside visual design.

## Final submission checklist

- Publish `site/` so the privacy, support, and marketing URLs contain this
  release's copy.
- Build with Xcode 26 or later and an iOS 26 SDK.
- Upload the fresh iPhone and iPad screenshots.
- Confirm App Privacy, age rating, category, availability, pricing, copyright,
  and export-compliance answers.
- Add the review notes above and verify all links from App Store Connect.
- Select the release-candidate build and submit version 1.0.0 for review.

## Physical release smoke test

Run this on the **current release-candidate build** before selecting it for App
Review. Build 9 rewrote TV mode as AirPlay mirroring (#63) and build 10 changes
the splash background, forces the dark interface style, and makes Settings,
Achievements, and Credits pop back to their caller — so re-run the TV-mode and
back-navigation checks against whichever build you actually submit.

### iPhone and Race Portal

- Launch after a clean install; confirm the tab bar and Speed screen render
  without an error.
- Allow Bluetooth, leave Settings → Start in demo mode off, and confirm the
  app connects to the powered-on portal.
- Pass a car through the portal; confirm the car event and nonzero speed appear.
- Run a short race to completion; confirm countdown, lap, best-lap, and finish
  sounds respect the Sound setting.
- Assign a car to a race-night racer, complete one tournament heat, and confirm
  the winner advances.
- Share one race result and cancel from the iOS share sheet; confirm the app
  remains responsive.
- Force-quit and reopen; confirm the garage entry, race history, achievements,
  player settings, sound preference, and tournament state expected to persist
  are still present.
- Disconnect, reconnect, and complete one more portal pass.

### Demo and review path

- Turn on Settings → 05 Startup → Start in demo mode and confirm simulated passes start without portal hardware.
- Complete a short demo race using Trigger pass.
- Open Garage, History, Trophy case, Credits, and Settings.
- From the More tab, open Trophy case, Settings, and Credits in turn and back out
  of each. Confirm Back returns to **More** every time — before build 10 these three
  screens jumped to the Speed tab instead of popping.
- Identify a car, then open its Garage detail screen. Confirm the photo sits fully
  inside its rounded frame with nothing running past either edge, and that the
  Identify grid tiles are square. Bundled artwork is 1x, so a regression here
  reads as a car cropped in half rather than as an obviously broken image.
- Open the privacy, support, catalog-source, and licensing links and confirm each
  destination is correct.

### TV mode

- On a physical iPhone or iPad, open More → TV mode, then enable AirPlay Screen
  Mirroring from Control Center.
- Confirm TV mode immediately opens the full-screen landscape stage and the same
  live dashboard appears on both the device and TV, with no blank output or
  corruption of the device UI.
- Stop mirroring, tap Exit TV mode, and confirm the app returns to More in
  portrait. The Simulator cannot exercise this path.

### iPad

- Repeat the clean launch and Demo race on a supported iPad, **in landscape**,
  and confirm the Speed and Race tabs render two panes rather than a centred
  phone column.
- Rotate the iPad through all four orientations mid-race and confirm the lap
  clock keeps running (regions are shared across the layout branches so nothing
  should remount).
- Check portrait layouts for clipped text, overlapping controls, unreachable
  actions, and unsafe-area problems on Speed, Race, Garage, History, More,
  tournament, and detail screens.
- Confirm car photos scale with the wider layout instead of overflowing, on both
  the Garage detail hero and the Identify grid.
- Connect to the portal and complete at least one live pass if the iPad is
  available near the hardware.
