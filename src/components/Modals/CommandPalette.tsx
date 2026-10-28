import { useState, useEffect } from "preact/hooks";
import { isCommandPaletteOpen, activeSidebarView, isSidebarVisible, settings } from "@/state/appState";

interface PaletteCommand {
  id: string;
  title: string;
  category: string;
  action: () => void;
}

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: PaletteCommand[] = [
    {
      id: "agent-task",
      title: "Agents Hub: Queue New Agent Task",
      category: "Agent",
      action: () => {
        activeSidebarView.value = "agents";
        isSidebarVisible.value = true;
      },
    },
    {
      id: "agent-inbox",
      title: "Inbox: View Approvals and Questions",
      category: "Agent",
      action: () => {
        activeSidebarView.value = "inbox";
        isSidebarVisible.value = true;
      },
    },
    {
      id: "rea-analyze",
      title: "Reverse Engineering: Analyze Binary with REA + Ghidra",
      category: "Reverse Engineering",
      action: () => {
        activeSidebarView.value = "re";
        isSidebarVisible.value = true;
      },
    },
    {
      id: "setup-manager",
      title: "Setup Manager: Manage Portable Runtimes & Tools",
      category: "Setup",
      action: () => {
        activeSidebarView.value = "setup";
        isSidebarVisible.value = true;
      },
    },
    {
      id: "profile-lite",
      title: "Profile: Activate Lite Profile (≤ 3 GB RAM Optimizations)",
      category: "Performance",
      action: () => {
        settings.value = { ...settings.value, profile: "Lite" };
      },
    },
    {
      id: "profile-standard",
      title: "Profile: Activate Standard Profile (4 to 8 GB RAM)",
      category: "Performance",
      action: () => {
        settings.value = { ...settings.value, profile: "Standard" };
      },
    },
    {
      id: "profile-full",
      title: "Profile: Activate Full Profile (> 8 GB RAM)",
      category: "Performance",
      action: () => {
        settings.value = { ...settings.value, profile: "Full" };
      },
    },
    {
      id: "toggle-theme",
      title: "View: Toggle Dark / Light Theme",
      category: "View",
      action: () => {
        const nextTheme = settings.value.theme === "dark" ? "light" : "dark";
        settings.value = { ...settings.value, theme: nextTheme };
        document.documentElement.setAttribute("data-theme", nextTheme);
      },
    },
    {
      id: "process-monitor",
      title: "View: Open Process Monitor & Memory Watchdog",
      category: "View",
      action: () => {
        activeSidebarView.value = "process";
        isSidebarVisible.value = true;
      },
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      isCommandPaletteOpen.value = false;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) {
        cmd.action();
        isCommandPaletteOpen.value = false;
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex]);

  if (!isCommandPaletteOpen.value) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        justifyContent: "center",
        paddingTop: "60px",
        zIndex: 2000,
      }}
      onClick={() => (isCommandPaletteOpen.value = false)}
    >
      <div
        style={{
          width: "560px",
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-strong)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "360px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "8px", borderBottom: "var(--border-width) solid var(--border-subtle)" }}>
          <input
            autoFocus
            type="text"
            value={query}
            onInput={(e) => {
              setQuery((e.target as HTMLInputElement).value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            style={{ width: "100%", boxSizing: "border-box", fontSize: "13px" }}
          />
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
          {filtered.map((cmd, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  isCommandPaletteOpen.value = false;
                }}
                style={{
                  padding: "6px 12px",
                  backgroundColor: isSelected ? "var(--bg-surface-active)" : "transparent",
                  color: isSelected ? "var(--fg-default)" : "var(--fg-muted)",
                  fontSize: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <span>{cmd.title}</span>
                <span style={{ fontSize: "10px", color: "var(--fg-subtle)" }}>{cmd.category}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
