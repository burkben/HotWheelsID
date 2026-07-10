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
  validateAttestationManifest,
  validateContribution,
  validateTrustManifest,
} from "./identity-seed.mjs";

const CATALOG = catalogIndex([
  { id: "car-a", name: "Car A", toyNumber: "FXB03" },
  { id: "car-b", name: "Car B", toyNumber: null },
]);
const ROW_A = {
  castingKey: "41ae5e5b",
  productId: 0x41ae5e5b,
  catalogId: "car-a",
  name: "Car A",
  toyNumber: "FXB03",
};
const ROW_B = {
  castingKey: "deadbeef",
  productId: 0xdeadbeef,
  catalogId: "car-b",
  name: "Car B",
  toyNumber: null,
};

function payload(identifications = [ROW_A], generatedAt = "2026-07-10T00:00:00.000Z") {
  return {
    schema: "redlineid.identity-seed/1",
    generatedAt,
    count: identifications.length,
    identifications,
  };
}

function digest(value, source = "fixture.json") {
  return contributionFingerprint(validateContribution(value, source, CATALOG));
}

function attestation(sourceId, reviewNumber, payloadSha256, mappings = [ROW_A]) {
  return {
    sourceId,
    review: `https://github.com/burkben/HotWheelsID/pull/${reviewNumber}`,
    payloadSha256,
    mappings: mappings.map(({ castingKey, catalogId }) => ({ castingKey, catalogId })),
  };
}

function manifest(attestations) {
  return {
    schema: "redlineid.identity-attestations/1",
    attestations,
  };
}

function validatedAttestations(attestations) {
  return validateAttestationManifest(manifest(attestations), "sources.json", CATALOG);
}

function contributionDirectory(files, attestations) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "identity-seed-"));
  fs.writeFileSync(path.join(directory, "sources.json"), JSON.stringify(manifest(attestations)));
  for (const [name, value] of Object.entries(files)) {
    fs.writeFileSync(path.join(directory, name), JSON.stringify(value));
  }
  return directory;
}

test("validates a privacy-safe exported payload", () => {
  assert.deepEqual(validateContribution(payload(), "one.json", CATALOG), [
    {
      source: "one.json",
      castingKey: ROW_A.castingKey,
      productId: ROW_A.productId,
      catalogId: ROW_A.catalogId,
    },
  ]);
});

test("rejects uid, links, collection data, and any other unknown fields", () => {
  assert.throws(
    () =>
      validateContribution(
        { ...payload(), links: { uid: ROW_A.castingKey } },
        "private.json",
        CATALOG,
      ),
    /unexpected field "links"/,
  );
  const withUid = payload([{ ...ROW_A, uid: "AA:BB" }]);
  assert.throws(
    () => validateContribution(withUid, "private.json", CATALOG),
    /unexpected field "uid"/,
  );
});

test("rejects malformed keys, mismatched product IDs, and stale catalog facts", () => {
  assert.throws(
    () =>
      validateContribution(
        payload([{ ...ROW_A, castingKey: "41AE5E5B" }]),
        "bad.json",
        CATALOG,
      ),
    /lowercase hex/,
  );
  assert.throws(
    () => validateContribution(payload([{ ...ROW_A, productId: 1 }]), "bad.json", CATALOG),
    /does not match/,
  );
  assert.throws(
    () =>
      validateContribution(
        payload([{ ...ROW_A, catalogId: "missing" }]),
        "bad.json",
        CATALOG,
      ),
    /bundled catalog/,
  );
});

test("attestations bind source, PR, exact payload digest, and exact mapping", () => {
  const payloadSha256 = digest(payload());
  assert.deepEqual(
    validatedAttestations([attestation("source-a", 101, payloadSha256)]),
    [
      {
        sourceId: "source-a",
        review: "https://github.com/burkben/HotWheelsID/pull/101",
        payloadSha256,
        mappings: [{ castingKey: ROW_A.castingKey, catalogId: ROW_A.catalogId }],
      },
    ],
  );
});

test("rejects issue URLs as review provenance", () => {
  const value = attestation("source-a", 101, digest(payload()));
  value.review = "https://github.com/burkben/HotWheelsID/issues/101";
  assert.throws(
    () => validatedAttestations([value]),
    /review must be a HotWheelsID pull request URL/,
  );
});

test("one review PR cannot establish multiple independent source IDs", () => {
  const payloadSha256 = digest(payload());
  assert.throws(
    () =>
      validatedAttestations([
        attestation("source-a", 101, payloadSha256),
        attestation("source-b", 101, payloadSha256),
      ]),
    /each attestation requires a distinct review URL/,
  );
});

test("treats the legacy empty base manifest as zero trust during migration", () => {
  assert.deepEqual(
    validateTrustManifest(
      { schema: "redlineid.identity-sources/1", sources: [] },
      "main:identity-contributions/sources.json",
      CATALOG,
    ),
    [],
  );
  assert.throws(
    () =>
      validateTrustManifest(
        { schema: "redlineid.identity-sources/1", sources: [{}] },
        "main:identity-contributions/sources.json",
        CATALOG,
      ),
    /non-empty legacy trust metadata must be migrated explicitly/,
  );
});

test("new attestations in the current change cannot vote", (context) => {
  const exported = payload();
  const payloadSha256 = digest(exported);
  const current = [attestation("source-a", 101, payloadSha256)];
  const directory = contributionDirectory({ "one.json": exported }, current);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG, []);
  const analysis = analyzeObservations(loaded.observations);

  assert.equal(loaded.eligibleAttestations.length, 0);
  assert.equal(loaded.pendingAttestations.length, 1);
  assert.deepEqual(analysis.seed, {});
});

test("current attestations cannot pre-authorize a payload added later", (context) => {
  const futurePayload = payload();
  const futureDigest = digest(futurePayload);
  const pending = [attestation("source-a", 101, futureDigest)];
  const directory = contributionDirectory({}, pending);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  assert.throws(
    () => readContributions(directory, CATALOG, []),
    /attested payload .* is not present/,
  );
});

test("modified or removed base attestations cannot vote", (context) => {
  const exported = payload();
  const payloadSha256 = digest(exported);
  const trusted = validatedAttestations([
    attestation("source-a", 101, payloadSha256),
    attestation("source-b", 102, payloadSha256),
  ]);
  const modifiedSourceA = attestation("source-a", 103, payloadSha256);
  const directory = contributionDirectory({ "one.json": exported }, [modifiedSourceA]);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG, trusted);
  const analysis = analyzeObservations(loaded.observations);

  assert.equal(loaded.eligibleAttestations.length, 0);
  assert.equal(loaded.pendingAttestations.length, 1);
  assert.equal(loaded.removedTrustedAttestations.length, 2);
  assert.deepEqual(analysis.seed, {});
});

test("copied payload plus padding and forged same-PR trust cannot manufacture consensus", (context) => {
  const original = payload();
  const paddedCopy = payload([ROW_A, ROW_B]);
  const originalDigest = digest(original, "original.json");
  const paddedDigest = digest(paddedCopy, "copy-plus-padding.json");
  const trusted = validatedAttestations([
    attestation("source-a", 101, originalDigest, [ROW_A]),
  ]);
  const current = [
    attestation("source-a", 101, originalDigest, [ROW_A]),
    attestation("source-b", 102, paddedDigest, [ROW_A]),
  ];
  const directory = contributionDirectory(
    {
      "original.json": original,
      "copy-plus-padding.json": paddedCopy,
    },
    current,
  );
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG, trusted);
  const analysis = analyzeObservations(loaded.observations);

  assert.equal(loaded.duplicateFiles.length, 0);
  assert.equal(loaded.eligibleAttestations.length, 1);
  assert.equal(loaded.pendingAttestations.length, 1);
  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.pending[0].sources.length, 1);
});

test("identical exports from two independently trusted sources corroborate", (context) => {
  const exported = payload();
  const payloadSha256 = digest(exported);
  const attestations = [
    attestation("source-a", 101, payloadSha256),
    attestation("source-b", 102, payloadSha256),
  ];
  const trusted = validatedAttestations(attestations);
  const directory = contributionDirectory(
    { "one.json": exported, "identical-copy.json": exported },
    attestations,
  );
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG, trusted);
  const analysis = analyzeObservations(loaded.observations);

  assert.equal(loaded.payloads.length, 1);
  assert.equal(loaded.duplicateFiles.length, 1);
  assert.equal(loaded.observations.length, 2);
  assert.deepEqual(analysis.seed, { [ROW_A.castingKey]: ROW_A.catalogId });
});

test("filename and generatedAt do not change the payload digest", () => {
  assert.equal(
    digest(payload(), "one.json"),
    digest(payload([ROW_A], "2026-07-11T00:00:00.000Z"), "renamed.json"),
  );
});

test("multiple attestations from one trusted source count as one vote", (context) => {
  const exported = payload();
  const payloadSha256 = digest(exported);
  const attestations = [
    attestation("source-a", 101, payloadSha256),
    attestation("source-a", 102, payloadSha256),
  ];
  const trusted = validatedAttestations(attestations);
  const directory = contributionDirectory({ "one.json": exported }, attestations);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  const loaded = readContributions(directory, CATALOG, trusted);
  const analysis = analyzeObservations(loaded.observations);

  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.pending[0].sources.length, 1);
});

test("trusted attestation cannot claim a mapping absent from its bound payload", (context) => {
  const exported = payload();
  const payloadSha256 = digest(exported);
  const invalid = attestation("source-a", 101, payloadSha256, [ROW_B]);
  const trusted = validatedAttestations([invalid]);
  const directory = contributionDirectory({ "one.json": exported }, [invalid]);
  context.after(() => fs.rmSync(directory, { recursive: true, force: true }));

  assert.throws(
    () => readContributions(directory, CATALOG, trusted),
    /attested mapping deadbeef:car-b is absent/,
  );
});

test("reports conflicting trusted mappings instead of promoting a plurality", () => {
  const observations = [
    {
      castingKey: ROW_A.castingKey,
      catalogId: ROW_A.catalogId,
      sourceId: "source-a",
      source: "one.json",
      review: "https://github.com/burkben/HotWheelsID/pull/101",
      payloadSha256: "a".repeat(64),
    },
    {
      castingKey: ROW_A.castingKey,
      catalogId: ROW_B.catalogId,
      sourceId: "source-b",
      source: "two.json",
      review: "https://github.com/burkben/HotWheelsID/pull/102",
      payloadSha256: "b".repeat(64),
    },
  ];
  const analysis = analyzeObservations(observations);

  assert.deepEqual(analysis.seed, {});
  assert.equal(analysis.conflicts.length, 1);
});

test("serializes seed rows deterministically", () => {
  assert.equal(
    serializeSeed({ deadbeef: "car-b", "41ae5e5b": "car-a" }),
    '{\n  "41ae5e5b": "car-a",\n  "deadbeef": "car-b"\n}\n',
  );
});
