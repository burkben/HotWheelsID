import { describe, it, expect } from "vitest";
import {
  CRC8_TABLE,
  crc8,
  deriveSessionKey,
  ecdhSharedX,
  compressedPublicKey,
  MpidSession,
  MpidToken,
  parseMessage,
  parseFields,
  mpidToPortalEvents,
  decodeNdefRecord,
  speedFromGates,
  EventType,
  DeviceMode,
  BatteryStatus,
  CommandType,
  cmdRequestDeviceInfo,
  cmdSetLedColor,
  SPEED_SCALE,
} from "./index";
import { parseNfcUid } from "../decode";

/** Compact hex string ("7e0000…") → bytes. Empty string → empty array. */
const b = (s: string): Uint8Array =>
  s.length === 0 ? new Uint8Array(0) : new Uint8Array(s.match(/../g)!.map((h) => parseInt(h, 16)));
const toHex = (u: Uint8Array): string =>
  Array.from(u, (x) => x.toString(16).padStart(2, "0")).join("");
const ascii = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0));

/** Big-endian 32-byte encoding of a small P-256 scalar (for deterministic KATs). */
const scalar32 = (n: number): Uint8Array => {
  const out = new Uint8Array(32);
  let v = BigInt(n);
  for (let i = 31; i >= 0 && v > 0n; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
};

// ---------------------------------------------------------------------------
// Known-answer vectors generated from the hardware-proven Python reference
// (python/hwportal/mpid.py via python/tools/gen_kat). Cross-language parity.
// ---------------------------------------------------------------------------
const KAT = {
  crc8Head: [0, 7, 14, 9, 28, 27, 18, 21, 56, 63, 54, 49, 36, 35, 42, 45],
  kdfShared: "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  kdfKey: "f579f3d6caee3e91f5f9c606e3b4ddcd",
  ourPub: "026780c5fc70275e2c7061a0e7877bb174deadeb9887027f3fa83654158ba7f50c", // scalar 42
  devPub: "030794e3e968325a26fb433d20e305d24b6a5032e87fb0abc035f2b8a448c9abf2", // scalar 1337
  sharedX: "1efc12442167f9db7796b25b425337c7e9d4357d58771ebcbe44eb7e7bd7b4cf",
  frameHello: "7e00000001000d1debea3a6f866a99c0a2a9ecaac9", // key below, payload "hello portal"
  frameEmpty: "7e0000000100003e",
  sessionToken:
    "0153594e5448455449432d544f4b454e303030303030303030030794e3e968325a26fb433d20e305d24b6a5032e87fb0abc035f2b8a448c9abf20000000000000198967f0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011223344",
  sessionPayload:
    "026780c5fc70275e2c7061a0e7877bb174deadeb9887027f3fa83654158ba7f50c05060708",
  sessionKey: "f5628a946e9b7c06e8ee53e38bd3b02a",
  sessionTxrxFrame: "7e000000010005254a3e0acc7c", // session-key frame, counter 1, payload "ping"
};

const FRAME_KEY = b("00112233445566778899aabbccddeeff");
const SALT_L = b("01020304");
const SALT_P = b("aabbccdd");

// ---------------------------------------------------------------------------
// Real decrypted protobuf payloads captured from a live portal (fw 1.0.9).
// ---------------------------------------------------------------------------
const HEARTBEAT = b("1a1a082a10071d0000803f200228003801400b48225205312e302e39");
const CAR = b(
  "08c0c00d127f0802127b0a07042a7ea2f1628010001a2c91012855027069642e6d61" +
    "7474656c2f41514242726c356241414147414630544b5a63454b6e366938574b4122" +
    "40e073d4be90cff1c5268d1121f028538ffddd07209b31e51fc24100c91ff9605919" +
    "d02dda5130a9213e248e1465eee93a1222ba376a861956017ddae79305490e",
);
const PRESENT = b("08fbef0d120d080312090a07042a7ea2f16280");
const SPEED = b(
  "089af40d122f080412090a07042a7ea2f162801a2008f9f00d157e54183f1880b3fe" +
    "ffffffffffff0120d0aa0528e08b0a3080e70f",
);

describe("crc8", () => {
  it("matches the table extracted from libnative-lib.so", () => {
    expect(Array.from(CRC8_TABLE.slice(0, 16))).toEqual(KAT.crc8Head);
  });
  it("crc8('123456789') === 0xfb", () => {
    expect(crc8(ascii("123456789"))).toBe(0xfb);
  });
});

describe("crypto KATs (cross-validated against Python)", () => {
  it("KDF derives the session key from the shared X", () => {
    expect(toHex(deriveSessionKey(b(KAT.kdfShared)))).toBe(KAT.kdfKey);
  });
  it("compressed public key for a fixed scalar", () => {
    expect(toHex(compressedPublicKey(scalar32(42)))).toBe(KAT.ourPub);
  });
  it("ECDH shared X for fixed scalars", () => {
    expect(toHex(ecdhSharedX(scalar32(42), b(KAT.devPub)))).toBe(KAT.sharedX);
  });
});

describe("MpidToken", () => {
  it("parses the 136-byte v1 token fields", () => {
    const t = new MpidToken(b(KAT.sessionToken));
    expect(toHex(t.compressedPublicKey)).toBe(KAT.devPub);
    expect(toHex(t.salt)).toBe("11223344");
    expect(t.serialAscii.startsWith("SYNTHETIC")).toBe(true);
  });
  it("rejects a short token", () => {
    expect(() => new MpidToken(b("0102"))).toThrow();
  });
});

describe("MpidSession framing", () => {
  /** Two endpoints sharing a key, with mirrored salts (the portal's view). */
  const mirrored = () => {
    const a = new MpidSession({ localSalt: SALT_L });
    a.sessionKey = FRAME_KEY;
    a.peerSalt = SALT_P;
    a.encrypted = true;
    const peer = new MpidSession({ localSalt: SALT_P });
    peer.sessionKey = FRAME_KEY;
    peer.peerSalt = SALT_L;
    peer.encrypted = true;
    return { a, peer };
  };

  it("encrypts a frame byte-for-byte like Python", () => {
    const { a } = mirrored();
    expect(toHex(a.encryptPacket(ascii("hello portal")))).toBe(KAT.frameHello);
  });

  it("encodes an empty frame", () => {
    const { a } = mirrored();
    expect(toHex(a.encryptPacket(new Uint8Array(0)))).toBe(KAT.frameEmpty);
  });

  it("round-trips every payload (incl. empty, 200B, 511B, fragmented)", () => {
    const big = new Uint8Array(0x1ff).map((_, i) => (i * 73 + 11) & 0xff);
    const cases = [new Uint8Array(0), b("04"), ascii("hello portal"), new Uint8Array(200).fill(0x5a), big];
    for (const payload of cases) {
      const { a, peer } = mirrored();
      const frame = a.encryptPacket(payload);
      const mid = Math.floor(frame.length / 2);
      const got = [...peer.feed(frame.slice(0, mid)), ...peer.feed(frame.slice(mid))];
      expect(got.length).toBe(1);
      expect(toHex(got[0])).toBe(toHex(payload));
    }
  });

  it("resyncs after non-preamble line noise before a frame", () => {
    const { a, peer } = mirrored();
    const frame = a.encryptPacket(ascii("data"));
    const noisy = new Uint8Array([0x00, 0xff, 0x13, 0x42, ...frame]);
    const got = peer.feed(noisy);
    expect(got.length).toBe(1);
    expect(toHex(got[0])).toBe(toHex(ascii("data")));
  });

  it("resyncs after a complete bad-header frame", () => {
    const { a, peer } = mirrored();
    const frame = a.encryptPacket(ascii("data"));
    const badHeader = new Uint8Array([0x7e, 0, 0, 0, 9, 0, 4, 0xaa]); // wrong header CRC
    const got = peer.feed(new Uint8Array([...badHeader, ...frame]));
    expect(got.length).toBe(1);
    expect(toHex(got[0])).toBe(toHex(ascii("data")));
  });
});

describe("MpidSession handshake (deterministic KAT)", () => {
  it("startSession yields the SESSION payload + derives the session key", () => {
    const s = new MpidSession({ privateKey: scalar32(42), localSalt: b("05060708") });
    const payload = s.startSession(b(KAT.sessionToken));
    expect(toHex(payload)).toBe(KAT.sessionPayload);
    expect(payload.length).toBe(37);
    expect(s.sessionKey && toHex(s.sessionKey)).toBe(KAT.sessionKey);
    expect(toHex(s.peerSalt!)).toBe("11223344");
  });

  it("encrypts under the derived session key like Python", () => {
    const s = new MpidSession({ privateKey: scalar32(42), localSalt: b("05060708") });
    s.startSession(b(KAT.sessionToken));
    expect(toHex(s.encryptPacket(ascii("ping")))).toBe(KAT.sessionTxrxFrame);
  });

  it("is KDF-deterministic for a fixed key+token", () => {
    const mk = () => {
      const s = new MpidSession({ privateKey: scalar32(7), localSalt: b("00000000") });
      s.startSession(b(KAT.sessionToken));
      return toHex(s.sessionKey!);
    };
    expect(mk()).toBe(mk());
  });
});

describe("protobuf parse_message (real captured packets)", () => {
  it("HEARTBEAT → DeviceInfo v1.0.9", () => {
    const m = parseMessage(HEARTBEAT);
    expect(m.event).toBeNull();
    expect(m.info).not.toBeNull();
    expect(m.info!.semanticFirmwareVersion).toBe("1.0.9");
    expect(m.info!.batteryLevel).toBeCloseTo(1.0, 6);
    expect(m.info!.mode).toBe(DeviceMode.NORMAL);
    expect(m.info!.batteryStatus).toBe(BatteryStatus.NOT_CHARGING);
    expect(m.info!.serialNumber).toBe("");
  });

  it("CAR → CAR_ON_PORTAL with uid + mattel id", () => {
    const m = parseMessage(CAR);
    expect(m.event!.type).toBe(EventType.CAR_ON_PORTAL);
    expect(parseNfcUid(m.event!.carInfo!.tagUid)).toBe("2A:7E:A2:F1:62:80");
    expect(decodeNdefRecord(m.event!.carInfo!.carNdefData).mattelId).toBe(
      "AQBBrl5bAAAGAF0TKZcEKn6i8WKA",
    );
    expect(m.event!.carInfo!.signature.length).toBe(64);
  });

  it("PRESENT → CAR_OFF_PORTAL", () => {
    expect(parseMessage(PRESENT).event!.type).toBe(EventType.CAR_OFF_PORTAL);
  });

  it("SPEED → CAR_DRIVE_BY with speed + signed gate timings", () => {
    const sm = parseMessage(SPEED).event!.speedMeasurement!;
    expect(parseMessage(SPEED).event!.type).toBe(EventType.CAR_DRIVE_BY);
    expect(sm.speed * SPEED_SCALE).toBeCloseTo(0.595039 * 64, 1);
    expect([sm.tIr1In, sm.tIr1Out, sm.tIr2In, sm.tIr2Out]).toEqual([
      -26240, 87376, 165344, 258944,
    ]);
  });
});

describe("mpidToPortalEvents bridge", () => {
  it("car-on → carDetected", () => {
    const events = mpidToPortalEvents(parseMessage(CAR));
    expect(events).toContainEqual({ kind: "carDetected", uid: "2A:7E:A2:F1:62:80" });
  });

  it("car-off → carRemoved", () => {
    expect(mpidToPortalEvents(parseMessage(PRESENT))).toEqual([{ kind: "carRemoved" }]);
  });

  it("drive-by → carDetected + speed", () => {
    const events = mpidToPortalEvents(parseMessage(SPEED));
    expect(events.some((e) => e.kind === "carDetected")).toBe(true);
    const speed = events.find((e) => e.kind === "speed");
    expect(speed).toBeDefined();
    if (speed && speed.kind === "speed") {
      expect(speed.scaleMph).toBeCloseTo(0.595039 * 64, 1);
    }
  });
});

describe("speedFromGates", () => {
  it("returns null when the gate timestamps coincide", () => {
    expect(speedFromGates(100, 100)).toBeNull();
  });
  it("is K / Δt otherwise", () => {
    expect(speedFromGates(0, 1000)).toBeCloseTo(114, 6);
  });
});

describe("command builders", () => {
  it("request_device_info encodes CommandType", () => {
    const inner = parseFields(parseFields(cmdRequestDeviceInfo()).get(2)![0] as Uint8Array);
    expect(Number(inner.get(1)![0])).toBe(CommandType.REQUEST_DEVICE_INFO);
  });
  it("set_led_color carries the RGB bytes", () => {
    const inner = parseFields(parseFields(cmdSetLedColor(255, 0, 128)).get(2)![0] as Uint8Array);
    expect(Number(inner.get(1)![0])).toBe(CommandType.SET_LED_COLOR);
    expect(toHex(inner.get(4)![0] as Uint8Array)).toBe("ff0080");
  });
});
