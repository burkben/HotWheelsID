import { describe, expect, it } from "vitest";

import { IDENTITY_SEED, sanitizeSeed } from "./identitySeed";

const CHARGER = "70-dodge-charger-r-t";

describe("sanitizeSeed", () => {
  it("keeps entries that resolve to a bundled catalog car", () => {
    expect(sanitizeSeed({ "41ae5e5b": CHARGER })).toEqual({ "41ae5e5b": CHARGER });
  });

  it("strips device-local synthetic uid: keys", () => {
    expect(sanitizeSeed({ "uid:04AABBCC": CHARGER })).toEqual({});
  });

  it("strips malformed or raw fallback Mattel IDs that could contain a tag UID", () => {
    expect(
      sanitizeSeed({
        AQBBrl5bAAAGAF0TKZcEKn6i8WKA: CHARGER,
        "41AE5E5B": CHARGER,
      }),
    ).toEqual({});
  });

  it("drops entries pointing at an unknown catalog id", () => {
    expect(sanitizeSeed({ "41ae5e5b": "no-such-car" })).toEqual({});
  });

  it("ignores non-string / empty values", () => {
    expect(
      sanitizeSeed({ a: 123 as unknown as string, b: "" }),
    ).toEqual({});
  });
});

describe("IDENTITY_SEED", () => {
  it("loads as a sanitised object (empty at cold start)", () => {
    expect(typeof IDENTITY_SEED).toBe("object");
    // Whatever ships must already be sanitised: no synthetic keys survive.
    for (const key of Object.keys(IDENTITY_SEED)) {
      expect(key.startsWith("uid:")).toBe(false);
    }
  });
});
