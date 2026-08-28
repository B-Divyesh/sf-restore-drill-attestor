use serde_json::Value;
use std::fs;
use std::process::Command;

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
