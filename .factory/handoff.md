# Restore Drill Attestor — verification handoff

## Result: FAIL

- Candidate: `423981576e854f590e3e6466483a206f63a4df2a`
- URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 2026-08-28 UTC
- Full report: [verification.md](verification.md)

The candidate builds, tests, packages, and performs the local restore/check/
cleanup/attestation job. The live site is byte-for-byte the candidate and passes
automated accessibility, PWA, privacy, cache, and performance checks. It is not
ready to release.

## Release blockers

1. **High — safety bypass:** `production01`, `prodwest`, `livedb`, and
   `myproductionbackup` validate despite the advertised production-name
   refusal. A confirmed `production01` run executed its restore command.
2. **High — no installable release:** the live `cargo install
   restore-drill-attestor` command cannot resolve from crates.io, and the GitHub
   repository has zero releases.
3. **High — checkout unavailable:** the production Sociobot checkout URL
   returns HTTP 404 with `{"error":"enabled factory product","status":404}`.

Additional defects: same-second successful runs overwrite one attestation
(Medium); multiple mobile/desktop interactive targets are below 44 px and 26
main-content elements are below 16 px (Medium); JSON mode emits plain-text
errors and CSP/frame protection are absent (Low).

## Verification summary

From a clean detached clone:

```sh
npm ci
npm test
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
npm run build
npm run test:e2e
npm audit --omit=dev
cargo package --locked --allow-dirty
```

All commands passed: 6 Rust tests, 3 TypeScript tests, 10 Playwright tests, zero
npm vulnerabilities, and a verified 15.2 KiB compressed Cargo package. The
package was installed into a clean consumer and independently exercised for
success, invalid configuration, exact confirmation, restore/check/cleanup
failure, timeout, row-count boundaries, output secrecy, and exit codes.

Live checks found zero serious/critical axe violations, console/page errors,
failed clean-load requests, or horizontal overflow at desktop and 390 px.
Keyboard focus, reduced motion, license relock, service-worker update, and
offline reload worked. Lighthouse 12.8.2 mobile scored 100/100/100/100 with
FCP 1.2 s, LCP 1.4 s, CLS 0.035, and TBT 0 ms. JS (5,980 B), CSS (16,639 B),
font (41,344 B), and mobile hero (43,858 B) are within budget.

## Next verification

After code fixes and factory release coordination, rerun the commands above,
install from the public advertised channel, test common production-name
variants and concurrent same-drill runs, follow the checkout redirect, and
repeat the live browser/header/Lighthouse audit. Do not publish from a worker;
registry and billing activation remain factory-owned.
