import { describe, it, expect } from "vitest";
import {
  bytesToHex,
  parseCharacteristicValue,
  parseControlStatus,
  parseNfcUid,
  parseSerialAscii,
  parseSpeed,
} from "./decode";
import {
  CHAR_CONTROL,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_SERIAL_NUMBER,
} from "./uuids";

/** Build a Uint8Array from a space-separated hex string, e.g. "04 6c c4". */
const hex = (s: string): Uint8Array =>
  new Uint8Array(s.trim().split(/\s+/).map((b) => parseInt(b, 16)));

describe("bytesToHex", () => {
  it("formats uppercase hex with a separator", () => {
    expect(bytesToHex(hex("6c c4 5a"))).toBe("6C:C4:5A");
    expect(bytesToHex(hex("de ad be ef"), "")).toBe("DEADBEEF");
  });
});

describe("parseNfcUid", () => {
  it("decodes 0x04 + 6-byte UID (PROTOCOL.md vector)", () => {
    expect(parseNfcUid(hex("04 6c c4 5a 2b 64 81"))).toBe("6C:C4:5A:2B:64:81");
  });
});

describe("parseSpeed", () => {
  it("decodes little-endian float32 and scales by 64", () => {
    const slow = parseSpeed(hex("b0 1c 14 3e"));
    expect(slow.raw).toBeCloseTo(0.1446, 4);
    expect(slow.scaleMph).toBeCloseTo(0.1446 * 64, 2);

    expect(parseSpeed(hex("ae 38 8c 3f")).raw).toBeCloseTo(1.0955, 4);
    expect(parseSpeed(hex("ab aa ca 3f")).raw).toBeCloseTo(1.5833, 4);
  });

  it("reads from the correct offset on a windowed Uint8Array", () => {
    // Float bytes embedded inside a larger buffer (mimics a sliced BLE value).
    const backing = hex("ff ff b0 1c 14 3e ff");
    const windowed = backing.subarray(2, 6);
    expect(parseSpeed(windowed).raw).toBeCloseTo(0.1446, 4);
  });
});

describe("parseSerialAscii", () => {
  it("decodes ASCII serials", () => {
    expect(parseSerialAscii(hex("31 31 30 32 30 33 32 35 35 37"))).toBe("1102032557");
  });
});

describe("parseControlStatus", () => {
  it("maps the documented 5-byte patterns", () => {
    expect(parseControlStatus(hex("00 fe 00 fe 00"))).toBe("idle");
    expect(parseControlStatus(hex("00 fe 00 fe 02"))).toBe("carPresent");
    expect(parseControlStatus(hex("00 72 9b fe 00"))).toBe("transitional");
  });
});

describe("parseCharacteristicValue", () => {
  it("EVENT_2 → carDetected", () => {
    expect(parseCharacteristicValue(CHAR_EVENT_2, hex("04 6c c4 5a 2b 64 81"))).toEqual({
      kind: "carDetected",
      uid: "6C:C4:5A:2B:64:81",
    });
  });

  it("empty EVENT_2 / SERIAL → carRemoved", () => {
    expect(parseCharacteristicValue(CHAR_EVENT_2, new Uint8Array())).toEqual({
      kind: "carRemoved",
    });
    expect(parseCharacteristicValue(CHAR_SERIAL_NUMBER, new Uint8Array())).toEqual({
      kind: "carRemoved",
    });
  });

  it("EVENT_3 → speed", () => {
    const ev = parseCharacteristicValue(CHAR_EVENT_3, hex("b0 1c 14 3e"));
    expect(ev.kind).toBe("speed");
    if (ev.kind === "speed") {
      expect(ev.raw).toBeCloseTo(0.1446, 4);
      expect(ev.scaleMph).toBeCloseTo(0.1446 * 64, 2);
    }
  });

  it("SERIAL_NUMBER → serial", () => {
    expect(
      parseCharacteristicValue(CHAR_SERIAL_NUMBER, hex("31 31 30 32 30 33 32 35 35 37")),
    ).toEqual({ kind: "serial", serial: "1102032557" });
  });

  it("CONTROL → control status", () => {
    const ev = parseCharacteristicValue(CHAR_CONTROL, hex("00 fe 00 fe 02"));
    expect(ev.kind).toBe("control");
    if (ev.kind === "control") expect(ev.status).toBe("carPresent");
  });

  it("matches UUIDs case-insensitively", () => {
    const ev = parseCharacteristicValue(CHAR_EVENT_2.toUpperCase(), hex("04 6c c4 5a 2b 64 81"));
    expect(ev.kind).toBe("carDetected");
  });

  it("unknown UUID → unknown event with raw bytes", () => {
    const ev = parseCharacteristicValue("ffffffff-0000-0000-0000-000000000000", hex("01 02"));
    expect(ev.kind).toBe("unknown");
    if (ev.kind === "unknown") expect(Array.from(ev.bytes)).toEqual([0x01, 0x02]);
  });
});
