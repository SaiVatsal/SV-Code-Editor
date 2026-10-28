import { gitStatus, settings, hardwareInfo, isBottomPanelVisible, activeBottomPanel } from "@/state/appState";

export function StatusBar() {
  const currentBranch = gitStatus.value?.currentBranch || "main";
  const profile = settings.value.profile;
  const sandbox = settings.value.sandboxLevel;

  return (
    <div
      style={{
        height: "22px",
        backgroundColor: "var(--bg-statusbar)",
        color: "var(--fg-default)",
        fontSize: "11px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 8px",
        userSelect: "none",
        borderTop: "var(--border-width) solid var(--border-subtle)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
          <span className="codicon codicon-source-control" style={{ fontSize: "12px" }} />
          <span>{currentBranch}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className="codicon codicon-error" style={{ fontSize: "11px", color: "var(--color-error)" }} />
          <span>0</span>
          <span className="codicon codicon-warning" style={{ fontSize: "11px", color: "var(--color-warning)" }} />
          <span>0</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          onClick={() => {
            isBottomPanelVisible.value = !isBottomPanelVisible.value;
            activeBottomPanel.value = "terminal";
          }}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          title="Toggle Terminal"
        >
          <span className="codicon codicon-terminal" style={{ fontSize: "12px" }} />
          <span>Terminal</span>
        </div>

        <span style={{ color: "var(--fg-subtle)" }}>|</span>

        <span title="Windows Job Object Sandbox Level">
          Sandbox: <strong>{sandbox}</strong>
        </span>

        <span style={{ color: "var(--fg-subtle)" }}>|</span>

        <span
          style={{
            padding: "1px 6px",
            backgroundColor: profile === "Lite" ? "var(--color-warning)" : "var(--bg-surface)",
            color: profile === "Lite" ? "#000" : "var(--fg-default)",
            fontWeight: 600,
          }}
          title="Active Performance Profile"
        >
          {profile}
        </span>

        {hardwareInfo.value && (
          <span style={{ color: "var(--fg-muted)" }}>
            Free: {hardwareInfo.value.availableRamMb} MB
          </span>
        )}

        <span style={{ color: "var(--fg-subtle)" }}>|</span>

        <span style={{ color: "var(--color-success)" }} title="Default Local AI Gateway">
          ● OmniRoute
        </span>
      </div>
    </div>
  );
}
