import { describe, expect, it } from "vitest";

import { retryDelay } from "./retryPolicy";

describe("retryDelay", () => {
  it("uses capped exponential backoff", () => {
    const policy = { baseDelayMs: 1_000, maxDelayMs: 3_000, maxRetries: 4 };
    expect([0, 1, 2, 3].map((attempt) => retryDelay(attempt, policy))).toEqual([
      1_000,
      2_000,
      3_000,
      3_000,
    ]);
  });

  it("returns null outside the finite retry budget", () => {
    const policy = { baseDelayMs: 1_000, maxDelayMs: 8_000, maxRetries: 3 };
    expect(retryDelay(3, policy)).toBeNull();
    expect(retryDelay(-1, policy)).toBeNull();
    expect(retryDelay(0.5, policy)).toBeNull();
  });
});
