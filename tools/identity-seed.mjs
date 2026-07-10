#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const IDENTITY_EXPORT_SCHEMA = "redlineid.identity-seed/1";
export const MIN_AGREEING_FILES = 2;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CONTRIBUTIONS = path.join(REPO_ROOT, "identity-contributions");
const DEFAULT_CATALOG = path.join(REPO_ROOT, "apps/mobile/src/catalog/catalog.json");
const DEFAULT_SEED = path.join(REPO_ROOT, "apps/mobile/src/catalog/identity-seed.json");
const PAYLOAD_FIELDS = new Set(["schema", "generatedAt", "count", "identifications"]);
const ROW_FIELDS = new Set(["castingKey", "productId", "catalogId", "name", "toyNumber"]);

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
      sources = new Set();
      candidates.set(observation.catalogId, sources);
    }
    sources.add(observation.source);
  }

  const conflicts = [];
  const pending = [];
  const seed = {};
  for (const castingKey of [...byCasting.keys()].sort()) {
    const candidates = byCasting.get(castingKey);
    const detail = [...candidates.entries()]
      .map(([catalogId, sources]) => ({
        catalogId,
        sources: [...sources].sort(),
      }))
      .sort((a, b) => a.catalogId.localeCompare(b.catalogId));
    if (detail.length > 1) {
      conflicts.push({ castingKey, candidates: detail });
      continue;
    }
    if (detail[0].sources.length < MIN_AGREEING_FILES) {
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
  if (!fs.existsSync(contributionsDir)) return [];
  const files = fs
    .readdirSync(contributionsDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const observations = [];
  for (const name of files) {
    const source = path.posix.join(path.basename(contributionsDir), name);
    let payload;
    try {
      payload = JSON.parse(fs.readFileSync(path.join(contributionsDir, name), "utf8"));
    } catch (error) {
      throw new Error(`${source}: invalid JSON (${error.message})`);
    }
    observations.push(...validateContribution(payload, source, catalogById));
  }
  return observations;
}

function formatReport(analysis, observationCount) {
  const lines = [
    `Validated ${observationCount} observation(s).`,
    `Promoted ${Object.keys(analysis.seed).length} seed row(s).`,
    `Pending corroboration: ${analysis.pending.length}.`,
    `Conflicts: ${analysis.conflicts.length}.`,
  ];
  for (const item of analysis.pending) {
    lines.push(
      `PENDING ${item.castingKey} -> ${item.catalogId} (${item.sources.join(", ")})`,
    );
  }
  for (const conflict of analysis.conflicts) {
    lines.push(`CONFLICT ${conflict.castingKey}`);
    for (const candidate of conflict.candidates) {
      lines.push(`  ${candidate.catalogId}: ${candidate.sources.join(", ")}`);
    }
  }
  return lines.join("\n");
}

function run(command) {
  const catalog = JSON.parse(fs.readFileSync(DEFAULT_CATALOG, "utf8"));
  const observations = readContributions(DEFAULT_CONTRIBUTIONS, catalogIndex(catalog));
  const analysis = analyzeObservations(observations);

  if (command === "validate") {
    console.log(`Validated ${observations.length} observation(s).`);
    return;
  }
  if (command === "report") {
    console.log(formatReport(analysis, observations.length));
    return;
  }
  if (analysis.conflicts.length > 0) {
    console.error(formatReport(analysis, observations.length));
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
    console.log(formatReport(analysis, observations.length));
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
