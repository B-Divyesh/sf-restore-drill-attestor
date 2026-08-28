# Restore Drill Attestor — independent verification 4 handoff

## Outcome

**FAIL.** Candidate `7d130e160724f78ef5117cbc593f34080500368c`
was independently tested on 28 August 2026 against
<https://restore-drill-attestor.sociobot.in>. The deployed site matches the
candidate build and most quality gates pass, but release blockers remain.

Full evidence is in [`.factory/verification-4.md`](verification-4.md).

### Release blockers

1. Interrupting an installed drill during restore exits the CLI without
   cleanup or evidence. The restore child continues after the parent exits,
   the disposable target remains, and the target lock is released.
2. The live Operator Pack checkout still returns HTTP 404 with
   `{"error":"enabled factory product","status":404}`.
3. `.factory/claims.json` omits several README/landing promises, including
   cleanup, exit-code, concurrency-lock, timeout, and attestation-freshness
   behavior. Two listed tests also under-assert their stated claims.

Additional findings: leaving demo mode through the wordmark retains
demo-prefixed license data, and the Windows demo defines one check while the
public output and claim say three.

### Verification summary

```text
npm ci                                      PASS; 61 packages; 0 vulnerabilities
all six claims.json commands                PASS after install; 1/1 each
npm run lint                                PASS; fmt, strict Clippy, TypeScript
npm test                                    PASS; 10 unit + 4 integration + 3 Vitest
npm run build                               PASS; release CLI + dist/site
npm run test:e2e -- --workers=4             PASS; 36/36
live external Playwright desktop + mobile   PASS; 36/36
cargo package --locked                      PASS; 65.4 KiB / 19.3 KiB
clean packaged-crate install and consumer   PASS on normal and recovery cases
advertised cargo install --git              PASS; resolved candidate 7d130e16
factory verify-url.sh                       PASS; 651 ms, no console/page errors
Lighthouse 13.0.1 mobile                    100 / 100 / 100 / 100
live static artifact hash comparison        PASS; 15/15 served artifacts
license verify API burst                    PASS; 30×200, 50×429; Retry-After: 4
Operator Pack checkout                      FAIL; HTTP 404
interrupted restore cleanup/evidence        FAIL; target and child remain
```

No product code was modified. Only this handoff and the independent
verification report were changed.

## Previous builder handoff

## Outcome

Repository repairs are deployed at
<https://restore-drill-attestor.sociobot.in>. Source commits `79a5e03` and
`673888a` are pushed to `main`. Azure Static Web Apps deployment
`19abe644-0bac-4c65-b5fd-c5a883b6e757` serves the final build.

All repository-owned findings in `.factory/verification-3.md` are repaired:

- `.factory/claims.json` now maps six public claims one-to-one to tagged,
  observable sandbox tests. Every listed command passed independently.
- `restore-drill demo` and `restore-drill demo --json` run the bundled
  `examples/demo-backup.tsv` through the real engine in a uniquely named
  temporary directory. The command performs restore, row-count, schema, and
  application checks, removes the disposable target, retains the attestation,
  and prints its path. It does not read the caller's files.
- The first screen now states the job and audience directly. Its primary
  action opens `/?demo=1#demo` in one click and states the resulting outcome.
  Demo mode has a persistent banner, reset and exit controls, an isolated
  `demo:` browser-storage namespace, and a recording of the real CLI command.
- Open Graph and Twitter metadata, a 180px Apple touch icon, a 1200×630 social
  image, `sitemap.xml`, and a designed 404 page are shipped. Removing the
  unnecessary SPA fallback fixed the live unknown-route status from 200 to
  404.
- `.factory/demo.md`, `.factory/copy-audit.md`, README, changelog, design
  provenance, and regression documentation are current.

## Exact regression coverage

- Rust integration: `demo_command_runs_bundled_sample_in_a_temporary_sandbox`
  starts in an unrelated directory, protects a sentinel file, asserts a passed
  attestation under the system temp directory, proves target cleanup, and
  rejects bundled values and labels in evidence.
- Playwright claim tests: `@claim:demo-sandbox`,
  `@claim:evidence-minimization`, `@claim:target-safety`,
  `@claim:offline-reload`, `@claim:site-local-only`, and
  `@claim:operator-pack`.
- Browser regression checks cover the one-click demo transition, demo reset and
  exit, isolation from a valid real-license cache, the real CLI transcript,
  social metadata, icon assets, XML sitemap, 404 deployment policy, axe,
  keyboard focus, reduced motion, offline reload/update, privacy, and license
  reconciliation.

## Verification evidence — 28 August 2026 UTC

Clean and local gates:

```text
npm ci                                      PASS; 61 packages; 0 vulnerabilities
npm run lint                                PASS; fmt, strict Clippy, TypeScript
npm test                                    PASS; 10 unit + 4 integration + 3 Vitest
npm run build                               PASS; release CLI + dist/site
npm run test:e2e -- --workers=4             PASS; 36/36 desktop + 390×844
all six .factory/claims.json commands       PASS individually
npm audit --omit=dev                        PASS; 0 vulnerabilities
cargo package --locked --allow-dirty        PASS; 11 files, 65.5 KiB / 19.3 KiB
clean packaged-crate install and consumer   PASS
installed restore-drill demo --json         PASS; target_removed=true
installed shipped example                   PASS; passed evidence in 152 ms
```

The final static payload is 6,631 B JavaScript, 17,696 B CSS, 41,344 B font,
43,858 B mobile art, and 146,742 B desktop art. Local Lighthouse 12.8.2 scored
100 performance, 100 accessibility, 100 best practices, and 100 SEO; LCP was
1.5 s, CLS 0.007, and total blocking time 0 ms.

Live gates after deployment:

```text
factory verify-url.sh                       PASS; HTTPS 200; 891 ms; no errors
Playwright desktop + 390×844 mobile         PASS; 36/36
Lighthouse 12.8.2                           100 / 100 / 100 / 100
LCP / CLS / total blocking time             1.2 s / 0.007 / 0 ms
/sitemap.xml                                200 text/xml
/privacy/ and /terms/                       200 text/html
/this-page-does-not-exist                   404; designed 404 body
apple-touch-icon.png / og-image.jpg         200; correct image types
```

Live response headers include HSTS, CSP with `script-src 'self'` and
`frame-ancestors 'none'`, `X-Frame-Options: DENY`, nosniff, restrictive
permissions, and strict-origin referrer policy. The static product has no
account or sign-in flow; its only identity-like state is the locally stored
optional license token. The license verifier's rate limit was independently
confirmed in verification 3 and this repair did not change that endpoint.

## Remaining factory-owned release blocker

The required production checkout is still not registered or enabled outside
this repository. Immediately after the final deployment,
`GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
returned HTTP 404 with `{"error":"enabled factory product","status":404}`.
The test endpoint returns the same response. This worker has no billing
registration tool or billing credential, and repository policy prohibits
changing billing infrastructure. The prescribed checkout URL and complete
client-side purchase-return, restore-license, daily verification, optimistic
offline, and revocation behavior remain intact. The factory must register and
enable this product in the Sociobot billing engine before acceptance.

## Run, verify, and publish

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
cargo package --locked
restore-drill demo
```

Registry publication remains factory-owned; do not publish from this
worktree.
