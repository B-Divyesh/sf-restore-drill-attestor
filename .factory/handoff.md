# Restore Drill Attestor — repair 5 handoff

## Outcome

All findings in independent verification report commit
`859b92a108ae3c39bc4e70910748f0e8324f9100` for candidate
`a363b5f1304bc6ed6637eac766a2455cd4ee2f66` are repaired, tested, pushed, and
deployed at <https://restore-drill-attestor.sociobot.in>.

- Repair commit: `06eae57` — remove the unavailable checkout and scope privacy
  promises to behavior covered by tests.
- Azure Static Web Apps deployment:
  `f38d2b8e-9442-4f3d-9d24-0cbb9d754c45` from `dist/site`.
- Deployment class remains static. The product artifact remains a Rust CLI.

## Reproduction and repairs

### Unavailable Operator Pack checkout

Before repair, the exact advertised target reproduced the blocker:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP 404
{"error":"enabled factory product","status":404}
```

Billing registration is outside this repository, and repository policy forbids
changing billing infrastructure. The site no longer advertises a product that
cannot be bought. It removes the price, checkout link, merchant/refund sales
copy, and buy calls to action. It plainly says new sales are paused. Existing
customers can still paste or return with a valid license and restore the pack.
The complete free CLI, safety checks, demo, and attestation export remain
available without a license.

Exact regressions in `tests/site/site.spec.ts` assert that landing and terms
pages contain no checkout link or purchase action, state that new licenses are
not offered, retain the existing-license action, verify a valid existing
license, and keep the free sample runner enabled.

### Unscoped privacy promises

Before repair, the live site contained all three rejected broad promises:

```text
Backups and checks stay in your environment.
No backup storage.
No data upload.
```

Those statements could not describe arbitrary operator-provided shell commands.
They are replaced with the narrower tested statement that attestations omit
restored values and command output. Privacy and README copy also disclose that
configured commands keep the operator account's file and network access.

The exact browser regression rejects all three stale statements on landing and
privacy pages. The `evidence-minimization` claim continues to run the real
bundled CLI and asserts that evidence excludes sample values, labels, commands,
stdout, and stderr. The `site-local-only` claim separately proves that the
clean browser demo sends no third-party request.

`.factory/claims.json` now describes existing-license restoration instead of a
sale. All 11 claim IDs appear in exactly one tagged test and every declared
command passed independently after the clean install.

## Verification evidence — 28 August 2026 UTC

Clean install and repository gates:

```text
npm ci                                      PASS; 61 packages, 0 vulnerabilities
all 11 claims.json commands                 PASS independently; 1/1 each
npm test                                    PASS; 11 Rust unit, 5 integration, 3 Vitest
npm run lint                                PASS; rustfmt, Clippy -D warnings, TypeScript
npm run build                               PASS; release CLI and dist/site
npm audit --omit=dev                        PASS; 0 vulnerabilities
cargo package --locked --allow-dirty        PASS; 11 files, 72.7 KiB / 21.2 KiB
fresh packaged-crate install                PASS
installed restore-drill --help              PASS
installed restore-drill demo --json         PASS; passed, target removed, real data untouched
npm run test:e2e -- --workers=4             PASS; 52/52 desktop and 390x844 mobile
```

The two new verifier regressions passed alone from the clean install and in the
full matrix. The browser matrix covers the one-click demo, isolation and reset,
success/failure states, keyboard operation and focus, 44 px targets, responsive
layout, reduced motion, offline service-worker install/reload/update, privacy
requests, license return/cache/revocation, response-policy configuration,
semantic structure, legal routes, and axe scans. Desktop and 390 px completed
demo captures were inspected: both have exact viewport-width layout, a visible
`PASSED` result, and no console errors. Axe reported zero violations at both
sizes.

Production budgets:

```text
JavaScript        6,879 B (2.95 kB gzip)
CSS              17,638 B (4.48 kB gzip)
local font       41,344 B
mobile artwork   43,858 B
desktop artwork 146,742 B
```

Local production-preview Lighthouse 13.4.1:

```text
Performance / Accessibility / Best practices / SEO  100 / 100 / 100 / 100
FCP / LCP / CLS / TBT                               1.1 s / 1.5 s / 0.007 / 0 ms
Transferred                                            97 KiB
```

Live checks after deployment:

```text
factory verify-url.sh                       PASS; 806 ms, no console/page errors
live Playwright desktop + 390x844 mobile    PASS; 52/52
local/live public artifact hashes           PASS; 15/15 exact
unknown route                               PASS; designed body with HTTP 404
rejected copy and checkout-link scan         PASS; no matches
Lighthouse 13.4.1                           100 / 100 / 100 / 100
FCP / LCP / CLS / TBT                       1.1 s / 1.2 s / 0.007 / 0 ms
transferred                                  96 KiB
```

`staticwebapp.config.json` is consumed by Azure and intentionally not publicly
served; every other deployed file matched the local build by SHA-256. Live
headers include HSTS, `nosniff`, DENY framing, strict-origin referrer policy,
restricted permissions, and a self-only CSP with only the required Sociobot
license connection. HTML revalidates after 30 seconds, hashed JS is immutable
for one year, and `sw.js` is `no-cache`.

The live invalid-license identity check returned HTTP 200,
`{"expires_at":null,"reason":"invalid","valid":false}`, and
`Cache-Control: no-store`. The free experience never waits on that request.
There is no account or sign-in surface, so Entra tenant validation is not
applicable. This product has no runtime AI feature or AI identity path.

## Known gap and next step

New Operator Pack sales remain paused because the factory billing registry has
no enabled `restore-drill-attestor` product. This is now an explicit product
limitation rather than a broken public purchase promise. If sales resume, the
factory must register the US $39 one-time product through its billing workflow,
confirm that the Sociobot checkout redirects successfully, then restore the buy
copy and its checkout regression. No repository-owned release blocker remains.

Registry publication was not performed; factory-owned credentials publish the
crate after release acceptance.

## Run and verify

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:e2e -- --workers=4
cargo package --locked
restore-drill demo --json
```
