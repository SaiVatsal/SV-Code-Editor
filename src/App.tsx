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
  activeBottomPanel,
  isCommandPaletteOpen,
  isQuickOpenOpen,
  hardwareInfo,
  settings,
  openFile,
  closeTab,
  markTabSaved,
  activeTab,
  activeTabId,
} from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { HardwareInfo } from "@/types/models";

export function App() {
  useEffect(() => {
    // Load persisted settings
    invokeSafe<string>("load_user_settings")
      .then((savedStr) => {
        if (savedStr && savedStr.trim() !== "" && savedStr.trim() !== "{}") {
          try {
            const parsed = JSON.parse(savedStr);
            settings.value = { ...settings.value, ...parsed };
            if (parsed.theme) {
              document.documentElement.setAttribute("data-theme", parsed.theme);
            }
          } catch (e) {
            console.warn("Failed to parse persisted settings:", e);
          }
        }
      })
      .catch((e) => console.warn("Failed to load user settings:", e));

    // Detect hardware & initial profile
    invokeSafe<HardwareInfo>("get_hardware_info")
      .then((info) => {
        hardwareInfo.value = info;
        if (settings.value.profile !== info.activeProfile) {
          settings.value = { ...settings.value, profile: info.activeProfile };
        }
      })
      .catch((e) => console.warn("Failed to get hardware info:", e));

    const handleSaveFile = async () => {
      const tab = activeTab.value;
      if (!tab) return;
      try {
        let targetPath = tab.filePath;
        if (tab.filePath.startsWith("untitled-") || tab.filePath.startsWith("welcome")) {
          const chosen = await invokeSafe<string | null>("save_native_file_dialog", {
            defaultName: tab.title.endsWith(".txt") ? tab.title : `${tab.title}.txt`,
          });
          if (!chosen) return;
          targetPath = chosen;
        }
        await invokeSafe("write_workspace_file", { path: targetPath, content: tab.content });
        markTabSaved(tab.id);
      } catch (e) {
        console.error("Save error:", e);
      }
    };

    const handleOpenFile = async () => {
      try {
        const selectedPath = await invokeSafe<string | null>("open_native_file_dialog");
        if (selectedPath) {
          const content = await invokeSafe<string>("read_workspace_file", { path: selectedPath });
          const ext = selectedPath.split(".").pop()?.toLowerCase() || "";
          const langMap: Record<string, string> = {
            ts: "typescript",
            tsx: "typescript",
            js: "javascript",
            jsx: "javascript",
            rs: "rust",
            py: "python",
            json: "json",
            md: "markdown",
            html: "html",
            css: "css",
          };
          openFile(selectedPath, content, langMap[ext] || "plaintext");
        }
      } catch (e) {
        console.error("Open file error:", e);
      }
    };

    // Global Keybindings (VS Code Defaults)
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "p" && !e.shiftKey) {
        e.preventDefault();
        isQuickOpenOpen.value = true;
      } else if ((ctrl && e.shiftKey && (e.key === "P" || e.key === "p")) || e.key === "F1") {
        e.preventDefault();
        isCommandPaletteOpen.value = true;
      } else if (ctrl && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        isSidebarVisible.value = !isSidebarVisible.value;
      } else if (ctrl && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        isBottomPanelVisible.value = !isBottomPanelVisible.value;
      } else if (ctrl && e.key === "`") {
        e.preventDefault();
        if (isBottomPanelVisible.value && activeBottomPanel.value === "terminal") {
          isBottomPanelVisible.value = false;
        } else {
          activeBottomPanel.value = "terminal";
          isBottomPanelVisible.value = true;
        }
      } else if (ctrl && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        handleSaveFile();
      } else if (ctrl && e.key === "o" && !e.shiftKey) {
        e.preventDefault();
        handleOpenFile();
      } else if (ctrl && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        const id = `untitled-${Date.now().toString().slice(-4)}`;
        openFile(id, "", "plaintext");
      } else if (ctrl && e.key === "w" && !e.shiftKey) {
        e.preventDefault();
        if (activeTabId.value) closeTab(activeTabId.value);
      } else if (ctrl && e.key === ",") {
        e.preventDefault();
        activeSidebarView.value = "settings";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        activeSidebarView.value = "explorer";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "F" || e.key === "f")) {
        e.preventDefault();
        activeSidebarView.value = "search";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        activeSidebarView.value = "git";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "A" || e.key === "a")) {
        e.preventDefault();
        activeSidebarView.value = "agents";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "R" || e.key === "r")) {
        e.preventDefault();
        activeSidebarView.value = "re";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "X" || e.key === "x")) {
        e.preventDefault();
        activeSidebarView.value = "extensions";
        isSidebarVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        activeBottomPanel.value = "problems";
        isBottomPanelVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        activeBottomPanel.value = "output";
        isBottomPanelVisible.value = true;
      } else if (ctrl && e.shiftKey && (e.key === "H" || e.key === "h")) {
        e.preventDefault();
        activeSidebarView.value = "setup";
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
