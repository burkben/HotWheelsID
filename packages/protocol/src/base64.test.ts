import { describe, it, expect } from "vitest";
import { base64FromBytes, bytesFromBase64 } from "./base64";
import { bytesToHex, parseCharacteristicValue, parseSpeed } from "./decode";
import { CHAR_EVENT_2, CHAR_EVENT_3, CHAR_SERIAL_NUMBER } from "./uuids";

/** Build a Uint8Array from a space-separated hex string, e.g. "04 6c c4". */
const hex = (s: string): Uint8Array =>
  new Uint8Array(s.trim().split(/\s+/).map((b) => parseInt(b, 16)));

describe("bytesFromBase64", () => {
  it("decodes the PROTOCOL.md car-detection vector", () => {
    // "BGzEWitkgQ==" === 04 6c c4 5a 2b 64 81
    expect(bytesToHex(bytesFromBase64("BGzEWitkgQ=="))).toBe(
      "04:6C:C4:5A:2B:64:81",
    );
  });

  it("ignores whitespace and tolerates missing padding", () => {
    expect(Array.from(bytesFromBase64("AP4A/gI="))).toEqual([0x00, 0xfe, 0x00, 0xfe, 0x02]);
    expect(Array.from(bytesFromBase64("AP4A/gI"))).toEqual([0x00, 0xfe, 0x00, 0xfe, 0x02]);
    expect(Array.from(bytesFromBase64("BGzE Witk gQ==\n"))).toEqual([
      0x04, 0x6c, 0xc4, 0x5a, 0x2b, 0x64, 0x81,
    ]);
  });

  it("decodes an empty string to an empty array", () => {
    expect(bytesFromBase64("").length).toBe(0);
  });

  it("throws on a non-Base64 character", () => {
    expect(() => bytesFromBase64("not base64!")).toThrow();
  });
});

describe("base64FromBytes", () => {
  it("encodes bytes with standard padding", () => {
    expect(base64FromBytes(hex("04 6c c4 5a 2b 64 81"))).toBe("BGzEWitkgQ==");
    expect(base64FromBytes(hex("00 fe 00 fe 02"))).toBe("AP4A/gI=");
    expect(base64FromBytes(new Uint8Array(0))).toBe("");
  });

  it("round-trips arbitrary byte lengths", () => {
    for (let n = 0; n < 12; n++) {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) bytes[i] = (i * 37 + 11) & 0xff;
      expect(Array.from(bytesFromBase64(base64FromBytes(bytes)))).toEqual(Array.from(bytes));
    }
  });
});

describe("base64 → parse pipeline (the real BLE wire path)", () => {
  it("decodes a car-detection indication end to end", () => {
    const event = parseCharacteristicValue(CHAR_EVENT_2, bytesFromBase64("BGzEWitkgQ=="));
    expect(event).toEqual({ kind: "carDetected", uid: "6C:C4:5A:2B:64:81" });
  });

  it("decodes a speed indication end to end (≈0.1446 raw)", () => {
    const event = parseCharacteristicValue(CHAR_EVENT_3, bytesFromBase64("sBwUPg=="));
    expect(event.kind).toBe("speed");
    if (event.kind === "speed") {
      expect(event.raw).toBeCloseTo(0.1446, 4);
      expect(event.scaleMph).toBeCloseTo(event.raw * 64, 6);
    }
  });

  it("decodes a serial indication end to end", () => {
    const event = parseCharacteristicValue(
      CHAR_SERIAL_NUMBER,
      bytesFromBase64("MTEwMjAzMjU1Nw=="),
    );
    expect(event).toEqual({ kind: "serial", serial: "1102032557" });
  });

  it("agrees with parseSpeed for the fast vector", () => {
    const bytes = bytesFromBase64("q6rKPw==");
    expect(parseSpeed(bytes).raw).toBeCloseTo(1.5833, 4);
  });
});
