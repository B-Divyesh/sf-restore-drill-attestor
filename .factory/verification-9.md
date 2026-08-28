# Restore Drill Attestor — independent verification 9

**Result: FAIL — release blocked by missing required one-time purchase path.**

Tested candidate: `afb3ec72d8a29963ec905cf15f2218657529e7ee` (`main`)

Live URL: <https://restore-drill-attestor.sociobot.in/>

Verification time: 2026-08-28 17:07–17:16 UTC

## Release blocker

### Critical — researched one-time monetization cannot be purchased

The researched brief specifies one-time monetization. The product calls the
Sociobot billing system for existing-license verification, but its required
checkout product is not registered/enabled:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The live page honestly says “New licenses are not currently offered” and has
no dead buy button. That avoids misleading visitors, but it does not fulfil
the brief's required one-time monetization. This is a factory billing
configuration/deployment prerequisite, not a source-code change authorized in
this verification. Register and enable the product, set the one-time price,
restore the required checkout link/price/merchant copy, then complete a real
checkout → returned-license verification before reconsidering release.

## First-read result — PASS

Opened the live landing page in a cold Chromium context. Its first screen says:

- **What:** “Prove your database backup restores.”
- **For whom:** “For indie SaaS operators and small platform teams …”
- **What to do first:** one visible **Try it with sample data** action, with
  “It runs a four-stage sample and shows the evidence.” beside it.

At 390 px the action remained visible, 338 × 52.8 CSS px, with no horizontal
overflow. The direct demo URL is `/?demo=1#demo` and includes the reset/exit
demo controls. This satisfies the plain-words and one-click demo gate.

## Required claims — PASS

From this clean locked install, ran every exact command in
`.factory/claims.json` independently, before the broader suite. Each selected
one tagged Playwright test through the shipped demo entry point; Playwright's
final `test-results/.last-run.json` recorded `{"status":"passed","failedTests":[]}`.

| Claim ID | Exact command | Result |
| --- | --- | --- |
| `demo-sandbox` | `npx playwright test --project=chromium --grep '@claim:demo-sandbox'` | PASS |
| `evidence-minimization` | `npx playwright test --project=chromium --grep '@claim:evidence-minimization'` | PASS |
| `output-bounds` | `npx playwright test --project=chromium --grep '@claim:output-bounds'` | PASS |
| `target-safety` | `npx playwright test --project=chromium --grep '@claim:target-safety'` | PASS |
| `cleanup-recovery` | `npx playwright test --project=chromium --grep '@claim:cleanup-recovery'` | PASS |
| `automation-contract` | `npx playwright test --project=chromium --grep '@claim:automation-contract'` | PASS |
| `target-lock` | `npx playwright test --project=chromium --grep '@claim:target-lock'` | PASS |
| `attestation-metadata` | `npx playwright test --project=chromium --grep '@claim:attestation-metadata'` | PASS |
| `shell-environment` | `npx playwright test --project=chromium --grep '@claim:shell-environment'` | PASS |
| `offline-reload` | `npx playwright test --project=chromium --grep '@claim:offline-reload'` | PASS |
| `site-local-only` | `npx playwright test --project=chromium --grep '@claim:site-local-only'` | PASS |
| `operator-pack` | `npx playwright test --project=chromium --grep '@claim:operator-pack'` | PASS |

## Local quality gates — PASS

```text
npm ci                                      PASS (61 packages; 0 vulnerabilities)
npm test                                    PASS (12 Rust unit + 6 Rust integration + 3 Vitest)
npm run typecheck                           PASS
npm run lint                                PASS (rustfmt, Clippy -D warnings, TypeScript)
npm run build                               PASS (release binary and dist/site)
npm run test:e2e -- --workers=2             PASS (56/56 Chromium desktop + 390 px mobile)
cargo package --locked --allow-dirty        PASS (11 files; 75.1 KiB / 21.9 KiB compressed)
```

Fresh production build sizes: initial JS 6.83 kB (2.93 kB gzip), CSS 17.69 kB
(4.50 kB gzip), self-hosted font 41.34 kB, and mobile hero 43.86 kB. These
are within the applicable budgets.

Lighthouse mobile against live `/` reported performance **100** and
accessibility **100**; FCP 1.3 s, LCP 1.3 s, CLS 0.007, and total transfer
96 KiB. Lighthouse logged a post-audit `TARGET_CRASHED` from its full-page
screenshot gatherer; the completed category scores and metrics are recorded
in `/tmp/rda-lighthouse.json`, and independent Playwright/axe checks below
are the accessibility evidence.

## Functional CLI verification — PASS

Packaged the crate, unpacked it into a fresh consumer directory, and installed
it with `cargo install --path … --root … --locked`. The installed binary's
`--help` exposed `demo`, `validate`, and `run`. Its `demo --json` returned
`status:"passed"`, `real_data_touched:false`, and `target_removed:true`.

From a separate fresh temporary directory, the installed binary:

```text
restore-drill validate --config restore-drill.toml --json  -> valid:true
restore-drill run --config restore-drill.toml \
  --confirm local-restore-drill --output ./attestations --json -> passed (152 ms)
```

The emitted attestation had a SHA-256 configuration fingerprint, three neutral
check IDs, stage durations, and `fresh_until` exactly 30 days later. It did
not contain commands, values, labels, or output; the disposable target was
absent after cleanup. Claim tests additionally exercised invalid confirmation,
production-looking targets, oversized output, restore/check failures, timeout,
SIGTERM recovery, and same-target concurrency.

## Live deployment, privacy, security, and accessibility — PASS

- Fresh `dist/site` matched the deployed bytes for **16/16 public artifacts**:
  home, 404, privacy, terms, robots, sitemap, service worker, route script,
  mark, touch icon, OG image, both art files, font, CSS, and JS. The 17th
  local file, `staticwebapp.config.json`, correctly returns 404 publicly.
- All live same-tab links returned 200; a deliberately missing route returned
  the designed page with HTTP 404.
- Live `/`, demo, privacy, terms, and 404 each had one `h1` and one `main`,
  no page/console errors, and no serious or critical axe findings. Live demo
  requests stayed same-origin. A service-worker-controlled direct demo
  reloaded offline and retained the sample runner.
- Full browser regression coverage passed keyboard skip-link and visible
  3 px focus styling, Enter/Space operation, reduced-motion behavior, 390 px
  layout, legal pages, demo reset/exit isolation, invalid-license recovery,
  and offline completion.
- Live headers include HSTS, CSP restricted to self plus the stated Sociobot
  verify origin, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  strict-origin referrer policy, and restrictive permissions policy. Hash-named
  JS/CSS are immutable for one year; `sw.js` is `no-cache`.
- No analytics or third-party runtime requests were observed. The CLI has no
  telemetry. Stored license material remains local and has an explicit restore
  path; no sign-in is present.

The live verification endpoint responds to an invalid token with a no-store
`200 {"valid":false,"reason":"invalid"}` and correct CORS for the site.
A fresh burst accepted 30 rapid requests; request **31** returned **429** with
`Retry-After: 3`, satisfying the server-side rate-limit check.

## Required follow-up

1. Factory: enable/register `restore-drill-attestor` in Sociobot billing and
   set the brief's one-time product price.
2. Product owner: restore the checkout link and compliant price/merchant
   disclosure after that endpoint is live.
3. Verify one real hosted checkout, return URL license capture, cached
   verification, and revocation handling. Then rerun this report's quality
   gates and release decision.
