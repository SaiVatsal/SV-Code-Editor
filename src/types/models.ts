export type SystemProfile = "Lite" | "Standard" | "Full";

export interface HardwareInfo {
  totalRamMb: number;
  availableRamMb: number;
  cpuCores: number;
  cpuBrand: string;
  recommendedProfile: SystemProfile;
  activeProfile: SystemProfile;
}

export interface ComponentStatus {
  id: string;
  name: string;
  version: string;
  installed: boolean;
  verified: boolean;
  essential: boolean;
  minRamGb: number;
  installPath?: string;
  errorMessage?: string;
  smokeOutput?: string;
}

export interface SetupProgressEvent {
  componentId: string;
  stage: string;
  percent: number;
  statusText: string;
  error?: string;
}

export interface ProcessMemoryEntry {
  name: string;
  category: string;
  pid?: number;
  memoryMb: number;
  cpuPercent: number;
  status: string;
  canStop: boolean;
}

export interface AgentTask {
  id: string;
  title: string;
  goal: string;
  status: "queued" | "running" | "waiting_approval" | "done" | "failed" | "paused";
  projectPath: string;
  branch: string;
  worktreePath?: string;
  elapsedSeconds: number;
  mode: "ask-first" | "plan" | "auto-accept";
  sandboxLevel: "read-only" | "workspace-write" | "full-access";
  approvalPolicy: "always" | "risky-only" | "never";
  model: string;
  createdAt: string;
  updatedAt: string;
  subAgentCount: number;
}

export interface InboxItem {
  id: string;
  taskId: string;
  itemType: "approval_request" | "question" | "task_done" | "automation_result";
  title: string;
  message: string;
  details?: string;
  status: "pending" | "approved" | "rejected" | "dismissed";
  createdAt: string;
}

export interface ReAnalysisOverview {
  filePath: string;
  sha256: string;
  fileSize: number;
  format: string;
  architecture: string;
  bitness: number;
  endianness: string;
  entryPoints: string[];
  sections: Array<{
    name: string;
    startAddress: string;
    size: number;
    permissions: string;
  }>;
  imports: Array<{
    library: string;
    symbol: string;
    address?: string;
  }>;
  exports: Array<{
    symbol: string;
    address: string;
    ordinal?: number;
  }>;
}

export interface ReFunction {
  address: string;
  name: string;
  size: number;
  signature: string;
  isEntry: boolean;
}

export interface ReEvidence {
  confidence: number;
  authority: string;
  limitations: string[];
  unresolvedUnknowns: string[];
}

export interface TerminalProfile {
  id: string;
  name: string;
  command: string;
  args: string[];
  available: boolean;
}

export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitRepoStatus {
  isRepo: boolean;
  currentBranch: string;
  trackingBranch?: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

export interface GitWorktreeInfo {
  taskId: string;
  branch: string;
  path: string;
  isActive: boolean;
  commitHash: string;
}

export interface SearchMatch {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  isAuthenticated: boolean;
  lastSyncedAt?: string;
}

export interface TaskReportSummary {
  taskId: string;
  path: string;
  title: string;
  modifiedAt: string;
}

