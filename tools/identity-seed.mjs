#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const IDENTITY_EXPORT_SCHEMA = "redlineid.identity-seed/1";
export const IDENTITY_SOURCES_SCHEMA = "redlineid.identity-sources/1";
export const MIN_AGREEING_SOURCES = 2;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONTRIBUTIONS = path.join(REPO_ROOT, "identity-contributions");
const DEFAULT_CATALOG = path.join(REPO_ROOT, "apps/mobile/src/catalog/catalog.json");
const DEFAULT_SEED = path.join(REPO_ROOT, "apps/mobile/src/catalog/identity-seed.json");
const PAYLOAD_FIELDS = new Set(["schema", "generatedAt", "count", "identifications"]);
const ROW_FIELDS = new Set(["castingKey", "productId", "catalogId", "name", "toyNumber"]);
const SOURCES_FIELDS = new Set(["schema", "sources"]);
const SOURCE_FIELDS = new Set(["file", "sourceId", "review", "verifiedCastingKeys"]);
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
      file: observation.source,
      review: observation.review,
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

export function readContributions(contributionsDir, catalogById) {
  if (!fs.existsSync(contributionsDir)) {
    return { contributions: [], duplicates: [], observations: [], unreviewed: [] };
  }
  const manifestPath = path.join(contributionsDir, "sources.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("identity-contributions/sources.json is required");
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`identity-contributions/sources.json: invalid JSON (${error.message})`);
  }
  if (!isObject(manifest)) throw new Error("sources.json: manifest must be an object");
  assertAllowedFields(manifest, SOURCES_FIELDS, "sources.json");
  if (manifest.schema !== IDENTITY_SOURCES_SCHEMA) {
    throw new Error(`sources.json: schema must be ${IDENTITY_SOURCES_SCHEMA}`);
  }
  if (!Array.isArray(manifest.sources)) {
    throw new Error("sources.json: sources must be an array");
  }

  const listedFiles = new Set();
  const reviewUrls = new Set();
  const contributions = manifest.sources.map((entry, index) => {
    const location = `sources.json: sources[${index}]`;
    if (!isObject(entry)) throw new Error(`${location} must be an object`);
    assertAllowedFields(entry, SOURCE_FIELDS, location);
    if (
      typeof entry.file !== "string" ||
      path.basename(entry.file) !== entry.file ||
      entry.file === "sources.json" ||
      !entry.file.endsWith(".json")
    ) {
      throw new Error(`${location}: file must be a safe contribution .json filename`);
    }
    if (listedFiles.has(entry.file)) throw new Error(`${location}: duplicate file ${entry.file}`);
    listedFiles.add(entry.file);
    if (
      typeof entry.sourceId !== "string" ||
      !/^[a-z0-9][a-z0-9._-]{2,63}$/.test(entry.sourceId)
    ) {
      throw new Error(`${location}: sourceId must be a stable non-personal review handle`);
    }
    if (typeof entry.review !== "string" || !REVIEW_URL.test(entry.review)) {
      throw new Error(`${location}: review must be a HotWheelsID pull request URL`);
    }
    if (reviewUrls.has(entry.review)) {
      throw new Error(`${location}: each contribution requires a distinct review URL`);
    }
    reviewUrls.add(entry.review);
    if (!Array.isArray(entry.verifiedCastingKeys) || entry.verifiedCastingKeys.length === 0) {
      throw new Error(`${location}: verifiedCastingKeys must list PR-reviewed casting facts`);
    }
    const verifiedCastingKeys = new Set();
    for (const castingKey of entry.verifiedCastingKeys) {
      if (typeof castingKey !== "string" || !/^[0-9a-f]{8}$/.test(castingKey)) {
        throw new Error(`${location}: verifiedCastingKeys must contain lowercase 8-hex keys`);
      }
      if (verifiedCastingKeys.has(castingKey)) {
        throw new Error(`${location}: duplicate verified castingKey ${castingKey}`);
      }
      verifiedCastingKeys.add(castingKey);
    }
    return { ...entry, verifiedCastingKeys: [...verifiedCastingKeys].sort() };
  });

  const actualFiles = fs
    .readdirSync(contributionsDir)
    .filter((name) => name.endsWith(".json") && name !== "sources.json")
    .sort();
  for (const file of actualFiles) {
    if (!listedFiles.has(file)) throw new Error(`${file}: missing from sources.json`);
  }
  for (const file of listedFiles) {
    if (!actualFiles.includes(file)) throw new Error(`${file}: listed in sources.json but missing`);
  }

  const observations = [];
  const duplicates = [];
  const unreviewed = [];
  const fingerprints = new Map();
  for (const contribution of contributions.sort((a, b) => a.file.localeCompare(b.file))) {
    const source = path.posix.join(path.basename(contributionsDir), contribution.file);
    let payload;
    try {
      payload = JSON.parse(
        fs.readFileSync(path.join(contributionsDir, contribution.file), "utf8"),
      );
    } catch (error) {
      throw new Error(`${source}: invalid JSON (${error.message})`);
    }
    const validated = validateContribution(payload, source, catalogById);
    const byCastingKey = new Map(validated.map((observation) => [observation.castingKey, observation]));
    for (const castingKey of contribution.verifiedCastingKeys) {
      if (!byCastingKey.has(castingKey)) {
        throw new Error(
          `${source}: PR-reviewed castingKey ${castingKey} is not present in the export`,
        );
      }
    }
    const fingerprint = contributionFingerprint(validated);
    const canonical = fingerprints.get(fingerprint);
    if (canonical) {
      duplicates.push({
        fingerprint,
        canonical,
        duplicate: { ...contribution, file: source },
      });
      continue;
    }
    const provenance = { ...contribution, file: source };
    fingerprints.set(fingerprint, provenance);
    const reviewedKeys = new Set(contribution.verifiedCastingKeys);
    for (const observation of validated) {
      if (!reviewedKeys.has(observation.castingKey)) {
        unreviewed.push({
          sourceId: contribution.sourceId,
          file: source,
          review: contribution.review,
          castingKey: observation.castingKey,
          catalogId: observation.catalogId,
        });
      }
    }
    observations.push(
      ...validated
        .filter((observation) => reviewedKeys.has(observation.castingKey))
        .map((observation) => ({
          ...observation,
          sourceId: contribution.sourceId,
          review: contribution.review,
        })),
    );
  }
  return { contributions, duplicates, observations, unreviewed };
}

function formatSource(source) {
  return `${source.sourceId} (${source.file}; ${source.review})`;
}

function formatReport(analysis, loaded) {
  const reviewedSources = new Set(loaded.contributions.map((item) => item.sourceId));
  const lines = [
    `Validated ${loaded.contributions.length} contribution payload(s) from ${reviewedSources.size} reviewed source(s).`,
    `Accepted ${loaded.contributions.length - loaded.duplicates.length} semantically unique payload(s).`,
    `Semantic duplicates: ${loaded.duplicates.length}.`,
    `Accepted ${loaded.observations.length} PR-reviewed observation(s).`,
    `Unreviewed export rows ignored: ${loaded.unreviewed.length}.`,
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
  for (const duplicate of loaded.duplicates) {
    lines.push(
      `DUPLICATE ${duplicate.duplicate.file} [${duplicate.duplicate.sourceId}] matches ${duplicate.canonical.file} [${duplicate.canonical.sourceId}] (${duplicate.fingerprint})`,
    );
  }
  for (const item of loaded.unreviewed) {
    lines.push(
      `UNREVIEWED ${item.file} [${item.sourceId}] ${item.castingKey} -> ${item.catalogId}`,
    );
  }
  return lines.join("\n");
}

function run(command) {
  const catalog = JSON.parse(fs.readFileSync(DEFAULT_CATALOG, "utf8"));
  const loaded = readContributions(DEFAULT_CONTRIBUTIONS, catalogIndex(catalog));
  const analysis = analyzeObservations(loaded.observations);

  if (command === "validate") {
    console.log(formatReport(analysis, loaded));
    if (loaded.duplicates.length > 0) process.exitCode = 1;
    return;
  }
  if (command === "report") {
    console.log(formatReport(analysis, loaded));
    return;
  }
  if (analysis.conflicts.length > 0 || loaded.duplicates.length > 0) {
    console.error(formatReport(analysis, loaded));
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
    console.log(formatReport(analysis, loaded));
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
