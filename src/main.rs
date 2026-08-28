use clap::{Parser, Subcommand};
use restore_drill_attestor::{Error, Status, load_config, run};
use serde_json::json;
use std::path::PathBuf;
use std::process::ExitCode;

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
    match execute() {
        Ok(code) => ExitCode::from(code),
        Err(error) => {
            eprintln!("restore-drill: {error}");
            ExitCode::from(match error {
                Error::Config(_) => 2,
                Error::Io(_) => 3,
            })
        }
    }
}

fn execute() -> Result<u8, Error> {
    match Cli::parse().command {
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
