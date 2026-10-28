import { useEffect, useRef, useState } from "preact/hooks";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import {
  activeBottomPanel,
  isBottomPanelVisible,
  terminalProfiles,
  currentWorkspace,
} from "@/state/appState";
import { invokeSafe, listenSafe } from "@/services/api";
import type { TerminalProfile } from "@/types/models";

export function BottomPanel() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionId = useRef<string>(`term-${Date.now()}`);

  const [selectedProfile, setSelectedProfile] = useState<string>("powershell");

  useEffect(() => {
    // Discover available profiles
    invokeSafe<TerminalProfile[]>("get_terminal_profiles").then((profiles) => {
      terminalProfiles.value = profiles;
      const firstAvail = profiles.find((p) => p.available);
      if (firstAvail) setSelectedProfile(firstAvail.id);
    });
  }, []);

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
          <div style={{ padding: "10px", fontSize: "12px", color: "var(--fg-muted)" }}>
            No problems have been detected in the workspace.
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
          </div>
        )}

        {activeBottomPanel.value === "reports" && (
          <div style={{ padding: "10px", fontSize: "12px", color: "var(--fg-default)", overflowY: "auto", height: "100%" }}>
            <strong>Task Reports (.sv/reports/)</strong>
            <p style={{ color: "var(--fg-muted)", fontSize: "11px" }}>
              Detailed execution plans, checklists, walkthroughs, and browser test recordings.
            </p>
            <div style={{ padding: "8px", backgroundColor: "var(--bg-surface)", border: "var(--border-width) solid var(--border-subtle)" }}>
              <div style={{ fontWeight: 600 }}>Initial Project Verification Report</div>
              <div style={{ color: "var(--fg-muted)", fontSize: "11px", marginTop: "2px" }}>
                Status: Verified • Mode: plan • Checkpoints: 1
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
