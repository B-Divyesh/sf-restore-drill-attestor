use serde_json::Value;
use std::fs;
use std::process::{Command, Stdio};
use std::thread;
use std::time::{Duration, Instant};

#[test]
fn demo_command_runs_bundled_sample_in_a_temporary_sandbox() {
    let consumer_directory = tempfile::tempdir().unwrap();
    let sentinel = consumer_directory.path().join("existing-user-data");
    fs::write(&sentinel, "untouched").unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["demo", "--json"])
        .current_dir(consumer_directory.path())
        .output()
        .unwrap();

    assert_eq!(
        output.status.code(),
        Some(0),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(output.stderr.is_empty());
    let result: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["demo"], true);
    assert_eq!(result["status"], "passed");
    assert_eq!(result["target_removed"], true);
    assert_eq!(result["real_data_touched"], false);
    assert_eq!(fs::read_to_string(&sentinel).unwrap(), "untouched");

    let sandbox = std::path::PathBuf::from(result["sandbox"].as_str().unwrap());
    let evidence_path = std::path::PathBuf::from(result["path"].as_str().unwrap());
    assert!(sandbox.starts_with(std::env::temp_dir()));
    assert!(evidence_path.starts_with(&sandbox));
    assert!(evidence_path.is_file());
    assert!(!sandbox.join("disposable-target").exists());

    let evidence = fs::read_to_string(&evidence_path).unwrap();
    assert!(!evidence.contains("acme-garden"));
    assert!(!evidence.contains("customer database"));
    assert!(!evidence.contains("account_id"));
    fs::remove_dir_all(sandbox).unwrap();
}

#[test]
fn unsafe_validate_error_is_machine_readable_in_json_mode() {
    let directory = tempfile::tempdir().unwrap();
    let config = directory.path().join("unsafe.toml");
    fs::write(
        &config,
        r#"version = 1
[drill]
name = "unsafe"
[target]
id = "production01"
isolated = true
[commands]
restore = "true"
cleanup = "true"
[[checks]]
name = "smoke"
kind = "command"
command = "true"
"#,
    )
    .unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["validate", "--json", "--config"])
        .arg(config)
        .output()
        .unwrap();

    assert_eq!(output.status.code(), Some(2));
    assert!(output.stdout.is_empty());
    let error: Value = serde_json::from_slice(&output.stderr).unwrap();
    assert_eq!(error["ok"], false);
    assert_eq!(error["exit_code"], 2);
    assert_eq!(error["error"]["kind"], "configuration");
    assert!(
        error["error"]["message"]
            .as_str()
            .unwrap()
            .contains("production-like")
    );
}

#[test]
fn unsafe_run_refuses_before_any_command_executes() {
    let directory = tempfile::tempdir().unwrap();
    let config = directory.path().join("unsafe.toml");
    let marker = directory.path().join("restore-ran");
    fs::write(
        &config,
        format!(
            r#"version = 1
[drill]
name = "unsafe"
[target]
id = "production01"
isolated = true
[commands]
restore = "touch {}"
cleanup = "true"
[[checks]]
name = "smoke"
kind = "command"
command = "true"
"#,
            marker.display()
        ),
    )
    .unwrap();

    let output = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["run", "--json", "--config"])
        .arg(config)
        .args(["--confirm", "production01", "--output"])
        .arg(directory.path().join("attestations"))
        .output()
        .unwrap();

    assert_eq!(output.status.code(), Some(2));
    assert!(!marker.exists(), "unsafe restore command must never run");
    let error: Value = serde_json::from_slice(&output.stderr).unwrap();
    assert_eq!(error["error"]["kind"], "configuration");
}

#[test]
fn concurrent_runs_for_one_target_refuse_before_second_commands_start() {
    let directory = tempfile::tempdir().unwrap();
    let config = directory.path().join("contended.toml");
    let marker = directory.path().join("first-restore-started");
    let target_state = directory.path().join("disposable-target");
    let attestations = directory.path().join("attestations");
    fs::write(
        &config,
        format!(
            r#"version = 1
[drill]
name = "contention"
[target]
id = "contention-safe-target"
isolated = true
[commands]
prepare = "mkdir -p {target_state}"
restore = "touch {marker}; sleep 2; touch {target_state}/restored"
cleanup = "rm -rf {target_state}"
timeout_seconds = 10
[[checks]]
name = "smoke"
kind = "command"
command = "test -f {target_state}/restored"
"#,
            marker = marker.display(),
            target_state = target_state.display(),
        ),
    )
    .unwrap();

    let first = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["run", "--json", "--config"])
        .arg(&config)
        .args(["--confirm", "contention-safe-target", "--output"])
        .arg(&attestations)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(3);
    while !marker.exists() && Instant::now() < deadline {
        thread::sleep(Duration::from_millis(20));
    }
    assert!(
        marker.exists(),
        "first run should hold the target lock before the second starts"
    );

    let second = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["run", "--json", "--config"])
        .arg(&config)
        .args(["--confirm", "contention-safe-target", "--output"])
        .arg(&attestations)
        .output()
        .unwrap();
    assert_eq!(second.status.code(), Some(2));
    let error: Value = serde_json::from_slice(&second.stderr).unwrap();
    assert_eq!(error["error"]["kind"], "configuration");
    assert!(
        error["error"]["message"]
            .as_str()
            .unwrap()
            .contains("already in use")
    );

    let first = first.wait_with_output().unwrap();
    assert_eq!(first.status.code(), Some(0));
    assert!(
        !target_state.exists(),
        "only the owning run cleans up the disposable target"
    );
    assert_eq!(fs::read_dir(&attestations).unwrap().count(), 1);
}

#[cfg(unix)]
#[test]
fn interrupted_run_kills_command_tree_keeps_lock_cleans_up_and_writes_evidence() {
    let directory = tempfile::tempdir().unwrap();
    let config = directory.path().join("interrupted.toml");
    let restore_started = directory.path().join("restore-started");
    let orphan_completed = directory.path().join("orphan-completed");
    let cleanup_started = directory.path().join("cleanup-started");
    let target_state = directory.path().join("disposable-target");
    let attestations = directory.path().join("attestations");
    fs::write(
        &config,
        format!(
            r#"version = 1
[drill]
name = "interrupt recovery"
[target]
id = "interrupt-safe-target"
isolated = true
[commands]
prepare = "mkdir -p {target_state}"
restore = "touch {restore_started}; sleep 2; touch {orphan_completed}"
cleanup = "touch {cleanup_started}; sleep 1; rm -rf {target_state}"
timeout_seconds = 10
[[checks]]
name = "smoke"
kind = "command"
command = "true"
"#,
            restore_started = restore_started.display(),
            orphan_completed = orphan_completed.display(),
            cleanup_started = cleanup_started.display(),
            target_state = target_state.display(),
        ),
    )
    .unwrap();

    let first = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["run", "--json", "--config"])
        .arg(&config)
        .args(["--confirm", "interrupt-safe-target", "--output"])
        .arg(&attestations)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    wait_for_path(&restore_started, "restore command did not start");

    unsafe {
        libc::kill(first.id() as i32, libc::SIGTERM);
    }
    wait_for_path(&cleanup_started, "cleanup did not start after SIGTERM");

    let second = Command::new(env!("CARGO_BIN_EXE_restore-drill"))
        .args(["run", "--json", "--config"])
        .arg(&config)
        .args(["--confirm", "interrupt-safe-target", "--output"])
        .arg(&attestations)
        .output()
        .unwrap();
    assert_eq!(second.status.code(), Some(2));
    assert!(String::from_utf8_lossy(&second.stderr).contains("already in use"));

    let first = first.wait_with_output().unwrap();
    assert_eq!(
        first.status.code(),
        Some(3),
        "{}",
        String::from_utf8_lossy(&first.stderr)
    );
    let summary: Value = serde_json::from_slice(&first.stdout).unwrap();
    assert_eq!(summary["status"], "failed");
    assert_eq!(summary["interrupted"], true);
    assert!(
        !target_state.exists(),
        "interrupt recovery must remove the target"
    );
    thread::sleep(Duration::from_millis(1_200));
    assert!(
        !orphan_completed.exists(),
        "the interrupted restore child must not survive"
    );

    let paths: Vec<_> = fs::read_dir(&attestations)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .collect();
    assert_eq!(paths.len(), 1);
    let evidence: Value = serde_json::from_slice(&fs::read(&paths[0]).unwrap()).unwrap();
    assert_eq!(evidence["status"], "failed");
    assert_eq!(evidence["interrupted"], true);
    assert_eq!(evidence["stages"][1]["stage"], "restore");
    assert_eq!(evidence["stages"][1]["status"], "interrupted");
    assert_eq!(
        evidence["stages"].as_array().unwrap().last().unwrap()["stage"],
        "cleanup"
    );
    assert_eq!(
        evidence["stages"].as_array().unwrap().last().unwrap()["status"],
        "passed"
    );
}

#[cfg(unix)]
fn wait_for_path(path: &std::path::Path, failure: &str) {
    let deadline = Instant::now() + Duration::from_secs(4);
    while !path.exists() && Instant::now() < deadline {
        thread::sleep(Duration::from_millis(20));
    }
    assert!(path.exists(), "{failure}");
}
