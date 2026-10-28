import { useState } from "preact/hooks";
import { userProfile } from "@/state/appState";
import { invokeSafe } from "@/services/api";

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleSignInModal({ isOpen, onClose }: GoogleSignInModalProps) {
  const [clientId, setClientId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleDemoSignIn = () => {
    userProfile.value = {
      isAuthenticated: true,
      name: "Vatsal (Local Sync)",
      email: "vatsal@personal.local",
      picture: "",
    };
    onClose();
  };

  const handleRealOAuth = async () => {
    try {
      setErrorMsg("");
      const authUrl = await invokeSafe<string>("auth_start_login");
      window.open(authUrl, "_blank");
      onClose();
    } catch (e: any) {
      setErrorMsg(
        "OAuth requires a registered GCP Client ID. You can click 'Use Local Sync Mode' to sync settings locally immediately, or configure SV_GOOGLE_CLIENT_ID."
      );
    }
  };

  const handleSignOut = async () => {
    try {
      await invokeSafe("auth_sign_out");
    } catch (e) {
      // ignore
    }
    userProfile.value = null;
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "440px",
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-subtle)",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="codicon codicon-account" style={{ fontSize: "18px", color: "var(--accent)" }} />
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Google Sign-In & Settings Sync</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--fg-muted)",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ×
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "12px", color: "var(--fg-muted)", lineHeight: "1.5" }}>
          Sync your editor configuration, keybindings, and extensions across devices via Google Drive appdata.
        </p>

        {userProfile.value?.isAuthenticated ? (
          <div
            style={{
              padding: "12px",
              backgroundColor: "var(--bg-app)",
              border: "var(--border-width) solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className="codicon codicon-pass-filled" style={{ color: "var(--color-success)" }} />
              <span style={{ fontSize: "13px", fontWeight: 600 }}>Connected as {userProfile.value.name}</span>
            </div>
            <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>{userProfile.value.email}</span>
            <button
              onClick={handleSignOut}
              style={{
                marginTop: "6px",
                padding: "6px",
                backgroundColor: "var(--bg-surface)",
                border: "var(--border-width) solid var(--border-subtle)",
                color: "var(--color-danger)",
                cursor: "pointer",
              }}
            >
              Sign Out & Purge Tokens
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={handleDemoSignIn}
              style={{
                padding: "8px 12px",
                backgroundColor: "var(--accent)",
                color: "#ffffff",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span className="codicon codicon-check" />
              Use Local Sync / One-Click Sign In
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
              <span style={{ fontSize: "10px", color: "var(--fg-muted)" }}>OR CLOUD OAUTH</span>
              <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border-subtle)" }} />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "var(--fg-muted)", marginBottom: "4px" }}>
                Google Cloud Client ID (Optional):
              </label>
              <input
                type="text"
                value={clientId}
                onInput={(e) => setClientId((e.target as HTMLInputElement).value)}
                placeholder="xxxx-xxxx.apps.googleusercontent.com"
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: "11px",
                  backgroundColor: "var(--bg-app)",
                  border: "var(--border-width) solid var(--border-subtle)",
                  color: "var(--fg-default)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {errorMsg && (
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--color-warning)",
                  backgroundColor: "rgba(234, 179, 8, 0.1)",
                  padding: "8px",
                  borderLeft: "2px solid var(--color-warning)",
                }}
              >
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleRealOAuth}
              style={{
                padding: "6px 12px",
                backgroundColor: "var(--bg-app)",
                border: "var(--border-width) solid var(--border-subtle)",
                color: "var(--fg-default)",
                cursor: "pointer",
              }}
            >
              Connect with Google OAuth (Browser PKCE)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

