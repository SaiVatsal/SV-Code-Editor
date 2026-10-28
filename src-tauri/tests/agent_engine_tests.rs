use std::fs;
use sv_code_editor_lib::services::agent_engine::{AgentEngine, ToolCallRequest};

#[tokio::test]
async fn test_agent_task_lifecycle_and_inbox() {
    let engine = AgentEngine::new();

    let task = engine
        .create_task(
            "Fix parser bug",
            "Implement token streaming",
            "G:\\TestWorkspace",
            "ask-first",
            "workspace-write",
            "omniroute/gpt-4o",
        )
        .await;

    assert_eq!(task.title, "Fix parser bug");
    assert_eq!(task.status, "queued");
    assert_eq!(task.mode, "ask-first");

    // Update status
    let update_res = engine.update_task_status(&task.id, "running").await;
    assert!(update_res.is_ok());

    let tasks = engine.list_tasks().await;
    let found = tasks.iter().find(|t| t.id == task.id).expect("Task should be present");
    assert_eq!(found.status, "running");

    // Add inbox item
    engine
        .add_inbox_item(
            &task.id,
            "approval",
            "Permission required",
            "Allow write to src/main.rs",
        )
        .await;
    let inbox = engine.list_inbox().await;
    assert_eq!(inbox.len(), 1);
    assert_eq!(inbox[0].title, "Permission required");
    assert_eq!(inbox[0].status, "pending");
}

#[tokio::test]
async fn test_agent_tool_calls_write_read_edit() {
    let engine = AgentEngine::new();
    let temp_ws = std::env::temp_dir().join(format!("svcode_agent_ws_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_ws);

    // 1. Tool: write_file
    let write_req = ToolCallRequest {
        tool_name: "write_file".into(),
        arguments: serde_json::json!({
            "path": "hello.txt",
            "content": "Hello, world!\nLine two.\nLine three."
        }),
    };
    let write_res = engine.execute_tool("test-task-1", &temp_ws, &write_req);
    assert!(write_res.success, "write_file must succeed: {:?}", write_res.error);

    // Verify on disk
    let file_path = temp_ws.join("hello.txt");
    assert!(file_path.exists());
    let disk_content = fs::read_to_string(&file_path).unwrap();
    assert_eq!(disk_content, "Hello, world!\nLine two.\nLine three.");

    // 2. Tool: read_file
    let read_req = ToolCallRequest {
        tool_name: "read_file".into(),
        arguments: serde_json::json!({
            "path": "hello.txt"
        }),
    };
    let read_res = engine.execute_tool("test-task-1", &temp_ws, &read_req);
    assert!(read_res.success);
    assert_eq!(read_res.output, "Hello, world!\nLine two.\nLine three.");

    // 3. Tool: edit_file (exact string replace)
    let edit_req = ToolCallRequest {
        tool_name: "edit_file".into(),
        arguments: serde_json::json!({
            "path": "hello.txt",
            "target": "Line two.",
            "replacement": "Line replaced successfully."
        }),
    };
    let edit_res = engine.execute_tool("test-task-1", &temp_ws, &edit_req);
    assert!(edit_res.success, "edit_file must succeed: {:?}", edit_res.error);

    let updated_content = fs::read_to_string(&file_path).unwrap();
    assert_eq!(
        updated_content,
        "Hello, world!\nLine replaced successfully.\nLine three."
    );

    // 4. Tool: edit_file failure on non-matching target string
    let bad_edit = ToolCallRequest {
        tool_name: "edit_file".into(),
        arguments: serde_json::json!({
            "path": "hello.txt",
            "target": "Non existent line here",
            "replacement": "Replacement"
        }),
    };
    let bad_res = engine.execute_tool("test-task-1", &temp_ws, &bad_edit);
    assert!(!bad_res.success, "edit_file must fail when target string is not found");

    // Clean up
    let _ = fs::remove_dir_all(&temp_ws);
}

#[tokio::test]
async fn test_layered_instruction_audit() {
    let engine = AgentEngine::new();
    let temp_ws = std::env::temp_dir().join(format!("svcode_instruct_ws_{}", uuid::Uuid::new_v4()));
    let _ = fs::create_dir_all(&temp_ws);

    // Create root SV.md, AGENTS.md, CLAUDE.md
    fs::write(temp_ws.join("SV.md"), "# SV Code Editor Directives\nStrict zero animation.\n").unwrap();
    fs::write(temp_ws.join("AGENTS.md"), "# Multi-Agent Platform Guidance\nUse worktrees.\n").unwrap();

    let audit = engine.load_instructions_audit(&temp_ws);
    assert_eq!(audit.len(), 3, "All three layered instruction files should be audited");

    let sv_entry = audit.iter().find(|e| e.file_path.ends_with("SV.md")).expect("SV.md must be audited");
    assert!(sv_entry.is_loaded);
    assert!(sv_entry.size_bytes > 0);

    let agents_entry = audit.iter().find(|e| e.file_path.ends_with("AGENTS.md")).expect("AGENTS.md must be audited");
    assert!(agents_entry.is_loaded);

    let claude_entry = audit.iter().find(|e| e.file_path.ends_with("CLAUDE.md")).expect("CLAUDE.md must be audited");
    assert!(!claude_entry.is_loaded); // not created

    let _ = fs::remove_dir_all(&temp_ws);
}
