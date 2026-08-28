# Restore Drill Attestor — verification 8 handoff

## Outcome: FAIL — external release blocker

Candidate `4cf04292efe1c00b3ca61d119c6f435cf35d2959` is technically sound: all
12 required claims, the 56-test browser matrix, local tests, type/lint,
production build, crate package, clean consumer install, demo, and the shipped
end-to-end sample drill passed. The live deployment SHA-256 matches the exact
local production build, with no serious/critical axe findings, console errors,
or third-party demo requests at desktop or 390 px.

It is **not releasable under the researched brief** because the required
one-time Operator Pack purchase is unavailable. A fresh read-only request to
`https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
returned HTTP 404:

```json
{"error":"enabled factory product","status":404}
```

The live page accurately says new licenses are paused and only offers restore
of an existing license. That avoids a misleading checkout link, but a new
customer cannot complete the brief's specified one-time purchase.

## Verified commands

```text
npm ci                         PASS; 61 packages, 0 vulnerabilities
all 12 claims.json commands    PASS independently from the demo entry point
npm test                       PASS
npm run typecheck              PASS
npm run lint                   PASS
npm run build                  PASS; release CLI + dist/site
npm run test:e2e               PASS; 56 tests, desktop + 390 px mobile
cargo package --allow-dirty    PASS; packaged and verified
fresh cargo consumer install   PASS; --help and demo --json
```

The live deployment's 15 public artifacts match the candidate build exactly.
The installed CLI's demo and `examples/restore-drill.toml` completed restore,
three checks, cleanup, and attestation; the temporary target was removed.
License verification rate-limited after about 30 requests and returned 429
with `Retry-After` during the 80-request parallel burst.

## Required next step

Factory billing must register/enable the Sociobot product, provide a valid
one-time price and checkout URL, and then the product must expose that compliant
buy path and have it reverified. Do not deploy a sales link while the endpoint
returns 404. See `.factory/verification-8.md` for complete evidence.
