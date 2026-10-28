import { useEffect } from "preact/hooks";
import { TitleBar } from "@/components/TitleBar";
import { ActivityBar } from "@/components/ActivityBar";
import { StatusBar } from "@/components/StatusBar";
import { EditorContainer } from "@/components/Editor/EditorContainer";
import { BottomPanel } from "@/components/BottomPanel/BottomPanel";
import { CommandPalette } from "@/components/Modals/CommandPalette";
import { QuickOpen } from "@/components/Modals/QuickOpen";

// Sidebar views
import { ExplorerView } from "@/components/Sidebar/ExplorerView";
import { SearchView } from "@/components/Sidebar/SearchView";
import { GitView } from "@/components/Sidebar/GitView";
import { AgentsHubView } from "@/components/Sidebar/AgentsHubView";
import { InboxView } from "@/components/Sidebar/InboxView";
import { ReView } from "@/components/Sidebar/ReView";
import { ProcessMonitorView } from "@/components/Sidebar/ProcessMonitorView";
import { SetupManagerView } from "@/components/Sidebar/SetupManagerView";
import { ExtensionsView } from "@/components/Sidebar/ExtensionsView";
import { SettingsView } from "@/components/Sidebar/SettingsView";

import {
  activeSidebarView,
  isSidebarVisible,
  isBottomPanelVisible,
  isCommandPaletteOpen,
  isQuickOpenOpen,
  hardwareInfo,
  settings,
} from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { HardwareInfo } from "@/types/models";

export function App() {
  useEffect(() => {
    // Detect hardware & initial profile
    invokeSafe<HardwareInfo>("get_hardware_info")
      .then((info) => {
        hardwareInfo.value = info;
        if (settings.value.profile !== info.activeProfile) {
          settings.value = { ...settings.value, profile: info.activeProfile };
        }
      })
      .catch((e) => console.warn("Failed to get hardware info:", e));

    // Global Keybindings (VS Code Defaults)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        isQuickOpenOpen.value = true;
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "P" || e.key === "p")) {
        e.preventDefault();
        isCommandPaletteOpen.value = true;
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        isSidebarVisible.value = !isSidebarVisible.value;
      } else if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        isBottomPanelVisible.value = !isBottomPanelVisible.value;
      } else if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        activeSidebarView.value = "settings";
        isSidebarVisible.value = true;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderSidebarView = () => {
    switch (activeSidebarView.value) {
      case "explorer":
        return <ExplorerView />;
      case "search":
        return <SearchView />;
      case "git":
        return <GitView />;
      case "agents":
        return <AgentsHubView />;
      case "inbox":
        return <InboxView />;
      case "re":
        return <ReView />;
      case "process":
        return <ProcessMonitorView />;
      case "setup":
        return <SetupManagerView />;
      case "extensions":
        return <ExtensionsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <ExplorerView />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        backgroundColor: "var(--bg-app)",
        overflow: "hidden",
      }}
    >
      <TitleBar />

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        <ActivityBar />

        {/* Sidebar */}
        {isSidebarVisible.value && (
          <div
            style={{
              width: "280px",
              backgroundColor: "var(--bg-sidebar)",
              borderRight: "var(--border-width) solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {renderSidebarView()}
          </div>
        )}

        {/* Editor & Bottom Panel Area */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
            <EditorContainer />
          </div>
          <BottomPanel />
        </div>
      </div>

      <StatusBar />

      <CommandPalette />
      <QuickOpen />
    </div>
  );
}
