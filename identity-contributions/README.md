# Identity seed contributions

This directory is the reviewable input to Redline ID's bundled community identity seed.
Each `.json` file must be an unmodified `redlineid.identity-seed/1` export from the app's
**Settings -> Community -> Share identified castings** action.

## Contribute

1. Identify cars in Redline ID and confirm each match against the physical car or package.
2. Export the JSON from Settings.
3. Open a pull request that adds the export as one new, uniquely named `.json` file in this directory.
4. Do not combine, edit, or add fields to the export. Explain in the PR how the casting was checked.

The validator accepts only product-level facts:

- `castingKey` / `productId`
- bundled `catalogId`
- the catalog name and packaging toy number used for review

It rejects NFC UIDs, `uid -> castingKey` links, collection/garage data, unknown fields, stale
catalog entries, malformed keys, and product IDs that do not equal the hexadecimal casting key.
No product-ID range is assumed.

## Consensus and conflicts

A mapping is promoted to `apps/mobile/src/catalog/identity-seed.json` only when the same
`castingKey -> catalogId` fact appears in at least two distinct contribution files and no file
maps that casting key to a different catalog entry. Conflicts block generation and list every
candidate plus its source file for maintainer review. One-file observations remain pending.

```bash
npm run identity-seed:validate
npm run identity-seed:report
npm run identity-seed:generate
npm run identity-seed:check
```

Generation is deterministic: files and keys are sorted, timestamps and contributor metadata are
not copied into the bundled seed, and the app receives only `castingKey -> catalogId` facts.
