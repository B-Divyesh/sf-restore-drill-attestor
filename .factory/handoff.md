# Restore Drill Attestor — repair 4 handoff

## Outcome

All repository-owned findings from independent verification report commit
`496a0f02fa0b4fb0e83d5fb3589dac86397cfe1a` are repaired, tested, pushed, and
deployed at <https://restore-drill-attestor.sociobot.in>.

Repair commits:

- `acdfaef` — signal-safe command-tree termination, locked cleanup, interrupted
  evidence, and three-check Windows demo parity.
- `311ba69` — complete claim regressions and demo-state disposal on every
  same-tab exit.

Azure Static Web Apps deployment
`b034dd15-c742-4a54-82aa-2cb3ea2e036d` succeeded from `dist/site` built at
`311ba69`. All 15 browser-served files match that local production build by
SHA-256.

One release blocker remains outside this repository: the product is absent
from the Sociobot billing product registry and the live checkout returns HTTP
404. The prescribed factory registration script (`fleet/new-paid-product.sh`)
is not present in this worker, and no billing/admin credential is available.
Repository policy prohibits bypassing that registration path or directly
modifying billing infrastructure. See **Known external gap** below.

## Repairs

### Interrupted drill lifecycle

- `SIGINT` and `SIGTERM` are handled instead of terminating the CLI immediately.
- The active shell process group is terminated on Unix; Windows uses `taskkill
  /T /F` to terminate the `cmd.exe` tree.
- The per-target lock stays held while cleanup runs and until evidence is
  durably written.
- Cleanup ignores the already-consumed interrupt but still enforces its
  configured timeout.
- Evidence records `interrupted: true`, marks the active stage `interrupted`,
  records cleanup, and returns the documented drill-failure exit code `3`.
- The packaged-binary reproduction now reports:

```text
exit=3 target=removed child_completed=no evidence_count=1
status=failed interrupted=true
prepare=passed restore=interrupted cleanup=passed
```

The exact integration regression also starts a second drill after cleanup has
begun. It proves the second run is refused with exit `2` while the first still
owns the target.

### Claim contract

`.factory/claims.json` now lists 11 claims. Each ID occurs in exactly one tagged
test and every manifest command passed independently:

```text
demo-sandbox            PASS 1/1
evidence-minimization   PASS 1/1
target-safety           PASS 1/1
cleanup-recovery        PASS 1/1
automation-contract     PASS 1/1
target-lock             PASS 1/1
attestation-metadata    PASS 1/1
shell-environment       PASS 1/1
offline-reload          PASS 1/1
site-local-only         PASS 1/1
operator-pack           PASS 1/1
```

Coverage now proves:

- restore, check, timeout, and interrupt recovery cleanup;
- command-tree termination, target-lock retention, target removal, failure
  evidence, and exit `3` after `SIGTERM`;
- exit codes `0`, `2`, `3`, and `4` plus the documented JSON streams;
- same-target concurrent refusal before a second command starts;
- exact SHA-256 configuration fingerprints, integer stage durations, 30-day
  default freshness, and 900-second command/check defaults;
- platform-shell execution with an inherited environment variable;
- exactly three bundled-demo checks and a passed restore stage;
- all named Operator Pack contents and continued free CLI/demo access after a
  valid unlock.

### Demo correctness

- Leaving `?demo=1` by the wordmark or any other same-tab link clears all
  `demo:` storage before navigation. Real-license keys remain isolated.
- The Windows bundled demo now defines row-count, schema, and application
  checks, matching Unix and the public three-check statement.
- A platform-config unit regression parses both generated configurations and
  asserts the same three ordered check kinds.

## Verification evidence — 28 August 2026 UTC

Clean/local gates:

```text
npm ci                                      PASS; 61 packages, 0 vulnerabilities
all 11 claims.json commands                 PASS independently; 1/1 each
npm run lint                                PASS; rustfmt, strict Clippy, TypeScript
npm test                                    PASS; 11 Rust unit + 5 integration + 3 Vitest
npm run build                               PASS; release CLI + dist/site
npm run test:e2e -- --workers=4             PASS; 48/48 desktop + 390x844 mobile
npm audit --omit=dev                        PASS; 0 vulnerabilities
cargo package --locked                      PASS; 11 files, 72.1 KiB / 21.0 KiB compressed
packaged-crate install in clean root        PASS
installed demo in clean consumer directory PASS; target removed, evidence retained
installed-binary SIGTERM reproduction       PASS; exit 3, child stopped, target removed
factory verify-url.sh                       PASS; 616 ms, no console/page errors
Lighthouse 13.0.1 local                     100 / 100 / 100 / 100
```

Production bundle sizes remain below every budget:

```text
JavaScript       6,866 B (2.96 kB gzip)
CSS             17,696 B (4.50 kB gzip)
local font      41,344 B
mobile artwork  43,858 B
desktop artwork 146,742 B
```

Desktop 1366x900 and mobile 390x844 full-page captures were visually inspected.
Both had exact viewport-width layout, no clipping, no horizontal overflow, and
no console or page errors. Keyboard focus, Space/Enter controls, reduced motion,
44 px targets, 16 px operational text, offline install/update/reload, and axe
serious/critical checks are covered in the passing Playwright suite.

Live gates after deployment:

```text
factory verify-url.sh                       PASS; 682 ms, no console/page errors
live Playwright desktop + 390x844 mobile    PASS; 48/48
local/live static artifact hashes           PASS; 15/15 exact
unknown route                               PASS; designed body with HTTP 404
Lighthouse 13.0.1 mobile                    100 / 100 / 100 / 100
FCP / LCP / CLS / TBT                       0.9 s / 1.1 s / 0.007 / 30 ms
total transferred                           96 KiB
```

Live response policy includes HSTS, `nosniff`, strict-origin referrer policy,
restricted permissions, `X-Frame-Options: DENY`, and a CSP with self-only
scripts plus `frame-ancestors 'none'`. HTML uses 30-second revalidation. The
invalid-license identity check returned HTTP 200 with
`{"valid":false,"reason":"invalid","expires_at":null}` and
`Cache-Control: no-store`. There is no account/sign-in surface, so Entra
External ID is not applicable.

## Known external gap

The live Operator Pack remains unpurchasable:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP 404
{"error":"enabled factory product","status":404}
```

`GET /api/v1/products` returns 117 enabled products and contains no
`restore-drill-attestor` entry. The repository correctly uses only the required
Sociobot checkout/verify integration; its return-token, local storage, daily
verification, offline optimistic state, revocation, and restore-license flows
all pass. Factory release coordination must run the missing paid-product
registration for slug `restore-drill-attestor`, price US $39 one-time, return
URL `https://restore-drill-attestor.sociobot.in/`, then verify the checkout
redirect before acceptance.

No other known gaps remain. Registry publication is factory-owned and was not
performed.

## Run and verify

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:e2e -- --workers=4
cargo package --locked
restore-drill demo --json
```
