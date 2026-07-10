#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const IDENTITY_EXPORT_SCHEMA = "redlineid.identity-seed/1";
export const IDENTITY_ATTESTATIONS_SCHEMA = "redlineid.identity-attestations/1";
export const LEGACY_SOURCES_SCHEMA = "redlineid.identity-sources/1";
export const MIN_AGREEING_SOURCES = 2;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONTRIBUTIONS = path.join(REPO_ROOT, "identity-contributions");
const DEFAULT_CATALOG = path.join(REPO_ROOT, "apps/mobile/src/catalog/catalog.json");
const DEFAULT_SEED = path.join(REPO_ROOT, "apps/mobile/src/catalog/identity-seed.json");
const ATTESTATIONS_PATH = "identity-contributions/sources.json";
const PAYLOAD_FIELDS = new Set(["schema", "generatedAt", "count", "identifications"]);
const ROW_FIELDS = new Set(["castingKey", "productId", "catalogId", "name", "toyNumber"]);
const MANIFEST_FIELDS = new Set(["schema", "attestations"]);
const ATTESTATION_FIELDS = new Set([
  "sourceId",
  "review",
  "payloadSha256",
  "mappings",
]);
const MAPPING_FIELDS = new Set(["castingKey", "catalogId"]);
const REVIEW_URL = /^https:\/\/github\.com\/burkben\/HotWheelsID\/pull\/[1-9][0-9]*$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertAllowedFields(value, allowed, location) {
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) {
      throw new Error(`${location}: unexpected field "${field}"`);
    }
  }
}

export function catalogIndex(catalog) {
  if (!Array.isArray(catalog)) throw new Error("catalog must be an array");
  return new Map(catalog.map((car) => [car.id, car]));
}

export function validateContribution(payload, source, catalogById) {
  if (!isObject(payload)) throw new Error(`${source}: payload must be an object`);
  assertAllowedFields(payload, PAYLOAD_FIELDS, source);
  if (payload.schema !== IDENTITY_EXPORT_SCHEMA) {
    throw new Error(`${source}: schema must be ${IDENTITY_EXPORT_SCHEMA}`);
  }
  if (typeof payload.generatedAt !== "string" || !Number.isFinite(Date.parse(payload.generatedAt))) {
    throw new Error(`${source}: generatedAt must be an ISO timestamp`);
  }
  if (!Array.isArray(payload.identifications)) {
    throw new Error(`${source}: identifications must be an array`);
  }
  if (!Number.isInteger(payload.count) || payload.count !== payload.identifications.length) {
    throw new Error(`${source}: count must equal identifications.length`);
  }

  const seen = new Set();
  return payload.identifications.map((row, index) => {
    const location = `${source}: identifications[${index}]`;
    if (!isObject(row)) throw new Error(`${location} must be an object`);
    assertAllowedFields(row, ROW_FIELDS, location);
    if (typeof row.castingKey !== "string" || !/^[0-9a-f]{8}$/.test(row.castingKey)) {
      throw new Error(`${location}: castingKey must be 8 lowercase hex characters`);
    }
    if (seen.has(row.castingKey)) {
      throw new Error(`${location}: duplicate castingKey ${row.castingKey} in one contribution`);
    }
    seen.add(row.castingKey);

    const computedProductId = Number.parseInt(row.castingKey, 16);
    if (!Number.isInteger(row.productId) || row.productId !== computedProductId) {
      throw new Error(`${location}: productId does not match castingKey`);
    }
    if (typeof row.catalogId !== "string" || !catalogById.has(row.catalogId)) {
      throw new Error(`${location}: catalogId is not in the bundled catalog`);
    }

    const catalogCar = catalogById.get(row.catalogId);
    if (row.name !== catalogCar.name || row.toyNumber !== catalogCar.toyNumber) {
      throw new Error(`${location}: name/toyNumber do not match the bundled catalog`);
    }
    return {
      source,
      castingKey: row.castingKey,
      productId: row.productId,
      catalogId: row.catalogId,
    };
  });
}

export function contributionFingerprint(observations) {
  const normalized = observations
    .map(({ castingKey, productId, catalogId }) => ({ castingKey, productId, catalogId }))
    .sort(
      (a, b) =>
        a.castingKey.localeCompare(b.castingKey) ||
        a.catalogId.localeCompare(b.catalogId),
    );
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

function attestationKey(attestation) {
  return JSON.stringify({
    sourceId: attestation.sourceId,
    review: attestation.review,
    payloadSha256: attestation.payloadSha256,
    mappings: attestation.mappings,
  });
}

export function validateAttestationManifest(manifest, location, catalogById) {
  if (!isObject(manifest)) throw new Error(`${location}: manifest must be an object`);
  assertAllowedFields(manifest, MANIFEST_FIELDS, location);
  if (manifest.schema !== IDENTITY_ATTESTATIONS_SCHEMA) {
    throw new Error(`${location}: schema must be ${IDENTITY_ATTESTATIONS_SCHEMA}`);
  }
  if (!Array.isArray(manifest.attestations)) {
    throw new Error(`${location}: attestations must be an array`);
  }

  const reviewUrls = new Set();
  const attestations = manifest.attestations.map((entry, index) => {
    const entryLocation = `${location}: attestations[${index}]`;
    if (!isObject(entry)) throw new Error(`${entryLocation} must be an object`);
    assertAllowedFields(entry, ATTESTATION_FIELDS, entryLocation);
    if (
      typeof entry.sourceId !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(entry.sourceId)
    ) {
      throw new Error(`${entryLocation}: sourceId must be a stable non-personal review handle`);
    }
    if (typeof entry.review !== "string" || !REVIEW_URL.test(entry.review)) {
      throw new Error(`${entryLocation}: review must be a HotWheelsID pull request URL`);
    }
    if (reviewUrls.has(entry.review)) {
      throw new Error(`${entryLocation}: each attestation requires a distinct review URL`);
    }
    reviewUrls.add(entry.review);
    if (typeof entry.payloadSha256 !== "string" || !/^[0-9a-f]{64}$/.test(entry.payloadSha256)) {
      throw new Error(`${entryLocation}: payloadSha256 must be lowercase SHA-256 hex`);
    }
    if (!Array.isArray(entry.mappings) || entry.mappings.length === 0) {
      throw new Error(`${entryLocation}: mappings must contain PR-reviewed facts`);
    }
    const seenMappings = new Set();
    const mappings = entry.mappings
      .map((mapping, mappingIndex) => {
        const mappingLocation = `${entryLocation}: mappings[${mappingIndex}]`;
        if (!isObject(mapping)) throw new Error(`${mappingLocation} must be an object`);
        assertAllowedFields(mapping, MAPPING_FIELDS, mappingLocation);
        if (
          typeof mapping.castingKey !== "string" ||
          !/^[0-9a-f]{8}$/.test(mapping.castingKey)
        ) {
          throw new Error(`${mappingLocation}: castingKey must be 8 lowercase hex characters`);
        }
        if (typeof mapping.catalogId !== "string" || !catalogById.has(mapping.catalogId)) {
          throw new Error(`${mappingLocation}: catalogId is not in the bundled catalog`);
        }
        const key = `${mapping.castingKey}:${mapping.catalogId}`;
        if (seenMappings.has(key)) throw new Error(`${mappingLocation}: duplicate mapping ${key}`);
        seenMappings.add(key);
        return { castingKey: mapping.castingKey, catalogId: mapping.catalogId };
      })
      .sort(
        (a, b) =>
          a.castingKey.localeCompare(b.castingKey) ||
          a.catalogId.localeCompare(b.catalogId),
      );
    return {
      sourceId: entry.sourceId,
      review: entry.review,
      payloadSha256: entry.payloadSha256,
      mappings,
    };
  });
  return attestations.sort((a, b) => attestationKey(a).localeCompare(attestationKey(b)));
}

export function validateTrustManifest(manifest, location, catalogById) {
  if (isObject(manifest) && manifest.schema === LEGACY_SOURCES_SCHEMA) {
    assertAllowedFields(manifest, new Set(["schema", "sources"]), location);
    if (!Array.isArray(manifest.sources)) {
      throw new Error(`${location}: legacy sources must be an array`);
    }
    if (manifest.sources.length > 0) {
      throw new Error(`${location}: non-empty legacy trust metadata must be migrated explicitly`);
    }
    return [];
  }
  return validateAttestationManifest(manifest, location, catalogById);
}

function readJsonFile(filePath, location) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${location}: invalid JSON (${error.message})`);
  }
}

export function readAttestationsAtRef(repoRoot, ref, catalogById) {
  const verifiedRef = spawnSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (verifiedRef.status !== 0) {
    throw new Error(`identity trust ref "${ref}" is not a commit`);
  }

  const exists = spawnSync("git", ["cat-file", "-e", `${ref}:${ATTESTATIONS_PATH}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (exists.status !== 0) return [];

  const shown = spawnSync("git", ["show", `${ref}:${ATTESTATIONS_PATH}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (shown.status !== 0) {
    throw new Error(`could not read ${ATTESTATIONS_PATH} from trust ref "${ref}"`);
  }
  let manifest;
  try {
    manifest = JSON.parse(shown.stdout);
  } catch (error) {
    throw new Error(`${ref}:${ATTESTATIONS_PATH}: invalid JSON (${error.message})`);
  }
  return validateTrustManifest(manifest, `${ref}:${ATTESTATIONS_PATH}`, catalogById);
}

export function analyzeObservations(observations) {
  const byCasting = new Map();
  for (const observation of observations) {
    let candidates = byCasting.get(observation.castingKey);
    if (!candidates) {
      candidates = new Map();
      byCasting.set(observation.castingKey, candidates);
    }
    let sources = candidates.get(observation.catalogId);
    if (!sources) {
      sources = new Map();
      candidates.set(observation.catalogId, sources);
    }
    sources.set(observation.sourceId, {
      sourceId: observation.sourceId,
      source: observation.source,
      review: observation.review,
      payloadSha256: observation.payloadSha256,
    });
  }

  const conflicts = [];
  const pending = [];
  const seed = {};
  for (const castingKey of [...byCasting.keys()].sort()) {
    const candidates = byCasting.get(castingKey);
    const detail = [...candidates.entries()]
      .map(([catalogId, sources]) => ({
        catalogId,
        sources: [...sources.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
      }))
      .sort((a, b) => a.catalogId.localeCompare(b.catalogId));
    if (detail.length > 1) {
      conflicts.push({ castingKey, candidates: detail });
      continue;
    }
    if (detail[0].sources.length < MIN_AGREEING_SOURCES) {
      pending.push({ castingKey, ...detail[0] });
      continue;
    }
    seed[castingKey] = detail[0].catalogId;
  }
  return { conflicts, pending, seed };
}

export function serializeSeed(seed) {
  const sorted = {};
  for (const castingKey of Object.keys(seed).sort()) {
    sorted[castingKey] = seed[castingKey];
  }
  return `${JSON.stringify(sorted, null, 2)}\n`;
}

export function readContributions(
  contributionsDir,
  catalogById,
  trustedAttestations = [],
) {
  if (!fs.existsSync(contributionsDir)) {
    return {
      currentAttestations: [],
      duplicateFiles: [],
      eligibleAttestations: [],
      observations: [],
      payloads: [],
      pendingAttestations: [],
    };
  }

  const manifestPath = path.join(contributionsDir, "sources.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("identity-contributions/sources.json is required");
  }
  const currentAttestations = validateAttestationManifest(
    readJsonFile(manifestPath, "identity-contributions/sources.json"),
    "identity-contributions/sources.json",
    catalogById,
  );

  const actualFiles = fs
    .readdirSync(contributionsDir)
    .filter((name) => name.endsWith(".json") && name !== "sources.json")
    .sort();
  const payloadByDigest = new Map();
  for (const name of actualFiles) {
    const source = path.posix.join(path.basename(contributionsDir), name);
    const payload = readJsonFile(path.join(contributionsDir, name), source);
    const validated = validateContribution(payload, source, catalogById);
    const payloadSha256 = contributionFingerprint(validated);
    let grouped = payloadByDigest.get(payloadSha256);
    if (!grouped) {
      grouped = {
        payloadSha256,
        files: [],
        observations: validated.map(({ castingKey, productId, catalogId }) => ({
          castingKey,
          productId,
          catalogId,
        })),
      };
      payloadByDigest.set(payloadSha256, grouped);
    }
    grouped.files.push(source);
  }

  for (const attestation of currentAttestations) {
    const payload = payloadByDigest.get(attestation.payloadSha256);
    if (!payload) {
      throw new Error(
        `${attestation.review}: attested payload ${attestation.payloadSha256} is not present`,
      );
    }
    const payloadMappings = new Set(
      payload.observations.map(
        (observation) => `${observation.castingKey}:${observation.catalogId}`,
      ),
    );
    for (const mapping of attestation.mappings) {
      const mappingKey = `${mapping.castingKey}:${mapping.catalogId}`;
      if (!payloadMappings.has(mappingKey)) {
        throw new Error(
          `${attestation.review}: attested mapping ${mappingKey} is absent from payload ${attestation.payloadSha256}`,
        );
      }
    }
  }

  const currentKeys = new Set(currentAttestations.map(attestationKey));
  const trustedKeys = new Set(trustedAttestations.map(attestationKey));
  const eligibleAttestations = currentAttestations.filter((attestation) =>
    trustedKeys.has(attestationKey(attestation)),
  );
  const pendingAttestations = currentAttestations.filter(
    (attestation) => !trustedKeys.has(attestationKey(attestation)),
  );
  const removedTrustedAttestations = trustedAttestations.filter(
    (attestation) => !currentKeys.has(attestationKey(attestation)),
  );

  const observations = [];
  for (const attestation of eligibleAttestations) {
    const payload = payloadByDigest.get(attestation.payloadSha256);
    for (const mapping of attestation.mappings) {
      observations.push({
        ...mapping,
        sourceId: attestation.sourceId,
        source: payload.files.join(", "),
        review: attestation.review,
        payloadSha256: attestation.payloadSha256,
      });
    }
  }

  const payloads = [...payloadByDigest.values()].sort((a, b) =>
    a.payloadSha256.localeCompare(b.payloadSha256),
  );
  const duplicateFiles = payloads
    .filter((payload) => payload.files.length > 1)
    .map((payload) => ({
      payloadSha256: payload.payloadSha256,
      files: [...payload.files].sort(),
    }));
  return {
    currentAttestations,
    duplicateFiles,
    eligibleAttestations,
    observations,
    payloads,
    pendingAttestations,
    removedTrustedAttestations,
  };
}

function formatSource(source) {
  return `${source.sourceId} (${source.review}; ${source.payloadSha256})`;
}

function formatReport(analysis, loaded, trustRef) {
  const lines = [
    `Trust ref: ${trustRef}.`,
    `Unique contribution payloads: ${loaded.payloads.length}.`,
    `Duplicate payload file groups: ${loaded.duplicateFiles.length}.`,
    `Current attestations: ${loaded.currentAttestations.length}.`,
    `Eligible base-trusted attestations: ${loaded.eligibleAttestations.length}.`,
    `Pending attestations (cannot vote in this change): ${loaded.pendingAttestations.length}.`,
    `Removed/modified trusted attestations ignored: ${loaded.removedTrustedAttestations.length}.`,
    `Accepted reviewed observations: ${loaded.observations.length}.`,
    `Promoted ${Object.keys(analysis.seed).length} seed row(s).`,
    `Pending corroboration: ${analysis.pending.length}.`,
    `Conflicts: ${analysis.conflicts.length}.`,
  ];
  for (const item of analysis.pending) {
    lines.push(
      `PENDING ${item.castingKey} -> ${item.catalogId} (${item.sources.map(formatSource).join(", ")})`,
    );
  }
  for (const conflict of analysis.conflicts) {
    lines.push(`CONFLICT ${conflict.castingKey}`);
    for (const candidate of conflict.candidates) {
      lines.push(`  ${candidate.catalogId}: ${candidate.sources.map(formatSource).join(", ")}`);
    }
  }
  for (const duplicate of loaded.duplicateFiles) {
    lines.push(`DUPLICATE FILES ${duplicate.payloadSha256}: ${duplicate.files.join(", ")}`);
  }
  for (const attestation of loaded.pendingAttestations) {
    lines.push(
      `PENDING TRUST ${attestation.sourceId} ${attestation.review} ${attestation.payloadSha256}`,
    );
  }
  return lines.join("\n");
}

function run(command) {
  const catalog = JSON.parse(fs.readFileSync(DEFAULT_CATALOG, "utf8"));
  const catalogById = catalogIndex(catalog);
  const trustRef = process.env.IDENTITY_TRUST_REF || "main";
  const trustedAttestations = readAttestationsAtRef(REPO_ROOT, trustRef, catalogById);
  const loaded = readContributions(
    DEFAULT_CONTRIBUTIONS,
    catalogById,
    trustedAttestations,
  );
  const analysis = analyzeObservations(loaded.observations);

  if (command === "validate" || command === "report") {
    console.log(formatReport(analysis, loaded, trustRef));
    return;
  }
  if (analysis.conflicts.length > 0) {
    console.error(formatReport(analysis, loaded, trustRef));
    process.exitCode = 1;
    return;
  }

  const generated = serializeSeed(analysis.seed);
  if (command === "generate") {
    fs.writeFileSync(DEFAULT_SEED, generated);
    console.log(`Wrote ${Object.keys(analysis.seed).length} row(s) to ${DEFAULT_SEED}.`);
    return;
  }
  if (command === "check") {
    const committed = fs.readFileSync(DEFAULT_SEED, "utf8");
    if (committed !== generated) {
      console.error("identity-seed.json is stale; run npm run identity-seed:generate");
      process.exitCode = 1;
      return;
    }
    console.log(formatReport(analysis, loaded, trustRef));
    return;
  }
  throw new Error(`unknown command "${command}"`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run(process.argv[2] ?? "report");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
