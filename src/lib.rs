use chrono::{DateTime, Days, SecondsFormat, Utc};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

pub const DEFAULT_TIMEOUT_SECONDS: u64 = 900;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Config {
    pub version: u8,
    pub drill: Drill,
    pub target: Target,
    pub commands: Commands,
    pub checks: Vec<Check>,
    #[serde(default = "default_ttl")]
    pub attestation_ttl_days: u64,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Drill {
    pub name: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Target {
    pub id: String,
    pub isolated: bool,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Commands {
    pub prepare: Option<String>,
    pub restore: String,
    pub cleanup: String,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Check {
    pub name: String,
    pub kind: CheckKind,
    pub command: String,
    pub min: Option<i64>,
    pub max: Option<i64>,
    pub contains: Option<String>,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CheckKind {
    RowCount,
    Schema,
    Application,
    Command,
}

#[derive(Debug, Serialize)]
pub struct Attestation {
    pub schema_version: u8,
    pub attestation_id: String,
    pub tool: Tool,
    pub drill: String,
    pub target_id: String,
    pub config_sha256: String,
    pub started_at: String,
    pub completed_at: String,
    pub fresh_until: String,
    pub duration_ms: u128,
    pub status: Status,
    pub stages: Vec<StageEvidence>,
    pub checks: Vec<CheckEvidence>,
    pub privacy: &'static str,
}

#[derive(Debug, Serialize)]
pub struct Tool {
    pub name: &'static str,
    pub version: &'static str,
}

#[derive(Debug, Serialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    Passed,
    Failed,
    CleanupFailed,
}

#[derive(Debug, Serialize)]
pub struct StageEvidence {
    pub stage: &'static str,
    pub status: &'static str,
    pub duration_ms: u128,
}

#[derive(Debug, Serialize)]
pub struct CheckEvidence {
    pub name: String,
    pub kind: CheckKind,
    pub status: &'static str,
    pub duration_ms: u128,
}

#[derive(Debug)]
pub struct RunResult {
    pub attestation: Attestation,
    pub path: PathBuf,
}

#[derive(Debug)]
pub enum Error {
    Config(String),
    Io(String),
}

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Config(message) => write!(f, "{message}"),
            Self::Io(message) => write!(f, "{message}"),
        }
    }
}

impl std::error::Error for Error {}

fn default_ttl() -> u64 {
    30
}

fn default_timeout() -> u64 {
    DEFAULT_TIMEOUT_SECONDS
}

pub fn load_config(path: &Path) -> Result<(Config, String), Error> {
    let source = fs::read_to_string(path)
        .map_err(|error| Error::Io(format!("could not read {}: {error}", path.display())))?;
    let config: Config = toml::from_str(&source)
        .map_err(|error| Error::Config(format!("invalid configuration: {error}")))?;
    validate_config(&config)?;
    Ok((config, source))
}

pub fn validate_config(config: &Config) -> Result<(), Error> {
    if config.version != 1 {
        return Err(Error::Config(format!(
            "unsupported config version {}; expected 1",
            config.version
        )));
    }
    require_text("drill.name", &config.drill.name)?;
    require_text("target.id", &config.target.id)?;
    require_text("commands.restore", &config.commands.restore)?;
    require_text("commands.cleanup", &config.commands.cleanup)?;
    if !config.target.isolated {
        return Err(Error::Config(
            "target.isolated must be true; production and shared targets are refused".into(),
        ));
    }
    let target = config.target.id.to_ascii_lowercase();
    let risky = ["prod", "production", "live"]
        .iter()
        .any(|word| target.contains(word));
    if risky {
        return Err(Error::Config(
            "target.id looks production-like; use a clearly disposable drill target".into(),
        ));
    }
    if config.commands.timeout_seconds == 0 {
        return Err(Error::Config(
            "commands.timeout_seconds must be greater than zero".into(),
        ));
    }
    if config.checks.is_empty() {
        return Err(Error::Config(
            "at least one recovery check is required".into(),
        ));
    }
    if config.attestation_ttl_days == 0 {
        return Err(Error::Config(
            "attestation_ttl_days must be greater than zero".into(),
        ));
    }

    let mut names = HashSet::new();
    for check in &config.checks {
        require_text("checks[].name", &check.name)?;
        require_text("checks[].command", &check.command)?;
        if !names.insert(check.name.as_str()) {
            return Err(Error::Config(format!(
                "check name {:?} is duplicated",
                check.name
            )));
        }
        if check.timeout_seconds == 0 {
            return Err(Error::Config(format!(
                "check {:?} timeout_seconds must be greater than zero",
                check.name
            )));
        }
        match check.kind {
            CheckKind::RowCount => {
                if check.min.is_none() && check.max.is_none() {
                    return Err(Error::Config(format!(
                        "row_count check {:?} needs min, max, or both",
                        check.name
                    )));
                }
                if let (Some(min), Some(max)) = (check.min, check.max)
                    && min > max
                {
                    return Err(Error::Config(format!(
                        "row_count check {:?} has min greater than max",
                        check.name
                    )));
                }
            }
            CheckKind::Schema => {
                if check.contains.as_deref().is_none_or(str::is_empty) {
                    return Err(Error::Config(format!(
                        "schema check {:?} needs a non-empty contains value",
                        check.name
                    )));
                }
            }
            CheckKind::Application | CheckKind::Command => {
                if check.min.is_some() || check.max.is_some() || check.contains.is_some() {
                    return Err(Error::Config(format!(
                        "check {:?} has fields that do not apply to its kind",
                        check.name
                    )));
                }
            }
        }
    }
    Ok(())
}

fn require_text(field: &str, value: &str) -> Result<(), Error> {
    if value.trim().is_empty() {
        Err(Error::Config(format!("{field} must not be empty")))
    } else {
        Ok(())
    }
}

pub fn run(
    config: &Config,
    source: &str,
    confirmation: &str,
    output_dir: &Path,
) -> Result<RunResult, Error> {
    // Keep the destructive boundary inside the library API as well as the CLI's loader.
    validate_config(config)?;
    if confirmation != config.target.id {
        return Err(Error::Config(format!(
            "confirmation refused: --confirm must exactly equal target.id {:?}",
            config.target.id
        )));
    }

    let started_at = Utc::now();
    let run_timer = Instant::now();
    let mut stages = Vec::new();
    let mut checks = Vec::new();
    let mut failed = false;
    let mut should_cleanup = false;

    if let Some(prepare) = &config.commands.prepare {
        should_cleanup = true;
        let result = run_command(prepare, config.commands.timeout_seconds)?;
        stages.push(stage("prepare", &result));
        if !result.success {
            failed = true;
        }
    }

    if !failed {
        should_cleanup = true;
        let result = run_command(&config.commands.restore, config.commands.timeout_seconds)?;
        stages.push(stage("restore", &result));
        if !result.success {
            failed = true;
        }
    }

    if !failed {
        for check in &config.checks {
            let result = run_command(&check.command, check.timeout_seconds)?;
            let passed = check_passed(check, &result);
            checks.push(CheckEvidence {
                name: check.name.clone(),
                kind: check.kind,
                status: if passed { "passed" } else { "failed" },
                duration_ms: result.duration_ms,
            });
            if !passed {
                failed = true;
            }
        }
    }

    let cleanup_result = if should_cleanup {
        run_command(&config.commands.cleanup, config.commands.timeout_seconds)?
    } else {
        CommandResult::skipped()
    };
    stages.push(stage("cleanup", &cleanup_result));

    let status = if !cleanup_result.success {
        Status::CleanupFailed
    } else if failed {
        Status::Failed
    } else {
        Status::Passed
    };
    let completed_at = Utc::now();
    let fresh_until = completed_at
        .checked_add_days(Days::new(config.attestation_ttl_days))
        .unwrap_or(completed_at);
    let config_hash = format!("{:x}", Sha256::digest(source.as_bytes()));
    let timestamp = started_at.format("%Y%m%dT%H%M%SZ").to_string();
    let attestation_id = format!("{}-{timestamp}", slug(&config.drill.name));
    let mut attestation = Attestation {
        schema_version: 1,
        attestation_id: attestation_id.clone(),
        tool: Tool {
            name: "restore-drill-attestor",
            version: env!("CARGO_PKG_VERSION"),
        },
        drill: config.drill.name.clone(),
        target_id: config.target.id.clone(),
        config_sha256: config_hash,
        started_at: timestamp_string(started_at),
        completed_at: timestamp_string(completed_at),
        fresh_until: timestamp_string(fresh_until),
        duration_ms: run_timer.elapsed().as_millis(),
        status,
        stages,
        checks,
        privacy: "No commands, stdout, stderr, query results, schema values, or secrets recorded.",
    };
    let path = write_attestation(output_dir, &mut attestation)?;
    Ok(RunResult { attestation, path })
}

fn timestamp_string(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(SecondsFormat::Secs, true)
}

fn slug(value: &str) -> String {
    let slug: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect();
    slug.split('-')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn write_attestation(output_dir: &Path, attestation: &mut Attestation) -> Result<PathBuf, Error> {
    fs::create_dir_all(output_dir).map_err(|error| {
        Error::Io(format!(
            "could not create output directory {}: {error}",
            output_dir.display()
        ))
    })?;
    let base_id = attestation.attestation_id.clone();
    for sequence in 1_u32.. {
        let candidate_id = if sequence == 1 {
            base_id.clone()
        } else {
            format!("{base_id}-{sequence}")
        };
        let path = output_dir.join(format!("{candidate_id}.json"));
        let file = OpenOptions::new().write(true).create_new(true).open(&path);
        let mut file = match file {
            Ok(file) => file,
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(Error::Io(format!(
                    "could not create attestation {}: {error}",
                    path.display()
                )));
            }
        };

        attestation.attestation_id = candidate_id;
        let write_result = serde_json::to_writer_pretty(&mut file, attestation)
            .map_err(|error| Error::Io(format!("could not serialize attestation: {error}")))
            .and_then(|()| {
                file.write_all(b"\n")
                    .and_then(|()| file.sync_all())
                    .map_err(|error| {
                        Error::Io(format!(
                            "could not write attestation {}: {error}",
                            path.display()
                        ))
                    })
            });
        if let Err(error) = write_result {
            let _ = fs::remove_file(&path);
            return Err(error);
        }
        return Ok(path);
    }
    unreachable!("attestation sequence space exhausted")
}

struct CommandResult {
    success: bool,
    stdout: Vec<u8>,
    duration_ms: u128,
    timed_out: bool,
}

impl CommandResult {
    fn skipped() -> Self {
        Self {
            success: true,
            stdout: Vec::new(),
            duration_ms: 0,
            timed_out: false,
        }
    }
}

fn run_command(command: &str, timeout_seconds: u64) -> Result<CommandResult, Error> {
    let started = Instant::now();
    let mut process = shell_command(command);
    let mut child = process
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|error| Error::Io(format!("could not start drill command: {error}")))?;
    let stdout = child.stdout.take();
    let output_reader = thread::spawn(move || {
        let mut bytes = Vec::new();
        if let Some(mut output) = stdout {
            io::Read::read_to_end(&mut output, &mut bytes)?;
        }
        Ok::<Vec<u8>, io::Error>(bytes)
    });
    let deadline = Instant::now() + Duration::from_secs(timeout_seconds);
    let (success, timed_out) = loop {
        match child.try_wait() {
            Ok(Some(status)) => break (status.success(), false),
            Ok(None) if Instant::now() < deadline => thread::sleep(Duration::from_millis(25)),
            Ok(None) => {
                terminate_process(&mut child);
                let _ = child.wait();
                break (false, true);
            }
            Err(error) => {
                terminate_process(&mut child);
                return Err(Error::Io(format!(
                    "could not monitor drill command: {error}"
                )));
            }
        }
    };
    let stdout = output_reader
        .join()
        .map_err(|_| Error::Io("could not join command output reader".into()))?
        .map_err(|error| Error::Io(format!("could not read check result: {error}")))?;
    Ok(CommandResult {
        success,
        stdout,
        duration_ms: started.elapsed().as_millis(),
        timed_out,
    })
}

#[cfg(unix)]
fn shell_command(command: &str) -> Command {
    use std::os::unix::process::CommandExt;
    let mut process = Command::new("/bin/sh");
    process.arg("-c").arg(command);
    process.process_group(0);
    process
}

#[cfg(windows)]
fn shell_command(command: &str) -> Command {
    let mut process = Command::new("cmd.exe");
    process.arg("/C").arg(command);
    process
}

#[cfg(unix)]
fn terminate_process(child: &mut std::process::Child) {
    // The shell is the process-group leader, so this also terminates commands it started.
    unsafe {
        libc::kill(-(child.id() as i32), libc::SIGKILL);
    }
}

#[cfg(windows)]
fn terminate_process(child: &mut std::process::Child) {
    let _ = child.kill();
}

fn stage(name: &'static str, result: &CommandResult) -> StageEvidence {
    StageEvidence {
        stage: name,
        status: if result.timed_out {
            "timed_out"
        } else if result.success {
            "passed"
        } else {
            "failed"
        },
        duration_ms: result.duration_ms,
    }
}

fn check_passed(check: &Check, result: &CommandResult) -> bool {
    if !result.success || result.timed_out {
        return false;
    }
    match check.kind {
        CheckKind::Application | CheckKind::Command => true,
        CheckKind::Schema => std::str::from_utf8(&result.stdout)
            .ok()
            .zip(check.contains.as_deref())
            .is_some_and(|(output, expected)| output.contains(expected)),
        CheckKind::RowCount => std::str::from_utf8(&result.stdout)
            .ok()
            .and_then(|output| output.trim().parse::<i64>().ok())
            .is_some_and(|count| {
                check.min.is_none_or(|min| count >= min) && check.max.is_none_or(|max| count <= max)
            }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn config(source: &str) -> Config {
        toml::from_str(source).expect("test config should parse")
    }

    const VALID: &str = r#"
version = 1
attestation_ttl_days = 30
[drill]
name = "test database"
[target]
id = "local-drill"
isolated = true
[commands]
prepare = "true"
restore = "true"
cleanup = "true"
timeout_seconds = 2
[[checks]]
name = "rows"
kind = "row_count"
command = "printf '12\\n'"
min = 1
timeout_seconds = 2
[[checks]]
name = "schema"
kind = "schema"
command = "printf 'migration-202608\\n'"
contains = "202608"
timeout_seconds = 2
[[checks]]
name = "app"
kind = "application"
command = "true"
timeout_seconds = 2
"#;

    #[test]
    fn documented_kinds_validate_and_run_without_leaking_values() {
        let cfg = config(VALID);
        validate_config(&cfg).unwrap();
        let directory = tempfile::tempdir().unwrap();
        let result = run(&cfg, VALID, "local-drill", directory.path()).unwrap();
        assert_eq!(result.attestation.status, Status::Passed);
        let evidence = fs::read_to_string(result.path).unwrap();
        assert!(!evidence.contains("migration-202608"));
        assert!(!evidence.contains("printf"));
        assert!(!evidence.contains("12\\n"));
    }

    #[test]
    fn refuses_non_isolated_and_production_named_targets() {
        let mut cfg = config(VALID);
        cfg.target.isolated = false;
        assert!(validate_config(&cfg).is_err());
        cfg.target.isolated = true;
        cfg.target.id = "customer-production".into();
        assert!(validate_config(&cfg).is_err());
    }

    #[test]
    fn refuses_concatenated_production_named_targets() {
        for target in ["production01", "prodwest", "livedb", "myproductionbackup"] {
            let mut cfg = config(VALID);
            cfg.target.id = target.into();
            let error = validate_config(&cfg).unwrap_err();
            assert!(
                error.to_string().contains("production-like"),
                "unexpected error for {target}: {error}"
            );
        }
    }

    #[test]
    fn exact_confirmation_is_mandatory() {
        let cfg = config(VALID);
        let directory = tempfile::tempdir().unwrap();
        let error = run(&cfg, VALID, "almost-local-drill", directory.path()).unwrap_err();
        assert!(error.to_string().contains("exactly equal"));
    }

    #[test]
    fn cleanup_runs_after_restore_failure_and_attestation_is_written() {
        let source = VALID.replace("restore = \"true\"", "restore = \"false\"");
        let cfg = config(&source);
        let directory = tempfile::tempdir().unwrap();
        let result = run(&cfg, &source, "local-drill", directory.path()).unwrap();
        assert_eq!(result.attestation.status, Status::Failed);
        assert_eq!(result.attestation.stages.last().unwrap().stage, "cleanup");
        assert_eq!(result.attestation.stages.last().unwrap().status, "passed");
    }

    #[test]
    fn immediate_runs_keep_distinct_attestations() {
        let cfg = config(VALID);
        let directory = tempfile::tempdir().unwrap();
        let first = run(&cfg, VALID, "local-drill", directory.path()).unwrap();
        let second = run(&cfg, VALID, "local-drill", directory.path()).unwrap();

        assert_ne!(first.path, second.path);
        assert_ne!(
            first.attestation.attestation_id,
            second.attestation.attestation_id
        );
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 2);
    }

    #[test]
    fn concurrent_runs_keep_distinct_attestations() {
        let cfg = config(VALID);
        let directory = tempfile::tempdir().unwrap();
        let paths = thread::scope(|scope| {
            let first = scope.spawn(|| run(&cfg, VALID, "local-drill", directory.path()).unwrap());
            let second = scope.spawn(|| run(&cfg, VALID, "local-drill", directory.path()).unwrap());
            [first.join().unwrap().path, second.join().unwrap().path]
        });

        assert_ne!(paths[0], paths[1]);
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 2);
    }

    #[test]
    fn command_capture_does_not_deadlock_on_large_output() {
        let result = run_command("dd if=/dev/zero bs=1024 count=256 2>/dev/null", 2).unwrap();
        assert!(result.success);
        assert_eq!(result.stdout.len(), 262_144);
    }

    #[test]
    fn command_timeout_is_recorded() {
        let result = run_command("sleep 2", 1).unwrap();
        assert!(!result.success);
        assert!(result.timed_out);
        assert!(result.duration_ms < 1_800);
    }
}
