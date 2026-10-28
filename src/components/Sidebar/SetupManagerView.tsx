import { useState, useEffect } from "preact/hooks";
import { setupComponents, settings } from "@/state/appState";
import { invokeSafe, listenSafe } from "@/services/api";
import type { ComponentStatus, SetupProgressEvent } from "@/types/models";

export function SetupManagerView() {
  const [loading, setLoading] = useState<boolean>(false);
  const [activeProgress, setActiveProgress] = useState<Record<string, SetupProgressEvent>>({});
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const list = await invokeSafe<ComponentStatus[]>("check_setup_status");
      setupComponents.value = list;
    } catch (err) {
      console.error("Failed to check components:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    const unlistenPromise = listenSafe<SetupProgressEvent>("setup-progress", (evt) => {
      setActiveProgress((prev) => ({
        ...prev,
        [evt.componentId]: evt,
      }));
      if (evt.stage === "completed" || evt.stage === "failed") {
        fetchStatus();
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const installComponent = async (id: string) => {
    setGlobalMessage(null);
    try {
      await invokeSafe("install_setup_component", { componentId: id });
    } catch (err: unknown) {
      setGlobalMessage(`Installation failed: ${String(err)}`);
    }
  };

  const handleInstallAll = async () => {
    for (const c of setupComponents.value) {
      if (!c.verified) {
        if (settings.value.profile === "Lite" && c.minRamGb >= 4) {
          continue; // skip high-memory tools in Lite mode
        }
        await installComponent(c.id);
      }
    }
  };

  const handleCleanUninstall = async () => {
    if (confirm("Are you sure you want to completely uninstall all portable tools from %LOCALAPPDATA%\\SV Code Editor\\tools\\?")) {
      try {
        await invokeSafe("clean_uninstall_tools");
        setGlobalMessage("All tools uninstalled cleanly.");
        fetchStatus();
      } catch (e: unknown) {
        setGlobalMessage(`Uninstall error: ${String(e)}`);
      }
    }
  };

  const isLite = settings.value.profile === "Lite";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>First-Run Setup Manager</h3>
        <button onClick={fetchStatus} disabled={loading} style={{ fontSize: "11px", padding: "2px 6px" }}>
          Refresh
        </button>
      </div>

      <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "var(--fg-muted)" }}>
        Installs portable runtimes and tools locally into <code>%LOCALAPPDATA%\SV Code Editor\tools\</code> without admin rights.
      </p>

      {isLite && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--color-warning)",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "12px",
          }}
        >
          <strong>Lite Profile Active (≤ 3 GB RAM):</strong>
          <div style={{ marginTop: "4px", color: "var(--fg-muted)" }}>
            Ghidra, JDK 21, and REA reverse engineering tools are skipped automatically to protect available memory.
          </div>
        </div>
      )}

      {globalMessage && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            padding: "8px",
            marginBottom: "12px",
            fontSize: "12px",
          }}
        >
          {globalMessage}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
        {setupComponents.value.map((c) => {
          const progress = activeProgress[c.id];
          const isSkippedInLite = isLite && c.minRamGb >= 4;

          return (
            <div
              key={c.id}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "var(--border-width) solid var(--border-subtle)",
                padding: "10px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px" }}>{c.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--fg-subtle)", marginTop: "2px" }}>
                    Version: {c.version} {c.minRamGb >= 4 ? `• Requires ≥ ${c.minRamGb} GB RAM` : ""}
                  </div>
                </div>

                <div>
                  {c.verified ? (
                    <span style={{ color: "var(--color-success)", fontWeight: 600, fontSize: "12px" }}>
                      ● Verified
                    </span>
                  ) : isSkippedInLite ? (
                    <span style={{ color: "var(--fg-subtle)", fontSize: "12px" }}>Skipped in Lite</span>
                  ) : (
                    <button
                      onClick={() => installComponent(c.id)}
                      className="primary"
                      style={{ fontSize: "11px", padding: "2px 8px" }}
                    >
                      Install
                    </button>
                  )}
                </div>
              </div>

              {progress && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginBottom: "4px" }}>
                    {progress.statusText} ({Math.round(progress.percent)}%)
                  </div>
                  <div className="static-progress-track">
                    <div className="static-progress-fill" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
              )}

              {c.smokeOutput && (
                <div style={{ fontSize: "11px", color: "var(--color-info)", marginTop: "6px" }}>
                  Smoke Test: {c.smokeOutput}
                </div>
              )}

              {c.errorMessage && (
                <div style={{ fontSize: "11px", color: "var(--color-warning)", marginTop: "6px" }}>
                  Notice: {c.errorMessage}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "12px", borderTop: "var(--border-width) solid var(--border-subtle)" }}>
        <button onClick={handleInstallAll} className="primary" style={{ flex: 1 }}>
          Install All Missing
        </button>
        <button onClick={fetchStatus}>Repair</button>
        <button onClick={handleCleanUninstall} style={{ color: "var(--color-error)" }}>
          Uninstall Tools
        </button>
      </div>
    </div>
  );
}

