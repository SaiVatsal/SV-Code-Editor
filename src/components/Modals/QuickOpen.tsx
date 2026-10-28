import { useState, useEffect } from "preact/hooks";
import { isQuickOpenOpen, openFile, currentWorkspace, detectLanguage } from "@/state/appState";
import { invokeSafe } from "@/services/api";

export function QuickOpen() {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load files when modal opens
  useEffect(() => {
    if (!isQuickOpenOpen.value) return;

    setQuery("");
    setSelectedIndex(0);
    setErrorMessage(null);

    const ws = currentWorkspace.value;
    if (!ws) {
      setFiles([]);
      return;
    }

    setLoading(true);
    invokeSafe<string[]>("list_workspace_files_recursive", { path: ws, maxFiles: 3000 })
      .then((res) => {
        setFiles(res || []);
      })
      .catch((err) => {
        console.warn("Failed to index workspace files for QuickOpen:", err);
        setErrorMessage("Could not index workspace files: " + String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isQuickOpenOpen.value]);

  const filtered = files.filter((f) => f.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = async (relPath: string) => {
    setErrorMessage(null);
    try {
      const ws = currentWorkspace.value;
      const fullPath = ws ? `${ws}\\${relPath.replace(/\//g, "\\")}` : relPath;
      const content = await invokeSafe<string>("read_workspace_file", {
        path: fullPath,
        workspaceRoot: ws || undefined,
      });
      const lang = detectLanguage(relPath);
      openFile(fullPath, content, lang);
      isQuickOpenOpen.value = false;
    } catch (err) {
      console.error("QuickOpen read failed:", err);
      setErrorMessage(`Failed to open file: ${String(err)}`);
    }
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
    if (!isQuickOpenOpen.value) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQuickOpenOpen.value, filtered, selectedIndex]);

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
          width: "580px",
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-strong)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "400px",
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
            placeholder="Type file name to open (e.g. App.tsx, Cargo.toml)..."
            style={{ width: "100%", boxSizing: "border-box", fontSize: "13px" }}
          />
        </div>

        {errorMessage && (
          <div
            style={{
              padding: "6px 12px",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "var(--accent-danger)",
              fontSize: "12px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
          {loading && (
            <div style={{ padding: "12px", textAlign: "center", color: "var(--fg-muted)", fontSize: "12px" }}>
              Indexing workspace files...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: "12px", textAlign: "center", color: "var(--fg-muted)", fontSize: "12px" }}>
              {files.length === 0 ? "No files indexed in workspace." : "No matching files."}
            </div>
          )}

          {!loading &&
            filtered.map((file, idx) => {
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
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
