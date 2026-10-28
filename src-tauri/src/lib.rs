pub mod commands;
pub mod models;
pub mod services;

use commands::AppState;
use services::agent_engine::AgentEngine;
use services::auth_service::AuthService;
use services::git_service::GitService;
use services::lsp_service::LspService;
use services::profile_manager::ProfileManager;
use services::pty_service::PtyService;
use services::rea_service::ReaService;
use services::search_service::SearchService;
use services::tool_manager::ToolManager;
use services::updater_service::UpdaterService;
use std::sync::Arc;
use tauri::Manager;
use tracing::info;

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Starting SV Code Editor runtime...");

    let app_state = Arc::new(AppState {
        tool_manager: ToolManager::new(),
        profile_manager: ProfileManager::new(),
        pty_service: PtyService::new(),
        git_service: GitService::new(),
        search_service: SearchService::new(),
        agent_engine: AgentEngine::new(),
        lsp_service: LspService::new(),
        rea_service: ReaService::new(),
        auth_service: AuthService::new(),
        updater_service: UpdaterService::new(),
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_hardware_info,
            commands::set_system_profile,
            commands::get_process_monitor,
            commands::kill_process,
            commands::check_setup_status,
            commands::install_setup_component,
            commands::clean_uninstall_tools,
            commands::get_terminal_profiles,
            commands::spawn_pty,
            commands::write_pty,
            commands::resize_pty,
            commands::terminate_pty,
            commands::git_status,
            commands::git_stage,
            commands::git_unstage,
            commands::git_commit,
            commands::git_diff,
            commands::git_create_worktree,
            commands::git_list_worktrees,
            commands::git_merge_worktree,
            commands::git_discard_worktree,
            commands::global_search,
            commands::agent_create_task,
            commands::agent_list_tasks,
            commands::agent_list_inbox,
            commands::agent_execute_tool,
            commands::agent_audit_instructions,
            commands::re_analyze_binary,
            commands::re_get_functions,
            commands::re_get_pseudocode,
            commands::re_save_notes,
            commands::auth_get_user,
            commands::auth_start_login,
            commands::auth_sign_out,
            commands::updater_snapshot_settings,
            commands::updater_rollback_settings,
            commands::read_workspace_file,
            commands::write_workspace_file,
        ])
        .setup(|app| {
            info!("SV Code Editor main window initialized");
            // Set window title and hook minimization for trimming cache
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.set_title("SV Code Editor");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running SV Code Editor application");
}

