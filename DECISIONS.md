# Architectural & Engineering Decisions

- **2026-10-28 05:15**: Selected Preact + TypeScript (strict mode) with Vite for the frontend to ensure instant rendering, ultra-low memory overhead (<10MB JS runtime), and robust Monaco Editor lifecycle management.
- **2026-10-28 05:15**: Selected Tauri v2 on Rust with Tokio for the desktop native backend, enabling low-memory consumption, zero Electron baggage, and direct Windows API integration (Job Objects, Credential Manager, PTY).
- **2026-10-28 05:15**: Adopted portable-pty for integrated terminal management across PowerShell, cmd, Git Bash, and WSL.
- **2026-10-28 05:15**: Configured zero-animation global stylesheet (`*{transition:none!important;animation:none!important;scroll-behavior:auto!important}`) across all views and UI layers.
- **2026-10-28 05:15**: Established standard directories: tools under `%LOCALAPPDATA%\SV Code Editor\tools\`, user configuration, sessions and logs under `%APPDATA%\SV Code Editor\`.
- **2026-10-28 05:42**: Configured Rust build environment with stable GNU toolchain and w64devkit binutils in user directory (`%LOCALAPPDATA%\w64devkit\bin`), linking with self-contained runtime libraries for pure non-admin portability.
- **2026-10-28 06:05**: Standardized on `stable-x86_64-pc-windows-msvc` toolchain utilizing `rust-lld` to cleanly support Windows file paths containing spaces and apostrophes without GNU `ld` delimiter parsing issues.
- **2026-10-28 06:15**: Generated portable MSVC CRT and Windows 11 SDK x64 import libraries in `G:\msvc-lib\x64` via `xwin`, eliminating any requirement for Visual Studio installation or administrative privileges.
- **2026-10-28 06:20**: Created unprivileged native wrappers `lib.exe` and `rc.exe` in `G:\msvc-lib\bin` bridging MSVC flags (`/fo`, `/I`, `-out:`) to `windres.exe` and `ar.exe` with quote escaping.
- **2026-10-28 06:22**: Generated `sv_stubs.lib` providing lightweight SEH unwinder stubs (`__gxx_personality_seh0`, `_Unwind_Resume`) for non-exceptional C++ build dependencies under `rust-lld`.
- **2026-10-28 06:30**: Adopted ESLint 9 flat configuration in `eslint.config.js` and Vitest 3 test runner for frontend regression testing.
- **2026-10-28 07:10**: Configured NSIS packaging with native `English` localization and currentUser non-admin installer mode in `tauri.conf.json`.
- **2026-10-28 07:15**: Generated high-definition multi-resolution 7-tier Windows icon suite (16x16 through 256x256 RGBA) with dark obsidian squircle and electric cyan/violet `< SV >` code brackets branding.
- **2026-10-28 07:35**: Integrated native Windows File & Folder pickers via `rfd` and dynamic filesystem directory listing in `commands/mod.rs` with real workspace loading in Explorer.
- **2026-10-28 07:38**: Added complete VS Code MenuBar (`File`, `Edit`, `Selection`, `View`, `Go`, `Run`, `Terminal`, `Help`) with keyboard shortcut badges, full global shortcut handler, and non-blocking in-app Google Sync modal.


