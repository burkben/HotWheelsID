#!/usr/bin/env python3
"""Offline self-consistency tests for hwportal.mpid (no portal needed)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from hwportal.mpid import MpidSession, crc8, _CRC8_TABLE  # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec  # noqa: E402
from cryptography.hazmat.primitives import serialization  # noqa: E402


def _synthetic_token(kid: int = 9999999) -> bytes:
    """A structurally valid 136-byte MPID token with NO real device data:
    placeholder serial + a freshly generated (valid) P-256 public key.
    KID 9999999 is Mattel's public test key, not personally identifying.
    """
    pub = ec.generate_private_key(ec.SECP256R1()).public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.CompressedPoint)
    serial = b"SYNTHETIC-TOKEN".ljust(24, b"0")               # 24 bytes
    token = (bytes([1]) + serial + pub + b"\x00" * 5 + b"\x00\x01"
             + kid.to_bytes(3, "big") + b"\x00" * 64 + b"\x11\x22\x33\x44")
    assert len(token) == 136
    return token


# Synthetic token (no captured device data).
TOKEN = _synthetic_token()

# 1) CRC-8 table matches the table extracted from libnative-lib.so
EXPECTED_HEAD = [0, 7, 14, 9, 28, 27, 18, 21, 56, 63, 54, 49, 36, 35, 42, 45]
assert _CRC8_TABLE[:16] == EXPECTED_HEAD, _CRC8_TABLE[:16]
print("crc8 table OK; crc8(b'123456789')=0x%02x" % crc8(b"123456789"))

# 2) Two mirrored endpoints sharing a session key must round-trip every frame.
#    Endpoint A (us): local=saltL, peer=saltP.  Endpoint B (portal mirror).
KEY = bytes.fromhex("00112233445566778899aabbccddeeff")
saltL, saltP = b"\x01\x02\x03\x04", b"\xaa\xbb\xcc\xdd"

a = MpidSession()
a.session_key, a.local_salt, a.peer_salt, a.encrypted = KEY, saltL, saltP, True
b = MpidSession()
b.session_key, b.local_salt, b.peer_salt, b.encrypted = KEY, saltP, saltL, True  # mirror

cases = [b"", b"\x04", b"hello portal", os.urandom(200), bytes(range(256)) + bytes(range(255))]
for i, payload in enumerate(cases):
    if len(payload) > 0x1FF:
        payload = payload[:0x1FF]
    frame = a.encrypt_packet(payload)
    # also exercise fragmented delivery (split the frame across feed() calls)
    got = []
    mid = len(frame) // 2
    got += b.feed(frame[:mid])
    got += b.feed(frame[mid:])
    assert got == [payload], (i, len(payload), got[:1])
print("round-trip OK across %d payloads (incl. empty, 200B, 511B, fragmented)" % len(cases))

# 3) start_session against the real token: parses, ECDHs, derives a 16-byte key,
#    and yields a 37-byte SESSION payload (33B compressed pubkey + 4B salt).
s = MpidSession()
payload = s.start_session(TOKEN)
print("token:", s.token)
assert len(payload) == 37, len(payload)
assert payload[0] in (2, 3) and payload[:33] == s.compressed_public_key
assert payload[33:] == s.local_salt
assert s.session_key and len(s.session_key) == 16
print("start_session OK: SESSION payload = %s" % payload.hex())
print("  (our compressed pubkey + local salt; session_key derived, 16 bytes)")
assert s.token.serial.decode("ascii").startswith("SYNTHETIC")  # serial is in the token
print("token serial OK: %r" % s.token.serial.decode("ascii"))

# 4) KDF determinism: same private key + token -> same session key.
priv = ec.generate_private_key(ec.SECP256R1())
s1 = MpidSession(private_key=priv, local_salt=b"\x00\x00\x00\x00")
s2 = MpidSession(private_key=priv, local_salt=b"\x00\x00\x00\x00")
s1.start_session(TOKEN); s2.start_session(TOKEN)
assert s1.session_key == s2.session_key
print("KDF deterministic OK: session_key=%s" % s1.session_key.hex())

# 5) parse_payload against real captured packets (from mpid_monitor_stdout.txt).
from hwportal.mpid import (  # noqa: E402
    parse_payload, format_uid, decode_ndef_record, decode_speed_mph,
)
from hwportal.constants import CHAR_EVENT_1, CHAR_EVENT_2, CHAR_EVENT_3  # noqa: E402

HEARTBEAT = bytes.fromhex("1a1a082a10071d0000803f200228003801400b48225205312e302e39")
CAR = bytes.fromhex(
    "08c0c00d127f0802127b0a07042a7ea2f1628010001a2c91012855027069642e6d61"
    "7474656c2f41514242726c356241414147414630544b5a63454b6e366938574b4122"
    "40e073d4be90cff1c5268d1121f028538ffddd07209b31e51fc24100c91ff9605919"
    "d02dda5130a9213e248e1465eee93a1222ba376a861956017ddae79305490e")
PRESENT = bytes.fromhex("08fbef0d120d080312090a07042a7ea2f16280")
SPEED = bytes.fromhex(
    "089af40d122f080412090a07042a7ea2f162801a2008f9f00d157e54183f1880b3fe"
    "ffffffffffff0120d0aa0528e08b0a3080e70f")

hb = parse_payload(HEARTBEAT)
assert hb["version"] == "1.0.9", hb
assert hb["events"] == [], hb["events"]
print("heartbeat OK: version=%s" % hb["version"])

car = dict(parse_payload(CAR)["events"])
assert car.get(CHAR_EVENT_2) == bytes.fromhex("042a7ea2f16280"), car
assert format_uid(car[CHAR_EVENT_2]) == "2A:7E:A2:F1:62:80"
ndef = decode_ndef_record(car[CHAR_EVENT_1])
assert ndef.get("mattel_id") == "AQBBrl5bAAAGAF0TKZcEKn6i8WKA", ndef
print("car event OK: uid=%s mattel_id=%s" % (format_uid(car[CHAR_EVENT_2]), ndef["mattel_id"]))

assert dict(parse_payload(PRESENT)["events"]).get(CHAR_EVENT_2) == b""  # type 3 = car removed

speed = dict(parse_payload(SPEED)["events"])
mph = decode_speed_mph(speed[CHAR_EVENT_3])
assert abs(mph - 0.595039 * 64) < 0.05, mph
print("speed event OK: %.2f scale-mph" % mph)

# 6) Structured parse_message() against the captured packets.
from hwportal.mpid import (  # noqa: E402
    parse_message, EventType, DeviceMode, BatteryStatus, to_legacy_events,
    cmd_request_device_info, cmd_set_led_color, CommandType,
    _pb_fields, _pb_first,
)

m = parse_message(HEARTBEAT)
assert m.info is not None and m.event is None
assert m.info.semantic_firmware_version == "1.0.9"
assert abs(m.info.battery_level - 1.0) < 1e-6
assert m.info.mode == DeviceMode.NORMAL
assert m.info.battery_status == BatteryStatus.NOT_CHARGING
assert m.info.serial_number == ""   # this fw omits serial from the heartbeat;
                                    # the serial comes from the FACTORY token
print("device info OK: v%s battery=%.2f %s mode=%s (serial not in heartbeat)" % (
    m.info.semantic_firmware_version, m.info.battery_level,
    m.info.battery_status.name, m.info.mode.name))

m = parse_message(CAR)
assert m.event.type == EventType.CAR_ON_PORTAL
assert m.event.car_info.uid == "2A:7E:A2:F1:62:80"
assert m.event.car_info.mattel_id == "AQBBrl5bAAAGAF0TKZcEKn6i8WKA"
assert len(m.event.car_info.signature) == 64

m = parse_message(PRESENT)
assert m.event.type == EventType.CAR_OFF_PORTAL
assert dict(to_legacy_events(m)).get(CHAR_EVENT_2) == b""        # removal signal

m = parse_message(SPEED)
sm = m.event.speed_measurement
assert m.event.type == EventType.CAR_DRIVE_BY
assert abs(sm.speed_mph - 0.595039 * 64) < 0.05
assert (sm.t_ir1_in, sm.t_ir1_out, sm.t_ir2_in, sm.t_ir2_out) == (-26240, 87376, 165344, 258944)
print("drive-by OK: %.1f scale-mph, gates ir1[%d,%d] ir2[%d,%d]" % (
    sm.speed_mph, sm.t_ir1_in, sm.t_ir1_out, sm.t_ir2_in, sm.t_ir2_out))


# 7) Command encoding round-trips (AppToPortal.command).
def _cmd_inner(app_bytes):
    return _pb_fields(_pb_first(_pb_fields(app_bytes), 2))

c = _cmd_inner(cmd_request_device_info())
assert _pb_first(c, 1) == int(CommandType.REQUEST_DEVICE_INFO)

c = _cmd_inner(cmd_set_led_color(255, 0, 128))
assert _pb_first(c, 1) == int(CommandType.SET_LED_COLOR)
assert _pb_first(c, 4) == bytes([255, 0, 128])
print("command encoding OK (request_device_info, set_led_color)")

# 8) HotWheelsPortal MPID -> legacy synthesis (the shared auto-detect transport).
#    Verifies dashboard.py / race_mode.py work on modern firmware unchanged: the
#    portal feeds decoded MPID messages through the same (char, data) callback the
#    legacy notify path uses, and synthesizes a per-car serial from the mattel_id.
from hwportal.portal import HotWheelsPortal, PortalInfo  # noqa: E402
from hwportal.constants import CHAR_SERIAL_NUMBER  # noqa: E402


def _emit_collect(msg):
    p = HotWheelsPortal()
    p.info = PortalInfo(address="offline-test")
    out = []
    p.on_event(lambda ev: out.append((ev.characteristic, ev.data)))
    p._emit_mpid_message(msg)
    return p, out


# Heartbeat refreshes device info (firmware) and emits no car/speed events.
p, out = _emit_collect(parse_message(HEARTBEAT))
assert out == [], out
assert p.info.firmware_version == "1.0.9", p.info.firmware_version
print("portal heartbeat OK: firmware -> %s, no spurious events" % p.info.firmware_version)

# Car on portal: legacy events in order + synthesized per-car serial (mattel_id).
m = parse_message(CAR)
p, out = _emit_collect(m)
assert out[: len(to_legacy_events(m))] == to_legacy_events(m), out
assert out[0] == (CHAR_EVENT_2, bytes.fromhex("042a7ea2f16280")), out[0]
assert out[-1] == (CHAR_SERIAL_NUMBER, b"AQBBrl5bAAAGAF0TKZcEKn6i8WKA"), out[-1]
print("portal CAR synthesis OK: detect -> ndef -> serial(%s)" % out[-1][1].decode())

# Car removed: a single empty CHAR_EVENT_2 removal signal, no serial.
m = parse_message(PRESENT)
p, out = _emit_collect(m)
assert out == [(CHAR_EVENT_2, b"")], out
print("portal CAR-OFF synthesis OK: EVENT_2 removal signal")

# Drive-by: legacy events incl. EVENT_3 speed. This pass reuses the car already
# identified on CAR_ON_PORTAL (the drive-by carries no NDEF), so no serial is
# re-synthesized — attribution falls back to the consumer's current car.
m = parse_message(SPEED)
p, out = _emit_collect(m)
assert out == to_legacy_events(m), out
chars = [c for c, _ in out]
assert CHAR_EVENT_2 in chars and CHAR_EVENT_3 in chars, chars
assert CHAR_SERIAL_NUMBER not in chars, chars  # identity already known from CAR_ON
mph = decode_speed_mph(dict(out)[CHAR_EVENT_3])
assert abs(mph - 0.595039 * 64) < 0.05, mph
print("portal SPEED synthesis OK: %.2f scale-mph via EVENT_3 (no re-serial)" % mph)

print("\nALL OFFLINE TESTS PASSED")
