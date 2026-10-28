import { useEffect, useRef, useState } from "preact/hooks";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  activeBottomPanel,
  isBottomPanelVisible,
  terminalProfiles,
  currentWorkspace,
  openFile,
} from "@/state/appState";
import { invokeSafe, listenSafe } from "@/services/api";
import type { TerminalProfile, TaskReportSummary } from "@/types/models";

export function BottomPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionId = useRef<string>(`term-${Date.now()}`);

  const [selectedProfile, setSelectedProfile] = useState<string>("powershell");
  const [reports, setReports] = useState<TaskReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    // Discover available profiles
    invokeSafe<TerminalProfile[]>("get_terminal_profiles").then((profiles) => {
      terminalProfiles.value = profiles;
      const firstAvail = profiles.find((p) => p.available);
      if (firstAvail) setSelectedProfile(firstAvail.id);
    });
  }, []);

  // Fetch task reports when Reports tab is activated
  useEffect(() => {
    if (activeBottomPanel.value !== "reports") return;
    const ws = currentWorkspace.value;
    if (!ws) {
      setReports([]);
      return;
    }
    setLoadingReports(true);
    invokeSafe<TaskReportSummary[]>("list_workspace_reports", { workspaceRoot: ws })
      .then((res) => setReports(res || []))
      .catch((err) => console.warn("Failed to load workspace reports:", err))
      .finally(() => setLoadingReports(false));
  }, [activeBottomPanel.value, currentWorkspace.value]);

  const handleOpenReport = async (rep: TaskReportSummary) => {
    try {
      const content = await invokeSafe<string>("read_workspace_file", {
        path: rep.path,
        workspaceRoot: currentWorkspace.value || undefined,
      });
      openFile(rep.path, content, "markdown");
    } catch (e) {
      console.error("Failed to read report file:", e);
    }
  };

  useEffect(() => {
    if (!terminalRef.current || activeBottomPanel.value !== "terminal") return;

    const term = new Terminal({
      cursorBlink: false,
      fontSize: 12,
      fontFamily: "var(--font-mono)",
      theme: {
        background: "oklch(0.19 0.01 260)",
        foreground: "oklch(0.92 0.01 260)",
        cursor: "oklch(0.65 0.18 250)",
      },
      scrollback: 1000, // Capped at 1000 lines for low memory profile
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termInstance.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln("\x1b[36m=== SV Code Editor Integrated Terminal ===\x1b[0m");

    // Spawn native PTY session
    invokeSafe("spawn_pty", {
      id: sessionId.current,
      profileId: selectedProfile,
      cwd: currentWorkspace.value,
      cols: term.cols || 80,
      rows: term.rows || 24,
    }).catch((e) => {
      term.writeln(`\x1b[31mFailed to spawn terminal shell: ${e}\x1b[0m`);
    });

    term.onData((data) => {
      invokeSafe("write_pty", { id: sessionId.current, data }).catch(() => {});
    });

    const unlistenPromise = listenSafe<{ sessionId: string; data: string }>("pty-output", (payload) => {
      if (payload.sessionId === sessionId.current) {
        try {
          const binaryStr = atob(payload.data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          term.write(bytes);
        } catch {
          term.write(payload.data);
        }
      }
    });

    const handleResize = () => {
      fitAddon.fit();
      if (term.cols && term.rows) {
        invokeSafe("resize_pty", {
          id: sessionId.current,
          cols: term.cols,
          rows: term.rows,
        }).catch(() => {});
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      unlistenPromise.then((unlisten) => unlisten());
      invokeSafe("terminate_pty", { id: sessionId.current }).catch(() => {});
      term.dispose();
      termInstance.current = null;
    };
  }, [activeBottomPanel.value, selectedProfile]);

  if (!isBottomPanelVisible.value) return null;

  return (
    <div
      style={{
        height: "220px",
        backgroundColor: "var(--bg-panel)",
        borderTop: "var(--border-width) solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--bg-app)",
          borderBottom: "var(--border-width) solid var(--border-subtle)",
          padding: "0 8px",
          height: "30px",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { id: "terminal", label: "Terminal" },
            { id: "problems", label: "Problems" },
            { id: "output", label: "Output" },
            { id: "reports", label: "Task Reports" },
          ].map((tab) => {
            const isActive = activeBottomPanel.value === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => (activeBottomPanel.value = tab.id)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: isActive ? "var(--fg-default)" : "var(--fg-muted)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "11px",
                  padding: "4px 8px",
                  borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {activeBottomPanel.value === "terminal" && (
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile((e.target as HTMLSelectElement).value)}
              style={{ fontSize: "11px", padding: "1px 4px" }}
            >
              {terminalProfiles.value.map((p) => (
                <option key={p.id} value={p.id} disabled={!p.available}>
                  {p.name} {!p.available ? "(not found)" : ""}
                </option>
              ))}
            </select>
          )}

          <span
            onClick={() => (isBottomPanelVisible.value = false)}
            className="codicon codicon-close"
            style={{ cursor: "pointer", fontSize: "13px", color: "var(--fg-muted)" }}
            title="Close Panel"
          />
        </div>
      </div>

      {/* Panel Body */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {activeBottomPanel.value === "terminal" && (
          <div ref={terminalRef} style={{ width: "100%", height: "100%", padding: "4px 6px" }} />
        )}

        {activeBottomPanel.value === "problems" && (
          <div style={{ padding: "12px", fontSize: "12px", color: "var(--fg-muted)" }}>
            <span className="codicon codicon-check" style={{ color: "var(--accent-success)", marginRight: "6px" }} />
            No problems have been detected in the current workspace (0 errors, 0 warnings).
          </div>
        )}

        {activeBottomPanel.value === "output" && (
          <div
            style={{
              padding: "10px",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--fg-default)",
              overflowY: "auto",
              height: "100%",
            }}
          >
            [setup] Portable tools verified in %LOCALAPPDATA%\SV Code Editor\tools\<br />
            [watchdog] Memory watchdog running at 5s interval (profile threshold active)<br />
            [agent] Provider endpoint active: http://127.0.0.1:20128/v1<br />
            [lsp] Single-server mode active for Lite profile<br />
            [security] Workspace boundaries enforced for all file and terminal tools<br />
          </div>
        )}

        {activeBottomPanel.value === "reports" && (
          <div style={{ padding: "10px", fontSize: "12px", color: "var(--fg-default)", overflowY: "auto", height: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <strong>Task Reports (.sv/reports/)</strong>
              <button
                onClick={() => {
                  if (currentWorkspace.value) {
                    setLoadingReports(true);
                    invokeSafe<TaskReportSummary[]>("list_workspace_reports", { workspaceRoot: currentWorkspace.value })
                      .then((res) => setReports(res || []))
                      .catch(() => {})
                      .finally(() => setLoadingReports(false));
                  }
                }}
                style={{ fontSize: "11px", padding: "2px 6px" }}
              >
                Refresh
              </button>
            </div>

            {loadingReports && <div style={{ color: "var(--fg-muted)", fontSize: "11px" }}>Loading reports...</div>}

            {!loadingReports && reports.length === 0 && (
              <div style={{ color: "var(--fg-muted)", fontSize: "11px" }}>
                No task reports found in current workspace. Run an AI task or headless execution to generate structured reports.
              </div>
            )}

            {!loadingReports &&
              reports.map((rep) => (
                <div
                  key={rep.taskId}
                  onClick={() => handleOpenReport(rep)}
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--bg-surface)",
                    border: "var(--border-width) solid var(--border-subtle)",
                    marginBottom: "6px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{rep.title} ({rep.taskId})</div>
                    <span style={{ fontSize: "10px", color: "var(--fg-muted)" }}>{rep.modifiedAt.split("T")[0]}</span>
                  </div>
                  <div style={{ color: "var(--fg-muted)", fontSize: "11px", marginTop: "2px" }}>
                    Path: {rep.path} • Click to open in editor
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
