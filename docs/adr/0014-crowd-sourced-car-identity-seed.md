# 14. Automatic car identity via a crowd-sourced community seed

- **Status:** Accepted
- **Date:** 2026-07-09
- **Deciders:** HotWheelsID maintainers
- **Related:** [ADR-0013](0013-car-identity-catalog.md),
  [ADR-0012](0012-modern-mpid-protocol-and-transport.md),
  [ADR-0006](0006-state-management-and-persistence.md)

## Context

[ADR-0013](0013-car-identity-catalog.md) shipped car identity as a **manual** flow: a bundled wiki
catalog plus a picker, where the user identifies each casting once (`castingKey → catalogId`). It
explicitly deferred *automatic* naming because "no public binary-id → name map exists — the Mattel
backend is gone." This ADR revisits whether automatic identity is reachable at all, having firmed up
the id decoding since.

**What decoding now gives us (PR #46).** The `mattelId` is fully structured: `version(2) ‖
modelId(4) ‖ misc ‖ tagUid(6)`, independently corroborated by
[`mtxmiller/hotwheels-portal`](https://github.com/mtxmiller/hotwheels-portal) (same portal) and
[`Project-Genoa/API-Protocol-Docs`](https://github.com/Project-Genoa/API-Protocol-Docs) (the broader
Mattel PID scheme). The 4 model-id bytes are a big-endian **`productId`** — for Hot Wheels it equals
the number the portal reports on its Serial-Number characteristic (verified: `0x41afaead =
1102032557`). So a car's stable product identity is fully recoverable **offline, from the tag alone**.
The only thing missing is the map from that number to a human casting name.

**Three ways that map could be recovered — two are dead:**

1. **Revive/replace the Mattel backend.** Dead. Hot Wheels id was discontinued (end of 2023); the
   live `pid.mattel/<id>` host now blanket-redirects every id (`303 → 301 → 301`) to the
   discontinuation FAQ without reading the id. No per-car resolution remains.
2. **Mine archived backend responses.** Dead. The Wayback CDX index has **zero** captures of the
   `pid.mattel` domain — the resolver lived behind app auth on dynamic per-car URLs that no crawler
   ever saw. There is no archived oracle to scrape.
3. **Crowd-source it.** Viable — and cheap, because the data already exists in the app. Every manual
   pick produces an authoritative `castingKey → catalogId` row. Those rows *are* the missing
   `productId → name` map; they just live on one device.

## Decision

Build automatic identity as a **crowd-sourced community seed**, not a service.

**1. Export contributed identifications.** A pure function over
`identityStore.identifications ∩ CATALOG` emits a shareable JSON array, surfaced in Settings via the
native share sheet:

```json
{ "castingKey": "41ae5e5b", "productId": 1101946459,
  "catalogId": "70-dodge-charger-rt", "name": "'70 Dodge Charger R/T", "toyNumber": "GHF45" }
```

Only entries whose `castingKey` is a **real** model id are exported; synthetic `uid:`-prefixed keys
(demo passes / cars seen without a `mattelId`) are device-local and filtered out.

**2. Bundle a seed and merge it at bootstrap.** Ship a community `identity-seed.json`
(`castingKey → catalogId`) that pre-populates `identifications` when identity is initialised. A
freshly-scanned car then **auto-names with zero taps** if anyone has ever identified that casting.
Merge rule: the **user's own pick always wins** over the seed (seed only fills gaps).

**3. Aggregate later.** Contributions are pooled out-of-band (a repo/gist) and the bundled seed is
regenerated on a cadence. No runtime network dependency is added to the app.

**Privacy boundary (the crux).** Only the `identifications` map (`castingKey → catalogId`) ever
leaves the device. The `links` map (`uid → castingKey`) — the per-tag, per-device data — **never**
does. The exported payload asserts only "Mattel product #X is catalog casting Y"; it carries no UID,
no per-car serial instance, and no user data. This is consistent with ADR-0013 keeping identity
isolated from the garage schema.

## Consequences

### Positive

- Identity becomes **progressively automatic** — the manual picker turns from a solo chore into a
  collective dataset, and the substitute for the dead backend is one the community owns.
- **Zero schema change.** `identifications` is already keyed on the global `castingKey`
  ([ADR-0013](0013-car-identity-catalog.md)); seeding is just pre-filling the same map, and export is
  a pure read. Fully offline, reversible, and isolated from `cars`.
- **No PII, by construction.** The uid→castingKey `links` never leave the device; the shared unit is
  a product-number → casting fact.

### Negative / costs

- **Cold start.** Until contributions accumulate, the seed is small; early users still pick manually.
- **Trust & moderation.** Pooled entries can be wrong or adversarial. The seed must be curated
  (reviewed / majority-voted) before it is bundled; the app already prefers the user's own pick, which
  limits blast radius, but a bad seed row could mislabel a casting a user hasn't identified.
- **Catalog licensing still applies.** Names/photos derive from the CC-BY-SA Fandom wiki
  ([ADR-0013](0013-car-identity-catalog.md)); sharing the `catalogId` map inherits that attribution
  obligation before any public release.
- **Offset stability.** The `castingKey` is a reverse-engineered slice; a future firmware change to
  the id layout would fragment the map. Mitigated by the `productId`↔serial cross-check (PR #46),
  which flags a layout drift at runtime.

## Alternatives considered

- **Revive or self-host a resolver.** Rejected — the backend is gone (see Context #1) and no id→name
  data was published to rehost.
- **Scrape archived `pid.mattel` responses.** Rejected — none exist in the Wayback index (Context #2).
- **Key the shared map on `uid` instead of `castingKey`.** Rejected — a uid is per-physical-tag and
  per-device; it is neither shareable nor a casting-level fact. `castingKey`/`productId` is the
  globally meaningful unit.
- **Stay fully manual (status quo).** Rejected as a ceiling: it caps identity at what each user
  personally scans, and discards reusable knowledge the app already collects.
