import { describe, it, expect } from "vitest";
import { castingKeyFromMattelId } from "./casting";

describe("castingKeyFromMattelId", () => {
  it("extracts the 4-byte model id (offset 2) as hex", () => {
    // 01 00 | 41 ae 5e 5b | … | 2a 7e a2 f1 62 80  (trailing 6 = NFC UID)
    expect(castingKeyFromMattelId("AQBBrl5bAAAGAF0TKZcEKn6i8WKA")).toBe("41ae5e5b");
  });

  it("shares a casting key across two tags of the same model", () => {
    // Same model-id bytes (41ae5e5b), different trailing UID → same casting key.
    const a = castingKeyFromMattelId("AQBBrl5bAAAGAF0TKZcEKn6i8WKA");
    const b = castingKeyFromMattelId("AQBBrl5bAAAGAF0TKZcEKn7QqAAA");
    expect(a).toBe(b);
  });

  it("normalises base64url (-_) input", () => {
    const std = castingKeyFromMattelId("AQBBrl5bAAAGAF0TKZcEKn6i8WKA");
    const url = castingKeyFromMattelId("AQBBrl5bAAAGAF0TKZcEKn6i8WKA".replace(/\+/g, "-"));
    expect(url).toBe(std);
  });

  it("returns undefined for empty/absent ids", () => {
    expect(castingKeyFromMattelId(undefined)).toBeUndefined();
    expect(castingKeyFromMattelId(null)).toBeUndefined();
    expect(castingKeyFromMattelId("")).toBeUndefined();
  });

  it("falls back to the raw id when too short to slice a model id", () => {
    expect(castingKeyFromMattelId("AQBB")).toBe("AQBB");
  });
});
