# Restore Drill Attestor — repair 10 handoff

## Status: release blocked by factory billing registration

No application source was changed. The current code is the last runtime
implementation, `658e2b4f3c774f68c30061c91f3c4654ef279b37`; the prior
documentation/review baseline was `38f3de920ae63a4a158d4fca45bcbea8a7e61fe9`.
This repair's registration evidence is committed as
`af5180ca1a34a8daad95f41912b0c3057444bd78`.

The live checkout was reproduced on 2026-09-06 UTC:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

That is the remaining release blocker. Factory billing must enable the product,
set the required one-time price, and validate a hosted checkout return before
this product can release. The free CLI stays available and existing Operator
Pack licenses can still be restored and verified locally.

## What this repair added

- `.factory/catalog-description.txt`: verb-first, 74-character catalog copy;
  copied to `/work/.evidence/catalog-description.txt`.
- `/work/.evidence/billing-offer.json`: registration metadata for the actual
  historical live Operator Pack offer — US $39 / 3,900 USD minor units, one
  time — with the exact product origin, return URL, paid deliverables, merchant
  of record, and existing license-validation endpoint. It contains no
  credentials.
- `.factory/verification-11.md`: current reproduction, test evidence, and
  disposition of every earlier finding.

The price is evidence-backed by the previous independent live reports, not a
new guess. Sales remain unadvertised until the factory endpoint returns a
hosted checkout, so visitors are not sent to a dead purchase URL.

## How verified

From a clean locked dependency install:

```sh
npm ci
# Every exact command in .factory/claims.json (12/12 passed)
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- --workers=2
cargo package --locked --allow-dirty
```

Results: Rust unit/integration and Vitest passed; the full Chromium desktop and
390 px browser matrix passed 56/56; package verification passed. The packed
crate was installed into a fresh consumer root, then its installed binary
passed `--help`, `demo --json`, `validate --json`, and confirmed `run --json`.

The local production build matches the live deployment byte-for-byte for all
16 public artifacts. A fresh live desktop and phone context read the job,
audience, and sample action before scrolling; each completed the sample,
showed the persistent demo banner, reset safely, and left seeded real browser
data unchanged. The live URL verifier passed with no console errors. Mobile
Playwright axe found zero violations. The standalone axe CLI could not start
its Selenium Chrome driver in this container; this environmental limitation is
recorded in `verification-11.md`, while the pinned Playwright axe audit passed.

## Required factory follow-up

1. Register and enable `restore-drill-attestor` in the Sociobot billing API.
2. Configure the Operator Pack as USD 39.00, one-time, with return URL
   `https://restore-drill-attestor.sociobot.in/#operator-pack`.
3. Confirm checkout redirects to that origin with a `license` query token.
4. Restore the compliant buy link, exact price, and Sociobot/Dodo merchant
   disclosure in the site only after checkout is live.
5. Complete a real purchase-return-verification and revoked-license check, then
   rerun the declared claims and release verification.

## Known gap

The product cannot itself enable a factory billing record. No payment provider,
credentials, mock checkout, or invented price was added. Until the registration
is complete, the researched one-time monetization requirement remains unmet.
