# Community car submission options

Investigation: 2026-09-05. Recommendation only; no submission service or new
network behavior has been implemented.

## Recommendation

Offer **Help others identify this car** immediately after a collector confirms
an identification. Show the selected catalog photo/name, explain what will be
shared, then let them submit it without creating an account. Keep a batch review
entry under Settings for existing identifications.

Use a small submission endpoint and a maintainer review queue. Keep the approved
catalog and identity seed bundled in the app. Scanning, identifying, and racing
can remain offline; only the explicit submission needs internet access.

## What is awkward today

- `app/settings.tsx` calls `Share.share({ message: JSON.stringify(...) })`.
  This shares text, although the adjacent guide says it creates a JSON file.
- The contribution action is buried in Settings, disconnected from the moment
  someone identifies a car. It shares all eligible identifications together.
- `community/README.md` asks the collector to add a file and open a GitHub PR.
  `.github/workflows/seed.yml` also requires a regenerated seed, but the
  contributor steps do not explain that requirement. Uploading a valid new
  mapping alone therefore leaves CI failing until somebody builds the seed.
- There is no submission receipt, selection preview, or duplicate tracking.
- The checked-out branch has no contribution JSON files and an empty bundled
  `identity-seed.json`. That establishes the current dataset state, not the cause
  of low participation.
- This is an **identity-mapping** contribution flow: it attaches a scanned
  product ID to an existing catalog entry. `exportIdentifications` and the Python
  validator cannot accept a car missing from the catalog.

Sources in the repo: [Settings](../../apps/mobile/src/app/settings.tsx),
[export boundary](../../apps/mobile/src/catalog/identityExport.ts),
[contribution guide](../../community/README.md),
[seed validation and aggregation](../../python/tools/seed_lib.py),
[seed CI](../../.github/workflows/seed.yml).

## Options

| Approach | Collector experience | Maintenance and limitations |
| --- | --- | --- |
| Prefilled GitHub issue | Review a prepared issue, sign in, submit | Smallest code change; removes files and PRs. Still requires a GitHub account and leaves the app. Maintainer tooling must turn approved issues into seed changes. |
| Prefilled email | Open a prepared message and send | No custom service, but depends on email setup, exposes the sender's address to the recipient, and requires inbox processing. The app cannot reliably confirm delivery. |
| Hosted contribution form | Open a prefilled form and submit | Can be account-free if configured that way. Useful intermediate option; needs a real destination, moderation, and an import workflow. Returning to the app alone is not proof of submission. |
| Native review + small intake endpoint | Review the car and tap Submit in the app | Recommended experience. Needs hosted intake, validation, duplicate handling, moderation, and a real receipt. No collector login is necessary. |

GitHub officially supports prefilled `title`, `body`, and template fields in
[issue URLs](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query).
It also documents permission restrictions on parameters such as labels and
server limits on URL length. A shortcut should use small individual submissions,
not encode a whole garage into one URL.

## Proposed experience and boundaries

1. The collector identifies a car using the existing picker. Their local choice
   is saved regardless of whether they contribute.
2. An optional action opens a review showing the car and a plain-language data
   explanation. Technical product IDs can be disclosed on demand.
3. Submit sends only the verified casting key and chosen catalog ID. Reuse
   `exportIdentifications` to exclude synthetic keys and raw Mattel IDs. The
   server derives canonical names/toy numbers and allowlists stored fields.
4. Show **Submitted for review** only after the intake acknowledges it. Network
   failure keeps the review available for retry. Do not silently upload later;
   the existing identification can be used to retry on a future visit.
5. Maintainer approval produces the contribution file and regenerated seed
   together. Approved mappings reach everyone in a later app release.

Add **Car not listed** as a separate path: proposed name and package toy number,
plus the scanned product key when one is available. This requires catalog review
before it can become an identity mapping. Optional evidence photos would need a
separate upload/storage design; they are not part of the current export schema.

The current safe payload already exists. Most of the work is the receiving and
reviewing side, plus making submission discoverable and giving honest feedback.

## Intake design implications

- Keep GitHub credentials on the server. A GitHub-backed review queue can use an
  installation token with the required permissions; the
  [create-issue API](https://docs.github.com/en/rest/issues/issues#create-an-issue)
  requires Issues write permission. The mobile binary must not carry a repo token.
- Use idempotency for retries and flag conflicting mappings for review. The
  current aggregation counts one vote per contribution file, not one verified
  person: repeated anonymous requests must not become independent confidence
  votes. Maintainer review remains the authority.
- Apply payload limits and rate limiting. If a browser challenge is needed,
  [Turnstile requires a browser/WebView on mobile](https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/)
  and [server-side validation](https://developers.cloudflare.com/turnstile/get-started/).
  It is not a drop-in native React Native control.
- This would revise ADR-0014's no-service decision and the current privacy copy
  stating there is no application server. Document explicit submissions and
  the actual host's operational logging before shipping. The existing settings
  API, BLE protocol, and local persistence need not change for a manual retry MVP.

If zero hosted infrastructure is a firm requirement, use the prefilled GitHub
issue as a pragmatic fallback. For participation by ordinary collectors, the
account-free submission flow is the stronger product choice.
