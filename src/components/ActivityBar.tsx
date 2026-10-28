import { activeSidebarView, isSidebarVisible, inboxItems } from "@/state/appState";

export function ActivityBar() {
  const pendingInboxCount = inboxItems.value.filter((i) => i.status === "pending").length;

  const items = [
    { id: "explorer", icon: "codicon-files", title: "Explorer (Ctrl+Shift+E)" },
    { id: "search", icon: "codicon-search", title: "Search (Ctrl+Shift+F)" },
    { id: "git", icon: "codicon-source-control", title: "Source Control (Ctrl+Shift+G)" },
    { id: "agents", icon: "codicon-hubot", title: "Agents Hub & Worktrees" },
    {
      id: "inbox",
      icon: "codicon-inbox",
      title: "Unified Inbox (Approvals & Results)",
      badge: pendingInboxCount > 0 ? pendingInboxCount : undefined,
    },
    { id: "re", icon: "codicon-microscope", title: "Reverse Engineering (REA + Ghidra)" },
    { id: "process", icon: "codicon-pulse", title: "Process Monitor & Memory Watchdog" },
    { id: "setup", icon: "codicon-tools", title: "First-Run Setup Manager" },
    { id: "extensions", icon: "codicon-extensions", title: "Extensions & Plugins" },
  ];

  const handleSelect = (id: string) => {
    if (activeSidebarView.value === id && isSidebarVisible.value) {
      isSidebarVisible.value = false;
    } else {
      activeSidebarView.value = id;
      isSidebarVisible.value = true;
    }
  };

  return (
    <div
      style={{
        width: "48px",
        backgroundColor: "var(--bg-activitybar)",
        borderRight: "var(--border-width) solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        userSelect: "none",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
        {items.map((item) => {
          const isActive = activeSidebarView.value === item.id && isSidebarVisible.value;
          return (
            <div
              key={item.id}
              onClick={() => handleSelect(item.id)}
              title={item.title}
              style={{
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: isActive ? "var(--fg-default)" : "var(--fg-muted)",
                borderLeft: isActive
                  ? "2px solid var(--accent)"
                  : "2px solid transparent",
                position: "relative",
              }}
            >
              <span className={`codicon ${item.icon}`} style={{ fontSize: "20px" }} />
              {item.badge !== undefined && (
                <span
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "8px",
                    backgroundColor: "var(--accent)",
                    color: "var(--accent-fg)",
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "1px 4px",
                    borderRadius: "0",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
        <div
          onClick={() => handleSelect("settings")}
          title="Settings (Ctrl+,)"
          style={{
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: activeSidebarView.value === "settings" && isSidebarVisible.value ? "var(--fg-default)" : "var(--fg-muted)",
            borderLeft: activeSidebarView.value === "settings" && isSidebarVisible.value
              ? "2px solid var(--accent)"
              : "2px solid transparent",
          }}
        >
          <span className="codicon codicon-settings-gear" style={{ fontSize: "20px" }} />
        </div>
      </div>
    </div>
  );
}

