# Verify database restore drill evidence — verification 11

**Verdict: FAIL.**

- Findings: **1** (critical)
- Untested claims: **0**
- Runtime implementation: `658e2b4f3c774f68c30061c91f3c4654ef279b37`
- Documentation baseline: `3228e8d7822e0c484fd2b33b19f5c78605b39183`
- Live URL: <https://restore-drill-attestor.sociobot.in/>
- Verified: 2026-09-06 UTC

Later commits after the runtime implementation contain reports and catalog
metadata only. A fresh production build matches all 16 public live files
byte-for-byte. No product-code change was made during this verification.

## Finding

### Critical — the required one-time purchase is unavailable

The brief requires a one-time paid offer. The factory billing product remains
unregistered or disabled:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The deliberate 404 for an unknown product-site route is correct and is not a
defect. This billing response is a defect because it prevents the required
purchase path. The live page honestly hides the dead buy link and keeps the
free CLI available, but a new customer cannot buy the Operator Pack. A real
checkout, return with `?license=<token>`, and returned-license verification
could not be exercised for the same reason.

Factory must register and enable `restore-drill-attestor`, set **Operator Pack**
to **US $39 one-time**, and use the return URL
`https://restore-drill-attestor.sociobot.in/#operator-pack`. Then the product
must restore the checkout link, exact price, and Sociobot/Dodo merchant terms.
A real purchase-return-verification and revoked-license check are required
before release. Registration metadata is in
`/work/.evidence/billing-offer.json`.

No other finding was reproduced.

## First screen and sample

Fresh desktop and 390 × 844 phone contexts were opened at scroll position zero.

- Job: **“Prove your database backup restores.”**
- Audience: indie SaaS operators and small platform teams needing repeatable
  recovery evidence without retaining restored data.
- First action: **“Try it with sample data.”** The adjacent sentence says the
  action runs a four-stage sample and shows its evidence.

The action entered `/?demo=1#demo` and immediately populated the realistic CLI
recording. Both viewports reached **PASSED: restore, 3 checks, and cleanup
completed.** The persistent label said **“Demo — sample data, nothing is saved
to your work”** and exposed **Reset demo** and **Start for real**. Reset reran
the sample. A seeded non-demo license value remained unchanged before and after
the demo, no `demo:` keys remained after reset, there was no horizontal
overflow, and neither context logged a console or page error.

Evidence: `/work/.evidence/live-desktop-demo.png` and
`/work/.evidence/live-phone-demo.png`.

## Claims

From a fresh GitHub checkout at documentation SHA `3228e8d`, `npm ci` installed
61 locked packages with zero audit vulnerabilities. Every exact command in
`.factory/claims.json` was then run separately. Each selected exactly one test.

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS |
| `evidence-minimization` | PASS |
| `output-bounds` | PASS |
| `target-safety` | PASS |
| `cleanup-recovery` | PASS |
| `automation-contract` | PASS |
| `target-lock` | PASS |
| `attestation-metadata` | PASS |
| `shell-environment` | PASS |
| `offline-reload` | PASS |
| `site-local-only` | PASS |
| `operator-pack` | PASS |

The landing page, legal pages, README, CLI help, and configuration API were
cross-checked against the manifest. No false, incomplete, missing, or untested
public claim was found. The `operator-pack` claim covers restoring an existing
valid license; it does not prove the unavailable new-purchase path described in
the finding. Full command output is in `/work/.evidence/claims-11.log`.

## Clean quality gates

```text
npm ci                                      PASS (61 packages, 0 vulnerabilities)
npm test                                    PASS (12 Rust unit/binary + 6 integration + 3 Vitest)
npm run typecheck                           PASS
npm run lint                                PASS (rustfmt, Clippy -D warnings, TypeScript)
npm run build                               PASS (release CLI and dist/site)
npm run test:e2e -- --workers=2             PASS (56/56 desktop + 390 px Chromium)
cargo package --locked --allow-dirty        PASS (11 files, 75.1 KiB / 21.9 KiB)
```

The same 56-test browser suite passed against the live origin. It covers sample
success and failure, keyboard and focus, reduced motion, layout, legal pages,
offline reload after service-worker update, demo isolation and exits, existing
and invalid licenses, metadata, security policy, and the designed 404.

Fresh build sizes are 6.83 kB JavaScript (2.93 kB gzip), 17.69 kB CSS
(4.50 kB gzip), a 41.34 kB self-hosted font, and a 43.86 kB mobile hero image.
These are within the supplied budgets.

## Installed CLI and recovery paths

The packaged crate was unpacked and installed into a separate fresh consumer
root. The installed binary passed `--help`, `demo --json`, `validate --json`,
and a confirmed `run --json` from an unrelated empty working directory.

The sample reported `status: passed`, `real_data_touched: false`, and
`target_removed: true`. The confirmed run completed in 154 ms, ran three
checks, removed its target, and wrote schema-v2 evidence with durations and a
SHA-256 fingerprint. The evidence contained none of the drill name, target ID,
check labels, restored marker, or schema marker.

Claim and integration tests also passed the invalid and boundary paths:
production-like target and inexact confirmation refusal before commands;
missing configuration as JSON exit 2; restore, check, timeout, and interruption
recovery; child-tree termination; held target lock; cleanup failure exit 4;
same-target contention; same-second evidence allocation; 64 KiB check-output
cap; and lifecycle output discard.

## Live site, accessibility, privacy, and performance

- Candidate and live output match for 16/16 public artifacts. The
  deployment-only `staticwebapp.config.json` correctly returns HTTP 404.
- `/`, `/privacy/`, `/terms/`, and `/404.html` have distinct plain titles, one
  `h1`, one `main`, and correct structure. A nonexistent route returns the
  designed 404 page with HTTP 404. Every page link resolved, excluding explicit
  `mailto:` links.
- Factory `verify-url.sh` passed in 623 ms with no errors, `lang="en"`, one
  `h1`, one `main`, alt text, and labeled buttons.
- Playwright axe found zero violations on home, privacy, terms, and 404 at both
  desktop and phone viewports. Keyboard focus, a visible 3 px focus outline,
  44 px controls, and the reduced-motion path passed.
- A clean complete demo made only same-origin requests. There are no analytics
  or third-party runtime assets. License storage and the sole Sociobot verify
  request are disclosed on `/privacy/`.
- The offline/update test installed and updated the service worker, reloaded in
  an offline context, and completed the sample. Hashed assets are immutable;
  the service worker is served with `no-cache`.
- Security headers include CSP, HSTS, `nosniff`, `DENY` framing,
  `strict-origin-when-cross-origin`, and a restrictive permissions policy.
- Live mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. LCP was 1.356 s, CLS 0.0074, total blocking time
  11 ms, and transfer 98,612 bytes.
- Invalid-license verification returned `200`, CORS for the product origin,
  `Cache-Control: no-store`, and `{"valid":false,"reason":"invalid"}`. The
  31st request in the observed allowance returned `429` with `Retry-After: 3`;
  later limited requests also included `Retry-After`.

This is a static site plus local CLI. Backend tenant isolation, server restart
persistence, application health, and SQLite persistence are not applicable.
The live static origin and its only product-specific API allowance were tested.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Production-looking targets bypassed safety | Resolved; `target-safety` passed before command execution. |
| Installation path unavailable | Resolved; public source clone and fresh packaged install passed. |
| Checkout returned 404 | **Open; the sole current finding.** |
| Same-second attestations collided | Resolved; immediate and concurrent allocation tests passed. |
| Mobile controls/text and keyboard focus were undersized | Resolved; both browser projects passed 44 px, 16 px, focus, and overflow checks. |
| JSON errors were not JSON | Resolved; unsafe and missing-config integration tests passed. |
| Response hardening was incomplete | Resolved; live headers and CSP passed. |
| License verification lacked rate limiting | Resolved; live 429 and `Retry-After` reproduced. |
| Labels could leak into evidence | Resolved; evidence minimization and consumer inspection passed. |
| Concurrent same-target runs were not serialized | Resolved; OS-backed target-lock claim passed. |
| Claims manifest and one-click demo were missing | Resolved; all 12 manifest commands and direct demo passed. |
| Metadata, sitemap, and real 404 were incomplete | Resolved; live route, metadata, crawl, and status checks passed. |
| Interrupted drill left its target and child process | Resolved; cleanup/interruption claim passed. |
| Alternate demo exits retained demo license state | Resolved; every same-tab exit regression passed. |
| Windows demo contradicted the three-check claim | Resolved; platform demo definition test passed. |
| Broad privacy promises exceeded behavior | Resolved; copy regression and request inspection passed. |
| Cold demo claim timed out | Resolved; fresh exact claim passed in 26.2 s. |
| Unreadable config had the wrong failure class | Resolved; missing-config JSON exit-2 test passed. |
| Command output was unbounded | Resolved; output cap/discard claim passed. |
| Direct demo exceeded the CLS budget | Resolved; regression passed; live CLS was 0.0074. |

## Decision

**FAIL with 1 finding and 0 untested claims.** The CLI, sample, site, claims,
accessibility, privacy, package, and live deployment pass. Release remains
blocked until factory billing registration makes the US $39 one-time checkout
and returned-license flow testable and successful.
