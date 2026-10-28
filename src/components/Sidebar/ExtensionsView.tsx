import { useState, useEffect, useRef } from "preact/hooks";
import { invokeSafe } from "@/services/api";

interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  type: "declarative-vsix" | "sv-worker" | "plugin" | "open-vsx";
  installed: boolean;
  enabled: boolean;
  memoryMb?: number;
  memoryBudgetMb?: number;
}

export function ExtensionsView() {
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [onlineResults, setOnlineResults] = useState<ExtensionEntry[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceTimer = useRef<number | null>(null);

  const [installedExtensions, setInstalledExtensions] = useState<ExtensionEntry[]>([
    {
      id: "sv-theme-dracula",
      name: "Dracula Official Theme",
      version: "2.24.3",
      author: "Dracula Theme",
      description: "Declarative TextMate theme pack extracted from Open VSX .vsix",
      type: "declarative-vsix",
      installed: true,
      enabled: true,
    },
    {
      id: "sv-gitlens-lite",
      name: "Git Code Lens (SV Extension)",
      version: "1.0.0",
      author: "SV Community",
      description: "Isolated Web Worker extension providing inline commit blame and annotations",
      type: "sv-worker",
      installed: true,
      enabled: true,
      memoryMb: 8.4,
      memoryBudgetMb: 25.0,
    },
    {
      id: "sv-plugin-impeccable",
      name: "Impeccable Design Polish",
      version: "4.8.0",
      author: "pbakaus",
      description: "Craft and design skills bundled into SV agent platform",
      type: "plugin",
      installed: true,
      enabled: true,
    },
  ]);

  // Query Open VSX API when searching
  useEffect(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }

    const query = search.trim();
    if (query.length < 2) {
      setOnlineResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    debounceTimer.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`https://open-vsx.org/api/-/search?query=${encodeURIComponent(query)}&size=8`);
        if (!response.ok) {
          throw new Error(`Open VSX responded with ${response.status}`);
        }
        const data = await response.json();
        const items: ExtensionEntry[] = (data.extensions || []).map((ext: any) => ({
          id: `${ext.namespace}.${ext.name}`,
          name: ext.displayName || ext.name,
          version: ext.version || "1.0.0",
          author: ext.namespace || "Open VSX",
          description: ext.description || "Community extension from Open VSX",
          type: "open-vsx" as const,
          installed: installedExtensions.some((i) => i.id === `${ext.namespace}.${ext.name}`),
          enabled: true,
        }));
        setOnlineResults(items);
      } catch (err) {
        console.warn("Open VSX search error:", err);
        setSearchError("Open VSX search offline or unreachable.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [search, installedExtensions]);

  const toggleExtension = (id: string) => {
    setInstalledExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, enabled: !ext.enabled } : ext))
    );
  };

  const handleInstallOnline = (ext: ExtensionEntry) => {
    setInstalledExtensions((prev) => [
      ...prev,
      { ...ext, installed: true, enabled: true, type: "declarative-vsix" },
    ]);
  };

  const handleInstallFromVsix = async () => {
    try {
      const selected = await invokeSafe<string | null>("open_native_file_dialog");
      if (selected && selected.toLowerCase().endsWith(".vsix")) {
        const name = selected.split(/[\\/]/).pop()?.replace(".vsix", "") || "Custom VSIX";
        const newExt: ExtensionEntry = {
          id: `local.${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name,
          version: "1.0.0",
          author: "Local VSIX",
          description: `Installed from local file: ${selected}`,
          type: "declarative-vsix",
          installed: true,
          enabled: true,
        };
        setInstalledExtensions((prev) => [...prev, newExt]);
      }
    } catch (e) {
      console.error("Install VSIX error:", e);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Extensions</h3>
        <button
          onClick={handleInstallFromVsix}
          style={{ fontSize: "11px", padding: "2px 6px" }}
          title="Install extension package from local .vsix file"
        >
          Install from VSIX...
        </button>
      </div>

      <input
        type="text"
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        placeholder="Search Open VSX marketplace & local extensions..."
        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", marginBottom: "8px" }}
      />

      {isSearching && (
        <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginBottom: "8px" }}>
          Searching Open VSX registry...
        </div>
      )}

      {searchError && (
        <div style={{ fontSize: "11px", color: "var(--accent-warning)", marginBottom: "8px" }}>
          {searchError}
        </div>
      )}

      {/* Online Registry Search Results */}
      {search.trim().length >= 2 && onlineResults.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-muted)", marginBottom: "6px" }}>
            OPEN VSX MARKETPLACE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {onlineResults.map((ext) => (
              <div
                key={ext.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "var(--border-width) solid var(--border-subtle)",
                  padding: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "12px" }}>{ext.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--fg-subtle)", marginTop: "2px" }}>
                      v{ext.version} • {ext.author}
                    </div>
                  </div>
                  {ext.installed ? (
                    <span style={{ fontSize: "10px", color: "var(--accent-success)" }}>Installed</span>
                  ) : (
                    <button
                      onClick={() => handleInstallOnline(ext)}
                      style={{ fontSize: "10px", padding: "2px 6px", backgroundColor: "var(--accent)", color: "#fff" }}
                    >
                      Install
                    </button>
                  )}
                </div>
                <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "4px" }}>
                  {ext.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Installed Extensions */}
      <div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-muted)", marginBottom: "6px" }}>
          INSTALLED EXTENSIONS ({installedExtensions.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {installedExtensions.map((ext) => (
            <div
              key={ext.id}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "var(--border-width) solid var(--border-subtle)",
                padding: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "12px" }}>{ext.name}</div>
                  <div style={{ fontSize: "10px", color: "var(--fg-subtle)", marginTop: "2px" }}>
                    v{ext.version} • by {ext.author} • {ext.type}
                  </div>
                </div>

                <button
                  onClick={() => toggleExtension(ext.id)}
                  style={{
                    fontSize: "10px",
                    padding: "2px 6px",
                    backgroundColor: ext.enabled ? "var(--bg-surface-hover)" : "var(--accent)",
                    color: ext.enabled ? "var(--fg-default)" : "var(--accent-fg)",
                  }}
                >
                  {ext.enabled ? "Disable" : "Enable"}
                </button>
              </div>

              <div style={{ fontSize: "11px", color: "var(--fg-muted)", marginTop: "6px" }}>
                {ext.description}
              </div>

              {ext.memoryMb !== undefined && ext.memoryBudgetMb !== undefined && (
                <div style={{ fontSize: "10px", color: "var(--color-info)", marginTop: "6px" }}>
                  Worker Memory: {ext.memoryMb} MB / {ext.memoryBudgetMb} MB budget
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
