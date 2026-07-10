# Identity seed contributions

This directory is the reviewable input to Redline ID's bundled community identity seed. Each
contribution `.json` must be an unmodified `redlineid.identity-seed/1` export from the app's
**Settings -> Community -> Share identified castings** action.

Device exports contain no contributor identity or review provenance. Repository-only attestations
live in `sources.json` and are never bundled into the app.

## Contribute and review

1. Identify cars in Redline ID and confirm each match against the physical car or package.
2. Export the JSON from Settings.
3. Open a pull request that adds the unmodified export as one new `.json` file here. Explain how each
   proposed mapping was checked.
4. A maintainer computes the normalized payload digest with `npm run identity-seed:report` and adds a
   reviewed attestation to `sources.json`. Each attestation binds:
   - a stable, non-personal `sourceId` reused for submissions from that reviewed source;
   - the HotWheelsID pull request URL that records the independent review;
   - the exact normalized `payloadSha256`;
   - each reviewed `castingKey -> catalogId` mapping in that payload.
5. Merge the reviewed contribution. Its new attestation cannot vote during that pull request.
6. Regenerate the seed in a later pull request, after the attestation is part of the immutable base
   revision. Two independently reviewed sources must be trusted on that base before a mapping promotes.

This two-phase activation is intentional. Pull-request CI reads trust from the PR base SHA, and
main-branch CI reads it from the pre-push SHA. Adding or editing a contribution, `sourceId`, review
URL, digest, or mapping attestation can never create a vote in the same change.

The validator accepts only product-level facts:

- `castingKey` / `productId`
- bundled `catalogId`
- catalog name and packaging toy number used for review

It rejects NFC UIDs, `uid -> castingKey` links, collection/garage data, unknown fields, stale catalog
entries, malformed keys, and product IDs that do not equal the hexadecimal casting key. No
product-ID range is assumed.

## Consensus and conflicts

A mapping is promoted only when the same `castingKey -> catalogId` fact is attested by at least two
distinct base-trusted `sourceId` values and no trusted source maps that casting key differently.
Repeated files or attestations from one source count as one vote.

Payloads are fingerprinted semantically from their sorted identification facts. Filename and
`generatedAt` are ignored, so renamed or timestamp-only copies have the same digest. Distinct trusted
sources may attest that same digest and corroborate an identical one-row export. Trust is deduplicated
within a source, not across sources.

Attestation filtering happens before votes are computed. An attestation votes only when:

- it is present unchanged in both the current tree and the configured base revision;
- its digest exactly matches a contribution payload; and
- its exact `castingKey -> catalogId` mapping exists in that payload.

Unattested rows and current-only attestations are reported but ignored. Mapping conflicts block
generation instead of selecting a plurality.

```bash
npm run identity-seed:validate
npm run identity-seed:report
npm run identity-seed:generate
npm run identity-seed:check
```

Set `IDENTITY_TRUST_REF` to the immutable revision that is allowed to supply trust. Local commands
default to `main`. Generation is deterministic and writes only sorted `castingKey -> catalogId`
facts to `apps/mobile/src/catalog/identity-seed.json`.
