import { useState, useEffect } from "preact/hooks";
import { currentWorkspace, gitStatus } from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { GitRepoStatus } from "@/types/models";

export function GitView() {
  const [commitMsg, setCommitMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await invokeSafe<GitRepoStatus>("git_status", { repoDir: currentWorkspace.value });
      gitStatus.value = res;
    } catch (e: unknown) {
      console.warn("Git status error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStage = async (file: string) => {
    try {
      await invokeSafe("git_stage", { repoDir: currentWorkspace.value, filePath: file });
      fetchStatus();
    } catch (e: unknown) {
      setStatusMsg(`Stage failed: ${String(e)}`);
    }
  };

  const handleUnstage = async (file: string) => {
    try {
      await invokeSafe("git_unstage", { repoDir: currentWorkspace.value, filePath: file });
      fetchStatus();
    } catch (e: unknown) {
      setStatusMsg(`Unstage failed: ${String(e)}`);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    try {
      await invokeSafe("git_commit", { repoDir: currentWorkspace.value, message: commitMsg });
      setCommitMsg("");
      setStatusMsg("Commit created successfully.");
      fetchStatus();
    } catch (e: unknown) {
      setStatusMsg(`Commit failed: ${String(e)}`);
    }
  };

  const stagedFiles = gitStatus.value?.files.filter((f) => f.staged) || [];
  const unstagedFiles = gitStatus.value?.files.filter((f) => !f.staged) || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Source Control</h3>
        <button onClick={fetchStatus} disabled={loading} style={{ fontSize: "11px", padding: "2px 6px" }}>
          Refresh
        </button>
      </div>

      <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginBottom: "8px" }}>
        Branch: <strong>{gitStatus.value?.currentBranch || "HEAD"}</strong>
      </div>

      {statusMsg && (
        <div style={{ fontSize: "11px", color: "var(--color-info)", marginBottom: "8px" }}>
          {statusMsg}
        </div>
      )}

      {/* Commit Input Box */}
      <div style={{ marginBottom: "12px" }}>
        <textarea
          value={commitMsg}
          onInput={(e) => setCommitMsg((e.target as HTMLTextAreaElement).value)}
          placeholder="Commit message (Ctrl+Enter to commit)..."
          rows={2}
          style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", marginBottom: "6px", resize: "none" }}
        />
        <button onClick={handleCommit} className="primary" style={{ width: "100%", fontSize: "11px" }}>
          Commit Changes
        </button>
      </div>

      {/* Staged Changes */}
      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
        Staged Changes ({stagedFiles.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "12px" }}>
        {stagedFiles.length === 0 ? (
          <div style={{ fontSize: "11px", color: "var(--fg-muted)", fontStyle: "italic" }}>No staged changes</div>
        ) : (
          stagedFiles.map((f) => (
            <div
              key={f.path}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3px 6px",
                fontSize: "11px",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <span>{f.path}</span>
              <button
                onClick={() => handleUnstage(f.path)}
                style={{ fontSize: "10px", padding: "1px 4px" }}
                title="Unstage changes"
              >
                -
              </button>
            </div>
          ))
        )}
      </div>

      {/* Changes */}
      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
        Changes ({unstagedFiles.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {unstagedFiles.length === 0 ? (
          <div style={{ fontSize: "11px", color: "var(--fg-muted)", fontStyle: "italic" }}>Working tree clean</div>
        ) : (
          unstagedFiles.map((f) => (
            <div
              key={f.path}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "3px 6px",
                fontSize: "11px",
                backgroundColor: "var(--bg-surface)",
              }}
            >
              <span>
                {f.path} <span style={{ color: "var(--color-warning)" }}>({f.status})</span>
              </span>
              <button
                onClick={() => handleStage(f.path)}
                style={{ fontSize: "10px", padding: "1px 4px" }}
                title="Stage changes"
              >
                +
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

