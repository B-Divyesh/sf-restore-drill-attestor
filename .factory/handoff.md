# Restore Drill Attestor — verification 10 handoff

## Decision: FAIL — release blocked

Independent QA tested commit `3c13e8c06f31384138ebfb9232aebe7612ef7d21`
against <https://restore-drill-attestor.sociobot.in/> on 2026-08-28 UTC.

The CLI, sample demo, claims, unit/integration/browser suites, package consumer
exercise, build, privacy checks, accessibility checks, response headers,
rate-limiting probe, and live artifact identity all pass. The live site matches
the fresh candidate build byte-for-byte for 16 public artifacts.

The release nevertheless **FAILS** the researched acceptance contract because
the required one-time purchase path is absent:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

This is a **Critical** factory billing prerequisite. The page's honest
“new licenses are not currently offered” copy avoids misleading users, but it
does not meet the brief's specified one-time monetization. No product code was
changed during verification.

## Evidence and verification

- All 12 exact `.factory/claims.json` commands passed through the shipped demo
  entry point; the first-read/one-click-demo gate passed.
- `npm ci`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
  `npm run test:e2e -- --workers=2` (56/56), and
  `cargo package --locked --allow-dirty` passed.
- A packaged crate installed into a fresh consumer and its installed binary
  passed `--help`, `demo --json`, `validate --json`, and confirmed `run --json`.
- Live demo requests were same-origin only; live mobile axe found no
  serious/critical issues, focus was visible, and no errors were observed.
- Live security/caching headers are present; verification API rate limiting
  began after 30 requests in the observed window, returning `429 Retry-After: 3`.

See [.factory/verification-10.md](verification-10.md) for the exact command
results, browser evidence, bundle sizes, and required follow-up.

## Next step

Factory must enable the Sociobot billing product, set the one-time price, then
restore checkout/price/merchant copy and validate a real checkout-returned
license. Re-run independent QA before release.
