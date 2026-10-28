export interface EditorTab {
  id: string;
  title: string;
  filePath: string;
  language: string;
  content: string;
  isDirty: boolean;
  isLargeFile?: boolean;
  lastAccessed: number;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
  size?: number;
}

export interface AppSettings {
  profile: "Lite" | "Standard" | "Full";
  theme: "dark" | "light" | "system";
  fontSize: number;
  tabSize: number;
  formatOnSave: boolean;
  autoSave: boolean;
  largeFileThresholdMb: number;
  maxLiveEditorModels: number;
  omniRouteEndpoint: string;
  defaultModel: string;
  sandboxLevel: "read-only" | "workspace-write" | "full-access";
  approvalPolicy: "always" | "risky-only" | "never";
  turboMode: boolean;
  schemaVersion: number;
}

