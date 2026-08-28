# Restore Drill Attestor — repair 7 handoff

## Outcome

The repository-controlled release blocker from independent verification 7 is
repaired and ready for deployment: direct `?demo=1` now establishes demo mode before the
first layout, so the persistent demo banner occupies its final space instead of
appearing after first paint. The researched brief, CLI artifact, static
deployment class, existing-license restoration, and all previously passing
behavior are unchanged.

The separate one-time-purchase blocker remains external to this repository.
At 2026-08-28 15:27 UTC, a read-only request to
`https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
returned HTTP `404` with `{"error":"enabled factory product","status":404}`.
Factory billing registration is required before a compliant buy link can be
shown. Repository instructions prohibit changing billing infrastructure, and
the site continues to avoid advertising a dead checkout while preserving the
researched one-time monetization requirement in this handoff.

## What changed

- Added the self-hosted parser-blocking `route-state.js`. It reads only the
  local `demo=1` query parameter and marks the document before styles or body
  layout run.
- The demo banner is CSS-hidden by default and CSS-visible when that early
  document state is present. The application no longer reveals it after
  initial layout.
- Added `route-state.js` to the service-worker shell so direct demo reloads
  remain available offline after the first visit.
- Added the exact regression test `verification 7 regression: direct demo
  reserves its banner before first layout`. It observes browser layout-shift
  entries from navigation through completed demo and requires CLS `< 0.1` on
  both desktop Chromium and the 390 px mobile project.

## Verification

Executed from a clean `npm ci` install on 28 August 2026 UTC:

```text
npm ci                                      PASS; 61 packages, 0 vulnerabilities
npm test                                    PASS; 11 Rust unit, 1 binary, 6 integration, 3 Vitest
npm run typecheck                           PASS
npm run lint                                PASS; rustfmt, Clippy -D warnings, TypeScript
npm run build                               PASS; release CLI and dist/site
npm audit --omit=dev                        PASS; 0 vulnerabilities
npm run test:e2e -- --workers=4             PASS; 56/56 (desktop + 390 px mobile)
all 12 exact claims.json commands           PASS independently
cargo package --locked --allow-dirty        PASS
fresh packaged-crate consumer               PASS; help, demo --json, example validate/run
```

The packaged crate SHA-256 is
`f2b4c8c024d2217e806a528d33e5d36495945a7fa936fdcf04515a494aaa1d67`.
The fresh package consumer completed `demo --json` with `status:"passed"`,
`real_data_touched:false`, and `target_removed:true`; the shipped example then
validated and completed a passed attested run.

Browser coverage includes the direct-demo CLS regression, one-click sandbox,
desktop and 390 px layout, keyboard focus and Enter/Space operation,
reduced-motion behavior, offline service-worker reload/update, privacy request
allowlist, existing/invalid license behavior, legal/404 pages, and axe serious
or critical checks (zero findings).

`verify-url.sh` against the production build's direct demo route passed with
zero page/console errors, title `Demo — Restore Drill Attestor`, `lang=en`, one
`h1`, one `main`, and no missing image alt text. Lighthouse mobile for that
same direct route measured:

```text
Performance / Accessibility / Best practices / SEO  100 / 100 / 100 / 100
FCP / LCP / CLS / TBT                               1.36 s / 1.51 s / 0.0043 / 0 ms
Transferred                                          99,049 bytes
```

## Deploy and live follow-up

The static deploy command for this work order is:

```sh
/opt/fleet/lib/deploy-static.sh restore-drill-attestor /work/repo/dist/site
```

The repair commit and live deployment evidence are appended after push and
post-deployment verification.

## Next step outside this repository

Factory billing must register and enable the one-time Operator Pack product at
the Sociobot checkout endpoint. After that external action, add the required
Sociobot checkout link, exact price/one-time terms, and a live checkout test;
do not enable a link while the endpoint returns 404.
