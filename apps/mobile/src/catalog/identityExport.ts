/**
 * Export the user's confirmed car identifications as a shareable **community
 * seed** contribution (ADR-0014).
 *
 * This is a pure read over `identityStore.identifications ∩ CATALOG`. The
 * resulting payload is pooled out-of-band and folded back into the bundled
 * {@link ./identitySeed} so everyone's scanned cars auto-name.
 *
 * **Privacy boundary (the crux of ADR-0014).** Only `castingKey → catalog`
 * facts leave the device. The `uid → castingKey` `links` map (per physical tag,
 * per device) is never read here. Synthetic `uid:`-prefixed keys — cars
 * identified without a Mattel id (e.g. demo passes) — are device-local and
 * excluded. A stale identification pointing at a `catalogId` that is no longer
 * in the bundled catalog is dropped rather than leaked.
 */
import { findCatalogCar, type CatalogCar } from "./catalog";

export interface ExportedIdentification {
  /** Casting key = the 4 Mattel model-id bytes, lowercase hex. */
  readonly castingKey: string;
  /**
   * The model-id bytes as a big-endian uint32 — for Hot Wheels this equals the
   * number the portal reports on its Serial-Number characteristic (PR #46).
   * `null` when `castingKey` isn't the expected 8 hex chars.
   */
  readonly productId: number | null;
  readonly catalogId: string;
  readonly name: string;
  readonly toyNumber: string | null;
}

/** Parse an 8-hex-char castingKey to its big-endian uint32 productId, or null. */
export function productIdFromCastingKey(castingKey: string): number | null {
  if (!/^[0-9a-fA-F]{8}$/.test(castingKey)) return null;
  return Number.parseInt(castingKey, 16);
}

/**
 * The user's own identifications as shareable rows, name-sorted. Excludes
 * device-local synthetic keys and any entry that doesn't resolve to a bundled
 * catalog car.
 */
export function exportIdentifications(
  identifications: Record<string, string>,
): ExportedIdentification[] {
  const rows: ExportedIdentification[] = [];
  for (const [castingKey, catalogId] of Object.entries(identifications)) {
    if (!castingKey || castingKey.startsWith("uid:")) continue;
    const car: CatalogCar | undefined = findCatalogCar(catalogId);
    if (!car) continue;
    rows.push({
      castingKey,
      productId: productIdFromCastingKey(castingKey),
      catalogId,
      name: car.name,
      toyNumber: car.toyNumber,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

/** Schema tag stamped on exported payloads so a future importer can version-gate. */
export const IDENTITY_EXPORT_SCHEMA = "redlineid.identity-seed/1" as const;

export interface IdentityExportPayload {
  readonly schema: typeof IDENTITY_EXPORT_SCHEMA;
  readonly generatedAt: string;
  readonly count: number;
  readonly identifications: ExportedIdentification[];
}

/** Build the full self-describing export payload (what the share sheet emits). */
export function buildIdentityExport(
  identifications: Record<string, string>,
  now: () => Date = () => new Date(),
): IdentityExportPayload {
  const rows = exportIdentifications(identifications);
  return {
    schema: IDENTITY_EXPORT_SCHEMA,
    generatedAt: now().toISOString(),
    count: rows.length,
    identifications: rows,
  };
}
