# SV Code Editor (v1.0.0)

**SV Code Editor** (`sv-code-editor`, CLI: `svcode`) is a code editor for Windows 10 and Windows 11. It helps you write code, manage projects, use AI to make changes, and analyze software files.

It is built using Tauri v2, Rust, Preact, and Monaco Editor. These technologies help the editor run quickly and use less memory.

The goal is to make it work well even on a computer with only 2 GB of RAM. The interface also has no animations.

---

## Main Features

### 1. No Animations

The editor does not use animations or smooth scrolling.

This includes:
- No page transitions.
- No animated loading spinners.
- No moving progress bars.
- No animated interface elements.

The interface changes immediately when something happens.

This is controlled using the following CSS:

```css
* {
  transition: none !important;
  animation: none !important;
  scroll-behavior: auto !important;
}
```

### 2. Works on Low-End Computers

When the editor starts, it checks the computer's RAM and CPU cores. It then chooses the best settings for that computer.

There are three performance modes.

**Lite Mode — 3 GB RAM or less**

This mode is designed for computers with very little memory.

It includes:
- Turns off the minimap and some advanced code-highlighting features.
- Turns off inline code suggestions.
- Uses only one language server at a time and closes it after five minutes of inactivity.
- Limits terminal history to 1,000 lines.
- Keeps a maximum of eight editor tabs loaded in memory.
- Unloads inactive tabs and reloads them when needed.
- Uses a simplified mode for files larger than 1 MB.
- Limits search results to 500 matches.
- Checks Git changes less frequently.
- Turns off the browser-based AI testing agent.
- Allows only one AI agent to run at a time.

**Standard Mode — 4 GB to 8 GB RAM**

This mode balances performance and features.

It supports multiple programming languages and allows up to three AI agents to work at the same time.

**Full Mode — More than 8 GB RAM**

This mode enables the editor's more advanced features.

It includes:
- Up to six AI agents working at the same time.
- Local AI embedding models.
- More memory for advanced reverse-engineering tools.
- Higher limits for background tasks and other features.

### 3. Speed and Performance Targets

The project has the following performance targets and reported measurements.

| Feature | Reported Performance |
|---|---:|
| Lite Mode idle memory usage | 218 MB or less |
| Lite Mode startup time | 1.12 seconds |
| Standard and Full Mode startup time | 0.78 seconds |
| Time between typing and displaying a change | Under 12 milliseconds |
| Time to open a 5 MB file | 310 milliseconds |

The maximum target for Lite Mode startup is 1.5 seconds. The target for Standard and Full Mode is 1 second.

The target for typing responsiveness is under 16 milliseconds.

These numbers should be confirmed through repeatable performance tests on the target hardware.

### 4. Automatic Installation of Tools

The editor includes a setup manager that can download and install the tools it needs.

Installation is limited to the current Windows user. Administrator permissions are not required for the intended user-level installation.

**Installation folder:**

`%LOCALAPPDATA%\SV Code Editor\tools\`

**Settings, logs, and saved sessions:**

`%APPDATA%\SV Code Editor\`

The setup manager supports these tools:

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 22.14.0 | Runs JavaScript development tools |
| Eclipse Temurin JDK | 21.0.12.1+1 | Runs Java-based tools |
| Ghidra | 12.2 | Analyzes compiled programs |
| OmniRoute | 3.8.52 | Connects the editor to supported AI models |
| REA | 6.8.0 | Helps analyze software and compiled files |
| Impeccable | 4.8.0 | Provides quality-checking tools |

The setup manager also:
- Downloads files only through HTTPS.
- Checks file integrity using SHA-256 hashes.
- Resumes failed downloads and retries when needed.
- Extracts files safely.
- Tests each installed tool.
- Lets users skip or retry optional tools.
- Provides an uninstaller to remove the installed tools.

### 5. Built-In AI Assistant

SV Code Editor includes an AI assistant that can help you understand, write, edit, and review code.

It can connect to different AI services, including:

- OmniRoute, which is the default provider.
- Ollama.
- LM Studio.
- llama.cpp.

The default OmniRoute address is:

`http://localhost:20128/v1`

The assistant can perform tasks such as:

| Tool | What It Does |
|---|---|
| `read_file` | Reads a file |
| `write_file` | Creates or writes a file |
| `edit_file` | Replaces exact text in a file |
| `glob` | Finds files by their names or patterns |
| `grep` | Searches for text inside files |
| `bash` | Runs commands within the workspace |
| `web_fetch` | Retrieves content from a web page |
| `web_search` | Searches the web |
| `todo_list` | Creates and manages a task list |

**The assistant has three working modes.**

- **Ask First:** Asks for permission before making changes.
- **Plan:** Examines the project and prepares a plan. It does not make changes until the user approves.
- **Auto-Accept:** Automatically accepts permitted actions without asking for approval each time.

#### Security Features

The editor includes safety features to reduce the risk of unwanted changes.

These include:
- Windows security restrictions for running processes.
- Restrictions on commands that could damage the system.
- A list of blocked commands, including certain uses of `format`, `reg`, `cmdkey`, and `rmdir`.
- A log that records actions performed by the assistant.
- Separate Git worktrees for individual tasks.
- Options to merge changes, discard them, or clean up abandoned worktrees.

AI task worktrees are stored under:

`.sv/worktrees/<task-id>`

The assistant also saves task reports as Markdown files under:

`.sv/reports/<task-id>/`

Users can review these reports and add comments to continue working on a task.

#### Browser Testing

The editor includes an agent that can test websites using Chrome or Edge.

It uses the browser's debugging interface, known as CDP.

The agent can use temporary browser profiles and a list of allowed local addresses to help keep tests isolated.

### 6. Reverse Engineering Tools

SV Code Editor can work with **Ghidra** and the **Reverse Engineering Assistant (REA)** to examine compiled software.

Reverse engineering means inspecting a program to understand how it works, even when its original source code is unavailable.

The tools support:
- Windows PE files.
- Linux ELF files.
- macOS Mach-O files.
- Firmware files.

They can display information such as:
- Decompiled C-like code.
- Assembly instructions.
- Text strings found inside a program.
- Cross-references that show where functions or data are used.
- Evidence and references that help explain the analysis.

The editor also adjusts the memory allocated to Ghidra's Java runtime according to the selected performance mode.

The intended memory limits are:
- **Standard Mode:** Up to 50% of physical RAM, with a maximum of 4 GB.
- **Full Mode:** Up to 50% of physical RAM, with a maximum of 8 GB.

#### Local AI Privacy Option

A setting called **Local Model Only for RE** is available for reverse engineering.

When enabled, the intended behavior is to keep decompiled code away from cloud AI services and use a local model instead.

### 7. Optional Google Sign-In and Settings Sync

Users can optionally sign in with Google.

This feature uses OAuth 2.0 with PKCE and a local redirect address:

`127.0.0.1`

Authentication tokens are stored in Windows Credential Manager.

The editor can also synchronize preferences between computers using the private Google Drive `appdata` storage area.

This feature is optional.

---

## Command-Line Tool (CLI)

SV Code Editor includes a command-line tool named `svcode`.

You can use it from PowerShell or scripts.

### Open a Project

Open the current folder in the editor:

```powershell
svcode .
```

### Start in Safe Mode

Start the editor with extensions disabled and default settings:

```powershell
svcode --safe-mode
```

### Check Performance

Display startup time and performance information:

```powershell
svcode --perf
```

### Check for Problems

Check the installation, required tools, and network connectivity:

```powershell
svcode doctor
```

### Run an AI Coding Task

Run an AI task without opening the editor:

```powershell
svcode exec "Refactor authentication middleware to use JWT" --sandbox workspace-write --approval risky-only --json
```

This example asks the AI to update authentication middleware to use JWT. The command also specifies workspace-write restrictions, approval requirements, and JSON output.

### Review Code Changes

Review a Git branch using the command line:

```powershell
svcode review --branch origin/main --json
```

### Analyze a Program

Analyze the Windows Notepad executable:

```powershell
svcode re analyze "C:\Windows\System32\notepad.exe" --json
```

These commands are intended to support normal development work as well as automated scripts and CI/CD pipelines.

---

## Performance Report

Running the following command displays performance information:

```powershell
svcode --perf
```

Example output:

```text
=== SV Code Editor Performance Metrics ===
Startup duration: 780 ms
Profile budgets:
  - Lite profile (<= 3 GB RAM): Idle memory <= 250 MB, Cold start <= 1500 ms
  - Standard profile (4-8 GB RAM): Cold start <= 1000 ms, Keystroke paint <= 16 ms
  - Full profile (> 8 GB RAM): Full concurrency, max JVM heap allocation
```

This report shows the measured startup time and the performance limits used by the application.

The values shown here are examples of reported measurements, not proof that every computer will achieve the same results.

---

## Building the Windows Application

Developers can build the application and create Windows installers using the following commands.

### Step 1: Build the Frontend

Compile the frontend files for production:

```powershell
npm run build
```

### Step 2: Run the Tests

Check the code and test the Rust backend:

```powershell
npm run typecheck
npm run lint
npm run test
cargo test --manifest-path src-tauri/Cargo.toml
```

### Step 3: Build the Windows Installer

Set the signing key and create the production build:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "C:\keys\svcode_tauri.key"
npm run tauri build
```

The signing key must be available at the specified path. Keep private signing keys secure and do not publish them.

### Expected Build Files

The following output files are expected if the build configuration produces all three packages:

- `SV Code Editor_1.0.0_x64-setup.exe` — Windows installer.
- `SV Code Editor_1.0.0_x64_en-US.msi` — MSI installer package.
- `sv-code-editor_1.0.0_x64_portable.zip` — Portable ZIP package.

The expected output folder for the NSIS installer is:

`src-tauri/target/release/bundle/nsis/`

The MSI and portable ZIP files may be placed in their respective bundle folders, depending on the build configuration.

---

## License

SV Code Editor is released under the MIT License.

The Codicons used by the editor are licensed under CC-BY-4.0.

For more information, see:

- `LICENSE` — Main project license.
- `NOTICE` — Third-party notices.
- `THIRD_PARTY_LICENSES.md` — Licenses for third-party software.

---

**SV Code Editor — A lightweight Windows code editor with AI coding assistance, performance modes, and built-in reverse-engineering tools.**
