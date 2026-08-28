# Changelog

## 0.1.0 repair 6 — 2026-08-28

- Build the CLI before Playwright starts claim timers so the bundled demo claim
  remains reliable with an empty Cargo cache.
- Classify missing and unreadable drill files as configuration refusals with
  exit code 2 and structured JSON errors.
- Discard lifecycle-command output and cap row/schema check capture at 64 KiB;
  truncated check output fails closed.

## 0.1.0 repair 5 — 2026-08-28

- Stop advertising the Operator Pack checkout while factory billing has no
  enabled product, while preserving restoration for existing licenses.
- Scope privacy language to the attestation fields covered by release claims
  and explain that configured commands retain the operator's access.
- Add browser regressions for the unavailable checkout and rejected privacy
  promises.

All notable changes follow [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed

- Handle `SIGINT` and `SIGTERM` by terminating the active command tree, retaining the target lock, running cleanup, and writing interrupted failure evidence.
- Give the Windows bundled demo the same row-count, schema, and application checks as Unix.
- Discard demo-prefixed license state through every same-tab demo exit, including the wordmark.
- Expand the claims manifest and exact sandbox coverage to include recovery cleanup, automation exit codes, target locking, attestation defaults, and inherited shell environment behavior.
- Add the required one-command temporary demo, bundled sample data, and exact CLI regression coverage.
- Add a one-click browser demo with isolated `demo:` storage, reset, and exit controls.
- Add a claim manifest with one tagged observable test for every public product claim.
- Replace the first-screen metaphor with a direct audience, job, sample action, outcome, and three product facts.
- Add social metadata, an Apple touch icon, sitemap, and a designed HTTP 404 response.
- Replace all user-supplied labels with neutral evidence IDs so drill, target, and check names cannot leak into attestations or filenames.
- Serialize local runs for the same declared target with an OS-backed lock and an early safe refusal.
- Refuse concatenated production-like target IDs before any command starts.
- Preserve every attestation when runs begin in the same second.
- Emit structured errors when `--json` is requested.
- Meet the 16 px operational-text and 44 px interactive-target baselines.
- Add CSP and frame-embedding response protections.
- Advertise the immediately usable public Git installation path.

## [0.1.0] - 2026-08-28

### Added

- Isolated restore drill runner with exact destructive-target confirmation.
- Declarative row-count, schema, application, and command checks.
- Always-attempted cleanup and privacy-safe timestamped JSON attestations.
- Static documentation, live attestation demonstration, and Operator Pack unlock.
