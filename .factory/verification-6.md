# Independent product verification 6 — FAIL

- Work order: `restore-drill-attestor-verify-6`
- Candidate: `3588168272cc5a556c03b18de358c07aba92b02b`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 28 August 2026 UTC
- Result: **FAIL — a required claim test fails from a cold build.**

No product code was changed during verification. The candidate and live site
otherwise work end to end, but the acceptance contract makes any failing
`.factory/claims.json` command release-blocking.

## First-read and demo gate — PASS

The cold first viewport answers all three required questions:

- **What:** “Prove your database backup restores.”
- **For whom:** “For indie SaaS operators and small platform teams who need
  repeatable recovery evidence without retaining restored data.”
- **What to click:** “Try it with sample data,” followed by “It runs a
  four-stage sample and shows the evidence.”

One click enters `/?demo=1#demo`, shows the persistent “Demo — sample data,
nothing is saved to your work” banner with Reset demo and Start for real, runs
the four stages, and reaches `PASSED`. This was observed at desktop size and at
390×844. The page has an identifiable, product-specific halftone proof-press
design rather than a generic framework layout.

## Defects by severity

### High — required demo claim times out on a clean Cargo build

After `npm ci`, the exact declared command fails when the Rust build cache is
fresh:

```text
CARGO_TARGET_DIR=<new empty directory> \
  npx playwright test --project=chromium --grep '@claim:demo-sandbox'

Test timeout of 30000ms exceeded.
1 failed
```

This was reproduced twice with separate empty target directories. The second
trace is at
`/tmp/rda-claim-cold-results/site--claim-demo-sandbox-b-f95e3-eans-up-and-prints-evidence-chromium/trace.zip`.
An uncached invocation of the same demo path completed successfully in **30.103
seconds**, just beyond the test's 30-second timeout. The test passes in 4.3
seconds only after compilation has warmed the cache. Clean-clone claim tests
must not rely on build-cache warmth; build the CLI before the timed assertion
or give this claim a timeout that includes clean compilation.

### Medium — unreadable config is misclassified as a drill failure

The README says exit `2` means configuration/safety refusal and exit `3` means
a restore or check failure. The installed packaged CLI instead reports an
unreadable config as exit `3` before any drill starts:

```text
$ restore-drill validate --config /tmp/rda-file-that-does-not-exist.toml --json
exit 3
{"error":{"kind":"io","message":"could not read ..."},"exit_code":3,"ok":false}
```

This makes an automation caller treat a setup/input problem as a failed
restore. The broad `automation-contract` claim test covers production-looking
configuration, restore failure, and cleanup failure, but not missing or
unreadable configuration. Exact-confirmation refusal was independently checked
and correctly returned `2` without running commands.

### Medium — the researched one-time purchase is unavailable

The researched brief specifies one-time monetization. The live site now states
“New licenses are not currently offered” and exposes no checkout link. This is
honest and avoids the previously broken checkout, and the complete CLI remains
free, but the one-time commercial path in the brief is still not delivered.
The handoff explains that billing registration is outside this repository.

### Low — command stdout is buffered without a size limit

`run_command` pipes every prepare, restore, check, and cleanup command's stdout
into an unbounded `Vec<u8>`, even though only row-count and schema checks need
output. A noisy real restore can consume memory until the process is killed;
that failure mode cannot write evidence or guarantee cleanup. The current
regression exercises only 256 KiB. Discard output for lifecycle commands and
cap output retained for checks.

## Required claims

The untouched clone initially cannot import `@playwright/test`, as expected
before dependency installation. `npm ci` installed the lockfile successfully
(61 packages, zero vulnerabilities). From that installed clean checkout, every
manifest command was run independently. Each ID occurs exactly once as an
`@claim:<id>` tag.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-sandbox` | **FAIL cold** | Two clean Cargo targets hit Playwright's 30 s timeout; warm rerun passed 1/1 |
| `evidence-minimization` | PASS | 1/1 |
| `target-safety` | PASS | 1/1 |
| `cleanup-recovery` | PASS | 1/1 |
| `automation-contract` | PASS as written | 1/1; missing-config gap described above |
| `target-lock` | PASS | 1/1 |
| `attestation-metadata` | PASS | 1/1 |
| `shell-environment` | PASS | 1/1 |
| `offline-reload` | PASS | 1/1 |
| `site-local-only` | PASS | 1/1 |
| `operator-pack` | PASS with mocked valid response | 1/1 |

The landing page and README claims map to the manifest. No stale broad “no
upload” promise remains; the privacy copy correctly says configured commands
retain the operator account's file and network access.

## Repository and packaged CLI verification

```text
npm ci                                  PASS; 61 packages, 0 vulnerabilities
npm test                                PASS; 11 Rust unit, 5 CLI integration, 3 Vitest
npm run typecheck                       PASS
npm run lint                            PASS; rustfmt, Clippy -D warnings, TypeScript
npm run build                           PASS; release binary and dist/site
npm audit --omit=dev                    PASS; 0 vulnerabilities
npm run test:e2e -- --workers=4         PASS; 52/52 local desktop/mobile
cargo package --locked --allow-dirty    PASS; 11 files, 72.6 KiB / 21.2 KiB compressed
```

The crate was installed from the generated package into a new consumer root.
Its `--help` is useful, and `demo --json` returned `status:"passed"`,
`target_removed:true`, and `real_data_touched:false`. The packaged example
validated and ran with row-count `min=max=1`, schema, and application checks;
it wrote schema-v2 evidence and removed the temporary target. Evidence contains
neutral check ordinals, durations, a SHA-256 configuration fingerprint, and no
sample values, commands, output, or labels.

The integration suite independently passed restore failure, check failure,
timeout, SIGTERM command-tree termination, cleanup after failure, lock retention
through evidence writing, same-target contention, and distinct-target
concurrency. Wrong confirmation returned `2`, emitted parseable JSON on stderr,
created no evidence, and caused no command side effect.

## Live deployment, accessibility, privacy, and policy

- **Candidate identity:** SHA-256 matched for all 15 deployable public files:
  HTML routes, JS, CSS, font, artwork, icons, metadata files, and service worker.
- **Live browser matrix:** 52/52 passed against the public URL on desktop and
  390×844, including demo success/failure, legal routes, license behavior,
  offline state, and service-worker install/update/offline reload.
- **Accessibility:** live axe checks found zero serious/critical findings on
  home, 404, privacy, and terms at both sizes. The site has `lang=en`, one `h1`,
  one `main`, useful alt text, labelled controls, a skip link, ≥44 px controls,
  and a visible 3 px focus outline plus contrasting ring. Keyboard Enter/Space
  paths passed. Reduced motion shortened transitions to effectively zero.
- **Console and layout:** the factory `verify-url.sh` loaded in 1,004 ms with
  no console/page errors, one `h1`, one `main`, and no missing alt text. Mobile
  had no horizontal overflow.
- **Privacy/network:** the complete clean demo flow requested only the current
  origin. No analytics, tracker, CDN font/script, embedded secret, Azure model
  endpoint, or sign-in surface exists. License verification is the sole
  intentional cross-origin runtime call and is disclosed on `/privacy/`.
- **Headers:** HSTS, `nosniff`, DENY framing, strict-origin referrer policy,
  restricted permissions, and a restrictive CSP are live. HTML revalidates at
  30 seconds, hashed assets are immutable for one year, and `sw.js` is
  `no-cache`. Unknown routes return the designed page with HTTP 404.
- **License endpoint:** invalid verification returned HTTP 200,
  `valid:false`, `Cache-Control: no-store`, and the expected origin-specific
  CORS header. A fresh 80-request parallel burst accepted 30 and rate-limited
  50; 429 responses included `Retry-After` (observed value `0`) and
  `X-RateLimit-After`. No sign-in exists, so Entra tenant validation is not
  applicable.
- **Links:** all landing targets and the GitHub source link resolved with HTTP
  200.

## Performance and bundle budgets

Fresh live mobile Lighthouse 13.4.1:

```text
Performance / Accessibility / Best practices / SEO  97 / 100 / 100 / 100
FCP / LCP / CLS / TBT                               1.08 s / 1.38 s / 0.0074 / 202.5 ms
Transferred                                          96 KiB
```

Production assets are 6,879 B JavaScript (2.95 KiB gzip), 17,638 B CSS (4.48
KiB gzip), 41,344 B font, 43,858 B mobile artwork, and 146,742 B desktop
artwork. They are within the stated budgets.

## Acceptance decision

**FAIL. Do not release candidate `3588168`.** The clean-cache
`demo-sandbox` claim test is mandatory and reproducibly fails. After repairing
that gate, align unreadable-config exit behavior with the documented automation
contract and decide whether release acceptance requires restoring the brief's
one-time purchase path.
