use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use tracing::info;

pub struct SandboxExecutionPolicy {
    pub level: String, // "read-only", "workspace-write", "full-access"
    pub network_enabled: bool,
    pub turbo_mode: bool,
    pub allowed_hosts: Vec<String>,
}

pub struct JobObjectSandbox {
    audit_log_path: PathBuf,
}

impl Default for JobObjectSandbox {
    fn default() -> Self {
        Self::new()
    }
}

impl JobObjectSandbox {
    pub fn new() -> Self {
        let app_data = std::env::var("APPDATA")
            .unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".to_string());
        let audit_dir = PathBuf::from(app_data).join("SV Code Editor").join("logs");
        let _ = fs::create_dir_all(&audit_dir);
        let audit_log_path = audit_dir.join("audit.log");

        Self { audit_log_path }
    }

    pub fn log_audit_entry(&self, task_id: &str, action: &str, target: &str, status: &str) {
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&self.audit_log_path) {
            let timestamp = chrono::Utc::now().to_rfc3339();
            let _ = writeln!(
                file,
                "[{}] task_id={} action=\"{}\" target=\"{}\" status=\"{}\"",
                timestamp, task_id, action, target, status
            );
        }
    }

    /// Check if command matches destructive denylist
    pub fn check_destructive_denylist(&self, cmd_line: &str, workspace_root: &Path) -> Result<(), String> {
        let lower = cmd_line.to_lowercase();

        // 1. Recursive deletes outside workspace
        if lower.contains("rmdir /s") || lower.contains("rm -rf") || lower.contains("del /s") {
            let ws_str = workspace_root.to_string_lossy().to_lowercase();
            // Disallow root/drive deletions
            if (lower.contains("c:\\") || lower.contains("c:/") || lower.contains("/") || lower.contains(".."))
                && !lower.contains(&ws_str) {
                return Err("BLOCKED: Recursive delete targeting path outside workspace boundary".into());
            }
        }

        // 2. Disk formatting
        if lower.contains("format ") || lower.contains("diskpart") {
            return Err("BLOCKED: Destructive disk formatting or partitioning command detected".into());
        }

        // 3. Registry edits
        if lower.contains("reg add") || lower.contains("reg delete") || lower.contains("reg import") {
            return Err("BLOCKED: Unauthorized Windows Registry modification detected".into());
        }

        // 4. Credential access
        if lower.contains("cmdkey") || lower.contains("vaultcmd") || lower.contains("samdump") {
            return Err("BLOCKED: Credential enumeration / extraction command detected".into());
        }

        // 5. Force-pushes
        if lower.contains("git push") && (lower.contains("--force") || lower.contains("-f")) {
            return Err("BLOCKED: Destructive git force-push is disallowed in sandbox".into());
        }

        Ok(())
    }

    /// Execute a sandboxed command inside workspace
    pub fn execute_command(
        &self,
        task_id: &str,
        cmd_str: &str,
        workspace_root: &Path,
        policy: &SandboxExecutionPolicy,
    ) -> Result<(i32, String, String), String> {
        info!("Executing sandboxed command for task {}: {}", task_id, cmd_str);

        // Enforce Turbo mode constraints
        if policy.turbo_mode {
            if policy.level == "full-access" {
                return Err("TURBO MODE VIOLATION: Turbo mode is strictly forbidden in full-access mode".into());
            }
            if policy.network_enabled {
                return Err("TURBO MODE VIOLATION: Turbo mode is strictly forbidden when network access is enabled".into());
            }
        }

        // Enforce Read-Only constraint
        if policy.level == "read-only" {
            let lower = cmd_str.to_lowercase();
            if lower.contains("write") || lower.contains(">") || lower.contains("del") || lower.contains("mkdir") || lower.contains("rm") {
                self.log_audit_entry(task_id, "execute_command", cmd_str, "BLOCKED_READ_ONLY");
                return Err("BLOCKED: Sandbox policy is set to read-only".into());
            }
        }

        // Enforce Destructive Denylist
        if let Err(denylist_err) = self.check_destructive_denylist(cmd_str, workspace_root) {
            self.log_audit_entry(task_id, "execute_command", cmd_str, "BLOCKED_DENYLIST");
            return Err(denylist_err);
        }

        self.log_audit_entry(task_id, "execute_command", cmd_str, "STARTED");

        // Spawn powershell or cmd inside workspace root
        let mut cmd = Command::new("powershell.exe");
        cmd.current_dir(workspace_root)
            .args(["-NoProfile", "-NonInteractive", "-Command", cmd_str])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        let output = cmd.output().map_err(|e| {
            self.log_audit_entry(task_id, "execute_command", cmd_str, "SPAWN_FAILED");
            format!("Process spawn error: {}", e)
        })?;

        let code = output.status.code().unwrap_or(-1);
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();

        let status_text = if code == 0 { "SUCCESS" } else { "FAILED" };
        self.log_audit_entry(task_id, "execute_command", cmd_str, status_text);

        Ok((code, stdout, stderr))
    }
}

