/**
 * Bundled **community identity seed** (ADR-0014).
 *
 * A static `castingKey → catalogId` map, pooled from users' exported
 * identifications (see {@link ./identityExport}) and merged into the identity
 * store at bootstrap so a freshly-scanned casting **auto-names with zero taps**
 * if anyone has ever identified it. It only *fills gaps*: a user's own pick
 * always wins (see `catalogIdForUid`).
 *
 * `castingKey` is the 4 Mattel model-id bytes as lowercase hex — the same
 * globally-stable key `identifications` uses, so seeding is just pre-filling the
 * same map. This is a `productId`-level fact (not a per-tag UID), so it carries
 * no device-local or personal data.
 *
 * The file ships empty at cold start (no confirmed community data yet) and is
 * regenerated out-of-band on a cadence. Entries are sanitised on load:
 *  - synthetic `uid:`-prefixed keys (device-local, cars seen without a Mattel id)
 *    are stripped — they must never appear in a shared seed;
 *  - entries pointing at a `catalogId` that isn't in the bundled {@link CATALOG}
 *    are dropped, so a stale/foreign id can't mislabel anything.
 */
import { findCatalogCar } from "./catalog";
import seedJson from "./identity-seed.json";

/** Drop device-local synthetic keys and entries that don't resolve to a real catalog car. */
export function sanitizeSeed(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [castingKey, catalogId] of Object.entries(raw)) {
    if (!castingKey || castingKey.startsWith("uid:")) continue;
    if (typeof catalogId !== "string" || catalogId.length === 0) continue;
    if (!findCatalogCar(catalogId)) continue;
    out[castingKey] = catalogId;
  }
  return out;
}

/** The sanitised community seed, ready to hand to `useIdentityStore.loadSeed`. */
export const IDENTITY_SEED: Record<string, string> = sanitizeSeed(
  seedJson as Record<string, unknown>,
);
