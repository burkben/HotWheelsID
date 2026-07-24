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

1. Open the Speed tab.
2. Select Demo in the Live BLE / Demo control.
3. Simulated car passes begin automatically. Trigger pass can create another.
4. Open Race, choose a lap count, and start a race.
5. Use Trigger pass to advance laps and reach the results screen.
6. Garage, History, Achievements, Settings, race-night lineups, and tournament
   mode remain available from the tab bar and More menu.

For live use, the app scans only after the user selects Live BLE and taps
Connect portal. Bluetooth is used solely to communicate with the Race Portal.
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

Keep iPad support enabled. Capture the same set in portrait on the largest
required iPhone and iPad sizes:

| Order | Screen | Caption |
|---|---|---|
| 1 | Speed tab in Demo mode | Bring your Race Portal back to life |
| 2 | Active Race | Live lap timing and personal bests |
| 3 | Garage | Every car and every best, saved locally |
| 4 | Race-night lineup | Put every racer and car in the queue |
| 5 | Tournament bracket | Run a complete elimination tournament |
| 6 | History or Achievements | Keep the moments worth remembering |

Use only app UI in the screenshots. Do not use third-party catalog artwork or
Mattel logos.

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

Run this on TestFlight build **1.0.0 (3)** before selecting it for App Review.

### iPhone and Race Portal

- Launch after a clean install; confirm the tab bar and Speed screen render
  without an error.
- Allow Bluetooth, select Live BLE, and connect to the powered-on portal.
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

- Switch to Demo and confirm simulated passes start without portal hardware.
- Complete a short demo race using Trigger pass.
- Open Garage, History, Achievements, Credits, and Settings.
- Open the privacy, support, catalog-source, and licensing links and confirm each
  destination is correct.

### iPad

- Repeat the clean launch and Demo race on a supported iPad.
- Check portrait layouts for clipped text, overlapping controls, unreachable
  actions, and unsafe-area problems on Speed, Race, Garage, History, More,
  tournament, and detail screens.
- Connect to the portal and complete at least one live pass if the iPad is
  available near the hardware.
