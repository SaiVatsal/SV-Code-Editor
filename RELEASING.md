# Release Engineering & In-App Updater Guide

This guide details how to build, cryptographically sign, and publish updates for **SV Code Editor** using the Tauri v2 in-app updater and GitHub Releases.

---

## 1. Cryptographic Keypair Generation

The Tauri updater verifies signatures using minisign (Ed25519) before executing or applying any in-place binary update.

```powershell
# Generate signing keypair
npx @tauri-apps/cli signer generate -w ~/.tauri/svcode.key
```

Outputs:
- **Public key**: Embedded into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
- **Private key**: Stored securely in CI/CD secrets (`TAURI_SIGNING_PRIVATE_KEY`).

---

## 2. GitHub Actions CI/CD Release Workflow (`.github/workflows/release.yml`)

The automated workflow triggers on version tag pushes (`v*.*.*`):

```yaml
name: Release SV Code Editor

on:
  push:
    tags:
      - 'v*'

jobs:
  build-release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 22 LTS
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Install Rust Toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: x86_64-pc-windows-msvc

      - name: Install Frontend Dependencies
        run: npm ci

      - name: Verify Code Quality & Tests
        run: |
          npm run typecheck
          npm run lint
          npm run test
          cargo test --manifest-path src-tauri/Cargo.toml

      - name: Build Tauri Desktop Artifacts
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: 'SV Code Editor v__VERSION__'
          releaseBody: 'See changelog for release notes.'
          releaseDraft: false
          prerelease: false
```

---

## 3. Settings Snapshots & Safe Rollback

Before any in-app update is applied, the `UpdaterService` performs an atomic safety routine:
1. **Pre-Update Snapshot**:
   Copies `%APPDATA%\SV Code Editor\settings.json`, `keybindings.json`, and snippets into `%APPDATA%\SV Code Editor\snapshots\v<previous-version>\`.
2. **Settings Schema Migration**:
   On first launch of the new version, settings are migrated to the latest `schemaVersion`.
3. **One-Click Rollback**:
   If an update causes incompatibility, running:
   ```powershell
   svcode --rollback-settings
   ```
   restores the previous snapshot cleanly and relaunches the editor in safe mode.

---

## 4. Release Checklist
1. Update version in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
2. Update `PROGRESS.md` and release notes in `DECISIONS.md`.
3. Commit with tag: `git tag -a v1.0.0 -m "Release v1.0.0"`.
4. Push tag: `git push origin v1.0.0`.
