import { describe, expect, it } from "vitest";

import {
  IDENTITY_EXPORT_SCHEMA,
  buildIdentityExport,
  exportIdentifications,
  productIdFromCastingKey,
} from "./identityExport";

// Real catalog ids so findCatalogCar resolves them.
const CHARGER = "70-dodge-charger-r-t";
const CORVETTE = "2014-corvette-c7-r";

describe("productIdFromCastingKey", () => {
  it("decodes an 8-hex castingKey as a big-endian uint32", () => {
    // 0x41ae5e5b — the verified sample from PR #46.
    expect(productIdFromCastingKey("41ae5e5b")).toBe(1101946459);
  });

  it("returns null for non-8-hex keys", () => {
    expect(productIdFromCastingKey("uid:ABCD")).toBeNull();
    expect(productIdFromCastingKey("41ae")).toBeNull();
    expect(productIdFromCastingKey("")).toBeNull();
  });
});

describe("exportIdentifications", () => {
  it("emits shareable rows for real catalog identifications, name-sorted", () => {
    const rows = exportIdentifications({
      "41ae5e5b": CHARGER,
      deadbeef: CORVETTE,
    });
    expect(rows).toEqual([
      {
        castingKey: "41ae5e5b",
        productId: 1101946459,
        catalogId: CHARGER,
        name: "'70 Dodge Charger R/T",
        toyNumber: "FXB03",
      },
      {
        castingKey: "deadbeef",
        productId: 0xdeadbeef,
        catalogId: CORVETTE,
        name: "2014 Corvette C7.R",
        toyNumber: "FXB04",
      },
    ]);
  });

  it("drops device-local synthetic uid: keys", () => {
    const rows = exportIdentifications({ "uid:04AABBCC": CHARGER });
    expect(rows).toEqual([]);
  });

  it("drops identifications that don't resolve to a bundled catalog car", () => {
    const rows = exportIdentifications({ "41ae5e5b": "no-such-car" });
    expect(rows).toEqual([]);
  });

  it("drops non-product keys because a raw Mattel ID may embed a tag UID", () => {
    const rows = exportIdentifications({
      oddkey: CHARGER,
      AQBBrl5bAAAGAF0TKZcEKn6i8WKA: CHARGER,
      "41AE5E5B": CHARGER,
    });
    expect(rows).toEqual([]);
  });
});

describe("buildIdentityExport", () => {
  it("wraps the rows in a versioned, timestamped payload", () => {
    const payload = buildIdentityExport(
      { "41ae5e5b": CHARGER },
      () => new Date("2026-07-10T00:00:00.000Z"),
    );
    expect(payload.schema).toBe(IDENTITY_EXPORT_SCHEMA);
    expect(payload.generatedAt).toBe("2026-07-10T00:00:00.000Z");
    expect(payload.count).toBe(1);
    expect(payload.identifications).toHaveLength(1);
  });
});
