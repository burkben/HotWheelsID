# HotWheelsID 🏎️

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg)](https://github.com/burkben/HotWheelsID)

**Bring your Hot Wheels id Race Portal back to life!**

An open-source tool to connect to the Hot Wheels id Race Portal after Mattel discontinued the official app on January 1, 2024. We reverse-engineered the Bluetooth protocol so you can track speeds, lap times, and build your car collection again.

> **HotWheelsID** is a fork of [`mtxmiller/hotwheels-portal`](https://github.com/mtxmiller/hotwheels-portal)
> evolving the project toward a **polished, cross-platform app that is installable on iOS**
> (React Native + Expo), while keeping the original Python tools as a reference implementation.
>
> 📐 **Planning the new app?** Start here:
> [Architecture Overview](docs/architecture/README.md) ·
> [Decision Records (ADRs)](docs/adr/) ·
> [Roadmap](docs/ROADMAP.md) ·
> [BLE & Protocol port](docs/architecture/ble-and-protocol.md)
>
> The sections below document the **current Python tools** (the reference implementation).
> The reverse-engineered BLE protocol is in [PROTOCOL.md](PROTOCOL.md).

## What It Does

- **Detect cars** - Reads NFC UID and serial number when you place a car on the portal
- **Track speed** - Measures speed as cars pass through (in "scale mph")
- **Count laps** - Tracks lap times and calculates best/average times
- **Live dashboard** - Beautiful terminal UI with real-time stats
- **Multi-car support** - Tracks stats for each car individually

## Live Dashboard

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃            🏎️  HOT WHEELS PORTAL DASHBOARD  🏎️                ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━━━━━━━ 🚗 Current Car ━━━━━━━┓┏━━━━━━━ 📊 Recent Passes ━━━━━━┓
┃ NFC UID:  4A:8F:52:88:5D:81  ┃┃ #    Time     Speed    Lap    ┃
┃ Serial:   1102032557         ┃┃ 12   12:01:03  94.5 mph  4.2s ┃
┃ Laps:     5                  ┃┃ 11   12:00:58  50.5 mph  5.1s ┃
┃                              ┃┃ 10   12:00:52  46.9 mph  4.8s ┃
┃ ████████████████░░░░ 94.5 mph┃┃ 9    12:00:45  88.2 mph  3.9s ┃
┃ Best Speed: 94.5 mph         ┃┃ 8    12:00:38  72.1 mph  4.5s ┃
┃ Best Lap:   3.9s             ┃┃                               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Status: Pass #12  │  Session: 5m 23s  │  Cars Seen: 3        ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## Quick Start

> **Heads up — this is now a monorepo.** The Python reference tools live in
> [`python/`](python/), the new React Native + Expo app in
> [`apps/mobile/`](apps/mobile/), and the shared protocol port in
> [`packages/protocol/`](packages/protocol/). For the JS/TypeScript side see
> [Monorepo & app development](#monorepo--app-development) below.

```bash
# Clone the repo
git clone https://github.com/burkben/HotWheelsID.git
cd HotWheelsID/python

# Set up Python environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the dashboard
python dashboard.py
```

## Requirements

- **Python 3.10+**
- **macOS, Windows, or Linux** with Bluetooth Low Energy support
- **Hot Wheels id Race Portal** (Model FXB53)
- **Hot Wheels id cars** (with NFC chips)

## Available Tools

> Run these from the [`python/`](python/) directory, with the virtualenv from
> [Quick Start](#quick-start) activated.

| Command | Description |
|---------|-------------|
| `python dashboard.py` | Live dashboard with speed & lap tracking |
| `python race_mode.py` | 🏁 **Lap Race Game** - compete for best times! |
| `python portal_app.py` | Detailed event monitor with car data |
| `python scanner.py` | Scan for BLE devices |
| `python monitor.py` | Raw event monitor for debugging |

### 🏁 Lap Race Mode

A competitive game mode where players race to complete laps:

- Select lap count (5, 10, 15, or 20 laps)
- 3-2-1 countdown to start
- Real-time lap tracking with best/worst comparison
- Results screen with full breakdown
- **Leaderboard** to compete with friends!

## Using as a Library

> Run from the [`python/`](python/) directory, where the `hwportal/` package lives.

```python
import asyncio
from hwportal import HotWheelsPortal

async def main():
    async with HotWheelsPortal() as portal:
        info = await portal.get_info()
        print(f"Firmware: {info.firmware_version}")
        print(f"Serial: {info.serial_number}")

        # Get notified of events
        portal.on_event(lambda e: print(f"Event: {e}"))
        await portal.start_monitoring()

        await asyncio.sleep(60)

asyncio.run(main())
```

## Protocol Documentation

We've fully reverse-engineered the BLE protocol! See [PROTOCOL.md](PROTOCOL.md) for details.

**Key discoveries:**
- Device advertises as `HWiD`
- 3 BLE services for auth, data transfer, and control
- Car detection via NFC UID (6 bytes)
- Speed data as IEEE 754 float32
- Full NDEF records with Mattel car IDs

## Project Structure

```
HotWheelsID/
├── apps/
│   └── mobile/             # Expo app (React Native, TypeScript, Expo Router) — iOS-first
├── packages/
│   └── protocol/           # @hotwheelsid/protocol — shared TS BLE protocol port (+ tests)
├── python/                 # Original Python reference tools (documented above)
│   ├── hwportal/           #   Library: constants.py (BLE UUIDs), portal.py (client)
│   ├── dashboard.py        #   Live terminal dashboard
│   ├── race_mode.py        #   Lap race game
│   ├── portal_app.py       #   Event monitor
│   ├── scanner.py          #   BLE scanner
│   ├── monitor.py          #   Raw event monitor
│   └── requirements.txt
├── docs/                   # Architecture notes, ADRs, and the roadmap
├── PROTOCOL.md             # Canonical reverse-engineered BLE protocol
├── package.json            # npm workspaces root
└── tsconfig.base.json      # Shared TypeScript config
```

## Monorepo & app development

The TypeScript side uses **npm workspaces** (Node 20+). From the repo root:

```bash
npm install              # install every workspace (apps/* and packages/*)
npm run typecheck        # typecheck all workspaces (protocol + mobile)
npm test                 # run all workspace tests
npm run test:protocol    # just the @hotwheelsid/protocol unit tests
```

### Shared protocol package

[`packages/protocol`](packages/protocol/) (`@hotwheelsid/protocol`) is a pure
TypeScript port of the BLE protocol — UUIDs, typed events, and byte decoders —
with no React Native or UI dependencies. It is unit-tested against the sample
vectors in [PROTOCOL.md](PROTOCOL.md).

### Mobile app

[`apps/mobile`](apps/mobile/) is an Expo app. Phase 0 ships only a placeholder
screen that imports `@hotwheelsid/protocol` to prove the workspace link; BLE and
UI features arrive in later phases (see [docs/ROADMAP.md](docs/ROADMAP.md)).

```bash
npm run start --workspace mobile      # start Metro / Expo
# or: cd apps/mobile && npx expo start
```

Because the app relies on native modules (`react-native-ble-plx`,
`expo-dev-client`), Expo Go cannot be used for BLE — build a **custom dev
client** on a Mac with Xcode:

```bash
cd apps/mobile
npx expo run:ios
```

## Roadmap

The full, phased plan toward the attractive UI and the installable iOS app lives in
**[docs/ROADMAP.md](docs/ROADMAP.md)**. Status of the original Python tooling:

- [x] BLE connection and event monitoring
- [x] Car detection (NFC UID, serial)
- [x] Speed tracking
- [x] Live dashboard with speedometer
- [x] Lap race game mode with leaderboard
- [ ] Persistent car database
- [ ] Car collection/garage view
- [ ] Achievement system
- [ ] Car name lookup from Mattel ID

The next chapter (cross-platform app, polished UI, iOS via TestFlight) is tracked in the
[Roadmap](docs/ROADMAP.md) and [ADRs](docs/adr/).

## Contributing

We'd love your help! Here's how:

1. **Got a Portal?** Run the tools and share interesting findings
2. **Know BLE/NFC?** Help decode remaining protocol mysteries
3. **Want features?** Check the issues and submit PRs

```bash
# Run the monitor and capture events
python monitor.py > my_events.log
```

## Why This Exists

Mattel discontinued the Hot Wheels id app on January 1, 2024, leaving thousands of Race Portals as paperweights. This project aims to restore functionality through reverse engineering, letting Hot Wheels fans continue to enjoy their hardware.

## Support the Project

If this project helped bring your Hot Wheels Portal back to life, consider supporting development:

- ⭐ **Star this repository**
- 💖 **[Sponsor on GitHub](https://github.com/sponsors/mtxmiller)**
- 🐛 **Report issues** and suggest features

[![Sponsor](https://img.shields.io/github/sponsors/mtxmiller?style=for-the-badge&logo=github&label=Sponsor)](https://github.com/sponsors/mtxmiller)

### PayPal Donations

[![Donate with PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/ncp/payment/WWXW56JQE4GR4)

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This project is not affiliated with Mattel or Hot Wheels. It's a community effort to restore functionality to discontinued hardware. Hot Wheels is a trademark of Mattel, Inc.

## Resources

- [Hot Wheels id Wiki](https://hotwheels.fandom.com/wiki/Hot_Wheels_id)
- [Bleak BLE Library](https://github.com/hbldh/bleak)
- [Rich Terminal Library](https://github.com/Textualize/rich)
