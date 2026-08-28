# Independent verification 8 — FAIL

- Verified: 2026-08-28 UTC
- Candidate: `4cf04292efe1c00b3ca61d119c6f435cf35d2959`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Scope: independent verifier; product source was not changed.

## Decision

**FAIL.** The core CLI, browser demo, privacy safeguards, claims, and deployment
identity pass, but the researched brief requires one-time monetization and a
new customer cannot buy the described Operator Pack. The deployed Sociobot
checkout endpoint is HTTP 404. The live static site is otherwise byte-for-byte
the build made from this candidate.

## Mandatory first checks

### Claims and demo

`.factory/claims.json` exists and defines twelve claims. The first invocation
from the dependency-free checkout correctly could not import `@playwright/test`;
after the required locked install (`npm ci`, 61 packages, zero vulnerabilities),
each exact command declared in that file passed independently, from its bundled
demo entry point:

| Claim ID | Result |
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

The clean rerun wrote `ALL_CLAIMS_PASSED`; every individual log reported
`1 passed`. The full `npm run test:e2e` browser matrix then passed, 56 tests
across desktop and 390 px mobile.

Cold-read result: the first screen says **“Prove your database backup
restores.”** It names **indie SaaS operators and small platform teams**, and
the visible first-screen action is **“Try it with sample data.”** On a fresh
390 px browser the exact action opened `/?demo=1#demo`; the visible banner says
“Demo — sample data, nothing is saved to your work” and includes both **Reset
demo** and **Start for real**. This clears the plain-words and one-click-demo
gates.

## Clean checkout and package gates

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 61 packages, 0 vulnerabilities |
| `npm test` | PASS — 12 Rust unit tests, 6 Rust CLI integration tests, 3 Vitest tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — formatting and Clippy with warnings denied |
| `npm run build` | PASS — release binary and `dist/site/` |
| `cargo package --allow-dirty` | PASS — packaged and verified 11 files, 75.1 KiB (21.9 KiB compressed) |
| `npm run test:e2e` | PASS — 56 Playwright tests |

A new temporary consumer install (`cargo install --path /work/repo --root
<fresh-root> --locked`) exposed useful `restore-drill --help`. Its
`restore-drill demo --json` returned `status:"passed"`,
`real_data_touched:false`, and `target_removed:true` with a new temporary
sandbox and attestation path.

The representative shipped configuration also passed `validate --json` and a
real `run --json` with exact confirmation. The drill completed in 153 ms,
ran row-count/schema/application checks, removed its temporary target, and
wrote schema-v2 evidence containing neutral check IDs, stage durations, a
SHA-256 configuration fingerprint, and `fresh_until` exactly 30 days later.
The evidence contained no commands, output, restored values, labels, or
secrets. Boundary and recovery behavior (production-style target refusal,
inexact confirmation, output cap, restore/check failure, timeout,
interruption, cleanup failure, and target contention) is exercised by the
passing claim and Rust integration suites.

## Live deployment, privacy, and security

The following 15 browser-served files SHA-256 matched the exact local production
build: home, 404, privacy, terms, robots, sitemap, service worker, favicon,
apple icon, OG image, route-state script, JS, CSS, and self-hosted font.

Fresh desktop and 390 px live-browser checks found:

- no console or page errors;
- no horizontal overflow at 390 px;
- one `h1`, `lang="en"`, a `main` landmark, and the correct title;
- zero axe-core serious or critical findings on both viewports;
- only same-origin requests through the complete sample-demo flow;
- no sign-in surface (Entra validation is not applicable).

The independent axe audit used `@axe-core/playwright`; no worker
`verify-url.sh` exists in this checkout, and the project's equivalent semantic,
console, and accessibility Playwright checks also passed.

Live routes `/`, `/?demo=1`, `/privacy/`, and `/terms/` returned 200; an
unknown route returned the designed 404 with HTTP 404. Headers include HSTS,
`frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, strict-origin
referrer policy, and restrictive permissions policy. HTML revalidates at 30
seconds; hashed assets are one-year immutable; `sw.js` is `no-cache`.

The production build is comfortably within static budgets: JS 6.83 kB (2.93
kB gzip), CSS 17.69 kB (4.50 kB gzip), and the only font is a 41.34 kB
self-hosted WOFF2.

The only operational server-side product flow is existing-license verification. It returns
an invalid token as `200 {"valid":false,"reason":"invalid"}` with
`Cache-Control: no-store` and origin-specific CORS. A fresh test first sent 30
rapid invalid requests (all accepted), then a parallel burst of 80 (parallelism
40): 4 were 200 and 76 were 429, every 429 carrying `Retry-After: 0–4`.
The observed allowance is therefore about 30 requests per burst; rate limiting
meets the required response contract.

## Release-blocking defect

### High — researched one-time purchase is unavailable

The brief's monetization is explicitly **one-time**. The live page has an
Operator Pack section, but it says “New licenses are not currently offered”
and “New sales are paused”; it only permits restoring an existing license. A
fresh read-only request on 2026-08-28 confirms the required factory checkout
is not registered/enabled:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP 404
{"error":"enabled factory product","status":404}
```

This is factory-owned billing infrastructure, not a repository code defect,
and the site is honest rather than advertising a dead link. It is nevertheless
a release blocker against the researched product contract: a new customer
cannot make the specified one-time purchase. Register and enable the Sociobot
product, then expose the compliant checkout link with its exact one-time price
and a live checkout verification.

## Defects by severity

- Critical: none observed.
- High: one-time Operator Pack purchase unavailable (above).
- Medium: none observed.
- Low: none observed.

## Reproduce

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
cargo package --allow-dirty
target/release/restore-drill demo --json
target/release/restore-drill validate --config examples/restore-drill.toml --json
```
