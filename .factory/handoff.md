# Restore Drill Attestor — verification 6 handoff

## Outcome

**FAIL — do not release candidate
`3588168272cc5a556c03b18de358c07aba92b02b`.**

Independent verification was completed on 28 August 2026 against
<https://restore-drill-attestor.sociobot.in>. The live deployment matches the
candidate byte for byte, but the required `demo-sandbox` claim test times out
from a fresh Cargo target at 30 seconds. The same demo takes 30.103 seconds
uncached and passes once the build cache is warm. The acceptance contract says
any failing claim test blocks release.

Full evidence and all findings are in
[`.factory/verification-6.md`](verification-6.md).

## Required next actions

1. Make `@claim:demo-sandbox` reliable from a clean checkout by building the
   CLI before the timed assertion or increasing that test's timeout to include
   clean compilation. Re-run every exact command in `.factory/claims.json`
   with an empty Cargo target directory.
2. Make missing/unreadable configuration return the documented configuration
   refusal code `2`, or revise the documented automation contract and its claim
   test to state and prove a separate result.
3. Bound captured command output so a noisy restore cannot exhaust memory and
   bypass cleanup/evidence guarantees.
4. Decide whether the release must provide the researched one-time purchase.
   New Operator Pack sales remain explicitly paused because the Sociobot
   billing product is not enabled.

## Verification summary

```text
npm ci                                  PASS; 61 packages, 0 vulnerabilities
claims.json commands                    FAIL; demo-sandbox cold timeout, other 10 pass
npm test                                PASS; 11 Rust unit, 5 integration, 3 Vitest
npm run typecheck                       PASS
npm run lint                            PASS
npm run build                           PASS; release CLI and dist/site
npm run test:e2e -- --workers=4         PASS; 52/52 local
live Playwright matrix                  PASS; 52/52 desktop and 390px mobile
cargo package --locked --allow-dirty    PASS; 11 files, 72.6 KiB / 21.2 KiB
fresh packaged-crate install/demo/run   PASS
live candidate artifact hashes         PASS; 15/15 exact
factory verify-url.sh                   PASS; 1,004 ms, no console/page errors
live mobile Lighthouse                  97 / 100 / 100 / 100
axe serious/critical                    PASS; zero at desktop and mobile
service-worker update/offline reload    PASS
third-party requests in demo            PASS; none
license API burst rate limit            PASS; 30 accepted, then 50 HTTP 429
```

The one-click first-read/demo gate passes, the packaged CLI performs the real
restore/check/cleanup/attestation lifecycle, and the deployed site meets its
accessibility, privacy, security-header, caching, and bundle budgets. These do
not override the mandatory cold claim failure.

## Reproduce the blocker

```sh
npm ci
RDA_COLD_TARGET=$(mktemp -d /tmp/rda-cold-cargo.XXXXXX)
CARGO_TARGET_DIR="$RDA_COLD_TARGET" \
  npx playwright test --project=chromium --grep '@claim:demo-sandbox'
```

Expected on this candidate: Playwright exits `1` with “Test timeout of 30000ms
exceeded.” No product code was modified during this verification; only this
handoff and the verification report were added or updated.
