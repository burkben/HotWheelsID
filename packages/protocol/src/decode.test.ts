import { describe, it, expect } from "vitest";
import { base64FromBytes } from "./base64";
import {
  bytesToHex,
  decodeMattelCarId,
  decodeNdefRecord,
  parseCharacteristicValue,
  parseControlStatus,
  parseNfcUid,
  parseSerialAscii,
  parseSpeed,
} from "./decode";
import {
  CHAR_CONTROL,
  CHAR_EVENT_1,
  CHAR_EVENT_2,
  CHAR_EVENT_3,
  CHAR_SERIAL_NUMBER,
} from "./uuids";

/** Build a Uint8Array from a space-separated hex string, e.g. "04 6c c4". */
const hex = (s: string): Uint8Array =>
  new Uint8Array(s.trim().split(/\s+/).map((b) => parseInt(b, 16)));

/** ASCII string → bytes. */
const ascii = (s: string): Uint8Array => Uint8Array.from(s, (c) => c.charCodeAt(0));

/** Build the legacy NFC NDEF URI record (`91 01 LL 55 02 …`) carrying a Mattel id. */
const ndefForId = (id: string): Uint8Array => {
  const payload = Uint8Array.from([0x02, ...ascii(`pid.mattel/${id}`)]); // 0x02 = https://www.
  return Uint8Array.from([0x91, 0x01, payload.length, 0x55, ...payload]);
};

/** A real captured id (PROTOCOL_NEW.md): casting 41AE5E5B, UID 2A:7E:A2:F1:62:80. */
const SAMPLE_ID = "AQBBrl5bAAAGAF0TKZcEKn6i8WKA";

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

  it("EVENT_1 (NDEF) → carIdentity with casting model id", () => {
    const ev = parseCharacteristicValue(CHAR_EVENT_1, ndefForId(SAMPLE_ID));
    expect(ev).toEqual({
      kind: "carIdentity",
      uid: "2A:7E:A2:F1:62:80",
      mattelId: SAMPLE_ID,
      modelId: "41AE5E5B",
    });
  });

  it("empty EVENT_1 → carRemoved", () => {
    expect(parseCharacteristicValue(CHAR_EVENT_1, new Uint8Array())).toEqual({
      kind: "carRemoved",
    });
  });

  it("EVENT_1 without a Mattel id → unknown", () => {
    const ev = parseCharacteristicValue(CHAR_EVENT_1, hex("91 01 05 55 02 61 62 63 64"));
    expect(ev.kind).toBe("unknown");
  });
});

describe("decodeNdefRecord", () => {
  it("extracts the Mattel id from a URI record", () => {
    expect(decodeNdefRecord(ndefForId(SAMPLE_ID)).mattelId).toBe(SAMPLE_ID);
  });

  it("returns {} for a too-short record", () => {
    expect(decodeNdefRecord(hex("91 01 02"))).toEqual({});
  });
});

describe("decodeMattelCarId", () => {
  it("decodes the casting id and embedded UID (PROTOCOL_NEW.md vector)", () => {
    const id = decodeMattelCarId(SAMPLE_ID);
    expect(id).not.toBeNull();
    expect(id!.modelId).toBe("41AE5E5B");
    expect(id!.uid).toBe("2A:7E:A2:F1:62:80");
    expect(bytesToHex(id!.bytes.slice(0, 2), "")).toBe("0100"); // version prefix
  });

  it("two copies of one casting share a modelId but differ by full id/uid", () => {
    // Same casting bytes (41AE5E5B), different trailing UID → same modelId.
    const a = decodeMattelCarId(SAMPLE_ID)!;
    const twinBytes = Uint8Array.from(a.bytes);
    twinBytes[twinBytes.length - 1] ^= 0xff; // perturb the UID's last byte
    const b = decodeMattelCarId(
      // re-encode via the byte path the app uses (base64 of the perturbed bytes)
      base64FromBytes(twinBytes),
    )!;
    expect(b.modelId).toBe(a.modelId);
    expect(b.uid).not.toBe(a.uid);
  });

  it("returns null for junk or too-short input", () => {
    expect(decodeMattelCarId("!!!not base64!!!")).toBeNull();
    expect(decodeMattelCarId("AQID")).toBeNull(); // 3 bytes, too short
  });
});
