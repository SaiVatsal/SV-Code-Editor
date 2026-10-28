use crate::models::{ComponentStatus, HardwareInfo, ProcessMemoryEntry, ReAnalysisOverview, ReEvidence, ReFunction, SystemProfile, AgentTask, InboxItem};
use crate::services::agent_engine::{AgentEngine, InstructionAuditEntry, ToolCallRequest, ToolCallResponse};
use crate::services::auth_service::{AuthService, UserProfile};
use crate::services::git_service::{GitRepoStatus, GitService, GitWorktreeInfo};
use crate::services::lsp_service::LspService;
use crate::services::profile_manager::ProfileManager;
use crate::services::pty_service::{PtyService, TerminalProfile};
use crate::services::rea_service::ReaService;
use crate::services::search_service::SearchService;
use crate::services::tool_manager::ToolManager;
use crate::services::updater_service::UpdaterService;
use serde::Serialize;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

pub struct AppState {
    pub tool_manager: ToolManager,
    pub profile_manager: ProfileManager,
    pub pty_service: PtyService,
    pub git_service: GitService,
    pub search_service: SearchService,
    pub agent_engine: AgentEngine,
    pub lsp_service: LspService,
    pub rea_service: ReaService,
    pub auth_service: AuthService,
    pub updater_service: UpdaterService,
}

#[tauri::command]
pub async fn get_hardware_info(state: State<'_, Arc<AppState>>) -> Result<HardwareInfo, String> {
    Ok(state.profile_manager.get_hardware_info().await)
}

#[tauri::command]
pub async fn set_system_profile(state: State<'_, Arc<AppState>>, profile: SystemProfile) -> Result<(), String> {
    state.profile_manager.set_profile(profile).await;
    Ok(())
}

#[tauri::command]
pub async fn get_process_monitor(state: State<'_, Arc<AppState>>) -> Result<Vec<ProcessMemoryEntry>, String> {
    Ok(state.profile_manager.get_process_monitor_entries().await)
}

#[tauri::command]
pub async fn kill_process(state: State<'_, Arc<AppState>>, pid: u32) -> Result<(), String> {
    state.profile_manager.kill_process(pid).await
}

#[tauri::command]
pub async fn check_setup_status(state: State<'_, Arc<AppState>>) -> Result<Vec<ComponentStatus>, String> {
    Ok(state.tool_manager.check_all_components().await)
}

#[tauri::command]
pub async fn install_setup_component(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    component_id: String,
) -> Result<ComponentStatus, String> {
    let app_handle = app.clone();
    state
        .tool_manager
        .install_component(&component_id, move |evt| {
            let _ = app_handle.emit("setup-progress", evt);
        })
        .await
}

#[tauri::command]
pub async fn clean_uninstall_tools(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.tool_manager.clean_uninstall_tools()
}

#[tauri::command]
pub async fn get_terminal_profiles(state: State<'_, Arc<AppState>>) -> Result<Vec<TerminalProfile>, String> {
    Ok(state.pty_service.get_available_profiles())
}

#[tauri::command]
pub async fn spawn_pty(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    id: String,
    profile_id: String,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let app_handle = app.clone();
    state
        .pty_service
        .spawn(id, &profile_id, &cwd, cols, rows, move |session_id, bytes| {
            let payload = serde_json::json!({
                "sessionId": session_id,
                "data": base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes),
            });
            let _ = app_handle.emit("pty-output", payload);
        })
        .await
}

#[tauri::command]
pub async fn write_pty(state: State<'_, Arc<AppState>>, id: String, data: String) -> Result<(), String> {
    state.pty_service.write(&id, data.as_bytes()).await
}

#[tauri::command]
pub async fn resize_pty(state: State<'_, Arc<AppState>>, id: String, cols: u16, rows: u16) -> Result<(), String> {
    state.pty_service.resize(&id, cols, rows).await
}

#[tauri::command]
pub async fn terminate_pty(state: State<'_, Arc<AppState>>, id: String) -> Result<(), String> {
    state.pty_service.terminate(&id).await
}

#[tauri::command]
pub async fn git_status(state: State<'_, Arc<AppState>>, repo_dir: String) -> Result<GitRepoStatus, String> {
    state.git_service.get_status(Path::new(&repo_dir))
}

#[tauri::command]
pub async fn git_stage(state: State<'_, Arc<AppState>>, repo_dir: String, file_path: String) -> Result<(), String> {
    state.git_service.stage_file(Path::new(&repo_dir), &file_path)
}

#[tauri::command]
pub async fn git_unstage(state: State<'_, Arc<AppState>>, repo_dir: String, file_path: String) -> Result<(), String> {
    state.git_service.unstage_file(Path::new(&repo_dir), &file_path)
}

#[tauri::command]
pub async fn git_commit(state: State<'_, Arc<AppState>>, repo_dir: String, message: String) -> Result<String, String> {
    state.git_service.commit(Path::new(&repo_dir), &message)
}

#[tauri::command]
pub async fn git_diff(
    state: State<'_, Arc<AppState>>,
    repo_dir: String,
    file_path: Option<String>,
    staged: bool,
) -> Result<String, String> {
    state.git_service.get_diff(Path::new(&repo_dir), file_path.as_deref(), staged)
}

#[tauri::command]
pub async fn git_create_worktree(
    state: State<'_, Arc<AppState>>,
    repo_dir: String,
    task_id: String,
    base_branch: String,
    untracked_files: Vec<String>,
) -> Result<String, String> {
    let p = state
        .git_service
        .create_worktree(Path::new(&repo_dir), &task_id, &base_branch, &untracked_files)?;
    Ok(p.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn git_list_worktrees(
    state: State<'_, Arc<AppState>>,
    repo_dir: String,
) -> Result<Vec<GitWorktreeInfo>, String> {
    state.git_service.list_worktrees(Path::new(&repo_dir))
}

#[tauri::command]
pub async fn git_merge_worktree(
    state: State<'_, Arc<AppState>>,
    repo_dir: String,
    task_id: String,
    target_branch: String,
) -> Result<String, String> {
    state.git_service.merge_worktree(Path::new(&repo_dir), &task_id, &target_branch)
}

#[tauri::command]
pub async fn git_discard_worktree(
    state: State<'_, Arc<AppState>>,
    repo_dir: String,
    task_id: String,
) -> Result<(), String> {
    state.git_service.discard_worktree(Path::new(&repo_dir), &task_id)
}

#[tauri::command]
pub async fn global_search(
    app: AppHandle,
    state: State<'_, Arc<AppState>>,
    root_dir: String,
    query: String,
    case_sensitive: bool,
    is_regex: bool,
    max_results: usize,
) -> Result<usize, String> {
    let app_handle = app.clone();
    state.search_service.search(
        Path::new(&root_dir),
        &query,
        case_sensitive,
        is_regex,
        max_results,
        move |m| {
            let _ = app_handle.emit("search-match", m);
            true
        },
    )
}

#[tauri::command]
pub async fn agent_create_task(
    state: State<'_, Arc<AppState>>,
    title: String,
    goal: String,
    project_path: String,
    mode: String,
    sandbox_level: String,
    model: String,
) -> Result<AgentTask, String> {
    Ok(state.agent_engine.create_task(&title, &goal, &project_path, &mode, &sandbox_level, &model).await)
}

#[tauri::command]
pub async fn agent_list_tasks(state: State<'_, Arc<AppState>>) -> Result<Vec<AgentTask>, String> {
    Ok(state.agent_engine.list_tasks().await)
}

#[tauri::command]
pub async fn agent_list_inbox(state: State<'_, Arc<AppState>>) -> Result<Vec<InboxItem>, String> {
    Ok(state.agent_engine.list_inbox().await)
}

#[tauri::command]
pub async fn agent_execute_tool(
    state: State<'_, Arc<AppState>>,
    task_id: String,
    workspace_root: String,
    tool_req: ToolCallRequest,
) -> Result<ToolCallResponse, String> {
    Ok(state.agent_engine.execute_tool(&task_id, Path::new(&workspace_root), &tool_req))
}

#[tauri::command]
pub async fn agent_audit_instructions(
    state: State<'_, Arc<AppState>>,
    workspace_root: String,
) -> Result<Vec<InstructionAuditEntry>, String> {
    Ok(state.agent_engine.load_instructions_audit(Path::new(&workspace_root)))
}

#[tauri::command]
pub async fn re_analyze_binary(
    state: State<'_, Arc<AppState>>,
    binary_path: String,
) -> Result<ReAnalysisOverview, String> {
    state.rea_service.analyze_binary_overview(Path::new(&binary_path))
}

#[derive(Serialize)]
pub struct FunctionsPageResponse {
    pub functions: Vec<ReFunction>,
    pub total: usize,
}

#[tauri::command]
pub async fn re_get_functions(
    state: State<'_, Arc<AppState>>,
    sha256: String,
    query: String,
    page: usize,
    page_size: usize,
) -> Result<FunctionsPageResponse, String> {
    let (functions, total) = state.rea_service.get_functions_page(&sha256, &query, page, page_size);
    Ok(FunctionsPageResponse { functions, total })
}

#[derive(Serialize)]
pub struct PseudocodeResponse {
    pub code: String,
    pub evidence: ReEvidence,
}

#[tauri::command]
pub async fn re_get_pseudocode(
    state: State<'_, Arc<AppState>>,
    sha256: String,
    address: String,
) -> Result<PseudocodeResponse, String> {
    let (code, evidence) = state.rea_service.get_pseudocode(&sha256, &address);
    Ok(PseudocodeResponse { code, evidence })
}

#[tauri::command]
pub async fn re_save_notes(
    state: State<'_, Arc<AppState>>,
    project_dir: String,
    sha256: String,
    notes_json: String,
) -> Result<(), String> {
    state.rea_service.save_notes(Path::new(&project_dir), &sha256, &notes_json)
}

#[tauri::command]
pub async fn auth_get_user(state: State<'_, Arc<AppState>>) -> Result<UserProfile, String> {
    Ok(state.auth_service.get_current_user().await)
}

#[tauri::command]
pub async fn auth_start_login(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    state.auth_service.start_oauth_flow().await
}

#[tauri::command]
pub async fn auth_sign_out(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.auth_service.sign_out().await
}

#[tauri::command]
pub async fn updater_snapshot_settings(state: State<'_, Arc<AppState>>) -> Result<String, String> {
    let path = state.updater_service.snapshot_settings()?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn updater_rollback_settings(state: State<'_, Arc<AppState>>) -> Result<(), String> {
    state.updater_service.rollback_settings()
}

#[tauri::command]
pub async fn read_workspace_file(_state: State<'_, Arc<AppState>>, path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_workspace_file(_state: State<'_, Arc<AppState>>, path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, content).map_err(|e| format!("Failed to write file: {}", e))
}

