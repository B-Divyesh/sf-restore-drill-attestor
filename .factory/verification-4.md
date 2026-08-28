# Independent product verification 4 — FAIL

- Work order: `restore-drill-attestor-verify-4`
- Candidate: `7d130e160724f78ef5117cbc593f34080500368c`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 28 August 2026 UTC
- Result: **FAIL — release-blocking product, billing, and claims defects remain**

The candidate is buildable and the deployed static artifacts match its exact
production build. Its normal restore/check/cleanup flow works, all six listed
claim commands pass after the clean install, and the first screen passes the
plain-words/demo gate. It is not releasable: interrupting a drill abandons the
target and lets the restore child continue without evidence, the live purchase
button still returns 404, and the claims manifest does not list or fully prove
all public promises.

No product code was changed during this verification.

## Release-blocking defects

### High — an interrupted drill abandons its target and running child

The README promises that the CLI “always cleans up,” while the brief requires
the isolated target to be destroyed. A clean-consumer run was started with a
prepare command that created a target, a restore command that marked its start,
slept for two seconds, and marked completion, plus a cleanup command that
removed the target. After the restore marker appeared, the CLI received
`SIGTERM`.

```text
started_before_signal=yes
cli_exit_after_sigterm=143
target_immediate=present
target_after_child_finishes=present
child_completed=yes
evidence_files=0
```

The parent has no signal handling or cleanup guard. Its child runs in a
separate process group, continues after the parent exits, and the OS releases
the per-target lock. The result is restored data left behind, no failure
attestation, and the possibility of a second drill using the same target while
the orphan command is still active. This breaks the central cleanup and
evidence guarantees.

### High — the advertised $39 checkout still returns 404

Fresh request to the exact live buy-link target:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The landing page advertises the Operator Pack and exposes this link as its buy
action, so the paid product cannot be purchased. This confirms the previous
deployment-only failure remains unresolved. The repository correctly avoids a
direct payment-provider integration; product registration/enabling belongs to
the factory billing service.

### High — public claims are missing from the required manifest

`.factory/claims.json` exists and has one source test tagged for each of its six
entries. However, the mandatory landing/README cross-check found public,
reliable statements with no manifest entry or claim-tagged test, including:

- cleanup is always attempted after prepare, including restore/check failure;
- exact exit-code behavior and machine-readable `--json` summaries;
- local per-target locking and refusal of concurrent runs;
- the attestation configuration fingerprint, 30-day freshness default, and
  per-command 900-second timeout default;
- shell execution with inherited environment variables.

Several listed tests also assert less than their claim promises. The
`demo-sandbox` test does not assert that exactly three checks or the restore
stage ran. The `operator-pack` test does not assert the named pack contents or
that the free CLI remains available after a valid unlock. Passing those tests
therefore does not satisfy the supplied “every claim is a test” contract.

## Other defects

### Medium — alternate demo exits retain demo license data

In `?demo=1`, submitting a license correctly writes only
`demo:sb_license:restore-drill-attestor` and its demo-prefixed verdict. “Start
for real” clears them. Leaving demo mode through the always-visible wordmark,
however, navigates to `/` without clearing either key:

```json
{
  "url": "https://restore-drill-attestor.sociobot.in/",
  "before": ["demo:sb_license_verdict:restore-drill-attestor", "demo:sb_license:restore-drill-attestor"],
  "after": ["demo:sb_license_verdict:restore-drill-attestor", "demo:sb_license:restore-drill-attestor"]
}
```

The namespace prevents contamination of real product state, but the supplied
demo contract requires demo data to be discarded whenever demo mode is left.

### Medium — the Windows demo contradicts the three-check claim

Static inspection of the Windows-specific bundled demo config finds one
`application` check, while `run_demo` still prints “restore, 3 checks” and the
public claim promises three checks. The Unix demo does run row-count, schema,
and application checks. No supported-platform limitation is documented.

## Mandatory first checks

### Claims manifest and exact commands

Before inspecting implementation files, every command from
`.factory/claims.json` was invoked. In the untouched clone, the first pass could
not import `@playwright/test` because dependencies had not yet been installed.
`npm ci` then installed the locked dependency set with zero audit findings, and
the exact commands were rerun unchanged:

| Claim | Exact-command result after clean install |
| --- | --- |
| `demo-sandbox` | PASS — 1/1 |
| `evidence-minimization` | PASS — 1/1 |
| `target-safety` | PASS — 1/1 |
| `offline-reload` | PASS — 1/1 |
| `site-local-only` | PASS — 1/1 |
| `operator-pack` | PASS — 1/1 |

The release still fails the claims contract for the omissions and assertion
gaps documented above.

### Cold first read

**PASS.** The first live screen says “Prove your database backup restores,”
names indie SaaS operators and small platform teams, and makes “Try it with
sample data” the primary action. Its adjacent note says the click runs a
four-stage sample and shows evidence. The private/offline/price facts are also
visible on the first screen. One click enters `?demo=1`, shows the persistent
demo banner, and starts a populated passing drill.

## Clean-checkout gates

The checkout was the requested SHA before install. Environment used Node
22.23.2, npm 10.9.8, and Rust/Cargo 1.98.0.

| Gate | Result |
| --- | --- |
| `npm ci` | PASS; 61 packages, 0 vulnerabilities |
| `npm run lint` | PASS; rustfmt, strict Clippy, TypeScript |
| `npm test` | PASS; 10 Rust unit, 4 integration, 3 Vitest |
| `npm run build` | PASS; release CLI and `dist/site/` |
| `npm run test:e2e -- --workers=4` | PASS; 36/36 desktop and 390 px |
| Live external Playwright suite | PASS; 36/36 desktop and 390 px |
| `npm audit --omit=dev` | PASS; 0 vulnerabilities |
| `cargo package --locked` | PASS; 11 files, 65.4 KiB / 19.3 KiB compressed |

The exact production build emitted 6,631 B JavaScript (2,897 B gzip), 17,696 B
CSS (4,510 B gzip), one 41,344 B local font, a 43,858 B mobile hero, and a
146,742 B desktop hero. All supplied bundle budgets pass.

## Package, install, and CLI lifecycle

The verified crate was installed into a new `CARGO_INSTALL_ROOT` and exercised
from a separate consumer directory. The advertised public command was also run
fresh and resolved the exact candidate:

```text
cargo install --git https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked
Installing restore-drill-attestor v0.1.0 (...#7d130e16)
restore-drill 0.1.0
```

The installed `demo --json` passed in a new system-temp sandbox, removed its
target, retained privacy-safe evidence, and did not touch a consumer sentinel.
The shipped example validated and completed in 152 ms with passed evidence and
no remaining target. Root help is useful, noninteractive confirmation is
mandatory, and JSON errors are machine-readable.

Independent normal, boundary, invalid, and recovery cases:

| Case | Evidence |
| --- | --- |
| Row count `min=0`, `max=0`, output 0 | Exit 0; passed attestation |
| `production01` target | Exit 2 before command; marker absent |
| `isolated=false` | Exit 2 before command |
| Confirmation mismatch | Exit 2 before command |
| Restore exits nonzero | Exit 3; cleanup passed; failed attestation |
| Check prints secret to stdout/stderr then fails | Exit 3; cleanup passed; no secret, command, or label in output/evidence |
| Cleanup removes target then exits 9 | Exit 4; `cleanup_failed` evidence |
| One-second check timeout | Exit 3 in 1,093 ms; target removed; failure evidence |
| Malformed TOML | Exit 2 with JSON configuration error |
| Missing config | Exit 3 with JSON I/O error |
| Concurrent same-target runs | Repository integration test passed; second refuses before its commands |
| Terminated run | **FAIL**; target and orphan child remain, no evidence |

Attestations used collision-safe suffixes for multiple same-second runs and
excluded the deliberately injected secret, user label, configured commands,
stdout, and stderr.

## Live deployment, privacy, policies, and identity

Fifteen browser-served build artifacts matched the candidate byte-for-byte,
including all HTML pages, hashed JS/CSS/font, service worker, sitemap, icons,
and art. Root HTML SHA-256 was
`aa32bd6cd387c54f93be498589e0bcdb885801997f9de0ac147e3fc86fcff633`.
The deployment-only `staticwebapp.config.json` correctly returns the designed
404 rather than exposing itself.

- Factory `verify-url.sh`: PASS; HTTP 200, 651 ms network-idle load, one H1,
  title/lang/main/alt present, zero console/page errors.
- Home, privacy, terms, sitemap, demo URL, source link, and artwork returned
  successful responses. Unknown routes returned the designed HTTP 404. The
  checkout link was the sole dead product link.
- Clean demo browsing requested only the live first-party origin. There are no
  analytics, third-party fonts/scripts, or static-origin cookies. License
  verification occurs only after local license state exists.
- The live origin sends HSTS, `nosniff`, strict-origin Referrer-Policy,
  restrictive Permissions-Policy, CSP with self-only executable assets and
  `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`.
- HTML is cached for 30 seconds with revalidation, hashed assets are immutable
  for one year, artwork for 30 days, and `sw.js` is `no-cache`. An ETag
  conditional request returned 304.
- No account or sign-in flow exists, so the Entra External ID requirement is
  not applicable.

The live license verifier returned the expected invalid verdict with
`Cache-Control: no-store` and origin-specific CORS. A simultaneous 80-request
burst produced 30 HTTP 200 and 50 HTTP 429 responses. Every 429 included
`Retry-After: 4`; the observed burst allowance was 30 requests.

## Browser, accessibility, offline, and performance

- Desktop and 390×844 mobile had no overflow, clipping, console errors, page
  errors, or failed first-party resources. Full-page captures were visually
  inspected.
- Axe 4.10.2 found zero serious or critical issues on home and legal routes.
  Semantic title/lang/main/one-H1/alt checks passed.
- Every visible link, button, input, and summary met 44×44 CSS px; visible main
  text met the 16 px baseline. The narrower mobile layout also demonstrates
  reflow beyond a 200% desktop text-equivalent width.
- Keyboard smoke passed: skip link first, Enter/Space actions work, license
  disclosure moves focus to its labelled input, and the 3 px orange plus 5 px
  ink focus treatment is visible. No trap was found; form status is announced.
- Reduced-motion mode computes near-zero transitions, removes stage transforms,
  and completes the demo without animation dependency.
- Service-worker install/update/control and an offline reload passed on desktop
  and mobile. The cached demo remained interactive and showed its offline
  notice.
- Lighthouse 13.0.1 live mobile: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.1 s, LCP 1.4 s, CLS 0.007, TBT 40 ms, total
  transfer 96 KiB. Lab INP was not produced; interactive smoke showed no delay.

## Acceptance conclusion

**FAIL.** The normal path is capable, fast, accessible, private by default,
installable, and deployed from the candidate. Release requires signal-aware
child termination plus guaranteed cleanup/evidence, enabling the factory
checkout, and bringing every public promise into a complete claim test. Demo
state should also clear on every exit, and the Windows demo must match its
three-check claim or document platform scope.
