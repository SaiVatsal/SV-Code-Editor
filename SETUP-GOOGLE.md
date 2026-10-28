# Google Sign-In & Settings Sync Setup Guide

**SV Code Editor** includes an optional Google Sign-In integration to sync your preferences (`settings.json`), custom keybindings, snippets, and themes across machines using your private Google Drive AppData folder (`drive.appdata` scope).

This guide walks you through setting up your personal Google Cloud OAuth 2.0 Desktop Application credentials.

---

## Prerequisites
- A Google account (personal or Google Workspace).
- Access to [Google Cloud Console](https://console.cloud.google.com/).

---

## Step 1: Create a Google Cloud Project
1. Log in to the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the project dropdown and click **New Project**.
3. Name your project (e.g., `SV Code Editor Personal`) and click **Create**.

---

## Step 2: Configure OAuth Consent Screen
1. In the left navigation menu, navigate to **APIs & Services** > **OAuth consent screen**.
2. Select **External** user type and click **Create**.
3. Fill in the required application details:
   - **App name**: `SV Code Editor`
   - **User support email**: Your personal email.
   - **Developer contact information**: Your personal email.
4. Click **Save and Continue**.
5. On the **Scopes** screen, click **Add or Remove Scopes**.
   Select the following 4 scopes:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/drive.appdata` (allows the editor to store settings in your private hidden Drive AppData folder; cannot read any personal Drive files)
6. Click **Update** and then **Save and Continue**.
7. On the **Test users** screen, click **Add Users** and add your Google email address.
   > **Note**: While the app is in "Testing" mode, only explicitly listed test users can authenticate. This is normal and sufficient for personal use.
8. Click **Save and Continue**.

---

## Step 3: Enable Google Drive API
1. In the left sidebar, navigate to **APIs & Services** > **Enabled APIs & Services**.
2. Click **+ Enable APIs and Services** at the top.
3. Search for **Google Drive API** and click on it.
4. Click **Enable**.

---

## Step 4: Create OAuth 2.0 Desktop Client Credentials
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** > **OAuth client ID**.
3. Under **Application type**, select **Desktop app**.
4. Name the client (e.g., `SV Code Editor Windows Client`).
5. Click **Create**.
6. Google will display your **Client ID** (e.g., `123456789-abc.apps.googleusercontent.com`) and Client Secret.
   > Desktop apps using PKCE only require the **Client ID**.

---

## Step 5: Configure SV Code Editor
1. Launch **SV Code Editor**.
2. Open Settings (`Ctrl+,`) or click the gear icon in the bottom left.
3. Navigate to **Accounts & Sync** > **Google Sign-In Configuration**.
4. Paste your **Client ID** into the `Google Client ID` field.
5. Click **Sign In with Google**.
6. Your default web browser will open Google's authorization page. Click your account, approve permissions, and the browser will automatically redirect to the editor's secure loopback listener (`http://127.0.0.1:20129/callback`).
7. Your credentials and refresh tokens will be stored securely in **Windows Credential Manager**. Settings sync is now active!

---

## Disconnecting & Data Removal
To sign out and delete all local credentials:
1. Open Settings > **Accounts & Sync**.
2. Click **Sign Out & Purge Tokens**.
3. All tokens in Windows Credential Manager are deleted immediately.
