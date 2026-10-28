import {
  currentWorkspace,
  settings,
  userProfile,
  isCommandPaletteOpen,
  isQuickOpenOpen,
} from "@/state/appState";
import { invokeSafe } from "@/services/api";

export function TitleBar() {
  const isSafeMode = typeof window !== "undefined" && window.location.search.includes("safe-mode");

  const handleGoogleSignIn = async () => {
    try {
      const authUrl = await invokeSafe<string>("auth_start_login");
      window.open(authUrl, "_blank");
    } catch (e) {
      alert("Google Sign-In: Configure SV_GOOGLE_CLIENT_ID in settings first (see SETUP-GOOGLE.md).");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "32px",
        backgroundColor: "var(--bg-activitybar)",
        borderBottom: "var(--border-width) solid var(--border-subtle)",
        padding: "0 10px",
        fontSize: "12px",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontWeight: 600, color: "var(--accent)" }}>SV Code</span>
        <span style={{ color: "var(--fg-muted)" }}>v1.0.0</span>
        {isSafeMode && (
          <span
            style={{
              backgroundColor: "var(--color-warning)",
              color: "#000",
              padding: "1px 6px",
              fontWeight: 600,
              fontSize: "10px",
            }}
          >
            SAFE MODE
          </span>
        )}
        <span style={{ color: "var(--fg-subtle)" }}>—</span>
        <span style={{ color: "var(--fg-default)" }}>{currentWorkspace.value}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => (isQuickOpenOpen.value = true)}
          style={{ padding: "2px 8px", fontSize: "11px" }}
          title="Quick Open (Ctrl+P)"
        >
          <span className="codicon codicon-search" style={{ marginRight: "4px" }} />
          Quick Open
        </button>

        <button
          onClick={() => (isCommandPaletteOpen.value = true)}
          style={{ padding: "2px 8px", fontSize: "11px" }}
          title="Command Palette (Ctrl+Shift+P)"
        >
          <span className="codicon codicon-terminal" style={{ marginRight: "4px" }} />
          Palette
        </button>

        <span
          style={{
            padding: "2px 6px",
            backgroundColor: "var(--bg-surface)",
            border: "var(--border-width) solid var(--border-subtle)",
            fontSize: "11px",
            color: "var(--fg-muted)",
          }}
        >
          Profile: <strong>{settings.value.profile}</strong>
        </span>

        <button
          onClick={handleGoogleSignIn}
          style={{ padding: "2px 8px", fontSize: "11px" }}
          title="Optional Google Sign-In & Settings Sync"
        >
          <span className="codicon codicon-account" style={{ marginRight: "4px" }} />
          {userProfile.value?.isAuthenticated ? userProfile.value.name : "Sign In"}
        </button>
      </div>
    </div>
  );
}

