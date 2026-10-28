import { signal, computed } from "@preact/signals";
import type {
  HardwareInfo,
  ComponentStatus,
  ProcessMemoryEntry,
  AgentTask,
  InboxItem,
  ReAnalysisOverview,
  GitRepoStatus,
  TerminalProfile,
  UserProfile,
} from "@/types/models";
import type { EditorTab, AppSettings } from "@/types/editor";

export const defaultSettings: AppSettings = {
  profile: "Standard",
  theme: "dark",
  fontSize: 13,
  tabSize: 2,
  formatOnSave: true,
  autoSave: true,
  largeFileThresholdMb: 1,
  maxLiveEditorModels: 8,
  omniRouteEndpoint: "http://127.0.0.1:20128/v1",
  defaultModel: "omniroute/claude-3-7-sonnet",
  sandboxLevel: "workspace-write",
  approvalPolicy: "risky-only",
  turboMode: false,
  schemaVersion: 1,
};

export const currentWorkspace = signal<string>("G:\\SV Code Editor");
export const activeSidebarView = signal<string>("explorer");
export const activeBottomPanel = signal<string>("terminal");
export const isBottomPanelVisible = signal<boolean>(true);
export const isSidebarVisible = signal<boolean>(true);

export const settings = signal<AppSettings>(defaultSettings);
export const hardwareInfo = signal<HardwareInfo | null>(null);
export const setupComponents = signal<ComponentStatus[]>([]);
export const processEntries = signal<ProcessMemoryEntry[]>([]);
export const agentTasks = signal<AgentTask[]>([]);
export const inboxItems = signal<InboxItem[]>([]);
export const gitStatus = signal<GitRepoStatus | null>(null);
export const terminalProfiles = signal<TerminalProfile[]>([]);
export const userProfile = signal<UserProfile | null>(null);

export const openTabs = signal<EditorTab[]>([
  {
    id: "welcome-tab",
    title: "Welcome",
    filePath: "welcome.md",
    language: "markdown",
    content: `# Welcome to SV Code Editor v1.0.0

A high-performance personal Windows code editor with built-in AI agent platform.

- **Zero Animation Guarantee**: Real-time rendering with zero motion delay.
- **2 GB RAM Ready**: Lite profile turns off heavy features for instant operation.
- **Setup Manager**: Installs Node.js, JDK 21, Ghidra, OmniRoute, REA, and Impeccable without admin rights.
- **Agent Platform**: Parallel agents, git worktrees, task reports, browser testing agent.
- **Reverse Engineering**: Native Ghidra + REA decompilation with evidence drawer.
`,
    isDirty: false,
    lastAccessed: Date.now(),
  },
]);

export const activeTabId = signal<string>("welcome-tab");

export const activeTab = computed(() => {
  return openTabs.value.find((t) => t.id === activeTabId.value) || null;
});

export const reAnalysis = signal<ReAnalysisOverview | null>(null);
export const isSetupModalOpen = signal<boolean>(false);
export const isCommandPaletteOpen = signal<boolean>(false);
export const isQuickOpenOpen = signal<boolean>(false);

export function openFile(filePath: string, content: string, language: string) {
  const existing = openTabs.value.find((t) => t.filePath === filePath);
  if (existing) {
    existing.lastAccessed = Date.now();
    activeTabId.value = existing.id;
    return;
  }

  const title = filePath.split(/[\\/]/).pop() || filePath;
  const isLarge = content.length > 1024 * 1024; // >1MB large file mode

  // In Lite profile, limit live editor models to maxLiveEditorModels (default 8)
  let updatedTabs = [...openTabs.value];
  if (settings.value.profile === "Lite" && updatedTabs.length >= settings.value.maxLiveEditorModels) {
    // Dispose the oldest inactive tab
    const sorted = [...updatedTabs].sort((a, b) => a.lastAccessed - b.lastAccessed);
    const oldest = sorted.find((t) => t.id !== activeTabId.value);
    if (oldest && !oldest.isDirty) {
      updatedTabs = updatedTabs.filter((t) => t.id !== oldest.id);
    }
  }

  const newTab: EditorTab = {
    id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    filePath,
    language,
    content,
    isDirty: false,
    isLargeFile: isLarge,
    lastAccessed: Date.now(),
  };

  openTabs.value = [...updatedTabs, newTab];
  activeTabId.value = newTab.id;
}

export function closeTab(tabId: string) {
  const filtered = openTabs.value.filter((t) => t.id !== tabId);
  openTabs.value = filtered;
  if (activeTabId.value === tabId) {
    activeTabId.value = filtered[filtered.length - 1]?.id || "";
  }
}

export function updateActiveTabContent(newContent: string) {
  const current = activeTab.value;
  if (!current) return;
  openTabs.value = openTabs.value.map((t) => {
    if (t.id === current.id) {
      return {
        ...t,
        content: newContent,
        isDirty: true,
        lastAccessed: Date.now(),
      };
    }
    return t;
  });
}

export function markTabSaved(tabId: string) {
  openTabs.value = openTabs.value.map((t) => {
    if (t.id === tabId) {
      return { ...t, isDirty: false };
    }
    return t;
  });
}

