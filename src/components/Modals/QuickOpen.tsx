import { useState, useEffect } from "preact/hooks";
import { isQuickOpenOpen, openFile } from "@/state/appState";
import { invokeSafe } from "@/services/api";

export function QuickOpen() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const files = [
    "src/main.tsx",
    "src/App.tsx",
    "src/styles/theme.css",
    "src/state/appState.ts",
    "src-tauri/Cargo.toml",
    "src-tauri/tauri.conf.json",
    "src-tauri/src/main.rs",
    "src-tauri/src/lib.rs",
    "package.json",
    "versions.json",
    "DECISIONS.md",
    "PROGRESS.md",
    "README.md",
  ];

  const filtered = files.filter((f) => f.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = async (filePath: string) => {
    try {
      const content = await invokeSafe<string>("read_workspace_file", { path: filePath });
      const ext = filePath.split(".").pop() || "";
      const lang = ext === "rs" ? "rust" : ext === "ts" || ext === "tsx" ? "typescript" : ext === "json" ? "json" : ext === "css" ? "css" : ext === "md" ? "markdown" : "plaintext";
      openFile(filePath, content, lang);
    } catch {
      openFile(filePath, `// File: ${filePath}\n`, "typescript");
    }
    isQuickOpenOpen.value = false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      isQuickOpenOpen.value = false;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const f = filtered[selectedIndex];
      if (f) handleSelect(f);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex]);

  if (!isQuickOpenOpen.value) return null;

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
      onClick={() => (isQuickOpenOpen.value = false)}
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
            placeholder="Type file name to open..."
            style={{ width: "100%", boxSizing: "border-box", fontSize: "13px" }}
          />
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
          {filtered.map((file, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={file}
                onClick={() => handleSelect(file)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: isSelected ? "var(--bg-surface-active)" : "transparent",
                  color: isSelected ? "var(--fg-default)" : "var(--fg-muted)",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <span className="codicon codicon-file" style={{ fontSize: "14px" }} />
                <span>{file}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
