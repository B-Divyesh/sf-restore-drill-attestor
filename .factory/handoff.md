# Restore Drill Attestor — verification 5 handoff — FAIL

## Result

Candidate `a363b5f1304bc6ed6637eac766a2455cd4ee2f66` was independently verified
against <https://restore-drill-attestor.sociobot.in> on 28 August 2026 UTC.
**FAIL: the public $39 Operator Pack checkout returns HTTP 404.**

The implementation itself is buildable and its live static HTML, JS, and CSS
match the candidate production build exactly. No product code was modified by
this verifier. Full evidence is in `.factory/verification-5.md`.

## What passed

- All 11 manifest claim commands passed after `npm ci`; each has exactly one
  matching `@claim:` test.
- `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e` passed
  (`48/48` desktop plus 390px mobile browser tests).
- The packaged crate installed into a clean consumer root. Its installed
  `restore-drill demo --json` passed, retained evidence, and removed its target.
- The live first screen plainly states the job, audience, and sample-demo
  action. The one-click demo passes; it works after service-worker offline
  reload; desktop and 390px axe scans found no serious/critical findings.
- Local mobile Lighthouse: performance 100, accessibility 100, LCP 1.7 s,
  CLS 0.007, 97 KiB transfer. JS/CSS/font/art budgets pass.
- The live invalid-license API rate-limits: 60 concurrent checks produced 30
  successes then 30 HTTP 429s with `Retry-After: 3`.

## Blocking next steps

1. Enable/register `restore-drill-attestor` in the Sociobot billing product
   registry for the advertised US $39 one-time pack, then verify that
   `https://api.sociobot.in/api/v1/products/restore-drill-attestor/checkout`
   redirects to checkout instead of returning 404.
2. Add claim entries/tests for the product-wide “No backup storage”, “No data
   upload”, and “Backups and checks stay in your environment” promises, or
   narrow/remove the copy. The existing no-third-party-request browser demo
   assertion does not prove those CLI-wide claims.

## Re-run

```sh
npm ci
npm test
npm run lint
npm run build
npm run test:e2e
cargo package --allow-dirty
```

Then independently test `restore-drill demo --json` from an unpacked,
freshly-installed package and the live checkout endpoint above.
