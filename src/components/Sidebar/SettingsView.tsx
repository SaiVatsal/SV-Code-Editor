import { useState } from "preact/hooks";
import { settings } from "@/state/appState";
import { invokeSafe } from "@/services/api";

export function SettingsView() {
  const [msg, setMsg] = useState<string | null>(null);

  const updateSetting = <K extends keyof typeof settings.value>(key: K, val: (typeof settings.value)[K]) => {
    const updated = { ...settings.value, [key]: val };
    settings.value = updated;
    if (key === "theme") {
      document.documentElement.setAttribute("data-theme", val as string);
    }
    invokeSafe("save_user_settings", { settingsJson: JSON.stringify(updated, null, 2) })
      .catch((err) => console.warn("Failed to persist settings:", err));
  };

  const handleSnapshotSettings = async () => {
    try {
      const path = await invokeSafe<string>("updater_snapshot_settings");
      setMsg(`Snapshot created at: ${path}`);
    } catch (e: unknown) {
      setMsg(`Snapshot error: ${String(e)}`);
    }
  };

  const handleRollbackSettings = async () => {
    try {
      await invokeSafe("updater_rollback_settings");
      setMsg("Settings rolled back from latest snapshot.");
    } catch (e: unknown) {
      setMsg(`Rollback error: ${String(e)}`);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Settings</h3>
        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>JSON Backed (%APPDATA%)</span>
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

      {/* Profile Section */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>Performance Profile</div>
        <select
          value={settings.value.profile}
          onChange={(e) => updateSetting("profile", (e.target as HTMLSelectElement).value as any)}
          style={{ width: "100%", fontSize: "12px" }}
        >
          <option value="Lite">Lite (≤ 3 GB RAM - Low memory engine, single agent)</option>
          <option value="Standard">Standard (4 to 8 GB RAM - Balanced)</option>
          <option value="Full">Full (&gt; 8 GB RAM - Max concurrency)</option>
        </select>
        <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "4px" }}>
          In Lite, minimap, bracket pair colorization, and semantic tokens are disabled, and language servers auto-stop after 5 min idle.
        </div>
      </div>

      {/* Theme Section */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>Color Theme</div>
        <select
          value={settings.value.theme}
          onChange={(e) => updateSetting("theme", (e.target as HTMLSelectElement).value as any)}
          style={{ width: "100%", fontSize: "12px" }}
        >
          <option value="dark">Dark (OKLCH Precision)</option>
          <option value="light">Light (High Contrast WCAG AA)</option>
          <option value="system">System Default</option>
        </select>
      </div>

      {/* Editor Preferences */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>Editor Preferences</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "6px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block" }}>Font Size (px)</label>
            <input
              type="number"
              min={10}
              max={28}
              value={settings.value.fontSize}
              onChange={(e) => updateSetting("fontSize", parseInt((e.target as HTMLInputElement).value, 10) || 13)}
              style={{ width: "100%", boxSizing: "border-box", fontSize: "12px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "11px", color: "var(--fg-muted)", display: "block" }}>Tab Size</label>
            <select
              value={settings.value.tabSize}
              onChange={(e) => updateSetting("tabSize", parseInt((e.target as HTMLSelectElement).value, 10) || 2)}
              style={{ width: "100%", fontSize: "12px" }}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
          <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.value.formatOnSave}
              onChange={(e) => updateSetting("formatOnSave", (e.target as HTMLInputElement).checked)}
            />
            <span>Format on Save</span>
          </label>
          <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.value.autoSave}
              onChange={(e) => updateSetting("autoSave", (e.target as HTMLInputElement).checked)}
            />
            <span>Auto Save</span>
          </label>
        </div>
      </div>

      {/* AI Agent Provider Settings */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>AI Model Provider (OmniRoute Default)</div>
        <input
          type="text"
          value={settings.value.omniRouteEndpoint}
          onInput={(e) => updateSetting("omniRouteEndpoint", (e.target as HTMLInputElement).value)}
          placeholder="http://127.0.0.1:20128/v1"
          style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", marginBottom: "4px" }}
        />
        <input
          type="text"
          value={settings.value.defaultModel}
          onInput={(e) => updateSetting("defaultModel", (e.target as HTMLInputElement).value)}
          placeholder="Default Model"
          style={{ width: "100%", boxSizing: "border-box", fontSize: "12px" }}
        />
      </div>

      {/* Sandbox & Permissions */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>Sandbox & Permissions</div>
        <select
          value={settings.value.sandboxLevel}
          onChange={(e) => updateSetting("sandboxLevel", (e.target as HTMLSelectElement).value as any)}
          style={{ width: "100%", fontSize: "12px", marginBottom: "6px" }}
        >
          <option value="read-only">Read-Only (No file or command writes)</option>
          <option value="workspace-write">Workspace-Write (Default - Isolated Job Object)</option>
          <option value="full-access">Full-Access (Explicit approval required)</option>
        </select>

        <select
          value={settings.value.approvalPolicy}
          onChange={(e) => updateSetting("approvalPolicy", (e.target as HTMLSelectElement).value as any)}
          style={{ width: "100%", fontSize: "12px" }}
        >
          <option value="always">Always Ask for Confirmation</option>
          <option value="risky-only">Ask for Risky Actions Only</option>
          <option value="never">Never Ask (Autonomous)</option>
        </select>
      </div>

      {/* Updater & Rollback */}
      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "var(--border-width) solid var(--border-subtle)" }}>
        <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px" }}>In-App Updates & Settings Safety</div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button onClick={handleSnapshotSettings} style={{ flex: 1, fontSize: "11px" }}>
            Snapshot Settings
          </button>
          <button onClick={handleRollbackSettings} style={{ flex: 1, fontSize: "11px" }}>
            Rollback Settings
          </button>
        </div>
      </div>
    </div>
  );
}
