import { useState, useEffect, useRef } from "preact/hooks";
import {
  currentWorkspace,
  openTabs,
  activeTab,
  activeTabId,
  openFile,
  closeTab,
  markTabSaved,
  activeSidebarView,
  isSidebarVisible,
  isBottomPanelVisible,
  activeBottomPanel,
  isCommandPaletteOpen,
  isQuickOpenOpen,
} from "@/state/appState";
import { invokeSafe } from "@/services/api";

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
}

interface MenuDef {
  label: string;
  items: MenuItem[];
}

export function MenuBar() {
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenuIndex(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuIndex(null);
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleNewFile = () => {
    const id = `untitled-${Date.now().toString().slice(-4)}`;
    openFile(id, "", "plaintext");
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

  const handleOpenFolder = async () => {
    try {
      const selectedFolder = await invokeSafe<string | null>("open_native_folder_dialog");
      if (selectedFolder) {
        currentWorkspace.value = selectedFolder;
        activeSidebarView.value = "explorer";
        isSidebarVisible.value = true;
      }
    } catch (e) {
      console.error("Open folder error:", e);
    }
  };

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
      console.error("Save file error:", e);
    }
  };

  const handleSaveAs = async () => {
    const tab = activeTab.value;
    if (!tab) return;
    try {
      const chosen = await invokeSafe<string | null>("save_native_file_dialog", {
        defaultName: tab.title,
      });
      if (chosen) {
        await invokeSafe("write_workspace_file", { path: chosen, content: tab.content });
        markTabSaved(tab.id);
        openFile(chosen, tab.content, tab.language);
      }
    } catch (e) {
      console.error("Save as error:", e);
    }
  };

  const menus: MenuDef[] = [
    {
      label: "File",
      items: [
        { label: "New File", shortcut: "Ctrl+N", action: handleNewFile },
        { label: "Open File...", shortcut: "Ctrl+O", action: handleOpenFile },
        { label: "Open Folder...", shortcut: "Ctrl+K Ctrl+O", action: handleOpenFolder },
        { divider: true, label: "" },
        { label: "Save", shortcut: "Ctrl+S", action: handleSaveFile },
        { label: "Save As...", shortcut: "Ctrl+Shift+S", action: handleSaveAs },
        { divider: true, label: "" },
        {
          label: "Close Editor",
          shortcut: "Ctrl+W",
          action: () => {
            if (activeTabId.value) closeTab(activeTabId.value);
          },
        },
        {
          label: "Close All Editors",
          shortcut: "Ctrl+K Ctrl+W",
          action: () => {
            openTabs.value = [];
            activeTabId.value = "";
          },
        },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", action: () => document.execCommand("undo") },
        { label: "Redo", shortcut: "Ctrl+Y", action: () => document.execCommand("redo") },
        { divider: true, label: "" },
        { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", action: () => document.execCommand("paste") },
        { divider: true, label: "" },
        {
          label: "Find",
          shortcut: "Ctrl+F",
          action: () => {
            // trigger Monaco find widget
            window.dispatchEvent(new CustomEvent("editor-find"));
          },
        },
        {
          label: "Replace",
          shortcut: "Ctrl+H",
          action: () => {
            window.dispatchEvent(new CustomEvent("editor-replace"));
          },
        },
        {
          label: "Find in Files",
          shortcut: "Ctrl+Shift+F",
          action: () => {
            activeSidebarView.value = "search";
            isSidebarVisible.value = true;
          },
        },
        { divider: true, label: "" },
        {
          label: "Toggle Line Comment",
          shortcut: "Ctrl+/",
          action: () => {
            window.dispatchEvent(new CustomEvent("editor-comment"));
          },
        },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A", action: () => document.execCommand("selectAll") },
        {
          label: "Expand Selection",
          shortcut: "Shift+Alt+Right",
          action: () => window.dispatchEvent(new CustomEvent("editor-expand-selection")),
        },
        {
          label: "Shrink Selection",
          shortcut: "Shift+Alt+Left",
          action: () => window.dispatchEvent(new CustomEvent("editor-shrink-selection")),
        },
        { divider: true, label: "" },
        {
          label: "Copy Line Down",
          shortcut: "Shift+Alt+Down",
          action: () => window.dispatchEvent(new CustomEvent("editor-copy-line-down")),
        },
        {
          label: "Move Line Down",
          shortcut: "Alt+Down",
          action: () => window.dispatchEvent(new CustomEvent("editor-move-line-down")),
        },
        {
          label: "Move Line Up",
          shortcut: "Alt+Up",
          action: () => window.dispatchEvent(new CustomEvent("editor-move-line-up")),
        },
      ],
    },
    {
      label: "View",
      items: [
        {
          label: "Command Palette...",
          shortcut: "Ctrl+Shift+P",
          action: () => (isCommandPaletteOpen.value = true),
        },
        {
          label: "Open View...",
          shortcut: "Ctrl+Q",
          action: () => (isQuickOpenOpen.value = true),
        },
        { divider: true, label: "" },
        {
          label: "Explorer",
          shortcut: "Ctrl+Shift+E",
          action: () => {
            activeSidebarView.value = "explorer";
            isSidebarVisible.value = true;
          },
        },
        {
          label: "Search",
          shortcut: "Ctrl+Shift+F",
          action: () => {
            activeSidebarView.value = "search";
            isSidebarVisible.value = true;
          },
        },
        {
          label: "Source Control",
          shortcut: "Ctrl+Shift+G",
          action: () => {
            activeSidebarView.value = "git";
            isSidebarVisible.value = true;
          },
        },
        {
          label: "Agents Hub",
          shortcut: "Ctrl+Shift+A",
          action: () => {
            activeSidebarView.value = "agents";
            isSidebarVisible.value = true;
          },
        },
        {
          label: "Reverse Engineering",
          shortcut: "Ctrl+Shift+R",
          action: () => {
            activeSidebarView.value = "re";
            isSidebarVisible.value = true;
          },
        },
        {
          label: "Extensions",
          shortcut: "Ctrl+Shift+X",
          action: () => {
            activeSidebarView.value = "extensions";
            isSidebarVisible.value = true;
          },
        },
        { divider: true, label: "" },
        {
          label: "Terminal",
          shortcut: "Ctrl+`",
          action: () => {
            activeBottomPanel.value = "terminal";
            isBottomPanelVisible.value = true;
          },
        },
        {
          label: "Problems",
          shortcut: "Ctrl+Shift+M",
          action: () => {
            activeBottomPanel.value = "problems";
            isBottomPanelVisible.value = true;
          },
        },
        {
          label: "Output",
          shortcut: "Ctrl+Shift+U",
          action: () => {
            activeBottomPanel.value = "output";
            isBottomPanelVisible.value = true;
          },
        },
        { divider: true, label: "" },
        {
          label: "Toggle Primary Sidebar",
          shortcut: "Ctrl+B",
          action: () => (isSidebarVisible.value = !isSidebarVisible.value),
        },
        {
          label: "Toggle Panel",
          shortcut: "Ctrl+J",
          action: () => (isBottomPanelVisible.value = !isBottomPanelVisible.value),
        },
      ],
    },
    {
      label: "Go",
      items: [
        {
          label: "Go to File...",
          shortcut: "Ctrl+P",
          action: () => (isQuickOpenOpen.value = true),
        },
        {
          label: "Go to Symbol...",
          shortcut: "Ctrl+Shift+O",
          action: () => (isCommandPaletteOpen.value = true),
        },
        {
          label: "Go to Line...",
          shortcut: "Ctrl+G",
          action: () => window.dispatchEvent(new CustomEvent("editor-goto-line")),
        },
        { divider: true, label: "" },
        {
          label: "Next Editor",
          shortcut: "Ctrl+PageDown",
          action: () => {
            const tabs = openTabs.value;
            const idx = tabs.findIndex((t) => t.id === activeTabId.value);
            if (idx >= 0 && idx < tabs.length - 1) {
              const next = tabs[idx + 1];
              if (next) activeTabId.value = next.id;
            }
          },
        },
        {
          label: "Previous Editor",
          shortcut: "Ctrl+PageUp",
          action: () => {
            const tabs = openTabs.value;
            const idx = tabs.findIndex((t) => t.id === activeTabId.value);
            if (idx > 0) {
              const prev = tabs[idx - 1];
              if (prev) activeTabId.value = prev.id;
            }
          },
        },
      ],
    },
    {
      label: "Run",
      items: [
        {
          label: "Start Debugging",
          shortcut: "F5",
          action: () => {
            activeBottomPanel.value = "terminal";
            isBottomPanelVisible.value = true;
          },
        },
        {
          label: "Run Without Debugging",
          shortcut: "Ctrl+F5",
          action: () => {
            activeBottomPanel.value = "terminal";
            isBottomPanelVisible.value = true;
          },
        },
      ],
    },
    {
      label: "Terminal",
      items: [
        {
          label: "New Terminal",
          shortcut: "Ctrl+Shift+`",
          action: () => {
            activeBottomPanel.value = "terminal";
            isBottomPanelVisible.value = true;
          },
        },
        {
          label: "Toggle Terminal",
          shortcut: "Ctrl+`",
          action: () => {
            if (isBottomPanelVisible.value && activeBottomPanel.value === "terminal") {
              isBottomPanelVisible.value = false;
            } else {
              activeBottomPanel.value = "terminal";
              isBottomPanelVisible.value = true;
            }
          },
        },
      ],
    },
    {
      label: "Help",
      items: [
        {
          label: "Welcome / Setup Manager",
          shortcut: "Ctrl+Shift+H",
          action: () => {
            activeSidebarView.value = "setup";
            isSidebarVisible.value = true;
          },
        },
        {
          label: "Settings",
          shortcut: "Ctrl+,",
          action: () => {
            activeSidebarView.value = "settings";
            isSidebarVisible.value = true;
          },
        },
        { divider: true, label: "" },
        {
          label: "About SV Code Editor",
          action: () => {
            alert("SV Code Editor v1.0.0\nPersonal Windows Code Editor & AI Agent Platform\nTauri v2 + Monaco + Rust\nFast, low memory, zero animation.");
          },
        },
      ],
    },
  ];

  return (
    <div
      ref={menuBarRef}
      style={{
        display: "flex",
        alignItems: "center",
        height: "28px",
        backgroundColor: "var(--bg-activitybar)",
        borderBottom: "var(--border-width) solid var(--border-subtle)",
        padding: "0 6px",
        fontSize: "12px",
        userSelect: "none",
        position: "relative",
        zIndex: 9999,
      }}
    >
      {/* Brand logo & icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginRight: "10px",
          fontWeight: 700,
          color: "var(--accent)",
          cursor: "pointer",
        }}
        onClick={() => {
          activeSidebarView.value = "setup";
          isSidebarVisible.value = true;
        }}
        title="SV Code Editor v1.0.0"
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "18px",
            height: "18px",
            borderRadius: "4px",
            background: "linear-gradient(135deg, #0284c7, #7c3aed)",
            color: "#fff",
            fontSize: "10px",
            fontWeight: 800,
          }}
        >
          SV
        </span>
      </div>

      {/* Menu items */}
      <div style={{ display: "flex", alignItems: "center" }}>
        {menus.map((menu, idx) => {
          const isOpen = openMenuIndex === idx;
          return (
            <div key={menu.label} style={{ position: "relative" }}>
              <button
                onClick={() => setOpenMenuIndex(isOpen ? null : idx)}
                onMouseEnter={() => {
                  if (openMenuIndex !== null) setOpenMenuIndex(idx);
                }}
                style={{
                  background: isOpen ? "var(--bg-surface)" : "transparent",
                  color: isOpen ? "var(--accent)" : "var(--fg-default)",
                  border: "none",
                  padding: "4px 8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  borderRadius: "2px",
                }}
              >
                {menu.label}
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    minWidth: "220px",
                    backgroundColor: "var(--bg-surface)",
                    border: "var(--border-width) solid var(--border-subtle)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    padding: "4px 0",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 10000,
                  }}
                >
                  {menu.items.map((item, itemIdx) => {
                    if (item.divider) {
                      return (
                        <div
                          key={`div-${itemIdx}`}
                          style={{
                            height: "1px",
                            backgroundColor: "var(--border-subtle)",
                            margin: "4px 0",
                          }}
                        />
                      );
                    }
                    return (
                      <div
                        key={item.label}
                        onClick={() => {
                          setOpenMenuIndex(null);
                          if (item.action) item.action();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "5px 12px",
                          fontSize: "12px",
                          color: "var(--fg-default)",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-hover)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        }}
                      >
                        <span>{item.label}</span>
                        {item.shortcut && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--fg-muted)",
                              marginLeft: "16px",
                            }}
                          >
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

