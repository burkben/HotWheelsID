import { describe, it, expect } from "vitest";
import { decodeMattelId, mattelIdMatchesUid } from "./mattelId";

// The one hardware-captured id (python/PROTOCOL_NEW.md line 299). Its trailing
// 6 bytes equal the separately-reported NFC UID 2A:7E:A2:F1:62:80 — the invariant
// this decoder exposes and mattelIdMatchesUid validates.
const REAL_ID = "AQBBrl5bAAAGAF0TKZcEKn6i8WKA";
const REAL_UID = "2A:7E:A2:F1:62:80";

// Truncations of REAL_ID that stop before the misc / tag-uid fields.
const ID_MODEL_ONLY = "AQBBrl5b"; // 6 bytes: version + modelId
const ID_THROUGH_MISC = "AQBBrl5bAAAGAF0TKZcE"; // 15 bytes: + misc, no tag uid

describe("decodeMattelId", () => {
  it("splits the captured id into version / modelId / misc / tagUid", () => {
    expect(decodeMattelId(REAL_ID)).toEqual({
      version: "0100",
      modelId: "41ae5e5b",
      misc: "000006005d13299704",
      tagUid: REAL_UID,
    });
  });

  it("formats the embedded tagUid like parseNfcUid (uppercase, colon-separated)", () => {
    expect(decodeMattelId(REAL_ID)?.tagUid).toBe(REAL_UID);
  });

  it("shares version+modelId across two tags of the same casting", () => {
    const a = decodeMattelId("AQBBrl5bAAAGAF0TKZcEKn6i8WKA");
    const b = decodeMattelId("AQBBrl5bAAAGAF0TKZcEKn7QqAAA");
    expect(a?.modelId).toBe(b?.modelId);
    expect(a?.tagUid).not.toBe(b?.tagUid); // per-tag UID differs
  });

  it("omits misc/tagUid when the id is too short to carry them", () => {
    expect(decodeMattelId(ID_MODEL_ONLY)).toEqual({ version: "0100", modelId: "41ae5e5b" });
    expect(decodeMattelId(ID_THROUGH_MISC)).toEqual({
      version: "0100",
      modelId: "41ae5e5b",
      misc: "000006005d13299704",
    });
  });

  it("normalises base64url (-_) input", () => {
    const std = decodeMattelId(REAL_ID);
    const url = decodeMattelId(REAL_ID.replace(/\+/g, "-").replace(/\//g, "_"));
    expect(url).toEqual(std);
  });

  it("returns null for absent, too-short, or non-base64 ids", () => {
    expect(decodeMattelId(undefined)).toBeNull();
    expect(decodeMattelId(null)).toBeNull();
    expect(decodeMattelId("")).toBeNull();
    expect(decodeMattelId("AQBB")).toBeNull(); // 3 bytes, no model id
    expect(decodeMattelId("!!not base64!!")).toBeNull();
  });
});

describe("mattelIdMatchesUid", () => {
  it("confirms the embedded UID matches the reported UID", () => {
    expect(mattelIdMatchesUid(REAL_ID, REAL_UID)).toBe(true);
  });

  it("is case-insensitive on the reported UID", () => {
    expect(mattelIdMatchesUid(REAL_ID, REAL_UID.toLowerCase())).toBe(true);
  });

  it("reports a mismatch when the UIDs disagree", () => {
    expect(mattelIdMatchesUid(REAL_ID, "11:22:33:44:55:66")).toBe(false);
  });

  it("is indeterminate (null) without both sides to compare", () => {
    expect(mattelIdMatchesUid(ID_MODEL_ONLY, REAL_UID)).toBeNull(); // no embedded tail
    expect(mattelIdMatchesUid(REAL_ID, null)).toBeNull(); // no reported uid
    expect(mattelIdMatchesUid(undefined, REAL_UID)).toBeNull(); // no id
  });
});
