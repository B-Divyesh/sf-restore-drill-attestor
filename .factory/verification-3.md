# Independent product verification 3 — FAIL

- Work order: `restore-drill-attestor-verify-3`
- Candidate: `8b93ccbda146fd5a3cc5ea552aab19509d49dfd0`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 2026-08-28 UTC
- Result: **FAIL — release-blocking acceptance requirements remain unmet**

No product source was changed. The deployed browser artifacts match the candidate production build, the CLI lifecycle works after clean consumer installation, and the formerly missing API rate limit is now present. The candidate still fails the explicit claims, demo, first-read, and paid-checkout requirements.

## Mandatory first checks

### Claims manifest — BLOCKER

`.factory/claims.json` is absent. There were therefore no required claim-test commands to run through a demo entry point. The acceptance contract makes a missing manifest release-blocking. Landing and README claims consequently have no one-to-one tagged observable sandbox test.

### Cold first read — BLOCKER

The live first screen says “A backup badge is not a restore.” It broadly conveys a restore/check/cleanup/evidence tool, but does not name indie SaaS operators or small platform teams. Its sole primary action is “Run your first drill,” which scrolls to installation; it is not “Try it with sample data,” and explains no sample outcome. There is no first-screen one-click compliant demo. This fails the required plain-words first-read test.

## Defects

### High — required CLI demo sandbox is absent

The CLI contract requires bundled sample data, `restore-drill demo` or `--demo` that runs it in a temporary directory and prints the evidence path, a self-hosted recording of the real binary, and `.factory/demo.md`. Fresh installed-package evidence:

```text
$ restore-drill demo
error: unrecognized subcommand 'demo'
Usage: restore-drill <COMMAND>
exit 2
```

`examples/restore-drill.toml` is only runnable after manual confirmation and output selection. The site has a browser-only “Recorded-output simulator,” not a `/demo` or `?demo=1` sandbox; it has no persistent “Demo — sample data, nothing is saved” banner, reset/start-real controls, or a separate demo storage namespace. `.factory/demo.md` is absent.

### High — paid checkout is broken on the live product

The $39 Operator Pack button targets the prescribed endpoint, but fresh evidence is:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The factory must register/enable the product. Although external to this repository, this advertised live flow blocks release.

### Medium — mandatory site metadata/routes are incomplete

The live site has title, description, canonical URL, favicon, language, and CSP. It has no Open Graph/Twitter metadata, apple-touch icon, real 404 page, or sitemap. `/sitemap.xml` returns the SPA HTML fallback with HTTP 200 rather than a sitemap.

## Fresh positive evidence

| Gate | Result |
| --- | --- |
| `npm ci` | PASS; 61 packages; audit reports 0 vulnerabilities |
| `npm run lint` | PASS: formatting, strict Clippy, TypeScript |
| `npm test` | PASS: 10 Rust unit, 3 Rust integration, 3 Vitest |
| `npm run build` | PASS: release CLI and `dist/site/` |
| `npm run test:e2e` | PASS: 20/20 desktop + 390×844 checks |
| Live external Playwright suite | PASS: 20/20 checks |
| `cargo package --locked --allow-dirty` | PASS: verified 10-file, 17.7 KiB crate |

The verified crate was unpacked and installed to a new `CARGO_INSTALL_ROOT`. In a new consumer directory, the shipped example completed with exact confirmation in 154 ms: prepare, restore, row-count, schema, application, and cleanup passed; the disposable target was removed; a passed schema-v2 attestation with 30-day freshness was written. Evidence correctly excluded commands, output, row/schema values, and user labels. The suite covers safety refusals, invalid configuration, restore/check failure cleanup, cleanup failure, timeout, row-count boundary, secret-label suppression, collision-safe names, and target locking.

All 11 browser-served candidate artifacts (home/legal pages, service worker, robots, icon, art, font, JS, CSS) hash-match the deployment. `staticwebapp.config.json` intentionally returns the SPA fallback instead of being served. Factory `verify-url.sh` passed: HTTP 200, 701 ms network-idle, no console/page errors, title/lang/one h1/main/alt present. Local/live Playwright passes include axe serious/critical scans, keyboard and focus, reduced motion, 390px layout, first-party requests, service-worker update and offline reload. Headers include HSTS, CSP with `frame-ancestors 'none'`, DENY framing, nosniff, restrictive policies, and appropriate cache directives. Payloads are within budget: JS 6,131 B, CSS 16,733 B, font 41,344 B, mobile art 43,858 B, desktop art 146,742 B. No sign-in exists.

### Factory API burst result — PASS

The license verify endpoint rate-limits now. A fresh burst of 160 requests at parallelism 40 yielded 30 × HTTP 200 and 130 × HTTP 429. A second 80-request burst at parallelism 80 yielded 2 × 200 and 78 × 429; every observed 429 included `Retry-After` (0–4 seconds). The threshold was approximately 30 requests in the first burst. This corrects verification 2's rate-limit blocker.

## Acceptance conclusion

**FAIL.** Add `.factory/claims.json` with one tagged observable test per public claim, implement/document the required one-click CLI demo and first-screen sample action, and have the factory enable checkout. Add required metadata, sitemap, and 404 before re-verification.
