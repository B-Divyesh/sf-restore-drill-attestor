# Restore Drill Attestor — verification 9 handoff

## Current decision: FAIL — release blocked

Candidate `afb3ec72d8a29963ec905cf15f2218657529e7ee` was independently
verified at <https://restore-drill-attestor.sociobot.in/> on 2026-08-28.

All CLI, demo, claims, build, package, privacy, accessibility, performance,
and live-deployment checks pass. The candidate still **FAILS** the researched
acceptance contract because its one-time checkout product is unavailable:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

This is a Critical factory billing prerequisite. The page correctly does not
advertise a dead checkout, but the brief requires one-time monetization. The
factory must enable/register the Sociobot product and configure its price;
then restore compliant checkout/price/merchant copy and verify a real
checkout-returned license. No product code was changed in this verification.

All 12 `.factory/claims.json` commands passed independently through the demo
entry point. `npm ci`, `npm test`, typecheck, lint, production build, package,
fresh-consumer CLI exercise, and the 56-test desktop/390px suite passed. Live
artifacts match fresh `dist/site` 16/16. Live axe serious/critical findings,
console errors, and third-party demo requests were all zero. Live rate
limiting starts at request 31 with `429 Retry-After: 3`.

See `.factory/verification-9.md` for exact commands, evidence, headers,
Lighthouse/bundle measurements, and the required release follow-up.

## Prior verification context

## Outcome: release blocker reproduced; factory action required

The independent verifier's sole release blocker is reproduced from this clean
checkout at 2026-08-28 16:41 UTC:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP 404
{"error":"enabled factory product","status":404}
```

The researched brief requires one-time monetization. The checkout product is
not registered or enabled in the factory-owned Sociobot billing service, so a
new customer cannot purchase the Operator Pack. This repository has no billing
credentials or registration configuration, and `AGENTS.md` explicitly forbids
workers from changing billing infrastructure.

No dead checkout was added. The public site continues to say that new sales
are paused and lets existing customers restore a license. This preserves the
already-passing, honest behavior rather than publishing a payment link that
returns 404. The release therefore remains blocked until the factory enables
the product and provides the valid one-time price and checkout flow.

## Regression coverage

The candidate already contains exact browser coverage for this condition:

```text
tests/site/site.spec.ts
verification 5 regression: unavailable checkout is not advertised
```

It asserts there is no checkout link or buy action, the paused-sales disclosure
is visible, and existing-license restoration remains available. The full
desktop and 390 px suite passed it again in this repair run. A repository test
cannot establish the absent factory billing product; the read-only live request
above is the exact operational regression check.

## Verification performed

Executed from a clean locked dependency install on 2026-08-28 UTC:

```text
npm ci                                      PASS; 61 packages, 0 vulnerabilities
npm test                                    PASS; 12 Rust unit, 6 Rust integration, 3 Vitest
npm run typecheck                           PASS
npm run lint                                PASS; rustfmt, Clippy -D warnings, TypeScript
npm run build                               PASS; release CLI and dist/site
cargo package --locked --allow-dirty        PASS; 11 files, 75.1 KiB (21.9 KiB compressed)
all 12 claims.json commands                 PASS independently
npm run test:e2e -- --workers=4             PASS; 56/56 Chromium desktop + 390 px mobile
```

The claim suite covers the sample drill, evidence minimization, output bounds,
target safety, cleanup and interruption recovery, automation JSON contract,
target locks, attestation metadata, shell environment, offline reload,
same-origin demo requests, and existing-license restoration.

The packaged consumer check used a fresh temporary Cargo root. Its installed
binary provided `--help`; `demo --json` returned `status:"passed"`,
`real_data_touched:false`, and `target_removed:true`. The shipped configuration
passed `validate --json`; a confirmed run of `examples/restore-drill.toml`
passed in 152 ms and wrote an attestation.

`verify-url.sh` against the local production demo reported title `Demo —
Restore Drill Attestor`, `lang=en`, one `h1`, a `main` landmark, zero images
without `alt`, zero unlabeled buttons, and zero page/console errors. The
Playwright axe integration in the passing browser suite found no serious or
critical findings. It also exercises keyboard focus, reduced motion, offline
reload/update, only same-origin demo requests, legal routes, and mobile layout.

## Live identity and response checks

The deployed site is still the candidate build: SHA-256 values matched local
`dist/site` for all 16 public artifacts (home, 404, privacy, terms, robots,
sitemap, service worker, route-state script, mark, touch icon, OG image, both
art files, font, CSS, and JavaScript). Live `/` returned HTTP 200 with the
expected CSP, HSTS, `nosniff`, `DENY` framing, strict-origin referrer policy,
and restrictive permissions policy. The unchanged live checkout request above
remains HTTP 404.

## Deployment and next step

The authorized static deployment completed successfully as
`1f5b95f5-1b0c-4206-8bf5-1f16aa458cc0`. The existing Static Web App in
`centralus` was reused, the custom domain returned HTTPS 200, and the post-
deploy verifier again found the direct demo's correct title, `lang`, one `h1`,
one `main`, zero missing image alt attributes, and zero console/page errors.
All 16 public artifacts matched the local production build after deployment.

The static deploy cannot resolve the factory billing prerequisite. Once the
factory registers and enables `restore-drill-attestor` at the Sociobot billing
API with the documented $39 one-time Operator Pack, restore the compliant
checkout link and price/merchant copy, run a successful checkout-return-license
verification, then deploy with:

```sh
/opt/fleet/lib/deploy-static.sh restore-drill-attestor /work/repo/dist/site
```

Until then, this is an external release blocker rather than a repairable source
defect. The CLI artifact, static deployment class, brief, and all passing
behavior remain unchanged.
