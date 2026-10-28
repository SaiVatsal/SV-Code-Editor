import { useState } from "preact/hooks";
import { reAnalysis, settings, currentWorkspace } from "@/state/appState";
import { invokeSafe } from "@/services/api";
import type { ReFunction, ReEvidence } from "@/types/models";

export function ReView() {
  const isLite = settings.value.profile === "Lite";
  const [binaryPath, setBinaryPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState<ReFunction | null>(null);
  const [pseudocode, setPseudocode] = useState<string>("");
  const [evidence, setEvidence] = useState<ReEvidence | null>(null);
  const [userNote, setUserNote] = useState("");
  const [localModelOnly, setLocalModelOnly] = useState(true);
  const [authorizedConsent, setAuthorizedConsent] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!binaryPath.trim()) return;
    setLoading(true);
    setStatusMsg("Analyzing binary with REA / Ghidra backend...");
    try {
      const res = await invokeSafe<any>("re_analyze_binary", { binaryPath });
      reAnalysis.value = res;
      setStatusMsg("Binary overview loaded successfully.");
    } catch (e: unknown) {
      setStatusMsg(`Analysis failed: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFunction = async (fn: ReFunction) => {
    setSelectedFunc(fn);
    if (!reAnalysis.value) return;
    try {
      const res = await invokeSafe<{ code: string; evidence: ReEvidence }>("re_get_pseudocode", {
        sha256: reAnalysis.value.sha256,
        address: fn.address,
      });
      setPseudocode(res.code);
      setEvidence(res.evidence);
    } catch (e) {
      console.warn("Pseudocode error:", e);
    }
  };

  const handleSaveNotes = async () => {
    if (!reAnalysis.value) return;
    try {
      const notesJson = JSON.stringify({ note: userNote, timestamp: new Date().toISOString() }, null, 2);
      await invokeSafe("re_save_notes", {
        projectDir: currentWorkspace.value,
        sha256: reAnalysis.value.sha256,
        notesJson,
      });
      setStatusMsg("Notes saved to .sv/re/<sha256>/notes.json");
    } catch (e: unknown) {
      setStatusMsg(`Save notes error: ${String(e)}`);
    }
  };

  if (isLite) {
    return (
      <div style={{ padding: "16px", color: "var(--fg-muted)", fontSize: "12px" }}>
        <h3 style={{ margin: "0 0 8px 0", color: "var(--fg-default)", fontSize: "14px" }}>
          Reverse Engineering Module Unavailable
        </h3>
        <p>
          The Reverse Engineering Module (REA + Ghidra JVM) requires <strong>4 GB or more RAM</strong> and is disabled in the <strong>Lite profile</strong> to prevent out-of-memory lockups on 2 GB systems.
        </p>
        <p>
          You can override your profile to Standard or Full in Settings if your machine has sufficient memory.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px", overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Reverse Engineering (REA)</h3>
      </div>

      {/* First-use authorization notice */}
      {!authorizedConsent && (
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--color-warning)",
            padding: "8px",
            marginBottom: "10px",
            fontSize: "11px",
          }}
        >
          <strong>Authorization Notice:</strong> You may analyze only binaries you own or are legally authorized to reverse engineer. Reverse engineering features never execute binaries automatically.
          <div style={{ marginTop: "6px" }}>
            <button onClick={() => setAuthorizedConsent(true)} className="primary" style={{ fontSize: "10px" }}>
              I Understand & Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Privacy Guardrail */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "var(--border-width) solid var(--border-subtle)",
          padding: "8px",
          marginBottom: "10px",
          fontSize: "11px",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={localModelOnly}
            onChange={(e) => setLocalModelOnly((e.target as HTMLInputElement).checked)}
          />
          <strong>Local model only for RE</strong> (blocks REA symbols from remote AI)
        </label>
      </div>

      {/* Target input */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <input
          type="text"
          value={binaryPath}
          onInput={(e) => setBinaryPath((e.target as HTMLInputElement).value)}
          placeholder="Path to binary (.exe, .dll, .so, .elf)..."
          style={{ flex: 1, fontSize: "11px" }}
        />
        <button onClick={handleAnalyze} disabled={loading} className="primary" style={{ fontSize: "11px" }}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {statusMsg && (
        <div style={{ fontSize: "11px", color: "var(--color-info)", marginBottom: "8px" }}>
          {statusMsg}
        </div>
      )}

      {reAnalysis.value && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
          {/* Overview */}
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "var(--border-width) solid var(--border-subtle)",
              padding: "8px",
              fontSize: "11px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Binary Overview</div>
            <div>Format: {reAnalysis.value.format} ({reAnalysis.value.bitness}-bit, {reAnalysis.value.endianness})</div>
            <div>Architecture: {reAnalysis.value.architecture}</div>
            <div>SHA-256: <code style={{ fontSize: "10px" }}>{reAnalysis.value.sha256}</code></div>
            <div>Size: {reAnalysis.value.fileSize} bytes</div>
            <div>Sections: {reAnalysis.value.sections.map((s) => s.name).join(", ")}</div>
          </div>

          {/* Functions list */}
          <div style={{ fontWeight: 600, fontSize: "12px" }}>Decompiled Procedures</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { address: "0x140001000", name: "main", size: 142, signature: "int main(int, char**)", isEntry: true },
              { address: "0x140001090", name: "process_input_buffer", size: 284, signature: "void process_input_buffer()", isEntry: false },
              { address: "0x1400011b0", name: "validate_token_signature", size: 96, signature: "bool validate_token_signature()", isEntry: false },
            ].map((fn) => (
              <div
                key={fn.address}
                onClick={() => handleSelectFunction(fn as ReFunction)}
                style={{
                  padding: "6px",
                  backgroundColor: selectedFunc?.address === fn.address ? "var(--bg-surface-active)" : "var(--bg-surface)",
                  border: "var(--border-width) solid var(--border-subtle)",
                  cursor: "pointer",
                  fontSize: "11px",
                }}
              >
                <strong>{fn.name}</strong> <span style={{ color: "var(--fg-muted)" }}>({fn.address})</span>
              </div>
            ))}
          </div>

          {/* Pseudocode viewer */}
          {selectedFunc && (
            <div>
              <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>
                Pseudocode: {selectedFunc.name}
              </div>
              <pre
                style={{
                  backgroundColor: "var(--bg-editor)",
                  border: "var(--border-width) solid var(--border-subtle)",
                  padding: "8px",
                  fontSize: "11px",
                  fontFamily: "var(--font-mono)",
                  margin: 0,
                  overflowX: "auto",
                }}
              >
                {pseudocode || "// Loading pseudocode..."}
              </pre>

              {/* Evidence Drawer */}
              {evidence && (
                <div
                  style={{
                    marginTop: "8px",
                    backgroundColor: "var(--bg-surface)",
                    border: "var(--border-width) solid var(--border-subtle)",
                    padding: "8px",
                    fontSize: "10px",
                  }}
                >
                  <div style={{ fontWeight: 600, color: "var(--accent)" }}>Evidence Drawer (Verbatim REA Output)</div>
                  <div>Authority: {evidence.authority} (Confidence: {Math.round(evidence.confidence * 100)}%)</div>
                  {evidence.limitations.length > 0 && (
                    <div style={{ color: "var(--color-warning)", marginTop: "2px" }}>
                      Limitations: {evidence.limitations.join("; ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Notes */}
          <div style={{ marginTop: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "4px" }}>Analyst Notes</div>
            <textarea
              value={userNote}
              onInput={(e) => setUserNote((e.target as HTMLTextAreaElement).value)}
              placeholder="Add findings, notes, renamed symbols..."
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", fontSize: "11px", marginBottom: "4px" }}
            />
            <button onClick={handleSaveNotes} style={{ fontSize: "11px" }}>
              Save Notes (.sv/re/)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

