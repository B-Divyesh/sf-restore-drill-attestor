# Restore Drill Attestor

Vendor-neutral proof that a database backup really restores. `restore-drill`
runs your existing restore tooling against an explicitly isolated target, checks
the result, always cleans up, and writes a compact JSON attestation containing
durations and outcomes—never query results or command output.

It is for indie SaaS operators and small platform teams who need recovery
evidence without sending backups or production data to another service.

## Install

Install the current release directly from its public source repository with
Rust 1.85+:

```sh
cargo install --git https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked
restore-drill --help
```

For local development, use `cargo install --path . --locked`. Registry and
binary-release publication remain factory-owned.

## Usage

Try the complete lifecycle first with the bundled sample. It uses a new
temporary directory, never reads your configuration or data, removes its
disposable target, and prints the evidence path:

```sh
restore-drill demo
restore-drill demo --json
```

The browser preview is one click away at
<https://restore-drill-attestor.sociobot.in/?demo=1#demo>. Its persistent demo
banner provides reset and exit controls; browser demo state uses only the
`demo:` storage namespace. See [.factory/demo.md](.factory/demo.md).

Create `restore-drill.toml`:

```toml
version = 1

[drill]
name = "primary-postgres"

[target]
id = "local-restore-drill"
isolated = true

[commands]
prepare = "docker compose up -d drill-db"
restore = "./ops/restore-latest.sh drill-db"
cleanup = "docker compose down -v"

[[checks]]
name = "accounts have rows"
kind = "row_count"
command = "psql $DRILL_URL -Atc 'select count(*) from accounts'"
min = 1

[[checks]]
name = "migration is present"
kind = "schema"
command = "psql $DRILL_URL -Atc 'select version from schema_migrations order by version desc limit 1'"
contains = "202608"

[[checks]]
name = "application boots"
kind = "application"
command = "DRILL_MODE=1 ./bin/smoke-test"
```

Validate without running anything, then perform the drill. The confirmation
must exactly match `target.id`; there is no interactive bypass.

```sh
restore-drill validate --config restore-drill.toml
restore-drill run --config restore-drill.toml \
  --confirm local-restore-drill --output ./attestations
```

For automation, add `--json` to print a machine-readable summary. Exit codes
are `0` for a passed drill, `2` for configuration/safety errors, `3` for a
restore or check failure, and `4` when cleanup fails. Cleanup is attempted after
prepare, even when restore or checks fail. A local OS-backed lock serializes
runs for the same `target.id`; a concurrent run refuses before any command is
started. The attestation deliberately excludes commands, stdout, stderr, every
user-supplied label (including drill, target, and check names), row counts,
schema values, and secrets. Use its configuration fingerprint to correlate it
with a local drill file.

## Configuration API (v1)

- `target.isolated` must be `true`; target IDs containing production-like names
  are rejected. `--confirm` must match it exactly.
- `commands.prepare` is optional. `restore` and `cleanup` are required. Commands
  execute through the platform shell with inherited environment variables.
- `row_count` requires integer stdout and accepts `min`/`max`; recorded evidence
  includes only pass/fail and duration.
- `schema` requires `contains`; `application` and `command` pass on exit code 0.
- `timeout_seconds` defaults to 900 per command and can be set on each check.
- `attestation_ttl_days` defaults to 30 and is included as `fresh_until`.

See [`examples/restore-drill.toml`](examples/restore-drill.toml) for a safe,
runnable local example.

## Develop and verify

```sh
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
cargo build --release
cargo package --allow-dirty
npm ci
npm test
npm run typecheck
npm run lint
npm run build       # CLI release build + static site -> dist/
npm run build:site  # static site only -> dist/site/
npm run test:e2e    # Chromium desktop + 390px mobile
```

Public product claims and their exact sandbox checks are listed in
[.factory/claims.json](.factory/claims.json).

The landing/docs site uses Vite and vanilla TypeScript. It has no analytics,
third-party runtime assets, or server-side data storage. License tokens for the
optional Operator Pack are stored locally and verified with Sociobot billing.

## Deploy

Factory deployment serves `dist/site` at
<https://restore-drill-attestor.sociobot.in>. Registry and binary publishing are
performed by the factory; this repository does not contain credentials.

## Security and privacy

Keep the target disposable and isolated at the network and credential layers.
This tool verifies recovery mechanics; it does not store backups, provide
ransomware protection, or prove the semantic correctness of every row. Review
the generated attestation before sharing it. Report vulnerabilities privately
to `security@sociobot.in`.

## License

[MIT](LICENSE). See [CHANGELOG.md](CHANGELOG.md) for release history.
