# Security Architecture & Vulnerability Reporting

**SV Code Editor** (`sv-code-editor`) is built with defense-in-depth isolation across its core editor, autonomous agents, and tool management subsystems.

---

## 1. Sandbox Guarantees & Job Objects

All agent child processes and terminal tasks run under strict operational constraints:
- **Windows Job Object Isolation**: Processes spawned by the agent engine are assigned to Windows Job Objects with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`. Child processes cannot escape termination when their parent session terminates.
- **Restricted Token Execution**: When executing under sandboxed modes (`read-only` or `workspace-write`), processes run with restricted security tokens stripped of administrator privileges, SeDebugPrivilege, and network socket creation where enforced.
- **Workspace Boundary Containment**: Working directories are permanently locked to the workspace root or the active task git worktree (`.sv/worktrees/<task-id>`). Relative directory escapes (`..\..\`) outside the root boundary are rejected.

---

## 2. Destructive Command Denylist

The sandbox enforces a real-time command denylist preventing irreversible destructive actions:
1. **Recursive Deletions Outside Workspace**:
   Blocks commands such as `rmdir /s /q C:\`, `rm -rf /`, `del /s C:\Windows` unless targeted strictly inside the workspace boundary.
2. **Drive & Partition Formatting**:
   Blocks commands including `format`, `diskpart`, `mkfs`, and raw disk partitioning tools.
3. **Registry Tampering**:
   Blocks unauthorized registry mutations (`reg add`, `reg delete`, `reg import`).
4. **Credential Extraction**:
   Blocks commands enumerating or harvesting secrets (`cmdkey /list`, `vaultcmd`, `mimikatz`, `samdump`).
5. **Git Force Pushes**:
   Blocks `git push --force` and `git push -f` from agent automation to protect upstream repositories.

---

## 3. Credential Security

- **Windows Credential Manager Only**:
  API keys for OmniRoute, OpenAI, Anthropic, and GitHub are stored exclusively within the Windows Credential Manager (`CredWriteW` / `CredReadW`) under the namespace `SVCodeEditor:*`.
- **Zero Plaintext Disk Writes**:
  API keys and OAuth tokens are never written to `settings.json`, temporary files, or application logs.
- **Google Sign-In PKCE**:
  OAuth 2.0 PKCE with high-entropy code verifiers prevents code interception attacks on loopback redirects. Refresh tokens are secured in the Windows Credential Store and purged on sign-out.

---

## 4. Reverse Engineering Safety & Privacy

- **Local Model Only for RE**:
  A dedicated toggle enforces that REA / Ghidra outputs (decompiled C pseudocode, disassembled opcodes, memory layout) are strictly routed to local LLM providers (e.g. Ollama, LM Studio, llama.cpp) and never sent to cloud model endpoints.
- **Static Analysis Only**:
  The RE module does not execute target binaries. File inspection occurs through static parsing, Ghidra headless analysis, and byte inspection.

---

## 5. Audit Logging

All sandbox executions, file writes, edits, and network requests are appended to:
`%APPDATA%\SV Code Editor\logs\audit.log`
Format:
```
[2026-10-28T12:00:00Z] task_id=task-a1b2c3d4 action="edit_file" target="src/main.rs" status="SUCCESS"
```
Audit logs are append-only and cannot be cleared by running agent tasks.

---

## Reporting a Vulnerability

If you discover a security issue or vulnerability in SV Code Editor, please email security disclosure to `security@svcode.dev` or file a private security advisory on GitHub. We aim to respond to all reports within 24 hours.
