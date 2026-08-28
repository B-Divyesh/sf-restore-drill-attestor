# Restore Drill Attestor — independent verification 10

**Decision: FAIL — release blocked.**

Tested commit: `3c13e8c06f31384138ebfb9232aebe7612ef7d21` (`main`)

Live URL: <https://restore-drill-attestor.sociobot.in/>

Verification date: 2026-08-28 UTC

## Release-blocking defect

### Critical — the researched one-time product cannot be purchased

The researched brief requires one-time monetization. Fresh live evidence shows
the factory billing product is still unavailable:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The public page avoids a dead buy button and says new licenses are not offered.
That is honest, but it does not satisfy the brief's required one-time purchase
path. This is a factory billing configuration prerequisite, not an authorized
product-code change. Enable/register the product, configure its one-time price,
restore compliant checkout/price/merchant copy, and verify a real checkout →
returned-license flow before release.

No other release-blocking defect was reproduced.

## Mandatory first-read and claim gate

Cold live Chromium first read: **PASS**.

- What it does: “Prove your database backup restores.”
- For whom: “For indie SaaS operators and small platform teams …”
- What to do first: visible **Try it with sample data**; adjacent copy says it
  runs a four-stage sample and shows the evidence.

At a 390 px viewport the action measured 338 × 52.8 CSS px and there was no
horizontal overflow. The direct, resettable demo is `/?demo=1#demo`.

`.factory/claims.json` exists and contains 12 claims. Before broader QA, from
a clean `npm ci`, I ran every listed exact command with `set -e`; all selected
one test and passed (`/tmp/rda-claims-10.log` ended `ALL_CLAIMS_PASS`).

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

## Local quality gates — PASS

```text
npm ci                                      PASS (61 packages, 0 vulnerabilities)
npm test                                    PASS (12 Rust unit, 6 integration, 3 Vitest)
npm run typecheck                           PASS
npm run lint                                PASS (rustfmt, Clippy -D warnings, TypeScript)
npm run build                               PASS (release CLI and dist/site)
npm run test:e2e -- --workers=2             PASS (56/56 desktop + 390 px Chromium)
cargo package --locked --allow-dirty        PASS (11 files, 75.1 KiB / 21.9 KiB compressed)
```

The full browser suite covers normal and failed sample drills, invalid target
confirmation, production-like targets, oversized check output, timeout and
SIGTERM recovery, target locking, keyboard interaction, reduced motion, demo
reset/exit isolation, service-worker offline reload, legal routes, and the
existing-license flow.

Fresh build budgets: JavaScript 6,829 B (2,946 B gzip), CSS 17,685 B (4,504 B
gzip), self-hosted font 41,344 B, and mobile hero 43,858 B. All are within the
applicable limits.

## Packaged CLI and end-to-end exercise — PASS

`cargo package` was unpacked into a fresh temporary consumer root and installed
with `cargo install --path … --root … --locked`. The installed binary exposed
help for `demo`, `validate`, and `run`.

```json
{"status":"passed","demo":true,"real_data_touched":false,"target_removed":true}
```

The installed binary validated `examples/restore-drill.toml` with JSON output,
then completed a confirmed run in 152 ms and wrote an attestation. Claims and
integration tests additionally establish failure/recovery and boundary behavior.

## Live deployment, privacy, accessibility, and headers — PASS

- A fresh production build matched live bytes for **16/16** public artifacts:
  pages, scripts, service worker, CSS/JS/font, images, robots, and sitemap.
  `staticwebapp.config.json` is correctly not public.
- Cold live demo completed with `PASSED`; its complete request log contained
  only `https://restore-drill-attestor.sociobot.in`, with no console/page
  errors or analytics/third-party runtime requests.
- Live mobile (`390 × 844`) axe inspection found **zero serious/critical**
  violations. It had one `h1` and one `main`. Root-page keyboard focus landed
  on the skip link with a 3 px outline and visible 5 px shadow; desktop and
  mobile overflow were zero. The passing 56-test production build suite also
  covers reduced-motion and offline-reload behavior.
- Live HTML has CSP restricted to self plus the documented Sociobot verify
  origin, HSTS, `nosniff`, `DENY` framing, strict-origin referrer policy, and
  restrictive permissions policy. Hashed JS/CSS are `max-age=31536000,
  immutable`; `sw.js` is `no-cache`.
- The invalid-license verification response is `200`, `Cache-Control: no-store`,
  and `{"valid":false,"reason":"invalid"}`. A single-client probe allowed
  30 requests in the observed window; request 30 (following one initial invalid
  probe) and later returned **429** with `Retry-After: 3`. Thus the documented
  allowance is enforced.

## Required follow-up

1. Factory: enable/register `restore-drill-attestor` in the Sociobot billing
   service and assign the one-time price.
2. Product: add the compliant hosted checkout link, exact price, merchant copy,
   and preserve existing-license restore.
3. Verify hosted checkout, return URL license capture, cached verification, and
   revocation; then rerun this report's gates.
