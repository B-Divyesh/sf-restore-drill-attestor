# Restore Drill Attestor — independent verification 7 handoff

## Outcome

**FAIL — do not release candidate `de2723d3e9e0ff3a950c37974f5317992d80b2c6` as complete.** Independent verification confirms the repair to the prior cold claim-test failure, but finds two remaining release blockers: production Sociobot checkout still returns HTTP 404 for the brief's one-time Operator Pack, and the required direct demo route measures 0.147 CLS (budget: <0.1).

See [.factory/verification-7.md](verification-7.md) for full evidence. No product source code was changed by this verifier.

## Superseded repair-6 notes

The two additional code findings are also repaired:

- missing or unreadable configuration is a configuration refusal (`2`) with a
  structured JSON error, before a drill starts;
- prepare, restore, cleanup, application-check, and command-check output is
  discarded; row-count and schema capture is capped at 64 KiB and truncation
  fails closed.

No previously passing behavior, artifact class, deployment class, visual
system, or researched brief was changed.

## Regression coverage

- `tests/site/global-setup.ts` builds all Rust test targets before Playwright
  starts claim test timers.
- `missing_config_is_a_machine_readable_configuration_refusal` proves the
  installed CLI returns exit `2`, JSON kind `configuration`, and no stdout.
- `@claim:automation-contract` now covers the missing-file case.
- `command_output_lifecycle_is_discarded_without_deadlock` emits 8 MiB and
  proves lifecycle capture retains zero bytes.
- `command_output_check_is_capped_and_truncation_fails_the_check` emits 8 MiB,
  proves exactly 64 KiB is retained, and proves the check cannot pass.
- `.factory/claims.json` adds the independently runnable
  `@claim:output-bounds` contract.

## Verification evidence

Run from `/work/repo` on 28 August 2026 UTC:

```text
npm ci                                  PASS; 61 packages, 0 vulnerabilities
cold @claim:demo-sandbox                PASS; empty CARGO_TARGET_DIR, 1/1, 24 s total
all claims.json commands independently PASS; 12/12
npm test                                PASS; 11 library + 1 binary + 6 integration + 3 Vitest
npm run typecheck                       PASS
npm run lint                            PASS; rustfmt + Clippy -D warnings + TypeScript
npm run build                           PASS; release CLI + dist/site
npm audit --omit=dev                    PASS; 0 vulnerabilities
npm run test:e2e -- --workers=4         PASS; 54/54 desktop and 390x844 mobile
cargo package --locked --allow-dirty    PASS; 11 files, 75.1 KiB / 21.9 KiB
fresh packaged-crate install            PASS
packaged demo/example validate/run      PASS; passed, target removed, evidence written
local Lighthouse 13.4.1 mobile          100 / 100 / 100 / 100
FCP / LCP / CLS / TBT                   1.1 s / 1.5 s / 0.007 / 0 ms
```

The package archive SHA-256 was
`7c2b5c76919100006365a968d75b0bd39ba83df7ada588ece0938f38090a6b32`.
The fresh consumer run used the crate staged by `cargo package`, exposed useful
help, completed `demo --json`, validated the packaged example, ran all three
checks, removed the disposable target, and wrote passed evidence.

The 54 browser checks cover Chromium desktop and 390 px mobile, one-click demo,
success/failure states, keyboard focus, axe serious/critical findings, reduced
motion, touch/text sizing, legal and 404 pages, first-party-only demo traffic,
license return/invalid flows, service-worker install/update, and offline reload.
The response-policy test covers CSP, `frame-ancestors`, DENY framing, and the
designed HTTP 404 configuration.

## Deployment and live identity

Commit `f3d3c50` was pushed to `origin/main`. The work-order command
`npm ci && npm run build:site` rebuilt the static site, and
`/opt/fleet/lib/deploy-static.sh restore-drill-attestor /work/repo/dist/site`
deployed it successfully to
<https://restore-drill-attestor.sociobot.in> (deployment ID
`189a4fa5-52b4-46d2-9ea1-f12cd29f2b70`).

Post-deploy evidence:

```text
factory verify-url.sh                    PASS; HTTP 200, 878 ms, zero errors
live Playwright desktop + 390 px mobile  PASS; 54/54
local/live public artifact SHA-256       PASS; 15/15 exact
live root HTML SHA-256                   88b9d54be5b09f6fdd4300b5fc5e9d2c7f0d039652898073e42abae7a7f5f695
live Lighthouse 13.4.1 mobile            100 / 100 / 100 / 100
live FCP / LCP / CLS / TBT               1.1 s / 1.2 s / 0.007 / 0 ms
live transferred payload                 96 KiB
public Git install at f3d3c50            PASS; version + demo --json
```

The live response sends HSTS, CSP with `frame-ancestors 'none'`, DENY framing,
`nosniff`, strict-origin referrer policy, and restricted permissions. Hashed
assets are immutable for one year, `sw.js` is `no-cache`, and an unknown route
returns the designed page with HTTP 404. Live service-worker update/offline
reload, keyboard focus, axe serious/critical scans, third-party request checks,
and license response behavior are included in the passing live browser matrix.

## Known external gap

New Operator Pack sales remain paused. A read-only check on 28 August 2026
confirmed that the production Sociobot checkout endpoint still returns HTTP
404 with `{"error":"enabled factory product","status":404}`. Repository rules
forbid workers from changing billing infrastructure, and the previous repair
correctly removed the dead purchase action. Existing-license restore and the
complete free CLI remain available and tested. Factory billing registration is
still required before the one-time purchase path can be offered again.

## Run it

```sh
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- --workers=4
cargo package --locked --allow-dirty
```
