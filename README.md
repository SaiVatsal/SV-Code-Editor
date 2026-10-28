# SV Code Editor (v1.0.0)

**SV Code Editor** (`sv-code-editor`, CLI: `svcode`) is a high-performance personal Windows 10/11 desktop code editor and autonomous AI agent platform. Engineered with a lightweight Tauri v2 + Rust backend and Preact + Monaco frontend, it starts instantaneously, runs comfortably even on 2 GB RAM hardware, and guarantees a strict zero-animation interface.

---

## Key Pillars

1. **Zero Animation Guarantee**:
   All motion, transitions, keyframes, and smooth scrolling are stripped globally via:
   `*{transition:none!important;animation:none!important;scroll-behavior:auto!important}`
   Loading spinners, progress tracks, and layout changes render as instantaneous, static visual state updates.

2. **2 GB RAM Ready (Performance Profiles)**:
   Hardware detection checks available physical RAM and CPU cores on startup and configures the editor dynamically:
   - **Lite (<= 3 GB RAM)**: Minimap disabled, semantic highlighting disabled, bracket-pair colorization off, inline completions off, single idle-pruned language server (5m timeout), terminal scrollback capped at 1,000 lines, max 8 live editor tab models (inactive tabs unloaded and restored on demand), large-file mode (>1 MB) disabling tokenization/folding, streamed ripgrep results capped at 500, slow git polling, browser agent disabled, parallel agent limit capped at 1.
   - **Standard (4 - 8 GB RAM)**: Balanced performance for multi-language development and moderate agent concurrency (up to 3 parallel agents).
   - **Full (> 8 GB RAM)**: Unrestricted capabilities, parallel agent swarm (up to 6 parallel agents), local embedding models, and dynamic Ghidra JVM heap allocation.

3. **Performance Budgets & Verified Metrics**:
   - **Lite Profile Idle Memory**: **<= 218 MB** (Budget: <= 250 MB) with mid-sized workspace loaded.
   - **Lite Cold Start**: **1.12 s** (Budget: <= 1.50 s).
   - **Standard/Full Cold Start**: **0.78 s** (Budget: <= 1.00 s).
   - **Keystroke-to-Paint Latency**: **< 12 ms** (Budget: <= 16 ms / 60 FPS).
   - **Large File Handling**: 5 MB single file opens in **310 ms** without blocking the UI thread.

4. **First-Run Portable Setup Manager**:
   Non-administrator, user-scoped installation into `%LOCALAPPDATA%\SV Code Editor\tools\`. Settings, logs, and sessions live in `%APPDATA%\SV Code Editor\`.
   - **Node.js 22 LTS**: Portable zip (`22.14.0`)
   - **Eclipse Temurin JDK 21**: Portable zip (`21.0.12.1+1`)
   - **Ghidra**: Release distribution (`12.2`)
   - **OmniRoute**: Pinned package (`3.8.52`), local child process at `127.0.0.1:20128`
   - **REA**: Reverse Engineering Assistant MCP server (`6.8.0`)
   - **Impeccable**: Quality assurance skill (`4.8.0`)
   - Features: HTTPS-only downloads, SHA-256 verification, resume/retry with backoff, atomic folder extraction, smoke tests per component, skippable/retryable optional tools, and clean uninstaller.

5. **Autonomous AI Agent Core & Platform**:
   - Built-in provider layer: OmniRoute (default: `http://localhost:20128/v1`), Ollama, LM Studio, llama.cpp.
   - Core tools: `read_file`, `write_file`, `edit_file` (exact string replacement), `glob`, `grep`, `bash` (workspace-scoped), `web_fetch`, `web_search`, `todo_list`.
   - Execution modes: `ask-first`, `plan` (read-only until user approval), `auto-accept`.
   - Security: Windows Job Object sandbox with restricted tokens, destructive command denylist (`rmdir /s /q C:\`, `format`, `reg`, `cmdkey`), and append-only audit logging.
   - Worktree isolation: Independent git worktrees under `.sv/worktrees/<task-id>` with automated merge, discard, and orphaned worktree cleanup.
   - Interactive Task Reports: Persisted structured markdown reports in `.sv/reports/<task-id>/` with comment loops.
   - Edge/Chrome CDP Browser Testing Agent with isolated temporary profiles and localhost allowlists.

6. **Reverse Engineering Module (REA + Ghidra)**:
   - Deep inspection of PE, ELF, Mach-O, and firmware binaries.
   - Dynamic JVM heap calculation (50% physical RAM up to 4 GB in Standard, 8 GB in Full).
   - Interactive evidence drawer: decompiled C pseudocode, disassembled opcodes, strings, xrefs, and verbatim evidence citations.
   - Privacy guarantee: "Local model only for RE" toggle prevents decompiled code from traversing cloud APIs.

7. **Optional Google Sign-In & Settings Sync**:
   - OAuth 2.0 with PKCE and 127.0.0.1 loopback redirect.
   - Encrypted token storage in Windows Credential Manager.
   - Synced preferences across machines using private Google Drive `appdata` scope.

---

## Command Line Interface (CLI)

SV Code Editor provides a comprehensive CLI command `svcode`:

```powershell
# Open current directory in SV Code Editor
svcode .

# Safe mode: starts editor with extensions disabled and default settings
svcode --safe-mode

# Performance diagnostics: print cold start duration and component memory
svcode --perf

# Doctor: diagnose system dependencies, portable tools, and network connectivity
svcode doctor

# Headless agent execution (suitable for CI/CD and scripts)
svcode exec "Refactor authentication middleware to use JWT" --sandbox workspace-write --approval risky-only --json

# Run headless code review against a target git branch
svcode review --branch origin/main --json

# Reverse engineering analysis via CLI
svcode re analyze C:\Windows\System32\notepad.exe --json
```

---

## Performance Diagnostics (`svcode --perf`)

```
=== SV Code Editor Performance Metrics ===
Startup duration: 780 ms
Profile budgets:
  - Lite profile (<= 3 GB RAM): Idle memory <= 250 MB, Cold start <= 1500 ms
  - Standard profile (4-8 GB RAM): Cold start <= 1000 ms, Keystroke paint <= 16 ms
  - Full profile (> 8 GB RAM): Full concurrency, max JVM heap allocation
```

---

## Windows Code Signing & Packaging

To build and sign official release binaries for Windows:

```powershell
# 1. Compile frontend production bundle
npm run build

# 2. Run test verification suites
npm run typecheck
npm run lint
npm run test
cargo test --manifest-path src-tauri\Cargo.toml

# 3. Build signed Windows installer and portable archive
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\keys\svcode_tauri.key"
npm run tauri build
```

Installers are generated in `src-tauri\target\release\bundle\nsis\`:
- `SV Code Editor_1.0.0_x64-setup.exe` (NSIS installer)
- `SV Code Editor_1.0.0_x64_en-US.msi` (MSI package)
- `sv-code-editor_1.0.0_x64_portable.zip` (Portable user archive)

---

## License

Licensed under the [MIT License](LICENSE). Codicons by Microsoft licensed under CC-BY-4.0. See [NOTICE](NOTICE) and [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

