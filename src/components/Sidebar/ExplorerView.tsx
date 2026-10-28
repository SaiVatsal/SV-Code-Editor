import { useState } from "preact/hooks";
import { currentWorkspace, openFile, activeSidebarView, isSidebarVisible } from "@/state/appState";
import { invokeSafe } from "@/services/api";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export function ExplorerView() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: FileNode } | null>(null);

  // Initial project file tree
  const sampleTree: FileNode[] = [
    {
      name: "src",
      path: "src",
      isDirectory: true,
      children: [
        { name: "main.tsx", path: "src/main.tsx", isDirectory: false },
        { name: "App.tsx", path: "src/App.tsx", isDirectory: false },
        {
          name: "styles",
          path: "src/styles",
          isDirectory: true,
          children: [{ name: "theme.css", path: "src/styles/theme.css", isDirectory: false }],
        },
      ],
    },
    {
      name: "src-tauri",
      path: "src-tauri",
      isDirectory: true,
      children: [
        { name: "Cargo.toml", path: "src-tauri/Cargo.toml", isDirectory: false },
        { name: "tauri.conf.json", path: "src-tauri/tauri.conf.json", isDirectory: false },
        {
          name: "src",
          path: "src-tauri/src",
          isDirectory: true,
          children: [
            { name: "main.rs", path: "src-tauri/src/main.rs", isDirectory: false },
            { name: "lib.rs", path: "src-tauri/src/lib.rs", isDirectory: false },
          ],
        },
      ],
    },
    { name: "package.json", path: "package.json", isDirectory: false },
    { name: "tsconfig.json", path: "tsconfig.json", isDirectory: false },
    { name: "versions.json", path: "versions.json", isDirectory: false },
    { name: "DECISIONS.md", path: "DECISIONS.md", isDirectory: false },
    { name: "PROGRESS.md", path: "PROGRESS.md", isDirectory: false },
    { name: "sample_binary.exe", path: "sample_binary.exe", isDirectory: false },
  ];

  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) return;
    try {
      const content = await invokeSafe<string>("read_workspace_file", { path: node.path });
      const ext = node.name.split(".").pop() || "";
      const lang = ext === "rs" ? "rust" : ext === "ts" || ext === "tsx" ? "typescript" : ext === "json" ? "json" : ext === "css" ? "css" : ext === "md" ? "markdown" : "plaintext";
      openFile(node.path, content, lang);
    } catch {
      // In preview fallback
      openFile(node.path, `// File content for ${node.name}\n`, "typescript");
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
      style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}
      onClick={() => setContextMenu(null)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Explorer</h3>
        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>Workspace</span>
      </div>

      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--fg-subtle)", marginBottom: "6px" }}>
        {currentWorkspace.value.split(/[\\/]/).pop()?.toUpperCase()}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {renderTree(sampleTree, 0, handleFileClick, handleContextMenu)}
      </div>

      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: "var(--bg-surface)",
            border: "var(--border-width) solid var(--border-strong)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            zIndex: 1000,
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
            onClick={() => setContextMenu(null)}
            style={{ padding: "4px 12px", cursor: "pointer", fontSize: "11px" }}
          >
            Open in Hex Viewer
          </div>
          <div
            onClick={() => setContextMenu(null)}
            style={{ padding: "4px 12px", cursor: "pointer", fontSize: "11px" }}
          >
            Copy Relative Path
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
            paddingTop: "3px",
            paddingBottom: "3px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            fontSize: "12px",
            color: isBin ? "var(--accent)" : "var(--fg-default)",
          }}
        >
          <span
            className={`codicon ${
              node.isDirectory ? "codicon-folder" : isBin ? "codicon-file-binary" : "codicon-file-code"
            }`}
            style={{ fontSize: "14px" }}
          />
          <span>{node.name}</span>
        </div>
        {node.isDirectory && node.children && renderTree(node.children, depth + 1, onFileClick, onContextMenu)}
      </div>
    );
  });
}

