import { useState, useEffect } from "preact/hooks";
import { currentWorkspace, openFile } from "@/state/appState";
import { invokeSafe, listenSafe } from "@/services/api";
import type { SearchMatch } from "@/types/models";

export function SearchView() {
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    const unlistenPromise = listenSafe<SearchMatch>("search-match", (m) => {
      setMatches((prev) => [...prev, m]);
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setMatches([]);
    setSearching(true);
    try {
      const count = await invokeSafe<number>("global_search", {
        rootDir: currentWorkspace.value,
        query,
        caseSensitive,
        isRegex,
        maxResults: 500,
      });
      setMatchCount(count);
    } catch (e) {
      console.warn("Search error:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleMatchClick = async (m: SearchMatch) => {
    try {
      const content = await invokeSafe<string>("read_workspace_file", { path: m.filePath });
      openFile(m.filePath, content, "typescript");
    } catch {
      openFile(m.filePath, `// ${m.lineContent}`, "typescript");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Search</h3>
        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>ripgrep</span>
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "8px" }}>
        <input
          type="text"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search files across workspace..."
          style={{ flex: 1, fontSize: "12px" }}
        />
        <button
          onClick={() => setCaseSensitive(!caseSensitive)}
          style={{
            padding: "2px 6px",
            fontSize: "11px",
            backgroundColor: caseSensitive ? "var(--accent)" : "var(--bg-surface)",
            color: caseSensitive ? "var(--accent-fg)" : "var(--fg-default)",
          }}
          title="Match Case (Alt+C)"
        >
          Aa
        </button>
        <button
          onClick={() => setIsRegex(!isRegex)}
          style={{
            padding: "2px 6px",
            fontSize: "11px",
            backgroundColor: isRegex ? "var(--accent)" : "var(--bg-surface)",
            color: isRegex ? "var(--accent-fg)" : "var(--fg-default)",
          }}
          title="Use Regular Expression (Alt+R)"
        >
          .*
        </button>
        <button onClick={handleSearch} disabled={searching} className="primary" style={{ fontSize: "11px" }}>
          Find
        </button>
      </div>

      {matchCount !== null && (
        <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginBottom: "8px" }}>
          {matches.length} results found
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
        {matches.map((m, idx) => (
          <div
            key={idx}
            onClick={() => handleMatchClick(m)}
            style={{
              padding: "4px 6px",
              backgroundColor: "var(--bg-surface)",
              border: "var(--border-width) solid var(--border-subtle)",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            <div style={{ fontWeight: 600, color: "var(--accent)" }}>
              {m.filePath} <span style={{ color: "var(--fg-muted)" }}>:{m.lineNumber}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--fg-default)",
                marginTop: "2px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {m.lineContent.trim()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

