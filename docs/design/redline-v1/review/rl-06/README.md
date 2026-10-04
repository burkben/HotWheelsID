# RL-06 Find your portal review

Reference: [Connect.png](../../png/Connect.png) and
[Connect.dc.html](../../source/Connect.dc.html). Paths, dimensions and colors are
copied from the source; the 14 pt kerb uses the shared SVG pattern.

| Capture | Coverage |
| --- | --- |
| [Searching web](searching-web.png) | 390×844 @2×, OS reduced motion: wordmark, heading, illustration, status, steps and demo button. |
| [Bluetooth off](bluetooth-off-web.png) | Fault chip, existing adapter-off/Guided Access copy, retry action. |
| [Permission needed](permission-web.png) | Existing permission/Guided Access copy and Open Settings affordance. |
| [Searching iOS](searching-ios.png) | iPhone 17 Pro / iOS 26.5: native first viewport, SVGs, fonts, running radar. |

The production web and Simulator controller always chooses demo when physical BLE
is unavailable. Therefore the live searching/fault state cannot be reached through
production settings on those platforms. These captures use the development-only
`/dev/redline?section=connect&phase=scanning|poweredOff|unauthorized` fixture,
which renders the same `FindPortal` component without changing controller or store
state. Its demo button calls the real controller action and returns to Speed.
The fixture has a development footer instead of the production tab dock. Release
builds redirect this route home. Native Simulator GUI scrolling is unavailable;
the lower native button and full fault text were checked on web only.

[Verification output](web-verification.json) records moving radar radius/rotation,
static app/OS reduced-motion states and button bounds. The script also verifies
fault text, retry, the settings affordance, demo navigation to the Redline gauge,
decorative accessibility, and zero browser errors. Run
`PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-06.cjs`
with Playwright on `NODE_PATH` against Expo port 8082.

Decisions/deviations: this remains a Speed-tab state, so production retains the
existing tab navigation. Native safe areas and a 44 pt chip replace fixed artboard
spacing; content scrolls for large text and the complete existing fault messages.
The web fixture has no top safe-area inset. Manually disconnected sessions say to
tap the status to reconnect instead of promising automatic connection. Scanning
and connecting keep the hero visible; an established connection, current car,
accepted pass or demo mode shows the gauge. No onboarding flag is stored.
The iOS capture includes the development client's floating gear. Physical BLE,
iOS permission/Settings handoff, VoiceOver, haptics and sound remain unverified.
