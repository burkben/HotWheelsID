# Identity seed contributions

This directory is the reviewable input to Redline ID's bundled community identity seed. Each
contribution `.json` must be an unmodified `redlineid.identity-seed/1` export from the app's
**Settings -> Community -> Share identified castings** action. Repository-only review provenance
lives in `sources.json`; it is never added by the app or bundled into the runtime seed.

## Contribute

1. Identify cars in Redline ID and confirm each match against the physical car or package.
2. Export the JSON from Settings.
3. Open a pull request that adds the export as one new, uniquely named `.json` file in this directory.
4. Do not combine, edit, or add fields to the export. Explain in the PR how the casting was checked.
5. During review, a maintainer adds the file to `sources.json` with:
   - a stable, non-personal `sourceId` reused for later submissions from the same reviewed source;
   - the HotWheelsID pull request URL that records the review;
   - `verifiedCastingKeys`, containing only the casting facts independently checked in that PR.

The validator accepts only product-level facts:

- `castingKey` / `productId`
- bundled `catalogId`
- the catalog name and packaging toy number used for review

It rejects NFC UIDs, `uid -> castingKey` links, collection/garage data, unknown fields, stale
catalog entries, malformed keys, and product IDs that do not equal the hexadecimal casting key.
No product-ID range is assumed.

## Consensus and conflicts

A mapping is promoted to `apps/mobile/src/catalog/identity-seed.json` only when the same
`castingKey -> catalogId` fact appears from at least two independently distinguishable reviewed
`sourceId` values and no source maps that casting key to a different catalog entry. Multiple files
from one source still count as one vote.

Payloads are also fingerprinted semantically from their sorted identification facts. Filename,
`generatedAt`, and repository provenance are ignored. Copying the same export under another name,
or changing only its timestamp, produces one vote and is reported as a duplicate. Semantic
duplicates and mapping conflicts block generation for maintainer review.

Only keys explicitly listed in `verifiedCastingKeys` can vote. Other rows may remain in the
unmodified device export, but tooling reports and ignores them. This prevents a copied export with
one appended row from turning every copied row into a second vote: the reviewing PR must attest each
casting fact independently.

```bash
npm run identity-seed:validate
npm run identity-seed:report
npm run identity-seed:generate
npm run identity-seed:check
```

Generation is deterministic: files and keys are sorted, timestamps and review provenance are not
copied into the bundled seed, and the app receives only `castingKey -> catalogId` facts. Source
identity exists only in repository review metadata, never in device exports.
