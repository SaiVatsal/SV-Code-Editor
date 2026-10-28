import { useState } from "preact/hooks";
import {
  currentWorkspace,
  settings,
  userProfile,
  isCommandPaletteOpen,
  isQuickOpenOpen,
} from "@/state/appState";
import { MenuBar } from "@/components/MenuBar/MenuBar";
import { GoogleSignInModal } from "@/components/Modals/GoogleSignInModal";

export function TitleBar() {
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const isSafeMode = typeof window !== "undefined" && window.location.search.includes("safe-mode");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "30px",
        backgroundColor: "var(--bg-activitybar)",
        borderBottom: "var(--border-width) solid var(--border-subtle)",
        padding: "0 6px",
        fontSize: "12px",
        userSelect: "none",
      }}
    >
      {/* Left: Menu bar with File, Edit, Selection, View, Go, Run, Terminal, Help */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <MenuBar />
      </div>

      {/* Center: Current Workspace title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--fg-muted)",
          fontSize: "12px",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--accent)" }}>SV Code</span>
        <span style={{ color: "var(--fg-subtle)" }}>—</span>
        <span style={{ color: "var(--fg-default)" }}>{currentWorkspace.value}</span>
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
      </div>

      {/* Right: Quick actions & Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={() => (isQuickOpenOpen.value = true)}
          style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "transparent" }}
          title="Quick Open (Ctrl+P)"
        >
          <span className="codicon codicon-search" style={{ marginRight: "3px" }} />
          Quick Open
        </button>

        <button
          onClick={() => (isCommandPaletteOpen.value = true)}
          style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "transparent" }}
          title="Command Palette (Ctrl+Shift+P)"
        >
          <span className="codicon codicon-terminal" style={{ marginRight: "3px" }} />
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
          <strong>{settings.value.profile}</strong>
        </span>

        <button
          onClick={() => setIsSignInModalOpen(true)}
          style={{
            padding: "2px 8px",
            fontSize: "11px",
            backgroundColor: userProfile.value?.isAuthenticated ? "rgba(34, 197, 94, 0.15)" : "var(--bg-surface)",
            color: userProfile.value?.isAuthenticated ? "var(--color-success)" : "var(--fg-default)",
            border: "var(--border-width) solid var(--border-subtle)",
          }}
          title="Google Sign-In & Settings Sync"
        >
          <span
            className={userProfile.value?.isAuthenticated ? "codicon codicon-pass-filled" : "codicon codicon-account"}
            style={{ marginRight: "4px" }}
          />
          {userProfile.value?.isAuthenticated ? userProfile.value.name : "Sign In"}
        </button>
      </div>

      <GoogleSignInModal isOpen={isSignInModalOpen} onClose={() => setIsSignInModalOpen(false)} />
    </div>
  );
}
