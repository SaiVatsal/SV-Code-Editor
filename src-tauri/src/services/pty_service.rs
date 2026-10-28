use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalProfile {
    pub id: String,
    pub name: String,
    pub command: String,
    pub args: Vec<String>,
    pub available: bool,
}

pub struct PtySession {
    pub id: String,
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn Write + Send>,
}

pub struct PtyService {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

impl Default for PtyService {
    fn default() -> Self {
        Self::new()
    }
}

impl PtyService {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Discover available terminal shell profiles on Windows
    pub fn get_available_profiles(&self) -> Vec<TerminalProfile> {
        let mut profiles = Vec::new();

        // 1. Windows PowerShell
        let pwsh_available = which::which("powershell.exe").is_ok()
            || Path::new("C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe").exists();
        profiles.push(TerminalProfile {
            id: "powershell".into(),
            name: "PowerShell".into(),
            command: "powershell.exe".into(),
            args: vec!["-NoLogo".into()],
            available: pwsh_available,
        });

        // 2. Command Prompt
        let cmd_available = which::which("cmd.exe").is_ok()
            || Path::new("C:\\Windows\\System32\\cmd.exe").exists();
        profiles.push(TerminalProfile {
            id: "cmd".into(),
            name: "Command Prompt".into(),
            command: "cmd.exe".into(),
            args: vec![],
            available: cmd_available,
        });

        // 3. Git Bash (detect system git, never bundle it)
        let git_bash_path = Self::find_git_bash();
        profiles.push(TerminalProfile {
            id: "git-bash".into(),
            name: "Git Bash".into(),
            command: git_bash_path.as_ref().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| "bash.exe".into()),
            args: vec!["--login".into(), "-i".into()],
            available: git_bash_path.is_some(),
        });

        // 4. WSL
        let wsl_available = which::which("wsl.exe").is_ok()
            || Path::new("C:\\Windows\\System32\\wsl.exe").exists();
        profiles.push(TerminalProfile {
            id: "wsl".into(),
            name: "WSL".into(),
            command: "wsl.exe".into(),
            args: vec![],
            available: wsl_available,
        });

        profiles
    }

    fn find_git_bash() -> Option<PathBuf> {
        if let Ok(git_path) = which::which("git") {
            // Check adjacent or parent usr/bin/bash.exe or bin/bash.exe
            if let Some(parent) = git_path.parent() {
                let p1 = parent.join("bash.exe");
                if p1.exists() {
                    return Some(p1);
                }
                if let Some(grandparent) = parent.parent() {
                    let p2 = grandparent.join("bin").join("bash.exe");
                    if p2.exists() {
                        return Some(p2);
                    }
                    let p3 = grandparent.join("usr").join("bin").join("bash.exe");
                    if p3.exists() {
                        return Some(p3);
                    }
                }
            }
        }

        let common_paths = [
            "C:\\Program Files\\Git\\bin\\bash.exe",
            "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
        ];
        for p in &common_paths {
            let path = PathBuf::from(p);
            if path.exists() {
                return Some(path);
            }
        }

        None
    }

    /// Spawn a new PTY instance
    pub async fn spawn<F>(
        &self,
        id: String,
        profile_id: &str,
        cwd: &str,
        cols: u16,
        rows: u16,
        output_cb: F,
    ) -> Result<(), String>
    where
        F: Fn(String, Vec<u8>) + Send + Sync + 'static,
    {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Failed to open PTY: {}", e))?;

        let profiles = self.get_available_profiles();
        let selected_profile = profiles
            .into_iter()
            .find(|p| p.id == profile_id)
            .unwrap_or_else(|| TerminalProfile {
                id: "powershell".into(),
                name: "PowerShell".into(),
                command: "powershell.exe".into(),
                args: vec!["-NoLogo".into()],
                available: true,
            });

        let mut cmd = CommandBuilder::new(&selected_profile.command);
        for arg in &selected_profile.args {
            cmd.arg(arg);
        }

        if !cwd.is_empty() && Path::new(cwd).exists() {
            cmd.cwd(cwd);
        }

        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| format!("Failed to spawn shell process {}: {}", selected_profile.command, e))?;

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| format!("Failed to clone master reader: {}", e))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("Failed to take master writer: {}", e))?;

        let session_id_clone = id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break, // EOF
                    Ok(n) => {
                        output_cb(session_id_clone.clone(), buf[..n].to_vec());
                    }
                    Err(e) => {
                        error!("PTY reader error: {}", e);
                        break;
                    }
                }
            }
        });

        let session = PtySession {
            id: id.clone(),
            master: pair.master,
            writer,
        };

        let mut lock = self.sessions.lock().await;
        lock.insert(id, session);

        info!("Spawned PTY session successfully");
        Ok(())
    }

    pub async fn write(&self, id: &str, data: &[u8]) -> Result<(), String> {
        let mut lock = self.sessions.lock().await;
        if let Some(session) = lock.get_mut(id) {
            session
                .writer
                .write_all(data)
                .map_err(|e| format!("Write to PTY failed: {}", e))?;
            session.writer.flush().map_err(|e| format!("Flush failed: {}", e))?;
            Ok(())
        } else {
            Err(format!("PTY session {} not found", id))
        }
    }

    pub async fn resize(&self, id: &str, cols: u16, rows: u16) -> Result<(), String> {
        let lock = self.sessions.lock().await;
        if let Some(session) = lock.get(id) {
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| format!("Resize failed: {}", e))?;
            Ok(())
        } else {
            Err(format!("PTY session {} not found", id))
        }
    }

    pub async fn terminate(&self, id: &str) -> Result<(), String> {
        let mut lock = self.sessions.lock().await;
        if lock.remove(id).is_some() {
            info!("Terminated PTY session {}", id);
            Ok(())
        } else {
            Err(format!("PTY session {} not found", id))
        }
    }
}

