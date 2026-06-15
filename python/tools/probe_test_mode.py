#!/usr/bin/env python3
"""
TEST-mode probe.

In the portal's TEST/diagnostic mode the normal NFC/drive-by protobuf stream on
TX/RX goes silent (confirmed: even chipped cars stop reporting), yet the app's
IR-gate diagnostic screen still updates -- so the gate data must arrive on a
channel we aren't watching. This tool, while holding the portal in TEST mode:

  * subscribes to EVERY notify/indicate characteristic (not just TX/RX) and
    raw-dumps each, decrypting + parsing TX/RX as usual;
  * re-reads the full GATT table *while in TEST mode* (uncached) and diffs it
    against the connect-time table, to catch a debug-only characteristic; if a
    new notify/indicate characteristic appears, it subscribes to that too;
  * keepalives every 0.5 s and auto-reconnects, since TEST drops the link.

Roll cars (chipped and non-chipped) through the IR gates and watch for any
traffic on a non-TX/RX channel, or a "+ NEW" characteristic.

Usage:
    python probe_test_mode.py                 # scan for HWiD
    python probe_test_mode.py <ADDRESS>
    python probe_test_mode.py --mode test     # (default) | normal | fast
"""
import argparse
import asyncio
import sys
import time
from datetime import datetime

from bleak import BleakScanner, BleakClient

from hwportal.mpid import (
    MpidSession, parse_message, _pb_fields,
    PORTAL_NAME, CHAR_TXRX, CHAR_FACTORY, CHAR_SESSION,
    DeviceMode, cmd_set_mode, cmd_request_device_info,
)

_MODES = {"fast": DeviceMode.FAST, "normal": DeviceMode.NORMAL, "test": DeviceMode.TEST}


def ts() -> str:
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]


def _short(uuid: str) -> str:
    """af0a6ec7-0002-000b-... -> 0002-000b ; 00002a05-... -> 2a05.

    Must keep BOTH the 0002 and the 000a/000b group so TX/RX (…-000a) and the
    OTA char (…-000b) are distinguishable."""
    p = uuid.split("-")
    return f"{p[1]}-{p[2]}" if uuid.lower().startswith("af0a6ec7") else p[0][-4:]


# ---- uncached GATT re-read (bleak's privileged handle for chars; fresh handle
#      for the service list) -- same technique as gatt_dump.py -----------------
async def _call_cached(obj, base_name, cache_mode):
    wcm = base_name.replace("_async", "_with_cache_mode_async")
    if hasattr(obj, wcm):
        return await getattr(obj, wcm)(cache_mode)
    fn = getattr(obj, base_name)
    try:
        return await fn(cache_mode)
    except TypeError:
        return await fn()


async def uncached_chars(client, address: str) -> dict:
    """{char_uuid: (svc_uuid, props_tuple)} read uncached."""
    from winrt.windows.devices.bluetooth import BluetoothLEDevice, BluetoothCacheMode
    from winrt.windows.devices.bluetooth.genericattributeprofile import GattCommunicationStatus
    OK = GattCommunicationStatus.SUCCESS
    flags = [(0x01, "broadcast"), (0x02, "read"), (0x04, "write-without-response"),
             (0x08, "write"), (0x10, "notify"), (0x20, "indicate")]

    bleak_objs = {str(s.uuid).lower(): s.obj for s in client.services
                  if getattr(s, "obj", None) is not None}
    fresh_objs = {}
    dev = await BluetoothLEDevice.from_bluetooth_address_async(
        int(address.replace(":", ""), 16))
    if dev is not None:
        sres = await _call_cached(dev, "get_gatt_services_async", BluetoothCacheMode.UNCACHED)
        if sres.status == OK:
            fresh_objs = {str(s.uuid).lower(): s for s in sres.services}

    out = {}
    for su in sorted(set(bleak_objs) | set(fresh_objs)):
        svc = bleak_objs.get(su) or fresh_objs.get(su)
        cres = await _call_cached(svc, "get_characteristics_async", BluetoothCacheMode.UNCACHED)
        if cres.status == OK:
            for ch in cres.characteristics:
                v = int(ch.characteristic_properties)
                props = tuple(n for bit, n in flags if v & bit)
                out[str(ch.uuid).lower()] = (su, props)
    return out


class Probe:
    def __init__(self, mode: str = "test", keepalive: float = 0.5):
        self.session = MpidSession()
        self.mode = mode
        self.keepalive = keepalive
        self._subscribed: set[str] = set()
        self._connect_chars: dict = {}

    def _make_cb(self, uuid: str):
        u = uuid.lower()
        tag = _short(uuid)

        def cb(_c, data: bytearray):
            b = bytes(data)
            if u == CHAR_TXRX.lower():
                for payload in self.session.feed(b):
                    msg = parse_message(payload)
                    what = ("HEARTBEAT" if msg.info is not None else
                            (f"EVENT {msg.event.type.name}" if msg.event else "msg"))
                    if msg.info is None:           # skip the noisy heartbeat dump
                        print(f"[{ts()}] TXRX  {what}  payload({len(payload)}B)={payload.hex()}")
                        fields = {k: [v.hex() if isinstance(v, (bytes, bytearray)) else v
                                      for v in vs] for k, vs in _pb_fields(payload).items()}
                        print(f"          fields={fields}")
            else:
                # ANY non-TXRX channel carrying data in TEST mode is the prize.
                print(f"[{ts()}] >>> {tag}  ({len(b)}B) {b.hex()}")
        return cb

    async def _subscribe(self, client, uuid: str):
        ch = client.services.get_characteristic(uuid)
        if ch is None or uuid in self._subscribed:
            return
        try:
            await client.start_notify(uuid, self._make_cb(uuid))
            self._subscribed.add(uuid)
            print(f"  subscribed {_short(uuid)} [{','.join(ch.properties)}]")
        except Exception as e:
            print(f"  (could not subscribe {_short(uuid)}: {e})")

    async def _subscribe_all(self, client):
        for svc in client.services:
            for ch in svc.characteristics:
                props = ch.properties
                if "notify" in props or "indicate" in props:
                    await self._subscribe(client, ch.uuid)

    async def find_portal(self) -> str | None:
        print("Scanning for Hot Wheels Portal...")
        for d in await BleakScanner.discover(timeout=15.0):
            if d.name and PORTAL_NAME.lower() in d.name.lower():
                print(f"Found portal: {d.name} ({d.address})")
                return d.address
        print("Portal not found.")
        return None

    async def run(self, address: str | None):
        if address is None:
            address = await self.find_portal()
            if address is None:
                return
        attempt = 0
        while True:
            attempt += 1
            try:
                await self._once(address)
            except KeyboardInterrupt:
                print("\nStopping.")
                return
            except Exception as e:
                print(f"\nConnection error: {e}")
            print(f"-- reconnecting (attempt {attempt + 1})... Ctrl+C to stop --")
            try:
                await asyncio.sleep(1.5)
            except KeyboardInterrupt:
                print("\nStopping.")
                return

    async def _once(self, address: str):
        self.session = MpidSession()
        self._subscribed = set()
        print(f"\nConnecting to {address}...")
        async with BleakClient(address) as client:
            print(f"Connected: {client.is_connected}  (MTU {client.mtu_size})")

            # Only TX/RX + SESSION are needed for the handshake; subscribing the
            # OTA channel pre-auth seems to destabilize the link, so do it after.
            await self._subscribe(client, CHAR_TXRX)
            await self._subscribe(client, CHAR_SESSION)

            token = bytes(await client.read_gatt_char(CHAR_FACTORY))
            await client.write_gatt_char(CHAR_SESSION, self.session.start_session(token),
                                         response=True)
            self._connect_chars = await self._safe_chars(client, address)

            target = _MODES[self.mode]
            await asyncio.sleep(0.3)
            try:
                await client.write_gatt_char(CHAR_TXRX,
                                             self.session.encrypt_packet(cmd_set_mode(target)))
                await client.write_gatt_char(CHAR_TXRX,
                                             self.session.encrypt_packet(cmd_request_device_info()))
                print(f"Requested {target.name} mode.")
            except Exception as e:
                print(f"  ! mode write failed: {e}")

            # now in the mode: subscribe to every remaining notify/indicate
            # channel (OTA, etc.), then re-read the table and diff.
            await self._subscribe_all(client)
            await asyncio.sleep(1.5)
            await self._diff_and_subscribe(client, address)

            print("Listening. Roll cars through the gates. Ctrl+C to stop.\n")
            next_ka = time.monotonic() + self.keepalive
            while client.is_connected:
                await asyncio.sleep(0.2)
                if time.monotonic() >= next_ka:
                    next_ka = time.monotonic() + self.keepalive
                    try:
                        await client.write_gatt_char(
                            CHAR_TXRX, self.session.encrypt_packet(cmd_request_device_info()))
                    except Exception:
                        pass
            print("\nPortal disconnected.")

    async def _safe_chars(self, client, address) -> dict:
        try:
            return await uncached_chars(client, address)
        except Exception as e:
            print(f"  (uncached GATT read failed: {e})")
            return {}

    async def _diff_and_subscribe(self, client, address):
        now = await self._safe_chars(client, address)
        if not now or not self._connect_chars:
            return
        new = set(now) - set(self._connect_chars)
        changed = {u for u in (set(now) & set(self._connect_chars))
                   if now[u] != self._connect_chars[u]}
        if not (new or changed):
            print(f"GATT table unchanged in {self.mode.upper()} mode "
                  f"({len(now)} characteristics).")
            return
        print(f"\n*** GATT CHANGED in {self.mode.upper()} mode! ***")
        for u in sorted(new):
            svc, props = now[u]
            print(f"  + NEW  {u}  svc={svc}  [{','.join(props)}]")
            if "notify" in props or "indicate" in props:
                try:
                    await client.start_notify(u, self._make_cb(u))
                    print(f"    -> subscribed to {_short(u)}")
                except Exception as e:
                    print(f"    -> could not subscribe: {e}")
        for u in sorted(changed):
            print(f"  ~ CHG  {u}  {self._connect_chars[u]} -> {now[u]}")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("address", nargs="?", default=None)
    ap.add_argument("--mode", choices=list(_MODES), default="test")
    ap.add_argument("--keepalive", type=float, default=0.5)
    args = ap.parse_args()
    # Need to handle Python path so we can import from hwportal
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from hwportal.utils import get_default_portal_id
    args.address = get_default_portal_id(args.address)
    await Probe(mode=args.mode, keepalive=args.keepalive).run(args.address)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)
