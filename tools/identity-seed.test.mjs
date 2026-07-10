import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeObservations,
  catalogIndex,
  serializeSeed,
  validateContribution,
} from "./identity-seed.mjs";

const CATALOG = catalogIndex([
  { id: "car-a", name: "Car A", toyNumber: "FXB03" },
  { id: "car-b", name: "Car B", toyNumber: null },
]);

function payload(overrides = {}) {
  return {
    schema: "redlineid.identity-seed/1",
    generatedAt: "2026-07-10T00:00:00.000Z",
    count: 1,
    identifications: [
      {
        castingKey: "41ae5e5b",
        productId: 0x41ae5e5b,
        catalogId: "car-a",
        name: "Car A",
        toyNumber: "FXB03",
      },
    ],
    ...overrides,
  };
}

test("validates a privacy-safe exported payload", () => {
  assert.deepEqual(validateContribution(payload(), "one.json", CATALOG), [
    {
      source: "one.json",
      castingKey: "41ae5e5b",
      productId: 0x41ae5e5b,
      catalogId: "car-a",
    },
  ]);
});

test("rejects uid, links, collection data, and any other unknown fields", () => {
  assert.throws(
    () => validateContribution({ ...payload(), links: { uid: "41ae5e5b" } }, "private.json", CATALOG),
    /unexpected field "links"/,
  );
  const withUid = payload();
  withUid.identifications[0] = { ...withUid.identifications[0], uid: "AA:BB" };
  assert.throws(
    () => validateContribution(withUid, "private.json", CATALOG),
    /unexpected field "uid"/,
  );
});

test("rejects malformed keys and product IDs that do not match the key", () => {
  const uppercase = payload();
  uppercase.identifications[0] = { ...uppercase.identifications[0], castingKey: "41AE5E5B" };
  assert.throws(() => validateContribution(uppercase, "bad.json", CATALOG), /lowercase hex/);

  const mismatch = payload();
  mismatch.identifications[0] = { ...mismatch.identifications[0], productId: 1 };
  assert.throws(() => validateContribution(mismatch, "bad.json", CATALOG), /does not match/);
});

test("rejects unknown or stale catalog facts", () => {
  const unknown = payload();
  unknown.identifications[0] = { ...unknown.identifications[0], catalogId: "missing" };
  assert.throws(() => validateContribution(unknown, "bad.json", CATALOG), /bundled catalog/);

  const stale = payload();
  stale.identifications[0] = { ...stale.identifications[0], name: "Wrong name" };
  assert.throws(() => validateContribution(stale, "bad.json", CATALOG), /do not match/);
});

test("requires two distinct agreeing files before promotion", () => {
  const one = validateContribution(payload(), "one.json", CATALOG);
  const pending = analyzeObservations(one);
  assert.deepEqual(pending.seed, {});
  assert.equal(pending.pending.length, 1);

  const two = validateContribution(payload(), "two.json", CATALOG);
  const agreed = analyzeObservations([...one, ...two]);
  assert.deepEqual(agreed.seed, { "41ae5e5b": "car-a" });
  assert.deepEqual(agreed.conflicts, []);
});

test("reports conflicting catalog mappings instead of promoting a plurality", () => {
  const one = validateContribution(payload(), "one.json", CATALOG);
  const conflictPayload = payload();
  conflictPayload.identifications[0] = {
    ...conflictPayload.identifications[0],
    catalogId: "car-b",
    name: "Car B",
    toyNumber: null,
  };
  const two = validateContribution(conflictPayload, "two.json", CATALOG);
  const analysis = analyzeObservations([...one, ...two]);

  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.conflicts.length, 1);
  assert.deepEqual(
    analysis.conflicts[0].candidates.map((candidate) => candidate.catalogId),
    ["car-a", "car-b"],
  );
});

test("serializes seed rows deterministically", () => {
  assert.equal(
    serializeSeed({ deadbeef: "car-b", "41ae5e5b": "car-a" }),
    '{\n  "41ae5e5b": "car-a",\n  "deadbeef": "car-b"\n}\n',
  );
});
