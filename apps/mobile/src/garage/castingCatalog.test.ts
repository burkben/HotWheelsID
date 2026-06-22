import { describe, expect, it } from "vitest";

import { lookupCatalogName } from "./castingCatalog";

describe("castingCatalog", () => {
  it("is null-safe and returns null for unknown ids", () => {
    expect(lookupCatalogName(null)).toBeNull();
    expect(lookupCatalogName(undefined)).toBeNull();
    expect(lookupCatalogName("")).toBeNull();
    expect(lookupCatalogName("DEADBEEF")).toBeNull();
  });

  it("does not guess the one captured sample's name (ships unseeded)", () => {
    // 41AE5E5B is the only modelId we've captured, but its casting is unknown, so
    // the bundled catalog intentionally has no entry — we never guess a name.
    expect(lookupCatalogName("41AE5E5B")).toBeNull();
  });
});
