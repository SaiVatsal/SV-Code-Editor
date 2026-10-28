import { useState, useEffect } from "preact/hooks";
import { currentWorkspace, openFile, activeSidebarView, isSidebarVisible } from "@/state/appState";
import { invokeSafe } from "@/services/api";

interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
  isOpen?: boolean;
}

export function ExplorerView() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  const loadDirectory = async (dirPath: string) => {
    setLoading(true);
    try {
      const items = await invokeSafe<Array<{ name: string; path: string; is_directory: boolean }>>(
        "list_workspace_directory",
        { path: dirPath }
      );
      setTree(items.map((it) => ({ ...it, isOpen: false })));
    } catch {
      // Fallback sample files if workspace cannot be read directly
      setTree([
        { name: "package.json", path: `${dirPath}\\package.json`, is_directory: false },
        { name: "README.md", path: `${dirPath}\\README.md`, is_directory: false },
        { name: "PROGRESS.md", path: `${dirPath}\\PROGRESS.md`, is_directory: false },
        { name: "DECISIONS.md", path: `${dirPath}\\DECISIONS.md`, is_directory: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentWorkspace.value);
  }, [currentWorkspace.value]);

  const handleOpenFolder = async () => {
    try {
      const selected = await invokeSafe<string | null>("open_native_folder_dialog");
      if (selected) {
        currentWorkspace.value = selected;
      }
    } catch (e) {
      console.error("Open folder error:", e);
    }
  };

  const handleNewFile = () => {
    const id = `untitled-${Date.now().toString().slice(-4)}`;
    openFile(id, "", "plaintext");
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.is_directory) {
      // Toggle directory expansion
      if (node.isOpen) {
        node.isOpen = false;
        setTree([...tree]);
      } else {
        node.isOpen = true;
        if (!node.children || node.children.length === 0) {
          try {
            const subItems = await invokeSafe<Array<{ name: string; path: string; is_directory: boolean }>>(
              "list_workspace_directory",
              { path: node.path }
            );
            node.children = subItems.map((s) => ({ ...s, isOpen: false }));
          } catch {
            node.children = [];
          }
        }
        setTree([...tree]);
      }
      return;
    }

    try {
      const content = await invokeSafe<string>("read_workspace_file", { path: node.path });
      const ext = node.name.split(".").pop()?.toLowerCase() || "";
      const langMap: Record<string, string> = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        rs: "rust",
        py: "python",
        json: "json",
        css: "css",
        html: "html",
        md: "markdown",
        toml: "toml",
        sql: "sql",
        c: "c",
        cpp: "cpp",
      };
      openFile(node.path, content, langMap[ext] || "plaintext");
    } catch {
      openFile(node.path, `// Could not read file: ${node.name}\n`, "plaintext");
    }
  };

  const handleContextMenu = (e: MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const handleAnalyzeWithRea = (_node: FileNode) => {
    activeSidebarView.value = "re";
    isSidebarVisible.value = true;
    setContextMenu(null);
  };

  return (
    <div
      style={{ display: "flex", flexDirection: "column", height: "100%", padding: "10px", overflowY: "auto" }}
      onClick={() => setContextMenu(null)}
    >
      {/* Explorer Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h3 style={{ margin: 0, fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Explorer
        </h3>
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={handleNewFile}
            style={{ background: "transparent", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "2px" }}
            title="New File (Ctrl+N)"
          >
            <span className="codicon codicon-new-file" />
          </button>
          <button
            onClick={handleOpenFolder}
            style={{ background: "transparent", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "2px" }}
            title="Open Folder (Ctrl+K Ctrl+O)"
          >
            <span className="codicon codicon-folder-opened" />
          </button>
          <button
            onClick={() => loadDirectory(currentWorkspace.value)}
            style={{ background: "transparent", border: "none", color: "var(--fg-muted)", cursor: "pointer", padding: "2px" }}
            title="Refresh Explorer"
          >
            <span className="codicon codicon-refresh" />
          </button>
        </div>
      </div>

      {/* Workspace root name banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 6px",
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-subtle)",
          marginBottom: "8px",
          fontSize: "11px",
        }}
      >
        <span style={{ fontWeight: 700, color: "var(--fg-default)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          📁 {currentWorkspace.value.split(/[\\/]/).pop() || currentWorkspace.value}
        </span>
        <button
          onClick={handleOpenFolder}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            fontSize: "10px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Change
        </button>
      </div>

      {/* File Tree */}
      {loading ? (
        <div style={{ fontSize: "11px", color: "var(--fg-muted)", padding: "10px" }}>Loading files...</div>
      ) : tree.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 0" }}>
          <span style={{ fontSize: "12px", color: "var(--fg-muted)" }}>No files in workspace.</span>
          <button
            onClick={handleOpenFolder}
            style={{
              padding: "6px 12px",
              backgroundColor: "var(--accent)",
              color: "#fff",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Open Folder
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {renderTree(tree, 0, handleFileClick, handleContextMenu)}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: "var(--bg-surface)",
            border: "var(--border-width) solid var(--border-strong)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 10000,
            padding: "4px 0",
            minWidth: "160px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => handleAnalyzeWithRea(contextMenu.node)}
            style={{
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span className="codicon codicon-microscope" />
            Analyze with REA
          </div>
          <div style={{ height: "1px", backgroundColor: "var(--border-subtle)", margin: "4px 0" }} />
          <div
            onClick={() => {
              navigator.clipboard?.writeText(contextMenu.node.path);
              setContextMenu(null);
            }}
            style={{ padding: "5px 12px", cursor: "pointer", fontSize: "11px" }}
          >
            Copy Full Path
          </div>
        </div>
      )}
    </div>
  );
}

function renderTree(
  nodes: FileNode[],
  depth: number,
  onFileClick: (n: FileNode) => void,
  onContextMenu: (e: MouseEvent, n: FileNode) => void
) {
  return nodes.map((node) => {
    const isBin = node.name.endsWith(".exe") || node.name.endsWith(".dll") || node.name.endsWith(".so");
    return (
      <div key={node.path}>
        <div
          onClick={() => onFileClick(node)}
          onContextMenu={(e) => onContextMenu(e, node)}
          style={{
            paddingLeft: `${depth * 14 + 4}px`,
            paddingTop: "2px",
            paddingBottom: "2px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            fontSize: "12px",
            color: isBin ? "var(--accent)" : "var(--fg-default)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
          }}
        >
          <span
            className={`codicon ${
              node.is_directory
                ? node.isOpen
                  ? "codicon-folder-opened"
                  : "codicon-folder"
                : isBin
                ? "codicon-file-binary"
                : "codicon-file-code"
            }`}
            style={{
              fontSize: "14px",
              color: node.is_directory ? "var(--color-warning)" : isBin ? "var(--accent)" : "var(--fg-muted)",
            }}
          />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        </div>
        {node.is_directory && node.isOpen && node.children && renderTree(node.children, depth + 1, onFileClick, onContextMenu)}
      </div>
    );
  });
}
