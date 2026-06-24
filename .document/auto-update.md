# Auto-Update Implementation

## Overview

Replaced the bare `updateElectronApp()` call in `main.ts` with a full-featured auto-update system that communicates update status to the renderer for custom UI, supports manual "Check for Updates", and allows user-initiated restart & install.

## Architecture

```
update-electron-app (auto-check every 10 min)
       │
       ▼
  autoUpdater events
  (checking, available, not-available, downloading, downloaded, error)
       │
       ▼
  autoUpdate.init.ts ───forwardRendererEvent()──→ UPDATE_STATUS IPC
       │                                                  │
       ▼                                                  ▼
  ViewController invoke handlers             useUpdateStore (zustand)
  (CHECK_FOR_UPDATE, QUIT_AND_INSTALL_UPDATE)              │
       │                                          ┌───────┴───────┐
       ▼                                          ▼               ▼
  autoUpdater.checkForUpdates()            UpdateBanner    Settings > Updates
  autoUpdater.quitAndInstall()
```

## Files

### New

| File | Description |
|---|---|
| `src/features/autoUpdate/types.ts` | `UpdateStatusEvent` — discriminated union for all update states |
| `src/features/autoUpdate/autoUpdate.init.ts` | `initAutoUpdate(emit)`, `checkForUpdates()`, `quitAndInstall()` |
| `src/features/ui/stores/useUpdateStore.ts` | Zustand store (`status`, `checkForUpdate`, `quitAndInstall`) + `setupUpdateListener()` |
| `src/features/ui/components/UpdateBanner.tsx` | Top-of-screen banner: download progress, restart button, retry, dismiss |

### Modified

| File | Change |
|---|---|
| `src/main.ts` | Removed `updateElectronApp()` call (moved to ViewController) |
| `src/shared/constants/ipc.ts` | Added `CHECK_FOR_UPDATE`, `QUIT_AND_INSTALL_UPDATE` (invoke), `UPDATE_STATUS` (renderer event) |
| `src/core/controller/viewController.ts` | Imports autoUpdate, registers invoke handlers, calls `initAutoUpdate()` in `init()` |
| `src/features/ui/pages/layout.tsx` | Renders `<UpdateBanner />`, calls `setupUpdateListener()` |
| `src/features/ui/components/index.ts` | Exports `UpdateBanner` |
| `src/features/ui/pages/setting/components/Interface.tsx` | Added "Updates" section under System settings |

## IPC Protocol

**Invoke (renderer → main):**
- `CHECK_FOR_UPDATE` — triggers `autoUpdater.checkForUpdates()`
- `QUIT_AND_INSTALL_UPDATE` — triggers `autoUpdater.quitAndInstall()`

**Event (main → renderer):**
- `UPDATE_STATUS` — payload is `UpdateStatusEvent`:
  - `{ status: "checking" }`
  - `{ status: "available" }`
  - `{ status: "not-available" }`
  - `{ status: "downloading", info: Electron.ProgressInfo }`
  - `{ status: "downloaded", info: { releaseNotes, releaseName, releaseDate, updateURL } }`
  - `{ status: "error", info: string }`

## Behavior

- **Automatic**: `update-electron-app` checks every 10 minutes on supported platforms (macOS, Windows). All events are forwarded to the renderer.
- **Manual**: User clicks "Check for Updates" in Settings > System > Updates.
- **Notification**: `UpdateBanner` appears at top of screen for `available`, `downloading`, `downloaded`, `error` states. Banner can be dismissed for non-downloaded states.
- **Install**: When update is downloaded, banner shows a "Restart" button. Same button available in Settings. Both call `autoUpdater.quitAndInstall()`.
- **Dev mode**: `update-electron-app` skips updates in development (`app.isPackaged === false`).

## GitHub Releases

The existing `.github/workflows/build.yml` publishes releases when tags matching `v*` are pushed. The `forge.config.ts` publisher is configured for `https://github.com/handwithfivefingers/minus-browser`. The `update-electron-app` library uses the `repository` field from `package.json` to auto-detect the repo for update feed URL.
