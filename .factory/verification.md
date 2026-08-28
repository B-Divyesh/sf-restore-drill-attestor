# Independent product verification — FAIL

- Work order: `restore-drill-attestor-verify-1`
- Candidate: `423981576e854f590e3e6466483a206f63a4df2a`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 2026-08-28 UTC
- Result: **FAIL — release blockers remain**

The packaged CLI performs a complete local restore/check/cleanup/attestation
lifecycle, and the live static site is byte-for-byte the candidate build. The
candidate is not releasable under the brief, however: common production-looking
target IDs bypass the advertised safety refusal and execute commands; the live
install command has no published crate or release binary; and the production
purchase endpoint returns 404.

## Defects

### High — production-looking targets bypass the destructive-target guard

The landing page promises that names containing `prod`, `production`, or `live`
are rejected, and the brief requires an isolated non-production target. The
validator only compares delimiter-separated tokens. All of these validated with
exit 0:

```text
production01         exit=0
prodwest             exit=0
livedb               exit=0
myproductionbackup   exit=0
```

An installed-package run with `target.id="production01"`, `isolated=true`, and
`--confirm production01` returned exit 0 and executed the restore marker
command. Exact confirmation is present, but the marketed hard refusal does not
cover ordinary production naming conventions. This is release-blocking because
the CLI orchestrates destructive cleanup commands.

### High — the live installation path is unavailable

The live page tells users to run `cargo install restore-drill-attestor`.
Fresh evidence from outside the repository:

```text
$ cargo info restore-drill-attestor   # run from /tmp
error: could not find `restore-drill-attestor` in registry
exit 101
```

The GitHub Releases API returned HTTP 200 with zero releases. The source and
packaged artifact are buildable, but a visitor cannot use either advertised
binary installation path. Publishing remains factory-owned; this is a release
coordination blocker, not a request for a verifier-side publish.

### High — the production purchase button ends at HTTP 404

`GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
returned:

```text
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The optional Operator Pack remains locked and the free CLI is not paywalled,
but the live $39 purchase CTA is broken. The product must be registered/enabled
in the Sociobot billing engine before release.

### Medium — attestations overwrite when two runs start in the same second

Two sequential packaged CLI runs of the safe example both succeeded and
reported the same path:

```text
local-smoke-drill-20260828T062201Z.json
exits=0,0; files after both runs=1
```

`attestation_id` has only second precision, and finalization renames to that
path without collision protection. A fast retry or concurrent same-drill run
silently loses evidence, which conflicts with durable recovery proof.

### Medium — mobile/keyboard target sizing and operational text miss the supplied baseline

At 390 px there was no horizontal overflow and keyboard focus was visible, but
seven visible interactive elements had a dimension below 44 CSS px. Examples
include the 35.9 px-high Operator Pack header link and 14–20.1 px-high footer
Source/Privacy/Terms links. Desktop navigation links were also only 20.1 px
high.

There were 26 visible main-content text elements below 16 px at both tested
viewports. Operational evidence text ranged down to 9.28 px; target metadata was
9.92–11.52 px; the destructive-target explanation was 14 px. Axe does not flag
these contract-specific size requirements, but the supplied design and
accessibility baseline does.

### Low — `--json` errors are not JSON

`validate --json` on an unsafe configuration produced no stdout and a plain
text stderr error. Successful validate/run results are JSON, but automation
cannot use one output format for both success and failure.

### Low — response hardening is incomplete

The live origin sends HSTS, `nosniff`, Referrer-Policy, Permissions-Policy, and
legacy X-XSS-Protection. It does not send a Content-Security-Policy (including
`frame-ancestors`) or X-Frame-Options. No exploit was observed; this is a
hardening gap for a site that keeps license tokens in local storage.

## Clean-checkout gates

A separate clone was detached at the candidate SHA before installing anything.
Environment: Node 22.23.2, npm 10.9.8, Rust/Cargo 1.98.0.

| Gate | Result |
| --- | --- |
| `npm ci` | PASS; 60 packages installed; audit reported 0 vulnerabilities |
| `npm test` | PASS; 6 Rust unit tests and 3 Vitest tests |
| `cargo fmt --check` | PASS |
| `cargo clippy --all-targets --all-features -- -D warnings` | PASS |
| `npm run build` | PASS; release binary and `dist/site/` produced |
| `npm run test:e2e` | PASS; 10/10 Playwright tests on desktop and 390×844 |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| `cargo package --locked --allow-dirty` | PASS; 10 files, 15.2 KiB compressed; package verification compiled |

There is no repository TypeScript typecheck or lint script/configuration beyond
Vite compilation and the Vitest suite. Rust formatting and strict Clippy are
the available static gates.

## Packaged CLI and job-to-be-done

The `.crate` output was installed with `cargo install --path` into an empty
consumer root. The installed `restore-drill 0.1.0` exposed useful root and run
help, mandatory non-interactive `--confirm`, documented exit codes, and JSON
success output.

The packaged safe example completed in 153 ms:

- prepare, restore, row-count, schema, application, and cleanup all passed;
- the disposable target was absent afterward;
- the attestation recorded tool/version, timestamps, 30-day freshness,
  configuration SHA-256, stage/check outcomes, and durations;
- restore output (`restored`), schema value (`schema-v1`), commands, paths, and
  injected secret values were absent from evidence and CLI output.

Independent recovery and invalid-input cases:

| Case | Evidence |
| --- | --- |
| Exact confirmation mismatch | Exit 2; no command ran |
| Tokenized `prod-west` target | Exit 2; no command ran |
| `isolated=false` | Exit 2 |
| Restore exits 7 | Exit 3; checks skipped; cleanup ran; failed attestation written |
| Schema check emits secret stdout/stderr then fails | Exit 3; cleanup ran; no secret in output/evidence |
| Row count at `min=0`, `max=0` | Passed boundary |
| Cleanup exits 9 | Exit 4; `cleanup_failed` attestation written |
| Check exceeds one-second timeout | Exit 3 in 1.055 s; cleanup ran; failure recorded |
| Malformed TOML, timeout zero, duplicate check, min > max, empty schema marker, unsupported version | Exit 2 with actionable errors |

## Live deployment evidence

The root HTML SHA-256 was identical locally and live:
`269f185170815d25886ff574cf6c83017b480f88af71e6c6484febae021b60cf`.
The home, privacy, and terms HTML plus every referenced JS, CSS, font, artwork,
icon, service worker, and robots asset also matched the candidate byte-for-byte.
The platform consumes `staticwebapp.config.json`; requesting that path returns
the SPA fallback rather than the file.

Clean page loads made requests only to
`https://restore-drill-attestor.sociobot.in`; there were no analytics,
trackers, CDN fonts, third-party scripts, cookies, console errors, page errors,
or failed requests. The license return flow removed only `license` from the URL,
preserved `campaign=qa` and the fragment, stored the expected local key, called
only the documented Sociobot verify endpoint, and relocked on a mocked invalid
verdict.

Response and cache checks:

- HTML: `public, must-revalidate, max-age=30`;
- hashed JS/CSS/font: `public, max-age=31536000, immutable`;
- artwork: `public, max-age=2592000`;
- service worker: `no-cache`;
- conditional requests returned 304;
- HTTPS, HSTS, `nosniff`, Referrer-Policy, and restrictive
  camera/microphone/geolocation Permissions-Policy were present.

## Browser, PWA, accessibility, and performance

- Factory `verify-url.sh`: PASS; HTTP 200, 2.084 s network-idle load, one H1,
  title/lang/main/alt present, zero console/page errors.
- Live axe checks on home, privacy, and terms at desktop and/or 390 px: zero
  serious or critical findings.
- Keyboard-only smoke: skip link was first; all sampled controls had a visible
  3 px orange outline plus 5 px ink ring; Enter ran the demo and opened the
  restore-license form; focus moved to the license input; no trap found.
- Reduced motion: demo completed in 385 ms, transition duration computed as
  0.01 ms, and stage transforms were removed.
- PWA: service worker installed, controlled the page, `update()` completed,
  and a 390 px offline reload retained title, styling, scripts, demo, and the
  explicit offline notice with no errors.
- Layout: zero horizontal overflow at 1366×900 and 390×844; legal pages also
  had zero overflow.
- Lighthouse 12.8.2 live mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.2 s, LCP 1.4 s, CLS 0.035, TBT 0 ms.
- Production assets: JS 5,980 B; CSS 16,639 B; font 41,344 B; mobile hero
  43,858 B; desktop hero 146,742 B. All supplied bundle budgets pass.

## Acceptance conclusion

The candidate is technically buildable, packageable, fast, private by default,
and capable of the core restore-drill lifecycle. It is **FAIL** for release
because the destructive-target safety claim is bypassable and both public
commercial/install entry points are unavailable. Reverify after tightening the
target guard without broad false positives, making attestation names
collision-safe, publishing a factory-owned binary/crate, enabling checkout, and
correcting small text/touch targets.
