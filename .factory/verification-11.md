# Restore Drill Attestor — repair 10 verification

**Decision: BLOCKED — factory billing registration is still required.**

Verified on 2026-09-06 UTC against
<https://restore-drill-attestor.sociobot.in/>.

- Runtime implementation SHA: `658e2b4f3c774f68c30061c91f3c4654ef279b37`
- Documentation/review baseline SHA: `38f3de920ae63a4a158d4fca45bcbea8a7e61fe9`

The implementation is unchanged from the last runtime candidate. Later commits
up to the review baseline are report-only. A fresh production build matched all
16 public live files byte-for-byte; the deployment-only
`staticwebapp.config.json` returned the expected HTTP 404.

## Current blocker

The required one-time checkout is still not registered at the factory billing
API:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

This is the reproduced cause of the release block. It is not writable from
this product repository. The page deliberately does not advertise a dead buy
link, while its existing-license restore and verification path remain working.

The registration packet is at `/work/.evidence/billing-offer.json`. It records
the actual historical live offer: **Operator Pack, US $39 (3,900 USD minor
units), one-time**, at the exact product origin. It includes the required
return URL, validation path, merchant, and the three paid deliverables. The
US $39 evidence is in the earlier independent live reports
`verification-2.md`, `verification-3.md`, and `verification-4.md`; it is not
an inferred replacement price.

Factory must enable `restore-drill-attestor`, set that one-time price, preserve
the return URL, then have the product restore the hosted checkout link and
merchant/price disclosure. A real checkout must return `?license=<token>` and
be verified before release. A redirect alone is not entitlement proof.

## Current first-read and demo result

Fresh desktop and phone browser contexts loaded the live page before scrolling:

- Job: **“Prove your database backup restores.”**
- Audience: indie SaaS operators and small platform teams.
- First action: **“Try it with sample data.”**

Both contexts completed the sample to `PASSED`, showed the persistent
“Demo — sample data, nothing is saved to your work” banner with reset and exit
controls, and kept a seeded non-demo license value unchanged. Complete demo
request logs were same-origin and console/page error lists were empty. Evidence
screenshots are `/work/.evidence/live-desktop-demo.png` and
`/work/.evidence/live-phone-demo.png`.

## Repository gates

From the documented clean setup:

```text
npm ci                                      PASS (61 packages, 0 vulnerabilities)
12 exact commands in .factory/claims.json  PASS (one outcome test each)
npm test                                    PASS (12 Rust + 6 integration + 3 Vitest)
npm run typecheck                           PASS
npm run lint                                PASS
npm run build                               PASS (release CLI and dist/site)
npm run test:e2e -- --workers=2             PASS (56/56)
cargo package --locked --allow-dirty        PASS (11 files, 75.1 KiB / 21.9 KiB)
```

The package was unpacked and installed into a fresh consumer root. Its installed
binary passed `--help`, `demo --json`, `validate --json`, and a confirmed
`run --json`; the sample returned `passed`, removed its target, and wrote an
attestation in 153 ms.

`/opt/fleet/lib/verify-url.sh` passed on the live page (724 ms, no console
errors, title/lang/main/alt present). The standalone `@axe-core/cli` could not
start Selenium Chrome in this container even with the installed headless binary.
The pinned Playwright axe integration therefore audited the live 390 px page
with zero violations, including zero serious or critical findings.

## Earlier findings

All earlier repository-controlled findings remain covered and currently pass:
production-like target refusal; collision-safe attestations; neutral evidence
labels; per-target locking; bounded command output; SIGTERM child-tree cleanup
and evidence; JSON configuration errors; one-click sandbox/reset isolation;
claim coverage; metadata/404/security headers; mobile control/text baselines;
offline reload; and demo-banner CLS reservation. The factory API rate-limit
repair had already passed the previous verifier. The sole open issue is the
factory checkout registration above.
