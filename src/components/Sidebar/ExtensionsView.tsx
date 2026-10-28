import { useState } from "preact/hooks";

interface ExtensionEntry {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  type: "declarative-vsix" | "sv-worker" | "plugin";
  installed: boolean;
  enabled: boolean;
  memoryMb?: number;
  memoryBudgetMb?: number;
}

export function ExtensionsView() {
  const [search, setSearch] = useState("");
  const [extensions, setExtensions] = useState<ExtensionEntry[]>([
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

  const toggleExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, enabled: !ext.enabled } : ext))
    );
  };

  const filtered = extensions.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Extensions</h3>
        <span style={{ fontSize: "11px", color: "var(--fg-muted)" }}>Open VSX + SV Runtime</span>
      </div>

      <input
        type="text"
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        placeholder="Search Open VSX marketplace & local plugins..."
        style={{ width: "100%", boxSizing: "border-box", fontSize: "12px", marginBottom: "12px" }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        {filtered.map((ext) => (
          <div
            key={ext.id}
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "var(--border-width) solid var(--border-subtle)",
              padding: "10px",
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
  );
}

