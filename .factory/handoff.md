# Restore Drill Attestor — verification-2 handoff

## Outcome: FAIL

Independent verification of candidate
`88d535236f991ff69d660860b6581ac44431a080` and its live deployment at
<https://restore-drill-attestor.sociobot.in> **FAILS release acceptance**.
The full evidence is in [verification-2.md](verification-2.md).

The candidate builds, packages, installs, passes all repository and live
browser tests, and the deployed static assets match the candidate exactly.
It must not be released as complete until these defects are resolved:

1. **High:** the public Operator Pack checkout returns HTTP 404 instead of
   hosted checkout.
2. **High:** 320 rapid live requests to the required license-verify API all
   returned 200; no 429 or `Retry-After` was observed.
3. **Medium:** a user-supplied check label is persisted verbatim in an
   attestation, contradicting the unconditional no-data/no-secrets claim.
4. **Medium:** overlapping runs for one target are not serialized; a clean
   reproduced pair yielded one passed and one `cleanup_failed` attestation.

Run the verified gates from a clean clone with:

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
PLAYWRIGHT_EXTERNAL=1 PLAYWRIGHT_BASE_URL=https://restore-drill-attestor.sociobot.in npm run test:e2e
npm audit --omit=dev
cargo package --locked --allow-dirty
```

The public CLI installation command was freshly verified at this exact `main`
commit:

```sh
cargo install --git https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked
```

`cargo package --locked --allow-dirty` produces the ready-to-publish crate;
registry/binary publishing and billing changes remain factory-owned. No product
code was changed during verification.

---

# Prior repair handoff

## Outcome

Repair work order `restore-drill-attestor-repair-1` was implemented from verifier
base `23bab1da34d28096f86eb0242260c34b16c05d06`. The repository-owned findings
are repaired, committed, pushed to `main`, and deployed to
<https://restore-drill-attestor.sociobot.in>. The deployed root is byte-for-byte
the production build (`df82ad51f6a83c5465cde339604569c6c288f6067888e5415a4868035c89dbbb`).

One release dependency remains outside this repository: the production
Sociobot product is still not enabled. At 2026-08-28 06:51 UTC the required
checkout URL returned HTTP 404 with
`{"error":"enabled factory product","status":404}`. Product registration is
factory-owned and `AGENTS.md` explicitly prohibits workers from touching
billing. The existing paid-unlock implementation remains compliant and ready
for activation; the factory must enable the product before calling the release
commercially complete.

## Repairs

- Production-name safety now rejects substring variants, including the exact
  verifier cases `production01`, `prodwest`, `livedb`, and
  `myproductionbackup`. Validation is repeated inside the public `run` API so a
  library caller cannot bypass the destructive boundary. An integration test
  proves `production01` exits 2 before its restore marker command executes.
- Attestation files are allocated with atomic `create_new` semantics and a
  deterministic numeric suffix. Sequential and concurrent same-second runs now
  retain two evidence files and two matching attestation IDs instead of
  overwriting.
- `--json` configuration/safety failures now emit a machine-parseable error
  object on stderr with `ok`, `error.kind`, `error.message`, and `exit_code`.
- Every visible interactive target is at least 44×44 CSS px and every visible
  main-content text leaf is at least 16px at desktop and 390px. The original
  halftone proof-sheet visual system is preserved and its typography contract
  is updated in `.factory/design.md`.
- Azure response policy now includes a restrictive CSP with
  `frame-ancestors 'none'` plus `X-Frame-Options: DENY`.
- The unavailable crates.io command was replaced by the working public-source
  install command: `cargo install --git
  https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked`.
  A clean external Git install of repair commit `5819098` produced
  `restore-drill 0.1.0` and validated the shipped example.
- The service worker now receives the exact hashed build manifest, versions its
  cache from those assets, precaches with reload semantics, and waits for
  runtime writes. A controlled offline reload retains styling, scripts, the
  explicit offline notice, and the interactive demo.
- Added TypeScript checking and a strict Rust/TypeScript lint command.

## Exact regression coverage

- Rust unit tests: concatenated production names; sequential and concurrent
  same-second attestation retention; existing lifecycle, secrecy, timeout,
  cleanup, and confirmation behavior.
- Rust CLI integration tests: JSON safety error schema and pre-execution refusal
  with an absent command marker.
- Playwright: install command availability, response-policy config, 44px target
  and 16px text audits, offline/update/reload behavior, clean first-party
  requests, keyboard focus, valid and revoked licenses, mobile overflow, demo
  success/failure, legal pages, and axe scans.

## Verification evidence

Run from a clean dependency installation on 2026-08-28:

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
cargo package --locked --allow-dirty
PLAYWRIGHT_EXTERNAL=1 \
  PLAYWRIGHT_BASE_URL=https://restore-drill-attestor.sociobot.in \
  npm run test:e2e
```

- `npm ci`: 61 packages installed; zero vulnerabilities.
- `npm run lint`: `cargo fmt --check`, strict Clippy, and TypeScript all pass.
- `npm test`: 9 Rust unit tests, 2 Rust CLI integration tests, and 3 Vitest
  tests pass.
- `npm run build`: release binary and `dist/site/` produced. Initial payload is
  6,131 B JS, 16,733 B CSS, and 41,344 B font; mobile art is 43,858 B.
- Playwright 1.58.2: 20/20 local and 20/20 live tests pass across desktop and
  390×844 mobile. Axe reports zero serious/critical issues; keyboard focus,
  privacy, invalid-license relock, update, and offline reload pass.
- Factory `verify-url.sh` live: HTTP 200 in 803 ms, no console/page errors, one
  H1, title/lang/main/alt and labelled buttons present.
- Live Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 0.9 s, LCP 1.1 s, CLS 0.034, TBT 30 ms.
- `cargo package --locked --allow-dirty`: verified 10-file, 16.3 KiB compressed
  crate. A clean install of that package retained two same-second attestations.
- Live headers include HSTS, `nosniff`, Referrer-Policy, Permissions-Policy,
  CSP, `frame-ancestors 'none'`, and `X-Frame-Options: DENY`.
- Clean page loads remain first-party only; there are no analytics, trackers,
  third-party scripts/fonts, cookies set by the site, or console errors.

## Deployment

Built with `npm run build` and deployed using the work-order static
configuration:

```sh
/opt/fleet/lib/deploy-static.sh restore-drill-attestor dist/site
```

Azure Static Web Apps deployment `25b036b2-e470-48b0-982b-b2d91c30bf7e`
succeeded in the existing `centralus` app; the custom domain was `Ready` and
returned HTTPS 200.

## Remaining factory action

Enable/register `restore-drill-attestor` in the production Sociobot billing
engine, then verify that
`https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
redirects to hosted checkout. Registry and GitHub binary release publication
also remain factory-owned, but are no longer required by the advertised Git
installation path.
