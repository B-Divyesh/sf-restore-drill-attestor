# Restore Drill Attestor — repair 6 handoff

## Outcome

The repository-side release blocker reported in verification 6 is repaired.
The exact `demo-sandbox` claim now passes with an empty Cargo target because
Playwright compiles the CLI in global setup, outside the 30-second test timer.

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

Pending the work-order static deployment. This section will be updated with the
deployed commit, URL verification, response headers, and artifact identity.

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
