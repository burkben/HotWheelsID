# RL-15 remaining surfaces review

SPEC §4.12. None of these screens has a mockup; they apply the system from the screens
that do.

| Capture | Coverage |
| --- | --- |
| [Live portal](live-web.png) | Web state: Bluetooth notice, stat cells, empty log (demo mode does not log). |
| [Banners, notices and log rows](live-log-web.png) | Fixture: Speed's BLE fault banners (powered off, error with retry), notices in each tone, INFO/EVENT/ERROR log rows. |
| [Credits](credits-web.png) | Section headers and pitLane panels; all license content unchanged. |
| [Identify](identify-web.png) | Mode/year/wave chips, inset search, catalog cards in the Garage info layout. |
| [No-artwork placeholder](identify-placeholder-web.jpg) | The dashed "?" roundel that replaces the emoji placeholder. |
| [Saved + undo](identify-saved-web.jpg) | The saved panel after Confirm. |
| [Splash preview](splash-preview.png) | Exported splash glyph at 160 pt on #07090F, as configured in app.json. |

Run `PLAYWRIGHT_CHANNEL=chrome node docs/design/redline-v1/tools/check-rl-15.cjs` with
Playwright on `NODE_PATH` and Expo web on port 8082. [Browser evidence](browser-checks.json)
records the Bluetooth notice, the web persistence banner, the font license expanding,
the placeholder card label, confirm → undo, the year filter's pressed state and the
five fixture log rows. No console errors.

Regenerate the splash PNG with `npm run assets:images --workspace mobile`; add `-- --check`
to confirm the committed PNG matches a fresh export byte for byte.
