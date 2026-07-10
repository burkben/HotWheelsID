import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  analyzeObservations,
  catalogIndex,
  contributionFingerprint,
  readContributions,
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

function reviewed(source, sourceId, reviewNumber) {
  return {
    ...source,
    sourceId,
    review: `https://github.com/burkben/HotWheelsID/pull/${reviewNumber}`,
  };
}

function contributionDirectory(entries) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "identity-seed-"));
  fs.writeFileSync(
    path.join(directory, "sources.json"),
    JSON.stringify({
      schema: "redlineid.identity-sources/1",
      sources: entries.map(({ file, sourceId, review, verifiedCastingKeys }) => ({
        file,
        sourceId,
        review,
        verifiedCastingKeys,
      })),
    }),
  );
  for (const entry of entries) {
    fs.writeFileSync(path.join(directory, entry.file), JSON.stringify(entry.payload));
  }
  return directory;
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

test("requires two independently reviewed sources before promotion", () => {
  const one = validateContribution(payload(), "one.json", CATALOG).map((observation) =>
    reviewed(observation, "source-a", 101),
  );
  const pending = analyzeObservations(one);
  assert.deepEqual(pending.seed, {});
  assert.equal(pending.pending.length, 1);

  const secondPayload = payload({
    count: 2,
    identifications: [
      ...payload().identifications,
      {
        castingKey: "deadbeef",
        productId: 0xdeadbeef,
        catalogId: "car-b",
        name: "Car B",
        toyNumber: null,
      },
    ],
  });
  const two = validateContribution(secondPayload, "two.json", CATALOG).map((observation) =>
    reviewed(observation, "source-b", 102),
  );
  const agreed = analyzeObservations([...one, ...two]);
  assert.deepEqual(agreed.seed, { "41ae5e5b": "car-a" });
  assert.deepEqual(agreed.conflicts, []);
});

test("multiple payloads from the same reviewed source count as one vote", () => {
  const one = validateContribution(payload(), "one.json", CATALOG).map((observation) =>
    reviewed(observation, "source-a", 101),
  );
  const two = validateContribution(payload(), "two.json", CATALOG).map((observation) =>
    reviewed(observation, "source-a", 102),
  );

  const analysis = analyzeObservations([...one, ...two]);

  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.pending[0].sources.length, 1);
});

test("reports conflicting catalog mappings instead of promoting a plurality", () => {
  const one = validateContribution(payload(), "one.json", CATALOG).map((observation) =>
    reviewed(observation, "source-a", 101),
  );
  const conflictPayload = payload();
  conflictPayload.identifications[0] = {
    ...conflictPayload.identifications[0],
    catalogId: "car-b",
    name: "Car B",
    toyNumber: null,
  };
  const two = validateContribution(conflictPayload, "two.json", CATALOG).map((observation) =>
    reviewed(observation, "source-b", 102),
  );
  const analysis = analyzeObservations([...one, ...two]);

  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.conflicts.length, 1);
  assert.deepEqual(
    analysis.conflicts[0].candidates.map((candidate) => candidate.catalogId),
    ["car-a", "car-b"],
  );
});

test("deduplicates identical payload copies under different filenames", (context) => {
  const directory = contributionDirectory([
    {
      file: "one.json",
      sourceId: "source-a",
      review: "https://github.com/burkben/HotWheelsID/pull/101",
      verifiedCastingKeys: ["41ae5e5b"],
      payload: payload(),
    },
    {
      file: "copy.json",
      sourceId: "source-b",
      review: "https://github.com/burkben/HotWheelsID/pull/102",
      verifiedCastingKeys: ["41ae5e5b"],
      payload: payload(),
    },
  ]);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG);
  const analysis = analyzeObservations(loaded.observations);

  assert.equal(loaded.duplicates.length, 1);
  assert.equal(loaded.observations.length, 1);
  assert.deepEqual(analysis.seed, {});
});

test("deduplicates copies changed only by generatedAt and filename", (context) => {
  const later = payload({ generatedAt: "2026-07-11T00:00:00.000Z" });
  const directory = contributionDirectory([
    {
      file: "original.json",
      sourceId: "source-a",
      review: "https://github.com/burkben/HotWheelsID/pull/101",
      verifiedCastingKeys: ["41ae5e5b"],
      payload: payload(),
    },
    {
      file: "renamed.json",
      sourceId: "source-b",
      review: "https://github.com/burkben/HotWheelsID/pull/102",
      verifiedCastingKeys: ["41ae5e5b"],
      payload: later,
    },
  ]);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG);

  assert.equal(loaded.duplicates.length, 1);
  assert.equal(
    contributionFingerprint(
      validateContribution(payload(), "original.json", CATALOG),
    ),
    contributionFingerprint(validateContribution(later, "renamed.json", CATALOG)),
  );
});

test("copied rows appended to a new export cannot vote without per-casting PR review", (context) => {
  const appended = payload({
    count: 2,
    identifications: [
      ...payload().identifications,
      {
        castingKey: "deadbeef",
        productId: 0xdeadbeef,
        catalogId: "car-b",
        name: "Car B",
        toyNumber: null,
      },
    ],
  });
  const directory = contributionDirectory([
    {
      file: "original.json",
      sourceId: "source-a",
      review: "https://github.com/burkben/HotWheelsID/pull/101",
      verifiedCastingKeys: ["41ae5e5b"],
      payload: payload(),
    },
    {
      file: "copy-plus-new.json",
      sourceId: "source-b",
      review: "https://github.com/burkben/HotWheelsID/pull/102",
      verifiedCastingKeys: ["deadbeef"],
      payload: appended,
    },
  ]);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG);
  const analysis = analyzeObservations(loaded.observations);

  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.pending.length, 2);
  assert.deepEqual(
    loaded.unreviewed.map((item) => item.castingKey),
    ["41ae5e5b"],
  );
});

test("rejects issue URLs as review provenance", (context) => {
  const directory = contributionDirectory([
    {
      file: "one.json",
      sourceId: "source-a",
      review: "https://github.com/burkben/HotWheelsID/issues/101",
      verifiedCastingKeys: ["41ae5e5b"],
      payload: payload(),
    },
  ]);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  assert.throws(
    () => readContributions(directory, CATALOG),
    /review must be a HotWheelsID pull request URL/,
  );
});

test("serializes seed rows deterministically", () => {
  assert.equal(
    serializeSeed({ deadbeef: "car-b", "41ae5e5b": "car-a" }),
    '{\n  "41ae5e5b": "car-a",\n  "deadbeef": "car-b"\n}\n',
  );
});
