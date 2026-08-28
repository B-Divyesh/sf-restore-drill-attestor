# Independent product verification 7 — FAIL

- Work order: `restore-drill-attestor-verify-7`
- Candidate tested: `de2723d3e9e0ff3a950c37974f5317992d80b2c6`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 28 August 2026 UTC
- Result: **FAIL — the researched one-time purchase is still unavailable, and the direct required demo entry exceeds the CLS budget.**

No product source was changed during this verification. The only repository changes are this report and the requested handoff update.

## First read and demo gate — PASS

A cold visit to the live first screen says, in plain words, **“Prove your database backup restores.”** It names **“indie SaaS operators and small platform teams”** and provides **“Try it with sample data”** with the immediate outcome: **“It runs a four-stage sample and shows the evidence.”**

One click opens `/?demo=1#demo`; desktop and 390×844 mobile both show the persistent **“Demo — sample data, nothing is saved to your work”** banner with Reset demo and Start for real. The sample drill reaches its passed evidence state. This satisfies the first-read and one-click sandbox requirements.

## Required claims — PASS

`.factory/claims.json` is present and contains 12 IDs. After `npm ci` in this clean checkout, each exact declared Playwright command was invoked independently against its shipped demo entry point. All passed (12/12):

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

The full browser suite then passed 54/54, including all claim tests on desktop and the 390 px project. `test-results/.last-run.json` records `status: passed`.

## Defects by severity

### High — one-time Operator Pack purchase remains unavailable

The researched brief specifies one-time monetization and the page describes an Operator Pack, but it says **“New licenses are not currently offered.”** A fresh production request confirms the required Sociobot checkout endpoint is still unavailable:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP 404
{"error":"enabled factory product","status":404}
```

The free CLI is not gated and the existing-license restore flow works, but a new customer cannot obtain the advertised class of one-time license. Factory billing registration/enablement is required; this verifier did not alter billing infrastructure.

### High — direct demo first load exceeds the CLS quality budget

The required direct demo URL, `https://restore-drill-attestor.sociobot.in/?demo=1`, was measured with Lighthouse mobile using the installed Chromium headless shell:

```text
Performance / Accessibility / Best practices / SEO  94 / 100 / 100 / 100
FCP / LCP / CLS / TBT                               1.1 s / 1.4 s / 0.147 / 50 ms
Transferred                                          96 KiB
```

The project performance contract requires CLS below 0.1. The ordinary landing route is healthy (`100 / 100 / 100 / 100`, FCP 1.1 s, LCP 1.4 s, CLS 0.007, TBT 90 ms, 96 KiB); the violation is specific to the direct demo entry, whose demo banner is revealed after initial layout. Because `?demo=1` is the required catalog/verifier sandbox entry, this misses the quality gate.

## Passing verification evidence

```text
npm ci                                  PASS; 61 packages, 0 vulnerabilities
npm test                                PASS; 11 Rust unit, 1 binary, 6 integration, 3 Vitest
npm run typecheck                       PASS
npm run lint                            PASS; rustfmt, Clippy -D warnings, TypeScript
npm run build                           PASS; release CLI and dist/site
npm audit --omit=dev                    PASS; 0 vulnerabilities
npm run test:e2e -- --workers=4         PASS; 54/54
cargo package --locked --allow-dirty    PASS; 11 files, 75.1 KiB / 21.9 KiB
```

A fresh consumer installation from the packaged crate exposed helpful `restore-drill --help`, then completed `restore-drill demo --json` with `status:"passed"`, `real_data_touched:false`, and `target_removed:true`. The shipped example passed `validate` and `run --json`, removed its disposable target, and wrote schema-v2 evidence with neutral check IDs, stage durations, a SHA-256 configuration fingerprint, and a 30-day `fresh_until` date.

All 15 browser-served candidate artifacts exactly SHA-256 match production. The live origin had no console/page errors or third-party demo requests at desktop or 390 px, no mobile horizontal overflow, a visible skip-link focus ring, and zero axe WCAG 2A/2AA violations (including zero serious/critical) on both inspected viewports. The standalone axe CLI could not locate a system Chrome binary; the same axe-core 4.10.3 engine was instead injected into Playwright with CSP bypassed solely for the audit.

Live policy checks found HSTS, restrictive CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, strict-origin referrer policy, restrictive permissions policy, 30-second HTML revalidation, one-year immutable hashed assets, and `sw.js` `no-cache`. Unknown routes return the designed 404 with HTTP 404. The service-worker/offline/reduced-motion/keyboard checks are covered by the passing 54-test browser matrix.

The only server-side product endpoint is Sociobot license verification. A fresh burst of 80 invalid verification requests at parallelism 40 received 30 HTTP 200 and 50 HTTP 429; observed 429 responses carried `Retry-After: 2–3`. The observed threshold is therefore about 30 requests per burst. No sign-in is present, so Entra tenant validation is not applicable.

## Acceptance decision

**FAIL. Do not release `de2723d3e9e0ff3a950c37974f5317992d80b2c6` as the complete factory product contract.** Enable/register the Sociobot one-time checkout (then expose the compliant buy path) and reserve the demo banner's layout before it becomes visible so the direct demo route stays below 0.1 CLS.
