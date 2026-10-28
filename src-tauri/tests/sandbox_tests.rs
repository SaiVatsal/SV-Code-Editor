use std::fs;
use sv_code_editor_lib::services::job_object::{JobObjectSandbox, SandboxExecutionPolicy};

#[test]
fn test_sandbox_destructive_denylist_blocks_root_deletion() {
    let sandbox = JobObjectSandbox::new();
    let temp_workspace = std::env::temp_dir().join("svcode_test_ws_denylist");
    let _ = fs::create_dir_all(&temp_workspace);

    // Root disk deletion must be blocked
    let res = sandbox.check_destructive_denylist("rmdir /s /q C:\\", &temp_workspace);
    assert!(res.is_err(), "Should block rmdir /s /q C:\\");
    assert!(res.unwrap_err().contains("BLOCKED: Recursive delete"));

    // rm -rf / must be blocked
    let res2 = sandbox.check_destructive_denylist("rm -rf /", &temp_workspace);
    assert!(res2.is_err(), "Should block rm -rf /");

    // del /s C:\Windows must be blocked
    let res3 = sandbox.check_destructive_denylist("del /s /q C:\\Windows\\System32", &temp_workspace);
    assert!(res3.is_err(), "Should block del /s on system dir");

    // Clean up
    let _ = fs::remove_dir_all(&temp_workspace);
}

#[test]
fn test_sandbox_destructive_denylist_blocks_formatting_and_registry() {
    let sandbox = JobObjectSandbox::new();
    let temp_workspace = std::env::temp_dir().join("svcode_test_ws_format");
    let _ = fs::create_dir_all(&temp_workspace);

    // Format disk
    let res1 = sandbox.check_destructive_denylist("format D: /fs:NTFS /q", &temp_workspace);
    assert!(res1.is_err(), "Should block disk formatting");
    assert!(res1.unwrap_err().contains("disk formatting"));

    // Registry editing
    let res2 = sandbox.check_destructive_denylist("reg add HKLM\\Software\\Test", &temp_workspace);
    assert!(res2.is_err(), "Should block registry modification");

    // Credential dumping
    let res3 = sandbox.check_destructive_denylist("cmdkey /list", &temp_workspace);
    assert!(res3.is_err(), "Should block credential enumeration");

    // Git force push
    let res4 = sandbox.check_destructive_denylist("git push origin main --force", &temp_workspace);
    assert!(res4.is_err(), "Should block git force-push");

    let _ = fs::remove_dir_all(&temp_workspace);
}

#[test]
fn test_sandbox_turbo_mode_guardrails() {
    let sandbox = JobObjectSandbox::new();
    let temp_workspace = std::env::temp_dir().join("svcode_test_ws_turbo");
    let _ = fs::create_dir_all(&temp_workspace);

    // Turbo mode with full-access must be rejected
    let policy_full_access = SandboxExecutionPolicy {
        level: "full-access".to_string(),
        network_enabled: false,
        turbo_mode: true,
        allowed_hosts: vec![],
    };
    let res = sandbox.execute_command("task-test-turbo", "echo 1", &temp_workspace, &policy_full_access);
    assert!(res.is_err(), "Turbo mode cannot be used with full-access");
    assert!(res.unwrap_err().contains("TURBO MODE VIOLATION"));

    // Turbo mode with network must be rejected
    let policy_network = SandboxExecutionPolicy {
        level: "workspace-write".to_string(),
        network_enabled: true,
        turbo_mode: true,
        allowed_hosts: vec!["api.openai.com".into()],
    };
    let res2 = sandbox.execute_command("task-test-turbo", "echo 1", &temp_workspace, &policy_network);
    assert!(res2.is_err(), "Turbo mode cannot be used with network enabled");
    assert!(res2.unwrap_err().contains("TURBO MODE VIOLATION"));

    let _ = fs::remove_dir_all(&temp_workspace);
}

#[test]
fn test_sandbox_read_only_policy_blocks_writes() {
    let sandbox = JobObjectSandbox::new();
    let temp_workspace = std::env::temp_dir().join("svcode_test_ws_ro");
    let _ = fs::create_dir_all(&temp_workspace);

    let policy_ro = SandboxExecutionPolicy {
        level: "read-only".to_string(),
        network_enabled: false,
        turbo_mode: false,
        allowed_hosts: vec![],
    };

    let res = sandbox.execute_command("task-test-ro", "echo hi > file.txt", &temp_workspace, &policy_ro);
    assert!(res.is_err(), "Read-only mode must block output redirection / write operations");

    let _ = fs::remove_dir_all(&temp_workspace);
}
