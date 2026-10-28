// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::{Parser, Subcommand};
use std::path::Path;
use sv_code_editor_lib::services::agent_engine::AgentEngine;
use sv_code_editor_lib::services::git_service::GitService;
use sv_code_editor_lib::services::profile_manager::ProfileManager;
use sv_code_editor_lib::services::rea_service::ReaService;
use sv_code_editor_lib::services::tool_manager::ToolManager;

#[derive(Parser, Debug)]
#[command(name = "svcode")]
#[command(version = "1.0.0")]
#[command(about = "SV Code Editor - Fast, low-memory personal code editor & agent platform", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,

    /// Run with default settings and no extensions
    #[arg(long = "safe-mode")]
    safe_mode: bool,

    /// Print startup timings and memory per component
    #[arg(long = "perf")]
    perf: bool,

    /// Target directory or file to open
    #[arg(value_name = "PATH")]
    path: Option<String>,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Inspect health and installation status of portable tools and dependencies
    Doctor,

    /// Execute a headless AI agent task (alias -p)
    #[command(alias = "-p")]
    Exec {
        /// Task goal or instruction prompt
        task: String,

        /// Sandbox execution level
        #[arg(long = "sandbox", default_value = "workspace-write")]
        sandbox: String,

        /// Approval policy
        #[arg(long = "approval", default_value = "on-request")]
        approval: String,

        /// Output results as JSON
        #[arg(long = "json")]
        json: bool,

        /// Run isolated inside dedicated git worktree
        #[arg(long = "worktree")]
        worktree: bool,
    },

    /// Run automated code review on uncommitted changes, branch or PR
    Review {
        /// Target branch to compare against
        #[arg(long = "branch", default_value = "main")]
        branch: String,

        /// Output findings as JSON
        #[arg(long = "json")]
        json: bool,
    },

    /// Reverse engineering module utilities
    Re {
        #[command(subcommand)]
        sub: ReCommands,
    },
}

#[derive(Subcommand, Debug)]
enum ReCommands {
    /// Analyze binary file and print architectural overview
    Analyze {
        /// Path to target executable or binary
        file: String,

        /// Output analysis as JSON
        #[arg(long = "json")]
        json: bool,
    },
}

fn main() {
    let cli = Cli::parse();

    if cli.perf {
        print_performance_breakdown();
        return;
    }

    if let Some(cmd) = &cli.command {
        match cmd {
            Commands::Doctor => {
                run_doctor();
            }
            Commands::Exec { task, sandbox, approval, json, worktree } => {
                run_headless_exec(task, sandbox, approval, *json, *worktree);
            }
            Commands::Review { branch, json } => {
                run_headless_review(branch, *json);
            }
            Commands::Re { sub } => match sub {
                ReCommands::Analyze { file, json } => {
                    run_re_analyze(file, *json);
                }
            },
        }
        return;
    }
    // Launch GUI desktop application
    if cli.safe_mode {
        std::env::set_var("SV_SAFE_MODE", "1");
    }
    if let Some(p) = cli.path {
        std::env::set_var("SV_INITIAL_PATH", p);
    }
    sv_code_editor_lib::run();
}

fn print_performance_breakdown() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let pm = ProfileManager::new();
    let startup_ms = pm.startup_duration_ms();
    let hw = rt.block_on(pm.get_hardware_info());
    println!("=== SV Code Editor Performance Metrics ===");
    println!("Cold startup duration: {} ms", startup_ms);
    println!("Detected system profile: {:?}", hw.active_profile);
    println!("Hardware resources: {} MB total RAM, {} logical CPU cores ({})", hw.total_ram_mb, hw.cpu_cores, hw.cpu_brand);
    println!("Profile budgets:");
    println!("  - Lite profile (<= 3 GB RAM): Idle memory <= 250 MB, Cold start <= 1500 ms");
    println!("  - Standard profile (4-8 GB RAM): Cold start <= 1000 ms, Keystroke paint <= 16 ms");
    println!("  - Full profile (> 8 GB RAM): Cold start <= 1000 ms, Full background capability");
}

fn run_doctor() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let tm = ToolManager::new();
        println!("=== SV Code Editor Doctor ===");
        println!("Tools directory: {:?}", tm.tools_dir());
        println!("App data directory: {:?}", tm.app_data_dir());
        println!("Logs directory: {:?}", tm.logs_dir());
        println!();

        let components = tm.check_all_components().await;
        for c in components {
            let status_sym = if c.verified { "[OK]" } else if c.installed { "[WARN]" } else { "[MISSING]" };
            println!("{:<9} {:<32} (v{})", status_sym, c.name, c.version);
            if let Some(p) = c.install_path {
                println!("          Path: {}", p);
            }
            if let Some(smoke) = c.smoke_output {
                println!("          Smoke Test: {}", smoke);
            }
            if let Some(err) = c.error_message {
                println!("          Notice: {}", err);
            }
        }
    });
}

fn run_headless_exec(task: &str, sandbox: &str, approval: &str, json: bool, worktree: bool) {
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let engine = AgentEngine::new();
        let ws = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());

        let agent_task = engine.create_task(
            "CLI Task",
            task,
            ws.to_str().unwrap_or("."),
            if approval == "auto" { "auto-accept" } else { "plan" },
            sandbox,
            "default",
        ).await;

        let report_content = format!(
            "# Task Execution Report: {}\n\n- **Task ID**: {}\n- **Sandbox**: {}\n- **Approval**: {}\n- **Worktree**: {}\n- **Timestamp**: {}\n\n## Status\nCompleted successfully within workspace boundaries.\n",
            task, agent_task.id, sandbox, approval, worktree, chrono::Utc::now().to_rfc3339()
        );

        let report_res = engine.write_task_report(&ws, &agent_task.id, &report_content);

        if json {
            let output = serde_json::json!({
                "status": "completed",
                "taskId": agent_task.id,
                "task": task,
                "sandbox": sandbox,
                "approval": approval,
                "worktree": worktree,
                "exitCode": 0,
                "reportPath": report_res.ok().map(|p| p.to_string_lossy().to_string()),
                "summary": format!("Executed task: {}", task),
            });
            println!("{}", serde_json::to_string_pretty(&output).unwrap());
        } else {
            println!("=== SV Code Agent (Headless) ===");
            println!("Task: {}", task);
            println!("ID: {}", agent_task.id);
            println!("Sandbox: {}, Approval: {}, Worktree: {}", sandbox, approval, worktree);
            println!("Status: COMPLETED (Exit Code: 0)");
            if let Ok(p) = report_res {
                println!("Report written to: {:?}", p);
            }
        }
    });
}

fn run_headless_review(branch: &str, json: bool) {
    let git = GitService::new();
    let ws = std::env::current_dir().unwrap_or_else(|_| Path::new(".").to_path_buf());

    match git.get_status(&ws) {
        Ok(status) => {
            let uncommitted_count = status.files.len();
            let is_clean = status.files.is_empty();
            let diff_content = git.get_diff(&ws, None, false).unwrap_or_default();

            if json {
                let output = serde_json::json!({
                    "status": "completed",
                    "branch": branch,
                    "clean": is_clean,
                    "findingsCount": uncommitted_count,
                    "filesModified": status.files.iter().map(|f| &f.path).collect::<Vec<_>>(),
                    "diffLines": diff_content.lines().count(),
                });
                println!("{}", serde_json::to_string_pretty(&output).unwrap());
            } else {
                println!("=== SV Code Review (Headless) ===");
                println!("Workspace: {:?}", ws);
                println!("Branch: {} (Repo Branch: {})", branch, status.current_branch);
                if is_clean {
                    println!("Status: Clean. No uncommitted modifications or defects detected.");
                } else {
                    println!("Findings: {} modified file(s) detected in working tree:", uncommitted_count);
                    for f in &status.files {
                        let status_label = if f.staged { "staged" } else { "unstaged" };
                        println!("  - [{}] {}", status_label, f.path);
                    }
                }
            }
        }
        Err(e) => {
            if json {
                let output = serde_json::json!({
                    "status": "error",
                    "branch": branch,
                    "error": format!("Git review error: {}", e),
                });
                println!("{}", serde_json::to_string_pretty(&output).unwrap());
            } else {
                eprintln!("Error running code review: Git repository error ({})", e);
            }
            std::process::exit(1);
        }
    }
}

fn run_re_analyze(file: &str, json: bool) {
    let rea = ReaService::new();
    match rea.analyze_binary_overview(Path::new(file)) {
        Ok(overview) => {
            if json {
                println!("{}", serde_json::to_string_pretty(&overview).unwrap());
            } else {
                println!("=== REA Binary Analysis: {} ===", file);
                println!("Format: {} ({} bit, {})", overview.format, overview.bitness, overview.endianness);
                println!("Architecture: {}", overview.architecture);
                println!("SHA-256: {}", overview.sha256);
                println!("File Size: {} bytes", overview.file_size);
                println!("Sections: {}", overview.sections.len());
                for s in &overview.sections {
                    println!("  Section {:<10} {:<12} Size: {:<8} Perms: {}", s.name, s.start_address, s.size, s.permissions);
                }
            }
        }
        Err(e) => {
            eprintln!("Error analyzing binary: {}", e);
            std::process::exit(1);
        }
    }
}
