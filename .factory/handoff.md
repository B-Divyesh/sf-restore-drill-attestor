# Restore Drill Attestor — build handoff

## Shipped

- Rust 0.1.0 single-binary CLI (`restore-drill`) with useful `--help`, stable
  exit codes, JSON automation output, TOML validation, exact destructive-target
  acknowledgement, and refusal of non-isolated or production-named targets.
- Restore lifecycle with optional prepare, required restore, declarative
  row-count/schema/application/command checks, process timeouts, process-group
  termination on Unix, and cleanup after both success and ordinary drill failure.
- Timestamped JSON attestations with configuration hash, freshness date,
  outcomes, and durations. Commands, stdout, stderr, returned counts, schema
  values, and secrets are excluded.
- Safe runnable example, MIT license, README/API usage, changelog, and a small
  ready-to-publish Cargo package.
- Responsive static product/docs site in the required halftone proof-press
  direction, including an interactive success/failure demonstration, explicit
  offline state, service-worker cache, `/privacy/`, `/terms/`, and a one-time
  $39 Operator Pack using the Sociobot buy/verify/restore-license contract.
- Original `factory-image` hero artwork with prompt/deployment metadata in
  `.factory/art/`; shipped WebP variants are 146,742 bytes desktop and 43,858
  bytes mobile.

## Build and verification

From a clean clone:

```sh
npm ci
npm test
npm run build
npm run test:e2e
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo package
```

`npm run build` is the work-order build command. It produces the release binary
at `target/release/restore-drill` and the deployable static root at `dist/site/`
with `dist/site/index.html`.

Verified locally on 2026-08-28:

- `npm test`: 6 Rust tests + 3 TypeScript tests passed.
- Playwright 1.58.2: 10/10 desktop and 390×844 touch-viewport tests passed.
  Coverage includes demo success/failure, cleanup evidence, offline notice,
  license return/verification, mobile overflow, and both legal pages.
- Axe 4.10.2: zero serious or critical findings on product, privacy, and terms.
- Factory `verify-url.sh`: HTTP 200; no console/page errors; one H1; title,
  `lang`, main landmark, image alt, and labelled buttons present. Local measured
  load was 617 ms.
- Lighthouse 12.8.2 mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.1 s, LCP 1.5 s, CLS 0.035, TBT 0 ms.
- Production payload: 5,980 B JS, 16,639 B CSS, 41,344 B font, 146,742 B hero
  (desktop). All are below the product budgets.
- `npm audit`: 0 vulnerabilities.
- `cargo package --allow-dirty --no-verify`: 10 files, 15.2 KiB compressed.
- Real example drill completed and wrote a passing, data-free attestation.

## Known gaps and release notes

- The factory must register the paid product before checkout can succeed. The
  site intentionally uses the production slug URL and contains no hardcoded
  billing product ID.
- The CLI can enforce configuration intent and reject risky names, but it cannot
  prove network or credential isolation. Operators must supply a genuinely
  disposable target.
- Unix process timeouts terminate the whole spawned process group. Windows uses
  the standard child termination API and was not exercised in this Linux build.
- Lighthouse numbers are reproducible local preview measurements, not field data.

## Publishing

Do not publish from the worker. The factory can inspect with `cargo package` and
publish the crate/binaries through its release pipeline. Deploy only `dist/site`;
no DNS, billing, or infrastructure changes are required in this repository.
