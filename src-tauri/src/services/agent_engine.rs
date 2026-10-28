use crate::models::{AgentTask, InboxItem};
use crate::services::job_object::{JobObjectSandbox, SandboxExecutionPolicy};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentCheckpoint {
    pub id: String,
    pub task_id: String,
    pub timestamp: String,
    pub description: String,
    pub modified_files: Vec<CheckpointFileState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckpointFileState {
    pub file_path: String,
    pub original_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallRequest {
    pub tool_name: String,
    pub arguments: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolCallResponse {
    pub success: bool,
    pub output: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstructionAuditEntry {
    pub file_path: String,
    pub size_bytes: u64,
    pub is_loaded: bool,
    pub layer: String, // "global", "project", "nested"
}

pub struct AgentEngine {
    tasks: Arc<Mutex<HashMap<String, AgentTask>>>,
    inbox: Arc<Mutex<Vec<InboxItem>>>,
    #[allow(dead_code)]
    checkpoints: Arc<Mutex<HashMap<String, Vec<AgentCheckpoint>>>>,
    sandbox: JobObjectSandbox,
}

impl Default for AgentEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl AgentEngine {
    pub fn new() -> Self {
        Self {
            tasks: Arc::new(Mutex::new(HashMap::new())),
            inbox: Arc::new(Mutex::new(Vec::new())),
            checkpoints: Arc::new(Mutex::new(HashMap::new())),
            sandbox: JobObjectSandbox::new(),
        }
    }

    pub async fn create_task(
        &self,
        title: &str,
        goal: &str,
        project_path: &str,
        mode: &str,
        sandbox_level: &str,
        model: &str,
    ) -> AgentTask {
        let id = format!("task-{}", &uuid::Uuid::new_v4().to_string()[..8]);
        let now = chrono::Utc::now().to_rfc3339();

        let task = AgentTask {
            id: id.clone(),
            title: title.to_string(),
            goal: goal.to_string(),
            status: "queued".to_string(),
            project_path: project_path.to_string(),
            branch: "main".to_string(),
            worktree_path: None,
            elapsed_seconds: 0,
            mode: mode.to_string(),
            sandbox_level: sandbox_level.to_string(),
            approval_policy: "risky-only".to_string(),
            model: model.to_string(),
            created_at: now.clone(),
            updated_at: now,
            sub_agent_count: 0,
        };

        let mut lock = self.tasks.lock().await;
        lock.insert(id.clone(), task.clone());
        info!("Created agent task {}: {}", id, title);
        task
    }

    pub async fn list_tasks(&self) -> Vec<AgentTask> {
        let lock = self.tasks.lock().await;
        lock.values().cloned().collect()
    }

    pub async fn get_task(&self, id: &str) -> Option<AgentTask> {
        let lock = self.tasks.lock().await;
        lock.get(id).cloned()
    }

    pub async fn update_task_status(&self, id: &str, status: &str) -> Result<(), String> {
        let mut lock = self.tasks.lock().await;
        if let Some(task) = lock.get_mut(id) {
            task.status = status.to_string();
            task.updated_at = chrono::Utc::now().to_rfc3339();
            Ok(())
        } else {
            Err(format!("Task {} not found", id))
        }
    }

    pub async fn list_inbox(&self) -> Vec<InboxItem> {
        let lock = self.inbox.lock().await;
        lock.clone()
    }

    pub async fn add_inbox_item(&self, task_id: &str, item_type: &str, title: &str, message: &str) {
        let item = InboxItem {
            id: format!("inbox-{}", &uuid::Uuid::new_v4().to_string()[..8]),
            task_id: task_id.to_string(),
            item_type: item_type.to_string(),
            title: title.to_string(),
            message: message.to_string(),
            details: None,
            status: "pending".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        let mut lock = self.inbox.lock().await;
        lock.push(item);
    }

    /// Load instruction files in hierarchy: SV.md, AGENTS.md, CLAUDE.md
    pub fn load_instructions_audit(&self, workspace_root: &Path) -> Vec<InstructionAuditEntry> {
        let mut entries = Vec::new();
        let target_names = ["SV.md", "AGENTS.md", "CLAUDE.md"];

        // Project root
        for name in &target_names {
            let path = workspace_root.join(name);
            let exists = path.exists();
            let size = if exists { fs::metadata(&path).map(|m| m.len()).unwrap_or(0) } else { 0 };
            entries.push(InstructionAuditEntry {
                file_path: path.to_string_lossy().to_string(),
                size_bytes: size,
                is_loaded: exists && size < 65536, // size cap 64KB
                layer: "project".into(),
            });
        }

        entries
    }

    /// Core tool executions
    pub fn execute_tool(
        &self,
        task_id: &str,
        workspace_root: &Path,
        tool_req: &ToolCallRequest,
    ) -> ToolCallResponse {
        let validate_path = |path_str: &str| -> Result<PathBuf, String> {
            if path_str.is_empty() {
                return Err("Path cannot be empty".into());
            }
            let target = if Path::new(path_str).is_absolute() {
                PathBuf::from(path_str)
            } else {
                workspace_root.join(path_str)
            };
            let ws_canon = workspace_root.canonicalize().unwrap_or_else(|_| workspace_root.to_path_buf());
            let target_canon = target.canonicalize().unwrap_or_else(|_| target.clone());
            if !target_canon.starts_with(&ws_canon) && !target.starts_with(workspace_root) {
                return Err(format!("Security Violation: Path '{}' traverses outside authorized workspace", path_str));
            }
            Ok(target)
        };

        match tool_req.tool_name.as_str() {
            "read_file" => {
                let path_str = tool_req.arguments.get("path").and_then(|v| v.as_str()).unwrap_or("");
                let full_path = match validate_path(path_str) {
                    Ok(p) => p,
                    Err(e) => {
                        return ToolCallResponse {
                            success: false,
                            output: "".into(),
                            error: Some(e),
                        };
                    }
                };
                match fs::read_to_string(&full_path) {
                    Ok(content) => ToolCallResponse {
                        success: true,
                        output: content,
                        error: None,
                    },
                    Err(e) => ToolCallResponse {
                        success: false,
                        output: "".into(),
                        error: Some(format!("Failed to read file {:?}: {}", full_path, e)),
                    },
                }
            }
            "write_file" => {
                let path_str = tool_req.arguments.get("path").and_then(|v| v.as_str()).unwrap_or("");
                let content = tool_req.arguments.get("content").and_then(|v| v.as_str()).unwrap_or("");
                let full_path = match validate_path(path_str) {
                    Ok(p) => p,
                    Err(e) => {
                        return ToolCallResponse {
                            success: false,
                            output: "".into(),
                            error: Some(e),
                        };
                    }
                };

                if let Some(parent) = full_path.parent() {
                    let _ = fs::create_dir_all(parent);
                }

                match fs::write(&full_path, content) {
                    Ok(_) => {
                        self.sandbox.log_audit_entry(task_id, "write_file", path_str, "SUCCESS");
                        ToolCallResponse {
                            success: true,
                            output: format!("Successfully wrote {} bytes to {}", content.len(), path_str),
                            error: None,
                        }
                    }
                    Err(e) => {
                        self.sandbox.log_audit_entry(task_id, "write_file", path_str, "FAILED");
                        ToolCallResponse {
                            success: false,
                            output: "".into(),
                            error: Some(format!("Failed to write file: {}", e)),
                        }
                    }
                }
            }
            "edit_file" => {
                let path_str = tool_req.arguments.get("path").and_then(|v| v.as_str()).unwrap_or("");
                let target = tool_req.arguments.get("target").and_then(|v| v.as_str()).unwrap_or("");
                let replacement = tool_req.arguments.get("replacement").and_then(|v| v.as_str()).unwrap_or("");
                let full_path = match validate_path(path_str) {
                    Ok(p) => p,
                    Err(e) => {
                        return ToolCallResponse {
                            success: false,
                            output: "".into(),
                            error: Some(e),
                        };
                    }
                };

                match fs::read_to_string(&full_path) {
                    Ok(current) => {
                        if !current.contains(target) {
                            return ToolCallResponse {
                                success: false,
                                output: "".into(),
                                error: Some(format!("Target string not found in {}", path_str)),
                            };
                        }
                        let updated = current.replacen(target, replacement, 1);
                        if let Err(e) = fs::write(&full_path, updated) {
                            return ToolCallResponse {
                                success: false,
                                output: "".into(),
                                error: Some(format!("Failed to write replacement: {}", e)),
                            };
                        }
                        self.sandbox.log_audit_entry(task_id, "edit_file", path_str, "SUCCESS");
                        ToolCallResponse {
                            success: true,
                            output: format!("Successfully replaced target in {}", path_str),
                            error: None,
                        }
                    }
                    Err(e) => ToolCallResponse {
                        success: false,
                        output: "".into(),
                        error: Some(format!("Failed to read file for editing: {}", e)),
                    },
                }
            }
            "bash" => {
                let command = tool_req.arguments.get("command").and_then(|v| v.as_str()).unwrap_or("");
                let policy = SandboxExecutionPolicy {
                    level: "workspace-write".into(),
                    network_enabled: false,
                    turbo_mode: false,
                    allowed_hosts: vec![],
                };

                match self.sandbox.execute_command(task_id, command, workspace_root, &policy) {
                    Ok((code, stdout, stderr)) => ToolCallResponse {
                        success: code == 0,
                        output: format!("{}\n{}", stdout, stderr).trim().to_string(),
                        error: if code != 0 { Some(format!("Exited with code {}", code)) } else { None },
                    },
                    Err(e) => ToolCallResponse {
                        success: false,
                        output: "".into(),
                        error: Some(e),
                    },
                }
            }
            _ => ToolCallResponse {
                success: false,
                output: "".into(),
                error: Some(format!("Tool {} not implemented in core", tool_req.tool_name)),
            },
        }
    }

    /// Write structured task report to `.sv/reports/<task-id>/`
    pub fn write_task_report(
        &self,
        workspace_root: &Path,
        task_id: &str,
        report_markdown: &str,
    ) -> Result<PathBuf, String> {
        let reports_dir = workspace_root.join(".sv").join("reports").join(task_id);
        fs::create_dir_all(&reports_dir).map_err(|e| e.to_string())?;

        let report_file = reports_dir.join("REPORT.md");
        fs::write(&report_file, report_markdown).map_err(|e| e.to_string())?;

        info!("Wrote task report to {:?}", report_file);
        Ok(report_file)
    }

    /// Query OmniRoute or OpenAI-compatible endpoint with user and system prompts
    pub async fn query_omniroute(
        &self,
        endpoint: &str,
        model: &str,
        system_prompt: &str,
        user_prompt: &str,
    ) -> Result<String, String> {
        let client = match reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
        {
            Ok(c) => c,
            Err(e) => return Err(format!("Failed to build HTTP client: {}", e)),
        };

        let base = endpoint.trim_end_matches('/');
        let url = format!("{}/chat/completions", base);
        let body = serde_json::json!({
            "model": model,
            "messages": [
                { "role": "system", "content": system_prompt },
                { "role": "user", "content": user_prompt }
            ]
        });

        let resp = match client.post(&url).json(&body).send().await {
            Ok(r) => r,
            Err(e) => {
                return Err(format!(
                    "Failed to connect to OmniRoute endpoint at '{}'. Ensure OmniRoute or your local model server is running: {}",
                    endpoint, e
                ));
            }
        };

        if !resp.status().is_success() {
            let status = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            return Err(format!("OmniRoute API error (HTTP {}): {}", status, err_body));
        }

        let json_val: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Failed to parse response JSON: {}", e))?;

        let content = json_val["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(content)
    }
}

