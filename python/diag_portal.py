#!/usr/bin/env python3
"""
Hot Wheels Portal — GATT diagnostic.

Connects to the portal from this Mac (a *fresh* BLE central) and answers two
questions that on-device iOS debugging could not:

  1. Does the portal expose Service C (control) — which holds every car/speed/
     serial characteristic — to a fresh desktop central, with NO authentication?
  2. If so, do car/speed events actually stream without an auth handshake?

Run this in a REAL terminal (Terminal.app / iTerm) so macOS can grant Bluetooth
permission — it cannot run from an automated/agent shell (it gets killed with
"Abort trap: 6"). Make sure the iPhone app is disconnected first: the portal
accepts only ONE connection at a time.

    cd python
    .venv/bin/python diag_portal.py
"""

import asyncio
import sys

from bleak import BleakScanner, BleakClient

PORTAL_NAME = "HWiD"

SERVICE_AUTH = "af0a6ec7-0001-000a-84a0-91559fc6f0de"
SERVICE_DATA = "af0a6ec7-0001-000b-84a0-91559fc6f0de"
SERVICE_CONTROL = "af0a6ec7-0001-000c-84a0-91559fc6f0de"

# Friendly names for the control-service characteristics we care about.
CHAR_NAMES = {
    "af0a6ec7-0002-000a-84a0-91559fc6f0de": "Auth Command",
    "af0a6ec7-0003-000a-84a0-91559fc6f0de": "Auth Key",
    "af0a6ec7-0004-000a-84a0-91559fc6f0de": "Auth Response",
    "af0a6ec7-0002-000b-84a0-91559fc6f0de": "Data Command",
    "af0a6ec7-0003-000b-84a0-91559fc6f0de": "Data Fast",
    "af0a6ec7-0002-000c-84a0-91559fc6f0de": "Firmware Version",
    "af0a6ec7-0003-000c-84a0-91559fc6f0de": "Serial Number",
    "af0a6ec7-0004-000c-84a0-91559fc6f0de": "Event 1 (NDEF)",
    "af0a6ec7-0005-000c-84a0-91559fc6f0de": "Event 2 (car detect)",
    "af0a6ec7-0006-000c-84a0-91559fc6f0de": "Event 3 (speed)",
    "af0a6ec7-0007-000c-84a0-91559fc6f0de": "Control Register",
    "af0a6ec7-0008-000c-84a0-91559fc6f0de": "Command",
}


def hexs(data: bytes) -> str:
    return " ".join(f"{b:02x}" for b in data)


def svc_of(uuid: str) -> str:
    u = uuid.lower()
    if u == SERVICE_AUTH:
        return "A/auth"
    if u == SERVICE_DATA:
        return "B/data"
    if u == SERVICE_CONTROL:
        return "C/control"
    return "?"


async def find_portal(timeout: float = 15.0):
    print(f"Scanning up to {timeout:.0f}s for '{PORTAL_NAME}'...", flush=True)
    devs = await BleakScanner.discover(timeout=timeout, return_adv=True)
    best = None
    for d, adv in devs.values():
        name = d.name or adv.local_name or ""
        if name.lower().startswith(PORTAL_NAME.lower()):
            if best is None or adv.rssi > best[1]:
                best = (d, adv.rssi)
    if best:
        d, rssi = best
        print(f"Found portal: {d.address}  rssi={rssi}  name={d.name!r}", flush=True)
        return d
    print("No portal found. Is it powered on and NOT connected to the iPhone?", flush=True)
    return None


async def main() -> int:
    dev = await find_portal()
    if not dev:
        return 1

    print("Connecting...", flush=True)
    async with BleakClient(dev) as client:
        print(f"Connected: {client.is_connected}\n", flush=True)

        services = list(client.services)
        found_svcs = {svc_of(s.uuid) for s in services}

        print("=== DISCOVERED GATT TABLE ===", flush=True)
        for s in services:
            print(f"[{svc_of(s.uuid):9}] service {s.uuid}", flush=True)
            for c in s.characteristics:
                nm = CHAR_NAMES.get(c.uuid.lower(), "")
                props = ",".join(c.properties)
                print(f"             char {c.uuid}  ({props}){'  ' + nm if nm else ''}", flush=True)

        print("\n=== VERDICT ===", flush=True)
        print(f"Service A (auth)    : {'PRESENT' if 'A/auth' in found_svcs else 'absent'}", flush=True)
        print(f"Service B (data)    : {'PRESENT' if 'B/data' in found_svcs else 'absent'}", flush=True)
        ctrl = "C/control" in found_svcs
        print(f"Service C (control) : {'PRESENT ✅' if ctrl else 'ABSENT ❌  <-- car/speed chars live here'}", flush=True)

        if not ctrl:
            print(
                "\nService C is NOT exposed to this fresh desktop central either.\n"
                "=> This is NOT an iOS cache problem. The portal is gating the control\n"
                "   service (likely behind the auth handshake / firmware). See handoff notes.",
                flush=True,
            )
            return 2

        # Service C is present: subscribe to every indicate/notify char and watch.
        notifiable = [
            c
            for s in services
            for c in s.characteristics
            if ("notify" in c.properties or "indicate" in c.properties)
        ]

        def cb(char):
            def _inner(_sender, data: bytes):
                nm = CHAR_NAMES.get(char.uuid.lower(), "")
                print(f"[event] {nm or char.uuid}: <{hexs(data)}>", flush=True)
            return _inner

        print(f"\nSubscribing to {len(notifiable)} notify/indicate characteristic(s)...", flush=True)
        for c in notifiable:
            try:
                await client.start_notify(c, cb(c))
            except Exception as e:  # noqa: BLE001
                print(f"  ! could not subscribe {c.uuid}: {e!r}", flush=True)

        print(
            "\n>>> Service C is visible WITHOUT auth. Now ROLL A CAR through the gate.\n"
            ">>> Watching 40s for car-detect / speed events... (Ctrl-C to stop)\n",
            flush=True,
        )
        try:
            await asyncio.sleep(40)
        except asyncio.CancelledError:
            pass
        print("\nDone watching. If you saw [event] lines above with car UIDs/speed,", flush=True)
        print("the desktop path works without auth and the issue is iOS-specific.", flush=True)
        return 0


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\ninterrupted", flush=True)
