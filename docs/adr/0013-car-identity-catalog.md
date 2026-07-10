# 13. Car identity: bundled wiki catalog + manual casting picker

- **Status:** Accepted
- **Date:** 2026-06-26
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0006](0006-state-management-and-persistence.md),
  [ADR-0012](0012-modern-mpid-protocol-and-transport.md),
  [ADR-0007](0007-monorepo-structure-and-python-reference.md)

## Context

The Garage ([ADR-0006](0006-state-management-and-persistence.md)) records every car the portal has
ever seen, but it can only label them by **NFC UID** (or a user-typed nickname). That is the
"utilitarian" gap the maintainer called out: a collection screen of `64:81 · 2m ago` rows, with no
real casting names or art.

Each car *does* carry richer identity. [ADR-0012](0012-modern-mpid-protocol-and-transport.md) decodes
the car's NDEF record into a base64url **`mattelId`**, whose decoded bytes appear to be
`version(2) ‖ modelId(4) ‖ misc(9) ‖ tagUid(6)`. The 4 **model-id** bytes look constant per casting
and differ from the per-tag UID — promising for "name every copy of this casting at once."

But there is **no binary-id → name map**. Mattel's id backend was the only authority and was
discontinued (2024); nothing we can probe offline turns `41ae5e5b` into "'70 Dodge Charger R/T".
The only public record of the 2019–2021 id line is the **Hot Wheels Fandom wiki**. So identity
cannot be fully automatic — *something* has to associate an opaque casting key with a real catalog
entry, and that something is the user, once per casting.

## Decision

Ship a **bundled catalog** plus a **manual identification** flow, kept deliberately **isolated from
the Garage schema**.

**1. Scrape the wiki into a static `catalog.json`.** A stdlib-only generator,
`python/tools/scrape_id_catalog.py` (per [ADR-0007](0007-monorepo-structure-and-python-reference.md),
Python stays the reference/tooling language), pulls the Hot Wheels id list from the Fandom MediaWiki
API and emits `apps/mobile/src/catalog/catalog.json` — 146 cars with name, toy number, series, year,
wave, and a wiki **photo URL** (136 have usable art). The app **never fetches at runtime**; the
catalog ships in the bundle. `catalog.ts` is the typed lookup/search surface (`findCatalogCar`,
`searchCatalog` with name > toy# > series > year ranking).

**2. Derive a `castingKey` from the `mattelId`, defensively.** `castingKeyFromMattelId()` (in
`@redlineid/protocol`) hex-encodes model-id bytes `[2..6)`. Because the byte layout is
reverse-engineered (`PROTOCOL.md` flags it as a best guess), the helper **falls back to the full id
string** when the id is too short or won't decode, and returns `undefined` only for an absent id.
Identity therefore still works even if the offset is wrong — it just keys per distinct id instead of
per casting. The protocol bridge threads `mattelId` onto `carDetected`; nothing else downstream
changes.

**3. Keep identity in its own store + tables, never touching `cars`.** A new `identityStore` holds
two small maps, mirrored to SQLite through a write-through sink exactly like Settings/Garage:

- **`links`** `uid → castingKey` — learned automatically on every detection that carries a
  `mattelId` (the bootstrap calls `linkCar`).
- **`identifications`** `castingKey → catalogId` — the user's confirmed pick.

Rendering is the pure selector `uid → link → castingKey → identification → catalog entry`. Two new
**append-only** v6 tables (`car_links`, `car_identifications`) persist them; the shipped `cars`
table, its repository, and its reducers are **untouched**. This is the cheapest possible way to
prototype identity without risking the durable garage data.

**4. Surface it in the existing screens with a manual picker.** A modal (`app/identify.tsx`) shows a
searchable photo grid of the catalog; picking a car records the `uid → castingKey → catalogId` chain
(synthesising a per-uid key for cars seen without a `mattelId`, e.g. demo passes). The Garage list
and detail screens now show the catalog **name + photo** when identified, with an "Identify / Change"
call to action. A shared `CarPhoto` component degrades a missing/404 image to a neutral tile.

## Consequences

### Positive

- The Garage gains **real casting names and art** — the headline UX ask — with a one-tap manual
  match, and identifying one copy of a casting names every copy (when the casting key is learned).
- **Zero risk to shipped persistence:** identity is additive (new store, new tables, append-only
  migration). The garage schema, reducers, and tests are unchanged; in-memory fallback still works
  in CI/web/simulator.
- Fully offline and backend-free, consistent with the rest of the app. Protocol stays framework-free
  and unit-tested (`castingKeyFromMattelId` has its own KAT cases).

### Negative / costs

- **Manual, not automatic.** Without a binary-id → name map, the user must pick each casting once.
  The model-id grouping reduces that to once-per-casting *if* the reverse-engineered offset is right.
- **Reverse-engineered assumption.** The model-id byte slice is a best guess; the raw-id fallback
  makes a wrong guess safe (degrades to per-id identity) but a wrong-but-decodable offset could
  over- or under-group. Revisit if `PROTOCOL.md` firms up.
- **Catalog provenance + licensing.** The data and photos come from the Hot Wheels Fandom wiki
  (**CC-BY-SA**). For the prototype we hot-link wiki CDN image URLs and bundle scraped metadata;
  before any public release we must add attribution and decide whether to mirror/relicense the
  images. The catalog is also incomplete (2021 series labels are sparse; a couple of cars lack
  art/toy#).
- The catalog is a **point-in-time snapshot**; refreshing means re-running the scraper.

## Alternatives considered

- **Automatic id → name lookup.** Rejected: impossible offline — the Mattel backend is gone and no
  public binary-id map exists.
- **Extend the `cars` table with identity columns.** Rejected for the prototype: it would touch the
  durable, device-validated garage schema and its migration/reducer surface. An isolated store +
  append-only tables is reversible and keeps the blast radius near zero.
- **Key identifications on `uid` instead of `castingKey`.** Rejected: it would force the user to
  re-identify every physical copy of the same casting. Keying on the model id names all copies at
  once; the per-uid synthetic key is only a fallback for cars with no decodable id.
- **Fetch the catalog at runtime from the wiki.** Rejected: adds a network dependency and a runtime
  failure mode to a primarily-offline app. A bundled snapshot is simpler and deterministic.

## Addendum (2026-07-09): independent corroboration of the id layout

Reviewing external prior art confirmed the reverse-engineered `mattelId` layout against real
third-party captures, and firmed it up:

- **[`mtxmiller/hotwheels-portal`](https://github.com/mtxmiller/hotwheels-portal)** independently
  decoded the *same* portal (HWiD fw 1.2.5) and documents the identical structure: `version(2)` at
  offset 0, a 4-byte **Car Type/Model ID** at offset 2, and the **NFC UID in the last 6 bytes** —
  matching both our slice and the tag-UID tail our decoder now validates.
- **[`Project-Genoa/API-Protocol-Docs`](https://github.com/Project-Genoa/API-Protocol-Docs)** decodes
  the broader Mattel PID scheme (Minecraft Earth boost figures, same `pid.mattel/<b64>` URL) and
  identifies the offset-2 field as **a product id encoded as an unsigned 32-bit big-endian integer**.
- **Verified numerically:** decoding those 4 bytes as a BE uint32 yields the number the portal *also*
  reports on its Serial-Number characteristic — mtxmiller logged id `AQBBr66t…` next to serial
  `1102032557`, and `0x41afaead = 1102032557` exactly. `decodeMattelId()` now exposes this as
  `productId`, and `mattelIdMatchesSerial()` cross-checks it against the serial channel (a second
  free integrity check alongside the tag-UID one).

**Naming is still unsolved by everyone.** Both external sources fall back to a manual/community
lookup table keyed by the raw id — the same conclusion this ADR reached. No offline binary-id → name
oracle exists; the manual catalog picker stands.
