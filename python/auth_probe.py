#!/usr/bin/env python3
"""
Hot Wheels Portal — Service A authentication probe.

This is the tool for the ONE thing the upstream project never did: actually
engage the portal's authentication handshake. The reference code
(`hwportal/portal.py`, `monitor.py`, `dashboard.py`) contains **no auth logic at
all** — it reads the 148-byte device key once and throws it away, and never
writes to the Auth Command / Auth Response channels. That was fine on older
firmware that published Service C (car/speed/serial) openly. Newer firmware —
like the unit this repo is being built against — hides Service C until a central
completes a challenge/response on Service A, so the reference tools connect but
stream nothing.

This script:
  1. Connects as a fresh central and dumps the full GATT table.
  2. Reads + structurally analyses the 148-byte certificate at 0003-000a (the
     raw material for any handshake crack).
  3. Subscribes to the Auth indicate channels (0002-000a, 0004-000a) and the
     Data channel (0002-000b) and logs every indication.
  4. With --probe, sends a small, fully-logged set of candidate "start auth"
     writes to the Command channel (0002-000a) and watches for a challenge.
  5. Re-checks the service table afterwards to detect whether Service C appeared
     (a GATT "Service Changed" after a successful unlock).

Run it in a REAL terminal (Terminal.app / iTerm) so macOS can grant Bluetooth
permission — it is killed with "Abort trap: 6" from an automated/agent shell.
Disconnect the iPhone app first: the portal accepts only ONE connection.

    cd python
    .venv/bin/python auth_probe.py            # safe: dump cert + listen only
    .venv/bin/python auth_probe.py --probe    # also send handshake probe writes
    .venv/bin/python auth_probe.py --dump-cert portal_cert.bin   # save raw cert

Writes (only with --probe) go solely to the documented Command channel and are
reversible — a power cycle resets all BLE state. Nothing here can brick the toy.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from bleak import BleakScanner, BleakClient

PORTAL_NAME = "HWiD"

SERVICE_AUTH = "af0a6ec7-0001-000a-84a0-91559fc6f0de"
SERVICE_DATA = "af0a6ec7-0001-000b-84a0-91559fc6f0de"
SERVICE_CONTROL = "af0a6ec7-0001-000c-84a0-91559fc6f0de"

CHAR_AUTH_COMMAND = "af0a6ec7-0002-000a-84a0-91559fc6f0de"   # write, indicate
CHAR_AUTH_KEY = "af0a6ec7-0003-000a-84a0-91559fc6f0de"        # read (148-byte cert)
CHAR_AUTH_RESPONSE = "af0a6ec7-0004-000a-84a0-91559fc6f0de"   # write, indicate
CHAR_DATA_COMMAND = "af0a6ec7-0002-000b-84a0-91559fc6f0de"    # write, indicate

CHAR_NAMES = {
    CHAR_AUTH_COMMAND: "Auth Command",
    CHAR_AUTH_KEY: "Auth Key/Cert",
    CHAR_AUTH_RESPONSE: "Auth Response",
    CHAR_DATA_COMMAND: "Data Command",
}

INDICATE_CHANNELS = [CHAR_AUTH_COMMAND, CHAR_AUTH_RESPONSE, CHAR_DATA_COMMAND]


def now_ms() -> str:
    import datetime

    return datetime.datetime.now().strftime("%H:%M:%S.%f")[:-3]


def hexdump(data: bytes, width: int = 16) -> str:
    lines = []
    for off in range(0, len(data), width):
        chunk = data[off : off + width]
        hexs = " ".join(f"{b:02x}" for b in chunk)
        ascii_g = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
        lines.append(f"  {off:04x}  {hexs:<{width * 3}}  {ascii_g}")
    return "\n".join(lines)


def printable_runs(data: bytes, min_len: int = 4) -> list[str]:
    runs, cur = [], []
    for b in data:
        if 32 <= b < 127:
            cur.append(chr(b))
        else:
            if len(cur) >= min_len:
                runs.append("".join(cur))
            cur = []
    if len(cur) >= min_len:
        runs.append("".join(cur))
    return runs


def analyse_cert(data: bytes) -> None:
    print(f"\n=== DEVICE CERTIFICATE / KEY ({len(data)} bytes @ 0003-000a) ===", flush=True)
    print(hexdump(data), flush=True)

    print("\n  -- structure heuristics --", flush=True)
    if not data:
        print("  (empty — read failed or characteristic is blank)", flush=True)
        return
    if data[0] == 0x30:
        # ASN.1 DER SEQUENCE: 0x30, length, ...
        ln = data[1]
        long_form = ln & 0x80
        print(
            f"  leading 0x30 → looks like ASN.1 DER SEQUENCE "
            f"(len byte 0x{ln:02x}{' long-form' if long_form else ''}) → likely an X.509-ish cert",
            flush=True,
        )
    else:
        print(f"  leading byte 0x{data[0]:02x} (not 0x30 → not plain DER; maybe key||sig or TLV)", flush=True)

    runs = printable_runs(data)
    if runs:
        print(f"  embedded ASCII runs: {runs}", flush=True)
    else:
        print("  no ASCII runs ≥4 (looks like pure binary key/signature material)", flush=True)
    # Common split: many schemes are <pubkey || signature>. 148 = e.g. 64+84, 20+128, etc.
    print(f"  length {len(data)} = 0x{len(data):02x}; note for offline analysis of any crypto split", flush=True)


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
    print("No portal found. Powered on and NOT connected to the iPhone?", flush=True)
    return None


def service_uuids(client: BleakClient) -> set[str]:
    return {s.uuid.lower() for s in client.services}


def has_control(client: BleakClient) -> bool:
    return SERVICE_CONTROL in service_uuids(client)


def print_gatt(client: BleakClient) -> None:
    print("\n=== GATT TABLE ===", flush=True)
    for s in client.services:
        tag = (
            "A/auth"
            if s.uuid.lower() == SERVICE_AUTH
            else "B/data"
            if s.uuid.lower() == SERVICE_DATA
            else "C/control"
            if s.uuid.lower() == SERVICE_CONTROL
            else "?"
        )
        print(f"[{tag:9}] {s.uuid}", flush=True)
        for c in s.characteristics:
            nm = CHAR_NAMES.get(c.uuid.lower(), "")
            print(f"            {c.uuid}  ({','.join(c.properties)}){'  ' + nm if nm else ''}", flush=True)


async def main() -> int:
    ap = argparse.ArgumentParser(description="Probe the Hot Wheels portal Service A auth handshake.")
    ap.add_argument("--probe", action="store_true", help="send candidate handshake writes (default: listen only)")
    ap.add_argument("--dump-cert", metavar="PATH", help="write the raw 148-byte certificate to PATH")
    ap.add_argument("--watch", type=float, default=20.0, help="seconds to watch for indications (default 20)")
    args = ap.parse_args()

    dev = await find_portal()
    if not dev:
        return 1

    print("Connecting...", flush=True)
    async with BleakClient(dev) as client:
        print(f"Connected: {client.is_connected}", flush=True)
        print_gatt(client)

        ctrl_before = has_control(client)
        print(
            f"\nService C (control) present at connect: "
            f"{'YES ✅ (no auth needed — older/open firmware)' if ctrl_before else 'NO ❌ (gated behind Service A auth)'}",
            flush=True,
        )

        # --- 1. Read + analyse the certificate ---
        cert = b""
        try:
            cert = bytes(await client.read_gatt_char(CHAR_AUTH_KEY))
        except Exception as e:  # noqa: BLE001
            print(f"\n! could not read Auth Key/Cert (0003-000a): {e!r}", flush=True)
        if cert:
            analyse_cert(cert)
            if args.dump_cert:
                with open(args.dump_cert, "wb") as fh:
                    fh.write(cert)
                print(f"\n  → raw certificate written to {args.dump_cert}", flush=True)

        # --- 2. Listen on the auth/data indicate channels ---
        def make_cb(uuid: str):
            def _cb(_sender, data: bytearray):
                nm = CHAR_NAMES.get(uuid.lower(), uuid)
                hexs = " ".join(f"{b:02x}" for b in data)
                print(f"[{now_ms()}] <indication> {nm}: <{hexs}>", flush=True)

            return _cb

        subscribed = []
        for uuid in INDICATE_CHANNELS:
            try:
                await client.start_notify(uuid, make_cb(uuid))
                subscribed.append(uuid)
                print(f"  subscribed: {CHAR_NAMES.get(uuid, uuid)}", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"  ! subscribe failed {uuid}: {e!r}", flush=True)

        # --- 3. Optionally send candidate "start auth" writes ---
        if args.probe:
            print("\n=== PROBE: writing candidate handshake commands to 0002-000a ===", flush=True)
            print("    (watching for a challenge/indication after each; power-cycle resets state)", flush=True)
            candidates: list[bytes] = [
                bytes([0x01]),
                bytes([0x00]),
                bytes([0x01, 0x00]),
                bytes([0x02]),
                bytes([0xa0]),
                bytes([0x01]) + cert[:16] if cert else bytes([0x01]),
            ]
            for i, payload in enumerate(candidates, 1):
                hexs = " ".join(f"{b:02x}" for b in payload)
                print(f"\n  [{i}/{len(candidates)}] write 0002-000a <- <{hexs}>", flush=True)
                try:
                    await client.write_gatt_char(CHAR_AUTH_COMMAND, payload, response=True)
                except Exception as e:  # noqa: BLE001
                    print(f"      write error: {e!r}", flush=True)
                await asyncio.sleep(2.0)
                if has_control(client) and not ctrl_before:
                    print("      *** Service C APPEARED after this write! ***", flush=True)
                    break

        # --- 4. Passive watch window ---
        print(f"\nWatching {args.watch:.0f}s for any indications (Ctrl-C to stop)...", flush=True)
        try:
            await asyncio.sleep(args.watch)
        except (asyncio.CancelledError, KeyboardInterrupt):
            pass

        for uuid in subscribed:
            try:
                await client.stop_notify(uuid)
            except Exception:  # noqa: BLE001
                pass

        # --- 5. Final verdict ---
        ctrl_after = has_control(client)
        print("\n=== VERDICT ===", flush=True)
        print(f"  Service C before: {'present' if ctrl_before else 'absent'}", flush=True)
        print(f"  Service C after : {'present ✅' if ctrl_after else 'absent ❌'}", flush=True)
        if ctrl_after and not ctrl_before:
            print("  → A probe write UNLOCKED the control service. Capture the exact sequence!", flush=True)
        elif not ctrl_after:
            print(
                "  → Control service still hidden. The handshake needs a correct response to the\n"
                "    certificate challenge (historically computed by Mattel's now-discontinued\n"
                "    backend). Save the cert (--dump-cert) for offline crypto analysis.",
                flush=True,
            )
        return 0 if ctrl_after else 2


if __name__ == "__main__":
    try:
        sys.exit(asyncio.run(main()))
    except KeyboardInterrupt:
        print("\ninterrupted", flush=True)
