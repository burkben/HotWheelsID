# Community car-identity seed

This folder is the **crowd-sourced database** behind automatic car naming
([ADR-0014](../docs/adr/0014-crowd-sourced-car-identity-seed.md)). It's a repo, not
a hosted service — contributions arrive as pull requests, get reviewed, and are
folded into the seed the app bundles. No servers, no runtime network calls, no
per-user data.

## How a scanned car auto-names

1. When you identify a casting in the app, it records a `castingKey → catalog`
   fact (the Mattel product number → which Hot Wheels casting it is).
2. **Settings › Community › Share** exports the castings *you've* identified as a
   JSON payload. Only these product-number facts leave your device — never your
   tags, serial instances, or collection.
3. You add that payload here as a file and open a PR (below).
4. CI validates it; a maintainer reviews and merges.
5. `identity-seed.json` is regenerated and ships in the next app build, so
   everyone's app auto-names that casting with zero taps. A person's own pick
   always overrides the seed.

## Contributing

1. In the app, go to **Settings › Community** and tap **Share**. Save the JSON.
2. Add it to this repo as `community/contributions/<something-descriptive>.json`
   (e.g. `community/contributions/ben-2026-07.json`). One file per submission.
3. Open a pull request. CI runs:
   - `python tools/validate_seed_contributions.py` — schema + data checks, and
   - `python tools/build_seed.py --check` — proves the committed seed is in sync.
4. If CI is green and a maintainer approves, it merges.

### Contribution format

Exactly what the app's Share button emits (schema `redlineid.identity-seed/1`):

```json
{
  "schema": "redlineid.identity-seed/1",
  "generatedAt": "2026-07-12T00:00:00.000Z",
  "count": 1,
  "identifications": [
    {
      "castingKey": "41ae5e5b",
      "productId": 1101946459,
      "catalogId": "70-dodge-charger-r-t",
      "name": "'70 Dodge Charger R/T",
      "toyNumber": "FXB03"
    }
  ]
}
```

Validation rules (enforced by CI):

- `castingKey` — the 4 Mattel model-id bytes as **8 lowercase hex chars**.
  Synthetic `uid:`-prefixed keys are device-local and rejected.
- `catalogId` — must exist in the bundled
  [`catalog.json`](../apps/mobile/src/catalog/catalog.json).
- `productId` — if present, must equal `castingKey` decoded as a big-endian uint32.

## Moderation & conflicts

- **Review is the gate.** A maintainer reviews every PR; that's the defense
  against wrong or adversarial data.
- **Majority vote.** The seed is built by majority vote per casting across all
  contributions (one vote per file). If two catalog ids tie for a casting, that
  casting is **omitted** from the seed (not guessed) and flagged for review — the
  app still lets users identify it manually in the meantime.

## Regenerating the seed (maintainers)

```sh
cd python
python tools/build_seed.py          # rewrites apps/mobile/src/catalog/identity-seed.json
python tools/build_seed.py --check  # what CI runs; nonzero if the seed is stale
```
