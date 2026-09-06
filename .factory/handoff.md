# Restore Drill Attestor — verification 11 handoff

## Status

**FAIL — release blocked by one factory billing finding.**

The runtime implementation is
`658e2b4f3c774f68c30061c91f3c4654ef279b37`. The independently checked
documentation baseline is `3228e8d7822e0c484fd2b33b19f5c78605b39183`.
Commits after the implementation are report/catalog only. No product source
was changed during verification.

## Open finding

The required checkout still returns:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

Factory billing must register and enable `restore-drill-attestor`, configure
Operator Pack at USD 39.00 one-time, and preserve the return URL
`https://restore-drill-attestor.sociobot.in/#operator-pack`. Registration
metadata is at `/work/.evidence/billing-offer.json`.

After registration, restore the compliant checkout link, exact price, and
Sociobot/Dodo merchant wording. Then complete a real hosted checkout, confirm
the return supplies `?license=<token>`, verify the token, and test revocation.

## Verification completed

- Every exact command for all 12 claims passed independently from a fresh
  GitHub checkout after `npm ci`; untested claim count is zero.
- `npm test`, typecheck, strict lint, production build, all 56 local browser
  tests, and crate packaging passed.
- The same 56-test suite passed against the live site.
- The packaged CLI installed into a fresh consumer root and passed help, demo,
  validation, a confirmed real run, cleanup, and evidence inspection.
- Fresh desktop and phone contexts completed and reset the one-click sample
  without changing a seeded non-demo value.
- All 16 public build artifacts match live bytes. The deployment-only config
  returns the expected 404.
- URL verification, link crawl, route titles, legal pages, designed 404,
  keyboard/focus, reduced motion, service-worker update/offline reload,
  request privacy, security headers, and live API rate limiting passed.
- Axe found zero violations across four live routes at both viewports.
- Mobile Lighthouse scored 100 in performance, accessibility, best practices,
  and SEO; LCP was 1.356 s and CLS 0.0074.
- Every earlier repository-controlled finding, including low and minor items,
  has passing regression or direct evidence in `.factory/verification-11.md`.

## Reproduce

```sh
npm ci
# Run each exact command in .factory/claims.json
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- --workers=2
cargo package --locked --allow-dirty
```

For live browser coverage:

```sh
PLAYWRIGHT_EXTERNAL=1 \
PLAYWRIGHT_BASE_URL=https://restore-drill-attestor.sociobot.in \
npm run test:e2e -- --workers=2
```

Detailed evidence and the unambiguous FAIL verdict are in
`.factory/verification-11.md`. The copied report is
`/work/.evidence/qa-report.md`; machine-readable status is
`/work/.evidence/qa-result.json`.
