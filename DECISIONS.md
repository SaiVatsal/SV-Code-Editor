# Architectural & Engineering Decisions

- **2026-10-28 05:15**: Selected Preact + TypeScript (strict mode) with Vite for the frontend to ensure instant rendering, ultra-low memory overhead (<10MB JS runtime), and robust Monaco Editor lifecycle management.
- **2026-10-28 05:15**: Selected Tauri v2 on Rust with Tokio for the desktop native backend, enabling low-memory consumption, zero Electron baggage, and direct Windows API integration (Job Objects, Credential Manager, PTY).
- **2026-10-28 05:15**: Adopted portable-pty for integrated terminal management across PowerShell, cmd, Git Bash, and WSL.
- **2026-10-28 05:15**: Configured zero-animation global stylesheet (`*{transition:none!important;animation:none!important;scroll-behavior:auto!important}`) across all views and UI layers.
- **2026-10-28 05:15**: Established standard directories: tools under `%LOCALAPPDATA%\SV Code Editor\tools\`, user configuration, sessions and logs under `%APPDATA%\SV Code Editor\`.
