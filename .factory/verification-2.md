# Independent product verification — FAIL

- Work order: `restore-drill-attestor-verify-2`
- Candidate: `88d535236f991ff69d660860b6581ac44431a080`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 2026-08-28 UTC
- Result: **FAIL — release blockers remain**

This was a fresh, detached clean-clone verification. The deployed static site
is byte-for-byte the production build of the requested candidate, and its core
CLI lifecycle works in a clean consumer installation. The release fails the
acceptance contract because the paid checkout is unavailable, the live
license-verification endpoint does not rate-limit, and two CLI behaviors
undermine the stated evidence-privacy/repeatability guarantees.

## Defects

### High — the live $39 Operator Pack checkout is unavailable

The live purchase CTA targets the required Sociobot endpoint, but a fresh
request on 2026-08-28 returned HTTP 404 rather than a hosted checkout:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The free CLI remains useful, but the advertised paid unlock cannot be bought.
Product registration/enabling is factory-owned, so this is a release
coordination blocker rather than a requested verifier-side billing change.

### High — the live license-verification endpoint has no observed rate limit

`GET /api/v1/products/restore-drill-attestor/verify?license=<dummy>` correctly
returns `200 {"valid":false,"reason":"invalid"}` and `Cache-Control:
no-store`. However, a bounded burst from one source IP sent 80 requests at
parallelism 20, immediately followed by 240 requests at parallelism 60. All
**320/320** responses were HTTP 200; none was HTTP 429 and none carried
`Retry-After`.

The acceptance contract explicitly requires a server-side endpoint, including
the factory product-unlock call, to begin returning 429 plus `Retry-After`
under a rapid burst. The observed threshold is therefore **not reached through
320 requests / absent**. This API is factory-owned, but it is part of the
shipped product flow and must be protected before release.

### Medium — check labels can put data or secrets into an attestation

The product promises that attestations contain no data values or secrets. CLI
stdout/stderr and check output are correctly suppressed, but a user-controlled
`checks[].name` is copied verbatim into the attestation. A clean packaged
consumer ran a valid drill with the schema check named
`QA_SECRET_CHECK_NAME_8c8b1`; its output contained:

```json
"name": "QA_SECRET_CHECK_NAME_8c8b1"
```

Configuration labels commonly include tenant, account, migration, or incident
details. Either constrain/sanitize recorded labels or narrow the privacy claim;
the current unconditional “No ... secrets recorded” text is not true for all
valid inputs.

### Medium — simultaneous runs against the same target are not serialized

Two installed CLI processes using the shipped safe example and the same
`target.id`/output directory were started together. Both produced distinct
attestations (`...Z.json` and `...Z-2.json`), so the repaired filename
collision behavior works. One run nevertheless exited 0 and one exited 4
(`cleanup_failed`): each restored the same disposable target and one removed it
before the other's cleanup command ran.

There is no per-target lock or early refusal. In a realistic scheduled drill,
this can cause a false failed attestation or allow one run to destroy a target
while another is checking it. It conflicts with repeatable isolated recovery
proof; serialize the declared target or make concurrent execution an explicit,
safe refusal.

## Clean-checkout gates

A new `/tmp` clone was detached at the exact candidate SHA before dependency
installation. Environment: Node 22.23.2, npm 10.9.8, Rust/Cargo 1.98.0,
Playwright 1.58.2 Chromium.

| Gate | Result |
| --- | --- |
| `npm ci` | PASS; 61 packages, audit reported 0 vulnerabilities |
| `npm run lint` | PASS; `cargo fmt --check`, strict Clippy, and `tsc --noEmit` |
| `npm test` | PASS; 9 Rust unit tests, 2 CLI integration tests, 3 Vitest tests |
| `npm run build` | PASS; release CLI and `dist/site/` produced |
| `npm run test:e2e` | PASS; 20/20 local Playwright tests, desktop and 390×844 mobile |
| Live external Playwright run | PASS; 20/20 against the production URL |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| `cargo package --locked --allow-dirty` | PASS; verified 10-file, 17 KiB crate |

## CLI / packaged-consumer evidence

The package was installed into a new consumer root from the verified
`target/package/restore-drill-attestor-0.1.0` source package. `restore-drill
--help` exposed the single documented binary and non-interactive commands. A
fresh public install also succeeded from the exact advertised command:

```text
cargo install --git https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked
GitHub main resolved to 88d535236f991ff69d660860b6581ac44431a080
restore-drill 0.1.0
```

Independent consumer cases:

| Case | Result |
| --- | --- |
| Shipped example normal drill | PASS, exit 0 in 153 ms; prepare/restore/row-count/schema/application/cleanup passed; target absent after cleanup; 30-day `fresh_until` attestation written |
| Row-count boundary `min=0`, `max=0`, output `0` | PASS, exit 0 |
| Exact confirmation mismatch | PASS safety behavior: exit 2 JSON configuration error; no target created |
| Concatenated production name `prodwest` | PASS safety behavior: exit 2 JSON configuration error before commands |
| Restore command exits nonzero | PASS recovery behavior: exit 3, failed attestation written, cleanup removed target |
| Schema command prints `QA_SECRET_8c8b1` then fails | PASS for command-output privacy: exit 3 and no token in stdout, stderr, or attestation |
| Cleanup command fails after removing target | PASS exit behavior: exit 4 and `cleanup_failed` attestation written |
| Same-second concurrent evidence allocation | PASS for filenames: two output files with distinct IDs; see separate target-contention defect above |

Attestations correctly excluded commands, shell output, row counts, schema
values, paths, and the deliberately printed secret. The check-name defect is
the exception documented above.

## Live deployment, privacy, browser, and PWA

All candidate production assets matched live byte-for-byte: root, privacy,
terms, service worker, icon, robots, both artwork variants, self-hosted font,
hashed CSS, and hashed JavaScript. The live root SHA-256 is
`df82ad51f6a83c5465cde339604569c6c288f6067888e5415a4868035c89dbbb`.

- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, 697 ms network-idle load,
  title/lang/one H1/main/alt present, no console or page errors.
- Local and live Playwright axe scans on home/privacy/terms reported zero
  serious or critical findings. Desktop and 390×844 mobile had no horizontal
  overflow; the project tests also confirmed visible controls and body copy
  meet the supplied 44 px / 16 px baseline.
- Keyboard smoke passed: the first Tab lands on the skip link; visible focus
  is a 3 px outline plus 5 px ink ring. Enter on the restore-license control
  moves focus to its labelled token field; no trap was observed.
- With `prefers-reduced-motion: reduce`, desktop and mobile computed stage
  transition duration was `0.00001s` and transform `none`; the demo completed
  successfully. The service-worker update/offline-reload test passed locally
  and live: cached home remained interactive and showed the explicit offline
  notice.
- A clean browser load requested only the first-party site origin. There are
  no analytics, third-party scripts/fonts, or static-origin cookies; license
  verification is invoked only after a token is supplied. There is no sign-in
  flow, so no Entra authority applies.
- Live headers include HSTS, `nosniff`, strict-origin Referrer-Policy,
  restrictive Permissions-Policy, CSP with `script-src 'self'` and
  `frame-ancestors 'none'`, and `X-Frame-Options: DENY`. HTML is
  `public, must-revalidate, max-age=30`; hashed assets are one-year immutable;
  service worker is `no-cache`; a conditional HTML request returned 304.
- Lighthouse 13.4.1, live mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.2 s, LCP 1.2 s, CLS 0.034, TBT 0 ms.
  Production JS is 6,131 B, CSS 16,733 B, font 41,344 B, mobile art 43,858 B,
  and desktop art 146,742 B — all stated budgets pass.

## Acceptance conclusion

The candidate is buildable, packageable, deploy-matched, accessible, and
functionally capable of a local restore/check/cleanup/attestation drill. It is
**FAIL** because checkout and mandatory API rate limiting are externally broken
and because the repository still permits secret-bearing labels in purportedly
privacy-safe evidence and concurrent use of a declared target. Reverify after
the factory enables checkout and rate limiting, and after the CLI privacy and
per-target serialization behaviors are addressed.
