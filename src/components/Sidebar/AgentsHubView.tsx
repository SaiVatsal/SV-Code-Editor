import { useState, useEffect } from "preact/hooks";
import { agentTasks, settings, currentWorkspace } from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { AgentTask, GitWorktreeInfo } from "@/types/models";

export function AgentsHubView() {
  const [worktrees, setWorktrees] = useState<GitWorktreeInfo[]>([]);
  const [taskPrompt, setTaskPrompt] = useState("");
  const [selectedMode, setSelectedMode] = useState<"ask-first" | "plan" | "auto-accept">("ask-first");
  const [msg, setMsg] = useState<string | null>(null);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const maxParallel = settings.value.profile === "Lite" ? 1 : settings.value.profile === "Standard" ? 3 : 6;

  const fetchTasksAndWorktrees = async () => {
    try {
      const tasks = await invokeSafe<AgentTask[]>("agent_list_tasks");
      agentTasks.value = tasks;
      const wtList = await invokeSafe<GitWorktreeInfo[]>("git_list_worktrees", {
        repoDir: currentWorkspace.value,
      });
      setWorktrees(wtList);
    } catch (e) {
      console.warn("Failed to fetch agent tasks/worktrees:", e);
    }
  };

  useEffect(() => {
    fetchTasksAndWorktrees();
    const interval = setInterval(fetchTasksAndWorktrees, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunchTask = async () => {
    if (!taskPrompt.trim()) return;
    try {
      await invokeSafe("agent_create_task", {
        title: taskPrompt.slice(0, 32),
        goal: taskPrompt,
        projectPath: currentWorkspace.value,
        mode: selectedMode,
        sandboxLevel: settings.value.sandboxLevel,
        model: settings.value.defaultModel,
      });
      setTaskPrompt("");
      setMsg("Task created and queued.");
      fetchTasksAndWorktrees();
    } catch (e: unknown) {
      setMsg(`Failed to launch task: ${String(e)}`);
    }
  };

  const handleMergeWorktree = async (taskId: string) => {
    try {
      await invokeSafe("git_merge_worktree", {
        repoDir: currentWorkspace.value,
        taskId,
        targetBranch: "main",
      });
      setMsg(`Merged worktree for task ${taskId}`);
      fetchTasksAndWorktrees();
    } catch (e: unknown) {
      setMsg(`Merge failed: ${String(e)}`);
    }
  };

  const handleDiscardWorktree = async (taskId: string) => {
    try {
      await invokeSafe("git_discard_worktree", {
        repoDir: currentWorkspace.value,
        taskId,
      });
      setMsg(`Discarded worktree for task ${taskId}`);
      fetchTasksAndWorktrees();
    } catch (e: unknown) {
      setMsg(`Discard failed: ${String(e)}`);
    }
  };

  const handleRunStep = async (task: AgentTask) => {
    setRunningTaskId(task.id);
    setMsg(`Connecting to AI provider at ${settings.value.omniRouteEndpoint}...`);
    try {
      const res = await invokeSafe<string>("agent_query_provider", {
        endpoint: settings.value.omniRouteEndpoint,
        model: settings.value.defaultModel,
        systemPrompt: "You are the SV Code Editor built-in coding agent. Solve coding problems within workspace boundaries.",
        userPrompt: task.goal,
      });
      setMsg(`AI Response for [${task.id}]: ${res.slice(0, 120)}...`);
    } catch (err) {
      setMsg(`AI Provider error: ${String(err)}`);
    } finally {
      setRunningTaskId(null);
    }
  };

  const runningCount = agentTasks.value.filter((t) => t.status === "running").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Agents Hub</h3>
        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>
          Parallel Slots: {runningCount}/{maxParallel} (Limit: {settings.value.profile})
        </span>
      </div>

      <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--fg-muted)" }}>
        Autonomous agent platform with worktree isolation, task reports, and approval policies.
      </p>

      {/* Launch new task form */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-subtle)",
          padding: "10px",
          marginBottom: "14px",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>New Agent Task</div>
        <textarea
          value={taskPrompt}
          onInput={(e) => setTaskPrompt((e.target as HTMLTextAreaElement).value)}
          placeholder="Describe goal or instruction (e.g. Implement feature X with tests)..."
          rows={3}
          style={{ width: "100%", boxSizing: "border-box", marginBottom: "8px", resize: "none" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode((e.target as HTMLSelectElement).value as any)}
            style={{ fontSize: "11px" }}
          >
            <option value="ask-first">Ask-First Mode</option>
            <option value="plan">Plan-First (Read-Only until approved)</option>
            <option value="auto-accept">Auto-Accept Edits</option>
          </select>

          <button onClick={handleLaunchTask} className="primary" style={{ fontSize: "11px", padding: "3px 10px" }}>
            Queue Task
          </button>
        </div>
      </div>

      {msg && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            padding: "6px",
            marginBottom: "10px",
            fontSize: "11px",
          }}
        >
          {msg}
        </div>
      )}

      {/* Tasks Queue List */}
      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>Tasks Queue</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        {agentTasks.value.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--fg-muted)", fontStyle: "italic" }}>No active agent tasks.</div>
        ) : (
          agentTasks.value.map((task) => (
            <div
              key={task.id}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "var(--border-width) solid var(--border-subtle)",
                padding: "8px 10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontWeight: 600, fontSize: "12px" }}>{task.title}</span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "1px 5px",
                    backgroundColor:
                      task.status === "running"
                        ? "var(--accent)"
                        : task.status === "done"
                        ? "var(--color-success)"
                        : "var(--bg-surface-hover)",
                    color: task.status === "running" ? "var(--accent-fg)" : "var(--fg-default)",
                  }}
                >
                  {task.status}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "4px" }}>
                Goal: {task.goal}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <span style={{ fontSize: "10px", color: "var(--fg-subtle)" }}>
                  Branch: {task.branch} • Mode: {task.mode} • Model: {task.model}
                </span>
                <button
                  onClick={() => handleRunStep(task)}
                  disabled={runningTaskId === task.id}
                  style={{ fontSize: "10px", padding: "2px 6px" }}
                >
                  {runningTaskId === task.id ? "Running..." : "Run Step"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Worktrees Isolation Section */}
      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>Isolated Worktrees (.sv/worktrees/)</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {worktrees.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--fg-muted)", fontStyle: "italic" }}>No isolated worktrees active.</div>
        ) : (
          worktrees.map((wt) => (
            <div
              key={wt.path}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "var(--border-width) solid var(--border-subtle)",
                padding: "8px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "12px" }}>Task: {wt.taskId}</div>
                <div style={{ fontSize: "11px", color: "var(--fg-muted)" }}>Branch: {wt.branch}</div>
                <div style={{ fontSize: "10px", color: "var(--fg-subtle)" }}>Commit: {wt.commitHash.slice(0, 7)}</div>
              </div>

              {wt.taskId !== "main" && (
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => handleMergeWorktree(wt.taskId)} style={{ fontSize: "10px", padding: "2px 6px" }}>
                    Merge
                  </button>
                  <button
                    onClick={() => handleDiscardWorktree(wt.taskId)}
                    style={{ fontSize: "10px", padding: "2px 6px", color: "var(--color-error)" }}
                  >
                    Discard
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

