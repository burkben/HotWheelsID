/**
 * Optional, bundled catalog mapping a binary casting `modelId` (uppercase hex —
 * the key the portal broadcasts and Slice A persists) to a human casting name.
 * It is the offline *fallback* the Garage uses when the user hasn't named a
 * casting themselves: resolution is **user name → this catalog → hex label**.
 *
 * It ships EMPTY by design. The public Hot Wheels id catalogs (fan wikis,
 * spreadsheets) are keyed by the printed packaging SKU (e.g. `GVB43`), not the
 * binary `modelId` the portal emits, and nobody has published the correlation
 * between the two. Seed verified entries here as the community matches a captured
 * `modelId` to a known casting; the lookup is a plain map, so a PR that adds a row
 * needs no code changes. See docs/ROADMAP.md ("richer car identity").
 */
export const CASTING_CATALOG: Readonly<Record<string, string>> = {
  // "41AE5E5B": "Twin Mill",  ← example shape only; unverified, intentionally omitted.
};

/**
 * The catalog name for a casting `modelId`, or `null` when unknown (the common
 * case today). Case-insensitive and null-safe so callers can pass a raw
 * `CarRecord.modelId` straight through.
 */
export function lookupCatalogName(modelId: string | null | undefined): string | null {
  if (!modelId) return null;
  return CASTING_CATALOG[modelId.toUpperCase()] ?? null;
}
