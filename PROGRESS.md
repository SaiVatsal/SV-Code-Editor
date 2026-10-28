# SV Code Editor - Implementation Progress

## 1. Project Scaffolding & Build Infrastructure
- [x] Initialize Git repository on `main` branch with comprehensive `.gitignore`
- [x] Configure Rust backend crate (`src-tauri`) with Tauri v2, Tokio, and modular architecture
- [x] Configure Vite + Preact + TypeScript in strict mode (`tsconfig.json` with `noImplicitAny: true`, `strict: true`)
- [x] Bundle Monaco Editor and official `@vscode/codicons` icon set
- [x] Implement zero-animation global stylesheet (`*{transition:none!important;animation:none!important;scroll-behavior:auto!important}`)
- [x] Set up linting, formatting, and typechecking (`cargo clippy -D warnings`, `cargo test`, `npm run typecheck`, `npm run lint`)

## 2. First-Run Setup Manager
- [x] Define `versions.json` with pinned tool versions, download URLs, and SHA-256 hashes:
  - Node.js 22 LTS (portable zip: `22.14.0`)
  - Eclipse Temurin JDK 21 (portable zip: `21.0.12.1+1`)
  - Ghidra (latest stable release zip: `12.2`)
  - OmniRoute (pinned npm package: `3.8.52`)
  - REA (morluto/rea MCP server: `6.8.0`)
  - Impeccable (pbakaus/impeccable agent skill: `4.8.0`)
- [x] Implement download manager with HTTPS, resume, retry with exponential backoff, SHA-256 verification
- [x] Implement atomic installation (temp folder extraction followed by atomic move into `%LOCALAPPDATA%\SV Code Editor\tools\`)
- [x] Implement verification smoke tests per component (version query, OmniRoute `/v1/models` ping, `rea doctor`, Ghidra headless smoke test)
- [x] Setup UI with static text progress updates and non-animated progress bar
- [x] Failure recovery & handling: offline, proxy support, low disk space, antivirus quarantine, paths with spaces/non-ASCII
- [x] CLI tools and commands: `svcode doctor`, `Repair` button, clean tool uninstaller, detailed setup logging at `%APPDATA%\SV Code Editor\logs\setup.log`
- [x] Idempotent re-runs and decoupled tool update notifications

## 3. Performance Profiles & Low-Memory Optimization (2 GB Machine Target)
- [x] Hardware detection on startup (total system RAM & CPU cores): Lite (<=3GB), Standard (4-8GB), Full (>8GB)
- [x] User override in settings (`profile: "Lite" | "Standard" | "Full"`)
- [x] Lite Profile enforcement:
  - Minimap disabled, semantic tokens disabled, bracket pair colorization off, inline completion off
  - Single language server at a time (lazy-start on language use, 5m idle auto-stop)
  - Terminal scrollback capped at 1,000 lines
  - Max 8 live Monaco editor models (dispose inactive tabs, restore from disk on switch)
  - Large file mode (>1MB) disabling tokenization and code folding
  - Streamed ripgrep search capped at 500 results
  - Slower Git polling rate; pause background tasks when minimized or unfocused
  - On-demand OmniRoute; skip Ghidra/JDK/REA with clear >=4GB requirement message
  - Browser agent disabled, max parallel agents capped at 1, local models disabled
- [x] WebView2 additional browser arguments to cap JS heap in Lite profile
- [x] Memory watchdog: monitor available system RAM, free caches, terminate idle language servers, show static banner
- [x] Process Monitor panel: real-time memory and CPU per component (editor, LSP servers, terminal, OmniRoute, REA, Ghidra, agents) with kill buttons
- [x] CLI flags: `svcode --perf` (startup timings & memory breakdown), `svcode --safe-mode` (default settings, extensions disabled)
- [x] Budget verification & documentation: Lite idle memory <= 250MB, cold start <= 1.5s; Standard/Full cold start <= 1s

## 4. Core Editor Features & Monaco Integration
- [x] Multi-tab editor group layout with horizontal & vertical split panes
- [x] File Explorer with virtualized tree view, file icons, context menus, drag and drop
- [x] Quick Open (`Ctrl+P`) and Command Palette (`Ctrl+Shift+P`) with fuzzy search
- [x] Ripgrep global search (`Ctrl+Shift+F`) with streamed results and file filters
- [x] Integrated Terminal with Rust PTY (`portable-pty`), xterm.js, and profile picker (PowerShell, cmd, Git Bash, WSL)
- [x] Source Control management (Git detection, status, staging, committing, branching, stashing, 3-way merge conflict editor)
- [x] Problems panel with diagnostics aggregation
- [x] Multi-root workspaces and Workspace Trust prompt
- [x] Auto-save with crash-safe session restore (`%APPDATA%\SV Code Editor\sessions\`)
- [x] Code snippets engine and customizable task runner (`tasks.json`)
- [x] Markdown preview panel, Image viewer, and Binary Hex viewer
- [x] Recent projects switcher, Settings UI backed by `settings.json`, Keybinding editor with default VS Code keymap
- [x] Full Dark, Light, and System themes using OKLCH color tokens and Codicons
- [x] Format-on-save integration
- [x] LSP client over child processes (typescript-language-server, pyright, rust-analyzer, clangd)
- [x] DAP (Debug Adapter Protocol) debugger integration

## 5. Agent Core
- [x] Provider layer: OpenAI-compatible API client with presets (OmniRoute `http://localhost:20128/v1`, Ollama, LM Studio, llama.cpp, custom)
- [x] Windows Credential Manager integration for secure API key storage
- [x] Core tool suite: `read_file`, `write_file`, `edit_file` (exact string replace), `glob`, `grep`, `bash` (workspace-scoped), `web_fetch`, cached `web_search`, `todo_list`
- [x] Agent execution modes: `ask-first`, `plan` (read-only until user approval), `auto-accept`
- [x] Per-tool permission prompts with persistent allow/deny rules
- [x] Inline diff review with per-hunk accept/reject, pre-turn checkpoints, and one-click rewind
- [x] Hierarchical instruction loader (`SV.md`, `AGENTS.md`, `CLAUDE.md`) with file size caps and audit command (`svcode instructions audit`)
- [x] Slash commands loader (`.sv/commands/*.md`), Agent Skills loader (`SKILL.md`), sub-agents, hooks, MCP client (stdio and HTTP)
- [x] Features: `@file` autocomplete mentions, image clipboard paste, context compaction, saved session resume & history
- [x] Headless CLI: `svcode exec "<task>"` / `svcode -p`, `svcode review`

## 6. Agent Platform
- [x] **Agents Hub**: Multi-agent task view (queued, running, waiting for approval, done, failed), parallel limits (Lite: 1, Standard: 3, Full: 6)
- [x] **Unified Inbox**: Approvals, questions, finished tasks, automation outputs; Windows toast notifications, taskbar badge, PC awake lock
- [x] **Worktree Isolation**: Automatic git worktree management under `.sv/worktrees/<task-id>`, Local/Worktree/Handoff modes, untracked file copy list, setup command execution, review & merge queue, orphaned worktree auto-cleanup
- [x] **Task Reports**: Structured reports in `.sv/reports/<task-id>/` (plan, checklist, change summary, walkthrough, test results, media attachments), interactive comment feedback loop
- [x] **Browser Testing Agent**: DevTools protocol automation for Edge/Chrome, separate temporary profile, dev server automation, localhost default allowlist, security guardrails
- [x] **Sandbox & Security**: Windows Job Object with restricted token and workspace-scoped cwd, WSL2 execution option, network access policy (off, allowlist, on), `SECURITY.md`, Turbo mode rules, destructive command denylist, audit logging
- [x] **Projects**: `.sv/project.json`, global and project-level TOML configuration
- [x] **Plugins & Connectors**: `plugin.json` packaging, MCP Connectors Manager with per-tool permissions (allow, ask, deny)
- [x] **Automations**: Cron schedules, on-startup, on-git-commit, on-folder-change triggers; Inbox results landing; missed runs catch-up
- [x] **Code Review**: `/review` command, Review panel, diff-based fix application, GitHub PR review via `gh` CLI or Credential Manager token

## 7. Integrations & Reverse Engineering Module (REA + Ghidra)
- [x] OmniRoute panel: health check, active model combos, usage metrics, process control
- [x] Impeccable skill integration (with zero-animation enforcement)
- [x] REA stdio MCP server integration with Ghidra backend, dynamic JVM heap allocation
- [x] Explorer context menu "Analyze with REA", Command Palette entry, drag-and-drop, CLI `svcode re analyze <file>`
- [x] RE Panel: Overview (SHA-256, sections, imports/exports), virtualized Functions list, Pseudocode viewer, Disassembly, Strings, Xrefs tree, Evidence drawer
- [x] Notes saving in `.sv/re/<sha256>/notes.json`, Markdown report export, project caching in `%LOCALAPPDATA%\SV Code Editor\re-projects`
- [x] Long-run management: progress reporting, cancellation, 15m startup deadline, call timeouts
- [x] RE Agent commands: `/re-summarize`, `/re-explain-function`, `/re-trace`, `/re-report` with strict evidence grounding
- [x] Privacy & Safety: Cloud model warning, "Local model only for RE" toggle, first-use authorization notice, non-execution of binaries

## 8. Optional Google Sign-In & Settings Sync
- [x] OAuth 2.0 PKCE flow with 127.0.0.1 loopback redirect in default system browser
- [x] Scopes: `openid`, `email`, `profile`, `drive.appdata`
- [x] Google Drive `appdata` sync: settings, keybindings, snippets, active theme
- [x] Token storage in Windows Credential Manager, complete sign-out purge
- [x] `SETUP-GOOGLE.md` documentation (OAuth consent setup, testing mode constraints, client ID configuration)

## 9. Extension System
- [x] Open VSX declarative `.vsix` loader (themes, icon themes, snippets, TextMate grammars, language configs, keymaps)
- [x] SV Extension runtime (`sv-extension.json`, isolated Web Worker, capability-based permissions, memory/CPU monitoring)
- [x] Extension Manager UI (Open VSX search, install, disable, uninstall, checksum verification)
- [x] `EXTENSIONS.md` specification and sample extension implementation with test suite

## 10. In-App Updates, Licensing & Documentation
- [x] Tauri updater integration, signature verification, `RELEASING.md` guide
- [x] Daily background update check (30s after startup), user prompt ("Install and restart" vs "Later")
- [x] Settings schema versioning, automatic migration, and pre-update snapshot with rollback command
- [x] GitHub Actions release workflow (NSIS installer, MSI, portable ZIP, signature generation, `latest.json`)
- [x] Licensing & attribution: `LICENSE` (MIT), `NOTICE` (Codicons CC-BY-4.0), `LEGAL.md`, `THIRD_PARTY_LICENSES.md`
- [x] Comprehensive documentation: `README.md`, `SECURITY.md`, `EXTENSIONS.md`, `SETUP-GOOGLE.md`, `RELEASING.md`

## 11. Verification & Definition of Done
- [x] Zero errors/warnings across `cargo clippy`, `cargo test`, `npm run typecheck`, `npm run lint`
- [x] Setup Manager clean state and failure injection tests (offline, bad checksum, locked files)
- [x] End-to-end user workflow: first-run setup, project open, edit/save, terminal command, git commit, agent tool execution, diff accept
- [x] Parallel agents, worktree review/merge/discard, report comment feedback, browser agent dev server test
- [x] Reverse engineering test with sample binary, evidence drawer, notes, export, and privacy guardrails
- [x] Update and settings rollback verification with mock update endpoint
- [x] Low-memory profile verification (Lite profile <= 250MB, cold start <= 1.5s)
- [x] Extension installation and memory budget cutoff verification
- [x] Windows installer execution and clean uninstallation
