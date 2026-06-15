#!/usr/bin/env python3
"""
Dump the portal's GATT table BEFORE and AFTER the MPID auth handshake, to test
whether the attribute table is dynamic (auth-gated) -- e.g. a raw IR/diagnostic
characteristic that only appears once authenticated.

Windows BLE quirks this works around:
  * bleak caches the service collection at connect and never re-queries.
  * The app can't subscribe to Service Changed (0x2A05) -- the OS owns it.
  * A *second* WinRT device handle gets AccessDenied reading characteristics of
    services that bleak already holds open.

So a snapshot reads:
  * the SERVICE list via a fresh WinRT handle, UNCACHED (this is allowed), to
    catch any newly-appearing service; and
  * each service's CHARACTERISTICS via bleak's own already-open, privileged
    service handle, UNCACHED, to force a fresh read without AccessDenied.
We snapshot before auth and after auth, then diff.

Usage:
    python gatt_dump.py                # scan for HWiD and connect
    python gatt_dump.py <ADDRESS>      # connect to a specific BLE address
"""
import argparse
import asyncio
import sys

from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bleak import BleakScanner, BleakClient

from hwportal.mpid import (
    MpidSession, parse_message,
    PORTAL_NAME, CHAR_TXRX, CHAR_FACTORY, CHAR_SESSION,
)

# GattCharacteristicProperties flag bits (WinRT)
_PROP_FLAGS = [
    (0x01, "broadcast"), (0x02, "read"), (0x04, "write-without-response"),
    (0x08, "write"), (0x10, "notify"), (0x20, "indicate"),
    (0x40, "authenticated-signed-writes"), (0x80, "extended-properties"),
]


def _decode_props(value) -> tuple:
    v = int(value)
    return tuple(name for bit, name in _PROP_FLAGS if v & bit)


def _addr_to_int(address: str) -> int:
    return int(address.replace(":", "").replace("-", ""), 16)


async def _call_cached(obj, base_name: str, cache_mode):
    """Call a WinRT async getter with an explicit cache mode, tolerating the
    different ways PyWinRT projects overloaded methods (distinct
    `_with_cache_mode_async` name, or the mode as a positional arg)."""
    wcm = base_name.replace("_async", "_with_cache_mode_async")
    if hasattr(obj, wcm):
        return await getattr(obj, wcm)(cache_mode)
    fn = getattr(obj, base_name)
    try:
        return await fn(cache_mode)
    except TypeError:
        return await fn()


def _bleak_service_objs(client) -> dict:
    """{service_uuid: WinRT GattDeviceService} from bleak's already-open handles."""
    out = {}
    for s in client.services:
        obj = getattr(s, "obj", None)
        if obj is not None:
            out[str(s.uuid).lower()] = obj
    return out


async def snapshot(client, address: str) -> dict:
    """Return {char_uuid: (svc_uuid, props)} read uncached, using bleak's
    privileged handles for characteristics and a fresh handle for the service
    list (to catch a service that only appears after auth)."""
    from winrt.windows.devices.bluetooth import (
        BluetoothLEDevice, BluetoothCacheMode,
    )
    from winrt.windows.devices.bluetooth.genericattributeprofile import (
        GattCommunicationStatus,
    )
    OK = GattCommunicationStatus.SUCCESS

    bleak_objs = _bleak_service_objs(client)

    # Fresh service LIST (uncached) -- this part isn't AccessDenied.
    fresh_objs = {}
    dev = await BluetoothLEDevice.from_bluetooth_address_async(_addr_to_int(address))
    if dev is not None:
        sres = await _call_cached(dev, "get_gatt_services_async", BluetoothCacheMode.UNCACHED)
        if sres.status == OK:
            fresh_objs = {str(s.uuid).lower(): s for s in sres.services}

    svc_uuids = sorted(set(bleak_objs) | set(fresh_objs))
    table = {}
    for su in svc_uuids:
        svc_obj = bleak_objs.get(su) or fresh_objs.get(su)   # prefer bleak's open handle
        cres = await _call_cached(svc_obj, "get_characteristics_async", BluetoothCacheMode.UNCACHED)
        if cres.status == OK:
            for ch in cres.characteristics:
                table[str(ch.uuid).lower()] = (su, _decode_props(ch.characteristic_properties))
        else:
            via = "bleak" if su in bleak_objs else "fresh"
            table[f"<{su}: chars unreadable status {int(cres.status)} via {via}>"] = (su, ())
    return table


def _dump(table: dict, label: str):
    print(f"\n===== GATT table {label} =====")
    by_svc = {}
    for cu, (su, props) in table.items():
        by_svc.setdefault(su, []).append((cu, props))
    for su in sorted(by_svc):
        print(f"Service {su}")
        for cu, props in sorted(by_svc[su]):
            print(f"  Char {cu}  [{','.join(props)}]")
    print("=" * (len(label) + 24))


def _diff(before: dict, after: dict):
    new_chars = set(after) - set(before)
    changed = {u for u in (set(after) & set(before)) if after[u] != before[u]}
    gone = set(before) - set(after)
    print("\n----- DIFF (after auth vs before auth) -----")
    if not (new_chars or changed or gone):
        print("No change: the attribute table is identical before and after auth.")
    for u in sorted(new_chars):
        svc, props = after[u]
        print(f"  + NEW  {u}  svc={svc}  [{','.join(props)}]")
    for u in sorted(changed):
        print(f"  ~ CHG  {u}  {before[u]} -> {after[u]}")
    for u in sorted(gone):
        print(f"  - GONE {u}")
    print("--------------------------------------------")


async def find_portal() -> str | None:
    print("Scanning for Hot Wheels Portal...")
    devices = await BleakScanner.discover(timeout=15.0)
    for d in devices:
        if d.name and PORTAL_NAME.lower() in d.name.lower():
            print(f"Found portal: {d.name} ({d.address})")
            return d.address
    print(f"Scanned {len(devices)} devices; portal not found.")
    return None


async def run(address: str | None):
    if address is None:
        address = await find_portal()
        if address is None:
            return

    session = MpidSession()
    got_heartbeat = asyncio.Event()

    def on_txrx(_c, data: bytearray):
        for payload in session.feed(bytes(data)):
            if parse_message(payload).info is not None:
                got_heartbeat.set()

    print(f"\nConnecting to {address}...")
    async with BleakClient(address) as client:
        print(f"Connected: {client.is_connected}  (MTU {client.mtu_size})")

        before = await snapshot(client, address)
        _dump(before, "BEFORE auth (uncached)")

        await client.start_notify(CHAR_TXRX, on_txrx)
        await client.start_notify(CHAR_SESSION, lambda _c, d: None)

        token = bytes(await client.read_gatt_char(CHAR_FACTORY))
        await client.write_gatt_char(CHAR_SESSION, session.start_session(token),
                                     response=True)
        print("Handshake written; waiting for an encrypted heartbeat to confirm auth...")
        try:
            await asyncio.wait_for(got_heartbeat.wait(), timeout=10.0)
            print("AUTH CONFIRMED (decrypted a heartbeat).")
        except asyncio.TimeoutError:
            print("WARNING: no heartbeat decoded within 10s; auth may have failed.")

        await asyncio.sleep(2.0)   # let any post-auth Service Changed land

        after = await snapshot(client, address)
        _dump(after, "AFTER auth (uncached)")
        _diff(before, after)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("address", nargs="?", default=None)
    args = ap.parse_args()
    from hwportal.utils import get_default_portal_id
    args.address = get_default_portal_id(args.address)
    await run(args.address)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
