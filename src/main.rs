use clap::{Parser, Subcommand};
use restore_drill_attestor::{Error, Status, load_config, run};
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Parser)]
#[command(
    name = "restore-drill",
    version,
    about = "Restore a backup, verify it, destroy the target, and retain proof",
    long_about = "Runs existing restore tooling only against a declared isolated target. Every run requires an exact target confirmation, always attempts cleanup, and writes an attestation without command output or data values."
)]
struct Cli {
    #[command(subcommand)]
    command: Action,
}

#[derive(Subcommand)]
enum Action {
    /// Run the bundled sample drill in a new temporary sandbox
    Demo {
        /// Print machine-readable output
        #[arg(long)]
        json: bool,
    },
    /// Validate a drill file without executing any command
    Validate {
        /// TOML drill configuration
        #[arg(short, long, default_value = "restore-drill.toml")]
        config: PathBuf,
        /// Print machine-readable output
        #[arg(long)]
        json: bool,
    },
    /// Run a restore drill and write a privacy-safe attestation
    Run {
        /// TOML drill configuration
        #[arg(short, long, default_value = "restore-drill.toml")]
        config: PathBuf,
        /// Exact target.id acknowledgement (required; no interactive bypass)
        #[arg(long)]
        confirm: String,
        /// Directory for timestamped JSON attestations
        #[arg(short, long, default_value = "attestations")]
        output: PathBuf,
        /// Print machine-readable output
        #[arg(long)]
        json: bool,
    },
}

fn main() -> ExitCode {
    let cli = Cli::parse();
    let json = cli.wants_json();
    match execute(cli) {
        Ok(code) => ExitCode::from(code),
        Err(error) => {
            let exit_code = match error {
                Error::Config(_) => 2,
                Error::Io(_) => 3,
            };
            if json {
                let kind = match error {
                    Error::Config(_) => "configuration",
                    Error::Io(_) => "io",
                };
                eprintln!(
                    "{}",
                    json!({
                        "ok": false,
                        "error": { "kind": kind, "message": error.to_string() },
                        "exit_code": exit_code
                    })
                );
            } else {
                eprintln!("restore-drill: {error}");
            }
            ExitCode::from(exit_code)
        }
    }
}

impl Cli {
    fn wants_json(&self) -> bool {
        match &self.command {
            Action::Demo { json } | Action::Validate { json, .. } | Action::Run { json, .. } => {
                *json
            }
        }
    }
}

fn execute(cli: Cli) -> Result<u8, Error> {
    match cli.command {
        Action::Demo { json } => run_demo(json),
        Action::Validate { config, json } => {
            let (config, _) = load_config(&config)?;
            if json {
                println!(
                    "{}",
                    json!({"valid": true, "drill": config.drill.name, "target_id": config.target.id})
                );
            } else {
                println!(
                    "Valid: {:?} targets isolated {:?}",
                    config.drill.name, config.target.id
                );
            }
            Ok(0)
        }
        Action::Run {
            config,
            confirm,
            output,
            json,
        } => {
            let (config, source) = load_config(&config)?;
            let result = run(&config, &source, &confirm, &output)?;
            if json {
                println!(
                    "{}",
                    json!({
                        "status": result.attestation.status,
                        "attestation_id": result.attestation.attestation_id,
                        "path": result.path,
                        "duration_ms": result.attestation.duration_ms
                    })
                );
            } else {
                println!(
                    "{}: attestation written to {}",
                    match result.attestation.status {
                        Status::Passed => "PASSED",
                        Status::Failed => "FAILED",
                        Status::CleanupFailed => "CLEANUP FAILED",
                    },
                    result.path.display()
                );
                if result.attestation.status != Status::Passed {
                    eprintln!(
                        "Command output was suppressed to avoid leaking restored data or secrets."
                    );
                }
            }
            Ok(match result.attestation.status {
                Status::Passed => 0,
                Status::Failed => 3,
                Status::CleanupFailed => 4,
            })
        }
    }
}

fn run_demo(json_output: bool) -> Result<u8, Error> {
    const SAMPLE: &str = include_str!("../examples/demo-backup.tsv");
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| Error::Io(format!("could not create demo timestamp: {error}")))?
        .as_nanos();
    let sandbox = std::env::temp_dir().join(format!(
        "restore-drill-attestor-demo-{}-{nonce}",
        std::process::id()
    ));
    let sample = sandbox.join("bundled-backup.tsv");
    let target = sandbox.join("disposable-target");
    let evidence = sandbox.join("attestations");
    let config_path = sandbox.join("restore-drill.toml");
    fs::create_dir_all(&sandbox).map_err(|error| {
        Error::Io(format!(
            "could not create demo sandbox {}: {error}",
            sandbox.display()
        ))
    })?;
    fs::write(&sample, SAMPLE).map_err(|error| {
        Error::Io(format!(
            "could not write bundled sample {}: {error}",
            sample.display()
        ))
    })?;

    let target_id = format!("sample-target-{}-{nonce}", std::process::id());
    let source = demo_config(&target_id, &sample, &target);
    fs::write(&config_path, &source).map_err(|error| {
        Error::Io(format!(
            "could not write demo configuration {}: {error}",
            config_path.display()
        ))
    })?;
    let (config, source) = load_config(&config_path)?;
    let result = run(&config, &source, &target_id, &evidence)?;
    let passed = result.attestation.status == Status::Passed;

    if json_output {
        println!(
            "{}",
            json!({
                "demo": true,
                "status": result.attestation.status,
                "attestation_id": result.attestation.attestation_id,
                "path": result.path,
                "sandbox": sandbox,
                "sample": sample,
                "target_removed": !target.exists(),
                "real_data_touched": false
            })
        );
    } else {
        println!("Demo — bundled sample data in a new temporary sandbox.");
        println!("Sample: {}", sample.display());
        println!(
            "{}: restore, 3 checks, and cleanup completed.",
            if passed { "PASSED" } else { "FAILED" }
        );
        println!("Evidence: {}", result.path.display());
        println!("Sandbox: {}", sandbox.display());
        println!("No existing configuration, backup, or target was read or changed.");
    }
    Ok(if passed { 0 } else { 3 })
}

#[cfg(unix)]
fn demo_config(target_id: &str, sample: &std::path::Path, target: &std::path::Path) -> String {
    let sample = shell_quote(sample);
    let target = shell_quote(target);
    format!(
        r#"version = 1
attestation_ttl_days = 30

[drill]
name = "bundled customer database sample"

[target]
id = "{target_id}"
isolated = true

[commands]
prepare = "mkdir -p {target}"
restore = "cp {sample} {target}/restored.tsv"
cleanup = "rm -rf {target}"
timeout_seconds = 10

[[checks]]
name = "three customer records restored"
kind = "row_count"
command = "awk 'END {{ print NR - 1 }}' {target}/restored.tsv"
min = 3
max = 3
timeout_seconds = 10

[[checks]]
name = "expected customer schema exists"
kind = "schema"
command = "head -n 1 {target}/restored.tsv"
contains = "account_id"
timeout_seconds = 10

[[checks]]
name = "restored application record is readable"
kind = "application"
command = "grep -q 'acme-garden' {target}/restored.tsv"
timeout_seconds = 10
"#
    )
}

#[cfg(windows)]
fn demo_config(target_id: &str, sample: &std::path::Path, target: &std::path::Path) -> String {
    let sample = shell_quote(sample);
    let target = shell_quote(target);
    format!(
        r#"version = 1
attestation_ttl_days = 30
[drill]
name = "bundled customer database sample"
[target]
id = "{target_id}"
isolated = true
[commands]
prepare = "mkdir {target}"
restore = "copy {sample} {target}\\restored.tsv"
cleanup = "rmdir /s /q {target}"
timeout_seconds = 10
[[checks]]
name = "sample restored"
kind = "application"
command = "findstr /c:acme-garden {target}\\restored.tsv"
timeout_seconds = 10
"#
    )
}

#[cfg(unix)]
fn shell_quote(path: &std::path::Path) -> String {
    format!("'{}'", path.to_string_lossy().replace('\'', "'\\''"))
}

#[cfg(windows)]
fn shell_quote(path: &std::path::Path) -> String {
    format!("\"{}\"", path.display())
}
