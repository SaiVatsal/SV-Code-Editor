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
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::{Path, PathBuf};
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
pub async fn agent_query_provider(
    state: State<'_, Arc<AppState>>,
    endpoint: String,
    model: String,
    system_prompt: String,
    user_prompt: String,
) -> Result<String, String> {
    state.agent_engine.query_omniroute(&endpoint, &model, &system_prompt, &user_prompt).await
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
    let (code, evidence) = state.rea_service.get_pseudocode(&sha256, &address)?;
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

fn validate_workspace_boundary(target: &Path, workspace: Option<&Path>) -> Result<PathBuf, String> {
    if let Some(ws) = workspace {
        let ws_canon = ws.canonicalize().unwrap_or_else(|_| ws.to_path_buf());
        let target_full = if target.is_relative() {
            ws.join(target)
        } else {
            target.to_path_buf()
        };
        // Normalize
        let target_canon = target_full.canonicalize().unwrap_or_else(|_| target_full.clone());
        if !target_canon.starts_with(&ws_canon) && !target_full.starts_with(ws) {
            return Err(format!(
                "Security violation: Path {:?} is outside the authorized workspace boundary {:?}",
                target, ws
            ));
        }
        Ok(target_full)
    } else {
        Ok(target.to_path_buf())
    }
}

#[tauri::command]
pub async fn read_workspace_file(_state: State<'_, Arc<AppState>>, path: String, workspace_root: Option<String>) -> Result<String, String> {
    let ws = workspace_root.as_deref().map(Path::new);
    let safe_path = validate_workspace_boundary(Path::new(&path), ws)?;
    fs::read_to_string(&safe_path).map_err(|e| format!("Failed to read file {:?}: {}", safe_path, e))
}

#[tauri::command]
pub async fn write_workspace_file(_state: State<'_, Arc<AppState>>, path: String, content: String, workspace_root: Option<String>) -> Result<(), String> {
    let ws = workspace_root.as_deref().map(Path::new);
    let safe_path = validate_workspace_boundary(Path::new(&path), ws)?;
    if let Some(parent) = safe_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&safe_path, content).map_err(|e| format!("Failed to write file {:?}: {}", safe_path, e))
}

#[tauri::command]
pub async fn create_workspace_file(_state: State<'_, Arc<AppState>>, path: String, workspace_root: Option<String>) -> Result<(), String> {
    let ws = workspace_root.as_deref().map(Path::new);
    let safe_path = validate_workspace_boundary(Path::new(&path), ws)?;
    if safe_path.exists() {
        return Err(format!("File already exists: {:?}", safe_path));
    }
    if let Some(parent) = safe_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&safe_path, "").map_err(|e| format!("Failed to create file: {}", e))
}

#[tauri::command]
pub async fn create_workspace_directory(_state: State<'_, Arc<AppState>>, path: String, workspace_root: Option<String>) -> Result<(), String> {
    let ws = workspace_root.as_deref().map(Path::new);
    let safe_path = validate_workspace_boundary(Path::new(&path), ws)?;
    fs::create_dir_all(&safe_path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
pub async fn rename_workspace_path(_state: State<'_, Arc<AppState>>, old_path: String, new_path: String, workspace_root: Option<String>) -> Result<(), String> {
    let ws = workspace_root.as_deref().map(Path::new);
    let safe_old = validate_workspace_boundary(Path::new(&old_path), ws)?;
    let safe_new = validate_workspace_boundary(Path::new(&new_path), ws)?;
    fs::rename(&safe_old, &safe_new).map_err(|e| format!("Failed to rename {:?} to {:?}: {}", safe_old, safe_new, e))
}

#[tauri::command]
pub async fn delete_workspace_path(_state: State<'_, Arc<AppState>>, path: String, workspace_root: Option<String>) -> Result<(), String> {
    let ws = workspace_root.as_deref().map(Path::new);
    let safe_path = validate_workspace_boundary(Path::new(&path), ws)?;
    if safe_path.is_dir() {
        fs::remove_dir_all(&safe_path).map_err(|e| format!("Failed to delete directory {:?}: {}", safe_path, e))
    } else {
        fs::remove_file(&safe_path).map_err(|e| format!("Failed to delete file {:?}: {}", safe_path, e))
    }
}

#[tauri::command]
pub async fn list_workspace_files_recursive(_state: State<'_, Arc<AppState>>, path: String, max_files: Option<usize>) -> Result<Vec<String>, String> {
    let root = Path::new(&path);
    if !root.exists() || !root.is_dir() {
        return Err("Root path is not a valid directory".into());
    }
    let limit = max_files.unwrap_or(5000);
    let mut files = Vec::new();
    let mut stack = vec![root.to_path_buf()];

    while let Some(dir) = stack.pop() {
        if files.len() >= limit {
            break;
        }
        if let Ok(entries) = fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with('.') && name != ".sv" {
                    continue;
                }
                if name == "node_modules" || name == "target" || name == ".git" {
                    continue;
                }
                if entry_path.is_dir() {
                    stack.push(entry_path);
                } else if entry_path.is_file() {
                    if let Ok(rel) = entry_path.strip_prefix(root) {
                        files.push(rel.to_string_lossy().replace('\\', "/"));
                    }
                }
            }
        }
    }
    files.sort();
    Ok(files)
}

#[tauri::command]
pub async fn load_user_settings() -> Result<String, String> {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".into());
    let settings_file = Path::new(&app_data).join("SV Code Editor").join("settings.json");
    if settings_file.exists() {
        fs::read_to_string(&settings_file).map_err(|e| format!("Cannot read settings: {}", e))
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub async fn save_user_settings(settings_json: String) -> Result<(), String> {
    let app_data = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".into());
    let dir = Path::new(&app_data).join("SV Code Editor");
    let _ = fs::create_dir_all(&dir);
    let settings_file = dir.join("settings.json");
    let tmp_file = dir.join("settings.json.tmp");
    fs::write(&tmp_file, &settings_json).map_err(|e| format!("Failed to write tmp settings: {}", e))?;
    fs::rename(&tmp_file, &settings_file).map_err(|e| format!("Failed to commit settings: {}", e))?;
    Ok(())
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskReportSummary {
    pub task_id: String,
    pub path: String,
    pub title: String,
    pub modified_at: String,
}

#[tauri::command]
pub async fn list_workspace_reports(_state: State<'_, Arc<AppState>>, workspace_root: String) -> Result<Vec<TaskReportSummary>, String> {
    let reports_dir = Path::new(&workspace_root).join(".sv").join("reports");
    let mut reports = Vec::new();
    if reports_dir.exists() && reports_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&reports_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let task_id = entry.file_name().to_string_lossy().to_string();
                    let report_md = path.join("REPORT.md");
                    let modified = entry.metadata().ok().and_then(|m| m.modified().ok()).map(|t| {
                        chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339()
                    }).unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
                    reports.push(TaskReportSummary {
                        task_id,
                        path: report_md.to_string_lossy().to_string(),
                        title: "Task Execution Report".to_string(),
                        modified_at: modified,
                    });
                }
            }
        }
    }
    Ok(reports)
}


#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub async fn list_workspace_directory(_state: State<'_, Arc<AppState>>, path: String) -> Result<Vec<FileEntry>, String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Err("Directory does not exist".into());
    }
    if !p.is_dir() {
        return Err("Path is not a directory".into());
    }
    let mut entries = Vec::new();
    if let Ok(read_dir) = fs::read_dir(p) {
        for entry in read_dir.flatten() {
            let entry_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with('.') && name != ".sv" {
                continue;
            }
            let is_dir = entry_path.is_dir();
            entries.push(FileEntry {
                name,
                path: entry_path.to_string_lossy().to_string(),
                is_directory: is_dir,
                children: None,
            });
        }
    }
    entries.sort_by(|a, b| {
        if a.is_directory != b.is_directory {
            b.is_directory.cmp(&a.is_directory)
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    Ok(entries)
}

#[tauri::command]
pub async fn open_native_file_dialog() -> Result<Option<String>, String> {
    let file = rfd::FileDialog::new().pick_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn open_native_folder_dialog() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new().pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn save_native_file_dialog(default_name: Option<String>) -> Result<Option<String>, String> {
    let mut dialog = rfd::FileDialog::new();
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(&name);
    }
    let file = dialog.save_file();
    Ok(file.map(|p| p.to_string_lossy().to_string()))
}


