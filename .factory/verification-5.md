# Independent product verification 5 — FAIL

- Work order: `restore-drill-attestor-verify-5`
- Candidate tested: `a363b5f1304bc6ed6637eac766a2455cd4ee2f66`
- Live URL: <https://restore-drill-attestor.sociobot.in>
- Verified: 28 August 2026 UTC
- Result: **FAIL — the advertised paid product cannot be purchased.**

No product code was changed during this verification. The only repository
changes are this report and the handoff update.

## First read and demo gate — PASS

Cold-loading the live site answers the required questions in plain words:

- **What:** “Prove your database backup restores.”
- **For whom:** “For indie SaaS operators and small platform teams who need
  repeatable recovery evidence without retaining restored data.”
- **First action:** “Try it with sample data”; its adjacent explanation says it
  runs a four-stage sample and shows the evidence.

One click enters `?demo=1#demo`, shows the persistent “Demo — sample data,
nothing is saved to your work” banner with Reset demo and Start for real, and
reaches `PASSED`. This was independently observed on desktop and at 390px.

## Release-blocking defects

### High — live Operator Pack checkout is still absent

The public landing page advertises a $39 one-time Operator Pack and links its
buy action to the required Sociobot checkout endpoint. A fresh live request to
that exact target returned:

```text
GET https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The product therefore cannot be purchased. This is an external factory billing
registration/enabling defect, not a direct-payment integration defect in this
repository; the repository correctly uses the Sociobot URL. It remains a
release blocker until the slug is enabled at the billing API and the checkout
redirect succeeds.

## Other defects

### Medium — two broad privacy promises remain outside the claims contract

The live footer states “No backup storage. No data upload.” and the hero states
“Backups and checks stay in your environment.” `.factory/claims.json` has no
entry for the product-wide no-backup-storage promise, and its only related
browser claim (`site-local-only`) proves only that the *public demo* makes no
third-party runtime request. It does not prove the CLI-wide no-upload/no-backup
promises. The claims rules require each visitor-reliant statement to have a
matching sandbox assertion, or the copy to be removed/scoped.

## Required claims — PASS after clean install

The initial clean-clone claim invocation could not import `@playwright/test`
because `node_modules` is deliberately absent. After the lockfile install
(`npm ci`: 61 packages, zero vulnerabilities), every exact command in
`.factory/claims.json` passed independently against its declared demo entry
point. The full browser suite subsequently passed too.

| Claim | Exact command result |
| --- | --- |
| demo-sandbox | PASS, 1/1 |
| evidence-minimization | PASS, 1/1 |
| target-safety | PASS, 1/1 |
| cleanup-recovery | PASS, 1/1 |
| automation-contract | PASS, 1/1 |
| target-lock | PASS, 1/1 |
| attestation-metadata | PASS, 1/1 |
| shell-environment | PASS, 1/1 |
| offline-reload | PASS, 1/1 |
| site-local-only | PASS, 1/1 |
| operator-pack | PASS, 1/1 |

Each manifest ID appears exactly once as `@claim:<id>` in the test source.

## Local and CLI verification — PASS

```text
npm ci                 PASS (61 packages; 0 vulnerabilities)
npm test               PASS (11 Rust unit, 5 Rust integration, 3 Vitest)
npm run lint           PASS (rustfmt, Clippy -D warnings, TypeScript)
npm run build          PASS (release CLI and dist/site)
npm run test:e2e       PASS (48/48: Chromium desktop and 390px mobile)
cargo package --allow-dirty  PASS (11 files; 72.1 KiB / 21.0 KiB compressed)
```

I unpacked the produced `.crate`, installed it in a new `/tmp/rda-consumer-*`
root, ran `restore-drill --help`, and ran `restore-drill demo --json`. The
installed CLI returned `status: "passed"`, `target_removed: true`,
`real_data_touched: false`, and an attestation path in its own temporary
sandbox. The source integration coverage also passed the interruption,
command-tree termination, cleanup, lock retention, evidence, timeout, invalid
confirmation, production-looking target, and concurrent-target cases.

## Live deployment, usability, privacy, and policy — PASS except checkout

- Fresh local production build exactly matches live `index.html`, JS, and CSS:
  SHA-256 `f710683b…f6cb`, `9bdd8d3b…ee41`, and `7ccc64c7…6f77` respectively.
- Live desktop and 390px cold/demo checks had one `h1`, one `main`, no
  horizontal overflow, no console/page errors, and only the site origin during
  the unauthenticated demo flow.
- Live axe scans on both sizes reported **zero** serious/critical violations
  (zero violations total). Reduced motion made stage transition duration
  `0.00001s`; keyboard focus exposed a 3px outline.
- A fresh live service-worker install/update, offline reload, and sample-demo
  run succeeded (`controlled: true`, offline status visible, demo `PASSED`).
- Response headers include HSTS, `nosniff`, DENY framing, strict-origin
  referrer policy, restrictive permissions, and a self-only CSP with only the
  necessary `https://api.sociobot.in` connection allowance. HTML revalidates at
  30 seconds; the hashed main JS is `max-age=31536000, immutable`; `sw.js` is
  `no-cache`.
- Invalid-license verification returns HTTP 200, `valid:false`, and
  `Cache-Control: no-store`. A 60-request concurrent burst to the verification
  endpoint produced 30 HTTP 200 responses then 30 HTTP 429 responses; a 429
  included `Retry-After: 3` (and `X-RateLimit-After: 3`). No sign-in surface
  exists, so Entra tenant validation is not applicable.
- Local mobile Lighthouse 12.8.2: performance **100**, accessibility **100**,
  LCP **1.7 s**, CLS **0.007**, transferred size **97 KiB**. Bundles are 6,866
  B JS (2,978 B gzip), 17,696 B CSS (4,510 B gzip), and 41,344 B font; responsive
  hero assets are 43,858 B mobile and 146,742 B desktop.

## Acceptance decision

**FAIL.** Do not release while the publicly advertised checkout returns 404.
Also either add sandbox tests that prove the CLI-wide privacy/storage promises
or scope/remove those statements so every public claim has matching evidence.
