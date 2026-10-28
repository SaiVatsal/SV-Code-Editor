use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspServerInfo {
    pub language: String,
    pub command: String,
    pub available: bool,
    pub running: bool,
    pub last_used_seconds_ago: u64,
}

pub struct ActiveLspInstance {
    pub child: Child,
    pub last_activity: Instant,
}

pub struct LspService {
    active_instances: Arc<Mutex<HashMap<String, ActiveLspInstance>>>,
}

impl Default for LspService {
    fn default() -> Self {
        Self::new()
    }
}

impl LspService {
    pub fn new() -> Self {
        Self {
            active_instances: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Discover which language servers are installed on PATH
    pub fn discover_servers(&self) -> Vec<LspServerInfo> {
        let servers = [
            ("typescript", "typescript-language-server"),
            ("python", "pyright"),
            ("rust", "rust-analyzer"),
            ("cpp", "clangd"),
        ];

        let mut res = Vec::new();
        for (lang, cmd) in servers {
            let available = which::which(cmd).is_ok();
            res.push(LspServerInfo {
                language: lang.into(),
                command: cmd.into(),
                available,
                running: false,
                last_used_seconds_ago: 0,
            });
        }
        res
    }

    /// Start a language server for a given language
    pub async fn start_server(
        &self,
        language: &str,
        workspace_root: &Path,
        single_server_mode: bool,
    ) -> Result<(), String> {
        let mut lock = self.active_instances.lock().await;

        if single_server_mode {
            // Stop all other running language servers in Lite mode
            for (lang, mut instance) in lock.drain() {
                info!("Stopping idle LSP server for {} (single-server mode)", lang);
                let _ = instance.child.kill();
            }
        }

        let cmd_name = match language {
            "typescript" | "javascript" => "typescript-language-server",
            "python" => "pyright-langserver",
            "rust" => "rust-analyzer",
            "c" | "cpp" => "clangd",
            _ => return Err(format!("Unsupported LSP language: {}", language)),
        };

        if !which::which(cmd_name).is_ok() {
            warn!("LSP binary {} not found on system PATH", cmd_name);
            return Err(format!("Language server '{}' is not installed on system PATH", cmd_name));
        }

        let mut cmd = Command::new(cmd_name);
        cmd.current_dir(workspace_root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if cmd_name == "typescript-language-server" {
            cmd.arg("--stdio");
        }

        let child = cmd.spawn().map_err(|e| format!("Failed to spawn {}: {}", cmd_name, e))?;
        info!("Started LSP server for {} (command: {})", language, cmd_name);

        lock.insert(
            language.to_string(),
            ActiveLspInstance {
                child,
                last_activity: Instant::now(),
            },
        );

        Ok(())
    }

    /// Stop an LSP server
    pub async fn stop_server(&self, language: &str) -> Result<(), String> {
        let mut lock = self.active_instances.lock().await;
        if let Some(mut instance) = lock.remove(language) {
            let _ = instance.child.kill();
            info!("Stopped LSP server for {}", language);
            Ok(())
        } else {
            Err(format!("No running LSP instance for {}", language))
        }
    }

    /// Stop all idle language servers that haven't been used in 5 minutes
    pub async fn prune_idle_servers(&self, idle_timeout_secs: u64) {
        let mut lock = self.active_instances.lock().await;
        let mut to_remove = Vec::new();

        for (lang, instance) in lock.iter() {
            if instance.last_activity.elapsed().as_secs() >= idle_timeout_secs {
                to_remove.push(lang.clone());
            }
        }

        for lang in to_remove {
            if let Some(mut inst) = lock.remove(&lang) {
                info!("Pruned idle LSP server for {}", lang);
                let _ = inst.child.kill();
            }
        }
    }
}

