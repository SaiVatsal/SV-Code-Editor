import { useState, useEffect } from "preact/hooks";
import { processEntries, hardwareInfo, settings } from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { ProcessMemoryEntry } from "@/types/models";

export function ProcessMonitorView() {
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchProcesses = async () => {
    setLoading(true);
    try {
      const list = await invokeSafe<ProcessMemoryEntry[]>("get_process_monitor");
      processEntries.value = list;
    } catch (err) {
      console.error("Failed to fetch processes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleKill = async (pid?: number) => {
    if (!pid) return;
    try {
      await invokeSafe("kill_process", { pid });
      setMsg(`Terminated process ${pid}`);
      fetchProcesses();
    } catch (e: unknown) {
      setMsg(`Failed to stop process: ${String(e)}`);
    }
  };

  const totalTrackedMem = processEntries.value.reduce((acc, p) => acc + p.memoryMb, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Process Monitor</h3>
        <button onClick={fetchProcesses} disabled={loading} style={{ fontSize: "11px", padding: "2px 6px" }}>
          Refresh
        </button>
      </div>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-subtle)",
          padding: "8px",
          marginBottom: "12px",
          fontSize: "12px",
        }}
      >
        <div>
          Total RAM: <strong>{hardwareInfo.value?.totalRamMb || 0} MB</strong> • Free:{" "}
          <strong>{hardwareInfo.value?.availableRamMb || 0} MB</strong>
        </div>
        <div style={{ marginTop: "4px", color: "var(--fg-muted)" }}>
          Active Profile: <strong>{settings.value.profile}</strong> • Tracked Components Memory:{" "}
          <strong>{totalTrackedMem.toFixed(1)} MB</strong>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        {processEntries.value.length === 0 ? (
          <div style={{ color: "var(--fg-muted)", fontSize: "12px", fontStyle: "italic" }}>
            No background processes detected.
          </div>
        ) : (
          processEntries.value.map((p) => (
            <div
              key={`${p.name}-${p.pid}`}
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
                <div style={{ fontWeight: 600, fontSize: "12px" }}>{p.name}</div>
                <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "2px" }}>
                  Memory: <strong>{p.memoryMb.toFixed(1)} MB</strong> • CPU:{" "}
                  <strong>{p.cpuPercent.toFixed(1)}%</strong> • Category: {p.category}
                </div>
              </div>

              <div>
                {p.canStop && p.pid ? (
                  <button
                    onClick={() => handleKill(p.pid)}
                    style={{ fontSize: "11px", color: "var(--color-error)", padding: "2px 6px" }}
                  >
                    Stop
                  </button>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--fg-subtle)" }}>Protected</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

