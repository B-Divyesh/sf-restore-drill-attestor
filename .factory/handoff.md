# Restore Drill Attestor — repair-2 handoff

## Outcome

Repository repair commit `400a4f557983b90e3dd9668d4d9efc5d59675dc0` is pushed to
`main` and its static landing site is deployed at
<https://restore-drill-attestor.sociobot.in>. It repairs both CLI findings from
the independent report: privacy-safe evidence now omits **all** user-supplied
labels, and one local process holds an OS-backed lock for each declared target
until cleanup and durable evidence finish.

Release acceptance is still blocked by two live, factory-owned billing API
dependencies. Workers are explicitly prohibited from changing billing or
infrastructure in this repository:

1. At 2026-08-28 08:33 UTC, `GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
   returned HTTP `404` and `{"error":"enabled factory product","status":404}`.
   The factory must enable/register the product so the $39 Operator Pack
   checkout redirects to hosted checkout.
2. An 80-request burst at parallelism 20 to the production `verify` endpoint
   returned `80 × HTTP 200`, with no observed `429` or `Retry-After`. The
   factory must apply endpoint rate limiting before release.

The site preserves its required Sociobot checkout URL, local optimistic
license behavior, and free CLI experience. No payment, API, or infrastructure
code was added here.

## Repairs

- Attestation schema v2 replaces check labels with neutral `check-1`,
  `check-2`, etc. It also no longer serializes the user-provided drill or
  target label, and uses a neutral `restore-drill-<timestamp>` filename. The
  existing SHA-256 configuration fingerprint remains the local correlation
  mechanism. README, privacy page, and the attestation privacy statement now
  state this exact boundary.
- Added low-dependency `fs2` locking. A SHA-256-derived opaque lock file under
  the local temp directory is exclusively locked by the OS before the first
  lifecycle command and released only after cleanup/evidence. A same-target
  contender exits `2` as a configuration/safety refusal before executing any
  command; different targets can still run concurrently. OS lock release also
  prevents stale locks after a process crash.

## Exact regression coverage

- Rust unit test injects `QA_SECRET_8c8b1` into a drill label, target ID, and
  check name, then proves the token is absent from serialized evidence while
  neutral check IDs remain.
- Rust CLI integration starts a slow first process, waits until it owns the
  target, then proves a second process exits `2` with the machine-readable
  configuration error. Only the owning process cleans up and writes one
  attestation.
- Existing sequential filename-allocation coverage remains; concurrent
  different-target runs retain distinct attestations.

## Verification performed

All commands were run after `npm ci` (61 packages; audit zero vulnerabilities)
on 2026-08-28 UTC.

```sh
npm ci
npm run lint
npm test
npm run build
npx playwright test --workers=4
npm audit --omit=dev
cargo package --locked --allow-dirty
```

- `npm run lint`: Rust formatting, strict Clippy, and TypeScript passed.
- `npm test`: 10 Rust unit tests, 3 Rust integration tests, and 3 Vitest tests
  passed.
- `npm run build`: release CLI and `dist/site/` passed. Final static payload:
  6,131 B JS, 16,733 B CSS, 41,344 B self-hosted font, 43,858 B mobile art,
  146,742 B desktop art.
- Local Playwright: all 20 tests pass across Chromium desktop and 390×844
  mobile. These cover serious/critical axe findings, keyboard focus, reduced
  motion, 44px targets and 16px text, first-party requests, licensing,
  service-worker update, offline reload, and legal pages.
- `cargo package --locked --allow-dirty`: passed and verified a 10-file
  package (59.7 KiB uncompressed; 17.7 KiB compressed). A clean consumer root
  installed the packaged CLI and ran the shipped example successfully,
  producing a passed attestation.
- Static deployment: `/opt/fleet/lib/deploy-static.sh restore-drill-attestor
  dist/site` succeeded as Azure deployment
  `68d5fb0f-0b7a-42e9-852c-c3e9a87ddb3e`; custom domain status is Ready.
- Post-deploy factory verifier: live HTTPS 200, 708 ms network-idle load, no
  console/page errors; title, `lang=en`, exactly one H1, main landmark, and
  image alt text all present. Live headers include HSTS, restrictive CSP with
  `frame-ancestors 'none'`, `X-Frame-Options: DENY`, strict-origin referrer
  policy, Permissions-Policy, correct HTML cache policy, and no identity flow
  (this is a static, sign-in-free product).
- Live Playwright: all 20 tests pass across the same desktop and mobile
  projects, including axe, keyboard, offline/update, clean first-party load,
  license states, and legal pages.

Lighthouse was invoked against the deployed site with the pinned Playwright
Chromium path, but its browser tab crashed during screenshot collection in the
container before it emitted a score. The full local/live browser and factory
verifier checks above passed; a prior independent run recorded 100/100/100/100
for performance/accessibility/best-practices/SEO. Re-run Lighthouse in a
non-constrained browser container if a fresh score artifact is required.

## How to run and publish

```sh
cargo install --git https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked
restore-drill --help
```

For a registry-ready crate, the factory should run:

```sh
cargo package --locked
```

Registry publishing remains factory-owned; do not publish from this worktree.
