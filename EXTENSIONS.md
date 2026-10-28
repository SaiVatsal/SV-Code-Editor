# SV Code Editor Extension Specification

**SV Code Editor** supports two tiers of extensions:
1. **Open VSX Declarative Extensions (`.vsix`)**: Themes, icon themes, TextMate grammars, code snippets, and language configuration JSONs without running arbitrary code.
2. **SV Extensions (`sv-extension.json`)**: Isolated, capability-governed JavaScript/TypeScript extensions executing inside dedicated Web Workers with real-time memory caps.

---

## 1. SV Extension Manifest (`sv-extension.json`)

Every SV extension must contain an `sv-extension.json` file in its root directory:

```json
{
  "name": "sv-git-blame",
  "displayName": "SV Inline Git Blame",
  "version": "1.0.0",
  "publisher": "sv-community",
  "description": "Show inline git annotations on current active editor line",
  "main": "dist/worker.js",
  "capabilities": [
    "workspace.read",
    "terminal.exec"
  ],
  "resourceBudgets": {
    "maxMemoryMb": 32,
    "maxCpuPercent": 15
  },
  "contributes": {
    "commands": [
      {
        "command": "sv-git-blame.toggle",
        "title": "Git Blame: Toggle Inline Annotations"
      }
    ],
    "configuration": {
      "title": "Git Blame Configuration",
      "properties": {
        "gitBlame.delayMs": {
          "type": "number",
          "default": 300,
          "description": "Debounce delay for line annotation updates in milliseconds"
        }
      }
    }
  }
}
```

---

## 2. Capability Security Model

SV Extensions cannot access Node.js or native APIs directly. They run in a hardened `Worker` sandbox and request permissions via capability tokens:

| Capability | Allowed Operations |
|---|---|
| `workspace.read` | Read files and list directory trees inside active workspace |
| `workspace.write` | Create or update files inside workspace (prompts user if risky) |
| `terminal.exec` | Spawn workspace-scoped commands through Job Object sandbox |
| `agent.tool` | Register a new agent skill/tool callable by the Agent Engine |
| `network` | Perform HTTPS requests to explicit allowlisted origins |

---

## 3. Memory & Resource Budget Enforcement

Every SV Extension worker is monitored continuously:
- **Default Memory Cap**: 32 MB (configurable in manifest up to 64 MB).
- **Enforcement**: If a worker exceeds its memory budget for more than 5 consecutive seconds, the Process Watchdog immediately terminates the worker with `worker.terminate()` and displays a non-animated warning banner in the Extensions panel.
- In **Lite Profile**, all SV Extension workers are paused when the editor window loses focus or is minimized.

---

## 4. Sample Extension Implementation (`dist/worker.js`)

```javascript
// SV Extension Host API
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  if (type === 'initialize') {
    // Register command handlers
    self.postMessage({
      type: 'registerCommands',
      commands: ['sv-git-blame.toggle'],
    });
    return;
  }

  if (type === 'executeCommand' && payload.command === 'sv-git-blame.toggle') {
    // Request terminal blame execution via host bridge
    self.postMessage({
      type: 'invokeHostCapability',
      id,
      capability: 'terminal.exec',
      params: {
        command: `git log -1 --format="%h (%an, %ar): %s" -L ${payload.line},${payload.line}:${payload.file}`
      }
    });
  }
};
```

---

## 5. Installing & Managing Extensions

- **Through UI**: Open the Extensions view (`Ctrl+Shift+X`), browse Open VSX packages, or click `Install from VSIX / SV Folder`.
- **Via CLI**:
  ```powershell
  # Install extension package
  svcode --install-extension C:\packages\my-extension.vsix
  ```
- **Safe Mode**:
  Run `svcode --safe-mode` to start the editor with all third-party extensions disabled for debugging.
