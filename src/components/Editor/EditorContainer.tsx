import { useEffect, useRef } from "preact/hooks";
import * as monaco from "monaco-editor";
import { openTabs, activeTabId, activeTab, closeTab, updateActiveTabContent, settings } from "@/state/appState";

export function EditorContainer() {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const currentTab = activeTab.value;
  const isLite = settings.value.profile === "Lite";

  useEffect(() => {
    if (!editorRef.current) return;

    // Create Monaco editor instance with strict zero-animation options
    const editor = monaco.editor.create(editorRef.current, {
      value: currentTab?.content || "",
      language: currentTab?.language || "markdown",
      theme: settings.value.theme === "light" ? "vs" : "vs-dark",
      fontSize: settings.value.fontSize,
      tabSize: settings.value.tabSize,
      automaticLayout: true,
      fontFamily: "var(--font-mono)",
      // Zero Animation Enforcements:
      smoothScrolling: false,
      cursorBlinking: "solid",
      cursorSmoothCaretAnimation: "off",
      mouseWheelScrollSensitivity: 1,
      // Lite Profile Restrictions:
      minimap: { enabled: !isLite },
      bracketPairColorization: { enabled: !isLite },
      // Large File Protections:
      folding: !currentTab?.isLargeFile,
    });

    monacoInstance.current = editor;

    const disposable = editor.onDidChangeModelContent(() => {
      updateActiveTabContent(editor.getValue());
    });

    return () => {
      disposable.dispose();
      editor.dispose();
      monacoInstance.current = null;
    };
  }, [currentTab?.id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Tabs Bar */}
      <div
        style={{
          display: "flex",
          backgroundColor: "var(--bg-app)",
          borderBottom: "var(--border-width) solid var(--border-subtle)",
          overflowX: "auto",
          height: "35px",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {openTabs.value.map((tab) => {
          const isActive = tab.id === activeTabId.value;
          return (
            <div
              key={tab.id}
              onClick={() => (activeTabId.value = tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "0 12px",
                backgroundColor: isActive ? "var(--bg-editor)" : "var(--bg-app)",
                color: isActive ? "var(--fg-default)" : "var(--fg-muted)",
                borderRight: "var(--border-width) solid var(--border-subtle)",
                borderTop: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                cursor: "pointer",
                fontSize: "12px",
                whiteSpace: "nowrap",
              }}
            >
              <span>{tab.title}</span>
              {tab.isDirty && <span style={{ color: "var(--accent)" }}>●</span>}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="codicon codicon-close"
                style={{ fontSize: "12px", color: "var(--fg-subtle)" }}
              />
            </div>
          );
        })}
      </div>

      {/* Editor Surface */}
      <div style={{ flex: 1, position: "relative", backgroundColor: "var(--bg-editor)" }}>
        {openTabs.value.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--fg-muted)",
              fontSize: "13px",
            }}
          >
            No open files. Select a file from the Explorer or press Ctrl+P.
          </div>
        ) : (
          <div ref={editorRef} style={{ width: "100%", height: "100%" }} />
        )}
      </div>
    </div>
  );
}

