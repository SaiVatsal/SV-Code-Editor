use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum SystemProfile {
    Lite,
    Standard,
    Full,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareInfo {
    pub total_ram_mb: u64,
    pub available_ram_mb: u64,
    pub cpu_cores: usize,
    pub cpu_brand: String,
    pub recommended_profile: SystemProfile,
    pub active_profile: SystemProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentStatus {
    pub id: String,
    pub name: String,
    pub version: String,
    pub installed: bool,
    pub verified: bool,
    pub essential: bool,
    pub min_ram_gb: u32,
    pub install_path: Option<String>,
    pub error_message: Option<String>,
    pub smoke_output: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupProgressEvent {
    pub component_id: String,
    pub stage: String, // "downloading", "verifying", "extracting", "testing", "completed", "failed", "skipped"
    pub percent: f32,
    pub status_text: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMemoryEntry {
    pub name: String,
    pub category: String,
    pub pid: Option<u32>,
    pub memory_mb: f64,
    pub cpu_percent: f32,
    pub status: String,
    pub can_stop: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTask {
    pub id: String,
    pub title: String,
    pub goal: String,
    pub status: String, // "queued", "running", "waiting_approval", "done", "failed", "paused"
    pub project_path: String,
    pub branch: String,
    pub worktree_path: Option<String>,
    pub elapsed_seconds: u64,
    pub mode: String, // "ask-first", "plan", "auto-accept"
    pub sandbox_level: String, // "read-only", "workspace-write", "full-access"
    pub approval_policy: String, // "always", "risky-only", "never"
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub sub_agent_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InboxItem {
    pub id: String,
    pub task_id: String,
    pub item_type: String, // "approval_request", "question", "task_done", "automation_result"
    pub title: String,
    pub message: String,
    pub details: Option<String>,
    pub status: String, // "pending", "approved", "rejected", "dismissed"
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReAnalysisOverview {
    pub file_path: String,
    pub sha256: String,
    pub file_size: u64,
    pub format: String,
    pub architecture: String,
    pub bitness: u32,
    pub endianness: String,
    pub entry_points: Vec<String>,
    pub sections: Vec<ReSection>,
    pub imports: Vec<ReImport>,
    pub exports: Vec<ReExport>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReSection {
    pub name: String,
    pub start_address: String,
    pub size: u64,
    pub permissions: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReImport {
    pub library: String,
    pub symbol: String,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReExport {
    pub symbol: String,
    pub address: String,
    pub ordinal: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReFunction {
    pub address: String,
    pub name: String,
    pub size: u64,
    pub signature: String,
    pub is_entry: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReXref {
    pub from_address: String,
    pub to_address: String,
    pub xref_type: String, // "call", "data", "jump"
    pub context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReEvidence {
    pub confidence: f32,
    pub authority: String,
    pub limitations: Vec<String>,
    pub unresolved_unknowns: Vec<String>,
}

